// ITEM 378 (CORRECTION) — the canonical cppa-risk pipeline stamp.
//
// Lives in _shared so BOTH the legacy finalize path
// (run-cppa-risk-assessment) and the ROUTED LTP finalize point
// (_shared/ltp/generate-cppa-risk.ts → finalizeCppaRiskPayload) write the
// identical value at `_meta.internal.risk_pipeline_stamp`.
export const RISK_PIPELINE_STAMP = "risk-pipeline@item378-2026-08-05";
