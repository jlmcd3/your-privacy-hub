// /all-ptest v2 (DOC 261) — workers, prompts, document blocks, lint job and
// the driver's v2 job set. Hermetic: no model, no database.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { WORKER_JOB_KINDS, WORKER_KIND_LIST, findingRows, reviewerLabel, workerOfKind } from "../../../supabase/functions/ptest-run-driver/_local/review/workers.ts";
import { WORKER_VENDORS, buildWorkerSystemPrompt, buildWorkerUserTurn, type WorkerId } from "../../../supabase/functions/ptest-run-driver/_local/review/prompts-v2.ts";
import { W_LAW_JSON_SCHEMA, W_REASON_JSON_SCHEMA, W_RECORD_JSON_SCHEMA, CLASSIFY_JSON_SCHEMA } from "../../../supabase/functions/ptest-run-driver/_local/review/json-schemas-v2.ts";
import { blockTextMap, composedListOf, extractBlocks, intakeKeysForBlock, renderBlocksText, renderComposedList } from "../../../supabase/functions/ptest-run-driver/_local/review/document-blocks.ts";
import { runLintJob } from "../../../supabase/functions/ptest-run-driver/_local/review/lint-job.ts";
import { v2JobRows } from "../../../supabase/functions/ptest-run-driver/index.ts";
import { generateCppaRiskReport } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/generate-cppa-risk.ts";
import { CPPA_RISK_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-risk.ts";

type Bag = Record<string, unknown>;

const riskReport = async (): Promise<Bag> => {
  const gen = await generateCppaRiskReport(CPPA_RISK_PERFECT[0].intake as Bag, {
    buildStamp: "workers-test", pass1: "deterministic", pass2rEnabled: false, refinementEnabled: false, euCorpus: [], reportDate: "2026-09-14",
  });
  return gen.report as Bag;
};

Deno.test("workers — the job kinds cover exactly the fixed vendor map (Rev 2 §0A V5)", () => {
  const pairs = Object.values(WORKER_JOB_KINDS).map((w) => `${w.worker}/${w.vendor}`).sort();
  const expected = (Object.keys(WORKER_VENDORS) as WorkerId[]).flatMap((w) => WORKER_VENDORS[w].map((v) => `${w}/${v}`)).sort();
  assertEquals(pairs, expected);
  assertEquals(WORKER_KIND_LIST.length, 4);
  assertEquals(workerOfKind("review_law_gpt"), { worker: "W-LAW", vendor: "gpt" });
  assertEquals(workerOfKind("review_gpt"), null);
  assertEquals(reviewerLabel("W-LAW", "claude"), "W-LAW/claude");
  assertEquals(reviewerLabel("LINT", null), "LINT");
});

Deno.test("prompts — system prompts are static per product (no dates, no ids); W-LAW carries the registry pack and catalogue; W-RECORD only carries the intake in the user turn", () => {
  for (const w of ["W-RECORD", "W-LAW", "W-REASON"] as WorkerId[]) {
    const s1 = buildWorkerSystemPrompt(w, "cppa-risk");
    const s2 = buildWorkerSystemPrompt(w, "cppa-risk");
    assertEquals(s1, s2);
    assert(!/\d{4}-\d{2}-\d{2}T/.test(s1), "no timestamps in a cached prefix");
    assert(!/[0-9a-f]{8}-[0-9a-f]{4}-/.test(s1), "no ids in a cached prefix");
    assertStringIncludes(s1, `worker ${w}`);
  }
  const law = buildWorkerSystemPrompt("W-LAW", "cppa-risk");
  assertStringIncludes(law, "REGISTRY PACK — cppa-risk");
  assertStringIncludes(law, "BLOCK CATALOGUE — cppa-risk");
  assertStringIncludes(law, "ROW ra_when_required");
  assert(law.length < 120_000, `W-LAW system prompt is ${law.length} chars`);
  assert(!buildWorkerSystemPrompt("W-RECORD", "cppa-risk").includes("REGISTRY PACK"));
  const admtLaw = buildWorkerSystemPrompt("W-LAW", "cppa-admt");
  assertStringIncludes(admtLaw, "BLOCK CATALOGUE — cppa-admt");
  assertStringIncludes(admtLaw, "records no per-block provenance yet");
  assertStringIncludes(buildWorkerSystemPrompt("W-LAW", "cppa-cyber"), "BLOCK CATALOGUE — cppa-cyber");
  assert(buildWorkerSystemPrompt("W-LAW", "cppa-cyber").length < 120_000);

  const doc = { tool: "cppa-risk", intakeJson: "{\"entity_name\":\"X\"}", composedListText: "COMPOSED", blocksText: "[a:0] text", truncated: false };
  assertStringIncludes(buildWorkerUserTurn("W-RECORD", doc), "INTAKE (the facts");
  assert(!buildWorkerUserTurn("W-LAW", doc).includes("INTAKE (the facts"));
  assert(!buildWorkerUserTurn("W-REASON", doc).includes("COMPOSED"));
  assertStringIncludes(buildWorkerUserTurn("W-LAW", { ...doc, hydratedRegistryText: "ROW x | y | \"z\"" }), "REGISTRY TEXT (verbatim");
});

Deno.test("schemas — every worker schema names a block key and a quote as required; the classifier enumerates the six classes", () => {
  const req = (s: { schema: Record<string, unknown> }) => ((s.schema.properties as Bag).findings as Bag).items as { required: string[] };
  assert(req(W_RECORD_JSON_SCHEMA).required.includes("block_key") && req(W_RECORD_JSON_SCHEMA).required.includes("intake_key"));
  assert(req(W_LAW_JSON_SCHEMA).required.includes("block_key") && req(W_LAW_JSON_SCHEMA).required.includes("binding"));
  assert(req(W_REASON_JSON_SCHEMA).required.includes("block_key_a") && req(W_REASON_JSON_SCHEMA).required.includes("quote_a"));
  const cls = (((CLASSIFY_JSON_SCHEMA.schema.properties as Bag).classifications as Bag).items as Bag).properties as Bag;
  assertEquals((cls.fix_class as { enum: string[] }).enum.length, 6);
});

Deno.test("document blocks — a fresh risk report yields keyed blocks, a composed list, and intake keys per block", async () => {
  const report = await riskReport();
  const blocks = extractBlocks(report);
  assert(blocks.length > 80, `${blocks.length} blocks`);
  assert(blocks.every((b) => !b.synthetic_key), "every block carries a real key");
  const text = renderBlocksText(blocks);
  assertStringIncludes(text, "[iv_determination:1] TABLE");
  assertStringIncludes(text, "## 4. The Balance and the Determination");
  const composed = composedListOf(report);
  assert(composed.length > 20, `${composed.length} composed rows`);
  const keys = blockTextMap(blocks);
  for (const c of composed) assert(keys.has(c.block_key), `composed block ${c.block_key} is rendered`);
  const listed = renderComposedList(composed);
  assertStringIncludes(listed, "| factors:");
  const anyBlock = composed.find((c) => c.sources.some((s) => s.startsWith("INTAKE:")))!;
  assert(intakeKeysForBlock(composed, anyBlock.block_key).length > 0);
});

Deno.test("document blocks — a legacy report without keys still yields synthetic keys and an empty composed list", () => {
  const legacy = { skeleton_document: { sections: [{ id: "s", title: "1. S", paragraphs: [{ kind: "generated", text: "Hello world." }] }] } };
  const blocks = extractBlocks(legacy);
  assertEquals(blocks.map((b) => [b.key, b.synthetic_key]), [["s#p0", true]]);
  assertEquals(composedListOf(legacy), []);
  assertStringIncludes(renderComposedList([]), "no composed list");
});

Deno.test("findingRows — validated, dropped and unbound rows carry worker, vendor, status and evidence", () => {
  const rows = findingRows(
    { batchId: "b", tool: "cppa-risk", assessmentId: "d", worker: "W-LAW", vendor: "gpt", jobId: "j" },
    [{ id: "f1", worker: "W-LAW", kind: null, severity: "high", confidence: "high", block_key: "k", quote: "q", why: "w", intake_key: null, intake_value: null, registry_row_id: "r", registry_quote: "rq", binding: "bound", block_key_b: null, quote_b: null, reanchored: false }],
    [{ id: "f2", worker: "W-LAW", reason: "misquoted_registry", quote: "q2", detail: "d" }],
    [{ block_key: "k2", quote: "q3", proposed_row_id: "r2", consistent: true, note: null, locatable: true }],
  );
  assertEquals(rows.map((r) => r.status), ["validated", "dropped", "unbound"]);
  assertEquals(rows[0].registry_row_id, "r");
  assertEquals(rows[1].drop_reason, "misquoted_registry");
  assertEquals(rows[2].binding, "consistent");
  assert(rows.every((r) => r.worker === "W-LAW" && r.vendor === "gpt" && r.job_id === "j"));
});

Deno.test("findingRows — every row carries a boolean `reanchored`, so a bulk insert never sends null into the NOT NULL column (doc 267 §3b)", () => {
  const rows = findingRows(
    { batchId: "b", tool: "dpia", assessmentId: "d", worker: "W-LAW", vendor: "claude", jobId: "j" },
    // deno-lint-ignore no-explicit-any
    [{ id: "f1", worker: "W-LAW", kind: null, severity: "high", confidence: "high", block_key: "k", quote: "q", why: "w", intake_key: null, intake_value: null, registry_row_id: "r", registry_quote: "rq", binding: "bound", block_key_b: null, quote_b: null, reanchored: undefined as any }],
    [{ id: "f2", worker: "W-LAW", reason: "misquoted_registry", quote: "q2", detail: "d" }],
    [{ block_key: "k2", quote: "q3", proposed_row_id: null, consistent: false, note: "n", locatable: false }],
  );
  assertEquals(rows.length, 3);
  assert(rows.every((r) => typeof r.reanchored === "boolean"), "each row must carry reanchored as a boolean");
  // PostgREST unions the keys of a bulk insert: a key present on one row and
  // absent on another arrives as null on the latter, not as the column default.
  const keys = rows.map((r) => Object.keys(r).includes("reanchored"));
  assertEquals(keys, [true, true, true]);
});

Deno.test("lint job — persists a LINT review row and one finding per hit, with the document hash (stubbed admin)", async () => {
  const report = await riskReport();
  const inserted: Record<string, Bag[]> = {};
  const admin = {
    from(table: string) {
      // deno-lint-ignore no-explicit-any
      const self: any = {
        select: () => self, eq: () => self,
        maybeSingle: () => Promise.resolve({ data: { id: "doc-1", status: "complete", report_data: report, intake_data: CPPA_RISK_PERFECT[0].intake }, error: null }),
        insert: (rec: Bag | Bag[]) => { (inserted[table] ??= []).push(...(Array.isArray(rec) ? rec : [rec])); return Promise.resolve({ error: null }); },
      };
      return self;
    },
  };
  const out = await runLintJob(admin, { tool: "cppa-risk", assessmentId: "doc-1", batchId: "b1", companyName: "Sierra" });
  assertEquals(out.ok, true);
  const review = inserted.ptest_reviews?.[0] as Bag;
  assertEquals(review.reviewer, "LINT");
  assertEquals(review.worker, "LINT");
  assert(/^[0-9a-f]{64}$/.test(String((review.usage as Bag).document_hash)));
  const hits = (review.findings as Bag[]).length;
  assertEquals((inserted.ptest_findings ?? []).length, hits);
  if (hits) assertEquals((inserted.ptest_findings![0] as Bag).fix_class, "presentation");
});

Deno.test("driver — the v2 job set is lint + four workers + classify per document, a generate job per golden, and one merge per product", () => {
  const rows = v2JobRows({
    batchId: "b", userId: "u", reviewEffort: "high", classifyEffort: "medium",
    documents: [
      { tool: "cppa-risk", assessment_id: "d1", company_name: "A" },
      { tool: "cppa-risk", assessment_id: "d2", company_name: "B" },
      { tool: "cppa-admt", assessment_id: "d3", company_name: "C" },
    ],
    goldens: [{ id: "g1", product: "cppa-cyber", label: "Northwind" }],
  });
  assertEquals(rows.length, 3 * 6 + 1 + 3);
  const gen = rows.find((r) => r.kind === "generate")!;
  assertEquals([gen.tool_slug, gen.golden_id, gen.assessment_id], ["cppa-cyber", "g1", null]);
  assertEquals(rows.filter((r) => r.kind === "arb_merge").map((r) => r.tool_slug).sort(), ["cppa-admt", "cppa-cyber", "cppa-risk"]);
  const fresh = v2JobRows({ batchId: "b", userId: "u", reviewEffort: "high", classifyEffort: "medium", documents: [{ tool: "cppa-risk", assessment_id: "d1", company_name: "A" }] });
  assertEquals(fresh.length, 7);
  const kindsFor = (id: string) => rows.filter((r) => r.assessment_id === id).map((r) => r.kind);
  assertEquals(kindsFor("d1"), ["lint", "review_record", "review_law_claude", "review_law_gpt", "review_reason", "classify"]);
  assertEquals(rows.find((r) => r.kind === "classify")?.effort, "medium");
  assertEquals(rows.find((r) => r.kind === "lint")?.effort, "low");
  assertEquals(rows.find((r) => r.kind === "review_law_gpt")?.effort, "high");
});
