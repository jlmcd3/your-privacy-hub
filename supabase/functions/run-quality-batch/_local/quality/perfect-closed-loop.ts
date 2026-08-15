// PROMPT 9G — RELOCATION SHIM. The closed-loop perfect check moved to
// _shared/quality/perfect-closed-loop.ts so the quality-batch-orchestrator can
// run the SAME check as a dispatch-time pre-filter for pinned_only batches
// (single writer: there is exactly one implementation). This module keeps the
// original import path working for run-quality-batch and its batteries.
export * from "../../../_shared/quality/perfect-closed-loop.ts";
