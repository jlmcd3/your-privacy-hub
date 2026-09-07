// BATCH a81e0240 (2026-09-07) — first live LIA_DETERMINISTIC_ENABLED batch.
//
// Lives in _tests/ (not tests/edge/run-li-assessment/), matching
// item364-lia-register.test.ts: importing anything from run-li-assessment/
// index.ts drags in its top-level Deno.serve(...) and Supabase client init,
// so this file needs `--allow-net` and dummy SUPABASE_URL / SUPABASE_
// SERVICE_ROLE_KEY env vars to load — neither of which the standard battery
// invocation (`deno test --no-check --allow-read --allow-env <dir>`)
// supplies. Run directly: `SUPABASE_URL=https://x.supabase.co
// SUPABASE_SERVICE_ROLE_KEY=x deno test --no-check --allow-read --allow-env
// --allow-net tests/edge/_tests/batch-a81e0240-harm-scrub.test.ts`.
//
// `stripUnsupportedHarmClaims`'s evidence check ran against `liaIntakeObject`
// (index.ts ~1797), a deliberately trimmed copy of the record that never
// carries purpose_details/necessity_details/balancing_details. A company
// whose OWN purpose_details.specific_benefit mentions "reputational harm" (in
// a positive sense — the processing REDUCES it) had no way to satisfy the
// evidence check, since the one place the word appears was excluded from what
// the check could see. The scrub then deleted "and reputational harm" from
// every string field in reportData that contained it, including the
// customer's own quoted benefit sentence — corrupting a direct quote into
// broken English ("reducing financial to users and the platform.") in a
// section the function was never meant to touch (SO-FT2 FIX 8 is about
// controller-harm characterisations in the balancing analysis, not the
// purpose test's benefit statement). Fixed by checking evidence against the
// full record instead of the trimmed intake object. Reproduced with the exact
// intake text from the batch's Velorant Web Solutions Ltd run (report
// d34302d7-a2b6-4bab-859f-e22b67f2dbc1).

import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { stripUnsupportedHarmClaims } from "../../../supabase/functions/run-li-assessment/index.ts";

const VELORANT_BENEFIT =
  "Early detection of account takeover attempts, reducing financial and reputational harm to users and the platform.";

function reportWithBenefit(benefit: string) {
  return {
    benefit_and_beneficiary: {
      benefit,
      application:
        `The record states a benefit particular to this processing — "${benefit}" — and identifies the controller's own business and the data subjects themselves as receiving it.`,
    },
    three_part_test: {
      balancing_test: {
        analysis: `In favour of the interest: the specific benefit stated — ${benefit.replace(/\.$/, "")}; 5 recorded safeguards.`,
      },
    },
  };
}

Deno.test("batch a81e0240 — a customer's own benefit quote mentioning reputational harm is NOT corrupted, checked against the full record", () => {
  const report = reportWithBenefit(VELORANT_BENEFIT);
  // The trimmed intake object as actually built in index.ts (~1797-1807):
  // no purpose_details, so the old call site could never see the customer's
  // own use of "reputational" and always treated the term as unsupported.
  const trimmedLiaIntakeObject = {
    organization_name: "Velorant Web Solutions Ltd",
    relationship_type: "Existing customer",
    jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
    data_categories: ["Contact data", "Location data"],
    processing_description: "User session data...",
    stated_purpose: null,
    sector: null,
    alternatives_considered: "Consent-based opt-in to security monitoring\nContract basis under account terms",
  };
  // The full record, as `assessment` is throughout index.ts — the fix's input.
  const fullAssessment = {
    ...trimmedLiaIntakeObject,
    purpose_details: { specific_benefit: VELORANT_BENEFIT, interest_type: "Security / fraud prevention" },
  };

  const buggy = stripUnsupportedHarmClaims(reportWithBenefit(VELORANT_BENEFIT) as any, trimmedLiaIntakeObject);
  assertEquals(buggy.removed > 0, true, "sanity check: the trimmed intake reproduces the defect");
  const fixed = stripUnsupportedHarmClaims(report as any, fullAssessment);
  assertEquals(fixed.removed, 0);
  assertStringIncludes((report as any).benefit_and_beneficiary.benefit, "reducing financial and reputational harm to users and the platform");
  assertStringIncludes((report as any).three_part_test.balancing_test.analysis, "reducing financial and reputational harm to users and the platform");
});

Deno.test("batch a81e0240 — an ACTUALLY unsupported reputational-harm claim (nowhere in the record) is still scrubbed", () => {
  const report = {
    three_part_test: {
      balancing_test: {
        analysis: "The most serious realistic impact identified is financial loss and reputational harm to the individual.",
      },
    },
  };
  const fullAssessment = {
    organization_name: "Some Co",
    purpose_details: { specific_benefit: "Improving retention.", interest_type: "Commercial / revenue-related" },
    balancing_details: { potential_harms: ["Financial loss"] },
  };
  const result = stripUnsupportedHarmClaims(report as any, fullAssessment);
  assertEquals(result.removed > 0, true, "an unsupported claim with no evidence anywhere in the full record must still be caught");
  assertStringIncludes(
    report.three_part_test.balancing_test.analysis,
    "The most serious realistic impact identified is financial loss",
  );
  assertEquals(report.three_part_test.balancing_test.analysis.includes("reputational harm"), false);
});
