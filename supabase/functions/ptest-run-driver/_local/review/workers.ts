// /all-ptest v2 (DOC 261, 2026-09-14) — THE EVIDENCE-SCOPED REVIEW WORKERS.
//
// One worker = one model call = one ptest_jobs row = one ptest_reviews row,
// persisted the moment the call returns (or fails). No in-call retry: a retry
// is a new job attempt with a fresh isolate and a fresh wall clock.
//
// Every finding the model returns passes through validate-v2.ts before it is
// stored; validated findings and dropped findings are both written to
// ptest_findings (the drop reason is the quality signal about the worker).

import { fetchReviewDocument, type ReviewDocument, type ReviewTool } from "../../../_shared/review/document-source.ts";
import { blockTextMap, composedListOf, extractBlocks, renderBlocksText, renderComposedList, type ComposedRow, type DocBlock } from "./document-blocks.ts";
import {
  buildWorkerSystemPrompt,
  buildWorkerUserTurn,
  PTEST_V2_PROMPT_VERSION,
  type Vendor,
  type WorkerId,
} from "./prompts-v2.ts";
import { W_LAW_JSON_SCHEMA, W_REASON_JSON_SCHEMA, W_RECORD_JSON_SCHEMA } from "./json-schemas-v2.ts";
import { callClaude, callOpenAI, parseJsonObject, type Effort } from "../../../_shared/review/model-calls.ts";
import { validateWorkerFindings, type DroppedFinding, type ValidatedFinding } from "./validate-v2.ts";
import { hydrateLocatorPack, registryPackFor, renderRegistryPackText } from "./packs/index.ts";
import { isRegistryGap } from "./classify.ts";
import type { RegistryPack } from "./packs/types.ts";
import { deriveScoreFromFindings } from "../../../_shared/review/scores.ts";

// deno-lint-ignore no-explicit-any
type Admin = any;

/** Job kind → (worker, vendor). Fixed (doc 261 Rev 2 §0A V5). */
export const WORKER_JOB_KINDS: Readonly<Record<string, { worker: WorkerId; vendor: Vendor }>> = {
  review_record: { worker: "W-RECORD", vendor: "claude" },
  review_law_claude: { worker: "W-LAW", vendor: "claude" },
  review_law_gpt: { worker: "W-LAW", vendor: "gpt" },
  review_reason: { worker: "W-REASON", vendor: "gpt" },
};

export const WORKER_KIND_LIST = Object.keys(WORKER_JOB_KINDS);

export function workerOfKind(kind: string): { worker: WorkerId; vendor: Vendor } | null {
  return WORKER_JOB_KINDS[kind] ?? null;
}

export const reviewerLabel = (worker: WorkerId | "LINT", vendor: Vendor | null): string =>
  vendor ? `${worker}/${vendor}` : worker;

const CYBER_PROVISION_KEYS = ["cppa-7120", "cppa-7121", "cppa-7122", "cppa-7123", "cppa-7124"];

/**
 * The registry pack for a product, with cyber's locator rows hydrated from the
 * approved corpus (`provision_texts`, the same table the product reads). The
 * hydrated text is PER-BATCH data and goes in the user turn, never the cached
 * system block.
 */
export async function loadRegistryPack(admin: Admin, product: string): Promise<{ pack: RegistryPack | null; hydratedText: string | null; unresolved: string[] }> {
  const base = registryPackFor(product);
  if (!base) return { pack: null, hydratedText: null, unresolved: [] };
  if (!base.rows.some((r) => r.verbatim_quote === null)) return { pack: base, hydratedText: null, unresolved: [] };
  const excerpts: Record<string, string | null> = {};
  try {
    const { data } = await admin.from("provision_texts").select("key, verbatim_excerpt, status").in("key", CYBER_PROVISION_KEYS);
    for (const row of (data ?? []) as Array<{ key: string; verbatim_excerpt: string | null; status: string }>) {
      excerpts[row.key] = row.status === "approved" ? row.verbatim_excerpt : null;
    }
  } catch (e) {
    console.warn(`[ptest-worker] provision_texts read failed — ${(e as Error)?.message ?? e}`);
  }
  const { pack, unresolved } = hydrateLocatorPack(base, excerpts);
  const hydrated = pack.rows.filter((r) => r.verbatim_quote !== null);
  const hydratedText = hydrated.length
    ? hydrated.map((r) => `ROW ${r.proposition_key} | ${r.subsection} | "${r.verbatim_quote}"`).join("\n")
    : null;
  return { pack, hydratedText, unresolved };
}

