// Stress-run layer for /admin/sample-reports.
// Each run builds a randomized (persona-blended) payload, drives the SAME
// production edge function subscribers use, records the artifact in the
// harness ledger (harness_artifacts + harness-delete for cascaded cleanup),
// and — by default — renders the result to PDF via save-sample-report:
// generate_pdf so it lands at /samples/report-output for review.

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { RUNNERS, type ToolType } from "@/lib/stress/runners";
import { shortId } from "@/lib/stress/fixtures";
import {
  recordArtifact, listArtifacts, deleteArtifact, deleteAllArtifacts,
  type HarnessArtifact,
} from "@/lib/stress/ledger";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

// ToolType (stress runner keys) → sample_reports tool_slug
const TOOL_SLUG: Record<ToolType, string> = {
  "lia": "li_assessment",
  "dpia": "dpia",
  "governance": "governance",
  "biometric": "biometric",
  "dpa": "dpa",
  "ir-playbook": "ir_playbook",
  "ropa": "ropa",
  "us-notice": "us_notice",
  "eu-notice": "eu_notice",
  "registration": "registration",
  "registration-assessment": "registration",
  "cppa-risk": "cppa_risk",
  "cppa-cyber": "cppa_cyber",
};

const TOOL_LABEL: Record<string, string> = {
  "lia": "LIA", "dpia": "DPIA", "governance": "Governance", "biometric": "Biometric",
  "dpa": "DPA", "ir-playbook": "IR Playbook", "ropa": "RoPA",
  "us-notice": "US Notice", "eu-notice": "EU Notice",
  "registration": "Registration", "cppa-risk": "CPPA Risk", "cppa-cyber": "CPPA Cyber",
};

type StressState = { status: "idle" | "running" | "complete" | "failed"; log: string[] };

