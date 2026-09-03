// WAVE C1 (2026-08-23, doc 56 / doc 62 §9 amendment / doc 63 §3) — S4
// (per-factor regulator commentary) and S5 (Persuasive Authority appendix)
// render-and-inspect (doc 44 §D1). Covers: the human-involvement gating
// fix (content must render even on an OUT_OF_SCOPE report, since a
// qualifying human_review answer is exactly what routes there), the
// advertising-exclusion content rendering independent of admt_in_scope,
// the S5 Deliveroo appendix + its Appendix B pointer, and the R2
// admission rule (dark FC-J rows never leak into the document).

import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { CPPA_ADMT_GOLDEN } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-admt.ts";
import { computeAdmtV2 } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import {
  assembleAdmtV2Document,
  deriveAdmtFiredStates,
} from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts";
import { ADMT_CORPUS_MAP } from "../../../supabase/functions/run-admt-checker-v2/_local/corpus/maps/admt-corpus-map.ts";

function fixture(id: string) {
  const f = CPPA_ADMT_GOLDEN.find((g) => g.id === id);
  if (!f) throw new Error(`fixture not found: ${id}`);
  return f.intake as Record<string, unknown>;
}

function renderText(intake: Record<string, unknown>): { body: string; sectionIds: string[] } {
  const c = computeAdmtV2(intake);
  const doc = assembleAdmtV2Document({
    intake, computed: c, exhibit: null,
    organizationName: String(intake.organization_name ?? ""),
    systemName: String(intake.system_name ?? ""),
  });
  const body = doc.sections.map((s) =>
    s.paragraphs.map((p) => p.text + (p.table ? " " + p.table.rows.flat().join(" ") : "")).join("\n")
  ).join("\n");
  return { body, sectionIds: doc.sections.map((s) => s.id) };
}

Deno.test("wave C1 — human-involvement S4 content renders on an OUT_OF_SCOPE report (the gating fix)", () => {
  const intake = fixture("admt-hr-perfect-record");
  const c = computeAdmtV2(intake);
  assertEquals(c.scope.scopeState, "OUT_OF_SCOPE", "sanity: this fixture's qualifying human_review routes OUT of scope");
  const fired = deriveAdmtFiredStates(c);
  assert(!fired.has("admt_in_scope"), "sanity: admt_in_scope must NOT be in the fired set for this fixture");
  assert(fired.has("human_involvement_addressed"));

  const { body, sectionIds } = renderText(intake);
  assert(sectionIds.includes("applicability"), "Section 2 must still render even for an OUT_OF_SCOPE report");
  assert(body.includes("Regulatory Interpretation — Human involvement"));
  assert(body.includes("substantially replace human decisionmaking"));
  assert(body.includes("human override capability"));
});

Deno.test("wave C1 — human-involvement S4 + the S5 Deliveroo appendix both render on an IN_SCOPE report", () => {
  const intake = fixture("admt-credit-significant-tuning");
  const c = computeAdmtV2(intake);
  assertEquals(c.scope.scopeState, "IN_SCOPE");
  const fired = deriveAdmtFiredStates(c);
  assert(fired.has("admt_in_scope"));
  assert(fired.has("human_involvement_addressed"));

  const { body, sectionIds } = renderText(intake);
  assert(body.includes("Regulatory Interpretation — Human involvement"));
  // CEO review 2026-08-23/24 reorder: Persuasive Authority is now
  // Appendix B (formerly C); the factor matrix is now Appendix A
  // (formerly B) — see admt-v2-assemble.ts's reorder comment.
  assert(sectionIds.includes("appendix_b"), "Appendix B (Persuasive Authority) must render when admt_in_scope fires");
  assert(body.includes("Garante"));
  assert(body.includes("Deliveroo Italy s.r.l."));
  assert(body.includes("decision of 22 July 2021"));
  assert(body.includes("persuasive only; decided under the GDPR, not the CCPA"));

  // Appendix A's Significant-decision row must carry the S5 pointer.
  const appendixA = body;
  assert(appendixA.includes("persuasive (Appendix B): analogous enforcement"));
  // Human involvement's row must carry the "see §2.1" pointer, not a
  // redundant restated tag (avoids the aggregate-budget clutter R2 exists
  // to prevent).
  // v3.2.2 — the body has no numbered §2.1; the pointer names the callout.
  assert(body.includes('see the "Regulatory Interpretation" discussion in Section 2, above'));
});

Deno.test("wave C1 — advertising-exclusion S4 content renders independent of admt_in_scope", () => {
  const intake: Record<string, unknown> = {
    organization_name: "Test Co",
    system_name: "AdOnly",
    decision_domains: [],
    human_review: "Not applicable / unsure",
    admt_detail: { solely_advertising: "Yes — solely advertising" },
  };
  const c = computeAdmtV2(intake);
  const fired = deriveAdmtFiredStates(c);
  assert(fired.has("advertising_exclusion_addressed"));
  assert(!fired.has("admt_in_scope"), "sanity: this intake must not resolve to IN_SCOPE");

  const { body } = renderText(intake);
  assert(body.includes("Regulatory Interpretation — Advertising exclusion"));
  assert(body.includes("explicitly exclude advertising to a consumer"));
});

Deno.test("wave C1 — no S4/S5 content on a report where neither factor was addressed", () => {
  const intake: Record<string, unknown> = {
    organization_name: "Test Co",
    system_name: "Blank",
    decision_domains: [],
    human_review: "",
  };
  const { body } = renderText(intake);
  assert(!body.includes("Regulatory Interpretation —"), "no-padding law: nothing fired, nothing renders");
  // Persuasive Authority is now Appendix B (formerly C) — see the reorder
  // comment in admt-v2-assemble.ts. Appendix A (factor matrix) and
  // Appendix C (fact record) always render, so only B is checked here.
  assert(!body.includes("Appendix B"));
});

Deno.test("wave C1 — none of the 35 dark FC-J bulk rows leak into any rendered document (R2 admission rule)", () => {
  // Two dark rows (human-involvement/01, advertising-exclusion/01) share a
  // source_row_id with an S4 row that DELIBERATELY renders the full text
  // those dark rows only pin the opening sentence of — the dark excerpt is
  // a substring of the rendered one BY DESIGN, not a leak. Excluded here.
  const renderEligibleSourceIds = new Set(
    ADMT_CORPUS_MAP.rows.filter((r) => r.render_eligible).map((r) => r.source_row_id),
  );
  const darkRows = ADMT_CORPUS_MAP.rows.filter(
    (r) => !r.render_eligible && !renderEligibleSourceIds.has(r.source_row_id),
  );
  assertEquals(darkRows.length, 33, "35 total dark rows minus the 2 whose source is also S4-rendered");
  const bodies = [
    renderText(fixture("admt-hr-perfect-record")).body,
    renderText(fixture("admt-credit-significant-tuning")).body,
    renderText(fixture("admt-service-eligibility-conservative")).body,
  ].join("\n");
  for (const row of darkRows) {
    assert(!bodies.includes(row.pinned_excerpt), `${row.id}: dark FC-J pinned_excerpt leaked into a rendered document`);
  }
});
