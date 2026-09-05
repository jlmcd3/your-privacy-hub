// QA batch 2026-09-05 — a purchase-flow review of the live Registration
// Assessment PDF for "EUP QA Fictional UK Retail Ltd" (report 3f024998,
// intake: 12 staff, $800,000 USD revenue, UK-only) surfaced four defects.
//
// 1. The DPO row in the Duty-status table always read "GDPR / UK GDPR" even
//    though buildDpo() gates the branch analysis to the ONE regime that
//    reaches the organisation, and the body only ever analysed UK GDPR for
//    this UK-only record — table and body disagreed about which law was
//    even under discussion.
// 2. The ICO fee tier resolved to a definite £78.00 (Tier 2) from an
//    FX-estimated turnover (£640,000, converted from $800,000 at the 0.80
//    planning rate) that sits only £8,000 above the Tier-1/Tier-2 threshold
//    — the resolver's own boundary/FX-straddle check (DOC 130/139) correctly
//    flagged this as uncertain and wrote a detailed basis to `notes`, but
//    nothing in the document ever read `notes`: the customer saw a flat,
//    unqualified "£78.00" in four places and a generic "confirm the tier"
//    hint with no indication the case was actually close to a boundary.
// 3. Two consecutive sentences about the same recorded fact
//    (acts_as_data_broker: false, an explicit answer) used contradictory
//    epistemic framing: "has indicated that it does not act as a data
//    broker" (correct) immediately followed by "has not recorded broker
//    activity" (implies the question was never answered).
// 4. The Approval-and-review trigger list's first bullet was two unrelated
//    sentences glued together — a general amendment trigger followed by
//    "No US state data-broker statute was in scope here, so none is named."
//    — breaking the one-sentence-per-bullet structure the other three
//    triggers keep and explaining the absence of something the sentence
//    never promised to name.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildRegistrationDeliverables,
  registrationReviewTriggers,
} from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-deliverables/build.ts";
import {
  assembleRegistrationSkeletonDocument,
  deriveDutyStatusTable,
  composeReadinessLead,
} from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-skeleton-assemble.ts";
import { resolveIcoFeeTier } from "../../../supabase/functions/run-registration-assessment/_local/ico-fee-tier.ts";
import { correctIcoExemptionNote } from "../../../supabase/functions/run-registration-assessment/_local/ico-fee-exemption-note.ts";

type Bag = Record<string, unknown>;

// Mirrors the live QA intake (report 3f024998) exactly.
const eupQaIntake: Bag = {
  organization_name: "EUP QA Fictional UK Retail Ltd",
  organization_country: "UK",
  organization_size: "small",
  employee_count: 12,
  annual_revenue_usd: 800_000,
  industry: "E-commerce",
  markets_served: ["UK"],
  has_eu_establishment: false,
  has_uk_establishment: true,
  processes_personal_data: true,
  processes_special_categories: false,
  large_scale_monitoring: false,
  is_public_authority: false,
  acts_as_data_broker: false,
  sells_or_licenses_brokered_data: false,
  uses_ai_systems: false,
};

function reportFor(intake: Bag): Bag {
  const d = buildRegistrationDeliverables(intake as never) as unknown as Bag;
  return {
    registration_deliverables: d,
    ...d,
    obligations_summary: {},
    // Mirrors what index.ts actually persists onto `jurisdictions[]` for a
    // UK-only ICO-fee record: the tag Rule R4 sets, plus the tier resolution
    // (filing_fee_cents/notes/ico_fee_boundary) resolveIcoFeeTier computes.
    jurisdictions: [(() => {
      const t = resolveIcoFeeTier(intake);
      const parts = [t.narrative];
      if (t.boundary && t.tier !== null) {
        parts.push("Confirm the tier with the ICO fee self-assessment before filing (the intake sits near a tier boundary).");
      }
      return {
        code: "UK",
        name: "United Kingdom",
        obligations: ["ico_fee"],
        filing_fee_cents: t.fee_cents,
        fee_range_label: t.fee_range_label,
        fee_tier_ask: t.tier_ask,
        notes: parts.join(" "),
        ico_fee_boundary: t.boundary === true && t.tier !== null,
      };
    })()],
  };
}

// ── 1. DPO row jurisdiction label ───────────────────────────────────────

Deno.test("QA 2026-09-05 #1 — the DPO row names the single regime buildDpo() actually analysed, not both", () => {
  const d = buildRegistrationDeliverables(eupQaIntake as never) as unknown as Bag;
  const dpo = d.dpo_determination as Bag;
  assertEquals(dpo.regime, "UK GDPR", "a UK-only record with no EU establishment or EU markets must resolve to UK GDPR");

  const table = deriveDutyStatusTable(reportFor(eupQaIntake));
  const dpoRow = table!.rows.find((r) => r[0] === "Data protection officer");
  assert(dpoRow, "DPO row must be present");
  assertEquals(dpoRow![1], "UK GDPR", `jurisdiction cell must match the body's own regime, not the old hardcoded "GDPR / UK GDPR": got ${dpoRow![1]}`);
});

