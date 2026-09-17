// /all-ptest v2 (DOC 261) — STAGE 4: dedupe, the queue gate, routing, the
// document classify job (hermetic, classifier injected) and the deterministic
// product merge. Stubbed admin client; no network.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  compositeScore,
  dedupeFindings,
  gate,
  mergeProductV2,
  runClassifyJob,
  type Classification,
  type DedupedFinding,
  type FindingRow,
} from "../../../supabase/functions/ptest-run-driver/_local/review/classify.ts";

type Row = Record<string, unknown>;

const row = (over: Partial<FindingRow>): FindingRow => ({
  id: crypto.randomUUID(), finding_id: "f", worker: "W-RECORD", vendor: "claude", status: "validated", kind: "contradicts",
  severity: "editorial", confidence: "high", block_key: "iv_determination:12", block_key_b: null,
  quote: "The Company identifies four benefits and three risks.", quote_b: null, why: "why", intake_key: null, intake_value: null,
  registry_row_id: null, registry_quote: null, binding: null, rule_ref: null, fix_class: null, ...over,
});

Deno.test("dedupe — same block + same quote from two workers/vendors merges into one finding with the higher severity", () => {
  const d = dedupeFindings([
    row({ worker: "W-RECORD", vendor: "claude", severity: "editorial" }),
    row({ worker: "W-LAW", vendor: "gpt", severity: "high", quote: "The Company  identifies four benefits and three risks." }),
    row({ worker: "W-REASON", vendor: "gpt", quote: "A different sentence entirely, in another block.", block_key: "iii_analysis:6" }),
    row({ status: "dropped" }),
  ]);
  assertEquals(d.length, 2);
  const merged = d.find((f) => f.block_key === "iv_determination:12")!;
  assertEquals(merged.workers.sort(), ["W-LAW", "W-RECORD"]);
  assertEquals(merged.vendors.sort(), ["claude", "gpt"]);
  assertEquals(merged.severity, "high");
  assertEquals(merged.row_ids.length, 2);
});

const F = (over: Partial<DedupedFinding>): DedupedFinding => ({
  key: "k", id: "f1", row_ids: ["r1"], workers: ["W-RECORD"], vendors: ["claude"], raised_by: ["W-RECORD/claude"],
  block_key: "iv_determination:12", block_key_b: null, quote: "q", quote_b: null, severity: "editorial", kind: null, why: "w",
  intake_key: null, intake_value: null, registry_row_id: null, registry_quote: null, binding: null, is_lint: false, lint_rule: null, ...over,
});
const C = (fix_class: Classification["fix_class"], rule_ref: string | null = "factor_x"): Classification => ({ fix_class, rule_ref, reason: "r" });

Deno.test("gate — the Rev 2 §0A V8 matrix", () => {
  const no = { persists: false, lintCovered: false };
  assertEquals(gate(F({}), C("judgment"), no).route, "ceo_sheet");
  assertEquals(gate(F({}), C("intake_artifact"), no).route, "intake_list");
  // queueable classes: severity, multi-raiser, persistence
  assertEquals(gate(F({ severity: "critical" }), C("rule_bug"), no).queued, true);
  assertEquals(gate(F({ severity: "high" }), C("clause_defect"), no).queued, true);
  assertEquals(gate(F({ severity: "editorial" }), C("rule_bug"), no).route, "observed");
  assertEquals(gate(F({ severity: "editorial", workers: ["W-RECORD", "W-LAW"] }), C("rule_bug"), no).queued, true);
  assertEquals(gate(F({ severity: "editorial", vendors: ["claude", "gpt"] }), C("missing_structured_input"), no).queued, true);
  assertEquals(gate(F({ severity: "editorial" }), C("rule_bug"), { persists: true, lintCovered: false }).queued, true);
  // presentation: lint hits queue; model-raised presentation covered by lint goes to the lint backlog
  assertEquals(gate(F({ is_lint: true, lint_rule: "L-XREF/unresolved_section" }), C("presentation"), no).queued, true);
  assertEquals(gate(F({}), C("presentation"), { persists: false, lintCovered: true }).route, "lint_backlog");
  assertEquals(gate(F({}), C("presentation"), no).queued, true);
});

Deno.test("composite — lint defects cost 2, findings cost their severity weight", () => {
  assertEquals(compositeScore([F({ is_lint: true }), F({ severity: "critical" }), F({ severity: "high" }), F({ severity: "editorial" })]), 100 - 2 - 15 - 7 - 1);
});

// ── Stubbed admin ───────────────────────────────────────────────────────────

