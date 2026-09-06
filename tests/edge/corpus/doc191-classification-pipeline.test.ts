// DOC 191 §6 — the classification pipeline.
//
// Stages 0 and 1, the quote verifier and the §6.3 stratified draw are pure
// and are tested directly. Stages 2 and 3 are tested against a STUBBED model:
// no live API call is ever part of the automated suite, and what is actually
// being pinned there is the verification-and-fallback logic, which is where
// the safety lives (§6.1) — not the model's judgment.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { stage0Prior } from "../../../supabase/functions/generate-corpus-relevance-profiles/_local/classify/stage0-prior.ts";
import { stage1ExceptionMine } from "../../../supabase/functions/generate-corpus-relevance-profiles/_local/classify/stage1-exception.ts";
import {
  MIN_QUOTE_CHARS,
  normaliseForQuoteCheck,
  verifyQuote,
} from "../../../supabase/functions/generate-corpus-relevance-profiles/_local/classify/quote-verify.ts";
import {
  parseStage2Json,
  stage2Extract,
  STAGE2_SYSTEM_ARGUE_PATTERN,
  STAGE2_SYSTEM_FIND_RULE,
} from "../../../supabase/functions/generate-corpus-relevance-profiles/_local/classify/stage2-extraction.ts";
import { stage3SelfConsistency } from "../../../supabase/functions/generate-corpus-relevance-profiles/_local/classify/stage3-consistency.ts";
import {
  CHECKPOINT_SAMPLE_SIZE,
  drawStratifiedSample,
  ruleOfThreeUpperBound,
  sampleWeight,
} from "../../../supabase/functions/generate-corpus-relevance-profiles/_local/classify/sampling.ts";
import { runClassificationPipeline } from "../../../supabase/functions/generate-corpus-relevance-profiles/_local/classify/pipeline.ts";
import type {
  ClassificationCandidate,
  LlmCall,
} from "../../../supabase/functions/generate-corpus-relevance-profiles/_local/classify/types.ts";

// The real Europa Press row (doc 196 §2) — the pipeline's own worked example.
const EUROPA_PRESS: ClassificationCandidate = {
  id: "lia/f11-eprivacy/ap-w5-05",
  product: "lia",
  source_table: "enforcement_actions",
  source_row_id: "d47222c4-c7db-4564-9074-831a5753ee52",
  role: "AP",
  pinned_excerpt:
    "The company processed highly sensitive personal data without a legitimate basis, specifically by publishing an audio recording of a rape victim's testimony.",
  curation_note:
    "AEPD (Spain), EUROPA PRESS DE CATALUNYA, S.A., 26 September 2023, EUR 30,000. Bearing (this factor): Article 9 special-category data cannot be reached by Article 6(1)(f) at all - the special-category gate is anterior to the balancing test.",
};

// A plain enforcement outcome: named party, a fine, no categorical language.
const PLAIN_AP: ClassificationCandidate = {
  id: "lia/f07-harms/ap-w5-08",
  product: "lia",
  source_table: "enforcement_actions",
  source_row_id: "64ee4d90-9ead-4155-b379-868932d05c5f",
  role: "AP",
  pinned_excerpt: "Their personal data was published without their consent, accusing them of having occupied a property.",
  curation_note:
    "AEPD (Spain), HIGHCLIFFE ESTATES MARBELLA, S.L., 2 March 2026, EUR 8,500. The company failed to obtain consent before publication.",
};

const GUIDANCE_FC: ClassificationCandidate = {
  id: "t/guidance/fc-01",
  product: "lia",
  source_table: "edpb_guidelines",
  role: "FC",
  source_row_id: "aaaaaaaa-0000-0000-0000-000000000001",
  pinned_excerpt:
    "A controller must be able to demonstrate that the interest pursued is lawful, and the assessment cannot be reduced to a formality.",
  curation_note: "EDPB guidance on Article 6(1)(f).",
};

// ── STAGE 0 ─────────────────────────────────────────────────────────────────

