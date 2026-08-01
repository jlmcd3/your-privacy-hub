// ITEM 339 (PROSE PROGRAM 3 of 4) — TESTS.
//
// Covers: plan lint (conclusion-first, arc regression), the connective ↔
// relation mapping, referring expressions with the ambiguity guard,
// aggregation through approved frame variants only, and the plan renderer's
// conclusion-first assembly plus honest degradation.

import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";

import {
  ARC_ORDER,
  type DocumentPlan,
  lintPlan,
  OUTCOME_STAGES,
  type PlannedSection,
  planRenderable,
} from "../../../../supabase/functions/_shared/prose/plan.ts";
import {
  CONNECTIVES,
  connectiveFor,
  connectiveMatchesRelation,
  joinWithConnective,
  type Relation,
} from "../../../../supabase/functions/_shared/prose/connectives.ts";
import { applyMentionRule, MentionTracker } from "../../../../supabase/functions/_shared/prose/mentions.ts";
import { aggregateFacts } from "../../../../supabase/functions/_shared/prose/aggregate.ts";
import {
  auditSectionConnectives,
  renderDocumentFromPlan,
  renderPlannedSection,
} from "../../../../supabase/functions/_shared/prose/plan-render.ts";
import {
  edge,
  enumerateConnectives,
  LEAD_NODE,
  ReasoningGraph,
} from "../../../../supabase/functions/_shared/prose/reasoning-graph.ts";
import type { FrameSet } from "../../../../supabase/functions/_shared/prose/frames.ts";
import {
  CPPA_RISK_PLAN,
  DPIA_PLAN,
  GOVERNANCE_PLAN,
  REGISTRATION_PLAN,
} from "../../../../library/prose/load.ts";

const section = (over: Partial<PlannedSection> = {}): PlannedSection => ({
  id: "s1",
  title: "Determination",
  arc_stage: "headline",
  lead: "determination",
  source_key: "s1",
  themes: ["outcome"],
  required: true,
  status: "approved",
  ...over,
});

const plan = (sections: PlannedSection[], approved = true): DocumentPlan => ({
  product: "test",
  version: "test",
  approved,
  provenance: {
    method: "draft",
    donors_total: 0,
    donors_with_text: 0,
    extracted_at: "2026-08-01",
  },
  sections,
});

// ---------------------------------------------------------------------------
// PLAN LINT
// ---------------------------------------------------------------------------

Deno.test("lint: a clean plan produces no findings", () => {
  assertEquals(lintPlan(plan([section(), section({ id: "s2", arc_stage: "record", lead: "record" })])).length, 0);
});

Deno.test("lint: outcome sections must lead with the determination", () => {
  for (const stage of OUTCOME_STAGES) {
    const findings = lintPlan(plan([section({ arc_stage: stage, lead: "record" })]));
    assert(
      findings.some((f) => f.rule === "conclusion_first_violation"),
      `${stage} leading with record should fail`,
    );
  }
});

Deno.test("lint: a record section may lead with record facts", () => {
  const findings = lintPlan(plan([section({ id: "r", arc_stage: "record", lead: "record" })]));
  assertEquals(findings.filter((f) => f.rule === "conclusion_first_violation").length, 0);
});

Deno.test("lint: the arc may not run backwards", () => {
  const findings = lintPlan(plan([
    section({ id: "a", arc_stage: "remedy" }),
    section({ id: "b", arc_stage: "record", lead: "record" }),
  ]));
  assert(findings.some((f) => f.rule === "arc_regression"));
});

Deno.test("lint: duplicate ids, empty plans, missing themes and legal titles fail", () => {
  assert(lintPlan(plan([section(), section()])).some((f) => f.rule === "duplicate_section_id"));
  assert(lintPlan(plan([])).some((f) => f.rule === "empty_plan"));
  assert(lintPlan(plan([section({ themes: [] })])).some((f) => f.rule === "missing_themes"));
  assert(
    lintPlan(plan([section({ title: "Duties under Article 35" })]))
      .some((f) => f.rule === "legal_content_in_title"),
  );
});

Deno.test("gate: an unapproved plan is never renderable", () => {
  assertEquals(planRenderable(plan([section()], false)), false);
  assertEquals(planRenderable(plan([section({ status: "pending_review" })])), false);
  assertEquals(planRenderable(plan([section()])), true);
});

