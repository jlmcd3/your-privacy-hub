// DOC 137 (2026-09-02) — § 7150(b)(3) ADMT trigger fires without
// significant-decision category matching.
//
// Root cause: both _w9_risk_slots.ts (computeIntakeSelectedSubsections) and
// _local/openings/risk-opening.ts (buildRiskOpening's S1 trigger list) fired
// § 7150(b)(3) purely on q18_admt_use === "Yes", with no check of which
// § 7001(ddd) significant-decision category (if any) the described activity
// falls into, and without the FSOR advertising exclusion (11 CCR
// § 7001(ddd)(6)) the separate CPPA ADMT product already implements.
import { assert, assertEquals, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeIntakeSelectedSubsections } from "../../../supabase/functions/run-cppa-risk-assessment/_w9_risk_slots.ts";
import { classifyAdmtSignificantDecision } from "../../../supabase/functions/run-cppa-risk-assessment/_local/admt-significant-decision.ts";
import { buildRiskOpening } from "../../../supabase/functions/run-cppa-risk-assessment/_local/openings/risk-opening.ts";

// ── classifyAdmtSignificantDecision (the shared helper) ────────────────────

Deno.test("classifier: empty/blank description is unresolved, never fabricated either way", () => {
  assertEquals(classifyAdmtSignificantDecision(""), "unresolved");
  assertEquals(classifyAdmtSignificantDecision("   "), "unresolved");
});

Deno.test("classifier: a description with no category signal and no advertising signal is unresolved", () => {
  assertEquals(
    classifyAdmtSignificantDecision("The system helps route customer support tickets to the right team."),
    "unresolved",
  );
});

Deno.test("classifier: an advertising-only description reads as the FSOR exclusion", () => {
  assertEquals(
    classifyAdmtSignificantDecision("Used solely to target advertising to consumers based on interests."),
    "advertising_only",
  );
});

Deno.test("classifier: an enumerated significant-decision category is recognized (financial/lending)", () => {
  assertEquals(
    classifyAdmtSignificantDecision("Scores loan applications to determine consumer credit eligibility."),
    "significant",
  );
});

Deno.test("classifier: hiring/employment category is recognized", () => {
  assertEquals(
    classifyAdmtSignificantDecision("Screens job applicants and recommends hiring decisions."),
    "significant",
  );
});

Deno.test("classifier: healthcare category is recognized", () => {
  assertEquals(
    classifyAdmtSignificantDecision("Assists clinicians with diagnosis and treatment recommendations."),
    "significant",
  );
});

Deno.test("classifier: a category match wins even when advertising is also mentioned", () => {
  assertEquals(
    classifyAdmtSignificantDecision(
      "Used for advertising, and also to score loan applications for consumer credit eligibility.",
    ),
    "significant",
  );
});

// ── computeIntakeSelectedSubsections (_w9_risk_slots.ts) ───────────────────

Deno.test("(b)(3) does not fire on q18_admt_use='Yes' alone with no description", () => {
  const out = computeIntakeSelectedSubsections({ q18_admt_use: "Yes" });
  assertFalse(out.includes("§ 7150(b)(3)"));
});

Deno.test("(b)(3) does not fire for an advertising-only description", () => {
  const out = computeIntakeSelectedSubsections({
    q18_admt_use: "Yes",
    q19_admt_description: "The System is used solely for ad targeting based on browsing history.",
  });
  assertFalse(out.includes("§ 7150(b)(3)"));
});

Deno.test("(b)(3) fires when the description clearly establishes an enumerated significant-decision category", () => {
  const out = computeIntakeSelectedSubsections({
    q18_admt_use: "Yes",
    q19_admt_description: "Scores loan applications to determine consumer credit eligibility.",
  });
  assert(out.includes("§ 7150(b)(3)"));
});

Deno.test("(b)(3) never fires when q18_admt_use is not 'Yes', regardless of description", () => {
  const out = computeIntakeSelectedSubsections({
    q18_admt_use: "No",
    q19_admt_description: "Scores loan applications to determine consumer credit eligibility.",
  });
  assertFalse(out.includes("§ 7150(b)(3)"));
});

// ── buildRiskOpening's S1 trigger list (risk-opening.ts) ────────────────────

