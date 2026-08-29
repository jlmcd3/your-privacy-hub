// LIA-1 (Phase 4, Target/Old/New comparison, 2026-08-29) — bundled-purpose
// detection for sub-test 2 ("clearly and precisely articulated").
//
// EDPB Guidelines 1/2024 ¶10 (verified against the primary-source PDF this
// session): reliance on Art. 6(1)(f) "should not encompass several purposes
// without assessing the validity of the legal basis for each of them." The
// deterministic product previously had no detection at all for a bundled
// interest_statement — any statement of >=5 words passed sub-test 2 whether
// it named one interest or several. This closes that gap without any new
// intake field: detection reads only purpose_details.interest_statement
// against the same 7 categories the intake's own interest_type select
// already offers (PURPOSE_CATEGORIES, elements.ts), and only when two
// DIFFERENT categories are split across an explicit connector — never on a
// bare co-occurrence, and never on two mentions from the SAME category.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildInterestLegitimacy } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import { buildThreePartTestTyped } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/three-part-test-typed.ts";
import { buildLiaUpgrade4 } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";

type Bag = Record<string, unknown>;

function baseIntake(over: Bag = {}): Bag {
  return {
    organization_name: "Halverson Logistics GmbH",
    subject_anchor: "customers",
    processing_description: "We run a live scoring model on every transaction today.",
    data_categories: ["Device data", "Behavioural / usage data"],
    relationship_type: "Customers",
    jurisdictions: ["EU (GDPR)"],
    stated_purpose: "Fraud detection on transactions.",
    balancing_details: {},
    necessity_details: {},
    purpose_details: {},
    attestation: {},
    ...over,
  };
}

Deno.test("bundled purpose (explicit connector, two different categories) — sub-test 2 goes undetermined, not a flat fail", () => {
  const f = buildInterestLegitimacy(baseIntake({
    purpose_details: {
      interest_type: "Security / fraud prevention",
      interest_statement:
        "We use device and browsing data to detect fraudulent transactions and also to power our marketing campaigns for existing customers.",
    },
  }));
  const clear = f.sub_tests.find((t) => t.id === "clearly_articulated")!;
  assertEquals(clear.verdict, "undetermined_on_the_record");
  assert(
    !/does not meet this standard/i.test(clear.reasoning),
    "must never use auditor 'does not meet this standard' phrasing (index.ts OUTPUT-ABSENCE rule)",
  );
  assertStringIncludes(clear.reasoning, "security / fraud prevention");
  assertStringIncludes(clear.reasoning, "commercial / revenue-related");
  assertStringIncludes(clear.reasoning, "EDPB Guidelines 1/2024");
  assert(clear.information_needed, "clearNeeded must be populated so the record has a concrete next step");
  assertStringIncludes(clear.information_needed!, "separate assessment per interest");
  // Never claim separate documents/assessments are a legal PRECONDITION to
  // relying on Art. 6(1)(f) (index.ts SPECIFICITY, NOT SEPARATE DOCUMENTS).
  assert(
    !/precondition/i.test(clear.information_needed!),
    "must not frame separate assessments as a precondition to reliance",
  );
  assertEquals(f.verdict, "undetermined_on_the_record");
  assertEquals(f.status, "record_insufficient");
});

Deno.test("bundled purpose cascades to pv=uncertain and the existing information_needed hook — no new report field", () => {
  const intake = baseIntake({
    purpose_details: {
      interest_type: "Security / fraud prevention",
      interest_statement:
        "We use device and browsing data to detect fraudulent transactions and also to power our marketing campaigns for existing customers.",
    },
  });
  const u4 = buildLiaUpgrade4(intake);
  const report: Bag = {
    interest_legitimacy: u4.interest_legitimacy,
    benefit_and_beneficiary: u4.benefit_and_beneficiary,
    alternatives_considered: u4.alternatives_considered,
    relationship_with_individual: u4.relationship_with_individual,
    scale_frequency_duration: u4.scale_frequency_duration,
    potential_harms: u4.potential_harms,
    opt_out_feasibility: u4.opt_out_feasibility,
    attestation_block: u4.attestation_block,
    lia_determination: { outcome: "undetermined_on_the_record", driving_factors: [], why: "" },
    eprivacy_short_circuit: {},
  };
  const stage2 = buildThreePartTestTyped(report, intake);
  assertEquals((stage2.three_part_test.purpose_test as Bag).verdict, "uncertain");
  const ask = stage2.information_needed.find((n) => (n as Bag).field === "stated_purpose");
  assert(ask, "the pre-existing pv==='uncertain' -> information_needed(stated_purpose) hook must fire — no new field was added");
});

Deno.test("two mentions from the SAME category, joined by 'and' — never flagged (no false positive)", () => {
  const f = buildInterestLegitimacy(baseIntake({
    purpose_details: {
      interest_type: "Security / fraud prevention",
      interest_statement:
        "We use device and browsing data to detect fraudulent transactions and prevent account takeover before they complete.",
    },
  }));
  const clear = f.sub_tests.find((t) => t.id === "clearly_articulated")!;
  assertEquals(clear.verdict, "met");
});

Deno.test("two categories present but no explicit connector between them — never flagged (conservative detection)", () => {
  const f = buildInterestLegitimacy(baseIntake({
    purpose_details: {
      interest_type: "Security / fraud prevention",
      interest_statement:
        "Fraud prevention is core to protecting revenue on this platform, since fraudulent transactions cost the business directly.",
    },
  }));
  const clear = f.sub_tests.find((t) => t.id === "clearly_articulated")!;
  assertEquals(clear.verdict, "met");
});

Deno.test("single, well-articulated purpose — unaffected, still met (baseline regression)", () => {
  const f = buildInterestLegitimacy(baseIntake({
    purpose_details: {
      interest_type: "Security / fraud prevention",
      interest_statement:
        "We use device and browsing data to detect fraudulent transactions before they complete, protecting both our business and legitimate customers from financial loss.",
    },
  }));
  const clear = f.sub_tests.find((t) => t.id === "clearly_articulated")!;
  assertEquals(clear.verdict, "met");
  assertEquals(f.verdict, "legitimate_interest_established");
});
