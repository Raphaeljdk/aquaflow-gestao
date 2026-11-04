/**
 * Mobile clients never choose a Neon database or receive its credentials.
 * The authenticated backend resolves the organization from the session.
 */
export const PORTAL_ORIGIN = process.env.EXPO_PUBLIC_AQUAFLOW_URL?.trim() ?? "";

export type PortalRoute = "/login" | "/dashboard" | "/comandas" | "/agendamentos";

/** Rejects untrusted schemes, URL credentials, paths and query injections. */
export function portalUrl(route: PortalRoute): string | null {
  try {
    const raw = new URL(PORTAL_ORIGIN);
    const isHttps = raw.protocol === "https:";
    const localDevelopment =
      __DEV__ &&
      raw.protocol === "http:" &&
      (raw.hostname === "localhost" || raw.hostname === "127.0.0.1");
    if ((!isHttps && !localDevelopment) || raw.username || raw.password) return null;
    if (raw.pathname !== "/" || raw.search || raw.hash) return null;
    return new URL(route, raw.origin).toString();
  } catch {
    return null;
  }
}