Deno.test("QA 2026-09-05 #1 — an EU-established record resolves to GDPR, and the table row follows it", () => {
  const euIntake = { ...eupQaIntake, has_eu_establishment: true, markets_served: ["UK", "FR"] };
  const d = buildRegistrationDeliverables(euIntake as never) as unknown as Bag;
  assertEquals((d.dpo_determination as Bag).regime, "GDPR");
  const table = deriveDutyStatusTable(reportFor(euIntake));
  const dpoRow = table!.rows.find((r) => r[0] === "Data protection officer");
  assertEquals(dpoRow![1], "GDPR");
});

// ── 2. ICO fee tier boundary disclosure reaches the customer ───────────────

Deno.test("QA 2026-09-05 #2 — a boundary tier is flagged, and the flag reaches the Duty-status table cell", () => {
  const t = resolveIcoFeeTier(eupQaIntake);
  // $800,000 * 0.80 = £640,000 — £8,000 above the £632,000 Tier-1 ceiling;
  // the 0.72–0.88 plausible-rate range spans both sides of that threshold.
  assertEquals(t.tier, 2);
  assertEquals(t.fee_cents, 7800);
  assert(t.boundary === true, "this record must be flagged as a tier boundary case");
  assertStringIncludes(t.narrative, "converted from the recorded USD revenue");

  const table = deriveDutyStatusTable(reportFor(eupQaIntake));
  const icoRow = table!.rows.find((r) => r[0].includes("ICO annual data-protection fee"));
  assert(icoRow, "ICO fee row must be present");
  assertStringIncludes(icoRow![3], "£78.00");
  assertStringIncludes(icoRow![3], "close to a tier threshold", "the boundary case must be visibly distinguished from a non-boundary £78.00 record");
});

Deno.test("QA 2026-09-05 #2 — a non-boundary tier carries no boundary hint", () => {
  // Comfortably inside Tier 2 on both axes — not a boundary case.
  const stable = { ...eupQaIntake, employee_count: 60, annual_revenue_usd: 5_000_000 };
  const t = resolveIcoFeeTier(stable);
  assertEquals(t.tier, 2);
  assertEquals(t.boundary, false);
  const table = deriveDutyStatusTable(reportFor(stable));
  const icoRow = table!.rows.find((r) => r[0].includes("ICO annual data-protection fee"));
  assert(!icoRow![3].includes("close to a tier threshold"));
});

Deno.test("QA 2026-09-05 #2 — the full boundary narrative (conversion basis + confirm note) reaches Section 3 body text", () => {
  const report = reportFor(eupQaIntake);
  const counts = {
    attached: 1,
    satisfied: 0,
    open: 1,
    broker_states: [],
    reserved: 0,
    attached_names: ["the United Kingdom ICO annual data-protection fee (£78.00)"],
    filing_attached: 0,
    designation_attached: 0,
    corpus_pending: 0,
    ico_fee_attached: 1,
    ai_act_attached: 0,
  };
  const lead = composeReadinessLead(report, counts as never, "EUP QA Fictional UK Retail Ltd");
  assertStringIncludes(lead, "No filing-content list applies");
  assertStringIncludes(lead, "converted from the recorded USD revenue at a 0.80 GBP/USD planning rate");
  assertStringIncludes(lead, "intake sits near a tier boundary");
});

// ── 3. Data-broker sentence: explicit "no" vs. genuine silence ─────────────

function skeletonText(intake: Bag): string {
  const d = buildRegistrationDeliverables(intake as never) as unknown as Bag;
  const report: Bag = { registration_deliverables: d, ...d, obligations_summary: {}, jurisdictions: [] };
  return JSON.stringify(assembleRegistrationSkeletonDocument(report, intake));
}

Deno.test("QA 2026-09-05 #3 — an explicit false answer reads as an indication, matching the lead sentence", () => {
  const text = skeletonText(eupQaIntake);
  // Both sentences about the same fact must agree that the company answered.
  assertStringIncludes(text, "has indicated that it does not act as a data broker");
  assert(!text.includes("has not recorded broker activity"), "an explicit false answer must never be described as unrecorded");
});

Deno.test("QA 2026-09-05 #3 — a genuinely silent field still reads as unrecorded", () => {
  const silent = { ...eupQaIntake, acts_as_data_broker: undefined };
  const text = skeletonText(silent);
  assertStringIncludes(text, "has not recorded broker activity");
});

// ── 4. Review-trigger list: one sentence per bullet ─────────────────────

Deno.test("QA 2026-09-05 #4 — the amendment trigger is one sentence and never explains an absent statute name", () => {
  const triggers = registrationReviewTriggers(eupQaIntake as never);
  assertEquals(triggers[0], "Amendment of any registration or designation statute in force in the jurisdictions assessed here.");
  assert(!triggers.some((t) => t.includes("No US state data-broker statute was in scope")), "the stray aside must be gone from every bullet");
  assertEquals(triggers.length, 4, "the trigger count is unchanged — only the wording of the first bullet changed");
});

