// ---------------------------------------------------------------------------
// Portal vs. storefront detection.
//
// The same build is served on two domains:
//   - fonzotech.co.uk         -> the public customer storefront
//   - portal.fonzotech.co.uk  -> the private team portal
//
// The app decides which experience to show at runtime, based on the hostname.
//
// Previewing the portal:
//   - Add "?portal=1" to ANY url to force the portal view, e.g.
//     https://fonzotech.co.uk/?portal=1
//     This is handy before the portal.* subdomain's DNS has propagated, and
//     for testing. It is not a security risk — every staff action is still
//     verified on the server.
//   - Locally, you can also visit a "portal." host, e.g.
//     http://portal.localhost:5000
// ---------------------------------------------------------------------------

/** True when the app should show the team portal instead of the storefront. */
export function isPortalHost(): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.hostname.toLowerCase().startsWith("portal.")) return true;
  // Preview / testing override: ?portal=1 on any address.
  return new URLSearchParams(window.location.search).has("portal");
}

/** Absolute URL of the team portal, derived from the current host. */
export function portalUrl(): string {
  if (typeof window === "undefined") return "/";
  const { protocol, hostname, port } = window.location;
  let host = hostname.toLowerCase();
  if (!host.startsWith("portal.")) {
    host = `portal.${host.replace(/^www\./, "")}`;
  }
  return `${protocol}//${host}${port ? `:${port}` : ""}/`;
}
