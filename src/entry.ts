import { isMsalCallback } from './services/isMsalCallback';

if (isMsalCallback(new URL(window.location.href))) {
  import('@azure/msal-browser/redirect-bridge')
    .then(({ broadcastResponseToMainFrame }) => broadcastResponseToMainFrame())
    .catch((error: unknown) => {
      console.error('Entra authentication callback failed:', error);
      document.body.textContent = "Impossibile completare l'autenticazione Entra. Chiudi questa finestra e riprova.";
    });
} else {
  import('./main');
}