export interface WorkerOutcome {
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
}

export interface WorkerJobOpts {
  tool: ReviewTool;
  assessmentId: string;
  batchId: string;
  companyName?: string | null;
  effort: Effort;
  worker: WorkerId;
  vendor: Vendor;
  userId?: string | null;
  jobId?: string | null;
  /** The claimed job row's own kind (e.g. "review_law_claude") — needed to
   *  copy a W-LAW continuation job onto the same lineage (doc 263). */
  kind?: string;
  goldenId?: string | null;
  /** The claimed job row's own attempt cap, copied onto its continuation. */
  maxAttempts?: number;
  /** The claimed job row's payload — carries a W-LAW continuation's chunk
   *  index and the parts collected by earlier chunks (doc 263). */
  payload?: Record<string, unknown> | null;
  /** Test seam only: overrides Date.now() for the W-LAW job-budget check. */
  _now?: () => number;
}

function schemaFor(worker: WorkerId) {
  return worker === "W-RECORD" ? W_RECORD_JSON_SCHEMA : worker === "W-LAW" ? W_LAW_JSON_SCHEMA : W_REASON_JSON_SCHEMA;
}

// ── W-LAW chunking (doc 263, 2026-09-17) ────────────────────────────────────
//
// The gpt vendor at effort "high" took 240-360s over documents past ~20,000
// chars — against a 330s per-call timeout — and either the call itself timed
// out or the edge-function isolate was killed first. Either way the job's
// heartbeat stopped, the job row sat "running" until the stale-heartbeat rule
// re-queued it, and the retry died the same way.
//
// A W-LAW job now reviews the document in ≤WLAW_CHUNK_CHARS contiguous block
// chunks, one model call per chunk at a tighter per-call timeout
// (WLAW_CALL_TIMEOUT_MS), well inside the platform's isolate wall clock. When
// the job's own wall-clock budget (WLAW_JOB_BUDGET_MS, itself inside the
// isolate's ceiling) runs out with chunks still unprocessed, the remaining
// work is handed to a freshly queued CONTINUATION job that carries every part
// collected so far in its payload and picks up where this job stopped. Only
// the job that processes the LAST chunk writes the ptest_reviews row and the
// ptest_findings rows, merging every part collected across the whole chain —
// a continuation job writes neither, so claim_ptest_job's existing "wait for
// every review% job of this document" gate holds classify back automatically
// until the chain ends.
// Budget + one call must stay inside the isolate wall clock: 120 s + 180 s.
export const WLAW_CHUNK_CHARS = 12_000;
export const WLAW_CALL_TIMEOUT_MS = 180_000;
export const WLAW_JOB_BUDGET_MS = 120_000;
// gpt at "high" took 240 s on a 15k-char document (batch fc0119e9); the gpt
// leg of W-LAW runs at "medium" on every chunk (0 = always cap).
export const WLAW_GPT_EFFORT_CAP_CHARS = 0;

/**
 * Groups blocks into contiguous runs whose rendered length sums to at most
 * `maxChars`, preserving order. A single block whose own rendered length
 * already exceeds `maxChars` is never split — it becomes its own group.
 * Never returns an empty group; an empty `blocks` returns `[]`. Pure.
 */
export function chunkBlocks<T extends { key: string; text?: string }>(
  blocks: readonly T[],
  renderedLength: (b: T) => number,
  maxChars = WLAW_CHUNK_CHARS,
): T[][] {
  const groups: T[][] = [];
  let current: T[] = [];
  let currentLen = 0;
  for (const b of blocks) {
    const len = renderedLength(b);
    if (current.length && currentLen + len > maxChars) {
      groups.push(current);
      current = [];
      currentLen = 0;
    }
    current.push(b);
    currentLen += len;
  }
  if (current.length) groups.push(current);
  return groups;
}

type UnboundItem = { block_key: string; quote: string; proposed_row_id: string | null; consistent: boolean; note: string | null; locatable: boolean };

