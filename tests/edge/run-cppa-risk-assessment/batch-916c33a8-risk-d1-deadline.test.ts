// BATCH 916c33a8 (2026-09-10) — DOC 252 D1 (CEO-ruled). Velostream Digital
// Inc. (aea7b9b0): processing_status "Ongoing", i9_existing_dpia_summary "A
// prior DPIA … was completed in March 2023 …", no processing_start_date. § 5.B
// and Follow-Up 1 presented the before-initiation and December 31, 2027
// deadlines as equally open. The record's own indication of a pre-2026 start
// is now named, in the Company's own date, on both surfaces; the
// determination stays pending and the ask for the start date is unchanged.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  deriveInitialAssessmentDeadline,
  initialAssessmentDeadlinePending,
  priorAssessmentDateBefore2026,
} from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-timing.ts";
import { assembleRiskSkeletonDocument } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

const SUMMARY =
  "A prior DPIA covering Velostream's programmatic advertising data flows was completed in March 2023 and approved by the CPO; it identified gaps in DSP contractual protections and recommended vendor re-contracting, which has since been partially completed.";
const VELOSTREAM_TIMING: Bag = {
  processing_status: "Ongoing",
  i9_has_existing_dpia: "Yes",
  i9_existing_dpia_summary: SUMMARY,
};
const PENDING =
  "Risk assessment deadline: determination pending — record when the covered processing began (under 11 CCR § 7155(a)(1) the assessment is required before initiating processing on or after January 1, 2026; under § 7155(b) covered processing already underway before that date and continuing afterward must be assessed by December 31, 2027).";
// DOC 252 ledger C1/C2 — the CEO's sentence (2026-09-11), pinned byte-exact
// ("the company" set in the Risk house form "the Company").
const INDICATION_5B =
  // DOC 255 (2026-09-11): restated in § 7155's own terms (doc 254A item 1, CEO-accepted).
  "Based on the information provided by the Company, processing began before January 1, 2026 and is ongoing. Under 11 CCR § 7155(b) the risk assessment for that processing must be conducted and documented by December 31, 2027; it must then be reviewed and updated at least once every three years (§ 7155(a)(2)) and within 45 calendar days of any material change (§ 7155(a)(3)).";
const FOLLOW_UP_BASE =
  "Record when the covered processing began, or will begin; § 7155(a)(1) requires the assessment before the Company initiates processing within § 7150(b), and the December 31, 2027 transition deadline in § 7155(b) applies only to covered processing already underway before January 1, 2026 — the applicable deadline turns on that date";

const B1 = "Engaged — 11 CCR § 7150(b)(1) (selling or sharing personal information): the record supports this trigger and this activity falls within the risk-assessment obligation.";
const B2 = "Engaged — 11 CCR § 7150(b)(2) (processing sensitive personal information): the record supports this trigger and this activity falls within the risk-assessment obligation.";

function fixture(name: string): Bag {
  return JSON.parse(Deno.readTextFileSync(new URL(`../fixtures/batch13/${name}.json`, import.meta.url))) as Bag;
}
function docText(intake: Bag): string {
  const res = assembleRiskSkeletonDocument({ scope_and_triggers: { narrative: [B1, B2] } } as never, intake as never);
  return skeletonDocumentToText(res.document);
}

Deno.test("916c33a8 D1 — the indication is read only from an ongoing record with a prior assessment dated before 2026, in the Company's own words", () => {
  assertEquals(priorAssessmentDateBefore2026(VELOSTREAM_TIMING), "March 2023");
  assertEquals(priorAssessmentDateBefore2026({ ...VELOSTREAM_TIMING, i9_existing_dpia_summary: "Completed 2024-11-30 by the privacy team." }), "2024-11-30");
  assertEquals(priorAssessmentDateBefore2026({ ...VELOSTREAM_TIMING, i9_existing_dpia_summary: "Reviewed in Q1 2025." }), "Q1 2025");
  // Not an indication: planned or blank status, no prior assessment, an undated summary, or a 2026+ date.
  assertEquals(priorAssessmentDateBefore2026({ ...VELOSTREAM_TIMING, processing_status: "Planned — not yet started" }), "");
  assertEquals(priorAssessmentDateBefore2026({ ...VELOSTREAM_TIMING, processing_status: "" }), "");
  assertEquals(priorAssessmentDateBefore2026({ ...VELOSTREAM_TIMING, i9_has_existing_dpia: "No" }), "");
  assertEquals(priorAssessmentDateBefore2026({ ...VELOSTREAM_TIMING, i9_existing_dpia_summary: "A prior assessment exists and was approved by the CPO." }), "");
  assertEquals(priorAssessmentDateBefore2026({ ...VELOSTREAM_TIMING, i9_existing_dpia_summary: "Completed in February 2026." }), "");
});

