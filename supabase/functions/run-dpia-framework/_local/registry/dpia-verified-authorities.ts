// PROMPT 8K (2026-08-12) — RELOCATION SHIM. The verified-authority registry
// moved to `_shared/registry/dpia-verified-authorities.ts` alongside the
// governance registry, so the deliverables builder resolves inside `_shared/`
// for every bundle. Pure re-export; no content change.
export * from "../../../_shared/registry/dpia-verified-authorities.ts";
