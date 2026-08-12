// PHASE 0 PROMPT 2 (2026-08-11) — per-basis branching in buildLegalBasis.
// Extends tests/edge/so-final-test/dpia-legal-basis-builder.test.ts with one
// supported + one record_insufficient case per Art. 6(1)(a)–(e), plus the
// authority_verbatim mismatch guard (DEFECT 1).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildLegalBasis } from "../../run-dpia-framework/_local/ltp/dpia-deliverables/build.ts";

const LAWFULNESS_TEXT = "lawfully, fairly and in a transparent manner";

const BASE = {
  processing_activity_name: "Return-to-work review scheduling",
  purpose: "To schedule occupational-health return-to-work reviews for staff returning from long-term sick leave.",
  data_subjects: "Individuals whose details are held",
  jurisdictions: ["EU (GDPR)"],
  data_categories: ["Contact details"],
  existing_safeguards: ["Access controls"],
  necessity_proportionality: "The scheduling supports the review being delivered on time.",
  description: "Scheduling of occupational-health reviews.",
  nature_scope_context: "",
  codes_of_conduct: "",
  reasons_to_conduct: [],
  data_subject_rights_mechanisms: "",
};

function one(patch: Record<string, unknown>) {
  return buildLegalBasis({ ...BASE, ...patch })[0];
}

// ── 6(1)(a) consent ───────────────────────────────────────────────────
Deno.test("6(1)(a): consent capture and withdrawal described → analysed", () => {
  const f = one({
    legal_basis_proposed: "Consent (Art. 6(1)(a))",
    data_subject_rights_mechanisms: "Consent is collected at sign-up and can be withdrawn from the preference centre at any time.",
  });
  assertEquals(f.status, "analysed");
  assertEquals(f.verdict, "basis_supported_on_the_record");
  assert(f.justification.includes("how consent is obtained"));
});

Deno.test("6(1)(a): no consent mechanics on the record → record_insufficient", () => {
  const f = one({ legal_basis_proposed: "Consent (Art. 6(1)(a))" });
  assertEquals(f.status, "record_insufficient");
  assertEquals(f.verdict, "undetermined_on_the_record");
  assert(f.information_needed!.includes("withdrawal"));
});

// ── 6(1)(b) contract ──────────────────────────────────────────────────
Deno.test("6(1)(b): subjects are customers → analysed", () => {
  const f = one({
    legal_basis_proposed: "Contract (Art. 6(1)(b))",
    data_subjects: "Customers who hold an active subscription",
  });
  assertEquals(f.status, "analysed");
  assertEquals(f.verdict, "basis_supported_on_the_record");
});

Deno.test("6(1)(b): party status not resolvable → record_insufficient", () => {
  const f = one({
    legal_basis_proposed: "Contract (Art. 6(1)(b))",
    data_subjects: "Individuals whose details are held",
  });
  assertEquals(f.status, "record_insufficient");
  assert(f.information_needed!.includes("party to it"));
});

// ── 6(1)(c) legal obligation ──────────────────────────────────────────
Deno.test("6(1)(c): named instrument on the record → analysed", () => {
  const f = one({
    legal_basis_proposed: "Legal obligation (Art. 6(1)(c))",
    necessity_proportionality: "Retention is required by the Employment Rights Act 1996, section 12.",
  });
  assertEquals(f.status, "analysed");
  assert(f.justification.includes("names the instrument"));
});

Deno.test("6(1)(c): obligation described generally → record_insufficient with the ratified ask", () => {
  const f = one({
    legal_basis_proposed: "Legal obligation (Art. 6(1)(c))",
    necessity_proportionality: "We are legally required to keep these records.",
  });
  assertEquals(f.status, "record_insufficient");
  assertEquals(
    f.information_needed,
    "The specific Union or Member State law establishing the legal obligation relied on — named as an instrument, not described generally.",
  );
});