/** One chunk's call result, carried in a continuation job's `payload.wlaw_parts`
 *  until the job that runs the last chunk merges every part into one review
 *  row and one set of finding rows (doc 263). */
interface WLawPart {
  chunk: number;
  findings: ValidatedFinding[];
  dropped: DroppedFinding[];
  unbound: UnboundItem[];
  usage: { input_tokens: number | null; output_tokens: number | null; cache_read_tokens: number | null; cache_creation_tokens: number | null; elapsed_ms: number | null };
  model: string | null;
  effort: string;
}

/** Sum of the present values, or null when every value is null/undefined
 *  (mirrors a provider that never reported usage for any part). Pure. */
function sumNullable(values: ReadonlyArray<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => typeof v === "number");
  return nums.length ? nums.reduce((a, b) => a + b, 0) : null;
}

/** Every row of one bulk insert must carry the same key set: PostgREST fills
 *  a key absent from one row with null, not that column's default. That is
 *  what dropped every W-LAW row's `reanchored` default (doc 267 §3b, cycle
 *  2) and would just as readily strike any OTHER key a validated row sets
 *  (e.g. `binding`) that a dropped/unbound row does not. `reanchored` is
 *  filled with `false` (its NOT NULL default) when missing; `queued` is set
 *  later by the classifier, never here, so it is left off rows that do not
 *  already carry it. Exported for the chunking tests. */
export function normaliseRowKeys(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  keys.delete("queued");
  return rows.map((r) => {
    const out: Record<string, unknown> = { ...r };
    for (const k of keys) if (!(k in out)) out[k] = k === "reanchored" ? false : null;
    return out;
  });
}

/** ptest_findings rows for one worker run (validated + dropped + unbound). */
export function findingRows(
  opts: { batchId: string; tool: string; assessmentId: string; worker: WorkerId | "LINT"; vendor: Vendor | null; jobId?: string | null },
  validated: readonly ValidatedFinding[],
  dropped: readonly DroppedFinding[],
  unbound: ReadonlyArray<UnboundItem> = [],
): Record<string, unknown>[] {
  const common = {
    batch_id: opts.batchId,
    tool_slug: opts.tool,
    assessment_id: opts.assessmentId,
    worker: opts.worker,
    vendor: opts.vendor,
    job_id: opts.jobId ?? null,
  };
  const rows: Record<string, unknown>[] = [];
  for (const f of validated) {
    rows.push({
      ...common,
      finding_id: f.id,
      status: "validated",
      kind: f.kind,
      severity: f.severity,
      confidence: f.confidence,
      block_key: f.block_key,
      block_key_b: f.block_key_b,
      quote: f.quote,
      quote_b: f.quote_b,
      why: f.why,
      intake_key: f.intake_key,
      intake_value: f.intake_value,
      registry_row_id: f.registry_row_id,
      registry_quote: f.registry_quote,
      binding: f.binding,
      reanchored: f.reanchored ?? false,
    });
  }
  // Every row carries `reanchored` (NOT NULL, default false): a bulk insert sends
  // one JSON array, and PostgREST fills a key absent from some rows with null,
  // not the default — which failed every W-LAW persist (doc 267 §3b, cycle 2).
  for (const d of dropped) {
    rows.push({ ...common, finding_id: d.id, status: "dropped", drop_reason: d.reason, quote: d.quote, why: d.detail, reanchored: false });
  }
  for (const u of unbound) {
    rows.push({
      ...common,
      finding_id: `unbound:${u.block_key}`,
      status: "unbound",
      block_key: u.block_key,
      quote: u.quote,
      registry_row_id: u.proposed_row_id,
      binding: u.consistent ? "consistent" : "inconsistent",
      why: u.note,
      drop_reason: u.locatable ? null : "unlocatable_quote",
      reanchored: false,
    });
  }
  // doc 263 (continuation jobs) — normalise so a bulk insert can never send a
  // key present on one row's shape (e.g. a validated row's `binding`) and
  // absent from another's (a dropped row) as a silent null.
  return normaliseRowKeys(rows);
}

