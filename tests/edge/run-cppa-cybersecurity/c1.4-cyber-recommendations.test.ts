// C1.4 (doc 67 §2.1, 2026-08-25) — the recommendation-library SHAPE.
// Library completeness, gap-class resolution against real coverage/
// evidence output, deterministic priority/rank, next-steps cap, and the
// PN-C3 "nothing is ratified yet" guard.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildComponentCoverage,
  buildEvidenceSufficiency,
  readCyberFacts,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";
import {
  buildCyberComponentRecommendations,
  buildCyberNextSteps,
  CYBER_RECOMMENDATION_LIBRARY,
  GAP_CLASSES,
  keyToString,
  lookupRecommendation,
  priorityForGapClass,
  resolveGapClass,
  resolveVariant,
  type GapClass,
  type RecommendationVariant,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-recommendations.ts";
import { CPPA_CYBER_GOLDEN } from "../../../supabase/functions/_shared/golden/cppa-cyber.ts";
import type { CyberComponentCoverage, EvidenceSufficiency } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/types.ts";

// ── Library completeness ─────────────────────────────────────────────

Deno.test("CYBER_RECOMMENDATION_LIBRARY — exhaustive: every gap class has its applicable variant(s), no more, no fewer", () => {
  const expected = new Set<string>();
  for (const gc of GAP_CLASSES) {
    if (gc === "no_gap") expected.add(keyToString({ gapClass: gc, variant: "none" }));
    else {
      expected.add(keyToString({ gapClass: gc, variant: "fact_anchored" }));
      expected.add(keyToString({ gapClass: gc, variant: "fact_absent" }));
    }
  }
  const actual = new Set(CYBER_RECOMMENDATION_LIBRARY.map((s) => keyToString(s.key)));
  assertEquals(actual, expected);
  assertEquals(CYBER_RECOMMENDATION_LIBRARY.length, 11); // 5 classes x 2 variants + 1 no_gap
});

// C2 (2026-08-26) — deliberate re-point of the PN-C3 gate pin: the designed
// hand-edit happened (CEO batch ruling + build directive; the v1.1 spine),
// so the invariant INVERTS — every slot must now be ratified and no
// customer-reaching template may carry the internal DRAFT tripwire token.
Deno.test("CYBER_RECOMMENDATION_LIBRARY — every slot is RATIFIED and DRAFT-free (C2)", () => {
  for (const slot of CYBER_RECOMMENDATION_LIBRARY) {
    assertEquals(slot.ratified, true, keyToString(slot.key));
    assert(!slot.template.includes("DRAFT"), `${keyToString(slot.key)} template still carries the DRAFT tripwire`);
    assert(slot.template.trim().length > 0, `${keyToString(slot.key)} template is empty`);
  }
});

Deno.test("lookupRecommendation — throws on a key the library doesn't carry (completeness guard, not a runtime data condition)", () => {
  let threw = false;
  try {
    lookupRecommendation({ gapClass: "no_gap" as GapClass, variant: "fact_anchored" as RecommendationVariant });
  } catch {
    threw = true;
  }
  assert(threw, "expected lookupRecommendation to throw for a key never populated in the library");
});

// ── Gap-class resolution truth table (synthetic Finding/coverage rows) ──

function coverageRow(over: Partial<CyberComponentCoverage>): CyberComponentCoverage {
  return {
    key: "component_x", label: "X", citation: "§ 7123(c)(1)", standard: "", record_fact: "", application: "",
    verdict: "satisfied", status: "analysed", component_number: 1, slug: "cX", maturity: "Implemented across organization",
    in_scope: true, remediation: "",
    ...over,
  };
}
function evidenceRow(over: Partial<EvidenceSufficiency>): EvidenceSufficiency {
  return {
    key: "evidence_x", label: "X", citation: "", standard: "", record_fact: "", application: "",
    verdict: "satisfied", status: "analysed", component_number: 1, slug: "cX",
    evidence_offered: [], testable_artifacts: [], assessable_on_record: true, sufficiency: "sufficient",
    ...over,
  };
}

Deno.test("resolveGapClass — no controls[] entry at all", () => {
  const c = coverageRow({ status: "record_insufficient", maturity: "", verdict: "record_insufficient" });
  assertEquals(resolveGapClass(c, undefined), "no_record");
});
Deno.test("resolveGapClass — entry exists, maturity blank", () => {
  const c = coverageRow({ status: "record_insufficient", maturity: "some maturity value survived onto record_fact", verdict: "record_insufficient" });
  assertEquals(resolveGapClass(c, undefined), "no_maturity_stated");
});
Deno.test("resolveGapClass — not_satisfied verdict", () => {
  const c = coverageRow({ verdict: "not_satisfied", status: "analysed" });
  assertEquals(resolveGapClass(c, undefined), "not_implemented");
});
Deno.test("resolveGapClass — partially_satisfied verdict", () => {
  const c = coverageRow({ verdict: "partially_satisfied", status: "analysed" });
  assertEquals(resolveGapClass(c, undefined), "partially_implemented");
});
Deno.test("resolveGapClass — satisfied but evidence insufficient", () => {
  const c = coverageRow({ verdict: "satisfied", status: "analysed" });
  const e = evidenceRow({ sufficiency: "insufficient" });
  assertEquals(resolveGapClass(c, e), "evidence_insufficient");
});
Deno.test("resolveGapClass — satisfied but evidence unknown", () => {
  const c = coverageRow({ verdict: "satisfied", status: "analysed" });
  const e = evidenceRow({ sufficiency: "unknown" });
  assertEquals(resolveGapClass(c, e), "evidence_insufficient");
});
Deno.test("resolveGapClass — satisfied, evidence sufficient -> no_gap", () => {
  const c = coverageRow({ verdict: "satisfied", status: "analysed" });
  const e = evidenceRow({ sufficiency: "sufficient" });
  assertEquals(resolveGapClass(c, e), "no_gap");
});
Deno.test("resolveGapClass — satisfied, evidence 'partial' folds to no_gap (matches Op. C's own precedent: partial contributes to the aggregate caveat, never a distinct per-component blocking reason)", () => {
  const c = coverageRow({ verdict: "satisfied", status: "analysed" });
  const e = evidenceRow({ sufficiency: "partial" });
  assertEquals(resolveGapClass(c, e), "no_gap");
});
Deno.test("resolveGapClass — satisfied, no evidence_sufficiency entry supplied at all -> no_gap (never guesses a gap from absence of the cross-reference)", () => {
  const c = coverageRow({ verdict: "satisfied", status: "analysed" });
  assertEquals(resolveGapClass(c, undefined), "no_gap");
});

Deno.test("resolveVariant — fact_anchored iff record_fact or application is non-empty; no_gap is always 'none'", () => {
  assertEquals(resolveVariant("no_gap", coverageRow({})), "none");
  assertEquals(resolveVariant("not_implemented", coverageRow({ record_fact: "", application: "" })), "fact_absent");
  assertEquals(resolveVariant("not_implemented", coverageRow({ record_fact: "The record states X.", application: "" })), "fact_anchored");
  assertEquals(resolveVariant("not_implemented", coverageRow({ record_fact: "", application: "Y requires Z." })), "fact_anchored");
});

// ── Priority determinism ─────────────────────────────────────────────

Deno.test("priorityForGapClass — every gap class maps to exactly one fixed tier, deterministic (not model-guessed)", () => {
  const seen = new Map<GapClass, string>();
  for (const gc of GAP_CLASSES) {
    const p1 = priorityForGapClass(gc);
    const p2 = priorityForGapClass(gc);
    assertEquals(p1, p2, `${gc} priority is non-deterministic`);
    seen.set(gc, p1);
  }
  assertEquals(seen.get("no_record"), "Immediate");
  assertEquals(seen.get("not_implemented"), "Immediate");
  assertEquals(seen.get("evidence_insufficient"), "Within 90 days");
  assertEquals(seen.get("partially_implemented"), "Within 6 months");
  assertEquals(seen.get("no_gap"), "Monitor");
});

// ── End-to-end against real component_coverage/evidence_sufficiency ────

function buildFor(id: string) {
  const g = CPPA_CYBER_GOLDEN.find((x) => x.id === id)!;
  const facts = readCyberFacts(g.intake as Record<string, unknown>);
  return { coverage: buildComponentCoverage(facts), evidence: buildEvidenceSufficiency(facts) };
}

Deno.test("buildCyberComponentRecommendations — a perfect, fully-evidenced record yields zero recommendations", () => {
  const { coverage, evidence } = buildFor("cyber-perfect-record");
  const recs = buildCyberComponentRecommendations(coverage, evidence);
  assertEquals(recs, []);
});

Deno.test("buildCyberComponentRecommendations — an empty intake yields 18 recommendations, all no_record, ranks 1..18 unique", () => {
  const facts = readCyberFacts({ profile: {}, controls: [] });
  const coverage = buildComponentCoverage(facts);
  const evidence = buildEvidenceSufficiency(facts);
  const recs = buildCyberComponentRecommendations(coverage, evidence);
  assertEquals(recs.length, 18);
  assert(recs.every((r) => r.key.gapClass === "no_record"));
  assertEquals(new Set(recs.map((r) => r.rank)), new Set(Array.from({ length: 18 }, (_, i) => i + 1)));
  assertEquals(recs.map((r) => r.rank), [...recs.map((r) => r.rank)].sort((a, b) => a - b), "ranks not in ascending order");
});

Deno.test("buildCyberComponentRecommendations — rank order is priority tier first, component_number second; stable across re-runs on an unchanged record", () => {
  const { coverage, evidence } = buildFor("cyber-nist-mid-tuning");
  const recsA = buildCyberComponentRecommendations(coverage, evidence);
  const recsB = buildCyberComponentRecommendations(coverage, evidence);
  assertEquals(recsA, recsB, "recommendations are not deterministic across re-runs on the same input");
  for (let i = 1; i < recsA.length; i++) {
    const prevWeight = { "Immediate": 0, "Within 90 days": 1, "Within 6 months": 2, "Monitor": 3 }[recsA[i - 1].priority];
    const curWeight = { "Immediate": 0, "Within 90 days": 1, "Within 6 months": 2, "Monitor": 3 }[recsA[i].priority];
    assert(
      prevWeight < curWeight || (prevWeight === curWeight && recsA[i - 1].component_number < recsA[i].component_number),
      `rank order violated at index ${i}`,
    );
  }
});

Deno.test("buildCyberComponentRecommendations — every returned recommendation resolves via lookupRecommendation without throwing", () => {
  for (const id of ["cyber-nist-mid-tuning", "cyber-iso-strong-tuning", "cyber-sibling-notes-adversarial"]) {
    const { coverage, evidence } = buildFor(id);
    const recs = buildCyberComponentRecommendations(coverage, evidence);
    for (const r of recs) {
      const slot = lookupRecommendation(r.key);
      assertEquals(slot, r.slot);
    }
  }
});

Deno.test("buildCyberComponentRecommendations — corpus_commentary is threaded through when supplied, empty array when not", () => {
  const { coverage, evidence } = buildFor("cyber-nist-mid-tuning");
  const withoutCorpus = buildCyberComponentRecommendations(coverage, evidence);
  for (const r of withoutCorpus) assertEquals(r.corpus_commentary, []);

  const fakeCorpus = [{ slug: coverage[0].slug, citation: coverage[0].citation, commentary: ["a fixed S4 sentence"] }];
  const withCorpus = buildCyberComponentRecommendations(coverage, evidence, fakeCorpus);
  const matched = withCorpus.find((r) => r.slug === coverage[0].slug);
  if (matched) assertEquals(matched.corpus_commentary, ["a fixed S4 sentence"]);
});

// ── Next-steps digest ────────────────────────────────────────────────

Deno.test("buildCyberNextSteps — capped at 3, each carries owner and a trigger, ratified DRAFT-free text (C2 re-point)", () => {
  const facts = readCyberFacts({ profile: {}, controls: [] });
  const coverage = buildComponentCoverage(facts);
  const evidence = buildEvidenceSufficiency(facts);
  const recs = buildCyberComponentRecommendations(coverage, evidence); // 18 gaps available
  const steps = buildCyberNextSteps(recs, "VP Security");
  assertEquals(steps.length, 3);
  for (const st of steps) {
    assertEquals(st.owner, "VP Security");
    assert(st.trigger.length > 0);
    assert(!st.text.includes("DRAFT"), st.text);
    assert(st.text.trim().length > 0);
    assertEquals(st.ratified, true);
  }
  // Takes the top 3 by rank, in rank order.
  assertEquals(steps.map((s) => s.slug), recs.slice(0, 3).map((r) => r.slug));
});

Deno.test("buildCyberNextSteps — blank owner falls back to a named-in-intake placeholder, never a bare empty string", () => {
  const facts = readCyberFacts({ profile: {}, controls: [] });
  const coverage = buildComponentCoverage(facts);
  const evidence = buildEvidenceSufficiency(facts);
  const recs = buildCyberComponentRecommendations(coverage, evidence);
  const steps = buildCyberNextSteps(recs, "");
  assertEquals(steps[0].owner, "the accountable owner named in the assessment record");
});

Deno.test("buildCyberNextSteps — fewer than 3 gaps yields fewer than 3 steps, never padded", () => {
  const { coverage, evidence } = buildFor("cyber-nist-mid-tuning"); // 2 gaps per the earlier probe
  const recs = buildCyberComponentRecommendations(coverage, evidence);
  const steps = buildCyberNextSteps(recs, "Owner");
  assertEquals(steps.length, recs.length);
  assert(steps.length < 3, "expected this fixture to have fewer than 3 gaps");
});