Deno.test("doc191 §6.2 stage 0 — enforcement+AP is a pattern-prior at high confidence; guidance+FC is rule-eligible", () => {
  const ap = stage0Prior(EUROPA_PRESS);
  assertEquals(ap.prior, "pattern");
  assertEquals(ap.confidence_tier, "high");
  assertEquals(ap.pipeline_stage, "stage0_prior");

  const fc = stage0Prior(GUIDANCE_FC);
  assertEquals(fc.prior, "rule_eligible");
  assertEquals(fc.confidence_tier, "high");
});

Deno.test("doc191 §6.2 stage 0 — stage 0 can NEVER output 'rule', whatever the prior", () => {
  for (
    const src of [
      "enforcement_actions",
      "edpb_guidelines",
      "cppa_fsor_commentary",
      "regulatory_guidance",
      "provision_texts",
      "gdpr_articles",
      "court_decisions",
      "something_unknown",
    ]
  ) {
    for (const role of ["AP", "FC", "AQ", "AOW", null]) {
      const r = stage0Prior({ ...GUIDANCE_FC, source_table: src, role });
      assertEquals(r.rule_or_pattern, "pattern", `${src}/${role}`);
    }
  }
});

Deno.test("doc191 §6.2 stage 0 — a role that disagrees with its source type weakens the prior", () => {
  assertEquals(stage0Prior({ ...EUROPA_PRESS, role: "FC" }).confidence_tier, "medium");
  assertEquals(stage0Prior({ ...GUIDANCE_FC, role: "AP" }).confidence_tier, "medium");
  // Litigation and unknown sources land low, so they always reach stage 1.
  assertEquals(stage0Prior({ ...EUROPA_PRESS, source_table: "court_decisions" }).confidence_tier, "low");
  assertEquals(stage0Prior({ ...EUROPA_PRESS, source_table: "not_a_table" }).confidence_tier, "low");
  assertEquals(stage0Prior({ ...EUROPA_PRESS, source_table: "provision_texts" }).prior, "rule_eligible");
});

// ── STAGE 1 ─────────────────────────────────────────────────────────────────

Deno.test("doc191 §6.2 stage 1 — the Europa Press row breaks its pattern-prior and is shortlisted", () => {
  const s1 = stage1ExceptionMine(EUROPA_PRESS, stage0Prior(EUROPA_PRESS));
  assertEquals(s1.is_exception, true);
  assertEquals(s1.shortlist_for_stage2, true);
  assert(s1.categorical_markers.includes("cannot"), JSON.stringify(s1.categorical_markers));
  assert(s1.categorical_markers.includes("at all"), JSON.stringify(s1.categorical_markers));
  assert(s1.categorical_markers.includes("is anterior to"), JSON.stringify(s1.categorical_markers));
});

Deno.test("doc191 §6.2 stage 1 — a plain enforcement outcome holds its prior and is NOT shortlisted", () => {
  const s1 = stage1ExceptionMine(PLAIN_AP, stage0Prior(PLAIN_AP));
  assertEquals(s1.is_exception, false);
  assertEquals(s1.shortlist_for_stage2, false);
  assertEquals(s1.categorical_markers, []);
  assert(s1.fact_pattern_markers.length > 0, "fact-pattern language should be recorded");
});

Deno.test("doc196 §2 — plain modal verbs alone never shortlist a pattern-prior row (the 'must' trap)", () => {
  const modalOnly: ClassificationCandidate = {
    ...PLAIN_AP,
    curation_note:
      "The controller must implement appropriate measures and is required to document them. The company failed to do so and was fined.",
    pinned_excerpt: "The company failed to implement the measures it is obliged to implement.",
  };
  const s1 = stage1ExceptionMine(modalOnly, stage0Prior(modalOnly));
  assertEquals(s1.shortlist_for_stage2, false, "'must'/'requires' is in every legal sentence ever written");
  assert(s1.modal_markers.length > 0, "the modal language is still RECORDED as supporting evidence");
});

