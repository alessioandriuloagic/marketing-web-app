/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Entra app registration (SPA) used to mint Fabric-scoped tokens in the browser. */
  readonly VITE_ENTRA_CLIENT_ID?: string;
  /** Entra tenant ID. Defaults to "organizations" when unset. */
  readonly VITE_ENTRA_TENANT_ID?: string;
  /** Workspace holding the published Fabric data agent. */
  readonly VITE_FABRIC_WORKSPACE_ID?: string;
  /** Item ID of the published Fabric data agent. */
  readonly VITE_FABRIC_DATA_AGENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
