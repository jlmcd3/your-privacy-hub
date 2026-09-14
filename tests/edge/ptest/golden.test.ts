// /all-ptest v2 (DOC 261) — the golden panel: regeneration through the
// production functions (hermetic: invoke and the database are stubbed), the
// two-run determinism check, and the before/after diff.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { GOLDEN_PRODUCTS, generateGoldenOnce, runGenerateJob, type GoldenRow } from "../../../supabase/functions/_shared/review/golden.ts";
import { computeBatchDiff } from "../../../supabase/functions/_shared/review/diff.ts";
import { GOLDEN_PANEL } from "../../../supabase/functions/_shared/review/packs/index.ts";
import { buildGoldenPanelPack } from "../../../scripts/ptest/build-packs.ts";
import { documentJobRows } from "../../../supabase/functions/_shared/review/job-rows.ts";

type Row = Record<string, unknown>;

const doc = (text: string) => ({ skeleton_document: { _typed: "x", spine_version: "v", title: "T", subtitle: "", sections: [{ id: "s", title: "1. S", paragraphs: [{ kind: "generated", text, key: "s:0" }] }] } });

/** A stubbed database: cppa_assessments rows keyed by id, plus insert logs. */
function makeAdmin(seed: Record<string, Row> = {}) {
  const assessments = new Map<string, Row>(Object.entries(seed));
  const inserted: Record<string, Row[]> = {};
  const updated: Row[] = [];
  let nextId = 1;
  const from = (table: string) => {
    let id: string | null = null;
    // deno-lint-ignore no-explicit-any
    const self: any = {
      select: () => self,
      eq: (k: string, v: unknown) => { if (k === "id" || k === "batch_id") id = String(v); return self; },
      maybeSingle: () => {
        if (table === "cppa_assessments") return Promise.resolve({ data: id ? assessments.get(id) ?? null : null, error: null });
        if (table === "ptest_batches") return Promise.resolve({ data: { settings: {} }, error: null });
        return Promise.resolve({ data: null, error: null });
      },
      insert: (rec: Row | Row[]) => {
        const recs = Array.isArray(rec) ? rec : [rec];
        (inserted[table] ??= []).push(...recs);
        if (table === "cppa_assessments") {
          const newId = `row-${nextId++}`;
          assessments.set(newId, { id: newId, ...recs[0], updated_at: "2026-09-14T00:00:00Z" });
          return { select: () => ({ single: () => Promise.resolve({ data: { id: newId }, error: null }) }) };
        }
        return { select: () => ({ single: () => Promise.resolve({ data: { id: "x" }, error: null }) }), then: (res: (v: unknown) => void) => Promise.resolve({ error: null }).then(res) };
      },
      update: (patch: Row) => ({ eq: (_k: string, v: unknown) => { updated.push({ table, id: v, ...patch }); return Promise.resolve({ error: null }); } }),
    };
    return self;
  };
  return { admin: { from }, assessments, inserted, updated };
}

const golden = (product: string, over: Partial<GoldenRow> = {}): GoldenRow => ({
  id: "g1", product, source: "fixture", ref: "risk-perfect-complete", label: "Sierra", intake_data: { entity_name: "Sierra" },
  module: null, assessment_id: null, enabled: true, ...over,
});

Deno.test("golden — the panel pack seeds from the *_PERFECT cases and equals a rebuild", () => {
  assertEquals(GOLDEN_PANEL, buildGoldenPanelPack());
  const products = new Set(GOLDEN_PANEL.entries.map((e) => e.product));
  assertEquals([...products].sort(), ["cppa-admt", "cppa-cyber", "cppa-risk"]);
  assert(GOLDEN_PANEL.entries.every((e) => Object.keys(e.intake_data).length > 0), "every seed carries an intake");
  assert(GOLDEN_PANEL.entries.length >= 6, `${GOLDEN_PANEL.entries.length} seeds`);
  for (const p of Object.keys(GOLDEN_PRODUCTS)) assert(GOLDEN_PANEL.entries.some((e) => e.product === p), p);
});

