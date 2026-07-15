// QL3-P1 tests — incorporation comparator, cache-key components,
// batch doc-snapshot filter, batch decide() transitions.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  checkIncorporation,
  resolvePath,
  GRADER_STAMP,
  medianOrNull,
  emptyGraderSamples,
} from "../ql3-orchestrator/index.ts";
import {
  decideBatchStep,
  snapshotDocs,
  BUILD_STAMP as BATCH_BUILD_STAMP,
} from "../ql3-batch-orchestrator/index.ts";

// ---------- incorporation comparator ----------

Deno.test("incorporation: enum exact-match → pass", () => {
  const report = { q15c_spi_volume: "10k-100k" };
  const register = [{ id: "i1", status: "resolved", target: { path: "q15c_spi_volume" } }];
  const verdicts = [{ item_id: "i1", verdict: "resolved" }];
  const answered = [{ item_id: "i1", value: "10k-100k" }];
  const r = checkIncorporation({ reportData: report, register, verdicts, answered });
  assert(r.pass);
  assertEquals(r.checked[0].result, "pass");
  assertEquals(r.checked[0].kind, "enum");
});

Deno.test("incorporation: enum mismatch → fail", () => {
  const report = { q: "b" };
  const register = [{ id: "i1", status: "resolved", target: { path: "q" } }];
  const verdicts = [{ item_id: "i1", verdict: "resolved" }];
  const answered = [{ item_id: "i1", value: "a" }];
  const r = checkIncorporation({ reportData: report, register, verdicts, answered });
  assert(!r.pass);
  assertEquals(r.checked[0].result, "fail");
});

Deno.test("incorporation: multi-enum subset present → pass, missing → fail", () => {
  const report = { tags: ["x", "y", "z"] };
  const register = [{ id: "i1", status: "resolved", target: { path: "tags" } }];
  const verdicts = [{ item_id: "i1", verdict: "resolved" }];
  const pass = checkIncorporation({
    reportData: report, register, verdicts,
    answered: [{ item_id: "i1", value: ["x", "y"] }],
  });
  assert(pass.pass);
  const fail = checkIncorporation({
    reportData: report, register, verdicts,
    answered: [{ item_id: "i1", value: ["x", "q"] }],
  });
  assert(!fail.pass);
  assertEquals(fail.checked[0].kind, "multi_enum");
});

Deno.test("incorporation: text containment case-insensitive", () => {
  const report = { narrative: "The Controller adopted a Data-Minimisation stance." };
  const register = [{ id: "i1", status: "resolved", target: { path: "narrative" } }];
  const verdicts = [{ item_id: "i1", verdict: "resolved" }];
  const answered = [{ item_id: "i1", value: "data-minimisation" }];
  const r = checkIncorporation({ reportData: report, register, verdicts, answered });
  assert(r.pass);
  assertEquals(r.checked[0].kind, "text");
});

Deno.test("incorporation: unresolvable path → unverifiable (never fail)", () => {
  // cppa-cyber vocabulary drift: ask-path controls.c13_training vs
  // report-shape controls[12].status. We do NOT alias — result must be
  // unverifiable, and pass stays true.
  const report = { controls: [{ status: "Insufficient" }] };
  const register = [{ id: "i1", status: "resolved", target: { path: "controls.c13_training.status" } }];
  const verdicts = [{ item_id: "i1", verdict: "resolved" }];
  const answered = [{ item_id: "i1", value: "Sufficient" }];
  const r = checkIncorporation({ reportData: report, register, verdicts, answered });
  assert(r.pass, "unverifiable never fails the run");
  assertEquals(r.checked[0].result, "unverifiable");
});

Deno.test("incorporation: only inspects resolved verdicts", () => {
  const report = { q: "wrong" };
  const register = [{ id: "i1", status: "not_resolved", target: { path: "q" } }];
  const verdicts = [{ item_id: "i1", verdict: "not_resolved" }];
  const answered = [{ item_id: "i1", value: "expected" }];
  const r = checkIncorporation({ reportData: report, register, verdicts, answered });
  assertEquals(r.checked.length, 0);
  assert(r.pass);
});

