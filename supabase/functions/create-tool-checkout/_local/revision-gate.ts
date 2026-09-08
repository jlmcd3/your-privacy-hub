// Local copy of the RC-A A1 global revision gate. The canonical file lives at
// regenerate-assessment/_local/revision-gate.ts; cross-function imports are not
// bundled at deploy time, so this function reads the same env flag itself.
// Ships OFF. Flip via REVISIONS_ENABLED=true on the edge-function environment.
export const REVISIONS_ENABLED: boolean =
  String(Deno.env.get("REVISIONS_ENABLED") ?? "").toLowerCase() === "true";
