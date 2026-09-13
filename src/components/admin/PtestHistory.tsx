/**
 * /all-ptest — RUN HISTORY panel.
 *
 * A durable list of every review batch, and under each one the Agreed Fix List
 * and CEO Decision Sheet as TRACKED ITEMS. Each item carries its own status
 * (open / in progress / fixed / rejected / deferred), a note and a reference.
 *
 * "Fix" does not write code — it moves the item to in progress and puts a
 * complete fix brief on the clipboard (and downloads it) to hand to the
 * implementing agent. Applying code changes stays human-gated.
 */
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { downloadMarkdown } from "@/lib/ptestRun";
import {
  FIX_STATUSES,
  buildFixBrief,
  fetchBatches,
  fetchFixItems,
  fixItemsSummary,
  updateFixItem,
  type FixStatus,
  type PtestBatchRow,
  type PtestFixItemRow,
} from "@/lib/ptestHistory";

const STATUS_CLASS: Record<FixStatus, string> = {
  open: "text-muted-foreground",
  in_progress: "text-brand-teal-text",
  fixed: "text-brand-teal-text",
  rejected: "text-destructive",
  deferred: "text-muted-foreground",
};

export function PtestHistory({ refreshKey }: { refreshKey?: number }) {
  const { user } = useAuth();
  const [batches, setBatches] = useState<PtestBatchRow[]>([]);
  const [openBatch, setOpenBatch] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, PtestFixItemRow[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      setBatches(await fetchBatches());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadBatches(); }, [loadBatches, refreshKey]);

  const loadItems = useCallback(async (batchId: string) => {
    try {
      const rows = await fetchFixItems(batchId);
      setItems((prev) => ({ ...prev, [batchId]: rows }));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const toggle = (batchId: string) => {
    const next = openBatch === batchId ? null : batchId;
    setOpenBatch(next);
    if (next && !items[next]) void loadItems(next);
  };

  const patch = async (
    batchId: string,
    item: PtestFixItemRow,
    p: { fix_status?: FixStatus; fix_notes?: string | null; fix_reference?: string | null },
  ) => {
    try {
      await updateFixItem(item.id, p, user?.id ?? null);
      setItems((prev) => ({
        ...prev,
        [batchId]: (prev[batchId] ?? []).map((r) => (r.id === item.id ? { ...r, ...p } as PtestFixItemRow : r)),
      }));
    } catch (e) {
      toast({ title: "Could not save", description: (e as Error).message, variant: "destructive" });
    }
  };

  const startFix = async (batch: PtestBatchRow, item: PtestFixItemRow) => {
    const brief = buildFixBrief(item, batch);
    try {
      await navigator.clipboard.writeText(brief);
      toast({ title: "Fix brief copied", description: "Paste it to the implementing agent. Item marked in progress." });
    } catch {
      toast({ title: "Fix brief downloaded", description: "Clipboard unavailable — the brief was downloaded instead." });
    }
    downloadMarkdown(`fix-${item.tool_slug}-${item.item_id}.md`, brief);
    if (item.fix_status === "open") await patch(batch.batch_id, item, { fix_status: "in_progress" });
  };

  // Items still needing a fix: anything not yet fixed, rejected or deferred.
  const needsFix = (r: PtestFixItemRow) =>
    r.fix_status === "open" || r.fix_status === "in_progress";

  const startFixAll = async (batch: PtestBatchRow, group: PtestFixItemRow[], kind: "fix" | "ceo") => {
    const targets = group.filter(needsFix);
    if (!targets.length) return;
    const label = kind === "fix" ? "agreed-fixes" : "ceo-decisions";
    const brief = [
      `# ${kind === "fix" ? "Agreed fix list" : "CEO decision sheet"} — batch ${batch.batch_id}`,
      "",
      `${targets.length} item(s) needing a fix. Each brief is complete and self-contained.`,
      "",
      ...targets.map((it) => buildFixBrief(it, batch)),
    ].join("\n\n---\n\n");
    try {
      await navigator.clipboard.writeText(brief);
      toast({ title: "All fix briefs copied", description: `${targets.length} item(s). Paste to the implementing agent. Open items marked in progress.` });
    } catch {
      toast({ title: "All fix briefs downloaded", description: "Clipboard unavailable — the briefs were downloaded instead." });
    }
    downloadMarkdown(`fix-all-${label}-${batch.batch_id.slice(0, 8)}.md`, brief);
    for (const it of targets) {
      if (it.fix_status === "open") await patch(batch.batch_id, it, { fix_status: "in_progress" });
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Run history ({batches.length})</h2>
        <button type="button" onClick={() => void loadBatches()} className="rounded border border-border px-2 py-1 text-xs">
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!batches.length && !loading && <p className="text-xs text-muted-foreground">No runs recorded yet.</p>}

      <ul className="space-y-2">
        {batches.map((b) => {
          const rows = items[b.batch_id] ?? [];
          const sum = fixItemsSummary(rows);
          const isOpen = openBatch === b.batch_id;
          return (
            <li key={b.batch_id} className="rounded border border-border">
              <button
                type="button"
                onClick={() => toggle(b.batch_id)}
                className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2 text-left text-xs"
              >
                <span className="text-foreground">
                  {new Date(b.created_at).toLocaleString()} · {b.products.join(", ") || "—"} · {b.documents_per_product ?? "?"} doc(s) each
                </span>
                <span className="text-muted-foreground">
                  {b.industry ?? "—"} · review {b.review_effort ?? "—"} / arb {b.arbitration_effort ?? "—"} · {b.status}
                  {" · score "}
                  <span className="text-foreground">{b.batch_mean === null || b.batch_mean === undefined ? "—" : Number(b.batch_mean).toFixed(1)}</span>
                  {isOpen ? " ▾" : " ▸"}
                </span>
              </button>

              {isOpen && (
                <div className="space-y-3 border-t border-border px-3 py-3">
                  <p className="text-[11px] text-muted-foreground">
                    Batch <code>{b.batch_id}</code> · {rows.length} tracked item(s) · open {sum.open} · in progress {sum.in_progress} ·
                    fixed {sum.fixed} · rejected {sum.rejected} · deferred {sum.deferred}
                  </p>
                  {b.scores && Object.keys(b.scores).length > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Scores — {Object.entries(b.scores).map(([tool, s]) =>
                        `${tool} ${s.combined === null ? "—" : Number(s.combined).toFixed(1)}${s.arbitration === null || s.arbitration === undefined ? "" : ` (post-arb ${Number(s.arbitration).toFixed(1)})`}`,
                      ).join(" · ")}
                    </p>
                  )}

                  {(["fix", "ceo"] as const).map((kind) => {
                    const group = rows.filter((r) => r.item_kind === kind);
                    return (
                      <div key={kind}>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-xs font-medium text-foreground">
                            {kind === "fix" ? "Agreed fix list" : "CEO decision sheet"} ({group.length})
                          </h3>
                          {group.some(needsFix) && (
                            <button
                              type="button"
                              onClick={() => void startFixAll(b, group, kind)}
                              className="rounded bg-brand-teal px-2 py-1 text-[11px] text-primary-foreground"
                            >
                              Fix all ({group.filter(needsFix).length})
                            </button>
                          )}
                        </div>
                        {!group.length && <p className="text-[11px] text-muted-foreground">None.</p>}
                        <ul className="mt-1 space-y-2">
                          {group.map((it) => (
                            <li key={it.id} className="rounded border border-border p-2 text-[11px] text-muted-foreground">
                              <div className="text-foreground">{it.title}</div>
                              <div>
                                {it.tool_slug} · {it.severity ?? "—"} · {it.defect_type ?? "—"} · raised by {it.raised_by ?? "—"}
                              </div>
                              {it.code_focus && <div>Code focus: {it.code_focus}</div>}
                              {it.change_text && <div>Change: {it.change_text}</div>}
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className={STATUS_CLASS[it.fix_status]}>Status: {it.fix_status.replace("_", " ")}</span>
                                <button
                                  type="button"
                                  onClick={() => void startFix(b, it)}
                                  className="rounded bg-brand-teal px-2 py-1 text-[11px] text-primary-foreground"
                                >
                                  Fix
                                </button>
                                <select
                                  value={it.fix_status}
                                  onChange={(e) => void patch(b.batch_id, it, { fix_status: e.target.value as FixStatus })}
                                  className="rounded border border-border bg-background px-1 py-1 text-[11px]"
                                >
                                  {FIX_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                                </select>
                                <input
                                  defaultValue={it.fix_reference ?? ""}
                                  placeholder="commit / reference"
                                  onBlur={(e) => {
                                    const v = e.target.value.trim() || null;
                                    if (v !== (it.fix_reference ?? null)) void patch(b.batch_id, it, { fix_reference: v });
                                  }}
                                  className="w-40 rounded border border-border bg-background px-1 py-1 text-[11px]"
                                />
                                <input
                                  defaultValue={it.fix_notes ?? ""}
                                  placeholder="note"
                                  onBlur={(e) => {
                                    const v = e.target.value.trim() || null;
                                    if (v !== (it.fix_notes ?? null)) void patch(b.batch_id, it, { fix_notes: v });
                                  }}
                                  className="flex-1 min-w-[10rem] rounded border border-border bg-background px-1 py-1 text-[11px]"
                                />
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
