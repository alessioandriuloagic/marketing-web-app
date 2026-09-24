# Marketing Data Chat

A Microsoft Fabric app that gives users a ChatGPT-style interface for talking to a published
**Fabric data agent**. Users ask questions in plain language, the agent answers using the data
they already have access to, and every conversation is kept in the app's own chat history.

Built with [Rayfin](https://learn.microsoft.com/en-us/fabric/apps/) (`npm create @microsoft/rayfin@latest`).

## Architecture

```
Browser (React + Vite, Fabric SSO)
  │  client.functions.askDataAgent.invoke({ question, historyJson })
  ▼
Rayfin Function  (rayfin/functions — server-side, runs in Fabric)
  │  MCP over Streamable HTTP, Authorization: Bearer <OBO Fabric token>
  ▼
Fabric Data Agent MCP server
  https://api.fabric.microsoft.com/v1/mcp/workspaces/{workspaceId}/dataagents/{agentId}/agent
```

Chat history is stored separately through the Rayfin **data service** (`rayfin/data`), which is
backed by Fabric-managed MSSQL.

### Why the MCP call runs server-side

`api.fabric.microsoft.com` is not designed to be called from browser JavaScript, and a Fabric
bearer token must never reach the client bundle. The `askDataAgent` Rayfin function is the trust
boundary: it declares `udf.connection({ audienceType: AudienceType.Fabric })`, and the Fabric host
hands it an **on-behalf-of token for the signed-in user**. The data agent therefore only ever sees
data that particular user is allowed to see — there is no shared service principal.

### No extra LLM is needed

A published Fabric data agent exposes exactly **one** MCP tool: a natural-language "ask" tool. All
schema reasoning, query generation, and answer synthesis happen inside Fabric. The function just
relays the question and returns the text blocks, so there is no Azure OpenAI dependency here.

The tool name and its input argument name are **discovered at runtime** via `tools/list` rather
than hard-coded, because both are configured per data agent when it is published.

### Conversation context

The MCP tool is stateless per call. `askDataAgent` therefore replays the last few turns of the
conversation inline in the prompt (`composePrompt` in `rayfin/functions/src/dataAgentMcp.ts`).

## Project layout

| Path | Purpose |
| --- | --- |
| `rayfin/rayfin.yml` | Services enabled for this app: `auth`, `data`, `functions`, `staticHosting`. |
| `rayfin/data/Conversation.ts` | Chat thread entity, row-level-secured to its owner. |
| `rayfin/data/Message.ts` | Chat message entity, row-level-secured to its owner. |
| `rayfin/functions/src/function_app.ts` | The `askDataAgent` server-side function. |
| `rayfin/functions/src/dataAgentMcp.ts` | MCP client for the data agent. |
| `rayfin/functions/src/types.ts` | **Auto-generated.** Types the frontend `invoke()` calls. |
| `src/services/chat.ts` | Chat history CRUD + `askDataAgent` invocation. |
| `src/hooks/useChat.ts` | Chat state machine. |
| `src/pages/ChatPage.tsx` | The chat screen. |

## Configuration

The data agent coordinates default to the values baked into `rayfin/functions/src/function_app.ts`:

| Setting | Value |
| --- | --- |
| Workspace | `fabric-ip-agic-prod-engine-crm` (`c3c64719-18fb-4598-891c-3cdc94f79d2d`) |
| Data agent | `DA_Marketing_For_App` (`bc867c23-3e1a-4069-9c3f-66f45ee4a2ef`) |

To point the app at a different agent without editing code, set them as deployed secrets:

```bash
npx rayfin secret set FABRIC_WORKSPACE_ID
npx rayfin secret set FABRIC_DATA_AGENT_ID
```

## Running it

### Local development

```bash
npm install
npx rayfin login
npm run dev
```

Local dev signs in against the local backend, so chat history is kept in memory and
`askDataAgent` returns a clearly-labelled stub. **The real data agent is only reachable from the
deployed backend** — Fabric SSO and the on-behalf-of Fabric token both require the Fabric portal.

### Deploy to Fabric

```bash
npx rayfin login
npx rayfin up          # builds the frontend, deploys the function, applies schema changes
npx rayfin up status
```

Then open the app item from the Fabric portal.

After changing anything under `rayfin/functions/src/`, regenerate the frontend-facing types:

```bash
npx rayfin dev functions apply   # runs typegen and watches for changes
```

## Prerequisites in Fabric

- The data agent must be **published** — the MCP endpoint 404s/errors for a draft agent.
- Paid F2+ capacity (or Power BI Premium P1+ with Fabric enabled).
- Tenant settings enabled: *Users can use Copilot and other features powered by Azure OpenAI*,
  *Capacities can be designated as Fabric Copilot capacities*, and cross-geo processing/storing
  for AI. Changes can take up to an hour to propagate.
- Each end user needs read access to the workspace **and** to the data sources behind the agent.
  On-behalf-of tokens cannot grant more than the user already has.

## Known constraints

- **Long questions may time out.** Data agent answers can take 30–120s while the public function
  invocation path has its own timeout. If slow questions fail, the MCP `tasks` extension
  (`tasks/get` polling) is the documented escape hatch and would need to be added to
  `dataAgentMcp.ts`.
- **Chat history lives in Fabric-managed MSSQL, not SQLite.** A local SQLite file cannot survive
  in the Fabric-hosted backend, and the Rayfin data service already provides per-user row-level
  security for free.
- `@text()` fields are capped at 4000 characters (`Message.content`); longer agent answers are
  truncated with an ellipsis before being stored.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Local dev stack (frontend + local functions host). |
| `npm run build` | Type-check and build the frontend. |
| `npm test` | Vitest unit tests. |
| `npm run lint` | ESLint. |
| `npx rayfin up` | Deploy app, functions, and schema to Fabric. |
