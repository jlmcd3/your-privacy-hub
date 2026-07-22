// /admin/quality-batch2/:tool/:id — reviewer surface. Reuses the customer
// OpenItemsList component verbatim; submissions route through the
// admin-submit-revision proxy (service-role internal-verification).
//
// Deviation (documented in report): the customer <RefinePanel /> is gated by
// REVISIONS_ENABLED and cannot be reused as-is without editing it, which the
// guardrail forbids. This page therefore mounts OpenItemsList directly and
// renders a locked-field summary alongside it. RefinePanel.tsx is untouched.
import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AdminOnly from "@/components/AdminOnly";
import { useAdminRefineMode } from "@/hooks/useAdminRefineMode";
import OpenItemsList, { type OpenItem } from "@/components/refine/OpenItemsList";
import { adminSubmitRevisionAnswers } from "@/lib/adminRevisionApi";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

function ReviewNote({ toolType, assessmentId }: { toolType: string; assessmentId: string }) {
  const [score, setScore] = useState<string>("");
  const [verdict, setVerdict] = useState<string>("pass");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function save() {
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes?.user?.id;
    if (!uid) { setSaving(false); toast({ title: "Not signed in", variant: "destructive" }); return; }
    const payload: Record<string, unknown> = {
      tool_type: toolType,
      assessment_id: assessmentId,
      reviewer_id: uid,
      verdict,
      notes: notes || null,
    };
    const s = Number(score);
    if (Number.isFinite(s)) payload.score = s;
    const { error } = await supabase.from("quality_batch2_reviews").insert(payload as any);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Review saved" });
      setScore(""); setNotes(""); setVerdict("pass");
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="font-serif text-lg">Review annotation</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-sm">
          Verdict
          <select
            className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            value={verdict}
            onChange={(e) => setVerdict(e.target.value)}
          >
            <option value="pass">pass</option>
            <option value="conditional_pass">conditional_pass</option>
            <option value="fail">fail</option>
          </select>
        </label>
        <label className="text-sm">
          Score (0–100)
          <input
            type="number" min={0} max={100} value={score}
            onChange={(e) => setScore(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          />
        </label>
        <div className="flex items-end">
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save review"}</Button>
        </div>
      </div>
      <label className="mt-3 block text-sm">
        Notes
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="mt-1" />
      </label>
    </div>
  );
}

function Inner() {
  const { tool, id } = useParams<{ tool: string; id: string }>();
  const toolType = tool ?? "";
  const assessmentId = id ?? "";
  const { row, loading, error, reload } = useAdminRefineMode(toolType, assessmentId);
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [lastError, setLastError] = useState<null | {
    status: number;
    code: string;
    message?: string;
    payload: unknown;
  }>(null);

  const openItems: OpenItem[] = useMemo(() => (row?.open_items ?? []) as OpenItem[], [row]);
  const openOpen = openItems.filter((i) => i.status === "open");

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (error) return <div className="p-8 text-sm text-destructive">Error: {error}</div>;
  if (!row) return <div className="p-8 text-sm">Not found.</div>;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
      <div>
        <Link to="/admin/quality-batch2" className="text-sm text-muted-foreground underline">
          ← Back to Quality Batch 2
        </Link>
        <h1 className="mt-2 font-serif text-3xl">Reviewer view</h1>
        <div className="mt-1 text-sm text-muted-foreground">
          <span className="font-mono">{toolType}</span> · <span className="font-mono">{assessmentId}</span> ·
          status <span className="font-mono">{row.status}</span> · owner{" "}
          <span className="font-mono">{row.user_id ?? "—"}</span>
        </div>
      </div>

      {lastError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-destructive">
                Revision failed · HTTP {lastError.status} · <span className="font-mono">{lastError.code}</span>
              </div>
              {lastError.message && (
                <div className="mt-1 text-sm text-destructive/90">{lastError.message}</div>
              )}
            </div>
            <button
              onClick={() => setLastError(null)}
              className="text-xs text-muted-foreground underline"
            >
              dismiss
            </button>
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-muted-foreground">Show upstream payload</summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted/40 p-2 text-xs">
{JSON.stringify(lastError.payload, null, 2)}
            </pre>
          </details>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="font-serif text-lg">Intake snapshot</h2>
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-muted-foreground">Show intake JSON</summary>
          <pre className="mt-2 max-h-96 overflow-auto rounded bg-muted/40 p-2 text-xs">
{JSON.stringify(row.intake, null, 2)}
          </pre>
        </details>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="font-serif text-lg">Open items ({openOpen.length} open / {openItems.length} total)</h2>
        {openItems.length === 0 ? (
          <div className="mt-3 text-sm text-muted-foreground">
            No open_items on this assessment. Seed a fresh doc from the index page, or wait for generation.
          </div>
        ) : (
          <div className="mt-3">
            <OpenItemsList
              items={openItems}
              submitting={submitting}
              onSubmit={async (answered) => {
                setSubmitting(true);
                setLastError(null);
                const res = await adminSubmitRevisionAnswers({
                  toolType, assessmentId, answered,
                });
                setSubmitting(false);
                if (res.kind === "accepted") {
                  toast({ title: "Revision accepted", description: "Refreshing…" });
                  setTimeout(() => reload(), 1500);
                } else {
                  const payload = (res.payload ?? {}) as Record<string, unknown>;
                  const code = String(payload.error ?? res.message ?? "unknown_error");
                  const detail =
                    typeof payload.message === "string" ? payload.message :
                    typeof (payload.qc as any)?.detail === "string" ? (payload.qc as any).detail :
                    undefined;
                  setLastError({
                    status: res.status,
                    code,
                    message: detail,
                    payload: res.payload ?? { message: res.message },
                  });
                  toast({
                    title: `Revision failed (HTTP ${res.status})`,
                    description: detail ? `${code} — ${detail}` : code,
                    variant: "destructive",
                  });
                }
              }}
            />
          </div>
        )}
      </div>


      <ReviewNote toolType={toolType} assessmentId={assessmentId} />
    </div>
  );
}

export default function QualityBatch2ReviewPage() {
  return <AdminOnly fallback={<div className="p-8 text-sm">Admin only.</div>}><Inner /></AdminOnly>;
}
