const buildId =
  typeof import.meta !== "undefined" && import.meta.env
    ? import.meta.env.VITE_APP_BUILD_ID || import.meta.env.VITE_APP_VERSION
    : undefined;

/**
 * APP_VERSION define a versão exibida no app.
 * - Se existir VITE_APP_BUILD_ID ou VITE_APP_VERSION no ambiente de build, usa esse valor.
 * - Caso contrário, gera um identificador baseado na data/hora do bundle.
 *
 * Isso evita ter que alterar manualmente o número a cada deploy.
 */
export const APP_VERSION: string =
  buildId ||
  (() => {
    try {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const hh = String(now.getHours()).padStart(2, "0");
      const mi = String(now.getMinutes()).padStart(2, "0");
      return `${yyyy}.${mm}.${dd}-${hh}${mi}`;
    } catch {
      return "dev";
    }
  })();