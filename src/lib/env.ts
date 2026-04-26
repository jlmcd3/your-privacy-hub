/**
 * Centralized environment detection helpers.
 *
 * Reuse these instead of inlining `window.location.hostname` checks in
 * components — that pattern has burned us before (test-mode banner showing
 * on the custom production domain). All debug banners, admin scaffolding,
 * and test-only UI should gate on `isLovablePreviewHost()` or `isDevHost()`.
 */

const PREVIEW_HOST_SUFFIXES = ["lovable.app", "lovable.dev"];
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function getHostname(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname || "";
}

/** True on `localhost`, `127.0.0.1`, etc. */
export function isLocalHost(): boolean {
  return LOCAL_HOSTS.has(getHostname());
}

/** True on Lovable-hosted preview domains (`*.lovable.app`, `*.lovable.dev`). */
export function isLovablePreviewHost(): boolean {
  const host = getHostname();
  return PREVIEW_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

/**
 * True in any non-production surface: localhost dev server or any Lovable
 * preview/staging URL. False on custom production domains.
 *
 * Use this to gate dev-only banners, admin scaffolding, debug widgets,
 * and any UI that must never reach real end users.
 */
export function isDevHost(): boolean {
  return isLocalHost() || isLovablePreviewHost();
}

/**
 * True only on the live production custom domain — the inverse of
 * `isDevHost()`. Useful for "production-only" hardening (e.g. analytics
 * pixels you don't want firing in preview).
 */
export function isProductionHost(): boolean {
  return typeof window !== "undefined" && !isDevHost();
}