/** Insert one worker's finding rows; a bulk-insert failure retries row by row
 *  and the failure is recorded on `row.score_notes` rather than silently
 *  dropping the set (doc 263 run 1, batches 8a8475f8 / eac083a5). Shared by
 *  the single-call path and the W-LAW merged-chunks path; `row` is mutated
 *  in place when a partial failure needs recording. */
async function persistFindings(
  admin: Admin,
  rowsOpts: { batchId: string; tool: string; assessmentId: string; worker: WorkerId | "LINT"; vendor: Vendor | null; jobId?: string | null },
  validated: readonly ValidatedFinding[],
  dropped: readonly DroppedFinding[],
  unbound: readonly UnboundItem[],
  row: Record<string, unknown>,
): Promise<void> {
  const rows = findingRows(rowsOpts, validated, dropped, unbound);
  if (!rows.length) return;
  const { error: fErr } = await admin.from("ptest_findings").insert(rows);
  if (fErr) {
    console.error(`[ptest-worker] findings persist failed (${rowsOpts.worker}/${rowsOpts.vendor}) — ${fErr.message}; retrying row by row`);
    const failed: string[] = [];
    for (const one of rows) {
      const { error: oneErr } = await admin.from("ptest_findings").insert(one);
      if (oneErr) failed.push(`${String(one.finding_id ?? "?")}: ${oneErr.message}`);
    }
    const note = `findings persist: bulk insert failed (${fErr.message}); ${rows.length - failed.length}/${rows.length} rows kept` +
      (failed.length ? `; failed: ${failed.slice(0, 5).join(" | ")}` : "");
    row.score_notes = row.score_notes ? `${row.score_notes}; ${note}` : note;
  }
}

export async function runWorkerJob(admin: Admin, opts: WorkerJobOpts): Promise<WorkerOutcome> {
  const doc = await fetchReviewDocument(admin, opts.tool, opts.assessmentId);
  if ("error" in doc) return { ok: false, status: doc.status, body: { error: doc.error } };
  if (!doc.documentText.trim()) return { ok: false, status: 400, body: { error: "empty_document" } };

  const blocks = extractBlocks(doc.report);
  const composed = composedListOf(doc.report);
  const { pack, hydratedText, unresolved } = opts.worker === "W-LAW"
    ? await loadRegistryPack(admin, opts.tool)
    : { pack: null, hydratedText: null, unresolved: [] as string[] };

  const system = buildWorkerSystemPrompt(opts.worker, opts.tool);

  // W-LAW alone reviews the document across possibly more than one job — see
  // runWLawJob (doc 263, chunked continuation jobs).
  if (opts.worker === "W-LAW") {
    return await runWLawJob(admin, opts, doc, blocks, composed, pack, hydratedText, unresolved, system);
  }

  const user = buildWorkerUserTurn(opts.worker, {
    tool: opts.tool,
    intakeJson: doc.intakeJson,
    composedListText: renderComposedList(composed),
    blocksText: blocks.length ? renderBlocksText(blocks) : doc.documentText,
    hydratedRegistryText: hydratedText,
    truncated: doc.truncated,
  });

  const common = {
    batch_id: opts.batchId,
    tool_slug: opts.tool,
    assessment_id: doc.id,
    company_name: opts.companyName ?? null,
    reviewer: reviewerLabel(opts.worker, opts.vendor),
    worker: opts.worker,
    vendor: opts.vendor,
    prompt_version: PTEST_V2_PROMPT_VERSION,
    run_by: opts.userId ?? null,
  };

  const call = opts.vendor === "claude" ? callClaude : callOpenAI;
  let row: Record<string, unknown>;
  let body: Record<string, unknown>;
  let ok = false;
  try {
    const res = await call({
      system, user, effort: opts.effort,
      label: `ptest-${opts.worker.toLowerCase()}-${opts.vendor}`,
      product: opts.tool, sourceRowId: doc.id,
      jsonSchema: schemaFor(opts.worker),
    });
    const parsed = parseJsonObject(res.text);
    if (!parsed) throw new Error(`${opts.worker}/${opts.vendor} returned unparseable JSON (${res.text.length} chars)`);
    const v = validateWorkerFindings(opts.worker, parsed, {
      documentText: doc.documentText,
      blocks: blockTextMap(blocks),
      intake: doc.intake,
      registryPack: pack,
    });
    ok = true;
    row = {
      ...common,
      model: res.model,
      effort: res.effort,
      findings: v.findings,
      double_check: typeof parsed.double_check === "string" ? parsed.double_check : null,
      overall: null,
      dimension_scores: null,
      overall_score: null,
      // doc 263 run 1 — registry gaps (NO ROW) are coverage, not defects; the
      // worker's score reads the findings it could actually check.
      derived_score: deriveScoreFromFindings(v.findings.filter((f) => !isRegistryGap({ worker: opts.worker, binding: f.binding, why: f.why }))),
      score_source: "derived_only",
      score_notes: unresolved.length ? `registry rows not hydrated: ${unresolved.join(", ")}` : null,
      usage: {
        input_tokens: res.inputTokens, output_tokens: res.outputTokens,
        cache_read_tokens: res.cacheReadTokens, cache_creation_tokens: res.cacheCreationTokens,
        elapsed_ms: res.elapsedMs, document_chars: doc.originalLength, blocks: blocks.length, composed_rows: composed.length,
      },
      dropped_unlocatable: v.dropped.length,
      error: null,
    };
    body = {
      ok: true, worker: opts.worker, vendor: opts.vendor, model: res.model,
      findings: v.findings.length, dropped: v.dropped.length, unbound: v.unbound.length,
      document_chars: doc.originalLength, document_truncated: doc.truncated, fell_back: res.fellBack, note: res.note,
    };
    if (opts.batchId) {
      await persistFindings(admin, { batchId: opts.batchId, tool: opts.tool, assessmentId: doc.id, worker: opts.worker, vendor: opts.vendor, jobId: opts.jobId }, v.findings, v.dropped, v.unbound, row);
    }
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    console.error(`[ptest-worker] ${opts.worker}/${opts.vendor} failed — ${msg}`);
    row = { ...common, model: null, effort: opts.effort, findings: [], double_check: null, overall: null, usage: null, dropped_unlocatable: 0, error: msg };
    body = { ok: false, worker: opts.worker, vendor: opts.vendor, error: msg, document_chars: doc.originalLength, document_truncated: doc.truncated };
  }

  if (opts.batchId) {
    const { error: insErr } = await admin.from("ptest_reviews").insert(row);
    if (insErr) console.error(`[ptest-worker] review persist failed (${opts.worker}/${opts.vendor}) — ${insErr.message}`);
  }
  return { ok, status: ok ? 200 : 502, body };
}

