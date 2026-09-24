# Marketing Data Chat

A Microsoft Fabric app that gives users a ChatGPT-style interface for talking to a published
**Fabric data agent**. Users ask questions in plain language, the agent answers using the data
they already have access to, and every conversation is kept in the app's own chat history.

Built with [Rayfin](https://learn.microsoft.com/en-us/fabric/apps/) (`npm create @microsoft/rayfin@latest`).

## Architecture

```
Browser (React + Vite)
  │  Fabric SSO  ──────────────► Rayfin auth + data service (chat history, MSSQL)
  │
  │  MSAL (delegated Entra token for https://api.fabric.microsoft.com)
  │  JSON-RPC over fetch: tools/list -> tools/call
  ▼
Fabric Data Agent MCP server
  https://api.fabric.microsoft.com/v1/mcp/workspaces/{workspaceId}/dataagents/{agentId}/agent
```

Chat history is stored through the Rayfin **data service** (`rayfin/data`), backed by
Fabric-managed MSSQL with row-level security. The data agent is queried **directly from the
browser**.

### Why the MCP call runs in the browser

The original design put the MCP call in a server-side Rayfin function. That turned out to be
unusable: **the Functions workload is not supported on this tenant/capacity.** Invoking a deployed
function returns `HTTP 400` with:

```json
{ "errorCode": "WorkloadException", "subErrorCode": "FeatureNotSupported" }
```

This is a platform gate, not a bug in the function — a deployed Rayfin function can never return a
non-200 itself (`ensureFormattedReturnType` hardcodes `status: 200` outside local dev and reports
the real outcome in the body), so any non-200 on `/functions/*/invoke` comes from the Fabric
gateway. The same gate produced the *"This application is intended for use only by the app
builder"* message other users saw.

Calling the endpoint from the browser is viable because it turns out to be unusually
browser-friendly — all verified against the live endpoint:

| Property | Observed |
| --- | --- |
| CORS | `access-control-allow-origin` echoes the app origin; allows `authorization`, `content-type`, `mcp-session-id`, `mcp-protocol-version` |
| Session | **Stateless** — no `mcp-session-id` is ever issued |
| Handshake | `tools/list` and `tools/call` work with **no prior `initialize`** |
| Transport | Plain `application/json`, not an SSE stream |

Because it is stateless and non-streaming, `src/services/dataAgentMcp.ts` speaks JSON-RPC with
`fetch` directly and deliberately **does not** depend on the MCP SDK.

Security-wise this is equivalent to the original design, and better than the service-principal
alternative: the token is a **delegated token for the signed-in user**, so the agent still only
sees data that user is allowed to see. No shared identity, and no secret in the bundle — MSAL
acquires the token at runtime.

### No extra LLM is needed

A published Fabric data agent exposes exactly **one** MCP tool: a natural-language "ask" tool. All
schema reasoning, query generation, and answer synthesis happen inside Fabric, so there is no Azure
OpenAI dependency here.

The tool name and its input argument name are **discovered at runtime** via `tools/list` rather
than hard-coded, because both are configured per data agent when it is published. For `da_IP` they
resolve to `DataAgent_da_IP` / `userQuestion`.

### Conversation context

The MCP tool is stateless per call, so the last few turns are replayed inline in the prompt
(`composePrompt` in `src/services/dataAgentMcp.ts`).

## Project layout

| Path | Purpose |
| --- | --- |
| `rayfin/rayfin.yml` | Services enabled for this app: `auth`, `data`, `staticHosting`. `functions` is disabled — see above. |
| `rayfin/data/Conversation.ts` | Chat thread entity, row-level-secured to its owner. |
| `rayfin/data/Message.ts` | Chat message entity, row-level-secured to its owner. |
| `src/services/dataAgentMcp.ts` | Browser MCP client for the data agent. |
| `src/services/fabricAuth.ts` | MSAL flow that mints the Fabric-scoped Entra token. |
| `src/services/chat.ts` | Chat history CRUD + `askDataAgent`. |
| `src/hooks/useChat.ts` | Chat state machine. |
| `src/pages/ChatPage.tsx` | The chat screen. |
| `rayfin/functions/` | **Unused.** Kept in case the Functions workload is enabled later. |

## Configuration

Set these in `.env.local` for local dev, and in the environment used by `npx rayfin up` for
deploys. Vite inlines `VITE_*` variables at build time.

| Variable | Required | Default |
| --- | --- | --- |
| `VITE_ENTRA_CLIENT_ID` | **yes** | — |
| `VITE_ENTRA_TENANT_ID` | no | `organizations` |
| `VITE_FABRIC_WORKSPACE_ID` | no | `f67f0cf4-b2c5-410e-b733-3b5c25b83ffd` (`AGIC IP MARKETING - AGENT`) |
| `VITE_FABRIC_DATA_AGENT_ID` | no | `c4a26507-3d2d-4f2f-9591-c88a013a1f22` (`da_IP`) |

### Required Entra app registration

`VITE_ENTRA_CLIENT_ID` must point at an Entra **single-page application** registration. It
must be a registration dedicated to this app: reusing an existing service principal (for
example a backend runtime SPN) does not work, because those have no SPA redirect URI and
mixing a public client into a confidential one is poor hygiene.

1. Entra admin center → **App registrations** → **New registration**.
2. Platform **Single-page application**, redirect URI = the deployed app origin
   (e.g. `https://<app>.webapp.fabricapps.net`). Add `http://localhost:5173` for local dev.
3. **API permissions** → **Power BI Service** → *Delegated* → `DataAgent.Execute.All` and
   `DataAgent.Read.All`. These are the scopes the data agent MCP endpoint checks.

Both scopes are **user-consentable**, so admin consent is optional: unless the tenant
restricts user consent, each user accepts once at the first sign-in popup.

Equivalent Microsoft Graph call, for scripted provisioning:

```jsonc
POST https://graph.microsoft.com/v1.0/applications
{
  "displayName": "marketing-data-chat-spa",
  "signInAudience": "AzureADMyOrg",
  "spa": { "redirectUris": ["https://<app>.webapp.fabricapps.net"] },
  "requiredResourceAccess": [{
    "resourceAppId": "00000009-0000-0000-c000-000000000000",  // Power BI Service
    "resourceAccess": [
      { "id": "c6756612-6853-4145-a661-90c1d045b2dc", "type": "Scope" }, // DataAgent.Execute.All
      { "id": "40fa91d5-73ef-412c-a8c8-c8658670d0eb", "type": "Scope" }  // DataAgent.Read.All
    ]
  }]
}
```

Creating the registration needs a directory role (Application Developer or higher) when the
tenant sets `allowedToCreateApps = false`, which is the default in many organisations.

Users must also have access to the data agent's workspace and to the data behind it.

## Running it

### Local development

```bash
npm install
npx rayfin login
npm run dev
```

Local dev signs in against the local backend, so chat history is kept in memory. The data agent
itself **is** reachable locally once `VITE_ENTRA_CLIENT_ID` is set in `.env.local` and
`http://localhost:5173` is registered as a redirect URI; without it, `askDataAgent` returns a
clearly-labelled stub.

### Deploy to Fabric

```bash
npx rayfin login
npx rayfin up          # builds the frontend and applies schema changes
npx rayfin up status
```

Then open the app item from the Fabric portal.

**Current deployment** (branch `feature/fabric-data-agent-chat`):

| | |
| --- | --- |
| Deploy workspace | `ws-marketing-data-chat` (`09745c10-8d0c-4b14-aafe-dd453bd1c982`), **Italy North** |
| App URL | https://early-wave-d05589855e-italynorth.webapp.fabricapps.net |
| AppBackend item | `363190a7-53f1-40fa-9946-3e8cd1acefe5` |
| Data agent workspace | `AGIC IP MARKETING - AGENT` (`f67f0cf4-…`), North Europe |

The app and the data agent intentionally live in different workspaces/regions — the MCP call is a
plain cross-workspace REST call, so only the *deploy* workspace is region-constrained.

Remember that `VITE_*` variables are **inlined at build time**, so changing one requires a
redeploy, not just a restart.

## Prerequisites in Fabric

- The data agent must be **published** — the MCP endpoint 404s/errors for a draft agent.
- Paid F2+ capacity (or Power BI Premium P1+ with Fabric enabled).
- **The deploy workspace must sit on a capacity in a region where Fabric Apps (preview) is
  available.** This is the single easiest thing to get wrong: in an unsupported region every
  `rayfin up` fails with `403 FeatureNotAvailable` at *Resolving Rayfin item*, which looks exactly
  like a missing tenant setting but is not. At the time of writing **North Europe is _not_
  supported**, while **Italy North, West Europe, France Central, Norway East, Sweden Central and
  Switzerland North are**. See
  [region availability](https://learn.microsoft.com/fabric/admin/region-availability).
  Quick check: `POST /v1/workspaces/{id}/items` with `{"type":"AppBackend"}` — `403
  FeatureNotAvailable` means region, `403` on other item types means permissions.
- Tenant setting **Fabric Apps (preview)** enabled in the admin portal, for your org or for a
  security group containing the deploying user.
- Tenant settings enabled: *Users can use Copilot and other features powered by Azure OpenAI*,
  *Capacities can be designated as Fabric Copilot capacities*, and cross-geo processing/storing
  for AI. Changes can take up to an hour to propagate.
- Each end user needs read access to the workspace **and** to the data sources behind the agent.
  Delegated tokens cannot grant more than the user already has.
- An Entra **SPA app registration** with admin-consented delegated Power BI permissions — see
  [Required Entra app registration](#required-entra-app-registration).

## Known constraints

- **Long questions may time out.** A simple question measured ~22s end to end; complex ones can
  take substantially longer. The browser client allows 240s before aborting. If that proves
  insufficient, the MCP `tasks` extension (the agent advertises `tasks.requests.tools.call`) is the
  documented escape hatch and would need to be added to `src/services/dataAgentMcp.ts`.
- **Rayfin Functions are unavailable on this tenant/capacity** (`WorkloadException` /
  `FeatureNotSupported`). The unused source under `rayfin/functions/` is retained so the
  server-side design can be restored if the workload is ever enabled.
- **Chat history lives in Fabric-managed MSSQL, not SQLite.** A local SQLite file cannot survive
  in the Fabric-hosted backend, and the Rayfin data service already provides per-user row-level
  security for free.
- `@text()` fields are capped at 4000 characters (`Message.content`); longer agent answers are
  truncated with an ellipsis before being stored.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Local dev stack (frontend + local backend). |
| `npm run build` | Type-check and build the frontend. |
| `npm test` | Vitest unit tests. |
| `npm run lint` | ESLint. |
| `npx rayfin up` | Deploy app and schema to Fabric. |
