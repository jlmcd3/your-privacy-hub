// /all-ptest v2 (DOC 261, 2026-09-14) — the job rows one document needs.
// Shared by the driver's enqueue and by the `generate` job (which enqueues a
// golden document's jobs once the regeneration lands).

import type { Effort } from "./model-calls.ts";
import { WORKER_KIND_LIST } from "./workers.ts";

export interface DocumentJobSpec {
  batchId: string;
  userId: string | null;
  tool: string;
  assessmentId: string;
  companyName: string | null;
  goldenId?: string | null;
  reviewEffort: Effort;
  classifyEffort: Effort;
}

/** lint → the four workers → classify, for one document. */
export function documentJobRows(spec: DocumentJobSpec): Record<string, unknown>[] {
  const common = {
    batch_id: spec.batchId, tool_slug: spec.tool, assessment_id: spec.assessmentId,
    company_name: spec.companyName, run_by: spec.userId, golden_id: spec.goldenId ?? null,
  };
  return [
    { ...common, kind: "lint", effort: "low" },
    ...WORKER_KIND_LIST.map((kind) => ({ ...common, kind, effort: spec.reviewEffort })),
    { ...common, kind: "classify", effort: spec.classifyEffort },
  ];
}

/** One deterministic merge per product. */
export function mergeJobRow(batchId: string, userId: string | null, tool: string, effort: Effort): Record<string, unknown> {
  return { batch_id: batchId, tool_slug: tool, assessment_id: null, company_name: null, kind: "arb_merge", effort, run_by: userId };
}