Deno.test("doc191 §6.2 stage 1 — definitional/holding language clears the bar on its own", () => {
  const holding: ClassificationCandidate = {
    ...PLAIN_AP,
    curation_note: "The court held that each separate scan is its own violation for the purposes of the Act.",
  };
  const s1 = stage1ExceptionMine(holding, stage0Prior(holding));
  assertEquals(s1.shortlist_for_stage2, true);
  assert(s1.definitional_markers.includes("held that"), JSON.stringify(s1.definitional_markers));
});

Deno.test("doc191 §6.2 stage 1 — a rule-prior row WITH rule markers is shortlisted but is not an 'exception'", () => {
  const s1 = stage1ExceptionMine(GUIDANCE_FC, stage0Prior(GUIDANCE_FC));
  assertEquals(s1.shortlist_for_stage2, true);
  assertEquals(s1.is_exception, false, "behaving exactly as its prior predicted is not an exception");
});

Deno.test("doc191 §6.2 stage 1 — a purely descriptive rule-prior row IS an exception, and stays pattern", () => {
  const descriptive: ClassificationCandidate = {
    ...GUIDANCE_FC,
    pinned_excerpt: "This section summarises the structure of the guidelines and lists the working party's members.",
    curation_note: "Background section of the guidance.",
  };
  const s1 = stage1ExceptionMine(descriptive, stage0Prior(descriptive));
  assertEquals(s1.is_exception, true);
  assertEquals(s1.shortlist_for_stage2, false, "there is nothing to extract from a descriptive passage");
});

// ── QUOTE VERIFICATION (§6.2 stage 2's gate) ────────────────────────────────

const QUOTE = "Article 9 special-category data cannot be reached by Article 6(1)(f) at all";

Deno.test("doc191 §6.2 — a verbatim quote verifies; a paraphrase does not", () => {
  const sources = [["curation_note", EUROPA_PRESS.curation_note]] as const;
  assertEquals(verifyQuote(QUOTE, sources).verified, true);
  assertEquals(verifyQuote(QUOTE, sources).found_in, "curation_note");

  // One word changed — a paraphrase, not a quote.
  assertEquals(
    verifyQuote("Article 9 special-category data can never be reached by Article 6(1)(f) at all", sources).verified,
    false,
  );
  // Reordered — the §6.3 worked failure mode.
  assertEquals(
    verifyQuote("Special-category data under Article 9 cannot be reached by Article 6(1)(f) at all", sources).verified,
    false,
  );
});

Deno.test("doc191 §6.2 — whitespace and typographic quote marks normalise; punctuation does NOT", () => {
  const src = [["excerpt", "The  controller's duty is absolute, and it cannot be waived by contract."]] as const;
  assertEquals(verifyQuote("The controller's duty is absolute, and it cannot be waived", src).verified, true);
  assertEquals(verifyQuote("The controller’s duty is absolute, and it cannot be waived", src).verified, true);
  // Punctuation rewritten away is a rewrite of the author's words.
  assertEquals(verifyQuote("The controllers duty is absolute and it cannot be waived", src).verified, false);
  assertEquals(normaliseForQuoteCheck("  A  B \n C "), "a b c");
});

Deno.test("doc191 §6.2 — an empty, missing or trivially short 'quote' never verifies", () => {
  const sources = [["curation_note", EUROPA_PRESS.curation_note]] as const;
  assertEquals(verifyQuote(null, sources).verified, false);
  assertEquals(verifyQuote("", sources).verified, false);
  assertEquals(verifyQuote("   ", sources).verified, false);
  const short = "cannot be";
  assert(short.length < MIN_QUOTE_CHARS);
  assertEquals(verifyQuote(short, sources).verified, false, "a two-word 'quote' matches almost anything");
});

// ── STAGE 2, against a stubbed model ────────────────────────────────────────

function stub(reply: string | ((system: string, user: string) => string)): LlmCall {
  return (system, user) => Promise.resolve(typeof reply === "string" ? reply : reply(system, user));
}

