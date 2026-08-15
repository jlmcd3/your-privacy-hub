// PROMPT 9H (CEO-ruled 2026-08-15) — per-operation legal basis, retention
// ledgering under storage limitation, and Table-of-Authorities grammar.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildLegalBasis,
  buildSection2Coverage,
  buildProcessingInventory,
} from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import {
  isWellFormedGdprPinpoint,
  toaRegimeForm,
} from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { violatesPerfectCarveOut } from "../../../supabase/functions/_shared/quality/perfect-closed-loop.ts";

const BASE = {
  processing_activity_name: "Return-to-work review scheduling",
  purpose: "To schedule occupational-health return-to-work reviews for staff returning from long-term sick leave.",
  data_subjects: "Employees returning from long-term sick leave",
  jurisdictions: ["EU (GDPR)"],
  data_categories: ["Contact details"],
  existing_safeguards: ["Access controls", "Staff training"],
  retention_period: "Seven years from the date of the review",
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

// ── item 1 — per-operation basis reader ─────────────────────────────────────

Deno.test("9H 1 — secondary operation resolves its own basis from its own text", () => {
  const findings = buildLegalBasis({
    ...BASE,
    legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))",
    secondary_uses:
      "Aggregated attendance statistics are shared with the works council on the basis of consent (Art. 6(1)(a)) obtained from each employee.",
  });
  assertEquals(findings.length, 2);
  assert(findings[0].article_6_basis.includes("6(1)(f)"), findings[0].article_6_basis);
  assert(findings[1].article_6_basis.includes("6(1)(a)"), findings[1].article_6_basis);
  assertEquals(findings[1].legitimate_interests_test, undefined);
});

Deno.test("9H 1 — secondary text naming no basis falls back to the record-level basis", () => {
  const findings = buildLegalBasis({
    ...BASE,
    legal_basis_proposed: "Contract (Art. 6(1)(b))",
    secondary_uses: "Aggregated attendance statistics are shared with the works council each quarter.",
  });
  assertEquals(findings.length, 2);
  assertEquals(findings[1].article_6_basis, "Contract (Art. 6(1)(b))");
});

Deno.test("9H 1 (harness) — 6(1)(f) in secondary_uses plus special category is carved out", () => {
  assert(violatesPerfectCarveOut({
    legal_basis_proposed: "Consent (Art. 6(1)(a))",
    secondary_uses: "Retained for trend analysis on the basis of legitimate interests.",
    data_categories: ["Health or medical data"],
  }));
  assertEquals(
    violatesPerfectCarveOut({
      legal_basis_proposed: "Consent (Art. 6(1)(a))",
      secondary_uses: "Retained for trend analysis on the basis of legitimate interests.",
      data_categories: ["Contact details"],
    }),
    false,
  );
});

// ── item 2 — retention ledgered under Art. 5(1)(e) ──────────────────────────

Deno.test("9H 2 — retention row cites storage limitation as well as minimisation", () => {
  const inv = buildProcessingInventory(BASE);
  const cov = buildSection2Coverage(BASE, { processing_inventory: inv });
  assert(cov.data_minimisation_retention.length > 0);
  for (const r of cov.data_minimisation_retention) {
    assert(r.citation.includes("Art. 5(1)(c)"), r.citation);
    assert(r.citation.includes("Art. 5(1)(e)"), r.citation);
    assert(r.authority_verbatim.includes("no longer than is necessary"), r.authority_verbatim);
  }
});

Deno.test("9H 2 — UK record carries the UK prefix on both retention pinpoints", () => {
  const uk = { ...BASE, jurisdictions: ["United Kingdom (UK GDPR)"] };
  const cov = buildSection2Coverage(uk, { processing_inventory: buildProcessingInventory(uk) });
  const c = cov.data_minimisation_retention[0].citation;
  assert(c.includes("UK GDPR Art. 5(1)(e)"), c);
  assert(!/(^|[^K] )GDPR Art\. 5\(1\)\(e\)/.test(c), c);
});

// ── item 3 — ToA grammar and regime prefix ──────────────────────────────────

Deno.test("9H 3 — malformed pinpoints are rejected, real ones accepted", () => {
  assertEquals(isWellFormedGdprPinpoint("UK GDPR Art. 6(11)"), false);
  assertEquals(isWellFormedGdprPinpoint("GDPR Art. 5(3)"), false);
  assert(isWellFormedGdprPinpoint("UK GDPR Art. 6(1)(f)"));
  assert(isWellFormedGdprPinpoint("GDPR Art. 35(7)(b)"));
  assert(isWellFormedGdprPinpoint("GDPR Art. 5(1)(e)"));
  assert(isWellFormedGdprPinpoint("EDPB Guidelines 4/2019"));
});

Deno.test("9H 3 — every ToA entry folds onto the record's regime prefix", () => {
  assertEquals(toaRegimeForm("UK", "GDPR Art. 35(7)"), "UK GDPR Art. 35(7)");
  assertEquals(toaRegimeForm("UK", "UK GDPR Art. 35(7)"), "UK GDPR Art. 35(7)");
  assertEquals(toaRegimeForm("EU", "UK GDPR Art. 35(7)"), "GDPR Art. 35(7)");
  assertEquals(
    toaRegimeForm("UK", "Regulation (EU) 2016/679 (General Data Protection Regulation) art. 13"),
    "UK GDPR Art. 13",
  );
  assertEquals(toaRegimeForm("EU", "EDPB Guidelines 4/2019"), "EDPB Guidelines 4/2019");
});
