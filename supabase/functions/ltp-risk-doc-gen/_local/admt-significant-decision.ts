// DOC 148 (2026-09-02) — re-export stub. The canonical § 7150(b)(3) /
// § 7001(ddd) significant-decision classifier moved to
// _shared/ltp/admt-significant-decision.ts so the risk factor engine can
// apply the same classification at the render chokepoint (A-Team Batch-8
// finding: the doc-137 gate never reached the surface customers read).
// This stub keeps every existing _local import site working and keeps the
// 4-way _local mirror byte-identical. Edit the _shared copy only.
export {
  type AdmtSignificantDecisionClass,
  classifyAdmtSignificantDecision,
} from "../../_shared/ltp/admt-significant-decision.ts";
