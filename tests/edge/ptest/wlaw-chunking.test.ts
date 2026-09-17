// /all-ptest v2 (DOC 263, 2026-09-17) — W-LAW CHUNKING + CONTINUATION JOBS.
//
// The gpt vendor at effort "high" took 240-360s over documents past ~20,000
// chars against the old single, whole-document call; W-LAW now reviews a
// document in <=WLAW_CHUNK_CHARS block chunks, one model call per chunk, and
// hands any chunk left over when the job's own wall-clock budget
// (WLAW_JOB_BUDGET_MS) runs out to a freshly queued continuation job. See
// supabase/functions/ptest-run-driver/_local/review/workers.ts for the full
// design note above chunkBlocks/runWLawJob.
//
// Hermetic: stubbed admin (no database), stubbed fetch + AbortSignal.timeout
// (no network). The stub-admin shape mirrors the "lint job" test in
// tests/edge/ptest/workers.test.ts.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  chunkBlocks,
  normaliseRowKeys,
  runWorkerJob,
  WLAW_CALL_TIMEOUT_MS,
  WLAW_CHUNK_CHARS,
  WLAW_JOB_BUDGET_MS,
} from "../../../supabase/functions/ptest-run-driver/_local/review/workers.ts";

type Bag = Record<string, unknown>;

// ── chunkBlocks ──────────────────────────────────────────────────────────────

Deno.test("chunkBlocks — groups contiguous blocks by rendered size, in order, without exceeding maxChars", () => {
  const blocks = ["a", "b", "c", "d", "e"].map((key) => ({ key, text: "x".repeat(4000) }));
  const groups = chunkBlocks(blocks, (b) => b.text.length, 10_000);
  assertEquals(groups.map((g) => g.map((b) => b.key)), [["a", "b"], ["c", "d"], ["e"]]);
  // Every group's own summed length stays inside the cap.
  for (const g of groups) assert(g.reduce((n, b) => n + b.text.length, 0) <= 10_000);
});

Deno.test("chunkBlocks — a single block larger than maxChars is never split and becomes its own group", () => {
  const blocks = [
    { key: "a", text: "x".repeat(100) },
    { key: "huge", text: "x".repeat(50_000) },
    { key: "b", text: "x".repeat(100) },
  ];
  const groups = chunkBlocks(blocks, (b) => b.text.length, 10_000);
  assertEquals(groups.map((g) => g.map((b) => b.key)), [["a"], ["huge"], ["b"]]);
});

Deno.test("chunkBlocks — an empty block list returns [], and no group is ever empty", () => {
  assertEquals(chunkBlocks([], () => 0), []);
  const groups = chunkBlocks([{ key: "a", text: "x".repeat(9_999) }], (b) => b.text.length, 10_000);
  assert(groups.every((g) => g.length > 0));
});

// ── normaliseRowKeys ─────────────────────────────────────────────────────────

Deno.test("normaliseRowKeys — every row gets the union of every row's keys, with `reanchored` filled false where missing", () => {
  const rows = normaliseRowKeys([
    { a: 1, reanchored: true },
    { b: 2 },
  ]);
  assertEquals(rows, [
    { a: 1, reanchored: true, b: null },
    { b: 2, a: null, reanchored: false },
  ]);
});

Deno.test("normaliseRowKeys — `queued` is never added to a row that did not already carry it", () => {
  const rows = normaliseRowKeys([
    { a: 1, queued: true },
    { a: 2 },
  ]);
  assertEquals(rows[0], { a: 1, queued: true });
  assertEquals(rows[1], { a: 2 });
});

// ── runWorkerJob (W-LAW) — chunked continuation-job flow ────────────────────
//
// The document has three sections, each one paragraph of a distinct filler
// word repeated well past WLAW_CHUNK_CHARS on its own — so each section is
// guaranteed to land in its own chunk regardless of the exact constant, and
// the fetch stub can tell which chunk a call is for by which filler word
// appears in the request body's user turn.
const FILLERS = ["ALPHA", "BRAVO", "CHARLIE"];

function bigFillerParagraphText(filler: string): string {
  const reps = Math.ceil(WLAW_CHUNK_CHARS / (filler.length + 1)) + 100;
  return `${filler} `.repeat(reps);
}

function threeChunkReport(): Bag {
  return {
    skeleton_document: {
      sections: FILLERS.map((f, i) => ({
        id: `s${i}`,
        title: `${i + 1}. Section ${f}`,
        paragraphs: [{ key: `s${i}:0`, text: bigFillerParagraphText(f) }],
      })),
    },
  };
}

