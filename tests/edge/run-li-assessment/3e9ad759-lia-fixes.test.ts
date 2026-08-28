// 3E9AD759 (quality batch, 2026-08-27) — LIA fixes.
//   L1 [HIGH] a UK-only record rendered "Article 6(1)(f) GDPR" on the
//      subtitle and Table of Authorities; UK-only now carries "Article
//      6(1)(f) UK GDPR" (mixed EU+UK stays on the EU rail — ITEM-330 rule).
//   L2 the purpose-test condition walk names each condition with its own
//      recorded reasoning.
//   L3 the necessity all-pass walk names each alternative with its reason.
//   L4 a favourable balancing closing carries the verdict's decision path.
//   L6 a special-category-indicative record earns the Article 9 boundary
//      instead of silence.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleLiaSkeletonDocument } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import { buildInterestLegitimacy } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

function ukIntake(over: Bag = {}): Bag {
  return {
    organization_name: "Meridian Freight Ltd",
    subject_anchor: "Driver telematics scoring",
    processing_description: "Telematics-based driver performance scoring for the employed fleet.",
    data_categories: ["Location data", "Behavioural / usage data", "Biometric data"],
    relationship_type: "Employees",
    jurisdictions: ["United Kingdom (UK GDPR)"],
    stated_purpose: "Fleet safety and efficiency",
    balancing_details: {},
    necessity_details: {},
    purpose_details: {},
    attestation: {},
    ...over,
  };
}

Deno.test("L1 — a UK-only record carries the UK GDPR instrument label on subtitle and ToA", () => {
  const out = assembleLiaSkeletonDocument({}, ukIntake());
  const text = skeletonDocumentToText(out.document);
  assertStringIncludes(text, "Article 6(1)(f) UK GDPR");
  assert(!/Prepared under Article 6\(1\)\(f\) GDPR /.test(text), "the EU instrument label must not head a UK-only record");
});

Deno.test("L1 — a mixed EU+UK record stays on the EU citation rail (ITEM-330 rule)", () => {
  const out = assembleLiaSkeletonDocument({}, ukIntake({ jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"] }));
  const text = skeletonDocumentToText(out.document);
  assertStringIncludes(text, "Prepared under Article 6(1)(f) GDPR");
});

Deno.test("L6 — a biometric-naming record with no special-category answer earns the Article 9 boundary", () => {
  const out = assembleLiaSkeletonDocument({}, ukIntake());
  const text = skeletonDocumentToText(out.document);
  assertStringIncludes(text, "Whether that category engages Article 9(1)");
  assertStringIncludes(text, "processed for the purpose of uniquely identifying a natural person");
  assertStringIncludes(text, "legitimate interests alone cannot carry that processing");
});

Deno.test("L6 — an affirmative special-category answer states the boundary outright", () => {
  const out = assembleLiaSkeletonDocument({}, ukIntake({
    balancing_details: { special_category_data: true },
  }));
  const text = skeletonDocumentToText(out.document);
  assertStringIncludes(text, "Article 9(1) data cannot rest on legitimate interests alone");
});

Deno.test("L6 — no boundary renders when special-category is answered false and no category indicates it", () => {
  const out = assembleLiaSkeletonDocument({}, ukIntake({
    data_categories: ["Contact details"],
    balancing_details: { special_category_data: false },
  }));
  const text = skeletonDocumentToText(out.document);
  assert(!text.includes("Article 9(1)"), "the boundary must not fire on a clean record");
});

Deno.test("L2 — the purpose-test walk names each condition with its own reasoning", () => {
  const f = buildInterestLegitimacy(ukIntake({
    stated_purpose: "Road safety for the employed HGV fleet and lawful fleet management.",
    purpose_details: {
      interest_description: "Road safety for the employed HGV fleet, pursued on the company's own behalf.",
      benefit_description: "Fewer at-fault incidents and lower fuel costs.",
    },
  }));
  assertStringIncludes(f.application, "the first — ");
  assertStringIncludes(f.application, "the second — ");
  assertStringIncludes(f.application, "the third — ");
  assert(!/the first condition is [a-z]+, the second is/.test(f.application), "the bare met/met/met walk must be gone");
});
