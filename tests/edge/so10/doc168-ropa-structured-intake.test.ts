// DOC 168 (2026-09-04) — RoPA structured intake under the CEO options rule.
//
// The Article 30 elements the law answers by category (recipient categories,
// third-country gate + destination + mechanism, Art. 9(2)/Art. 10 condition,
// processing regularity) are now closed lists on the form; this suite pins
// what the generator does with the stored option codes — labels, the one
// transfer resolver, the recipients fact, the Art. 30(5) note's new limbs —
// and drives the full answers → register pipeline through the module the
// mapping moved into (register/assemble-input.ts).

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assembleRopaRegister,
} from "../../../supabase/functions/generate-ropa-document/register/ropa-skeleton-assemble.ts";
import {
  answerDisplayFor,
  buildRopaAssembleInput,
  collectTransfers,
  recipientsDisplay,
  resolveTransfer,
  type RopaAnswerData,
} from "../../../supabase/functions/generate-ropa-document/register/assemble-input.ts";
import { transferDisplayForActivity } from "../../../supabase/functions/generate-ropa-document/register/activity-answer-display.ts";
import {
  buildArt305Note,
  specialCategoryBasisRecorded,
} from "../../../supabase/functions/generate-ropa-document/register/art305-note.ts";
import { displayAnswer, labelsFor, selectionAffirms } from "../../../supabase/functions/generate-ropa-document/register/answer-labels.ts";

const ART305_LIMB3 =
  "special categories of data as referred to in Article 9(1) or personal data relating to criminal convictions and offences referred to in Article 10";

// ── answer-labels ──────────────────────────────────────────────────────────

Deno.test("doc168 — mechanism codes render as reader labels (the doc-166-class 'sccs' leak is closed)", () => {
  assertEquals(displayAnswer("transfer_mechanism", "sccs"), "Standard Contractual Clauses (SCCs)");
  assertEquals(displayAnswer("transfer_mechanism", "adequacy"), "an adequacy decision");
  assertEquals(displayAnswer("transfer_mechanism", "none"), "no documented transfer mechanism");
});

Deno.test("doc168 — multi-select codes join as prose; unknown (legacy) values pass through unchanged", () => {
  assertEquals(
    displayAnswer("recipient_categories", ["processors", "group"]),
    "processors and service providers acting on the Company's instructions and companies in the Company's corporate group",
  );
  assertEquals(
    displayAnswer("recipient_categories", ["processors", "group", "public_authorities"]),
    "processors and service providers acting on the Company's instructions, companies in the Company's corporate group, and public authorities and regulators, where required by law",
  );
  assertEquals(displayAnswer("recipient_categories", "AWS and Mixpanel"), "AWS and Mixpanel");
  assertEquals(labelsFor("transfer_destination", ["Canada", "Japan"]), ["Canada", "Japan"]);
  assertEquals(displayAnswer("transfer_mechanism", ""), "");
});

Deno.test("doc168 — selectionAffirms: arrays decide, 'none' alone is negative, non-arrays are not decided here", () => {
  assertEquals(selectionAffirms(["none"], "none"), false);
  assertEquals(selectionAffirms(["art9_2_b"], "none"), true);
  assertEquals(selectionAffirms(["none", "art9_2_b"], "none"), true);
  assertEquals(selectionAffirms([], "none"), null);
  assertEquals(selectionAffirms("Not applicable — …", "none"), null);
});

// ── special-category state (one normalizer, structured + legacy) ───────────

Deno.test("doc168 — specialCategoryBasisRecorded reads structured codes and keeps the doc-142 legacy reading", () => {
  assertEquals(specialCategoryBasisRecorded(["none"]), false);
  assertEquals(specialCategoryBasisRecorded([]), false);
  assertEquals(specialCategoryBasisRecorded(["art9_2_b"]), true);
  assertEquals(specialCategoryBasisRecorded(["art10"]), true);
  assertEquals(specialCategoryBasisRecorded("Not applicable — ICO Children's Code (DPA 2018 s.123)"), false);
  assertEquals(specialCategoryBasisRecorded("Article 9(2)(b) employment-law condition"), true);
});

// ── Art. 30(5) note — every limb the record can answer is answered ─────────

const ACTS = [
  { id: "a1", display_name: "Payroll" },
  { id: "a2", display_name: "Recruitment" },
];

Deno.test("doc168 — the note's opening tracks Art. 30(5)'s own three limbs, including Article 10", () => {
  const note = buildArt305Note([], {});
  assertStringIncludes(note.body, "fewer than 250 persons");
  assertStringIncludes(note.body, "likely to result in a risk to the rights and freedoms of data subjects");
  assertStringIncludes(note.body, "the processing is not occasional");
  assertStringIncludes(note.body, ART305_LIMB3);
});

