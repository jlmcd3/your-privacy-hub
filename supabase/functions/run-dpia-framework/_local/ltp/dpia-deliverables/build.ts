// PROMPT 8K (2026-08-12) — RELOCATION SHIM. The DPIA deliverables builder now
// lives in `_shared/ltp/dpia-deliverables/` because the closed-loop perfect
// lint in run-quality-batch must import it, and edge bundles carry only their
// own function directory plus `_shared/`. No behaviour change: this module is
// a pure re-export so every existing importer of this path is untouched.
export * from "../../../../_shared/ltp/dpia-deliverables/build.ts";
