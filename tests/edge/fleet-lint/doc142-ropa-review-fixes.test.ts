// DOC 142 (2026-09-02) — RoPA reviewer batch: three items.
//
// Item 1 — the customer-facing appendix title "Intake answer register
// (verbatim responses, normalised labels)" was internal product language;
// renamed to "Company-Provided Processing Record" (assembler prose in
// generate-ropa-document/index.ts, NOT pinned spine text — no re-pin).
//
// Item 2 — Article 30(5) cross-surface contradiction: the note counted an
// activity whose special_category_basis answer LEADS with a disclaimer but
// carries an explanatory clause ("Not applicable — ICO Children's Code
// (DPA 2018 s.123) …") as special-category, while that activity's own
// record rendered "Special category basis: Not applicable — …". The
// negation-aware `specialCategoryBasisRecorded` in art305-note.ts is now
// the single normalizer of the per-activity state.
//
// Item 3 — generator coherence: buildCompany's legal-form suffix was chosen
// by `seed % 4` independently of the `seed % 6` countryCode (B.V. with GB),
// and the ropa legal_entity_type derivation re-derived the suffix a third
// way. The suffix is now keyed to countryCode and the ropa derivation
// consumes the same value. (The product-side legal-form/jurisdiction
// validation matrix is NOT built — flagged for CEO sign-off.)

import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildArt305Note,
  specialCategoryActivities,
  specialCategoryBasisRecorded,
} from "../../../supabase/functions/generate-ropa-document/register/art305-note.ts";

// ── Item 2 — 30(5)-vs-activity consistency ──────────────────────────────────

const EDTECH_ACTS = [
  { id: "a1", display_name: "Child User Account Management" },
  { id: "a2", display_name: "Learning Analytics" },
  { id: "a3", display_name: "Safeguarding Records" },
];

const EDTECH_ANSWERS = {
  a1: {
    special_category_basis:
      "Not applicable — ICO Children's Code (DPA 2018 s.123) age-appropriate design standards apply",
  },
  a2: { special_category_basis: "Not applicable" },
  a3: {
    special_category_basis:
      "Article 9(2)(g) — substantial public interest (child protection)",
  },
};

Deno.test("doc142 — 30(5) note counts only activities whose record affirms a special-category basis (negation-with-explanation is negative)", () => {
  const hits = specialCategoryActivities(EDTECH_ACTS, EDTECH_ANSWERS);
  assert(hits.length === 1, `expected 1 special-category activity, got ${hits.length}: ${hits.join(", ")}`);
  assert(hits[0] === "Safeguarding Records");
  const note = buildArt305Note(EDTECH_ACTS, EDTECH_ANSWERS);
  assert(!note.body.includes("Child User Account Management"), "note must not contradict the activity's own 'Not applicable — …' row");
  assert(note.body.includes("Safeguarding Records"));
  assert(note.body.includes("the activity"), "single-activity phrasing expected");
});

Deno.test("doc142 — the single normalizer is negation-aware in both directions", () => {
  // Negative: leading disclaimers, with or without explanatory clauses.
  for (const v of [
    null, undefined, "", "—", "-", "–",
    "Not applicable",
    "Not applicable — ICO Children's Code (DPA 2018 s.123) age-appropriate design standards apply",
    "n/a", "N/A — no Article 9 data", "None", "None recorded", "No.",
    "No special category data is processed", "Not required", "Not recorded",
  ]) {
    assert(!specialCategoryBasisRecorded(v), `expected negative for ${JSON.stringify(v)}`);
  }
  // Positive: affirmed bases, including ones merely MENTIONING negative words.
  for (const v of [
    "Article 9(2)(g) — substantial public interest (child protection)",
    "Art. 9(2)(b) employment law",
    "Article 9(2)(h) — medical diagnosis and treatment; consent not applicable",
  ]) {
    assert(specialCategoryBasisRecorded(v), `expected positive for ${JSON.stringify(v)}`);
  }
});

// ── Item 1 — appendix title rename (assembler source lint) ─────────────────

const ROPA_INDEX_SRC = Deno.readTextFileSync(
  new URL("../../../supabase/functions/generate-ropa-document/index.ts", import.meta.url),
);

Deno.test("doc142 — the intake-echo appendix carries the customer-facing title, not internal product language", () => {
  assert(!ROPA_INDEX_SRC.includes("Intake answer register"), "internal title must not reach customers");
  assert(!ROPA_INDEX_SRC.includes("normalised labels"), "internal parenthetical must not reach customers");
  assert(ROPA_INDEX_SRC.includes("<h2>3. Company-Provided Processing Record</h2>"), "renamed appendix title missing");
});

// ── Item 3 — generator legal-form/country coherence (source lint) ──────────

const FIXTURES_SRC = Deno.readTextFileSync(
  new URL("../../../supabase/functions/generate-stress-fixtures/index.ts", import.meta.url),
);

Deno.test("doc142 — buildCompany's EU legal-form suffix is keyed to countryCode, not an independent seed", () => {
  assert(FIXTURES_SRC.includes("EU_COUNTRY_LEGAL_SUFFIX"), "country-keyed suffix map missing");
  assert(/GB:\s*"Ltd"/.test(FIXTURES_SRC) && /NL:\s*"B\.V\."/.test(FIXTURES_SRC) && /DE:\s*"GmbH"/.test(FIXTURES_SRC), "map must pair each form with its own country");
  assert(
    !FIXTURES_SRC.includes(`["SE", "GmbH", "B.V.", "Ltd"][seed % 4]`),
    "seed-indexed EU suffix selection must not return",
  );
  assert(
    !FIXTURES_SRC.includes(`["SE", "GmbH", "B.V.", "Ltd"][fixtureSeed(companyId) % 4]`),
    "ropa legal_entity_type must not re-derive the suffix independently",
  );
  assert(FIXTURES_SRC.includes("c.legalSuffix"), "ropa legal_entity_type must consume buildCompany's own suffix");
});

Deno.test("doc142 — the Call A prompt requires the legal form to match the incorporation country", () => {
  assert(
    FIXTURES_SRC.includes("legal-form suffix must match the incorporation country"),
    "Call A coherence sentence missing",
  );
});