Deno.test("reviewed plans are lint-clean but not yet approved", () => {
  for (const p of [CPPA_RISK_PLAN, DPIA_PLAN, GOVERNANCE_PLAN, REGISTRATION_PLAN]) {
    assertEquals(lintPlan(p), [], `${p.product} must be lint-clean`);
    assertEquals(p.approved, false, `${p.product} must not be approved before sign-off`);
    assertEquals(planRenderable(p), false, `${p.product} must not render before sign-off`);
    assert(p.sections.every((s) => s.status === "pending_review"));
    // Every reviewed plan opens on its determination, not on the record.
    assertEquals(p.sections[0].arc_stage, "headline");
    assertEquals(p.sections[0].lead, "determination");
  }
});

// ---------------------------------------------------------------------------
// CONNECTIVES
// ---------------------------------------------------------------------------

Deno.test("connective: selection is deterministic and matches its relation", () => {
  for (const rel of Object.keys(CONNECTIVES) as Relation[]) {
    if (rel === "none") continue;
    for (let i = 0; i < 7; i++) {
      const c = connectiveFor(rel, i);
      assertEquals(c, connectiveFor(rel, i), "same input must give the same word");
      assert(connectiveMatchesRelation(c, rel), `${c} must be licensed by ${rel}`);
    }
  }
});

Deno.test("connective: a relation never borrows another relation's word", () => {
  assertEquals(connectiveMatchesRelation("however", "consequence"), false);
  assertEquals(connectiveMatchesRelation("as a result", "contrast"), false);
  assertEquals(connectiveMatchesRelation("however", "contrast"), true);
});

Deno.test("connective: none emits no word and just ends the sentence", () => {
  assertEquals(connectiveFor("none"), "");
  assertEquals(joinWithConnective("A holds", "B follows", "none"), "A holds. B follows.");
});

Deno.test("connective: trigger_duty subordinates, consequence opens a new sentence", () => {
  assertEquals(
    joinWithConnective("Notification is required", "The record reports a breach", "trigger_duty"),
    "Notification is required, because the record reports a breach.",
  );
  assertEquals(
    joinWithConnective("The record is silent", "No determination is possible", "consequence"),
    "The record is silent. As a result, no determination is possible.",
  );
});

// ---------------------------------------------------------------------------
// REFERRING EXPRESSIONS
// ---------------------------------------------------------------------------

Deno.test("mentions: full name first, short form after, reset per section", () => {
  const t = new MentionTracker({ primary: "Syntara Believedbasis Corp." });
  assertEquals(t.render(), "Syntara Believedbasis Corp.");
  assertEquals(t.render(), "the company");
  assertEquals(t.render(), "the company");
  t.resetSection();
  assertEquals(t.render(), "Syntara Believedbasis Corp.");
});

Deno.test("mentions: pronouns only when no other entity is in play", () => {
  const solo = new MentionTracker({ primary: "Acme Ltd", allowPronoun: true });
  solo.render();
  solo.render();
  assertEquals(solo.render(), "it");

  // AMBIGUITY GUARD: a processor alongside the controller switches pronouns off.
  const pair = new MentionTracker({
    primary: "Acme Ltd",
    others: ["Vendorly Inc"],
    allowPronoun: true,
  });
  pair.render();
  pair.render();
  assertEquals(pair.render(), "the company");
});

Deno.test("mentions: non-primary entities always render in full and do not advance the counter", () => {
  const t = new MentionTracker({ primary: "Acme Ltd", others: ["Vendorly Inc"] });
  assertEquals(t.render("Vendorly Inc"), "Vendorly Inc");
  assertEquals(t.render(), "Acme Ltd");
  assertEquals(t.render("Vendorly Inc"), "Vendorly Inc");
  assertEquals(t.render(), "the company");
});

Deno.test("mentions: possessives follow the same schedule", () => {
  const t = new MentionTracker({ primary: "Acme Ltd" });
  assertEquals(t.renderPossessive(), "Acme Ltd's");
  assertEquals(t.renderPossessive(), "the company's");
});

Deno.test("mentions: rewriting assembled prose shortens repeats only", () => {
  const [out] = applyMentionRule(
    ["Acme Ltd processes data. Acme Ltd retains it. Acme Ltd deletes it."],
    { primary: "Acme Ltd", shortForm: "the organisation" },
  );
  assertEquals(out, "Acme Ltd processes data. the organisation retains it. the organisation deletes it.");
});

// ---------------------------------------------------------------------------
// AGGREGATION
// ---------------------------------------------------------------------------