Deno.test("916c33a8 D1 — § 5.B is the CEO sentence alone where the indication is on the record (the pending lead is dropped); every other branch is byte-unchanged", () => {
  // CEO 2026-09-11: "drop the preceding phrases" — the deadline line is the
  // sentence itself, and the pending state (and its Follow-Up ask) no longer applies.
  assertEquals(deriveInitialAssessmentDeadline(VELOSTREAM_TIMING), `Risk assessment deadline: ${INDICATION_5B}`);
  assertEquals(initialAssessmentDeadlinePending(VELOSTREAM_TIMING), false);
  // doc 148 / doc 167 bytes where no indication is on the record.
  assertEquals(deriveInitialAssessmentDeadline({ processing_status: "Ongoing" }), PENDING);
  assertEquals(deriveInitialAssessmentDeadline({}), PENDING);
  assertEquals(deriveInitialAssessmentDeadline({ ...VELOSTREAM_TIMING, i9_has_existing_dpia: "No" }), PENDING);
  // A recorded start date still settles the deadline outright.
  assertEquals(
    deriveInitialAssessmentDeadline({ ...VELOSTREAM_TIMING, processing_start_date: "2025-06-01" }),
    "Risk assessment deadline: December 31, 2027, under 11 CCR § 7155(b), for covered processing initiated before January 1, 2026 and continuing afterward; the assessment must then be reviewed and updated at least once every three years (§ 7155(a)(2)) and within 45 calendar days of any material change (§ 7155(a)(3)).",
  );
});

Deno.test("916c33a8 D1 — the rendered document carries the CEO sentence in § 5.B (under the pre-2026 rule) and as the Follow-Up, with no preceding phrase", () => {
  const intake = { ...fixture("nestwave"), ...VELOSTREAM_TIMING, processing_start_date: "" };
  const text = docText(intake);
  // § 5.B: the pre-2026 rule sentence precedes the deadline line, as it does for a recorded pre-2026 start.
  assertStringIncludes(text, `For covered processing initiated before January 1, 2026 and continuing afterward, the applicable transition deadline should be identified and tracked in the assessment record. Risk assessment deadline: ${INDICATION_5B}`);
  // Key Dates row value.
  assertStringIncludes(text, "Based on the information provided by the Company, processing began before January 1, 2026 and is ongoing. Under 11 CCR § 7155(b) the risk assessment for that processing must be conducted and documented by December 31, 2027");
  // Follow-Up: the sentence alone, numbered, single stop.
  assert(/\d+\. Based on the information provided by the Company, processing began before January 1, 2026 and is ongoing\. Under 11 CCR § 7155\(b\) the risk assessment for that processing must be conducted and documented by December 31, 2027; it must then be reviewed and updated at least once every three years \(§ 7155\(a\)\(2\)\) and within 45 calendar days of any material change \(§ 7155\(a\)\(3\)\)\.\n/.test(`${text}\n`), text.slice(text.indexOf("Based on the information provided by the Company") - 5, text.indexOf("Based on the information provided by the Company") + 400));
  assert(!text.includes("))..") && !text.includes("2027.."), "the Follow-Up seam must not double the stop");
  assert(!text.includes("determination pending — record when the covered processing began"), "the pending lead is dropped");
  assert(!text.includes(FOLLOW_UP_BASE), "the 'Record when…' ask is dropped");
});

Deno.test("916c33a8 D1 — without the indication the rendered Follow-Up is the doc 167 sentence, unchanged", () => {
  const intake = { ...fixture("nestwave"), processing_status: "Ongoing", i9_has_existing_dpia: "No", i9_existing_dpia_summary: "", processing_start_date: "" };
  const text = docText(intake);
  assertStringIncludes(text, FOLLOW_UP_BASE);
  assert(!text.includes("Based on the information provided by the Company, processing began before"), "no indication must render on a record that carries none");
});
