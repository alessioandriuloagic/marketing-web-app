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

Questi valori sono già impostati come default in `mcp-proxy/.env.example` e
`mcp-proxy/app/config.py`.

## Modello di autenticazione (importante da capire prima di procedere)

Ci sono due autenticazioni distinte in questo sistema, e non vanno confuse:

1. **Chi può aprire l'app e chiamare il proxy** — risolto con Fabric SSO +
   verifica del JWT di sessione emesso da Rayfin. Ogni utente che apre l'app
   fa login con la propria identità Microsoft Entra ID tramite il portale
   Fabric; il frontend invia il token di sessione Rayfin (`client.auth`) al
   proxy Python a ogni richiesta; il proxy lo verifica crittograficamente
   contro l'endpoint JWKS di Rayfin (non una chiave condivisa). Questo dà
   autenticazione reale e tracciabilità per utente.
2. **Con quali permessi si interroga il Data Agent** — qui c'è un limite
   attuale di Rayfin: il framework non espone all'app un token Fabric/Entra
   delegato dell'utente (quella capacità — vero On-Behalf-Of — esiste solo
   nel Workload Development Kit classico, un framework diverso e più pesante).
   Quindi la chiamata effettiva al Data Agent gira sempre con un **service
   principal** condiviso: tutti gli utenti autenticati vedono le stesse
   risposte, indipendentemente dai loro permessi individuali su Fabric.

Se in futuro serve isolamento dei permessi per singolo utente, l'unica strada
oggi è migrare quella parte al Workload Development Kit classico — un
progetto separato e più grande, non uno sviluppo incrementale di questo.

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

### 4. Creare il service principal per il proxy

1. Registrare una nuova app Microsoft Entra ID (o riusarne una esistente)
   dedicata al proxy.
2. Generare un client secret.
3. Concedere a questo service principal accesso al workspace **AGIC IP
   MARKETING - AGENT** (ruolo Viewer/Member a seconda di cosa serve leggere)
   seguendo [Fabric data agent service principal
   auth](https://learn.microsoft.com/fabric/data-science/data-agent-service-principal).
4. Compilare `mcp-proxy/.env` (copiato da `.env.example`) con
   `FABRIC_TENANT_ID`, `FABRIC_CLIENT_ID`, `FABRIC_CLIENT_SECRET`.

### 5. Distribuire `mcp-proxy`

Containerizzato con il `Dockerfile` incluso, su qualsiasi host in grado di
tenere variabili d'ambiente come segreti (Azure Container Apps, Azure App
Service, ecc.):

```bash
cd mcp-proxy
docker build -t marketing-agente-mcp-proxy .
docker run -p 8000:8000 --env-file .env marketing-agente-mcp-proxy
```

Annotare l'URL pubblico assegnato: servirà al passo 7.

### 6. Pubblicare la Fabric App con Rayfin

```bash
cd app
npm install
npx rayfin login
npx rayfin up --workspace "AGIC IP MARKETING - AGENT"
```

Assicurarsi che `rayfin/rayfin.yml` abbia `services.auth.fabric.enabled: true`
(già impostato in questo repo) prima del deploy.

### 7. Collegare frontend e proxy

1. Impostare `VITE_CHAT_API_URL` (l'URL pubblico del proxy dal passo 5) come
   variabile d'ambiente di build per `app/`, poi rifare `npx rayfin up` (o
   passare `--env-file`).
2. **Verifica manuale necessaria** (non eseguibile da questa sandbox): dopo il
   primo login riuscito nell'app, ispezionare un token di sessione Rayfin
   reale per confermarne gli `iss`/`aud`, e impostare `RAYFIN_JWKS_URL` /
   `RAYFIN_ISSUER` / `RAYFIN_AUDIENCE` in `mcp-proxy/.env` di conseguenza
   (l'URL JWKS ha probabilmente la forma
   `https://<app>-app.rayfin.windows.net/auth/jwks`, da confermare contro il
   deployment reale). Riavviare/ridistribuire `mcp-proxy` dopo la modifica.
3. Impostare `ALLOWED_ORIGIN` in `mcp-proxy/.env` sull'origine effettiva
   dell'app pubblicata (per il CORS).

### 8. Verifica end-to-end

1. Aprire l'URL dell'app pubblicata, accedere con Fabric SSO.
2. Avviare una nuova chat, fare una domanda sui dati del workspace.
3. Confermare che arrivi una risposta pertinente ai dati.
4. Controllare i log di `mcp-proxy`: ogni richiesta deve mostrare `sub`/`email`
   dell'utente verificato, a conferma che la verifica JWT funziona.

## Cosa non è stato verificato in questa sessione

- Il deploy reale (`rayfin up`, creazione risorse Azure) — richiede
  interattività/credenziali non disponibili qui.
- Un token di sessione Rayfin reale (per confermare `RAYFIN_JWKS_URL` /
  `iss`/`aud` esatti) — richiede un login reale nell'app pubblicata.
- Una chiamata reale all'endpoint MCP del Data Agent con il service principal.

Tutto il resto (modelli dati Rayfin, UI React, servizio FastAPI) è stato
scritto secondo la documentazione ufficiale Microsoft Learn più recente e
verificato localmente dove possibile (vedi i test in `mcp-proxy/tests`).
