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

/**
 * Turns Entra's raw failures into something a user can act on.
 *
 * A misconfigured registration surfaces in the console as a cryptic "Unsafe attempt to
 * initiate navigation" — MSAL's hidden iframe receives an Entra error page that tries to
 * redirect the top window. Without this mapping the real cause stays invisible.
 */
function describeAuthError(error: unknown): string {
  const raw =
    error instanceof Error ? `${error.message}` : typeof error === 'string' ? error : '';

  if (raw.includes('AADSTS700016') || raw.includes('unauthorized_client')) {
    return `The Entra application ${clientId} does not exist in tenant ${tenantId}, or it is not enabled for this sign-in. Check VITE_ENTRA_CLIENT_ID.`;
  }
  if (raw.includes('AADSTS50011') || raw.includes('redirect_uri')) {
    return `The redirect URI ${window.location.origin} is not registered on the Entra application ${clientId}. Add it as a Single-page application redirect URI.`;
  }
  if (raw.includes('AADSTS65001') || raw.includes('consent_required')) {
    return 'Consent is required for the Fabric data agent permissions. Accept the prompt, or ask an administrator to grant consent.';
  }
  if (raw.includes('popup_window_error') || raw.includes('popup_blocked')) {
    return 'The sign-in popup was blocked by the browser. Allow popups for this site and retry.';
  }
  return raw || 'Entra sign-in failed.';
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

  // The silent paths are optimisations: any failure — including a misconfigured
  // registration — must degrade to the popup, which is the only place that can report a
  // meaningful error to the user.
  if (account) {
    try {
      const result = await app.acquireTokenSilent({
        scopes: FABRIC_SCOPES,
        account,
      });
      return result.accessToken;
    } catch (error) {
      if (!(error instanceof InteractionRequiredAuthError)) {
        console.warn('Silent Fabric token acquisition failed:', describeAuthError(error));
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
        console.warn('Fabric SSO handshake failed:', describeAuthError(error));
      }
    }
  }

  const request: PopupRequest = { scopes: FABRIC_SCOPES };
  if (loginHint) request.loginHint = loginHint;
  if (account) request.account = account;

  try {
    const result = await app.acquireTokenPopup(request);
    return result.accessToken;
  } catch (error) {
    throw new Error(describeAuthError(error));
  }
}
