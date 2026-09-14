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
  /** DOC 261 — the settings the batch ran under (mode, prompt version, vendors, determinism, report date, golden refs). */
  settings?: Record<string, unknown> | null;
}

export interface PtestProductScore {
  claude: number | null;
  gpt: number | null;
  combined: number | null;
  derived: number | null;
  arbitration: number | null;
  documents: number;
  queued?: number;
  ceo?: number;
  observed?: number;
  by_class?: Record<string, number>;
  partial_coverage?: number;
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
  /** True when the arbitration behind this item saw only one reviewer (v2: a worker failed). */
  single_reviewer?: boolean;
  /** DOC 261 v2 — the fix class, the rule/clause it binds to, and the source finding ids. */
  fix_class?: string | null;
  rule_ref?: string | null;
  golden_ref?: string | null;
  finding_ids?: string[] | null;
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
    .select("batch_id, created_at, industry, products, documents_per_product, review_effort, arbitration_effort, status, note, scores, batch_mean, settings")
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
    const single = a.singleReviewer === true;
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
        single_reviewer: single,
        fix_class: f.fix_class ?? null,
        rule_ref: f.rule_ref ?? null,
        finding_ids: f.source_ids ?? null,
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
        code_focus: c.rule_ref ?? null,
        change_text: c.gpt_proposed_fix ?? null,
        regression_test: null,
        payload: c as unknown as Record<string, unknown>,
        single_reviewer: single,
        fix_class: c.fix_class ?? null,
        rule_ref: c.rule_ref ?? null,
        finding_ids: c.source_ids ?? null,
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
    .select("id, batch_id, tool_slug, item_kind, item_id, title, severity, defect_type, raised_by, code_focus, change_text, regression_test, payload, fix_status, fix_notes, fix_reference, decided_at, created_at, single_reviewer, fix_class, rule_ref, golden_ref, finding_ids")
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
  const v2 = !!(item.fix_class || p.fix_class);
  if (item.single_reviewer) {
    L.push(v2
      ? "Coverage: PARTIAL — at least one worker's run failed on this document; the finding was not cross-checked by every worker."
      : "Reviewer coverage: SINGLE REVIEWER — the other reviewer's run failed; this item was not cross-checked.");
  }
  L.push(line("Current status", item.fix_status));
  L.push("");

  // DOC 261 Stage 5 — the fix brief carries, in order: class + bound rule,
  // the intake values the block reads, the registry rows verbatim, the quote
  // and block key, the defect as rule-spec-vs-rendered, and the acceptance
  // test on the stored intake. Nothing truncated.
  if (v2) {
    L.push("## Grounding (DOC 261)");
    L.push(line("1. Fix class", item.fix_class ?? p.fix_class));
    L.push(line("   Bound rule / clause", item.rule_ref ?? p.rule_ref));
    L.push(line("   Classifier reason", p.class_reason));
    if (p.gate_reason) L.push(line("   Queue gate", p.gate_reason));
    const block = p.block as { kind?: string; factor_ids?: string[]; sources?: string[]; authorities?: string[] } | null | undefined;
    if (block) L.push(line("   Block", `${block.kind ?? "—"} · factors ${(block.factor_ids ?? []).join(", ") || "—"} · reads ${(block.sources ?? []).join(", ") || "—"} · cites ${(block.authorities ?? []).join("; ") || "—"}`));
    const facts = (p.intake_facts ?? []) as Array<{ key: string; value: string | null }>;
    L.push(`2. Intake values the block reads: ${facts.length ? "" : "(none recorded on the finding)"}`);
    facts.forEach((f) => L.push(`   - \`${f.key}\` = ${(f.value ?? "—").toString()}`));
    const regs = (p.registry_rows ?? []) as Array<{ id: string; subsection: string; verbatim_quote: string | null }>;
    L.push(`3. Registry rows the block cites, verbatim: ${regs.length ? "" : "(none bound — see W-LAW unbound statements for this block)"}`);
    regs.forEach((r) => L.push(`   - ${r.id} (${r.subsection}): "${r.verbatim_quote ?? "(text hydrated at review time)"}"`));
    L.push("");
  }

  if (item.item_kind === "fix") {
    L.push(line("Severity", item.severity));
    L.push(line("Defect type", item.defect_type));
    L.push(line(v2 ? "5. Defect (rule spec vs rendered)" : "Cause", p.cause));
    L.push(line("Cause layer", p.cause_layer));
    L.push(line("Code focus", item.code_focus));
    L.push(line("Change required", item.change_text));
    L.push(line(v2 ? "6. Acceptance test (stored intake)" : "Regression test", item.regression_test));
    const boundary = p.boundary_cases as string[] | undefined;
    if (boundary?.length) L.push(line("Boundary cases", boundary.join("; ")));
    const occ = (p.occurrences ?? []) as Array<Record<string, unknown>>;
    if (occ.length) {
      L.push("");
      L.push(`## ${v2 ? "4. Quote and block key" : "Occurrences"} (${occ.length}) — verbatim`);
      occ.forEach((o) => {
        L.push(`- ${o.product ?? item.tool_slug} · document ${o.company_name ?? o.document_id ?? "?"} · ${o.block_key ? `block ${o.block_key}` : `section ${o.section ?? "—"}`}`);
        L.push(`  > ${(o.quote ?? "").toString()}`);
      });
      const second = p.second_block as { block_key?: string; quote?: string | null } | null | undefined;
      if (second?.block_key) { L.push(`- second block ${second.block_key}`); L.push(`  > ${(second.quote ?? "").toString()}`); }
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
  if (v2) {
    L.push(
      item.item_kind === "fix"
        ? [
          "Implementer rules (DOC 261 §4): (1) reproduce first — regenerate the document from the stored intake and confirm the quote renders; (2) verify the law from the registry rows above, verbatim, before touching a clause; (3) classify before coding — if the honest class is judgment or intake_artifact, return it with the reason instead; (4) never add free-text inference (no regex over narrative fields, no synonym tables); if the rule needs a fact, specify the structured field and read that; (5) never override the Company's answer; (6) check the doc-N rulings in the code path; (7) tests on the golden intake in every _local mirror, full battery with a stashed baseline, commit only on parity; (8) report implemented / reinterpreted / declined and mark the item on /all-ptest with the commit reference.",
        ].join("")
        : "A judgment: a legal position, a methodology change or a new inference. Decide on /all-ptest; if adopted, implement as a clause defect or a missing structured input — never as an ad-hoc heuristic.",
    );
  } else {
    L.push(
      item.item_kind === "fix"
        ? "Apply this change in the codebase, add the regression test named above, double-check the work, then mark the item fixed on /all-ptest with the commit reference."
        : "This item needs a CEO decision before any code change. Record the decision on /all-ptest, then act on it.",
    );
  }
  return L.join("\n");
}

export function fixItemsSummary(items: PtestFixItemRow[]): Record<FixStatus, number> {
  const out: Record<FixStatus, number> = { open: 0, in_progress: 0, fixed: 0, rejected: 0, deferred: 0 };
  for (const i of items) out[i.fix_status] = (out[i.fix_status] ?? 0) + 1;
  return out;
}
