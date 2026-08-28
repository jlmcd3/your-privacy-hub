// D1D2B3B8 (quality batch, 2026-08-27) — LIA fixes.
//   L1 [MEDIUM] firstSentenceSafe cut the condition-walk parentheticals
//      mid-word ("property d)"); the first sentence now returns whole.
//   L2 [MEDIUM] the executive summary duplicated the purpose-test condition
//      walk verbatim; it now carries a compact verdict-only read.
//   L3 [HIGH] a mixed EU+UK record never named the UK GDPR anywhere; the
//      subtitle, §I note and Table of Authorities now acknowledge it while
//      the citations stay on the EU rail (ITEM-330).
//   L4 [MEDIUM] the two-sentence Article 21 recitation rendered identically
//      in every document that reached the opt-out factor; compressed to one
//      comparison-bearing sentence.
//   L5 [MEDIUM] a field-pointer line ("As detailed in alternatives_considered,
//      …") parsed as a bogus unexplained alternative, and the `||` between
//      necessity_details.alternatives and alternatives_considered dropped the
//      detailed reasons whenever both fields were present.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleLiaSkeletonDocument } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import {
  buildAlternativesConsidered,
  buildInterestLegitimacy,
  buildOptOutFeasibility,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

function baseIntake(over: Bag = {}): Bag {
  return {
    organization_name: "Halverson Logistics GmbH",
    subject_anchor: "Fleet camera monitoring",
    processing_description: "Cab-facing camera monitoring for the employed driver fleet.",
    data_categories: ["Location data", "Behavioural / usage data"],
    relationship_type: "Employees",
    jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
    stated_purpose: "Fleet safety and duty of care",
    balancing_details: {},
    necessity_details: {},
    purpose_details: {},
    attestation: {},
    ...over,
  };
}

const LONG_INTEREST =
  "Halverson has a genuine commercial and duty-of-care interest in ensuring that its 340 drivers operate vehicles safely on public roads, reducing the risk of accidents that cause injury, property damage, insurance claims, and reputational harm across the markets it serves in three countries.";

Deno.test("L1 — the condition-walk parenthetical carries the whole first sentence, never a mid-word cut", () => {
  const f = buildInterestLegitimacy(baseIntake({
    stated_purpose: "Road safety for the employed fleet and lawful fleet management.",
    purpose_details: {
      interest_statement: LONG_INTEREST,
      interest_type: "Commercial interest",
    },
  }));
  assertStringIncludes(f.application, "reputational harm across the markets it serves in three countries");
  assert(!/\bproperty d\)/.test(f.application), "the mid-word truncation must be gone");
});

Deno.test("L2 — the executive summary carries the compact verdict read, not the condition walk", () => {
  const report = {
    three_part_test: {
      purpose_test: { verdict: "passes", analysis: "The Guidelines put the test cumulatively: the first — the interest pursued is lawful — is met (long reasoning). More analysis follows." },
      necessity_test: { verdict: "passes", analysis: "Necessity analysis." },
      balancing_test: { verdict: "likely_passes", analysis: "Balancing analysis." },
    },
    lia_determination: { why: "The balance favours the controller on the record as documented." },
  };
  const out = assembleLiaSkeletonDocument(report, baseIntake({
    purpose_details: { interest_description: LONG_INTEREST },
  }));
  const text = skeletonDocumentToText(out.document);
  const walkHits = text.split("the first — the interest pursued is lawful").length - 1;
  assert(walkHits <= 1, `the condition walk must render at most once, not ${walkHits} times`);
  assertStringIncludes(text, "the analysis supporting each appears in Sections II to IV");
  assertStringIncludes(text, "the purpose test is met");
});

Deno.test("L3 — a mixed EU+UK record acknowledges the UK instrument on subtitle, §I and ToA", () => {
  const out = assembleLiaSkeletonDocument({}, baseIntake());
  const text = skeletonDocumentToText(out.document);
  assertStringIncludes(text, "Article 6(1)(f) GDPR and Article 6(1)(f) UK GDPR");
  assertStringIncludes(text, "the UK GDPR applies in parallel");
  // The ToA lists the UK counterpart because the §I note cites it.
  assertStringIncludes(text, "Article 6(1)(f) UK GDPR");
});

Deno.test("L3 — an EU-only record carries no UK acknowledgment", () => {
  const out = assembleLiaSkeletonDocument({}, baseIntake({ jurisdictions: ["EU (GDPR)"] }));
  const text = skeletonDocumentToText(out.document);
  assert(!text.includes("UK GDPR"), "no UK instrument on an EU-only record");
});

Deno.test("L4 — the objection default is one comparison-bearing sentence, not the Article 21 recitation", () => {
  const f = buildOptOutFeasibility(baseIntake({
    balancing_details: {
      opt_out_available: "Yes, on request to the DPO",
      opt_out_mechanism: "A written objection is assessed by the DPO within 14 days, with escalation to the Betriebsrat.",
    },
  }));
  assertEquals(f.feasibility, "conditional_opt_out_available");
  assertStringIncludes(f.application, "qualified");
  assert(
    !f.application.includes("establishment, exercise or defence of legal claims"),
    "the long recitation must be gone",
  );
  assert(
    !f.application.includes("in which case the data subject may object at any time and the processing must stop"),
    "the direct-marketing tail of the recitation must be gone",
  );
});

Deno.test("L5 — a field-pointer line never becomes an unexplained alternative", () => {
  const f = buildAlternativesConsidered(baseIntake({
    necessity_details: {
      alternatives:
        "As detailed in alternatives_considered, manual inspections, event-only cameras, and self-reporting tools were each evaluated and found insufficient to meet the safety and HR objectives.",
      alternatives_rationale:
        "Manual inspections — sample only 2% of routes and cannot observe in-cab behaviour. Event-only cameras — miss the fatigue patterns that precede incidents. Self-reporting tools — depend on driver candour and under-report near-misses.",
    },
  }));
  const names = f.alternatives.map((a) => a.alternative.toLowerCase());
  assert(
    !names.some((n) => n.includes("as detailed in") || n.includes("alternatives_considered")),
    `the pointer line must not parse as an alternative: ${JSON.stringify(names)}`,
  );
  assert(f.alternatives.length >= 3, "the detailed rows must all parse");
  assert(
    f.alternatives.every((a) => a.rationale_recorded),
    "every parsed alternative carries its recorded reason",
  );
  assert(
    !f.application.includes("remains open on the information provided") || !f.application.includes("As detailed"),
    "no fabricated comparison gap",
  );
});

Deno.test("L5 — both alternatives fields feed the parse (the || drop is gone)", () => {
  const f = buildAlternativesConsidered(baseIntake({
    necessity_details: {
      alternatives:
        "For the primary activity, aggregate-only segmentation and category-count-only modelling were evaluated and rejected as described in alternatives_considered.",
    },
    alternatives_considered:
      "Aggregate-only segmentation — an A/B test showed statistically identical open rates, losing the personalisation benefit entirely. Category-count-only modelling — forfeits the 18-percentage-point precision improvement the beacon data provides.",
  }));
  assert(f.alternatives.length >= 2, "the detailed alternatives_considered rows must parse");
  assert(f.alternatives.every((a) => a.rationale_recorded), "each carries its recorded reason");
});