/** The fake model answer for one chunk: one W-LAW finding quoting that
 *  chunk's own filler text, unbound (so no registry-row lookup is needed). */
function fakeFindingsFor(chunk: number): Bag {
  const f = FILLERS[chunk];
  return {
    findings: [{
      id: "f1",
      block_key: `s${chunk}:0`,
      quote: `${f} ${f} ${f} ${f}`,
      severity: "high",
      binding: "unbound",
      divergence: `chunk ${chunk} finding`,
    }],
  };
}

function stubAdmin(report: Bag, inserted: Record<string, Bag[]>) {
  return {
    from(table: string) {
      // deno-lint-ignore no-explicit-any
      const self: any = {
        select: () => self,
        eq: () => self,
        maybeSingle: () => Promise.resolve({ data: { id: "doc-1", status: "complete", report_data: report, intake_data: {} }, error: null }),
        insert: (rec: Bag | Bag[]) => {
          (inserted[table] ??= []).push(...(Array.isArray(rec) ? rec : [rec]));
          return Promise.resolve({ error: null });
        },
      };
      return self;
    },
  };
}

/** Runs `run` with `fetch` and `AbortSignal.timeout` stubbed: `fetch` never
 *  hits the network — it inspects the Anthropic request body to work out
 *  which chunk the call is for (by filler word) and answers with that
 *  chunk's fake finding; `AbortSignal.timeout` is wrapped only to RECORD the
 *  ms every call site asks for (still returns a real signal). */
async function withStubbedNetwork<T>(
  run: () => Promise<T>,
): Promise<{ result: T; calls: Array<{ chunk: number; hasPartNote: boolean }>; timeouts: number[] }> {
  // Lead review: the call layer refuses to fetch without a vendor key, so the
  // stub keys go in first (the same pattern as model-ab-resurrect-model.test.ts).
  for (const [k, v] of [["ANTHROPIC_API_KEY", "stub-anthropic-key"], ["OPENAI_API_KEY", "stub-openai-key"]] as const) {
    if (!Deno.env.get(k)) Deno.env.set(k, v);
  }
  const realFetch = globalThis.fetch;
  const realTimeout = AbortSignal.timeout;
  const calls: Array<{ chunk: number; hasPartNote: boolean }> = [];
  const timeouts: number[] = [];
  // deno-lint-ignore no-explicit-any
  (AbortSignal as any).timeout = (ms: number) => {
    timeouts.push(ms);
    return realTimeout.call(AbortSignal, ms);
  };
  // deno-lint-ignore no-explicit-any
  (globalThis as any).fetch = (_url: unknown, init: any) => {
    const body = JSON.parse(String(init?.body ?? "{}"));
    const userText = String(body?.messages?.[0]?.content ?? "");
    const chunk = FILLERS.findIndex((f) => userText.includes(`${f} ${f} ${f} ${f}`));
    if (chunk === -1) throw new Error(`test stub: could not identify the chunk from the request body (${userText.slice(0, 200)})`);
    calls.push({ chunk, hasPartNote: userText.includes("DOCUMENT PART") });
    const answer = { content: [{ type: "text", text: JSON.stringify(fakeFindingsFor(chunk)) }], usage: { input_tokens: 111, output_tokens: 22 } };
    return Promise.resolve(new Response(JSON.stringify(answer), { status: 200, headers: { "content-type": "application/json" } }));
  };
  try {
    const result = await run();
    return { result, calls, timeouts };
  } finally {
    globalThis.fetch = realFetch;
    // deno-lint-ignore no-explicit-any
    (AbortSignal as any).timeout = realTimeout;
  }
}

