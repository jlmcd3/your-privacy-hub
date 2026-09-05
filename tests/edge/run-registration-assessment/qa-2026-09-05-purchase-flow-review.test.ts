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