const openingBase = {
  entity_name: "Meridian SaaS Inc.",
  q1_revenue: "$25M–$50M",
  q2_consumers: "250,000–1 million",
  q5_sell_share: "No",
  q5b_profiling_observation: "No",
  q15_sensitive_pi: "No",
  q18_admt_use: "No",
  q18b_admt_training: "No",
  sensitive_location_basis: "No",
  q4_pi_categories: ["Contact identifiers (name, email, phone)"],
  i1_processing_purpose: "Deliver core SaaS analytics functionality.",
  i1b_min_pi: "We collect only identifiers necessary to provision accounts and bill customers.",
  i4_disclosure_mechanisms: ["Notice at Collection", "Privacy policy"],
};

Deno.test("S1: (b)(3) does not fire on ADMT use alone; open question recorded in omitted telemetry", () => {
  const r = buildRiskOpening({ ...openingBase, q18_admt_use: "Yes" }, { asOfDate: "2026-09-02" });
  assertFalse(r.provenance.s1_triggers.includes(3));
  assert(r.provenance.omitted.includes("S1:b3_significant_decision_category_unresolved"));
});

Deno.test("S1: (b)(3) does not fire for an advertising-only description; FSOR exclusion recorded", () => {
  const r = buildRiskOpening(
    {
      ...openingBase,
      q18_admt_use: "Yes",
      q19_admt_description: "The System is used solely to target advertising to consumers.",
    },
    { asOfDate: "2026-09-02" },
  );
  assertFalse(r.provenance.s1_triggers.includes(3));
  assert(r.provenance.omitted.includes("S1:b3_advertising_exclusion_fsor_7001_ddd_6"));
});

Deno.test("S1: (b)(3) fires when the description clearly establishes a significant-decision category", () => {
  const r = buildRiskOpening(
    {
      ...openingBase,
      q18_admt_use: "Yes",
      q19_admt_description: "Screens job applicants and recommends hiring decisions.",
    },
    { asOfDate: "2026-09-02" },
  );
  assert(r.provenance.s1_triggers.includes(3));
});

// ── DOC 138 (2026-09-02) — negation-aware category matching ────────────────
//
// A fresh grading run found the classifier still firing "significant" for a
// PURE ADVERTISING description because the bare `/\bhousing\b/i` category
// keyword matched the word "housing" INSIDE the description's own explicit
// exclusion clause ("No financial-eligibility, employment, or housing
// decisions"), short-circuiting before the advertising-only check ever ran.
// Fixed by scoping category matches to their own sentence and discarding a
// match that sits inside that sentence's negation/exclusion clause. See
// admt-significant-decision.ts's DOC 138 comment for the full writeup.

Deno.test("DOC 138: pure-advertising description with an explicit exclusion clause naming 'housing' is advertising_only, not significant", () => {
  const description =
    "Audience-scoring models segment consumers into interest cohorts and predicted-purchase-intent bands. " +
    "Outputs drive bid eligibility and frequency caps. " +
    "No financial-eligibility, employment, or housing decisions.";
  assertEquals(classifyAdmtSignificantDecision(description), "advertising_only");
});

Deno.test("DOC 138: a genuine housing-decision description still classifies as significant (negation-awareness must not over-suppress real matches)", () => {
  assertEquals(
    classifyAdmtSignificantDecision(
      "The system scores rental applications to approve or deny housing.",
    ),
    "significant",
  );
});

Deno.test("DOC 138: a genuine employment-decision description is not suppressed by an unrelated 'no housing' disclaimer elsewhere in the text", () => {
  const description =
    "The system automatically decides employee promotion and termination based on performance scores. " +
    "No housing decisions are made by this system.";
  assertEquals(classifyAdmtSignificantDecision(description), "significant");
});

Deno.test("DOC 138: end-to-end — the pure-advertising fixture does not fire § 7150(b)(3) through computeIntakeSelectedSubsections", () => {
  const out = computeIntakeSelectedSubsections({
    q18_admt_use: "Yes",
    q19_admt_description:
      "Audience-scoring models segment consumers into interest cohorts and predicted-purchase-intent bands. " +
      "Outputs drive bid eligibility and frequency caps. " +
      "No financial-eligibility, employment, or housing decisions.",
  });
  assertFalse(out.includes("§ 7150(b)(3)"));
});