Deno.test("QA 2026-09-05 #4 — an engaged data-broker record still names its statutes in the amendment trigger", () => {
  const caBroker = { ...eupQaIntake, markets_served: ["UK", "US-CA"], acts_as_data_broker: true, sells_or_licenses_brokered_data: true };
  const triggers = registrationReviewTriggers(caBroker as never);
  assertStringIncludes(triggers[0], "Amendment of any data-broker registration statute named in this assessment");
  assertStringIncludes(triggers[0], "Cal. Civ. Code");
});

// ── Codex QA report (same day), REG 02 / REG 03 ──────────────────────────────
// The automated buy-path review of the same PDF added four more findings:
// (a) "Approval and review" repeated the missing-facts list twice (statement +
//     information_needed);
// (b) the Section II lead said "no EU, UK or AI Act filing duty of this kind"
//     beside a Section III that attached the ICO fee;
// (c) "Open determinations: None — every determination is resolved" beside an
//     FX-estimated ICO tier the document itself said must be confirmed;
// (d) the free report's jurisdiction card listed sole traders and charities as
//     blanket ICO fee exemptions (DB content contradicting ICO guidance).

Deno.test("REG 02 (a) — the pending attestation statement no longer repeats the information_needed list", () => {
  const d = buildRegistrationDeliverables(eupQaIntake as never) as unknown as Bag;
  const att = d.attestation as Bag;
  assertEquals(att.status, "record_insufficient");
  assert(!String(att.statement).includes("does not state"), "statement must not carry the missing-facts list");
  assertStringIncludes(String(att.statement), "Approval status: pending");
  assertStringIncludes(String(att.information_needed), "the name of the person approving this assessment");
  assertStringIncludes(String(att.information_needed), "the date this assessment is next due for review");
});

Deno.test("REG 02 (b) — the Section II lead names the duties it decides and points the ICO fee to Section III", () => {
  const text = JSON.stringify(assembleRegistrationSkeletonDocument(reportFor(eupQaIntake), eupQaIntake));
  assertStringIncludes(text, "carries no EU or UK representative or data protection officer designation duty and no EU AI Act registration duty");
  assertStringIncludes(text, "the UK ICO data-protection fee is a separate payment obligation and is addressed in Section III");
  assert(!text.includes("filing duty of this kind"), "the vague 'of this kind' sentence must be gone");
});

Deno.test("REG 02 (b) — without an ICO fee jurisdiction the lead carries no fee aside", () => {
  const text = skeletonText(eupQaIntake); // jurisdictions: [] — no ico_fee obligation
  assert(!text.includes("separate payment obligation"));
});

Deno.test("REG 02 (c) — a boundary ICO tier is an open verification item on page one", () => {
  const boundary = JSON.stringify(assembleRegistrationSkeletonDocument(reportFor(eupQaIntake), eupQaIntake));
  assertStringIncludes(boundary, "the ICO fee tier requires confirmation before filing because the recorded turnover sits near a tier threshold");
  assert(!boundary.includes("None — every determination is resolved"), "a boundary record must not claim every determination is resolved");

  const stable = { ...eupQaIntake, employee_count: 60, annual_revenue_usd: 5_000_000 };
  const stableText = JSON.stringify(assembleRegistrationSkeletonDocument(reportFor(stable), stable));
  assertStringIncludes(stableText, "None — every determination is resolved on the information provided");
  assert(!stableText.includes("requires confirmation before filing because"));
});

Deno.test("REG 03 — the seeded blanket ICO exemption sentence is rewritten to the ICO's activity-based rule", () => {
  const seeded =
    "Annual ICO data protection fee (current rates effective April 2024): Tier 1 £52 … Tier 3 £3,763. £5 discount for direct debit payment. " +
    "Exemptions: sole traders, charities, small occupational pension schemes, maintained schools. Confirm tier and exemptions at https://ico.org.uk/.";
  const fixed = correctIcoExemptionNote(seeded, "UK")!;
  assert(!fixed.includes("Exemptions: sole traders"), "blanket list must be gone");
  assertStringIncludes(fixed, "Exemptions are activity-based, not organisation-based");
  assertStringIncludes(fixed, "including a sole trader) pays the fee unless every purpose");
  assertStringIncludes(fixed, "Charities and small occupational pension schemes that are not otherwise exempt pay the Tier 1 fee regardless of size or turnover");
  assertStringIncludes(fixed, "Tier 1 £52", "the surrounding fee text survives");
  // Other jurisdictions and empty notes pass through untouched.
  assertEquals(correctIcoExemptionNote(seeded, "DE"), seeded);
  assertEquals(correctIcoExemptionNote(null, "UK"), null);
});
