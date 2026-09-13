/**
 * /all-ptest — RUN HISTORY + FIX TRACKING.
 *
 * The review loop itself is unchanged: it produces an Agreed Fix List and a
 * CEO Decision Sheet per product. This module makes both DURABLE and
 * TRACKABLE:
 *
 *   ptest_batches    — one row per run (products, industry, efforts, status).
 *   ptest_fix_items  — one row per agreed fix and per CEO decision, each with
 *                      its own lifecycle: open → in_progress → fixed
 *                      (or rejected / deferred), with notes and a reference.
 *
 * FIX BUTTON LAW: applying a fix to the codebase stays human-gated. "Fix"
 * moves the item to in_progress and produces a complete, self-contained fix
 * brief (verbatim quotes, cause, code focus, change, regression test) to hand
 * to the implementing agent. Nothing here writes code.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ArbitrationResult, CeoEntry, FixListEntry, PtestEffort } from "@/lib/ptestRun";

export type FixStatus = "open" | "in_progress" | "fixed" | "rejected" | "deferred";
export const FIX_STATUSES: FixStatus[] = ["open", "in_progress", "fixed", "rejected", "deferred"];

export interface PtestBatchRow {
  batch_id: string;
  created_at: string;
  industry: string | null;
  products: string[];
  documents_per_product: number | null;
  review_effort: string | null;
  arbitration_effort: string | null;
  status: string;
  note: string | null;
  /** Per-product rollup written by the driver when the last job lands. */
  scores: Record<string, PtestProductScore> | null;
  batch_mean: number | null;
}

export interface PtestProductScore {
  claude: number | null;
  gpt: number | null;
  combined: number | null;
  derived: number | null;
  arbitration: number | null;
  documents: number;
}

export interface PtestFixItemRow {
  id: string;
  batch_id: string;
  tool_slug: string;
  item_kind: "fix" | "ceo";
  item_id: string;
  title: string;
  severity: string | null;
  defect_type: string | null;
  raised_by: string | null;
  code_focus: string | null;
  change_text: string | null;
  regression_test: string | null;
  payload: unknown;
  fix_status: FixStatus;
  fix_notes: string | null;
  fix_reference: string | null;
  decided_at: string | null;
  created_at: string;
}

// ── Batches ─────────────────────────────────────────────────────────────────

export async function recordBatchStart(opts: {
  batchId: string;
  runBy: string;
  industry: string;
  products: string[];
  documentsPerProduct: number;
  reviewEffort: PtestEffort;
  arbitrationEffort: PtestEffort;
}): Promise<void> {
  const { error } = await supabase.from("ptest_batches").upsert(
    {
      batch_id: opts.batchId,
      run_by: opts.runBy,
      industry: opts.industry,
      products: opts.products,
      documents_per_product: opts.documentsPerProduct,
      review_effort: opts.reviewEffort,
      arbitration_effort: opts.arbitrationEffort,
      status: "running",
    },
    { onConflict: "batch_id" },
  );
  if (error) throw new Error(error.message);
}

export async function setBatchStatus(batchId: string, status: string, note?: string | null): Promise<void> {
  const { error } = await supabase
    .from("ptest_batches")
    .update({ status, ...(note !== undefined ? { note } : {}) })
    .eq("batch_id", batchId);
  if (error) throw new Error(error.message);
}

export async function fetchBatches(limit = 50): Promise<PtestBatchRow[]> {
  const { data, error } = await supabase
    .from("ptest_batches")
    .select("batch_id, created_at, industry, products, documents_per_product, review_effort, arbitration_effort, status, note, scores, batch_mean")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PtestBatchRow[];
}

// ── Fix items ───────────────────────────────────────────────────────────────

/**
 * Persists the arbitration output as trackable items. Upsert on
 * (batch_id, tool_slug, item_kind, item_id) so a re-sync of the same batch
 * never duplicates rows and never clobbers a status already set by a human:
 * only the descriptive columns are written.
 */
export async function syncFixItems(batchId: string, arbitrations: ArbitrationResult[]): Promise<number> {
  const rows: Array<Record<string, unknown>> = [];
  for (const a of arbitrations) {
    if (a.error) continue;
    (a.fixList ?? []).forEach((f: FixListEntry, i) => {
      rows.push({
        batch_id: batchId,
        tool_slug: a.tool,
        item_kind: "fix",
        item_id: f.id || `fix-${i + 1}`,
        title: f.title || "(untitled fix)",
        severity: f.severity ?? null,
        defect_type: f.defect_type ?? null,
        raised_by: f.raised_by ?? null,
        code_focus: f.code_focus ?? null,
        change_text: f.change ?? null,
        regression_test: f.regression_test ?? null,
        payload: f as unknown as Record<string, unknown>,
      });
    });
    (a.ceoSheet ?? []).forEach((c: CeoEntry, i) => {
      rows.push({
        batch_id: batchId,
        tool_slug: a.tool,
        item_kind: "ceo",
        item_id: c.id || `ceo-${i + 1}`,
        title: c.question || "(untitled decision)",
        severity: null,
        defect_type: null,
        raised_by: c.raised_by ?? null,
        code_focus: null,
        change_text: c.gpt_proposed_fix ?? null,
        regression_test: null,
        payload: c as unknown as Record<string, unknown>,
      });
    });
  }
  if (!rows.length) return 0;
  const { error } = await supabase
    .from("ptest_fix_items")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(rows as any, { onConflict: "batch_id,tool_slug,item_kind,item_id", ignoreDuplicates: false });
  if (error) throw new Error(error.message);
  return rows.length;
}

