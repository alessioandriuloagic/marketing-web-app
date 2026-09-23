# Marketing Agente

Chatbot ("Marketing Agente") con un'interfaccia semplice in stile Claude/ChatGPT
(cronologia chat a sinistra, conversazione corrente a destra) che risponde
usando il **Fabric Data Agent** pubblicato nel workspace `AGIC IP MARKETING -
AGENT`, consumato via **MCP**.

## Architettura

Tutto vive in un'unica Fabric App (`app/`), costruita con **Rayfin**
(TypeScript + React):

- **Frontend** (`app/src/`) — UI chat, login Fabric SSO, persistenza delle
  conversazioni sul data layer generato da Rayfin.
- **Modelli dati** (`app/rayfin/data/`) — entità `Conversation`/`Message`
  con permessi per-utente.
- **Rayfin Function** (`app/rayfin/functions/`) — un progetto Azure Functions
  (Node/TypeScript) separato che gira *dentro* Fabric come parte della stessa
  Fabric App. Tiene le credenziali di un service principal e parla MCP con il
  Data Agent (`Server MCP Fabric da_IP`, workspace `AGIC IP MARKETING -
  AGENT`). Il frontend la invoca con `client.functions.askDataAgent.invoke()`
  — autenticato automaticamente dalla sessione Rayfin dell'utente, senza
  gestione manuale di token.

**Nota importante**: `@microsoft/rayfin-functions` è etichettato
"Experimental" da Microsoft e potrebbe non essere ancora abilitato lato
backend Fabric per tutti i tenant/versioni CLI (un caso reale con versioni
CLI molto vicine a quella usata qui ha riportato un rifiuto in deploy). Se
`rayfin up` fallisce sul deploy della function, vedi la sezione "Se il deploy
della function fallisce" in [`DEPLOYMENT.md`](./DEPLOYMENT.md) per il piano
di ripiego (un proxy esterno equivalente, già scritto e testato, recuperabile
dalla cronologia git).

## Struttura del repository

```
app/
├── rayfin/
│   ├── data/           Entità Conversation/Message (Rayfin data layer)
│   ├── functions/       Azure Function askDataAgent (chiamata MCP al Data Agent)
│   └── rayfin.yml        Configurazione servizi (data, auth, staticHosting)
├── src/                 Frontend React (chat UI)
└── package.json
DEPLOYMENT.md            Guida passo-passo alla pubblicazione
```

## Sviluppo locale

### Frontend + data layer

```bash
cd app
npm install
npm run dev
```

### Rayfin Function

```bash
cd app/rayfin/functions
npm install
cp local.settings.json.example local.settings.json  # e compila le credenziali
npm i -g azure-functions-core-tools@4  # una tantum, per `func start`
npm run start
```

## Pubblicazione

Vedi la guida completa in [`DEPLOYMENT.md`](./DEPLOYMENT.md).