Deno.test("doc168 — an Art. 10 (criminal-offence) selection defeats the derogation exactly as an Art. 9 one does", () => {
  const note = buildArt305Note(ACTS, { a1: { special_category_basis: ["art10"] }, a2: { special_category_basis: ["none"] } }, "<50");
  assertStringIncludes(note.body, "does not turn on headcount alone");
  assertStringIncludes(note.body, "special-category or criminal-offence data processing for the activity Payroll");
  assertStringIncludes(note.body, "regardless of its size");
});

Deno.test("doc168 — 'none' selected on every activity engages no special-category exception", () => {
  const note = buildArt305Note(ACTS, { a1: { special_category_basis: ["none"] }, a2: { special_category_basis: ["none"] } }, "<50");
  assertStringIncludes(note.body, "no special-category exception is engaged");
});

Deno.test("doc168 — any activity recorded as regular defeats the derogation regardless of headcount (limb 2)", () => {
  const note = buildArt305Note(
    ACTS,
    { a1: { special_category_basis: ["none"], processing_regularity: "regular" }, a2: { special_category_basis: ["none"], processing_regularity: "occasional" } },
    "<50",
  );
  assertStringIncludes(note.body, "unavailable regardless of headcount");
  assertStringIncludes(note.body, "records the activity Payroll as regular or ongoing processing, so the processing is not occasional");
  assertStringIncludes(note.body, "required, not merely good practice");
  assert(!note.body.includes("does not record"), "regularity IS recorded; the note must not say otherwise");
});

Deno.test("doc168 — under 250 and every activity occasional: only the risk limb remains, and it is named as not assessed", () => {
  const note = buildArt305Note(
    ACTS,
    { a1: { special_category_basis: ["none"], processing_regularity: "occasional" }, a2: { special_category_basis: ["none"], processing_regularity: "occasional" } },
    "50-249",
  );
  assertStringIncludes(note.body, "fewer than 250 persons");
  assertStringIncludes(note.body, "records every activity as occasional");
  assertStringIncludes(note.body, "which this register does not assess");
  assert(!note.body.includes("does not record"), "every recordable limb is recorded here");
  assert(!note.body.includes("unavailable regardless"));
});

Deno.test("doc168 — under 250 with regularity 'unsure' on one activity: the note says which limb is not recorded, for which activities", () => {
  const note = buildArt305Note(
    ACTS,
    { a1: { special_category_basis: ["none"], processing_regularity: "occasional" }, a2: { special_category_basis: ["none"], processing_regularity: "unsure" } },
    "<50",
  );
  assertStringIncludes(note.body, "regularity of the Company's processing, which this register does not record for every activity");
  assertStringIncludes(note.body, "which this register does not assess");
});

Deno.test("doc168 — headcount unrecorded but every activity occasional: headcount is the named gap, not regularity", () => {
  const note = buildArt305Note(
    ACTS,
    { a1: { special_category_basis: ["none"], processing_regularity: "occasional" }, a2: { special_category_basis: ["none"], processing_regularity: "occasional" } },
  );
  assertStringIncludes(note.body, "records every activity as occasional");
  assertStringIncludes(note.body, "the company's headcount, which this register does not record");
  assert(!note.body.includes("regularity of its processing, which this register does not record"));
});

Deno.test("doc168 — 250+ headcount still reads determinately unavailable when no activity is regular", () => {
  const note = buildArt305Note(ACTS, { a1: { processing_regularity: "occasional" }, a2: { processing_regularity: "unsure" } }, "250-999");
  assertStringIncludes(note.body, "unavailable regardless");
  assertStringIncludes(note.body, "not fewer than 250 persons");
});

// ── the ONE transfer resolver ──────────────────────────────────────────────

Deno.test("doc168 — a recorded 'no' on the third-country gate is a fact, not an empty destination", () => {
  const t = resolveTransfer({ transfers_third_country: "no", transfer_mechanism: "sccs" });
  assertEquals(t.declaredNone, true);
  assertEquals(t.destination, "");
  assertEquals(t.mechanism, "", "a mechanism cannot be stated for a transfer the Company says does not happen");
  assertEquals(
    transferDisplayForActivity({ transfers_third_country: "no" }),
    "None — the Company records no transfer to a third country or international organisation",
  );
});