function makeAdmin(tables: Record<string, Row[]>) {
  const inserted: Record<string, Row[]> = {};
  const updated: Array<{ table: string; patch: Row; ids: unknown }> = [];
  const q = (table: string) => {
    const filters: Array<(r: Row) => boolean> = [];
    // deno-lint-ignore no-explicit-any
    const self: any = {
      select: () => self,
      eq: (k: string, v: unknown) => { filters.push((r) => r[k] === v); return self; },
      neq: (k: string, v: unknown) => { filters.push((r) => r[k] !== v); return self; },
      is: (k: string, v: unknown) => { filters.push((r) => r[k] === v || (v === null && r[k] == null)); return self; },
      in: (k: string, vs: unknown[]) => { filters.push((r) => vs.includes(r[k])); return self; },
      order: () => self,
      limit: () => self,
      then: (res: (v: unknown) => void, rej: (e: unknown) => void) =>
        Promise.resolve({ data: (tables[table] ?? []).filter((r) => filters.every((f) => f(r))), error: null }).then(res, rej),
      insert: (rec: Row | Row[]) => {
        const recs = Array.isArray(rec) ? rec : [rec];
        (inserted[table] ??= []).push(...recs);
        return { select: () => ({ single: () => Promise.resolve({ data: { id: `${table}-${(inserted[table] ?? []).length}` }, error: null }) }), then: (res: (v: unknown) => void) => Promise.resolve({ error: null }).then(res) };
      },
      update: (patch: Row) => ({ in: (_k: string, ids: unknown) => { updated.push({ table, patch, ids }); return Promise.resolve({ error: null }); }, eq: () => Promise.resolve({ error: null }) }),
    };
    return self;
  };
  return { admin: { from: q }, inserted, updated };
}

Deno.test("classify job — dedupes, classifies through the injected classifier, gates, routes, persists the document verdict", async () => {
  const doc = { batch_id: "b1", tool_slug: "cppa-risk", assessment_id: "doc-1" };
  const { admin, inserted, updated } = makeAdmin({
    ptest_reviews: [
      { ...doc, id: "r1", worker: "W-RECORD", vendor: "claude", error: null },
      { ...doc, id: "r2", worker: "W-LAW", vendor: "claude", error: null },
      { ...doc, id: "r3", worker: "W-LAW", vendor: "gpt", error: "timeout after 330000ms" },
      { ...doc, id: "r4", worker: "W-REASON", vendor: "gpt", error: null },
      { ...doc, id: "r5", worker: "LINT", vendor: null, error: null },
    ],
    ptest_findings: [
      { ...doc, ...row({ id: "a1", worker: "W-RECORD", vendor: "claude", severity: "high", quote: "Q-ONE is the quoted sentence of block twelve.", why: "contradicts q5" }) },
      { ...doc, ...row({ id: "a2", worker: "W-LAW", vendor: "claude", severity: "editorial", quote: "Q-ONE is the quoted sentence of block twelve.", why: "also" }) },
      { ...doc, ...row({ id: "b1", worker: "W-REASON", vendor: "gpt", severity: "editorial", block_key: "iii_analysis:6", quote: "Q-TWO is a lone editorial observation in block six.", why: "lone" }) },
      { ...doc, ...row({ id: "c1", worker: "W-RECORD", vendor: "claude", severity: "editorial", block_key: "ii_information:4", quote: "Q-THREE reports an approval date earlier than the assessment.", why: "intake says so" }) },
      { ...doc, ...row({ id: "l1", worker: "LINT", vendor: null, severity: "editorial", block_key: "iv_determination:8", quote: "Section IV.A names no rendered section", why: "lint", rule_ref: "L-XREF/roman_numeral_scheme" }) },
      { ...doc, ...row({ id: "d1", status: "dropped", quote: "dropped" }) },
    ],
  });
  const classes: Record<string, Classification> = {
    // ids are assigned in dedupe order: f1 (Q-ONE merged), f2 (Q-TWO), f3 (Q-THREE), f4 (lint)
    f1: C("rule_bug", "risk_spi_trigger"),
    f2: C("clause_defect", null),
    f3: C("intake_artifact", null),
  };
  const out = await runClassifyJob(admin, {
    batchId: "b1", tool: "cppa-risk", assessmentId: "doc-1", companyName: "Sierra", effort: "medium",
    classifier: async (_tool, deduped) => ({ classifications: new Map(deduped.map((f) => [f.id, classes[f.id]]).filter(([, c]) => !!c) as Array<[string, Classification]>), model: "stub", usage: null }),
  });
  assertEquals(out.ok, true, JSON.stringify(out.body));
  const rec = inserted.ptest_arbitrations?.[0] as Row;
  assertEquals(rec.arbitration_scope, "document");
  assertEquals(rec.single_reviewer, true, "one worker failed ⇒ partial coverage");
  assertStringIncludes(String(rec.summary), "PARTIAL COVERAGE (W-LAW/gpt");
  const fix = rec.fix_list as Row[];
  const ceo = rec.ceo_sheet as Row[];
  const dropped = rec.dropped as Row[];
  // Q-ONE: rule_bug, high + two workers ⇒ queued. Lint ⇒ queued. Q-TWO: clause_defect editorial single ⇒ observed. Q-THREE ⇒ intake list.
  assertEquals(fix.map((f) => f.fix_class).sort(), ["presentation", "rule_bug"]);
  assertEquals(ceo.length, 0);
  assertEquals(dropped.map((d) => d.kind).sort(), ["intake_list", "observed"]);
  const q1 = fix.find((f) => f.fix_class === "rule_bug")!;
  assertEquals(q1.raised_by, "W-RECORD/claude + W-LAW/claude");
  assertEquals(q1.code_focus, "risk_spi_trigger");
  assertStringIncludes(String(q1.regression_test), "Regenerate assessment doc-1");
  const metrics = rec.metrics as Row;
  assertEquals(metrics.deduped, 4);
  assertEquals((metrics.by_route as Row).fix_list, 2);
  assertEquals(rec.agreed_score, 100 - 7 - 1 - 1 - 2);
  // Every validated row was updated with its class and gate outcome.
  assertEquals(updated.filter((u) => u.table === "ptest_findings").length, 4);
});

