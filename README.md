# Marketing Agente

Chatbot ("Marketing Agente") con un'interfaccia semplice in stile Claude/ChatGPT
(cronologia chat a sinistra, conversazione corrente a destra) che risponde
usando il **Fabric Data Agent** pubblicato nel workspace `AGIC IP MARKETING -
AGENT`, consumato via **MCP**.

## Architettura

Il progetto è composto da due parti distribuite separatamente:

- **`app/`** — la Fabric App vera e propria, costruita con **Rayfin**
  (TypeScript + React). Contiene l'interfaccia chat e la persistenza delle
  conversazioni (Rayfin data layer), con login tramite Fabric SSO. Viene
  pubblicata nel workspace Fabric con `rayfin up`.
- **`mcp-proxy/`** — un piccolo backend Python/FastAPI, distribuito
  separatamente (es. Azure Container Apps), che tiene le credenziali di un
  service principal e parla MCP con il Data Agent per conto dell'app.

Una Fabric App pubblicata è solo hosting statico + servizi gestiti (DB, auth):
non esiste ancora un compute server-side supportato dentro l'app stessa, quindi
non può custodire un segreto per chiamare direttamente l'endpoint MCP del Data
Agent (che richiede un bearer token Fabric a ogni chiamata). Da qui la scelta
di un piccolo backend esterno e fidato che tiene quel segreto.

Il frontend autentica ogni chiamata al proxy con il JWT di sessione emesso da
Rayfin (`client.auth`), verificato lato proxy tramite l'endpoint JWKS di
Rayfin — vera autenticazione per-utente, non una chiave condivisa. Questo però
**non** dà isolamento dei permessi Fabric per singolo utente sulla chiamata al
Data Agent: quella gira sempre con il service principal. Il modello di
autenticazione completo, con le alternative valutate e perché sono state
scartate, è documentato in [`DEPLOYMENT.md`](./DEPLOYMENT.md).

## Struttura del repository

```
app/          Fabric App (Rayfin + React) — chat UI, data model, auth
mcp-proxy/    Backend Python/FastAPI — proxy verso l'MCP del Data Agent
DEPLOYMENT.md Guida passo-passo alla pubblicazione
```

## Sviluppo locale

### `app/`

```bash
cd app
npm install
npm run dev
```

Richiede le variabili d'ambiente in `app/.env` (vedi `app/rayfin/.env.example`
e i riferimenti a `VITE_*` in `src/lib`).

### `mcp-proxy/`

```bash
cd mcp-proxy
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
cp .env.example .env  # e compila le credenziali del service principal
.venv/bin/uvicorn app.main:app --reload
```

Test:

```bash
.venv/bin/python -m pytest tests -v
```

## Pubblicazione

Vedi la guida completa in [`DEPLOYMENT.md`](./DEPLOYMENT.md).