const variantSet: FrameSet = {
  product: "test",
  version: "test",
  approved: true,
  frames: [{
    id: "test.aggregate.retention.001",
    product: "test",
    section: "aggregate:lifecycle:retention",
    body: "The record states a retention position of {{RETENTION}} and a deletion route of {{DELETION}}.",
    placeholders: [
      { token: "RETENTION", kind: "text", source: "retention", required: true },
      { token: "DELETION", kind: "text", source: "deletion", required: true },
    ],
    provenance: {
      sample_report_id: null,
      tool_slug: "test",
      report_path: "test",
      harvested_at: "2026-08-01",
      origin: "draft",
    },
    status: "approved",
  }],
};

Deno.test("aggregate: adjacent same-topic facts merge through an approved variant", () => {
  const r = aggregateFacts([
    {
      topic: "lifecycle:retention",
      sentence: "Retention is 24 months.",
      values: { retention: "24 months" },
    },
    {
      topic: "lifecycle:retention",
      sentence: "Deletion is by quarterly purge.",
      values: { deletion: "quarterly purge" },
    },
  ], { frames: variantSet });
  assertEquals(r.sentences.length, 1);
  assertEquals(r.variants_used, ["test.aggregate.retention.001"]);
  assertStringIncludes(r.sentences[0], "24 months");
  assertStringIncludes(r.sentences[0], "quarterly purge");
});

Deno.test("aggregate: no approved variant means no merge and no generation", () => {
  const r = aggregateFacts([
    { topic: "other:topic", sentence: "One." },
    { topic: "other:topic", sentence: "Two." },
  ], { frames: variantSet });
  assertEquals(r.sentences, ["One.", "Two."]);
  assertEquals(r.variants_used, []);
  assertEquals(r.unmerged_topics, ["other:topic"]);
});

Deno.test("aggregate: an unapproved frame set never merges", () => {
  const r = aggregateFacts([
    { topic: "lifecycle:retention", sentence: "One.", values: { retention: "a" } },
    { topic: "lifecycle:retention", sentence: "Two.", values: { deletion: "b" } },
  ], { frames: { ...variantSet, approved: false } });
  assertEquals(r.sentences.length, 2);
});

Deno.test("aggregate: a variant missing a required value falls back to atomic sentences", () => {
  const r = aggregateFacts([
    { topic: "lifecycle:retention", sentence: "One.", values: { retention: "24 months" } },
    { topic: "lifecycle:retention", sentence: "Two.", values: {} },
  ], { frames: variantSet });
  assertEquals(r.sentences, ["One.", "Two."]);
  assertEquals(r.unmerged_topics, ["lifecycle:retention"]);
});

// ---------------------------------------------------------------------------
// PLAN RENDERER
// ---------------------------------------------------------------------------

const analysis = section({
  id: "risk",
  title: "Risk analysis",
  arc_stage: "analysis",
  themes: ["negative_impacts", "safeguards_applied", "weighing"],
});

Deno.test("render: the determination leads and facts follow in engine theme order", () => {
  const r = renderPlannedSection(analysis, {
    section_id: "risk",
    determination: "The activity presents a significant risk to consumers",
    statements: [
      // deliberately supplied in intake order, not theme order
      { theme: "weighing", sentence: "the benefits do not outweigh the risks", relation: "factor_outcome" },
      { theme: "negative_impacts", sentence: "the record identifies unauthorised access", relation: "trigger_duty" },
      { theme: "safeguards_applied", sentence: "encryption at rest is described", relation: "contrast" },
    ],
  }, { mentions: { primary: "Acme Ltd" } });

  assert(r.text.startsWith("The activity presents a significant risk to consumers"));
  const lower = r.text.toLowerCase();
  const iImpact = lower.indexOf("unauthorised access");
  const iSafe = lower.indexOf("encryption at rest");
  const iWeigh = lower.indexOf("benefits do not outweigh");
  assert(iImpact < iSafe && iSafe < iWeigh, `themes out of engine order: ${r.text}`);
  assertEquals(r.degraded, false);
});

