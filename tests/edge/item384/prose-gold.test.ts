// ITEM 384 — CPPA RISK PROSE GOLD-STANDARD ENCODE. Regression battery.
// Every fixture below is the SHIPPED text from quality_run_documents
// 03192701-58ff-4caa-ac0b-42501837372b (the panel's ratification document).
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyRiskProseGold,
  buildExecutiveSummary,
  buildRecordSufficiency,
  firstSentence,
  isLegacySufficiencyVoice,
  normalizeAttestationBlock,
  ownerSentence,
  reservedActionLabel,
  reservedJudgmentSentence,
  RISK_PROSE_GOLD_VERSION,
  sentenceTerminate,
  stripDegradedOpeners,
} from "../../../supabase/functions/_shared/ltp/risk-prose-gold.ts";
import {
  duplicateSentences,
  hasBareEnum,
  hasLitany,
  hasSplice,
  openingCarriesFinding,
  proseLeaves,
  rendersWrongField,
} from "../../../supabase/functions/_shared/prose/risk-seam-lint.ts";
import { RISK_PIPELINE_STAMP } from "../../../supabase/functions/_shared/ltp/risk-stamp.ts";
import { isSanctionedCounselRegister } from "../../../supabase/functions/_shared/emit-gate.ts";

const SHIPPED_EXEC =
  "We could not verify this item from the information provided; it is listed under information needed.\n\n" +
  "The record before this assessment is complete: every question the intake asks has been answered. " +
  "What follows carries an action plan of 1 item — 0 preconditions to be completed before processing begins, and the remainder scheduled after launch.";

const AFFIRMATIVE =
  "The record before this assessment is complete: every question the intake asks has been answered. " +
  "What follows carries an action plan of 1 item — 0 preconditions to be completed before processing begins, and the remainder scheduled after launch.";

const SHIPPED_SUFFICIENCY = [
  AFFIRMATIVE,
  "The record is sufficient for the § 7152(a)(6) balancing frame to weigh. Sierra Outfitters, Inc has adequately documented 13 of the § 7152(a) elements listed below; 1 of these elements remain enumerated for your review. Each element is stated once, with its § 7152(a) pinpoint, in the order the record was assessed.",
  "The record supporting this assessment is sufficient for the § 7152(a)(6) balancing frame to weigh. Sierra Outfitters, Inc has documented the four factual elements § 7152(a) requires.",
  "Technical / architectural controls: present in the record as documented (11 CCR § 7152(a)(6)).",
];

const SHIPPED_ACTION =
  "**qualified counsel should be consulted for further consideration of decision whether to initiate the processing** — 11 CCR § 7152(a)(7). " +
  "On Sierra Outfitters, Inc's record, the record reserves decision whether to initiate the processing to the accountable business owner. " +
  "The gap is the reserved judgment must be exercised and recorded before the assessment closes. The regulation requires the following: " +
  "the business must record a reasoned initiation decision, listing each modification and the risk it addresses complete and retain the assessment record by December 31, 2027, " +
  "the compliance date fixed by 11 CCR § 7155(b) for processing that was underway before the operative date; this is an ongoing obligation Owner: Chief Compliance Officer.";

const SHIPPED_NEXT_STEPS = [
  "Confirm Technical / architectural controls is documented in the assessment record — present on the record; retain the supporting documentation with the assessment file.",
  "Confirm Privacy-enhancing technologies is documented in the assessment record — present on the record; retain the supporting documentation with the assessment file.",
  "Confirm External consultation / knowledge of emergent risks is documented in the assessment record — present on the record; retain the supporting documentation with the assessment file.",
  "Confirm ADMT governance policies and training is documented in the assessment record — present on the record; retain the supporting documentation with the assessment file.",
];

// ---------------------------------------------------------------------------
// Stamp
// ---------------------------------------------------------------------------

Deno.test("stamp — risk pipeline stamp is pinned to item384", () => {
  assertEquals(RISK_PIPELINE_STAMP, "risk-pipeline@item399-2026-08-07");
  assertEquals(RISK_PROSE_GOLD_VERSION, "risk-prose-gold@item384-2026-08-06");
});

// ---------------------------------------------------------------------------
// G-1 — one sufficiency voice
// ---------------------------------------------------------------------------

Deno.test("G-1 — both shipped legacy sufficiency voices are recognised", () => {
  assert(isLegacySufficiencyVoice(SHIPPED_SUFFICIENCY[1]));
  assert(isLegacySufficiencyVoice(SHIPPED_SUFFICIENCY[2]));
  assert(!isLegacySufficiencyVoice(SHIPPED_SUFFICIENCY[0]));
  assert(!isLegacySufficiencyVoice(SHIPPED_SUFFICIENCY[3]));
});

