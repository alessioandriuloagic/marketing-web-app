# Guida alla pubblicazione — Marketing Agente

Guida per `alessio.andriulo@agic.it` per portare "Marketing Agente" in
produzione nel workspace Fabric **AGIC IP MARKETING - AGENT**.

Questa sessione (agente Claude in ambiente sandbox, senza browser interattivo
e senza credenziali Fabric/Azure) non può eseguire `rayfin login`, `rayfin up`
né creare risorse Azure: sono passaggi intrinsecamente interattivi o
credenziali che vanno eseguiti da chi ha accesso reale al tenant. Questa guida
copre esattamente quei passaggi.

## Riferimenti del workspace/Data Agent (già noti)

- **Workspace**: `AGIC IP MARKETING - AGENT` — ID `f67f0cf4-b2c5-410e-b733-3b5c25b83ffd`
- **Data Agent MCP server**: `Server MCP Fabric da_IP` — ID `c4a26507-3d2d-4f2f-9591-c88a013a1f22`
- **Endpoint MCP**: `https://api.fabric.microsoft.com/v1/mcp/workspaces/f67f0cf4-b2c5-410e-b733-3b5c25b83ffd/dataagents/c4a26507-3d2d-4f2f-9591-c88a013a1f22/agent`

Questi valori sono già impostati come default in
`app/rayfin/functions/local.settings.json.example`.

## Architettura e perché serve comunque un service principal

Tutto vive in un'unica Fabric App (nessun hosting esterno). Ma anche così,
resta necessario un **service principal** per la chiamata al Data Agent — non
per limiti di hosting, ma per un limite di autenticazione:

- L'MCP del Data Agent richiede un bearer token Fabric a ogni chiamata.
- Rayfin (a differenza del Workload Development Kit classico) non espone
  all'app un token Fabric/Entra *delegato dell'utente* — solo il proprio
  token di sessione opaco, valido per le API generate da Rayfin stesso.
- La funzione (`app/rayfin/functions/`) gira lato server dentro Fabric,
  quindi può tenere in sicurezza un segreto — ma quel segreto deve comunque
  essere un'identità non-interattiva (service principal), perché la funzione
  risponde a richieste di chat in qualsiasi momento, senza un umano davanti a
  un browser.

Conseguenza pratica: tutti gli utenti autenticati dell'app ottengono risposte
basate sui permessi Fabric del service principal, non sui propri permessi
individuali. Isolamento per-utente richiederebbe il Workload Development Kit
classico (fuori scope).

L'autenticazione **utente → funzione** invece è già risolta automaticamente
da Rayfin: `client.functions.askDataAgent.invoke()` passa per il Fabric
InvokeController, che verifica la sessione dell'utente prima di inoltrare la
chiamata — nessun JWT da gestire manualmente nel codice applicativo.

## Passaggi

### 1. Abilitare Fabric Apps nel tenant

