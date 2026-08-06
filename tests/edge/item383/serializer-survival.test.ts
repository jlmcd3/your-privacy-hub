// ITEM 383 LEG 1 §4 — SERIALIZER PROOF.
//
// The item-382 stamp claim ("the stamp survives onto the persisted document")
// had not been proven on a serialized document. It is proven here: both
// `_meta.internal.lia_pipeline_stamp` and `_meta.internal.record_complete`
// must survive `serializeCustomerReport`'s whitelist reduction under the live
// LIA_REPORT_SCHEMA.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { serializeCustomerReport } from "../../../supabase/functions/_shared/report-serialize.ts";
import { LIA_REPORT_SCHEMA } from "../../../supabase/functions/_shared/report-schemas/lia.ts";
import { LIA_PIPELINE_STAMP } from "../../../supabase/functions/_shared/prose/plans/lia.spine.ts";
import { LIA_PERFECT } from "../../../supabase/functions/_shared/golden/lia-perfect.ts";
import { liAssessmentStageBContract } from "../../../supabase/functions/_shared/intake-contracts/li-assessment.ts";
import {
  computeRecordComplete,
  classifyPlaceholders,
  attachRecordComplete,
} from "../../../supabase/functions/_shared/ltp/record-complete.ts";

Deno.test("serializer: lia_pipeline_stamp + record_complete survive the whitelist", () => {
  const intake = LIA_PERFECT[0].intake as Record<string, unknown>;
  const doc: Record<string, unknown> = {
    assessment_id: "test-383",
    generated_at: new Date().toISOString(),
    three_part_test: { purpose: "stated", necessity: "stated", balancing: "stated" },
    _meta: { internal: { lia_pipeline_stamp: LIA_PIPELINE_STAMP } },
    not_a_declared_key: "must be dropped",
  };
  const t = computeRecordComplete({ product: "lia", contract: liAssessmentStageBContract, intake });
  attachRecordComplete(doc, t, classifyPlaceholders(doc, intake, t.value));

  const { report, telemetry } = serializeCustomerReport(doc, LIA_REPORT_SCHEMA);
  assertEquals(telemetry.crashed, false);
  const internal = (report as any)?._meta?.internal ?? {};
  assertEquals(internal.lia_pipeline_stamp, LIA_PIPELINE_STAMP);
  assertEquals(internal.record_complete?.product, "lia");
  assertEquals(internal.record_complete?.value, false);
  assert(Array.isArray(internal.placeholder_classification?.items));
  assert(!("not_a_declared_key" in (report as Record<string, unknown>)));
});
