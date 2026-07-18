// TRANSLATE-2 — Unit tests for resumable slice engine + sweep decisions.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  runTranslationSlice,
  assembleTranslated,
  computeChunksTotal,
  extractStringUnits,
  planChunks,
  type PersistedChunk,
} from "../../supabase/functions/_shared/translation-engine";

// Mirror of the sweep decision function from batch-kickoff-pickup (kept in
// sync intentionally — the edge function references Deno globals so we can't
// import it into the vitest environment). If the constants below drift from
// batch-kickoff-pickup/index.ts, this test file must be updated too.
const TRANSLATION_STALL_MS = 4 * 60_000;
const TRANSLATION_MAX_CONSECUTIVE_STALL_KICKS = 3;
const TRANSLATION_HARD_FAIL_MS = 45 * 60_000;
function translationTotalResumeCeiling(chunksTotal: number | null | undefined): number {
  const n = Math.max(0, Number(chunksTotal ?? 0));
  return Math.max(20, Math.ceil(n * 1.5));
}

type SweepDecision =
  | { kind: "resume"; row_id: string; stall_ms: number; resume_count_before: number; progressed: boolean }
  | { kind: "fail"; row_id: string; reason: string; resume_count: number }
  | { kind: "skip"; row_id: string; reason: string };

function decideTranslationRow(
  row: {
    id: string;
    started_at: string | null;
    last_progress_at: string | null;
    resume_count: number | null;
    chunks_done: number | null;
    chunks_total: number | null;
    consecutive_stall_kicks: number | null;
    last_kick_chunks_done: number | null;
  },
  nowMs: number,
): SweepDecision {
  const started = row.started_at ? new Date(row.started_at).getTime() : nowMs;
  const lastProgress = row.last_progress_at ? new Date(row.last_progress_at).getTime() : started;
  const stallMs = nowMs - lastProgress;
  const totalMs = nowMs - started;
  const resumeCount = row.resume_count ?? 0;
  const chunksDone = row.chunks_done ?? 0;
  const lastKickAt = row.last_kick_chunks_done ?? 0;
  const progressed = chunksDone > lastKickAt;
  const consecutiveKicks = progressed ? 0 : (row.consecutive_stall_kicks ?? 0);
  const totalCeiling = translationTotalResumeCeiling(row.chunks_total);
  if (stallMs < TRANSLATION_STALL_MS && totalMs < TRANSLATION_HARD_FAIL_MS) {
    return { kind: "skip", row_id: row.id, reason: "progressing" };
  }
  if (totalMs >= TRANSLATION_HARD_FAIL_MS) {
    return { kind: "fail", row_id: row.id, reason: "hard_fail_ceiling", resume_count: resumeCount };
  }
  if (consecutiveKicks >= TRANSLATION_MAX_CONSECUTIVE_STALL_KICKS) {
    return { kind: "fail", row_id: row.id, reason: "no_progress", resume_count: resumeCount };
  }
  if (resumeCount >= totalCeiling) {
    return { kind: "fail", row_id: row.id, reason: "total_resume_ceiling", resume_count: resumeCount };
  }
  return { kind: "resume", row_id: row.id, stall_ms: stallMs, resume_count_before: resumeCount, progressed };
}

function baseRow(overrides: any = {}) {
  return {
    id: "r", started_at: null, last_progress_at: null, resume_count: 0,
    chunks_done: 0, chunks_total: 10, consecutive_stall_kicks: 0, last_kick_chunks_done: 0,
    ...overrides,
  };
}