/**
 * W-LAW only (doc 263): review the document in ≤WLAW_CHUNK_CHARS block
 * chunks, one model call per chunk. A chunk left unprocessed when this job's
 * own wall-clock budget (WLAW_JOB_BUDGET_MS) runs out is handed to a freshly
 * queued continuation job carrying every part collected so far; only the
 * invocation that processes the LAST chunk writes the ptest_reviews row and
 * the ptest_findings rows, merging every part collected across the chain.
 */
async function runWLawJob(
  admin: Admin,
  opts: WorkerJobOpts,
  doc: ReviewDocument,
  blocks: DocBlock[],
  composed: ComposedRow[],
  pack: RegistryPack | null,
  hydratedText: string | null,
  unresolved: string[],
  system: string,
): Promise<WorkerOutcome> {
  const now = opts._now ?? Date.now;
  const started = now();
  const call = opts.vendor === "claude" ? callClaude : callOpenAI;
  const composedListText = renderComposedList(composed);

  const common = {
    batch_id: opts.batchId,
    tool_slug: opts.tool,
    assessment_id: doc.id,
    company_name: opts.companyName ?? null,
    reviewer: reviewerLabel(opts.worker, opts.vendor),
    worker: opts.worker,
    vendor: opts.vendor,
    prompt_version: PTEST_V2_PROMPT_VERSION,
    run_by: opts.userId ?? null,
  };

  // No block keys at all (a legacy/registration/session-shaped record): the
  // whole document is one synthetic chunk, exactly as the unchunked path
  // reviews it (blocksText falls back to doc.documentText below too).
  const chunks: DocBlock[][] = blocks.length
    ? chunkBlocks(blocks, (b) => renderBlocksText([b]).length, WLAW_CHUNK_CHARS)
    : [[{ key: "document", section_id: "document", section_title: "", kind: "generated", text: doc.documentText, synthetic_key: true }]];
  const n = chunks.length;

  const startChunk = Number(opts.payload?.wlaw_chunk ?? 0);
  const parts: WLawPart[] = Array.isArray(opts.payload?.wlaw_parts) ? (opts.payload!.wlaw_parts as WLawPart[]) : [];

  for (let i = startChunk; i < n; i++) {
    if (i > startChunk && now() - started > WLAW_JOB_BUDGET_MS) {
      const { error: insErr } = await admin.from("ptest_jobs").insert({
        batch_id: opts.batchId,
        tool_slug: opts.tool,
        assessment_id: opts.assessmentId,
        company_name: opts.companyName ?? null,
        kind: opts.kind ?? `review_law_${opts.vendor}`,
        effort: opts.effort,
        run_by: opts.userId ?? null,
        golden_id: opts.goldenId ?? null,
        status: "queued",
        attempts: 0,
        max_attempts: opts.maxAttempts ?? 2,
        payload: { wlaw_chunk: i, wlaw_parts: parts, wlaw_parent_job_id: opts.jobId ?? null, wlaw_chunks_total: n },
        note: `W-LAW continuation from chunk ${i} of ${n}`,
      });
      if (insErr) {
        // Lead review: a continuation that never queued must fail the job
        // visibly — returning "continued" here would let classify run with
        // no W-LAW review row at all.
        const msg = `W-LAW continuation insert failed at chunk ${i} of ${n}: ${insErr.message}`;
        console.error(`[ptest-worker] ${msg}`);
        if (opts.batchId) {
          const { error: rErr } = await admin.from("ptest_reviews").insert({ ...common, model: null, effort: opts.effort, findings: [], double_check: null, overall: null, usage: null, dropped_unlocatable: 0, error: msg });
          if (rErr) console.error(`[ptest-worker] review persist failed (${opts.worker}/${opts.vendor}) — ${rErr.message}`);
        }
        return { ok: false, status: 502, body: { ok: false, worker: opts.worker, vendor: opts.vendor, error: msg, chunks: n } };
      }
      return {
        ok: true,
        status: 200,
        body: { ok: true, continued: true, next_chunk: i, chunks: n, worker: opts.worker, vendor: opts.vendor },
      };
    }

    const chunk = chunks[i];
    const blocksText = blocks.length ? renderBlocksText(chunk) : doc.documentText;
    const partNote = n > 1
      ? `DOCUMENT PART ${i + 1} OF ${n}: blocks ${chunk[0].key} to ${chunk[chunk.length - 1].key}. The other parts are reviewed separately; report only findings whose quote lies in the blocks below, and never report that the document seems incomplete.`
      : undefined;
    const user = buildWorkerUserTurn(opts.worker, {
      tool: opts.tool,
      intakeJson: doc.intakeJson,
      composedListText,
      blocksText,
      hydratedRegistryText: hydratedText,
      truncated: doc.truncated,
      partNote,
    });
    const effortForCall: Effort = opts.vendor === "gpt" && doc.originalLength >= WLAW_GPT_EFFORT_CAP_CHARS ? "medium" : opts.effort;

    try {
      const res = await call({
        system, user, effort: effortForCall,
        label: `ptest-${opts.worker.toLowerCase()}-${opts.vendor}`,
        product: opts.tool, sourceRowId: doc.id,
        jsonSchema: schemaFor(opts.worker),
        timeoutMs: WLAW_CALL_TIMEOUT_MS,
      });
      const parsed = parseJsonObject(res.text);
      if (!parsed) throw new Error(`${opts.worker}/${opts.vendor} returned unparseable JSON (${res.text.length} chars, chunk ${i} of ${n})`);
      const v = validateWorkerFindings(opts.worker, parsed, {
        documentText: doc.documentText,
        blocks: blockTextMap(blocks),
        intake: doc.intake,
        registryPack: pack,
      });
      const prefix = `c${i}-`;
      parts.push({
        chunk: i,
        findings: v.findings.map((f) => ({ ...f, id: `${prefix}${f.id}` })),
        dropped: v.dropped.map((d) => ({ ...d, id: `${prefix}${d.id}` })),
        // Blocks never repeat across chunks; the block key is joined downstream and stays as is.
        unbound: [...v.unbound],
        usage: {
          input_tokens: res.inputTokens, output_tokens: res.outputTokens,
          cache_read_tokens: res.cacheReadTokens, cache_creation_tokens: res.cacheCreationTokens,
          elapsed_ms: res.elapsedMs,
        },
        model: res.model,
        effort: res.effort ?? effortForCall,
      });
    } catch (err) {
      const msg = (err as Error)?.message ?? String(err);
      console.error(`[ptest-worker] ${opts.worker}/${opts.vendor} failed (chunk ${i} of ${n}) — ${msg}`);
      const row: Record<string, unknown> = {
        ...common, model: null, effort: opts.effort, findings: [], double_check: null, overall: null,
        usage: null, dropped_unlocatable: 0, error: msg,
      };
      const body = { ok: false, worker: opts.worker, vendor: opts.vendor, error: msg, document_chars: doc.originalLength, document_truncated: doc.truncated };
      if (opts.batchId) {
        const { error: insErr } = await admin.from("ptest_reviews").insert(row);
        if (insErr) console.error(`[ptest-worker] review persist failed (${opts.worker}/${opts.vendor}) — ${insErr.message}`);
      }
      return { ok: false, status: 502, body };
    }
  }

  // Every chunk has now landed, across this invocation and (if this is a
  // continuation) every earlier one — merge every part and write the single
  // review row and finding-row set the document gets for this worker/vendor.
  const allFindings = parts.flatMap((p) => p.findings);
  const allDropped = parts.flatMap((p) => p.dropped);
  const allUnbound = parts.flatMap((p) => p.unbound);
  const last = parts[parts.length - 1];
  const usage = {
    input_tokens: sumNullable(parts.map((p) => p.usage.input_tokens)),
    output_tokens: sumNullable(parts.map((p) => p.usage.output_tokens)),
    cache_read_tokens: sumNullable(parts.map((p) => p.usage.cache_read_tokens)),
    cache_creation_tokens: sumNullable(parts.map((p) => p.usage.cache_creation_tokens)),
    elapsed_ms: sumNullable(parts.map((p) => p.usage.elapsed_ms)),
    chunks: n,
    document_chars: doc.originalLength,
    blocks: blocks.length,
  };
  // doc 263 run 1 — registry gaps (NO ROW) are coverage, not defects; the
  // worker's score reads the findings it could actually check.
  const derived_score = deriveScoreFromFindings(allFindings.filter((f) => !isRegistryGap({ worker: opts.worker, binding: f.binding, why: f.why })));
  const scoreNotes = [
    unresolved.length ? `registry rows not hydrated: ${unresolved.join(", ")}` : null,
    n > 1 ? `W-LAW reviewed in ${n} parts` : null,
  ].filter((s): s is string => !!s).join("; ") || null;

  const row: Record<string, unknown> = {
    ...common,
    model: last?.model ?? null,
    effort: last?.effort ?? opts.effort,
    findings: allFindings,
    double_check: null,
    overall: null,
    dimension_scores: null,
    overall_score: null,
    derived_score,
    score_source: "derived_only",
    score_notes: scoreNotes,
    usage,
    dropped_unlocatable: allDropped.length,
    error: null,
  };
  const body: Record<string, unknown> = {
    ok: true, worker: opts.worker, vendor: opts.vendor, model: last?.model ?? null,
    findings: allFindings.length, dropped: allDropped.length, unbound: allUnbound.length,
    document_chars: doc.originalLength, document_truncated: doc.truncated, chunks: n,
  };

  if (opts.batchId) {
    await persistFindings(admin, { batchId: opts.batchId, tool: opts.tool, assessmentId: doc.id, worker: opts.worker, vendor: opts.vendor, jobId: opts.jobId }, allFindings, allDropped, allUnbound, row);
    const { error: insErr } = await admin.from("ptest_reviews").insert(row);
    if (insErr) console.error(`[ptest-worker] review persist failed (${opts.worker}/${opts.vendor}) — ${insErr.message}`);
  }
  return { ok: true, status: 200, body };
}

/** Static prompt text for the drift/size tests. */
export function workerPromptPreview(worker: WorkerId, product: string): string {
  return buildWorkerSystemPrompt(worker, product);
}

export { renderRegistryPackText };