Deno.test("render: a statement carries a connective only when the engine graph licenses it", () => {
  const graph = new ReasoningGraph([
    edge(LEAD_NODE, "breach", "trigger_duty", "harm_causation[0].cause"),
    edge("breach", "controls", "contrast", "safeguard_map[0].residual_band"),
  ]);
  const r = renderPlannedSection(analysis, {
    section_id: "risk",
    determination: "A duty is engaged",
    statements: [
      { id: "breach", theme: "negative_impacts", sentence: "the record reports a breach", relation: "trigger_duty" },
      { id: "controls", theme: "safeguards_applied", sentence: "controls were in place", relation: "contrast" },
    ],
  }, { mentions: { primary: "Acme Ltd" }, graph });
  assertStringIncludes(r.text, "because the record reports a breach");
  assertStringIncludes(r.text, "However, controls were in place");
  assertEquals(r.connectives.length, 2);
});


Deno.test("render: a section with no determination degrades honestly", () => {
  const r = renderPlannedSection(analysis, {
    section_id: "risk",
    statements: [],
    information_needed: ["retention period", "safeguards"],
  }, { mentions: { primary: "Acme Ltd" } });
  assertEquals(r.degraded, true);
  assertStringIncludes(r.text, "does not state enough");
  assertEquals(r.information_needed, ["retention period", "safeguards"]);
});

Deno.test("render: a record section leads with its first statement and is not degraded", () => {
  const recordSection: PlannedSection = {
    id: "record",
    title: "The record as stated",
    source_key: "record_echo",
    arc_stage: "record",
    lead: "record",
    themes: ["negative_impacts", "safeguards_applied"],
    required: true,
    status: "approved",
  };
  const r = renderPlannedSection(recordSection, {
    section_id: "record",
    statements: [
      { theme: "negative_impacts", sentence: "the record reports unauthorised access", relation: "none" },
      { theme: "safeguards_applied", sentence: "encryption at rest is described", relation: "addition" },
    ],
  }, { mentions: { primary: "Acme Ltd" } });
  assertEquals(r.degraded, false);
  assert(r.text.startsWith("The record reports unauthorised access"));
  assertStringIncludes(r.text.toLowerCase(), "encryption at rest");
  assertEquals(r.text.includes("does not state enough"), false);
});

Deno.test("render: a record section with nothing on the record still degrades", () => {
  const recordSection: PlannedSection = {
    id: "record",
    title: "The record as stated",
    source_key: "record_echo",
    arc_stage: "record",
    lead: "record",
    themes: ["negative_impacts"],
    required: true,
    status: "approved",
  };
  const r = renderPlannedSection(recordSection, { section_id: "record", statements: [] }, {
    mentions: { primary: "Acme Ltd" },
  });
  assertEquals(r.degraded, true);
  assertStringIncludes(r.text, "does not state enough");
});

Deno.test("render: statements whose theme the plan does not declare are reported, not silently placed", () => {
  const r = renderPlannedSection(analysis, {
    section_id: "risk",
    determination: "A determination",
    statements: [{ theme: "not_in_plan", sentence: "orphan fact", relation: "addition" }],
  }, { mentions: { primary: "Acme Ltd" } });
  assertEquals(r.unplaced, ["not_in_plan"]);
  assertEquals(r.text.includes("orphan fact"), false);
});

Deno.test("render: mention shortening applies within a section", () => {
  const r = renderPlannedSection(analysis, {
    section_id: "risk",
    determination: "Acme Ltd faces a significant risk",
    statements: [
      { id: "access", theme: "negative_impacts", sentence: "Acme Ltd reports unauthorised access", relation: "trigger_duty" },
    ],
  }, {
    mentions: { primary: "Acme Ltd" },
    graph: new ReasoningGraph([
      edge(LEAD_NODE, "access", "trigger_duty", "harm_causation[0].source"),
    ]),
  });
  assertStringIncludes(r.text, "Acme Ltd faces");
  assertStringIncludes(r.text, "the company reports");
});

Deno.test("render: whole-document render follows the plan's order and arc", () => {
  const p = plan([
    section({ id: "head" }),
    section({ id: "rec", arc_stage: "record", lead: "record", themes: ["data"] }),
    section({ id: "opt", arc_stage: "close", required: false }),
  ]);
  const doc = renderDocumentFromPlan(p, {
    head: { section_id: "head", determination: "Required", statements: [] },
  }, { mentions: { primary: "Acme Ltd" } });

  assertEquals(doc.sections.map((s) => s.section_id), ["head", "rec"]);
  // the required section with no engine input degrades; the optional one drops
  assertEquals(doc.sections[1].degraded, true);
  assertEquals(doc.arc, ["headline", "record", "close"]);
});