Deno.test("doc168 — structured destination: country names plus a NAMED international organisation, mechanism as a label", () => {
  const ans = {
    transfers_third_country: "yes",
    transfer_destination: ["Canada", "__international_organisation__"],
    transfer_international_org: "World Health Organization",
    transfer_mechanism: "adequacy",
  };
  const t = resolveTransfer(ans);
  assertEquals(t.declaredNone, false);
  assertEquals(t.destination, "Canada and World Health Organization (international organisation)");
  assertEquals(t.mechanism, "an adequacy decision");
  assertEquals(transferDisplayForActivity(ans), "Canada and World Health Organization (international organisation) (an adequacy decision)");
});

Deno.test("doc168 — the marker without a name is never rendered as the raw token", () => {
  const t = resolveTransfer({ transfers_third_country: "yes", transfer_destination: ["__international_organisation__"] });
  assert(!t.destination.includes("__"), t.destination);
  assertStringIncludes(t.destination, "an international organisation (not named)");
});

Deno.test("doc168 — legacy free-text negatives ('None', 'No third-country transfer') read as a recorded 'no'", () => {
  assertEquals(resolveTransfer({ transfer_destination: "None" }).declaredNone, true);
  assertEquals(resolveTransfer({ transfer_destination: "No third-country transfer" }).declaredNone, true);
  assertEquals(resolveTransfer({ transfer_destination: "United States", transfer_mechanism: "SCCs (2021 modules)" }).mechanism, "SCCs (2021 modules)");
});

Deno.test("doc168 — the 'none' mechanism option is undocumented, so the transfer table's basis falls back honestly", () => {
  const d: RopaAnswerData = {
    client: { name: "Halden" },
    profile: {},
    jurisdictions: ["EU"],
    activities: [
      { id: "a1", display_name: "Payroll", template_key: "hr_payroll", category: "hr_employment" },
      { id: "a2", display_name: "Support", template_key: "customer_support", category: "customer_service" },
    ],
    answersByActivity: {
      a1: { transfers_third_country: "yes", transfer_destination: ["India"], transfer_mechanism: "none", data_categories: "Payroll data" },
      a2: { transfers_third_country: "no" },
    },
  };
  const rows = collectTransfers(d);
  assertEquals(rows.length, 1, "the activity that recorded 'no' must not appear in the transfer table");
  assertEquals(rows[0].destination, "India");
  assertEquals(rows[0].mechanism, "no documented transfer mechanism");
  assertEquals(rows[0].basis, "Not recorded — complete before relying on this register");
});

// ── recipients as ONE fact ─────────────────────────────────────────────────

Deno.test("doc168 — recipient categories render as prose with the named processor in parentheses; legacy text unchanged", () => {
  assertEquals(
    recipientsDisplay({ recipient_categories: ["processors"], processor_platform: "AWS (eu-west-1), Mixpanel" }),
    "processors and service providers acting on the Company's instructions (AWS (eu-west-1), Mixpanel)",
  );
  assertEquals(recipientsDisplay({ recipient_categories: ["none"] }), "no recipient outside the organisation");
  assertEquals(recipientsDisplay({ processor_platform: "Workday" }), "Workday");
  assertEquals(recipientsDisplay({}), "");
});

// ── answerDisplayFor — the appendix rule in all three formats ──────────────

Deno.test("doc168 — the Company-Provided Processing Record appendix renders codes as labels, everything else as recorded", () => {
  assertEquals(answerDisplayFor("special_category_basis", ["none"]), "Not applicable — no special category or criminal-offence data is processed");
  assertEquals(answerDisplayFor("transfer_destination", ["Japan", "__international_organisation__"]), "Japan and an international organisation (named separately)");
  assertEquals(answerDisplayFor("lawful_basis", "contract"), "Contract — Art. 6(1)(b)");
  assertEquals(answerDisplayFor("processing_regularity", "regular"), "regular or ongoing");
  assertEquals(answerDisplayFor("purpose", "Paying staff"), "Paying staff");
  assertEquals(answerDisplayFor("processing_regularity", ""), "—");
});

// ── the full pipeline: answers → RopaAssembleInput → byte-pinned register ──

function data(answers: Record<string, Record<string, unknown>>, profile: Record<string, unknown> = {}): RopaAnswerData {
  return {
    client: { name: "Halden Data Services Ltd" },
    profile: { legal_entity_type: "Limited company", is_controller: true, employee_band: "<50", ...profile },
    jurisdictions: ["EU"],
    activities: Object.keys(answers).map((id, i) => ({ id, display_name: `Activity ${i + 1}`, template_key: "hr_payroll", category: "hr_employment" })),
    answersByActivity: answers,
  };
}