Deno.test("resolvePath handles dotted keys and [N] indices", () => {
  const obj = { a: { b: [{ c: 42 }, { c: 7 }] } };
  assertEquals(resolvePath(obj, "a.b[1].c"), 7);
  assertEquals(resolvePath(obj, "a.b.0.c"), 42);
  assertEquals(resolvePath(obj, "a.missing"), undefined);
  assertEquals(resolvePath(obj, null), undefined);
});

// ---------- cache-key construction ----------

Deno.test("grader_stamp is a stable non-empty string (cache key component)", () => {
  assert(typeof GRADER_STAMP === "string" && GRADER_STAMP.length > 0);
});

Deno.test("medianOrNull / emptyGraderSamples helpers", () => {
  assertEquals(medianOrNull([]), null);
  assertEquals(medianOrNull([3, 1, 2]), 2);
  const e = emptyGraderSamples();
  assertEquals(e.claude.length, 0);
  assertEquals(e.gpt.length, 0);
  assertEquals(e.blended.length, 0);
});

// ---------- batch doc snapshot filter ----------

Deno.test("snapshotDocs: only complete + source_row_id, ordered by doc_number", () => {
  const rows = [
    { doc_number: 3, source_row_id: "c", status: "complete" },
    { doc_number: 1, source_row_id: "a", status: "complete" },
    { doc_number: 2, source_row_id: null, status: "complete" },
    { doc_number: 4, source_row_id: "d", status: "error" },
    { doc_number: 5, source_row_id: "e", status: "complete" },
  ];
  const all = snapshotDocs(rows);
  assertEquals(all.map((d) => d.doc_number), [1, 3, 5]);
});

Deno.test("snapshotDocs: single doc_number filter", () => {
  const rows = [
    { doc_number: 1, source_row_id: "a", status: "complete" },
    { doc_number: 2, source_row_id: "b", status: "complete" },
  ];
  const only = snapshotDocs(rows, { doc_number: 2 });
  assertEquals(only.length, 1);
  assertEquals(only[0].doc_number, 2);
});

// ---------- decide() batch transitions ----------

const docs = [
  { doc_number: 1, source_row_id: "a" },
  { doc_number: 2, source_row_id: "b" },
];

Deno.test("decide: cancel wins over everything", () => {
  const d = decideBatchStep({
    cancel_requested: true, current_index: 0, docs,
    current_ql3_run_id: null, current_phase: null, last_phase_change_ms: 0,
  });
  assertEquals(d.kind, "cancel");
});

Deno.test("decide: no run → kickoff current doc", () => {
  const d = decideBatchStep({
    cancel_requested: false, current_index: 0, docs,
    current_ql3_run_id: null, current_phase: null, last_phase_change_ms: 0,
  });
  assertEquals(d.kind, "kickoff");
  if (d.kind === "kickoff") assertEquals(d.doc.doc_number, 1);
});

Deno.test("decide: terminal 'done' → advance", () => {
  const d = decideBatchStep({
    cancel_requested: false, current_index: 0, docs,
    current_ql3_run_id: "r1", current_phase: "done", last_phase_change_ms: 0,
  });
  assertEquals(d.kind, "advance");
});

Deno.test("decide: in-flight and fresh → poll", () => {
  const d = decideBatchStep({
    cancel_requested: false, current_index: 0, docs,
    current_ql3_run_id: "r1", current_phase: "review2", last_phase_change_ms: 60_000,
  });
  assertEquals(d.kind, "poll");
});

Deno.test("decide: no change for >10min → stalled", () => {
  const d = decideBatchStep({
    cancel_requested: false, current_index: 0, docs,
    current_ql3_run_id: "r1", current_phase: "review2", last_phase_change_ms: 11 * 60_000,
  });
  assertEquals(d.kind, "stalled");
});

Deno.test("decide: index past docs → finalize", () => {
  const d = decideBatchStep({
    cancel_requested: false, current_index: 2, docs,
    current_ql3_run_id: null, current_phase: null, last_phase_change_ms: 0,
  });
  assertEquals(d.kind, "finalize");
});

Deno.test("BUILD_STAMPs present", () => {
  assert(typeof BATCH_BUILD_STAMP === "string" && BATCH_BUILD_STAMP.length > 0);
});