Deno.test("runWorkerJob (W-LAW) — reviews a 3-chunk document in one call per chunk when the job's budget never runs out, and merges every part into one review row", async () => {
  const inserted: Record<string, Bag[]> = {};
  const admin = stubAdmin(threeChunkReport(), inserted);

  const { result: out, calls, timeouts } = await withStubbedNetwork(() =>
    runWorkerJob(admin, {
      tool: "cppa-risk", assessmentId: "doc-1", batchId: "b1", companyName: "Acme",
      effort: "high", worker: "W-LAW", vendor: "claude", userId: "u1", jobId: "job-1",
      kind: "review_law_claude", goldenId: null, maxAttempts: 2, payload: null,
      // sub-case (a): the clock never advances past the budget, so all three
      // chunks are called inside this one invocation.
      _now: () => 0,
    })
  );

  assertEquals(calls.map((c) => c.chunk).sort(), [0, 1, 2], "one call per chunk, budget never exhausted");
  assert(calls.every((c) => c.hasPartNote), "a multi-chunk review's user turn always carries the DOCUMENT PART note");
  assert(timeouts.length > 0 && timeouts.every((ms) => ms === WLAW_CALL_TIMEOUT_MS), `every W-LAW call must use WLAW_CALL_TIMEOUT_MS (200000), got ${JSON.stringify(timeouts)}`);

  assertEquals(out.ok, true);
  assertEquals(out.body.continued, undefined, "a completed review never reports `continued`");
  assertEquals(inserted.ptest_jobs, undefined, "no continuation job when every chunk lands in one invocation");

  // sub-case (c): one merged review row, usage.chunks === 3, ids carry c0-/c1-/c2-.
  const review = inserted.ptest_reviews?.[0] as Bag;
  assert(review, "the merged W-LAW review row must be written");
  assertEquals((review.usage as Bag).chunks, 3);
  assert(Number((review.usage as Bag).document_chars) > 3 * WLAW_CHUNK_CHARS, "document_chars should be the whole document, not one chunk");
  assertStringIncludes(String(review.score_notes), "W-LAW reviewed in 3 parts");
  const ids = (review.findings as Bag[]).map((f) => f.id as string).sort();
  assertEquals(ids, ["c0-f1", "c1-f1", "c2-f1"]);

  const findingRowIds = (inserted.ptest_findings ?? []).map((r) => r.finding_id as string).sort();
  assertEquals(findingRowIds, ["c0-f1", "c1-f1", "c2-f1"]);
});

Deno.test("runWorkerJob (W-LAW) — inserts one continuation job and writes no review row when the job's budget runs out after the first chunk", async () => {
  const inserted: Record<string, Bag[]> = {};
  const admin = stubAdmin(threeChunkReport(), inserted);

  // sub-case (b): the clock reports 0 for the initial `started` read, then a
  // value already past WLAW_JOB_BUDGET_MS on every later read — the budget
  // check never fires for chunk 0 itself (i === startChunk), only once the
  // loop tries to move on to chunk 1.
  let nowCalls = 0;
  const _now = () => {
    nowCalls += 1;
    return nowCalls === 1 ? 0 : WLAW_JOB_BUDGET_MS + 1_000;
  };

  const { result: out, calls } = await withStubbedNetwork(() =>
    runWorkerJob(admin, {
      tool: "cppa-risk", assessmentId: "doc-1", batchId: "b1", companyName: "Acme",
      effort: "high", worker: "W-LAW", vendor: "claude", userId: "u1", jobId: "job-1",
      kind: "review_law_claude", goldenId: "g1", maxAttempts: 3, payload: null,
      _now,
    })
  );

  assertEquals(calls.map((c) => c.chunk), [0], "only the first chunk is called before the budget check stops the loop");

  assertEquals(out.ok, true);
  assertEquals(out.body.continued, true);
  assertEquals(out.body.next_chunk, 1);
  assertEquals(out.body.chunks, 3);
  assertEquals(out.body.worker, "W-LAW");
  assertEquals(out.body.vendor, "claude");

  assertEquals(inserted.ptest_reviews, undefined, "a continuation job writes no review row");
  assertEquals(inserted.ptest_findings, undefined, "a continuation job writes no finding rows");

  const job = inserted.ptest_jobs?.[0] as Bag;
  assert(job, "a continuation ptest_jobs row must be inserted");
  assertEquals(job.status, "queued");
  assertEquals(job.attempts, 0);
  assertEquals(job.kind, "review_law_claude");
  assertEquals(job.batch_id, "b1");
  assertEquals(job.tool_slug, "cppa-risk");
  assertEquals(job.golden_id, "g1");
  assertEquals(job.max_attempts, 3);
  assertStringIncludes(String(job.note), "chunk 1 of 3");
  const payload = job.payload as Bag;
  assertEquals(payload.wlaw_chunk, 1);
  assertEquals(payload.wlaw_chunks_total, 3);
  assertEquals(payload.wlaw_parent_job_id, "job-1");
  assertEquals((payload.wlaw_parts as Bag[]).length, 1);
  assertEquals(((payload.wlaw_parts as Bag[])[0] as Bag).chunk, 0);
});