Deno.test("G-1 — the collapsed surface speaks once and keeps the pinpoint list", () => {
  const out = buildRecordSufficiency(SHIPPED_SUFFICIENCY, AFFIRMATIVE, reservedJudgmentSentence(1));
  assertEquals(out.length, 2);
  assertStringIncludes(out[0], "every question the intake asks has been answered");
  assertStringIncludes(out[0], "reserves to the business and to qualified legal counsel");
  assertEquals(out[1], SHIPPED_SUFFICIENCY[3]);
  assertEquals(out.filter(isLegacySufficiencyVoice).length, 0);
});

Deno.test("G-1 — a reserved determination is never called a deficiency", () => {
  const s = reservedJudgmentSentence(1);
  assertStringIncludes(s, "not as a deficiency in the record");
  assertEquals(reservedJudgmentSentence(0), "");
});

// ---------------------------------------------------------------------------
// G-2 — exec summary opens with the verdict
// ---------------------------------------------------------------------------

Deno.test("G-2 — the degraded placeholder can never open the exec summary", () => {
  const stripped = stripDegradedOpeners(SHIPPED_EXEC);
  assert(!/^We could not verify/.test(stripped));
  assertStringIncludes(stripped, "The record before this assessment is complete");
});

Deno.test("G-2 — the verdict leads and the 12-word opening carries the finding", () => {
  const report: Record<string, unknown> = {
    executive_summary: SHIPPED_EXEC,
    assessment_summary: {
      narrative:
        "The assessment record documents four negative-impact pathways. The weighing across all four beneficiary classes supports a benefits-outweigh conclusion on this record. One documentation element remains to be recorded.",
    },
    processing_narrative: [
      "Sierra Outfitters, Inc collects Contact identifiers from the applicant. The information is used to assess creditworthiness.",
    ],
  };
  const out = buildExecutiveSummary(report, AFFIRMATIVE);
  assert(out.startsWith("The weighing across all four beneficiary classes supports a benefits-outweigh conclusion"), out.slice(0, 120));
  assert(openingCarriesFinding(out));
  assertStringIncludes(out, "Sierra Outfitters, Inc collects Contact identifiers from the applicant.");
  assertStringIncludes(out, AFFIRMATIVE);
  assertEquals(duplicateSentences(out).length, 0);
});

// ---------------------------------------------------------------------------
// G-3 — reserved-judgment actions in counsel's register
// ---------------------------------------------------------------------------

Deno.test("G-3 — the reserved label states who holds the determination", () => {
  const label = reservedActionLabel("11 CCR § 7152(a)(7)", "the accountable business owner");
  assertEquals(label, "The determination 11 CCR § 7152(a)(7) reserves to the accountable business owner:");
  assert(!/should be consulted for further consideration/i.test(label));
});

Deno.test("G-3 — the counsel form keeps the existing sanctioned-register exemption", () => {
  const label = reservedActionLabel("11 CCR § 7152(a)(1)", "qualified legal counsel");
  assert(isSanctionedCounselRegister(label), label);
});

Deno.test("G-3 — clause termination kills the recorded splice", () => {
  assert(hasSplice(SHIPPED_ACTION));
  const guidance = sentenceTerminate(
    "the business must record a reasoned initiation decision, listing each modification and the risk it addresses",
  );
  const deadline = sentenceTerminate(
    "complete and retain the assessment record by December 31, 2027; this is an ongoing obligation",
  );
  const rebuilt = `The regulation requires the following: ${guidance} ${deadline} ${ownerSentence("Chief Compliance Officer")}`;
  assert(!hasSplice(rebuilt), rebuilt);
  assert(!/Owner:/.test(rebuilt));
  assertStringIncludes(rebuilt, "Responsibility for this action sits with Chief Compliance Officer.");
});

// ---------------------------------------------------------------------------
// G-4 — attestation register
// ---------------------------------------------------------------------------

Deno.test("G-4 — register-clean absence and no record_insufficient on a gate-TRUE doc", () => {
  const ab: Record<string, unknown> = {
    status: "record_insufficient",
    review_date: "not stated on the record",
    approval_date: "2026-06-12",
    approvers: [{ name: "L. Whitcomb", position: "Chief Compliance Officer" }],
    information_needed: "Record the date the assessment was reviewed (§ 7152(a)(9)).",
  };
  normalizeAttestationBlock(ab, true);
  assertEquals(ab.review_date, "Not recorded");
  assertEquals(ab.status, "analysed");
  assertEquals(ab.information_needed, undefined);
});

Deno.test("G-4 — a gate-FALSE doc keeps its honest draft status", () => {
  const ab: Record<string, unknown> = {
    status: "record_insufficient",
    review_date: "not stated on the record",
    information_needed: "Record the date the assessment was reviewed (§ 7152(a)(9)).",
  };
  normalizeAttestationBlock(ab, false);
  assertEquals(ab.status, "record_insufficient");
  assertEquals(ab.review_date, "Not recorded");
  assertStringIncludes(String(ab.information_needed), "Record the date");
});