// ── 6(1)(d) vital interests ───────────────────────────────────────────
Deno.test("6(1)(d): health data present → analysed", () => {
  const f = one({
    legal_basis_proposed: "Vital interests (Art. 6(1)(d))",
    data_categories: ["Health or medical data"],
  });
  assertEquals(f.status, "analysed");
  assertEquals(f.verdict, "basis_supported_on_the_record");
});

Deno.test("6(1)(d): no health data and no life/safety language → undetermined", () => {
  const f = one({ legal_basis_proposed: "Vital interests (Art. 6(1)(d))" });
  assertEquals(f.verdict, "undetermined_on_the_record");
  assertEquals(f.status, "record_insufficient");
  assert(f.justification.includes("does not describe the vital-interest scenario"));
});

// ── 6(1)(e) public task ───────────────────────────────────────────────
Deno.test("6(1)(e): task footing named → analysed", () => {
  const f = one({
    legal_basis_proposed: "Public task (Art. 6(1)(e))",
    nature_scope_context: "The function is laid down in Regulation (EU) 2017/745, Article 10.",
  });
  assertEquals(f.status, "analysed");
});

Deno.test("6(1)(e): footing not named → record_insufficient", () => {
  const f = one({ legal_basis_proposed: "Public task (Art. 6(1)(e))" });
  assertEquals(f.status, "record_insufficient");
  assert(f.information_needed!.includes("public interest"));
});

// ── DEFECT 1 guard ────────────────────────────────────────────────────
Deno.test("authority_verbatim is never Art. 5(1)(a) text under an Art. 6(1) citation", () => {
  for (
    const basis of [
      "Consent (Art. 6(1)(a))",
      "Contract (Art. 6(1)(b))",
      "Legal obligation (Art. 6(1)(c))",
      "Vital interests (Art. 6(1)(d))",
      "Public task (Art. 6(1)(e))",
      "Legitimate interest (Art. 6(1)(f))",
    ]
  ) {
    const f = one({ legal_basis_proposed: basis });
    assert(f.citation.includes("Art. 6(1)"), `citation not a 6(1) sub-basis: ${f.citation}`);
    assert(
      !f.authority_verbatim.includes(LAWFULNESS_TEXT),
      `Art. 5(1)(a) text quoted under ${f.citation}`,
    );
  }
});

Deno.test("closing sentence is carried by every non-(f) branch", () => {
  for (
    const basis of [
      "Consent (Art. 6(1)(a))",
      "Contract (Art. 6(1)(b))",
      "Legal obligation (Art. 6(1)(c))",
      "Vital interests (Art. 6(1)(d))",
      "Public task (Art. 6(1)(e))",
    ]
  ) {
    const f = one({ legal_basis_proposed: basis });
    assert(f.justification.includes("does not substitute"));
  }
});

// ── PROMPT 8C (2026-08-12) — Art. 9 cross-reference on non-(f) bases ──
const ART9_XREF =
  " Because special categories of personal data are involved, this basis is read together with the Article 9(2) condition addressed in the special-categories table below.";

Deno.test("8C: non-(f) basis with an Art. 9 condition carries the cross-reference", () => {
  const [f] = buildLegalBasis({
    ...BASE,
    legal_basis_proposed: "Legal obligation (Art. 6(1)(c))",
    article_9_condition: "Health or social care (Art. 9(2)(h))",
  });
  assert(f.justification.endsWith(ART9_XREF), f.justification);
});

Deno.test("8C: no Art. 9 condition → no cross-reference; (f) branch never carries it", () => {
  const [plain] = buildLegalBasis({ ...BASE, legal_basis_proposed: "Legal obligation (Art. 6(1)(c))" });
  assert(!plain.justification.includes("special-categories table below"));
  const [lf] = buildLegalBasis({
    ...BASE,
    legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))",
    article_9_condition: "Health or social care (Art. 9(2)(h))",
  });
  assert(!lf.justification.includes("special-categories table below"));
});