Deno.test("arc order is the single source of truth for stage sequencing", () => {
  assertEquals(ARC_ORDER[0], "headline");
  assertEquals(ARC_ORDER[ARC_ORDER.length - 1], "close");
});

// ---------------------------------------------------------------------------
// ITEM 347 — DOCUMENT-PLAN REWORK GUARANTEES
// ---------------------------------------------------------------------------

// P1 — CONNECTIVE-EDGE RULE (hard).
Deno.test("P1: no edge, no connective — statements are juxtaposed plainly", () => {
  const r = renderPlannedSection(analysis, {
    section_id: "risk",
    determination: "The risk level is Moderate",
    statements: [
      { id: "sector", theme: "negative_impacts", sentence: "the sector is a believed-basis pilot", relation: "trigger_duty" },
    ],
  }, { mentions: { primary: "Acme Ltd" } });
  // the rejected Item 339 render's fabricated causal claim
  assertEquals(r.text.includes("because"), false);
  assertEquals(r.connectives.length, 0);
  assertStringIncludes(r.text, "The risk level is Moderate. The sector is a believed-basis pilot.");
});

Deno.test("P1: a proposed relation with no matching edge is downgraded, not spoken", () => {
  const graph = new ReasoningGraph([
    // an edge exists, but of a DIFFERENT kind than the statement proposes
    edge(LEAD_NODE, "sector", "addition", "activity_index[0]"),
  ]);
  const r = renderPlannedSection(analysis, {
    section_id: "risk",
    determination: "The risk level is Moderate",
    statements: [
      { id: "sector", theme: "negative_impacts", sentence: "the sector is a believed-basis pilot", relation: "trigger_duty" },
    ],
  }, { mentions: { primary: "Acme Ltd" }, graph });
  assertEquals(r.connectives.length, 0);
  assertEquals(r.text.includes("because"), false);
});

Deno.test("P1: every connective emitted in a render maps to a real computed edge", () => {
  const graph = new ReasoningGraph([
    edge(LEAD_NODE, "a", "trigger_duty", "necessity_analysis[0].verdict"),
    edge("a", "b", "contrast", "safeguard_map[0].residual_band"),
    edge("b", "c", "consequence", "consequence.decision"),
  ]);
  const r = renderPlannedSection(analysis, {
    section_id: "risk",
    determination: "A duty is engaged",
    statements: [
      { id: "a", theme: "negative_impacts", sentence: "the record reports unauthorised access", relation: "trigger_duty" },
      { id: "b", theme: "safeguards_applied", sentence: "encryption at rest is described", relation: "contrast" },
      { id: "c", theme: "weighing", sentence: "the benefit stated is supported", relation: "consequence" },
    ],
  }, { mentions: { primary: "Acme Ltd" }, graph });

  const audit = auditSectionConnectives(r);
  assertEquals(audit.findings, []);
  assert(audit.emitted.length >= 3, `expected connectives, got: ${r.text}`);
  assertEquals(audit.emitted.length, r.connectives.length);
  for (const use of r.connectives) {
    assert(graph.has(use.from, use.to, use.relation), `unlicensed: ${use.word}`);
    assert(use.basis.length > 0, "an edge must name the engine structure that computed it");
  }
});