// ---------------------------------------------------------------------------
// G-5 — next steps carry actions only
// ---------------------------------------------------------------------------

Deno.test("G-5 — the shipped confirm-filler block is a litany the lint catches", () => {
  assert(hasLitany(SHIPPED_NEXT_STEPS));
  assert(!hasLitany([SHIPPED_NEXT_STEPS[0]]));
});

Deno.test("G-5 — the composer no longer emits present-element confirmations", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/_shared/ltp/section-composers/cppa-risk.ts", import.meta.url),
  );
  assert(!src.includes("`Confirm ${label} is documented in the assessment record`"), "filler block still present");
});

// ---------------------------------------------------------------------------
// G-6 — one open-element ledger + whole-pass behaviour
// ---------------------------------------------------------------------------

function shippedReport(): Record<string, unknown> {
  return {
    executive_summary: SHIPPED_EXEC,
    assessment_summary: {
      narrative:
        "The weighing across all four beneficiary classes supports a benefits-outweigh conclusion on this record.",
    },
    processing_narrative: ["Sierra Outfitters, Inc collects Contact identifiers from the applicant."],
    record_sufficiency: [...SHIPPED_SUFFICIENCY],
    information_needed: [{ question: "Record the § 7152(a)(7) initiation decision." }],
    attestation_block: {
      status: "record_insufficient",
      review_date: "not stated on the record",
      information_needed: "Record the date the assessment was reviewed (§ 7152(a)(9)).",
    },
  };
}

Deno.test("G-6 — gate TRUE: open elements are listed once, under Items for your review", () => {
  const report = shippedReport();
  const t = applyRiskProseGold(report, { recordComplete: true, affirmative: AFFIRMATIVE, reservedCount: 1 });
  assert(t.applied);
  assertEquals(t.sufficiency_voices_retired, 2);
  assert(t.exec_degraded_opener_stripped);
  assertEquals((report.attestation_block as Record<string, unknown>).information_needed, undefined);
  assertEquals((report.record_sufficiency as string[]).filter(isLegacySufficiencyVoice).length, 0);
  assertEquals((report.information_needed as unknown[]).length, 1);
});

Deno.test("G-6 — gate FALSE: only the register repairs run, draft framing survives", () => {
  const report = shippedReport();
  const t = applyRiskProseGold(report, { recordComplete: false, affirmative: AFFIRMATIVE, reservedCount: 1 });
  assert(!t.applied);
  assertEquals((report.record_sufficiency as string[]).length, SHIPPED_SUFFICIENCY.length);
  assertEquals((report.attestation_block as Record<string, unknown>).status, "record_insufficient");
  assert(!/^We could not verify/.test(String(report.executive_summary)));
});

Deno.test("G-1..G-6 — the reworked document passes every seam rule", () => {
  const report = shippedReport();
  applyRiskProseGold(report, { recordComplete: true, affirmative: AFFIRMATIVE, reservedCount: 1 });
  const leaves = proseLeaves(report);
  for (const leaf of leaves) {
    assert(openingCarriesFinding(leaf.value), `R1 ${leaf.path}: ${leaf.value.slice(0, 80)}`);
    assert(!hasSplice(leaf.value), `R6 ${leaf.path}`);
    assert(!hasBareEnum(leaf.value), `R4 ${leaf.path}: ${leaf.value.slice(0, 80)}`);
    assertEquals(duplicateSentences(leaf.value).length, 0, `R8 ${leaf.path}`);
  }
  assert(!hasLitany(report.record_sufficiency as string[]));
});

// ---------------------------------------------------------------------------
// Seam detectors must stay alive
// ---------------------------------------------------------------------------

Deno.test("seam — detectors fire on their recorded defects", () => {
  assert(!openingCarriesFinding("We could not verify this item from the information provided."));
  assert(hasBareEnum("The record shows a4_benefit_business is thin."));
  assert(!hasBareEnum("The record cites 11 CCR § 7152(a)(6) for the balancing frame."));
  assert(hasSplice("…the risk it addresses complete and retain the assessment record."));
  assert(hasLitany(["Confirm A is documented in the assessment record now", "Confirm B is documented in the assessment record now", "Confirm C is documented in the assessment record now"]));
  assertEquals(duplicateSentences("The § 7152(a)(6) balancing supports a benefits-outweigh conclusion on this record. The § 7152(a)(6) balancing supports a benefits-outweigh conclusion on this record.").length, 1);
  assertEquals(
    rendersWrongField("The reviewer recorded the safeguard as quarterly purge-job auditing.", {
      a6_safeguards: "the safeguard as quarterly purge-job auditing",
    }),
    ["a6_safeguards"],
  );
  assertEquals(firstSentence("One. Two."), "One.");
  assertEquals(sentenceTerminate("no terminal punctuation"), "no terminal punctuation.");
});