Deno.test("generateGoldenOnce — risk creates the panel row once, invokes by assessment id with the report date, waits for completion", async () => {
  const { admin, inserted, updated } = makeAdmin();
  const calls: Array<{ fn: string; body: Row }> = [];
  const deps = {
    admin,
    invoke: async (fn: string, body: Row) => {
      calls.push({ fn, body });
      // The function completes in the background: flip the row.
      const id = String(body.assessment_id);
      const row = (admin as unknown as { from: (t: string) => unknown }); void row;
      return { accepted: true, assessment_id: id };
    },
    sleep: async () => {},
    now: () => 0,
    pollTimeoutMs: 100,
  };
  // Complete the row on the first poll by seeding the stub after insert.
  const g = golden("cppa-risk");
  const p = generateGoldenOnce({
    ...deps,
    admin: {
      from: (t: string) => {
        const base = admin.from(t);
        if (t === "cppa_assessments") {
          const origMaybe = base.maybeSingle;
          base.maybeSingle = () => origMaybe().then((r: { data: Row | null }) => {
            if (r.data && calls.length) return { data: { ...r.data, status: "complete", updated_at: "2026-09-14T00:00:05Z", report_data: doc("Hello Sierra.") }, error: null };
            return r;
          });
        }
        return base;
      },
    },
  }, g, { userId: "u1", reportDate: "2031-03-05" });
  const out = await p;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].fn, "run-cppa-risk-assessment-v2");
  assertEquals(calls[0].body.report_date, "2031-03-05");
  assertEquals(calls[0].body.assessment_id, "row-1");
  assertEquals(out.assessmentId, "row-1");
  assert(/^[0-9a-f]{64}$/.test(out.hash));
  assertEquals(inserted.cppa_assessments?.[0].module, "risk_assessment");
  assert(updated.some((u) => u.table === "ptest_golden_intakes" && u.assessment_id === "row-1"), "the golden row records its panel assessment id");
});

Deno.test("generateGoldenOnce — ADMT invokes by direct intake (V3 dark) with the report date and reads the synchronous report", async () => {
  const { admin } = makeAdmin();
  const calls: Array<{ fn: string; body: Row }> = [];
  const out = await generateGoldenOnce({
    admin,
    invoke: async (fn: string, body: Row) => { calls.push({ fn, body }); return { assessment_id: "admt-9", status: "complete", report_data: doc("ADMT text.") }; },
    sleep: async () => {}, now: () => 0,
  }, golden("cppa-admt", { ref: "admt-hr-perfect-record" }), { userId: "u1", reportDate: "2031-03-05" });
  assertEquals(calls[0].fn, "run-admt-checker-v2");
  assertEquals(calls[0].body.assessment_id, undefined);
  assertEquals((calls[0].body.intake_data as Row).entity_name, "Sierra");
  assertEquals(calls[0].body.report_date, "2031-03-05");
  assertEquals(out.assessmentId, "admt-9");
});

Deno.test("runGenerateJob — identical runs enqueue the document's review jobs; divergent runs fail the job with the first divergent line and enqueue nothing", async () => {
  const mk = (texts: string[]) => {
    const { admin, inserted } = makeAdmin();
    let n = 0;
    const deps = {
      admin,
      invoke: async () => ({ assessment_id: `admt-${++n}`, status: "complete", report_data: doc(texts[n - 1]) }),
      sleep: async () => {}, now: () => n * 10,
    };
    return { deps, inserted };
  };
  const ok = mk(["Same text.", "Same text."]);
  const r1 = await runGenerateJob(ok.deps, { batchId: "b1", jobId: "j1", golden: golden("cppa-admt"), userId: "u", reportDate: "2031-03-05", reviewEffort: "high", classifyEffort: "medium" });
  assertEquals(r1.ok, true);
  assertEquals(r1.determinism?.ok, true);
  assertEquals(r1.assessmentId, "admt-2");
  assertEquals(ok.inserted.ptest_generations?.length, 2);
  assertEquals(ok.inserted.ptest_jobs?.map((j) => j.kind), ["lint", "review_record", "review_law_claude", "review_law_gpt", "review_reason", "classify"]);
  assert(ok.inserted.ptest_jobs!.every((j) => j.golden_id === "g1" && j.assessment_id === "admt-2"));

  const bad = mk(["Line one.\nLine two.", "Line one.\nLine TWO changed."]);
  const r2 = await runGenerateJob(bad.deps, { batchId: "b1", jobId: "j1", golden: golden("cppa-admt"), userId: "u", reportDate: "2031-03-05", reviewEffort: "high", classifyEffort: "medium" });
  assertEquals(r2.ok, false);
  assertEquals(r2.determinism?.ok, false);
  assertStringIncludes(r2.error ?? "", "determinism_mismatch");
  assertEquals(r2.determinism?.divergence?.a, "Line two.");
  assertEquals(r2.determinism?.divergence?.b, "Line TWO changed.");
  assertEquals(bad.inserted.ptest_jobs, undefined);
});

