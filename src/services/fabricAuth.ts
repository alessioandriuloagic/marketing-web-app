/**
 * Entra token acquisition for direct browser-to-Fabric calls.
 *
 * The Fabric Data Agent MCP endpoint authenticates with a standard Entra bearer token for
 * the `https://api.fabric.microsoft.com` resource. Rayfin's Fabric SSO produces an app
 * session, not a Fabric API token, so we run a thin MSAL flow alongside it purely to mint
 * that token.
 *
 * Because the user is already signed in to Fabric in the same browser, `ssoSilent` with a
 * login hint normally completes without any prompt; the popup is only a fallback for the
 * first run or when consent is still required.
 */
import {
  PublicClientApplication,
  InteractionRequiredAuthError,
  type AccountInfo,
  type PopupRequest,
} from '@azure/msal-browser';

/** Grants delegated access to the Fabric REST + MCP surface as the signed-in user. */
const FABRIC_SCOPES = ['https://api.fabric.microsoft.com/.default'];

const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID ?? '';
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID ?? 'organizations';

export function isFabricAuthConfigured(): boolean {
  return clientId.length > 0;
}

let appPromise: Promise<PublicClientApplication> | null = null;

function getApp(): Promise<PublicClientApplication> {
  if (!appPromise) {
    appPromise = (async () => {
      const app = new PublicClientApplication({
        auth: {
          clientId,
          authority: `https://login.microsoftonline.com/${tenantId}`,
          redirectUri: window.location.origin,
        },
        cache: {
          // Survives reloads so the silent path works across sessions.
          cacheLocation: 'localStorage',
        },
      });
      await app.initialize();
      return app;
    })();
  }
  return appPromise;
}

function pickAccount(
  app: PublicClientApplication,
  loginHint?: string
): AccountInfo | undefined {
  const accounts = app.getAllAccounts();
  if (accounts.length === 0) return undefined;
  if (loginHint) {
    const match = accounts.find(
      (account) => account.username?.toLowerCase() === loginHint.toLowerCase()
    );
    if (match) return match;
  }
  return accounts[0];
}

/**
 * Returns a Fabric-scoped access token for the current user, prompting only when Entra
 * requires interaction (first consent, expired refresh token, MFA challenge).
 *
 * @param loginHint The Fabric-authenticated user's UPN, used to skip the account picker.
 */
export async function getFabricToken(loginHint?: string): Promise<string> {
  if (!isFabricAuthConfigured()) {
    throw new Error(
      'Entra sign-in is not configured. Set VITE_ENTRA_CLIENT_ID (and VITE_ENTRA_TENANT_ID) and redeploy.'
    );
  }

  const app = await getApp();
  const account = pickAccount(app, loginHint);

  if (account) {
    try {
      const result = await app.acquireTokenSilent({
        scopes: FABRIC_SCOPES,
        account,
      });
      return result.accessToken;
    } catch (error) {
      if (!(error instanceof InteractionRequiredAuthError)) {
        throw error;
      }
    }
  }

  // No cached account, or the cached one needs interaction. Try a silent SSO handshake
  // against the existing Fabric browser session before falling back to a visible popup.
  if (loginHint) {
    try {
      const result = await app.ssoSilent({ scopes: FABRIC_SCOPES, loginHint });
      return result.accessToken;
    } catch (error) {
      if (!(error instanceof InteractionRequiredAuthError)) {
        throw error;
      }
    }
  }

  const request: PopupRequest = { scopes: FABRIC_SCOPES };
  if (loginHint) request.loginHint = loginHint;
  if (account) request.account = account;

  const result = await app.acquireTokenPopup(request);
  return result.accessToken;
}
