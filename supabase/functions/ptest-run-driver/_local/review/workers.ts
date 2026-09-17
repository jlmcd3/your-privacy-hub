// /all-ptest v2 (DOC 261, 2026-09-14) — THE EVIDENCE-SCOPED REVIEW WORKERS.
//
// One worker = one model call = one ptest_jobs row = one ptest_reviews row,
// persisted the moment the call returns (or fails). No in-call retry: a retry
// is a new job attempt with a fresh isolate and a fresh wall clock.
//
// Every finding the model returns passes through validate-v2.ts before it is
// stored; validated findings and dropped findings are both written to
// ptest_findings (the drop reason is the quality signal about the worker).

import { fetchReviewDocument, type ReviewTool } from "../../../_shared/review/document-source.ts";
import { blockTextMap, composedListOf, extractBlocks, renderBlocksText, renderComposedList } from "./document-blocks.ts";
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
}

function schemaFor(worker: WorkerId) {
  return worker === "W-RECORD" ? W_RECORD_JSON_SCHEMA : worker === "W-LAW" ? W_LAW_JSON_SCHEMA : W_REASON_JSON_SCHEMA;
}

/** ptest_findings rows for one worker run (validated + dropped + unbound). */
export function findingRows(
  opts: { batchId: string; tool: string; assessmentId: string; worker: WorkerId | "LINT"; vendor: Vendor | null; jobId?: string | null },
  validated: readonly ValidatedFinding[],
  dropped: readonly DroppedFinding[],
  unbound: ReadonlyArray<{ block_key: string; quote: string; proposed_row_id: string | null; consistent: boolean; note: string | null; locatable: boolean }> = [],
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
      reanchored: f.reanchored,
    });
  }
  for (const d of dropped) {
    rows.push({ ...common, finding_id: d.id, status: "dropped", drop_reason: d.reason, quote: d.quote, why: d.detail });
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
    });
  }
  return rows;
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
      derived_score: deriveScoreFromFindings(v.findings),
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
      const rows = findingRows({ batchId: opts.batchId, tool: opts.tool, assessmentId: doc.id, worker: opts.worker, vendor: opts.vendor, jobId: opts.jobId }, v.findings, v.dropped, v.unbound);
      if (rows.length) {
        const { error: fErr } = await admin.from("ptest_findings").insert(rows);
        if (fErr) console.error(`[ptest-worker] findings persist failed (${opts.worker}/${opts.vendor}) — ${fErr.message}`);
      }
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

/** Static prompt text for the drift/size tests. */
export function workerPromptPreview(worker: WorkerId, product: string): string {
  return buildWorkerSystemPrompt(worker, product);
}

export { renderRegistryPackText };