Deno.test("doc191 §6.2 stage 2 — a verified quote is accepted and the framing's system prompt is the narrow question", async () => {
  let seenSystem = "";
  const llm: LlmCall = (system) => {
    seenSystem = system;
    return Promise.resolve(JSON.stringify({ states_rule: true, quote: QUOTE, rule_statement: "R." }));
  };
  const r = await stage2Extract(EUROPA_PRESS, "find_rule", llm);
  assertEquals(r.states_rule, true);
  assertEquals(r.quote_verified, true);
  assertEquals(r.rule_statement, "R.");
  assertEquals(seenSystem, STAGE2_SYSTEM_FIND_RULE);
  assert(!seenSystem.toLowerCase().includes("is this a rule"), "the question must never be 'is this a rule'");

  const adv = await stage2Extract(EUROPA_PRESS, "argue_pattern", stub(JSON.stringify({ states_rule: false, quote: null })));
  assertEquals(adv.framing, "argue_pattern");
  assertEquals(adv.states_rule, false);
});

Deno.test("doc191 §6.1/§6.2 — a HALLUCINATED quote falls back to pattern, however confident the claim", async () => {
  const r = await stage2Extract(
    EUROPA_PRESS,
    "find_rule",
    stub(JSON.stringify({
      states_rule: true,
      quote: "The Regulation categorically forbids any processing of special-category data whatsoever.",
      rule_statement: "R.",
    })),
  );
  assertEquals(r.quote_verified, false);
  assertEquals(r.states_rule, false, "an unverified quote can never carry a rule");
  assertEquals(r.quote, null);
  assertEquals(r.rule_statement, null);
});

Deno.test("doc191 §6.2 stage 2 — unparseable output, an empty reply and a model error all resolve to pattern", async () => {
  for (const reply of ["not json at all", "", "{ broken", "{}"]) {
    const r = await stage2Extract(EUROPA_PRESS, "find_rule", stub(reply));
    assertEquals(r.states_rule, false, JSON.stringify(reply));
  }
  const thrown = await stage2Extract(EUROPA_PRESS, "find_rule", () => Promise.reject(new Error("503 upstream")));
  assertEquals(thrown.states_rule, false);
  assertEquals(thrown.quote_verified, false);
  assert(thrown.raw.startsWith("ERROR: 503 upstream"), thrown.raw);
});

Deno.test("doc191 §6.2 stage 2 — the JSON parser tolerates fences and preamble", () => {
  assertEquals(
    parseStage2Json('Sure!\n```json\n{"states_rule": true, "quote": "q", "rule_statement": "r"}\n```'),
    { states_rule: true, quote: "q", rule_statement: "r" },
  );
  assertEquals(parseStage2Json("no object here"), { states_rule: false, quote: null, rule_statement: null });
  // A string "true" is not true.
  assertEquals(parseStage2Json('{"states_rule": "true"}').states_rule, false);
});

// ── STAGE 3 ─────────────────────────────────────────────────────────────────

function framedStub(byFraming: Record<string, string>): LlmCall {
  return (system) =>
    Promise.resolve(system === STAGE2_SYSTEM_FIND_RULE ? byFraming.find_rule : byFraming.argue_pattern);
}

const RULE_REPLY = JSON.stringify({ states_rule: true, quote: QUOTE, rule_statement: "R." });
const PATTERN_REPLY = JSON.stringify({ states_rule: false, quote: null, rule_statement: null });

Deno.test("doc191 §6.2 stage 3 — promotion requires BOTH framings to agree with verified quotes", async () => {
  const agree = await stage3SelfConsistency(
    EUROPA_PRESS,
    framedStub({ find_rule: RULE_REPLY, argue_pattern: RULE_REPLY }),
  );
  assertEquals(agree.agreement, true);
  assertEquals(agree.promote_to_rule, true);
  assertEquals(agree.extracted_quote, QUOTE);
  assertEquals(agree.rule_statement, "R.");
});

Deno.test("doc191 §6.2 stage 3 — DISAGREEMENT is not adjudicated: it falls back to pattern, both directions", async () => {
  const a = await stage3SelfConsistency(EUROPA_PRESS, framedStub({ find_rule: RULE_REPLY, argue_pattern: PATTERN_REPLY }));
  assertEquals(a.agreement, false);
  assertEquals(a.promote_to_rule, false);
  assertEquals(a.extracted_quote, null);
  assert(a.basis.includes("disagreed"), a.basis);

  const b = await stage3SelfConsistency(EUROPA_PRESS, framedStub({ find_rule: PATTERN_REPLY, argue_pattern: RULE_REPLY }));
  assertEquals(b.agreement, false);
  assertEquals(b.promote_to_rule, false);
});