const FULL = {
  activity_owner: "HR Director",
  purpose: "Paying staff",
  lawful_basis: "contract",
  special_category_basis: ["none"],
  data_subjects: "Employees",
  data_categories: "Bank details, salary",
  collection_sources: "The employee",
  processing_operations: ["collection", "storage"],
  retention_period: "7 years",
  security_measures: "Encryption at rest",
  access_controls: "Role-based access",
  processing_regularity: "regular",
};

Deno.test("doc168 — register cell (e) and the activity sentence carry a recorded 'no transfer' as the Company's fact", () => {
  const input = buildRopaAssembleInput(data({ a1: { ...FULL, recipient_categories: ["none"], transfers_third_country: "no" } }));
  assertEquals(input.activities[0].transfersDeclaredNone, true);
  assertEquals(input.activities[0].recipients, "no recipient outside the organisation");
  const reg = assembleRopaRegister(input);
  const e = reg.activity_records[0].art30.find((c) => c.pinpoint.includes("(e)"));
  assert(e, "cell (e) must exist");
  assertStringIncludes(e!.value, "No transfer to a third country or international organisation (recorded by the Company)");
  assertStringIncludes(reg.text, "The company has indicated that no personal data are transferred to a third country or an international organisation");
});

Deno.test("doc168 — register cell (e) renders a structured destination and a labelled mechanism, never a code", () => {
  const input = buildRopaAssembleInput(data({
    a1: {
      ...FULL,
      recipient_categories: ["processors", "payment_financial"],
      processor_platform: "Workday",
      transfers_third_country: "yes",
      transfer_destination: ["United States", "Canada"],
      transfer_mechanism: "sccs",
    },
  }));
  assertEquals(input.activities[0].recipients, "processors and service providers acting on the Company's instructions and payment, banking or financial service providers (Workday)");
  assertEquals(input.activities[0].transferDestination, "the United States and Canada");
  assertEquals(input.activities[0].transferMechanism, "Standard Contractual Clauses (SCCs)");
  const reg = assembleRopaRegister(input);
  const e = reg.activity_records[0].art30.find((c) => c.pinpoint.includes("(e)"))!;
  assertStringIncludes(e.value, "the United States and Canada");
  assertStringIncludes(e.value, "Standard Contractual Clauses (SCCs)");
  assert(!/\bsccs\b/.test(reg.text), "the raw option code must never reach the register");
  assertStringIncludes(reg.text, "transferred to the United States and Canada under Standard Contractual Clauses (SCCs)");
});

Deno.test("doc168 — country names that take the definite article get it in prose; others and legacy text do not", () => {
  assertEquals(resolveTransfer({ transfers_third_country: "yes", transfer_destination: ["Netherlands"] }).destination, "the Netherlands");
  assertEquals(resolveTransfer({ transfers_third_country: "yes", transfer_destination: ["Japan"] }).destination, "Japan");
  assertEquals(resolveTransfer({ transfer_destination: "United States (AWS us-east-1)" }).destination, "United States (AWS us-east-1)");
});

Deno.test("doc168 — the 'none' mechanism option reads as the Company's own statement in the activity sentence, not as an unrecorded gap", () => {
  const input = buildRopaAssembleInput(data({
    a1: { ...FULL, recipient_categories: ["processors"], transfers_third_country: "yes", transfer_destination: ["India"], transfer_mechanism: "none" },
  }));
  assertEquals(input.activities[0].transferMechanismUndocumented, true);
  const reg = assembleRopaRegister(input);
  assertStringIncludes(reg.text, "The company has indicated that personal data are transferred to India and records no transfer mechanism for that transfer.");
  assert(!reg.text.includes("under no documented transfer mechanism"), "the label must not be forced into the 'under …' slot");
  assert(!reg.text.includes("without a transfer mechanism recorded"), "a chosen 'none' is recorded, not unrecorded");
  const e = reg.activity_records[0].art30.find((c) => c.pinpoint.includes("(e)"))!;
  assertStringIncludes(e.value, "India — no documented transfer mechanism");
});

Deno.test("doc168 — a legacy record (free-text answers, no gate) still assembles exactly as before", () => {
  const input = buildRopaAssembleInput(data({
    a1: { ...FULL, special_category_basis: "Not applicable", processor_platform: "AWS", transfer_destination: "India", transfer_mechanism: "SCCs (2021)" },
  }));
  assertEquals(input.activities[0].recipients, "AWS");
  assertEquals(input.activities[0].transferDestination, "India");
  assertEquals(input.activities[0].transferMechanism, "SCCs (2021)");
  assertEquals(input.activities[0].transfersDeclaredNone, false);
});
