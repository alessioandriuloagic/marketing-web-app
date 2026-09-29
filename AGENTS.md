# AGENTS.md

This project ships Rayfin agent context.
Load `.agents/skills/rayfin/SKILL.md` and the `rayfin` MCP server in `.mcp.json` before writing Rayfin code.

Rayfin docs are version-locked to the packages installed in this project.
Prefer the MCP tools `search_docs`, `get_doc`, `list_docs`, and `discover_packages` for examples, API details, and troubleshooting.
If MCP is unavailable, run `rayfin docs ...` from the project root so the CLI reads this project's `node_modules`.
If `rayfin` is not on `PATH`, use `npx -y @microsoft/rayfin-cli docs ...` from the project root.

Use `discover_packages` or `rayfin docs discover <topic>` when installed docs do not cover the task.

## Kaizen Learnings

- **[2026-09-28] Verify Entra configuration before Rayfin deployment** → [kaizen/20260928-verify-entra-build.md](kaizen/20260928-verify-entra-build.md)
- **[2026-09-29] Keep the MSAL callback out of the app bootstrap** → [kaizen/20260929-msal-popup-callback.md](kaizen/20260929-msal-popup-callback.md)