Deno.test("documentJobRows — carries the golden id on every job", () => {
  const rows = documentJobRows({ batchId: "b", userId: "u", tool: "cppa-risk", assessmentId: "a", companyName: "L", goldenId: "g", reviewEffort: "high", classifyEffort: "medium" });
  assertEquals(rows.length, 6);
  assert(rows.every((r) => r.golden_id === "g"));
});

Deno.test("diff — gone / persists / new per golden, lint by rule, settings gate, acceptance rule", async () => {
  const S = { mode: "v2", prompt_version: "p", vendors: {}, determinism: {}, review_effort: "high", classify_effort: "medium" };
  const f = (batch: string, golden: string, block: string, quote: string, over: Row = {}) => ({
    batch_id: batch, golden_ref: golden, assessment_id: `${golden}-${batch}`, tool_slug: "cppa-risk", worker: "W-RECORD", vendor: "claude",
    status: "validated", block_key: block, quote, severity: "high", fix_class: "rule_bug", route: "fix_list", lint_rule: null, ...over,
  });
  const tables: Record<string, Row[]> = {
    ptest_batches: [{ batch_id: "A", settings: S }, { batch_id: "B", settings: S }, { batch_id: "C", settings: { ...S, prompt_version: "q" } }],
    ptest_findings: [
      f("A", "g1", "k:1", "Gone after the fix."),
      f("A", "g1", "k:2", "Still here.", { route: "observed", severity: "editorial" }),
      f("A", "g1", "k:9", "lint", { worker: "LINT", vendor: null, lint_rule: "L-XREF", route: null }),
      f("B", "g1", "k:2", "Still  here.", { route: "observed", severity: "editorial" }),
      f("B", "g1", "k:3", "Brand new and critical.", { severity: "critical" }),
    ],
    ptest_arbitrations: [
      { batch_id: "A", arbitration_scope: "document", error: null, assessment_id: "g1-A", tool_slug: "cppa-risk", agreed_score: 80, metrics: { by_route: { fix_list: 1, observed: 1 } } },
      { batch_id: "B", arbitration_scope: "document", error: null, assessment_id: "g1-B", tool_slug: "cppa-risk", agreed_score: 84, metrics: { by_route: { fix_list: 1, observed: 1 } } },
    ],
    ptest_golden_intakes: [{ id: "g1", product: "cppa-risk", label: "Sierra" }],
  };
  const admin = {
    from(table: string) {
      const filters: Array<(r: Row) => boolean> = [];
      // deno-lint-ignore no-explicit-any
      const self: any = {
        select: () => self,
        eq: (k: string, v: unknown) => { filters.push((r) => r[k] === v); return self; },
        in: (k: string, vs: unknown[]) => { filters.push((r) => vs.includes(r[k])); return self; },
        is: (k: string, v: unknown) => { filters.push((r) => v === null ? r[k] == null : r[k] === v); return self; },
        then: (res: (v: unknown) => void, rej: (e: unknown) => void) => Promise.resolve({ data: (tables[table] ?? []).filter((r) => filters.every((x) => x(r))), error: null }).then(res, rej),
      };
      return self;
    },
  };
  const d = await computeBatchDiff(admin, "A", "B");
  assertEquals(d.comparable, true);
  assertEquals(d.goldens.length, 1);
  const g = d.goldens[0];
  assertEquals(g.gone.map((x) => x.block_key), ["k:1"]);
  assertEquals(g.persists.map((x) => x.block_key), ["k:2"]);
  assertEquals(g.new.map((x) => x.block_key), ["k:3"]);
  assertEquals(g.lint_before, { "L-XREF": 1 });
  assertEquals(g.lint_after, {});
  assertEquals([g.composite_before, g.composite_after], [80, 84]);
  assertEquals(d.accepted, false, "a new critical finding blocks acceptance");
  assertStringIncludes(d.acceptance_note, "1 new critical/high");

  const dc = await computeBatchDiff(admin, "A", "C");
  assertEquals(dc.comparable, false);
  assertStringIncludes(dc.settings_note ?? "", "prompt_version");
});
