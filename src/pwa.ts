export function registerServiceWorker() {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  // Somente em produção e em ambiente seguro (https ou localhost)
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  const isSecure = window.location.protocol === "https:" || isLocalhost;

  if (!isSecure) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then(() => {
        // Registro bem-sucedido (silencioso para não poluir a UI)
      })
      .catch(() => {
        // Falha no registro também é silenciosa; não quebra o app
      });
  });
}