Deno.test("doc191 §6.2 stage 3 — agreeing on 'no rule' is agreement, but promotes nothing", async () => {
  const r = await stage3SelfConsistency(
    EUROPA_PRESS,
    framedStub({ find_rule: PATTERN_REPLY, argue_pattern: PATTERN_REPLY }),
  );
  assertEquals(r.agreement, true);
  assertEquals(r.promote_to_rule, false);
});

Deno.test("doc191 §6.2 stage 3 — both framings claiming a rule on an UNVERIFIED quote still promotes nothing", async () => {
  const bad = JSON.stringify({ states_rule: true, quote: "a sentence that appears nowhere in the excerpt at all", rule_statement: "R." });
  const r = await stage3SelfConsistency(EUROPA_PRESS, framedStub({ find_rule: bad, argue_pattern: bad }));
  assertEquals(r.promote_to_rule, false);
  assertEquals(r.agreement, true, "they agree — on 'pattern', because neither quote survived verification");
  assert(STAGE2_SYSTEM_ARGUE_PATTERN !== STAGE2_SYSTEM_FIND_RULE, "the two framings must be genuinely different prompts");
});

// ── §6.3 THE STRATIFIED CHECKPOINT DRAW ─────────────────────────────────────

const population = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `row-${String(i).padStart(3, "0")}`,
    confidence_tier: (i % 3 === 0 ? "high" : i % 3 === 1 ? "medium" : "low") as "high" | "medium" | "low",
    promoted_toward_rule: false,
  }));

Deno.test("doc191 §6.3 — the draw is deterministic: the same seed reproduces the same sample", () => {
  const items = population(200);
  const a = drawStratifiedSample(items, { seed: "batch-1::stage1" });
  const b = drawStratifiedSample(items, { seed: "batch-1::stage1" });
  assertEquals(a.items.map((i) => i.id), b.items.map((i) => i.id));
  const c = drawStratifiedSample(items, { seed: "batch-1::stage2" });
  assert(
    c.items.map((i) => i.id).join() !== a.items.map((i) => i.id).join(),
    "a different stage must draw a different sample",
  );
  assertEquals(a.items.length, CHECKPOINT_SAMPLE_SIZE);
  assertEquals(new Set(a.items.map((i) => i.id)).size, a.items.length, "no item is drawn twice");
});

Deno.test("doc191 §6.3 — the draw is weighted toward low confidence, not uniform", () => {
  const items = population(300);
  const draw = drawStratifiedSample(items, { size: 30, seed: "weighting" });
  const low = draw.items.filter((i) => i.confidence_tier === "low").length;
  const high = draw.items.filter((i) => i.confidence_tier === "high").length;
  assert(low > high, `expected low-confidence over-representation, got low=${low} high=${high}`);
  assertEquals(sampleWeight({ id: "x", confidence_tier: "low", promoted_toward_rule: false }), 4);
  assertEquals(sampleWeight({ id: "x", confidence_tier: "high", promoted_toward_rule: false }), 1);
  assertEquals(sampleWeight({ id: "x", confidence_tier: "high", promoted_toward_rule: true }), 9);
  assertEquals(sampleWeight({ id: "x", confidence_tier: "high", promoted_toward_rule: false, sibling_conflict: true }), 5);
});

Deno.test("doc191 §6.3 step 4 — EVERY row promoted toward 'rule' is drawn, never left to chance", () => {
  const items = [
    ...population(500),
    { id: "promoted-a", confidence_tier: "high" as const, promoted_toward_rule: true },
    { id: "promoted-b", confidence_tier: "high" as const, promoted_toward_rule: true },
  ];
  const draw = drawStratifiedSample(items, { seed: "promotions" });
  assert(draw.items.some((i) => i.id === "promoted-a"), "a promotion must never be missed by a random draw");
  assert(draw.items.some((i) => i.id === "promoted-b"));
  assertEquals(draw.strata.promoted_toward_rule, { population: 2, drawn: 2 });
});