export async function fetchFixItems(batchId: string): Promise<PtestFixItemRow[]> {
  const { data, error } = await supabase
    .from("ptest_fix_items")
    .select("id, batch_id, tool_slug, item_kind, item_id, title, severity, defect_type, raised_by, code_focus, change_text, regression_test, payload, fix_status, fix_notes, fix_reference, decided_at, created_at")
    .eq("batch_id", batchId)
    .order("item_kind", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PtestFixItemRow[];
}

export async function updateFixItem(
  id: string,
  patch: { fix_status?: FixStatus; fix_notes?: string | null; fix_reference?: string | null },
  decidedBy?: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("ptest_fix_items")
    .update({
      ...patch,
      ...(patch.fix_status ? { decided_at: new Date().toISOString(), decided_by: decidedBy ?? null } : {}),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Fix brief ───────────────────────────────────────────────────────────────

function line(label: string, value: unknown): string {
  const v = (value ?? "").toString().trim();
  return `${label}: ${v || "—"}`;
}

/** Complete, self-contained instruction packet for one item. Never truncated. */
export function buildFixBrief(item: PtestFixItemRow, batch?: PtestBatchRow | null): string {
  const p = (item.payload ?? {}) as Record<string, unknown>;
  const L: string[] = [];
  L.push(item.item_kind === "fix" ? `# Agreed fix — ${item.title}` : `# CEO decision — ${item.title}`);
  L.push("");
  L.push(line("Batch", item.batch_id));
  if (batch) L.push(line("Run", `${batch.created_at} · industry ${batch.industry ?? "—"} · review ${batch.review_effort ?? "—"} · arbitration ${batch.arbitration_effort ?? "—"}`));
  L.push(line("Product", item.tool_slug));
  L.push(line("Item id", item.item_id));
  L.push(line("Raised by", item.raised_by));
  L.push(line("Current status", item.fix_status));
  L.push("");

  if (item.item_kind === "fix") {
    L.push(line("Severity", item.severity));
    L.push(line("Defect type", item.defect_type));
    L.push(line("Cause", p.cause));
    L.push(line("Cause layer", p.cause_layer));
    L.push(line("Code focus", item.code_focus));
    L.push(line("Change required", item.change_text));
    L.push(line("Regression test", item.regression_test));
    const boundary = p.boundary_cases as string[] | undefined;
    if (boundary?.length) L.push(line("Boundary cases", boundary.join("; ")));
    const occ = (p.occurrences ?? []) as Array<Record<string, unknown>>;
    if (occ.length) {
      L.push("");
      L.push(`## Occurrences (${occ.length}) — verbatim`);
      occ.forEach((o) => {
        L.push(`- ${o.product ?? item.tool_slug} · document ${o.document_id ?? "?"} · section ${o.section ?? "—"}`);
        L.push(`  > ${(o.quote ?? "").toString()}`);
      });
    }
  } else {
    L.push(line("Context", p.context));
    L.push(line("ChatGPT proposed fix", p.gpt_proposed_fix));
    L.push(line("Arbiter reason", p.arbiter_reason));
    const options = (p.options ?? []) as Array<{ option: string; consequence: string }>;
    if (options.length) {
      L.push("");
      L.push("## Options");
      options.forEach((o) => L.push(`- **${o.option}** — ${o.consequence}`));
    }
  }

  L.push("");
  L.push("## Instruction");
  L.push(
    item.item_kind === "fix"
      ? "Apply this change in the codebase, add the regression test named above, double-check the work, then mark the item fixed on /all-ptest with the commit reference."
      : "This item needs a CEO decision before any code change. Record the decision on /all-ptest, then act on it.",
  );
  return L.join("\n");
}

export function fixItemsSummary(items: PtestFixItemRow[]): Record<FixStatus, number> {
  const out: Record<FixStatus, number> = { open: 0, in_progress: 0, fixed: 0, rejected: 0, deferred: 0 };
  for (const i of items) out[i.fix_status] = (out[i.fix_status] ?? 0) + 1;
  return out;
}
