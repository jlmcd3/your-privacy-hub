// DOC 252 §10 item 1 (CEO-ruled 2026-09-11) — "highly relevant" means the
// same use case. LIA Section VI ranks with `topTierRequiresClassMatch`, so a
// row that reaches a score of 6+ through shared elements, relationship,
// categories and flags but no use-case-class match caps at "relevant"
// (batch 916c33a8: Cámara on a fraud-screening record). Callers that do not
// opt in (Risk's persuasive hook) keep the doc 189 score-only tiers.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { rankByRelevance, type RelevanceQuery } from "../../../supabase/functions/_shared/corpus/cam-relevance.ts";
import type { CamRelevanceProfile, CamRow } from "../../../supabase/functions/_shared/corpus/cam-types.ts";
import { liaElementOf } from "../../../supabase/functions/run-li-assessment/_local/corpus/maps/lia-relevance-profiles.ts";

const PROFILE: CamRelevanceProfile = {
  instrument: "EU GDPR",
  use_case_class: "data_exposure",
  factor_ids: ["Reasonable expectations of the data subject", "Necessity and less-intrusive means", "Potential harms and severity"],
  relationship: "prospect",
  data_categories: ["Contact details", "Customer records"],
  flags: ["large_scale"],
} as unknown as CamRelevanceProfile;

const row = (id: string): CamRow => ({
  id, factor_id: "Reasonable expectations of the data subject", role: "AP", source_table: "enforcement_actions", source_row_id: `src-${id}`,
  excerpt_field: "key_compliance_failure", pinned_excerpt: "", render_eligible: true,
  render_surface: "S5", purpose_class: "authority", render_when: ["assessment_rendered"],
  display: { matter: `M ${id}`, what_happened: "W.", bearing: "B.", authority_label: `L ${id}`, trail_cite: "T" },
  citation_source: { regulator: "R", subject: "S", jurisdiction: "Spain", decision_date: "2025-01-01" },
  direction: "supports", logic_bearing: false,
  provenance: { verified_on: "2026-09-11" }, curation_note: "test",
} as unknown as CamRow);

// No class match: two live elements (4) + relationship (1) + two categories (2) + flag (1) = 8.
const QUERY_NO_CLASS: RelevanceQuery = {
  instrument: "EU GDPR",
  use_case_class: "fraud_prevention",
  live_factor_ids: new Set(["Reasonable expectations of the data subject", "Necessity and less-intrusive means"]),
  passing_factor_ids: new Set(),
  relationship: "prospect",
  data_categories: new Set(["Contact details", "Customer records"]),
  flags: new Set(["large_scale"]),
};

Deno.test("doc252 item 1 — with the LIA option, a score of 8 without a use-case match caps at 'relevant'", () => {
  const [sr] = rankByRelevance([row("a")], QUERY_NO_CLASS, { profileOf: () => PROFILE, elementOf: liaElementOf, topTierRequiresClassMatch: true });
  assertEquals(sr.score, 8);
  assertEquals(sr.match.class_matched, false);
  assertEquals(sr.tier, "relevant");
});

Deno.test("doc252 item 1 — the same row with a use-case match is 'highly relevant'; without the option the doc 189 tiers are unchanged", () => {
  const [matched] = rankByRelevance([row("a")], { ...QUERY_NO_CLASS, use_case_class: "data_exposure" }, { profileOf: () => PROFILE, elementOf: liaElementOf, topTierRequiresClassMatch: true });
  assertEquals(matched.score, 11);
  assertEquals(matched.tier, "highly relevant");
  const [legacy] = rankByRelevance([row("a")], QUERY_NO_CLASS, { profileOf: () => PROFILE, elementOf: liaElementOf });
  assertEquals(legacy.tier, "highly relevant");
});

Deno.test("doc252 item 1 — the cap never touches the lower tiers or the ranking order", () => {
  const weak: CamRelevanceProfile = { ...PROFILE, factor_ids: ["Potential harms and severity"], data_categories: [], flags: [] } as unknown as CamRelevanceProfile;
  const ranked = rankByRelevance([row("strong"), row("weak")], QUERY_NO_CLASS, {
    profileOf: (r) => (r.id === "weak" ? weak : PROFILE),
    elementOf: liaElementOf,
    topTierRequiresClassMatch: true,
  });
  assertEquals(ranked.map((r) => r.row.id), ["strong", "weak"]);
  assert(ranked[1].score < 6);
  assertEquals(ranked[1].tier, ranked[1].score >= 3 ? "relevant" : "context");
});
