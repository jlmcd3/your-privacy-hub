// DOC 148 (2026-09-02) — re-export stub. The canonical § 7150(b)(3) /
// § 7001(ddd) significant-decision classifier moved to
// ltp/admt-significant-decision.ts so the risk factor engine can
// apply the same classification at the render chokepoint (A-Team Batch-8
// finding: the doc-137 gate never reached the surface customers read).
// This stub keeps every existing _local import site working and keeps the
// 4-way _local mirror byte-identical. DEPLOY-CAP (2026-09-09): the module
// itself now lives at <fn>/_local/ltp/ in the four risk functions (it left
// _shared so non-risk functions stop bundling it); the copies are guarded
// byte-identical by tests/edge/risk-local-mirror.test.ts — edit all four.
export {
  type AdmtSignificantDecisionClass,
  type AdmtDecisionClass,
  type AdmtDecisionResolution,
  classifyAdmtSignificantDecision,
  resolveAdmtSignificantDecision,
  SIGNIFICANT_DECISION_CATEGORY_OPTS,
  HOUSING_DECISION_BASIS_OPTS,
} from "./ltp/admt-significant-decision.ts";
