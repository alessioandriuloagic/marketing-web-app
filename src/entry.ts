import { isMsalCallback } from './services/isMsalCallback';

if (isMsalCallback(new URL(window.location.href))) {
  import('@azure/msal-browser/redirect-bridge')
    .then(({ broadcastResponseToMainFrame }) => broadcastResponseToMainFrame())
    .catch((error: unknown) => {
      console.error('Entra authentication callback failed:', error);
      document.body.textContent = 'Entra authentication could not be completed. Close this window and try again.';
    });
} else {
  import('./main');
}