// ─── Mock Anthropic: echo with "[FR] " prefix ─────────────────────────────
function installAnthropicMock() {
  const original = globalThis.fetch;
  globalThis.fetch = vi.fn(async (_url: any, init: any) => {
    const body = JSON.parse(init.body);
    const userText: string = body.messages[0].content;
    let echoed: string;
    try {
      const parsed = JSON.parse(userText);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed)) out[k] = `[FR] ${String(v)}`;
        echoed = JSON.stringify(out);
      } else echoed = `[FR] ${userText}`;
    } catch { echoed = `[FR] ${userText}`; }
    return new Response(
      JSON.stringify({ content: [{ type: "text", text: echoed }] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as any;
  return () => { globalThis.fetch = original; };
}

// A multi-chunk fixture: prose long enough to be its own chunk + several
// smalls. Long strings are >1200 chars.
function multiChunkSource() {
  return {
    title: "Report",
    a: "short a",
    b: "short b",
    long1: "sentence one. ".repeat(300),   // prose chunk
    long2: "sentence two. ".repeat(300),   // prose chunk
    long3: "sentence three. ".repeat(300), // prose chunk
  };
}

describe("TRANSLATE-2 · runTranslationSlice — chunk-write idempotency", () => {
  let restore: () => void;
  beforeEach(() => { restore = installAnthropicMock(); });
  afterEach(() => { restore(); });

  it("re-running a completed chunk is a no-op skip", async () => {
    const src = multiChunkSource();
    const total = computeChunksTotal(src);
    expect(total).toBeGreaterThanOrEqual(4);

    // Prime the persisted store with chunk 0 already present.
    // Kind depends on the plan; here chunk 0 is the json_map of smalls.
    const chunks = planChunks(extractStringUnits(src));
    let primed: PersistedChunk;
    if (chunks[0].kind === "json_map") {
      const map: Record<string, string> = {};
      for (const u of chunks[0].units) map[u.path] = `[PRE] ${u.value}`;
      primed = { kind: "map", map };
    } else {
      primed = { kind: "prose", text: "[PRE] prose" };
    }
    const persisted: Record<string, PersistedChunk> = { "0": primed };
    const seenIndices: number[] = [];
    const result = await runTranslationSlice(src, persisted, {
      apiKey: "test", languageCode: "fr", languageName: "French",
      deadlineMs: Date.now() + 60_000,
      onChunkComplete: async ({ index, chunk }) => {
        seenIndices.push(index);
        persisted[String(index)] = chunk;
      },
    });
    // Index 0 must NOT be re-processed.
    expect(seenIndices).not.toContain(0);
    expect(result.allDone).toBe(true);
    // Primed value must be retained after assembly.
    const translated: any = assembleTranslated(src, persisted);
    if (chunks[0].kind === "json_map") {
      const firstPath = chunks[0].units[0].path;
      // First path was primed with "[PRE] ..." — should NOT be re-translated.
      const cur = firstPath.split(".").reduce<any>((o, k) => (o == null ? o : o[k]), translated);
      expect(String(cur).startsWith("[PRE]")).toBe(true);
    }
  });
});

describe("TRANSLATE-2 · resume from partial state", () => {
  let restore: () => void;
  beforeEach(() => { restore = installAnthropicMock(); });
  afterEach(() => { restore(); });

  it("builds a row with 3 of 6 chunks persisted, resume completes exactly the missing 3", async () => {
    // Build a source with exactly 6 chunks.
    const src: Record<string, string> = { title: "T" };
    for (let i = 0; i < 5; i++) src[`p${i}`] = "sentence. ".repeat(300); // 5 prose + 1 json_map = 6
    const total = computeChunksTotal(src);
    expect(total).toBe(6);

    // Phase 1: run with a very short deadline to force partial completion,
    // but with our mock it's near-instant; instead we manually pre-persist 3.
    const chunks = planChunks(extractStringUnits(src));
    const persisted: Record<string, PersistedChunk> = {};
    for (let i = 0; i < 3; i++) {
      if (chunks[i].kind === "json_map") {
        const map: Record<string, string> = {};
        for (const u of (chunks[i] as any).units) map[u.path] = `[PRE] ${u.value}`;
        persisted[String(i)] = { kind: "map", map };
      } else {
        persisted[String(i)] = { kind: "prose", text: "[PRE] prose" };
      }
    }

    // Phase 2: resume — should touch exactly indices 3, 4, 5.
    const touched: number[] = [];
    const result = await runTranslationSlice(src, persisted, {
      apiKey: "test", languageCode: "fr", languageName: "French",
      deadlineMs: Date.now() + 60_000,
      onChunkComplete: async ({ index, chunk }) => {
        touched.push(index);
        persisted[String(index)] = chunk;
      },
    });
    expect(touched.sort()).toEqual([3, 4, 5]);
    expect(result.allDone).toBe(true);
    expect(result.processedThisSlice).toBe(3);

    // Assemble and confirm no missing chunks.
    const translated = assembleTranslated(src, persisted);
    expect(translated).toBeTruthy();
  });
});

describe("TRANSLATE-2 · slice budget cutoff", () => {
  it("stops when deadline is reached and reports timedOut with allDone=false", async () => {
    // Slow mock: each call waits 40ms.
    const original = globalThis.fetch;
    globalThis.fetch = vi.fn(async (_u: any, init: any) => {
      await new Promise((r) => setTimeout(r, 40));
      const body = JSON.parse(init.body);
      const userText: string = body.messages[0].content;
      let echoed: string;
      try {
        const parsed = JSON.parse(userText);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const out: Record<string, string> = {};
          for (const [k, v] of Object.entries(parsed)) out[k] = `[FR] ${String(v)}`;
          echoed = JSON.stringify(out);
        } else echoed = `[FR] ${userText}`;
      } catch { echoed = `[FR] ${userText}`; }
      return new Response(
        JSON.stringify({ content: [{ type: "text", text: echoed }] }),
        { status: 200 },
      );
    }) as any;
    try {
      const src: Record<string, string> = { title: "T" };
      for (let i = 0; i < 10; i++) src[`p${i}`] = "sentence. ".repeat(300);
      const persisted: Record<string, PersistedChunk> = {};
      const deadlineMs = Date.now() + 120; // ~2-3 chunks worth
      const result = await runTranslationSlice(src, persisted, {
        apiKey: "test", languageCode: "fr", languageName: "French",
        deadlineMs,
        onChunkComplete: async ({ index, chunk }) => { persisted[String(index)] = chunk; },
      });
      expect(result.timedOut).toBe(true);
      expect(result.allDone).toBe(false);
      expect(result.chunksDone).toBeLessThan(result.chunksTotal);
      expect(result.chunksDone).toBe(Object.keys(persisted).length);
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe("TRANSLATE-2 · sweep decision matrix", () => {
  const now = 1_800_000_000_000;

  it("skips a row whose last_progress_at is recent", () => {
    const d = decideTranslationRow(
      { id: "r1", started_at: new Date(now - 60_000).toISOString(), last_progress_at: new Date(now - 30_000).toISOString(), resume_count: 0 },
      now,
    );
    expect(d.kind).toBe("skip");
  });

  it("resumes a stalled row under the resume cap", () => {
    const d = decideTranslationRow(
      { id: "r2", started_at: new Date(now - 6 * 60_000).toISOString(), last_progress_at: new Date(now - (TRANSLATION_STALL_MS + 60_000)).toISOString(), resume_count: 1 },
      now,
    );
    expect(d.kind).toBe("resume");
    if (d.kind === "resume") expect(d.resume_count_before).toBe(1);
  });

  it("fails a row that has exceeded the resume cap", () => {
    const d = decideTranslationRow(
      { id: "r3", started_at: new Date(now - 20 * 60_000).toISOString(), last_progress_at: new Date(now - (TRANSLATION_STALL_MS + 60_000)).toISOString(), resume_count: TRANSLATION_MAX_RESUMES },
      now,
    );
    expect(d.kind).toBe("fail");
  });

  it("fails a row past the hard wall-clock ceiling", () => {
    const d = decideTranslationRow(
      { id: "r4", started_at: new Date(now - (TRANSLATION_HARD_FAIL_MS + 60_000)).toISOString(), last_progress_at: new Date(now - 10_000).toISOString(), resume_count: 0 },
      now,
    );
    expect(d.kind).toBe("fail");
  });
});
