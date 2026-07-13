// RC-A A1 — Client-side revision gate. Set VITE_REVISIONS_ENABLED=true to
// re-enable. Ships OFF: refine entry points hide and refine URL param shows
// a disabled notice instead of the panel.
export const REVISIONS_ENABLED: boolean =
  String(import.meta.env.VITE_REVISIONS_ENABLED ?? "").toLowerCase() === "true";

export const REVISIONS_DISABLED_MESSAGE =
  "Revisions are temporarily disabled while we ship the Revision Contract program. Please use the free Errata channel for verbatim corrections, or wait for revisions to be re-enabled.";
