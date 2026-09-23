export const fabricAuthOptions = {
  workspaceId: import.meta.env.VITE_FABRIC_WORKSPACE_ID ?? "",
  projectId: import.meta.env.VITE_FABRIC_PROJECT_ID ?? "",
  fabricPortalUrl:
    import.meta.env.VITE_FABRIC_PORTAL_URL ?? "https://app.fabric.microsoft.com",
  returnOrigin: window.location.origin,
};