Un tenant administrator deve abilitare **Fabric Apps (preview)**:
1. Accedere al [Fabric admin portal](https://app.fabric.microsoft.com/admin-portal).
2. Tenant settings → **Fabric Apps (preview)** → Enabled.
3. Scegliere se abilitare per tutta l'organizzazione o per gruppi di sicurezza specifici.

### 2. Verificare la capacità Fabric del workspace

Il workspace **AGIC IP MARKETING - AGENT** deve avere una capacità Fabric F2+
(o Power BI Premium P1+ con Fabric abilitato) assegnata.

### 3. Pubblicare / confermare il Data Agent

Il Data Agent (`Server MCP Fabric da_IP`) deve essere pubblicato nel
workspace. Da **Impostazioni → Model Context Protocol** del Data Agent si può
verificare/ricopiare workspace ID, Data Agent ID e URL MCP (già inseriti sopra).

### 4. Creare il service principal per la funzione

1. Registrare una nuova app Microsoft Entra ID (o riusarne una esistente)
   dedicata alla funzione.
2. Generare un client secret.
3. Concedere a questo service principal accesso al workspace **AGIC IP
   MARKETING - AGENT** seguendo [Fabric data agent service principal
   auth](https://learn.microsoft.com/fabric/data-science/data-agent-service-principal).
4. Per lo sviluppo locale, copiare `app/rayfin/functions/local.settings.json.example`
   in `local.settings.json` e compilare `FABRIC_TENANT_ID`, `FABRIC_CLIENT_ID`,
   `FABRIC_CLIENT_SECRET`.
5. **Da verificare al deploy** (non documentato pubblicamente al momento in
   cui è stato scritto questo repo): il modo in cui questi valori vanno
   impostati come segreti sulla funzione *pubblicata* — probabilmente come
   application settings sulla risorsa che Fabric crea per la funzione. Controllare
   l'output di `rayfin up --help` / `npx rayfin up db apply --help` per
   opzioni relative a variabili d'ambiente delle funzioni, oppure cercare la
   funzione come child item nel portale Fabric dopo il deploy.

### 5. Pubblicare la Fabric App con Rayfin

```bash
cd app
npm install
npx rayfin login
npx rayfin up --workspace "AGIC IP MARKETING - AGENT"
```

Il CLI rileva automaticamente `rayfin/functions/` e ne installa le
dipendenze/esegue il deploy insieme al resto (dati, auth, hosting statico) —
nessun comando separato dovrebbe essere necessario, ma vale la pena eseguire
prima `npx rayfin up --dry-run --verbose` per vedere cosa farà.

### 6. Se il deploy della funzione fallisce

`@microsoft/rayfin-functions` è etichettato **Experimental** da Microsoft
(verificato su npm: `> Experimental — this package is experimental and may
change substantially in the near future`). Un caso reale riportato nel forum
Microsoft Q&A, con versioni di `rayfin-cli` molto vicine a quella usata qui
(1.34.0/1.35.0), ha fallito il deploy con l'errore `Functions not supported`
proveniente dal backend Fabric stesso, non dal CLI. Non è verificabile da
questa sessione se oggi funzioni.

Se capita: il commit `225b8fd` di questo repo (`git show 225b8fd` o
`git log --all`) contiene un'implementazione equivalente e già testata come
**servizio esterno Python/FastAPI** (`mcp-proxy/`), pensata per essere
ridistribuita separatamente (Azure Container Apps/App Service) e chiamata dal
frontend. È stata rimossa dalla versione corrente su richiesta esplicita
("sostituisci con una Rayfin Function"), ma resta recuperabile: `git show
225b8fd:mcp-proxy/app/main.py` e file correlati. In quel caso, ripristinarla
richiede anche di reintrodurre la verifica del JWT Rayfin lato proxy (vedi lo
stesso commit per `rayfin_auth.py`), dato che lì l'autenticazione utente→
backend non passa per il Fabric InvokeController.

### 7. Verifica end-to-end

1. Aprire l'URL dell'app pubblicata, accedere con Fabric SSO.
2. Avviare una nuova chat, fare una domanda sui dati del workspace.
3. Confermare che arrivi una risposta pertinente ai dati.
4. Controllare i log della funzione (Application Insights / log di Fabric)
   per eventuali errori nella chiamata MCP.

## Cosa non è stato verificato in questa sessione

- Il deploy reale (`rayfin up`) e se il backend Fabric accetta oggi il
  deploy di `rayfin/functions/` — richiede interattività/credenziali non
  disponibili qui, ed è un'area esplicitamente sperimentale.
- Il meccanismo esatto per impostare i segreti del service principal sulla
  funzione pubblicata (punto 4.5 sopra).
- L'assunzione `authLevel: "anonymous"` sulla funzione (in
  `app/rayfin/functions/src/askDataAgent.ts`) — cioè che l'autenticazione
  reale avvenga a monte, nel Fabric InvokeController. Se la funzione risulta
  raggiungibile senza sessione valida, va rivista.
- Una chiamata reale all'endpoint MCP del Data Agent con il service principal.

Tutto il resto (modelli dati Rayfin, UI React, la funzione Node/TypeScript)
è stato scritto secondo la documentazione ufficiale Microsoft Learn più
recente e i tipi reali dell'SDK installato, e compila/gira correttamente in
locale (vedi i controlli TypeScript e gli smoke test eseguiti su
`app/rayfin/functions/dist/`).
