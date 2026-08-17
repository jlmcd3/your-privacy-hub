// PILOT 2026-08-11 — deterministic Art. 6(1) legal-basis builder.
// Same law as ITEM 310: composed from the record, honest degradation,
// registry-verbatim authority, never invented.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildLegalBasis,
  attachDpiaDeliverables,
} from "../../../supabase/functions/run-dpia-framework/_local/ltp/dpia-deliverables/build.ts";

const BASE = {
  processing_activity_name: "Return-to-work review scheduling",
  purpose: "To schedule occupational-health return-to-work reviews for staff returning from long-term sick leave.",
  data_subjects: "Employees returning from long-term sick leave",
  jurisdictions: ["EU (GDPR)"],
  data_categories: ["Contact details"],
  existing_safeguards: ["Access controls", "Staff training"],
  necessity_proportionality:
    "The scheduling has an impact on the data subjects because it affects the employees concerned and touches their reasonable expectations at work.",
  alternatives_considered: [
    {
      processing_operation: "primary",
      alternative: "Manual scheduling from paper certificates",
      rejection_reason: "Cannot deliver the review within the statutory window at the recorded volume.",
    },
  ],
};

Deno.test("6(1)(f): all three parts supported → analysed, LI verbatim cited", () => {
  const [f] = buildLegalBasis({ ...BASE, legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))" });
  assertEquals(f.status, "analysed");
  assertEquals(f.verdict, "basis_supported_on_the_record");
  assert(f.legitimate_interests_test?.purpose_test_met);
  assert(f.legitimate_interests_test?.necessity_test_met);
  assert(f.legitimate_interests_test?.balancing_test_met);
  assert(f.authority_verbatim.includes("legitimate interests pursued by the controller"));
  assert(f.justification.includes(BASE.purpose));
  assertEquals(f.information_needed, undefined);
});

Deno.test("6(1)(f): no alternatives → necessity part unmet, specific ask, nothing invented", () => {
  const [f] = buildLegalBasis({
    ...BASE,
    alternatives_considered: [],
    legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))",
  });
  assertEquals(f.status, "record_insufficient");
  assertEquals(f.verdict, "undetermined_on_the_record");
  assertEquals(f.legitimate_interests_test?.necessity_test_met, false);
  assert(f.information_needed!.includes("less intrusive means"));
});

Deno.test("6(1)(f): no impact described → balancing part unmet", () => {
  const [f] = buildLegalBasis({
    ...BASE,
    necessity_proportionality: "The scheduling enables the review to happen on time.",
    data_minimisation_justification: "",
    legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))",
  });
  assertEquals(f.legitimate_interests_test?.balancing_test_met, false);
  assert(f.legitimate_interests_test?.balancing_test_why.includes("does not describe the impact"));
  assertEquals(f.status, "record_insufficient");
});

// PROMPT 9M items 2+3 SUPERSEDE the categorical bar: the balance is scoped to
// the non-special-category items and the Art. 9 items are carved out by ruling.
Deno.test("9M: special-category data is carved out, not a categorical balancing bar", () => {
  const [f] = buildLegalBasis({
    ...BASE,
    data_categories: ["Health or medical data"],
    legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))",
  });
  assertEquals(f.legitimate_interests_test?.balancing_test_met, true);
  assertEquals(f.art9_special, true);
  assert(f.justification.includes("Legitimate interests cannot serve as the lawful basis for processing special-category data."));
  assert(f.information_needed!.includes("Isolate the special-category items"));
});

Deno.test("non-6(1)(f) basis is recorded against the purpose, no LI test", () => {
  const [f] = buildLegalBasis({ ...BASE, legal_basis_proposed: "Contract (Art. 6(1)(b))" });
  assertEquals(f.article_6_basis, "Contract (Art. 6(1)(b))");
  assertEquals(f.legitimate_interests_test, undefined);
  assertEquals(f.status, "analysed");
});

Deno.test("no basis recorded → record_insufficient, never guessed", () => {
  const [f] = buildLegalBasis({ ...BASE, legal_basis_proposed: "" });
  assertEquals(f.status, "record_insufficient");
  assertEquals(f.verdict, "undetermined_on_the_record");
  assert(f.information_needed!.includes("Art. 6(1) basis"));
});

Deno.test("no purpose recorded → basis cannot be tested", () => {
  const [f] = buildLegalBasis({
    ...BASE,
    purpose: "",
    legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))",
  });
  assertEquals(f.status, "record_insufficient");
  assert(f.information_needed!.includes("specific purpose"));
});

Deno.test("attach: legal_basis becomes the single-writer surface and supersedes the model blob", () => {
  const report: Record<string, unknown> = {
    section_2_analysis: {
      legal_basis: [{ purpose: "model prose", article_6_basis: "Art. 6(1)(f)", justification: "model prose" }],
    },
  };
  const meta = attachDpiaDeliverables(report, {
    ...BASE,
    legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))",
  }) as Record<string, unknown>;
  assertEquals(meta.ok, true);
  assertEquals(meta.legal_basis, 1);
  const surface = report.legal_basis as Array<Record<string, unknown>>;
  assertEquals(surface.length, 1);
  const blob = (report.section_2_analysis as Record<string, unknown>).legal_basis as Array<Record<string, unknown>>;
  assertEquals(blob[0].justification, surface[0].justification);
  assert(!String(blob[0].justification).includes("model prose"));
});