Deno.test("classify job — every worker failed ⇒ reviews_failed, nothing persisted", async () => {
  const doc = { batch_id: "b1", tool_slug: "cppa-risk", assessment_id: "doc-1" };
  const { admin, inserted } = makeAdmin({ ptest_reviews: [{ ...doc, worker: "W-RECORD", vendor: "claude", error: "boom" }], ptest_findings: [] });
  const out = await runClassifyJob(admin, { batchId: "b1", tool: "cppa-risk", assessmentId: "doc-1", effort: "medium", classifier: async () => ({ classifications: new Map(), model: null, usage: null }) });
  assertEquals(out.ok, false);
  assertEquals(out.body.error, "reviews_failed");
  assertEquals(inserted.ptest_arbitrations, undefined);
});

Deno.test("merge — unions document verdicts, dedupes the same block+quote across documents, keeps CEO questions once, no model", async () => {
  const entry = (docId: string, id: string, quote: string, extra: Row = {}) => ({
    id, title: "t", status: "queued", raised_by: "W-RECORD/claude", severity: "high", fix_class: "rule_bug", rule_ref: "factor_x",
    occurrences: [{ document_id: docId, product: "cppa-risk", section: "iv_determination:12", quote, block_key: "iv_determination:12" }], ...extra,
  });
  const { admin, inserted } = makeAdmin({
    ptest_arbitrations: [
      { batch_id: "b1", tool_slug: "cppa-risk", arbitration_scope: "document", error: null, assessment_id: "d1", agreed_score: 90, single_reviewer: false, summary: "s",
        fix_list: [entry("d1", "f1", "The same broken sentence template.")], ceo_sheet: [{ id: "c1", question: "Q?", context: "ctx one" }], dropped: [{ id: "o1", kind: "observed", reason: "r" }], metrics: { by_class: { rule_bug: 1 } } },
      { batch_id: "b1", tool_slug: "cppa-risk", arbitration_scope: "document", error: null, assessment_id: "d2", agreed_score: 80, single_reviewer: true, summary: "s",
        fix_list: [entry("d2", "f1", "The same  broken sentence template.", { severity: "critical" }), entry("d2", "f2", "A different sentence.", { rule_ref: null })], ceo_sheet: [{ id: "c1", question: "Q?", context: "ctx one" }], dropped: [], metrics: { by_class: { rule_bug: 2 } } },
      { batch_id: "b1", tool_slug: "cppa-risk", arbitration_scope: "document", error: "failed", assessment_id: "d3", fix_list: [], ceo_sheet: [], dropped: [] },
    ],
  });
  const out = await mergeProductV2(admin, { batchId: "b1", tool: "cppa-risk" });
  assertEquals(out.ok, true);
  const rec = inserted.ptest_arbitrations?.[0] as Row;
  assertEquals(rec.arbitration_scope, "merge");
  assertEquals(rec.model, null);
  const fix = rec.fix_list as Row[];
  assertEquals(fix.length, 2);
  const merged = fix.find((f) => (f.occurrences as Row[]).length === 2)!;
  assertEquals(merged.severity, "critical");
  assertEquals((rec.ceo_sheet as Row[]).length, 1);
  assertEquals(rec.single_reviewer, true);
  assertEquals(rec.agreed_score, 85);
  assert((rec.dropped as Row[]).some((d) => String(d.reason).startsWith("merged into")));
  assertEquals(((rec.metrics as Row).by_class as Row).rule_bug, 3);
});
