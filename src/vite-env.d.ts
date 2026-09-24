/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Entra app registration (SPA) used to mint Fabric-scoped tokens in the browser. */
  readonly VITE_ENTRA_CLIENT_ID?: string;
  /** Entra tenant ID. Defaults to "organizations" when unset. */
  readonly VITE_ENTRA_TENANT_ID?: string;
  /**
   * Workspace holding the published Fabric data agent.
   *
   * Deliberately NOT named `VITE_FABRIC_WORKSPACE_ID`: `rayfin up` rewrites `.env.local`
   * with a variable of that exact name pointing at the *app's own* workspace, and
   * `.env.local` outranks `.env` in Vite — so the value would be silently hijacked.
   */
  readonly VITE_DATA_AGENT_WORKSPACE_ID?: string;
  /** Item ID of the published Fabric data agent. */
  readonly VITE_DATA_AGENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
