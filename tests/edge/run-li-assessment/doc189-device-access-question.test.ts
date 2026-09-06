// DOC 189 (2026-09-05) — the ePrivacy device-access questions (Ask 1).
//
// The gate reads the company's own two answers (purpose_details.device_access
// / device_access_strictly_necessary) AHEAD of its lexicons: "No" resolves the
// terminal-equipment limb not engaged on the statement; "Yes" + "goes further"
// engages the hard gate; "Yes" + "strictly necessary" records the exemption
// CLAIM (new determination exemption_claimed_on_the_record, LI not foreclosed,
// never verified); "Not sure" stays open with a narrower information_needed; a
// "No" beside a description naming cookies is a contradiction (undetermined,
// both facts stated). Unanswered keeps the lexicon behaviour byte-for-byte.
// The unsolicited-messages limb is untouched by the answers.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildEprivacyShortCircuit,
  DEVICE_ACCESS_NECESSARY_NO,
  DEVICE_ACCESS_NECESSARY_NOT_SURE,
  DEVICE_ACCESS_NECESSARY_YES,
  DEVICE_ACCESS_NO,
  DEVICE_ACCESS_NOT_SURE,
  DEVICE_ACCESS_YES,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/eprivacy-gate.ts";
import {
  DEVICE_ACCESS_NECESSITY_OPTS,
  DEVICE_ACCESS_OPTS,
  liAssessmentStageBContract,
} from "../../../supabase/functions/_shared/intake-contracts/li-assessment.ts";
import { validateIntake } from "../../../supabase/functions/_shared/intake-contracts/validate.ts";
import * as LiaEnums from "../../../src/pages/LIAssessment.enums.ts";
import { buildLiaEngagementMap } from "../../../supabase/functions/_shared/engagement-map.ts";
import { attachLiaDeliverables } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { attachLiaUpgrade4 } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import { attachPrecedentClassPosture } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/precedent-class.ts";
import { buildThreePartTestTyped } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/three-part-test-typed.ts";
import {
  assembleLiaSkeletonDocument,
  eprivacyOverlayNote,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { LIA_PERFECT_PINNED } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/lia-perfect-pinned.ts";
import { LIA_REPORT_SCHEMA } from "../../../supabase/functions/run-li-assessment/_local/report-schemas/lia.ts";

type Bag = Record<string, unknown>;

const SILENT = {
  processing_description:
    "We analyse members' own check-in records to recommend quieter class times.",
  stated_purpose: "Help members plan visits.",
};

const COOKIES = {
  processing_description:
    "We set advertising cookies and tracking pixels in visitors' browsers to build interest profiles.",
  stated_purpose: "Targeted advertising revenue.",
};

const FINGERPRINT = {
  processing_description:
    "We compute a device fingerprint at login to detect account takeover.",
  stated_purpose: "Account security.",
};

const MARKETING = {
  processing_description:
    "We send marketing emails to our existing customers about products similar to those they have already purchased.",
  stated_purpose: "Repeat business.",
};

const UNSOLICITED = {
  processing_description:
    "We send unsolicited marketing emails to prospects from public directories.",
  stated_purpose: "New business.",
};

const withAnswers = (base: Bag, q1: string, q2 = ""): Bag => ({
  ...base,
  purpose_details: { device_access: q1, device_access_strictly_necessary: q2 },
});

// ── Contract + form parity ───────────────────────────────────────────────────

Deno.test("doc189 — the two device-access fields exist on the Stage-B contract with the approved options", () => {
  const q1 = liAssessmentStageBContract.fields.find((f) => f.key === "purpose_details.device_access");
  const q2 = liAssessmentStageBContract.fields.find((f) => f.key === "purpose_details.device_access_strictly_necessary");
  assert(q1, "purpose_details.device_access must be on the contract");
  assert(q2, "purpose_details.device_access_strictly_necessary must be on the contract");
  assertEquals(q1!.kind, "enum");
  assertEquals(q1!.required, "optional");
  assertEquals([...(q1!.options ?? [])], ["Yes", "No", "Not sure"]);
  assertEquals(q2!.kind, "enum");
  assertEquals(q2!.required, "conditional");
  assertEquals([...(q2!.options ?? [])], [
    "Yes — all of it is strictly necessary",
    "No — some or all of it goes further",
    "Not sure",
  ]);
  assertEquals(q2!.trigger, { key: "purpose_details.device_access", equals: ["Yes"] });
});

Deno.test("doc189 — contract options are verbatim copies of the form enums and the gate's constants", () => {
  assertEquals([...DEVICE_ACCESS_OPTS], [...LiaEnums.DEVICE_ACCESS_OPTS]);
  assertEquals([...DEVICE_ACCESS_NECESSITY_OPTS], [...LiaEnums.DEVICE_ACCESS_NECESSITY_OPTS]);
  assertEquals([DEVICE_ACCESS_YES, DEVICE_ACCESS_NO, DEVICE_ACCESS_NOT_SURE], [...DEVICE_ACCESS_OPTS]);
  assertEquals(
    [DEVICE_ACCESS_NECESSARY_YES, DEVICE_ACCESS_NECESSARY_NO, DEVICE_ACCESS_NECESSARY_NOT_SURE],
    [...DEVICE_ACCESS_NECESSITY_OPTS],
  );
});

Deno.test("doc189 — the form's own selects carry the approved question and option text", () => {
  const src = Deno.readTextFileSync(new URL("../../../src/pages/LIAssessmentIntake.tsx", import.meta.url));
  assertStringIncludes(src, "Does this processing store information on, or read information from, people's phones, computers or browsers?");
  assertStringIncludes(src, "Is that device access limited to what is strictly necessary to provide a service the person has asked for?");
  for (const opt of [...DEVICE_ACCESS_OPTS, ...DEVICE_ACCESS_NECESSITY_OPTS]) {
    assertStringIncludes(src, `<option>${opt}</option>`);
  }
  // Q2 only travels when Q1 is "Yes".
  assertStringIncludes(src, 'device_access_strictly_necessary: deviceAccess === "Yes" ? deviceAccessStrictlyNecessary : ""');
});

Deno.test("doc189 — answered records validate; an off-list answer is rejected", () => {
  const base = LIA_PERFECT_PINNED[0].intake as Bag;
  const pd = base.purpose_details as Bag;
  const ok = validateIntake(liAssessmentStageBContract, {
    ...base,
    purpose_details: { ...pd, device_access: "Yes", device_access_strictly_necessary: DEVICE_ACCESS_NECESSARY_YES },
  } as Record<string, unknown>);
  assert(ok.ok, JSON.stringify(ok.violations));
  const bad = validateIntake(liAssessmentStageBContract, {
    ...base,
    purpose_details: { ...pd, device_access: "Maybe" },
  } as Record<string, unknown>);
  assert(!bad.ok, "an off-list device_access answer must be a contract violation");
});

// ── The gate's answer-first branches (doc 189 §1.4) ──────────────────────────

Deno.test("doc189 — Q1 No: not engaged on the company's statement (stronger than absence of keywords)", () => {
  const f = buildEprivacyShortCircuit(withAnswers(SILENT, DEVICE_ACCESS_NO));
  assertEquals(f.determination, "not_engaged_on_the_record");
  assertEquals(f.li_foreclosed_for_covered_processing, false);
  assertEquals(f.status, "analysed");
  assertStringIncludes(f.record_fact, "The company states that the processing does not store information on, or read information from, individuals' devices.");
  assertEquals(f.device_access_recorded, "No");
  assertEquals(f.device_access_strictly_necessary_recorded, "");
});

Deno.test("doc189 — Q1 Yes + Q2 goes further: the hard gate engages on the company's own statement", () => {
  const f = buildEprivacyShortCircuit(withAnswers(SILENT, DEVICE_ACCESS_YES, DEVICE_ACCESS_NECESSARY_NO));
  assertEquals(f.determination, "consent_requirement_engaged");
  assertEquals(f.li_foreclosed_for_covered_processing, true);
  assertEquals(f.trigger_basis, "terminal_equipment_access");
  assertStringIncludes(f.record_fact, "goes beyond what is strictly necessary");
  assertStringIncludes(f.application, "legitimate interests is not an available basis");
  assertEquals(f.device_access_strictly_necessary_recorded, DEVICE_ACCESS_NECESSARY_NO);
});

Deno.test("doc189 — Q1 Yes + Q2 strictly necessary: the exemption is CLAIMED, LI not foreclosed, never verified", () => {
  const f = buildEprivacyShortCircuit(withAnswers(FINGERPRINT, DEVICE_ACCESS_YES, DEVICE_ACCESS_NECESSARY_YES));
  assertEquals(f.determination, "exemption_claimed_on_the_record");
  assertEquals(f.li_foreclosed_for_covered_processing, false);
  assertEquals(f.indication_unresolved, false);
  assertEquals(f.status, "analysed");
  assertEquals(f.information_needed, undefined);
  assertStringIncludes(f.record_fact, "limited to what is strictly necessary for a service the individual has requested");
  assertStringIncludes(f.application, "This assessment records the statement and does not verify it");
  assertStringIncludes(f.application, "stated subject to it");
  // The fingerprint indication no longer leaves the gate open: the company answered the question.
  assert(f.trigger_phrases.some((p) => /fingerprint/i.test(p)), "the lexicon hit is still echoed for the audit trail");
});

Deno.test("doc189 — Q1 Yes + Q2 Not sure: undetermined, information_needed reduced to the strict-necessity question", () => {
  const f = buildEprivacyShortCircuit(withAnswers(SILENT, DEVICE_ACCESS_YES, DEVICE_ACCESS_NECESSARY_NOT_SURE));
  assertEquals(f.determination, "undetermined_on_the_record");
  assertEquals(f.status, "record_insufficient");
  assertEquals(f.indication_unresolved, true);
  assertStringIncludes(f.record_fact, "has not resolved whether that access is limited to what is strictly necessary");
  assertStringIncludes(f.information_needed ?? "", "second device-access question");
  assert(!(f.information_needed ?? "").includes("electronic messages"), "a silent record asks only the necessity question");
});

Deno.test("doc189 — Q1 Not sure: undetermined; information_needed asks the device-access question itself", () => {
  const f = buildEprivacyShortCircuit(withAnswers(SILENT, DEVICE_ACCESS_NOT_SURE));
  assertEquals(f.determination, "undetermined_on_the_record");
  assertEquals(f.status, "record_insufficient");
  assertStringIncludes(f.record_fact, "not sure whether the processing stores information on");
  assertStringIncludes(f.information_needed ?? "", "the device-access question on the intake");
});

Deno.test("doc189 — contradiction: Q1 No beside a description that says cookies → undetermined with BOTH facts stated", () => {
  const f = buildEprivacyShortCircuit(withAnswers(COOKIES, DEVICE_ACCESS_NO));
  assertEquals(f.determination, "undetermined_on_the_record");
  assertEquals(f.li_foreclosed_for_covered_processing, false);
  assertEquals(f.status, "record_insufficient");
  assertStringIncludes(f.record_fact, "The company states that the processing does not store information on");
  assertStringIncludes(f.record_fact, '"cookies"');
  assertStringIncludes(f.record_fact, "contradict");
  assertStringIncludes(f.information_needed ?? "", "reconcile the device-access answer");
  // A fingerprint indication contradicts a "No" the same way.
  const g = buildEprivacyShortCircuit(withAnswers(FINGERPRINT, DEVICE_ACCESS_NO));
  assertEquals(g.determination, "undetermined_on_the_record");
  assertStringIncludes(g.record_fact, "contradict");
});

Deno.test("doc189 — the unsolicited-messages limb is untouched by the answers", () => {
  for (const [q1, q2] of [[DEVICE_ACCESS_NO, ""], [DEVICE_ACCESS_YES, DEVICE_ACCESS_NECESSARY_YES], [DEVICE_ACCESS_NOT_SURE, ""]]) {
    const f = buildEprivacyShortCircuit(withAnswers(UNSOLICITED, q1, q2));
    assertEquals(f.determination, "consent_requirement_engaged", `${q1}/${q2}`);
    assertEquals(f.trigger_basis, "unsolicited_electronic_messages", `${q1}/${q2}`);
    assertEquals(f.li_foreclosed_for_covered_processing, true);
  }
});

Deno.test("doc189 — a resolved device limb does not close an open messaging limb (soft opt-in stays open, narrowed)", () => {
  const f = buildEprivacyShortCircuit(withAnswers(MARKETING, DEVICE_ACCESS_NO));
  assertEquals(f.determination, "undetermined_on_the_record");
  assertStringIncludes(f.record_fact, "does not store information on");
  assertStringIncludes(f.record_fact, '"marketing emails"');
  assertStringIncludes(f.information_needed ?? "", "existing customers");
  assert(!(f.information_needed ?? "").includes("device-access question on the intake"), "the device question is answered — not asked again");
  // The exemption claim likewise yields to the open messaging limb.
  const g = buildEprivacyShortCircuit(withAnswers(MARKETING, DEVICE_ACCESS_YES, DEVICE_ACCESS_NECESSARY_YES));
  assertEquals(g.determination, "undetermined_on_the_record");
  assertStringIncludes(g.record_fact, "limited to what is strictly necessary");
});

Deno.test("doc189 — unanswered: the lexicon path is byte-identical to before (plus the two empty echo fields)", () => {
  for (const base of [SILENT, COOKIES, FINGERPRINT, MARKETING, UNSOLICITED]) {
    const bare = buildEprivacyShortCircuit(base);
    const emptyAnswers = buildEprivacyShortCircuit({ ...base, purpose_details: { device_access: "", device_access_strictly_necessary: "" } });
    assertEquals(bare, emptyAnswers);
    assertEquals(bare.device_access_recorded, "");
    assertEquals(bare.device_access_strictly_necessary_recorded, "");
  }
  assertEquals(buildEprivacyShortCircuit(COOKIES).determination, "consent_requirement_engaged");
  assertEquals(buildEprivacyShortCircuit(FINGERPRINT).determination, "undetermined_on_the_record");
  assertEquals(buildEprivacyShortCircuit(SILENT).determination, "not_engaged_on_the_record");
  // The PN-L6 "no intake field" text is gone: the field exists now.
  for (const base of [FINGERPRINT, MARKETING]) {
    const f = buildEprivacyShortCircuit(base);
    assert(!(f.information_needed ?? "").includes("PN-L6"), "information_needed must point at the intake question, not the decision queue");
    assertStringIncludes(f.information_needed ?? "", "device-access question on the intake");
  }
});

Deno.test("doc189 — the perfect fixtures answer the device-access question No and determine not_engaged on that statement", () => {
  for (const c of LIA_PERFECT_PINNED) {
    const f = buildEprivacyShortCircuit(c.intake);
    assertEquals(f.determination, "not_engaged_on_the_record", c.id);
    assertEquals(f.device_access_recorded, "No", c.id);
    assertStringIncludes(f.record_fact, "The company states that the processing does not store information on");
  }
});

Deno.test("doc189 — the new echo leaves are on the report schema's eprivacy_short_circuit allow-list", () => {
  const keys = LIA_REPORT_SCHEMA.objects!.eprivacy_short_circuit as readonly string[];
  assert(keys.includes("device_access_recorded"));
  assert(keys.includes("device_access_strictly_necessary_recorded"));
});

// ── Engagement map + overlay ─────────────────────────────────────────────────

Deno.test("doc189 — engagement map: the exemption claim is not_engaged WITH basis exemption_claimed; silence stays silent", () => {
  const record = LIA_PERFECT_PINNED[0].intake as Bag;
  const claimed = buildLiaEngagementMap(record, {}, ["EU_GDPR"], "exemption_claimed_on_the_record")
    .entries.find((e) => e.rule_id === "R_EPRIVACY_PECR")!;
  assertEquals(claimed.status, "not_engaged");
  assertEquals(claimed.basis, "exemption_claimed");
  assertStringIncludes(claimed.rationale, "does not verify it");
  assert(claimed.intake_signals.includes("purpose_details.device_access"));
  const silent = buildLiaEngagementMap(record, {}, ["EU_GDPR"], "not_engaged_on_the_record")
    .entries.find((e) => e.rule_id === "R_EPRIVACY_PECR")!;
  assertEquals(silent.status, "not_engaged");
  assertEquals(silent.basis, undefined);
  // The legacy three still map as before.
  assertEquals(
    buildLiaEngagementMap(record, {}, ["EU_GDPR"], "consent_requirement_engaged").entries.find((e) => e.rule_id === "R_EPRIVACY_PECR")!.status,
    "engaged",
  );
  assertEquals(
    buildLiaEngagementMap(record, {}, ["EU_GDPR"], "undetermined_on_the_record").entries.find((e) => e.rule_id === "R_EPRIVACY_PECR")!.status,
    "conditional",
  );
});

Deno.test("doc189 — overlay: the claim renders in the attribution register; the silent not_engaged renders nothing", () => {
  const record = LIA_PERFECT_PINNED[0].intake as Bag;
  const claimedMap = buildLiaEngagementMap(record, {}, ["EU_GDPR"], "exemption_claimed_on_the_record");
  const note = eprivacyOverlayNote({ engagement_map: claimedMap });
  assertStringIncludes(note, "Separately, the company states that the processing stores information on");
  assertStringIncludes(note, "does not verify it");
  assert(!note.includes("Additional Information Required"));
  const silentMap = buildLiaEngagementMap(record, {}, ["EU_GDPR"], "not_engaged_on_the_record");
  assertEquals(eprivacyOverlayNote({ engagement_map: silentMap }), "");
});

// ── End to end through the typed engine and the skeleton ─────────────────────

function typedReportFor(intake: Bag): { report: Bag; foreclosed: boolean } {
  const report: Bag = { authority_exhibit: { entries: [] } };
  attachLiaDeliverables(report, intake);
  attachLiaUpgrade4(report, intake);
  attachPrecedentClassPosture(report, intake);
  const typed = buildThreePartTestTyped(report, intake);
  report.three_part_test = typed.three_part_test;
  if (typed.determination_override) report.lia_determination = typed.determination_override;
  report.information_needed = typed.information_needed;
  const gate = report.eprivacy_short_circuit as Bag;
  report.engagement_map = buildLiaEngagementMap(intake, {}, ["EU_GDPR"], gate.determination as string);
  report._meta = { internal: { lia_typed_test: { eprivacy_foreclosed: typed.eprivacy_foreclosed } } };
  return { report, foreclosed: typed.eprivacy_foreclosed };
}

Deno.test("doc189 — end to end: Yes/goes-further forecloses the outcome; Yes/strictly-necessary does not, and the claim reaches the page", () => {
  const base = LIA_PERFECT_PINNED[0].intake as Bag;
  const pd = base.purpose_details as Bag;

  const further = typedReportFor({ ...base, purpose_details: { ...pd, device_access: "Yes", device_access_strictly_necessary: DEVICE_ACCESS_NECESSARY_NO } });
  assertEquals(further.foreclosed, true);
  assertEquals((further.report.lia_determination as Bag).outcome, "legitimate_interests_not_available");

  const claimedIntake = { ...base, purpose_details: { ...pd, device_access: "Yes", device_access_strictly_necessary: DEVICE_ACCESS_NECESSARY_YES } };
  const claimed = typedReportFor(claimedIntake);
  assertEquals(claimed.foreclosed, false);
  assertEquals((claimed.report.eprivacy_short_circuit as Bag).determination, "exemption_claimed_on_the_record");
  const sk = assembleLiaSkeletonDocument(claimed.report, claimedIntake, { deterministic: true });
  const text = skeletonDocumentToText(sk.document);
  assertStringIncludes(text, "only to the extent strictly necessary to provide a service the individual has requested");
  assertStringIncludes(text, "does not verify it");
  assert(!text.includes("Additional Information Required"), "the claim must not read as an open gate");

  const no = typedReportFor({ ...base, purpose_details: { ...pd, device_access: "No" } });
  assertEquals(no.foreclosed, false);
  assertEquals((no.report.eprivacy_short_circuit as Bag).determination, "not_engaged_on_the_record");
});

Deno.test("doc189 — the assembler still never reads the gate finding directly (single render door)", () => {
  const src = Deno.readTextFileSync(
    new URL("../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts", import.meta.url),
  );
  assert(!src.includes("eprivacy_short_circuit"));
  const pa = Deno.readTextFileSync(
    new URL("../../../supabase/functions/run-li-assessment/_local/ltp/lia-persuasive-authority.ts", import.meta.url),
  );
  assert(!pa.includes("eprivacy_short_circuit"), "the persuasive module reads the engagement map, never the gate");
});