Deno.test("P1: an edge with no engine basis is refused at construction", () => {
  let threw = false;
  try {
    new ReasoningGraph([{ from: LEAD_NODE, to: "x", kind: "trigger_duty", basis: "" }]);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("P1: the connective enumerator finds both join shapes", () => {
  const found = enumerateConnectives(
    "A duty is engaged, because the record reports a breach. However, controls were in place.",
  ).map((c) => c.word);
  assertEquals(found, ["because", "however"]);
});

// P2 — NO FIELD-NAME SUBJECTS.
Deno.test("P2: a field-name pseudo-sentence is refused", () => {
  let msg = "";
  try {
    renderPlannedSection(analysis, {
      section_id: "risk",
      determination: "A duty is engaged",
      statements: [
        { id: "t", theme: "negative_impacts", sentence: "triggers on the record is Admt Involved: false", relation: "none" },
      ],
    }, { mentions: { primary: "Acme Ltd" } });
  } catch (e) {
    msg = String(e);
  }
  assertStringIncludes(msg, "field_name_subject");
});

Deno.test("P2: structured record values render as labeled card lines, not sentences", () => {
  const recordSection: PlannedSection = {
    id: "record",
    title: "The record as stated",
    source_key: "record_echo",
    arc_stage: "record",
    lead: "record",
    themes: ["data"],
    required: true,
    status: "approved",
  };
  const r = renderPlannedSection(recordSection, {
    section_id: "record",
    determination_status: "not_owed",
    statements: [
      { id: "admt", theme: "data", kind: "record_card", label: "Automated decision-making involved", value: "no", sentence: "", relation: "none" },
      { id: "cats", theme: "data", kind: "record_card", label: "Personal information categories", value: "identifiers; commercial information", sentence: "", relation: "none" },
    ],
  }, { mentions: { primary: "Acme Ltd" } });

  assertEquals(r.record_card.length, 2);
  assertStringIncludes(r.text, "- Automated decision-making involved: no");
  assertEquals(r.text.includes("on the record is"), false);
  assertEquals(r.degraded, false);
});

// P3 — NO ELLIPSIS TRUNCATION.
Deno.test("P3: mid-content ellipsis truncation is refused", () => {
  let msg = "";
  try {
    renderPlannedSection(analysis, {
      section_id: "risk",
      determination: "A duty is engaged",
      statements: [
        { id: "h", theme: "negative_impacts", sentence: "the record describes a long causal path that was cut off here \u2026", relation: "none" },
      ],
    }, { mentions: { primary: "Acme Ltd" } });
  } catch (e) {
    msg = String(e);
  }
  assertStringIncludes(msg, "ellipsis_truncation");
});

Deno.test("P3: long analytic content flows through in full", () => {
  const long = "the record describes " + "a specific causal step, ".repeat(20) + "and the outcome";
  const r = renderPlannedSection(analysis, {
    section_id: "risk",
    determination: "A duty is engaged",
    statements: [{ id: "h", theme: "negative_impacts", sentence: long, relation: "none" }],
  }, { mentions: { primary: "Acme Ltd" } });
  assertStringIncludes(r.text.toLowerCase(), long.slice(0, 60).toLowerCase());
  assertStringIncludes(r.text, "and the outcome");
  assertEquals(/\u2026|\.\.\./.test(r.text), false);
});

// P4 — DEGRADATION BANNER LOGIC.
Deno.test("P4: a section holding a determination is never banner-degraded", () => {
  const r = renderPlannedSection(analysis, {
    section_id: "risk",
    determination: "The activity may be initiated subject to the conditions below",
    determination_status: "stated",
    statements: [
      { id: "a", theme: "negative_impacts", sentence: "the record identifies unauthorised access", relation: "none" },
    ],
  }, { mentions: { primary: "Acme Ltd" } });
  assertEquals(r.determination_status, "stated");
  assertEquals(r.degraded, false);
});

Deno.test("P4: the banner is reserved for record_insufficient", () => {
  const recordSection: PlannedSection = {
    id: "ask",
    title: "What the record does not yet state",
    source_key: "information_needed",
    arc_stage: "ask",
    lead: "record",
    themes: ["silent_fields"],
    required: true,
    status: "approved",
  };
  const notOwed = renderPlannedSection(recordSection, {
    section_id: "ask",
    statements: [
      { id: "s", theme: "silent_fields", sentence: "the record does not state a retention period", relation: "none" },
    ],
  }, { mentions: { primary: "Acme Ltd" } });
  assertEquals(notOwed.determination_status, "not_owed");
  assertEquals(notOwed.degraded, false);

  const insufficient = renderPlannedSection(analysis, {
    section_id: "risk",
    statements: [],
    determination_status: "record_insufficient",
  }, { mentions: { primary: "Acme Ltd" } });
  assertEquals(insufficient.degraded, true);
});

Deno.test("P1: a connective inside a pinned clause is not a renderer join and needs no edge", () => {
  const r = renderPlannedSection(analysis, {
    section_id: "risk",
    determination:
      "This assessment records the processing as supportable only while the conditions below are met — it cannot treat those conditions as optional, because the conclusion rests on them",
    statements: [
      { id: "a", theme: "negative_impacts", sentence: "the record identifies unauthorised access", relation: "trigger_duty" },
    ],
  }, { mentions: { primary: "Acme Ltd" } });

  // no graph → the renderer made no causal join
  assertEquals(r.connectives.length, 0);
  // the pinned clause keeps its own "because" …
  assertStringIncludes(r.text, "because the conclusion rests on them");
  // … and the seam audit still passes, because that "because" is not a seam
  assertEquals(auditSectionConnectives(r).findings, []);
});
