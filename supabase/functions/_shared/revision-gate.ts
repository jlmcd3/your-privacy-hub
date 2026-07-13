// RC-A A1 — Global revision gate. Read once at module load; flip via
// REVISIONS_ENABLED=true on the edge-function environment. Ships OFF.
// Errata mode on regenerate-assessment is exempt from this gate.
export const REVISIONS_ENABLED: boolean =
  String(Deno.env.get("REVISIONS_ENABLED") ?? "").toLowerCase() === "true";

export const REVISIONS_DISABLED_MESSAGE =
  "Revisions are temporarily disabled while we ship the Revision Contract program. Please use the free Errata channel for verbatim corrections, or wait for revisions to be re-enabled.";