Deno.test("doc191 §6.3 — a population smaller than the sample returns all of it, and the strata report is honest", () => {
  const draw = drawStratifiedSample(population(4), { seed: "small" });
  assertEquals(draw.items.length, 4);
  assertEquals(draw.population, 4);
  const drawn = Object.values(draw.strata).reduce((n, s) => n + s.drawn, 0);
  assertEquals(drawn, 4);
  assertEquals(drawStratifiedSample([], { seed: "empty" }).items, []);
});

Deno.test("doc191 §6.2 stage 4 — the rule-of-three bound is stated, not gestured at", () => {
  assertEquals(ruleOfThreeUpperBound(50), 0.06);
  assertEquals(ruleOfThreeUpperBound(10), 0.3);
  assertEquals(ruleOfThreeUpperBound(0), null);
});

// ── THE WHOLE PIPELINE ──────────────────────────────────────────────────────

Deno.test("doc191 §6 — end to end: only the shortlist reaches the model, and every stage reports a checkpoint", async () => {
  let calls = 0;
  const llm: LlmCall = (system) => {
    calls++;
    return Promise.resolve(system === STAGE2_SYSTEM_FIND_RULE ? RULE_REPLY : RULE_REPLY);
  };
  const run = await runClassificationPipeline([EUROPA_PRESS, PLAIN_AP, GUIDANCE_FC], {
    llm,
    seed: "pipeline-test",
    classifiedAt: "2026-09-06T00:00:00Z",
  });

  // PLAIN_AP holds its prior and is never sent to a model.
  assertEquals(run.stage2_candidates.sort(), ["lia/f11-eprivacy/ap-w5-05", "t/guidance/fc-01"]);
  assertEquals(calls, 4, "two shortlisted rows x two framings");

  assertEquals(run.checkpoints.map((c) => c.stage), [
    "stage0_prior",
    "stage1_exception",
    "stage2_extraction",
    "stage3_consistency",
  ]);
  for (const c of run.checkpoints) assert(c.instruction.length > 40, `${c.stage}: no reviewer instruction`);

  const byId = new Map(run.outcomes.map((o) => [o.candidate.id, o]));
  const europa = byId.get("lia/f11-eprivacy/ap-w5-05")!;
  assertEquals(europa.rule_or_pattern, "rule");
  assertEquals(europa.pipeline_stage, "stage3_consistency");
  assertEquals(europa.quote_verified, true);
  assertEquals(europa.self_consistency_agreement, true);
  // A freshly promoted candidate is never "high": it has had no human read.
  assertEquals(europa.confidence_tier, "low");
  assert(europa.trail.some((t) => t.startsWith("stage0:")), JSON.stringify(europa.trail));
  assert(europa.trail.some((t) => t.startsWith("stage3:")), JSON.stringify(europa.trail));

  const plain = byId.get("lia/f07-harms/ap-w5-08")!;
  assertEquals(plain.rule_or_pattern, "pattern");
  assertEquals(plain.pipeline_stage, "stage0_prior");
  assertEquals(plain.extracted_quote, null);
  assertEquals(plain.self_consistency_agreement, null);
});

Deno.test("doc191 §8 — NOTHING the pipeline produces is ratified; a promotion is a candidate, not a decision", async () => {
  const run = await runClassificationPipeline([EUROPA_PRESS], {
    llm: framedStub({ find_rule: RULE_REPLY, argue_pattern: RULE_REPLY }),
    seed: "ratification",
  });
  assertEquals(run.promoted_ids, ["lia/f11-eprivacy/ap-w5-05"]);
  const o = run.outcomes[0];
  // The outcome type has no ratification field at all — there is nowhere for
  // a pipeline stage to put one, which is the structural version of doc 191
  // §8's rule that only the CEO or a named delegate may set it.
  assertEquals(Object.keys(o).includes("ratified_by"), false);
  assertEquals(Object.keys(o).includes("ledger_ref"), false);
});
