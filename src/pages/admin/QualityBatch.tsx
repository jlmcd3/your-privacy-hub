// /admin/quality-batch — unchanged console (QB-P1/P2 lineage).
//
// ITEM 325: the implementation now lives in the shared
// <QualityConsole /> component so /admin/final-test cannot drift from it.
// This page renders it with showVariants=false, which is the legacy path:
// no `variant` / `tool_variants` field is sent to the orchestrator and the
// request bodies are byte-identical to pre-ITEM-325.

import { QualityConsole } from "@/components/admin/quality-console/QualityConsole";

export default function QualityBatch() {
  return <QualityConsole title="Quality Batch" caption="quality-batch-orchestrator" />;
}
