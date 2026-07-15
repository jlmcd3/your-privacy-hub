// QualityLoop3 — RC-D admin console for QL3 (dummy-answer revision loop).
//
// Minimal, self-contained view. QL2 remains untouched. This page:
//  * Lets an admin start a new QL3 run against a specific assessment_id.
//  * Lists the last 30 quality_loop3_runs rows with terminal state, pre/post
//    scores, item counts, and QC dispatch status.
//  * Never edits or reads QL2 tables.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const TOOLS = [
  "governance", "cppa-risk", "cppa-cyber", "cppa-admt",
  "dpia", "lia", "ir-playbook", "biometric", "dpa",
];

// QL3 tool slug → quality_run_documents.tool value.
const DOC_TOOL_MAP: Record<string, string> = {
  governance: "governance",
  "cppa-risk": "cppa-risk",
  "cppa-cyber": "cppa-cyber",
  "cppa-admt": "cppa-admt",
  dpia: "dpia",
  lia: "lia",
  "ir-playbook": "ir-playbook",
  biometric: "biometric-checker",
  dpa: "dpa-generator",
};

function fmtRelTime(iso: string): string {
  const d = new Date(iso).getTime();
  const s = Math.round((Date.now() - d) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

type Ql3Run = {
  id: string;
  tool_slug: string;
  assessment_id: string | null;
  phase: string;
  pass_number: number;
  pre_score: number | null;
  post_score: number | null;
  items_before: number | null;
  items_after: number | null;
  items_resolved: number | null;
  qc_result: any;
  error_message: string | null;
  notes: string | null;
  terminal_at: string | null;
  created_at: string;
};

export default function QualityLoop3() {
  const [tool, setTool] = useState<string>("governance");
  const [assessmentId, setAssessmentId] = useState("");
  const [notes, setNotes] = useState("");
  const [starting, setStarting] = useState(false);
  const [runs, setRuns] = useState<Ql3Run[]>([]);
  const [loading, setLoading] = useState(false);
  const [prefillHint, setPrefillHint] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    const { data, error } = await supabase
      .from("quality_loop3_runs" as any)
      .select("id, tool_slug, assessment_id, phase, pass_number, pre_score, post_score, items_before, items_after, items_resolved, qc_result, error_message, notes, terminal_at, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    setLoading(false);
    if (error) { toast.error(`Load failed: ${error.message}`); return; }
    setRuns((data as any) ?? []);
  }
  useEffect(() => { refresh(); const t = setInterval(refresh, 8000); return () => clearInterval(t); }, []);

  // Pre-fill Assessment ID from latest completed quality_run_documents row
  // for the selected tool. Only "complete" is treated as scored/completed —
  // observed status values in the table: complete, evaluating, building, error.
  useEffect(() => {
    let cancelled = false;
    const docTool = DOC_TOOL_MAP[tool];
    setPrefillHint(null);
    setAssessmentId("");
    if (!docTool) return;
    (async () => {
      const { data, error } = await supabase
        .from("quality_run_documents" as any)
        .select("source_row_id, doc_number, created_at, status")
        .eq("tool", docTool)
        .eq("status", "complete")
        .not("source_row_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (cancelled) return;
      if (error) return; // silent — pre-fill is a convenience, never blocking
      const row = (data as any)?.[0];
      if (row?.source_row_id) {
        setAssessmentId(row.source_row_id);
        setPrefillHint(`pre-filled from run-quality-batch doc #${row.doc_number} · ${fmtRelTime(row.created_at)}`);
      }
    })();
    return () => { cancelled = true; };
  }, [tool]);

  async function startRun() {
    if (!assessmentId.trim()) { toast.error("assessment_id required"); return; }
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ql3-orchestrator", {
        body: { action: "kickoff", tool_slug: tool, assessment_id: assessmentId.trim(), notes: notes || null },
      });
      if (error) throw error;
      toast.success(`QL3 run started: ${(data as any)?.run_id ?? "ok"}`);
      setAssessmentId(""); setNotes("");
      refresh();
    } catch (e: any) {
      toast.error(`Kickoff failed: ${e?.message ?? String(e)}`);
    } finally { setStarting(false); }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-serif text-foreground">Quality Loop 3</h1>
        <span className="text-xs text-muted-foreground font-mono">RC-D — dummy-answer revision</span>
      </div>

      <Card>
        <CardHeader><CardTitle>Start a new QL3 pass</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Tool</Label>
              <Select value={tool} onValueChange={setTool}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TOOLS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assessment ID (UUID)</Label>
              <Input value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)} placeholder="terminal assessment row id" />
            </div>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. RC-D pass 1 for governance forced-ask fixture" />
          </div>
          <Button onClick={startRun} disabled={starting}>{starting ? "Starting…" : "Kickoff QL3 run"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent runs</CardTitle>
          <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>{loading ? "…" : "Refresh"}</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {runs.length === 0 && <p className="text-muted-foreground">No QL3 runs yet.</p>}
            {runs.map((r) => (
              <div key={r.id} className="border rounded p-3 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{r.tool_slug}</Badge>
                  <Badge variant={r.phase === "done" ? "default" : r.phase === "failed" ? "destructive" : "secondary"}>{r.phase}</Badge>
                  <span className="font-mono text-xs">pass {r.pass_number}</span>
                  <span className="font-mono text-xs text-muted-foreground">{r.id.slice(0, 8)}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  assessment: <span className="font-mono">{r.assessment_id?.slice(0, 8) ?? "—"}</span>
                  {" · "}items: {r.items_before ?? "?"} → {r.items_after ?? "?"} (resolved {r.items_resolved ?? 0})
                  {" · "}score: {r.pre_score?.toFixed?.(3) ?? "—"} → {r.post_score?.toFixed?.(3) ?? "—"}
                </div>
                {r.qc_result?.dispatch_status != null && (
                  <div className="text-xs font-mono">dispatch HTTP {r.qc_result.dispatch_status}
                    {Array.isArray(r.qc_result?.upstream?.verdicts) && ` · verdicts=${r.qc_result.upstream.verdicts.length}`}
                    {Array.isArray(r.qc_result?.upstream?.changed_paths) && ` · changed_paths=${r.qc_result.upstream.changed_paths.length}`}
                  </div>
                )}
                {r.error_message && <div className="text-xs text-destructive">error: {r.error_message}</div>}
                {r.notes && <div className="text-xs italic text-muted-foreground">{r.notes}</div>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