async function callSaveSampleReport(action: string, payload: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not signed in");
  const r = await fetch(`${SUPABASE_URL}/functions/v1/save-sample-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
  return data;
}

export default function StressRunsSection() {
  const { user } = useAuth();
  const [withPdf, setWithPdf] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [states, setStates] = useState<Record<string, StressState>>({});
  const [artifacts, setArtifacts] = useState<HarnessArtifact[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const cancelAll = useRef(false);

  const toolKeys = Object.keys(RUNNERS) as ToolType[];

  async function refresh() {
    if (!user) return;
    setArtifacts(await listArtifacts(user.id));
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user?.id]);

  const setState = (k: string, patch: Partial<StressState>) =>
    setStates((s) => ({ ...s, [k]: { ...(s[k] ?? { status: "idle", log: [] }), ...patch } }));
  const log = (k: string) => (m: string) =>
    setStates((s) => {
      const cur = s[k] ?? { status: "idle" as const, log: [] };
      return { ...s, [k]: { ...cur, log: [...cur.log, m] } };
    });

  async function runOne(tool: ToolType): Promise<void> {
    if (!user) throw new Error("Sign in first");
    const runId = crypto.randomUUID();
    const sid = shortId(runId);
    const k = tool;
    const appendLog = log(k);
    appendLog(`▶ stress-${sid}: building randomized payload + running live generator…`);
    const result = await RUNNERS[tool]({ userId: user.id, log: appendLog });
    appendLog(`✓ generated: ${result.label} (${result.targetTable}/${result.targetId})`);
    await recordArtifact({
      runId, adminUserId: user.id, toolType: tool,
      targetTable: result.targetTable, targetId: result.targetId,
      label: `stress-${sid} · ${result.label}`,
    });
    if (withPdf) {
      appendLog("▶ Rendering PDF via PDFShift…");
      const res = await callSaveSampleReport("generate_pdf", {
        tool_slug: TOOL_SLUG[tool],
        variant: `stress-${sid}`,
        title: `[stress-${sid}] ${result.label}`,
        scenario_summary: "Randomized stress run (persona-blended payload). Exact inputs stored in fixture.",
        fixture: result.payload,
        source_table: result.targetTable,
        source_row_id: result.pdfTargetId ?? result.targetId,
      });
      appendLog(`✅ PDF saved (${res?.bytes ?? "?"} bytes) → /samples/report-output`);
    } else {
      appendLog("✓ report-only run (PDF skipped)");
    }
  }

  const [running, setRunning] = useState<Set<string>>(new Set());
  const markRunning = (k: string, on: boolean) =>
    setRunning((s) => {
      const next = new Set(s);
      if (on) next.add(k); else next.delete(k);
      return next;
    });

  async function onRun(tool: ToolType) {
    const n = Math.max(1, Math.min(5, counts[tool] ?? 1));
    markRunning(tool, true);
    setState(tool, { status: "running", log: [] });
    const results = await Promise.all(
      Array.from({ length: n }, async () => {
        try { await runOne(tool); return true; }
        catch (e) { log(tool)(`❌ ${(e as Error).message}`); return false; }
      }),
    );
    const ok = results.filter(Boolean).length;
    const fail = results.length - ok;
    setState(tool, { status: fail ? "failed" : "complete" });
    markRunning(tool, false);
    await refresh();
    toast[fail ? "warning" : "success"](`${TOOL_LABEL[tool]} stress: ${ok} ok, ${fail} failed`);
  }

  async function onDeleteArtifact(a: HarnessArtifact) {
    setBusy(`del::${a.id}`);
    try {
      await deleteArtifact(a.id);
      toast.success("Stress artifact deleted (source rows cascaded)");
      await refresh();
    } catch (e) {
      toast.error(`Delete failed: ${(e as Error).message}`);
    } finally { setBusy(null); }
  }

  // Deletes ALL ledgered source data via harness-delete, then removes every
  // stress-* row (and its PDF) from sample_reports.
  async function onDeleteAll() {
    if (!confirm("Delete ALL stress data? This removes the generated source rows, the sample rows, and the PDFs.")) return;
    setBusy("delall");
    try {
      const deleted = await deleteAllArtifacts();
      const { rows } = await callSaveSampleReport("list", {});
      const stressRows = (rows as Array<{ id: string; variant: string }>).filter((r) => r.variant.startsWith("stress-"));
      for (const r of stressRows) {
        await callSaveSampleReport("delete", { id: r.id });
      }
      toast.success(`Deleted ${deleted} source artifact(s) and ${stressRows.length} stress PDF row(s)`);
      await refresh();
    } catch (e) {
      toast.error(`Delete all failed: ${(e as Error).message}`);
    } finally { setBusy(null); }
  }

  return (
    <section className="space-y-4 pt-8 border-t">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl mb-1">Stress runs — randomized data</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Each run blends fields across four Rudolph-universe personas (org, sector and
            jurisdiction stay coherent; everything else randomizes) and drives the same
            production edge functions subscribers use. PDFs land at{" "}
            <Link to="/samples/report-output" className="text-brand-teal underline underline-offset-2">/samples/report-output</Link>;
            the exact randomized inputs are stored on each sample row for traceability.
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={withPdf} onCheckedChange={(v) => setWithPdf(v === true)} />
            Generate PDF
          </label>
          <Button variant="destructive" size="sm" onClick={onDeleteAll} disabled={busy !== null || running.size > 0}>
            {busy === "delall" ? "Deleting…" : "Delete all stress data"}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {toolKeys.map((tool) => {
          const st = states[tool] ?? { status: "idle" as const, log: [] };
          return (
            <div key={tool} className="border rounded-lg bg-card p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="font-serif">{TOOL_LABEL[tool] ?? tool}</div>
                <div className="flex items-center gap-2">
                  <select
                    className="text-xs border rounded px-1.5 py-1 bg-background"
                    value={counts[tool] ?? 1}
                    onChange={(e) => setCounts((c) => ({ ...c, [tool]: Number(e.target.value) }))}
                    disabled={running.has(tool)}
                  >
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}×</option>)}
                  </select>
                  <Button size="sm" onClick={() => onRun(tool)} disabled={running.has(tool)}>
                    {running.has(tool) ? "Running…" : "Run stress"}
                  </Button>
                </div>
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                {st.status}{st.status === "running" && st.log.length ? ` — ${st.log[st.log.length - 1]}` : ""}
              </div>
              {st.log.length > 0 && (
                <details className="text-xs" open={st.status === "running"}>
                  <summary className="cursor-pointer">Log ({st.log.length})</summary>
                  <pre className="bg-black text-green-400 font-mono p-2 mt-1 rounded max-h-32 overflow-auto">
{st.log.join("\n")}
                  </pre>
                </details>
              )}
            </div>
          );
        })}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer font-medium">Stress artifacts ledger ({artifacts.length})</summary>
        <div className="mt-2 space-y-1">
          {artifacts.length === 0 && <p className="text-xs text-muted-foreground">No stress artifacts recorded.</p>}
          {artifacts.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 text-xs border rounded px-2 py-1.5 bg-card">
              <span className="font-mono truncate">{a.tool_type} · {a.label ?? a.target_id} · {new Date(a.created_at).toLocaleString()}</span>
              <Button size="sm" variant="outline" onClick={() => onDeleteArtifact(a)} disabled={busy === `del::${a.id}`}>
                {busy === `del::${a.id}` ? "…" : "Delete"}
              </Button>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
