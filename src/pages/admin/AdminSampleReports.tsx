// Admin page for generating sample reports with automatic PDF output.
// Flow per card: Generate Report + PDF → live generator runs (with polling to
// a true terminal status, including the 202/background DPA + IR generators) →
// save-sample-report:generate_pdf renders the canonical PDF via PDFShift →
// PDF is saved to the sample-reports bucket and listed at /samples/report-output,
// where it can be downloaded and deleted.
// Auth: the signed-in admin's JWT (user_roles.admin) — no shared token needed.

import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SAMPLE_FIXTURES, type SampleFixture } from "@/lib/sampleFixtures";
import StressRunsSection from "@/components/admin/StressRunsSection";
import { runGenerator } from "@/lib/sampleGenerators";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

type SampleRow = {
  id: string;
  tool_slug: string;
  variant: string;
  title: string;
  status: string;
  source_row_id: string | null;
  source_table: string | null;
  verification: Record<string, unknown> | null;
  pdf_path: string | null;
  updated_at: string;
  // TRUNCATED SAMPLES (2026-09-04): public excerpt state. Content edits clear
  // these automatically, so "none" always means the public page shows nothing.
  preview_built_at?: string | null;
  preview_pdf_path?: string | null;
  withheld_section_count?: number | null;
  preview_toc?: Array<{ title?: string }> | null;
};

function previewLabel(s: SampleRow): string {
  if (!s.preview_built_at) return "public preview: none — rebuild needed";
  const unit = s.preview_pdf_path ? "pages" : "sections";
  const kept = s.preview_pdf_path ? 2 : (s.preview_toc?.length ? "first" : "first");
  return `public preview: built · ${kept} ${unit} shown · ${s.withheld_section_count ?? 0} ${unit} withheld`;
}

type RunState = {
  status: "idle" | "running" | "complete" | "failed";
  phase: "" | "report" | "pdf";
  log: string[];
  sourceRowId: string | null;
  resultUrl: string | null;
  pdfSaved: boolean;
};

const EMPTY_RUN: RunState = { status: "idle", phase: "", log: [], sourceRowId: null, resultUrl: null, pdfSaved: false };

// ALL-PRODUCTS-TEST: runGenerator / pollRowStatus / getOrCreatePersonalClient
// now live in src/lib/sampleGenerators.ts (imported above) so the
// /admin/all-products-test console runs the identical code path.


// Calls save-sample-report with the signed-in admin's JWT only. No shared token.
async function callSaveSampleReport(action: string, payload: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not signed in — sign in as an admin first");
  const r = await fetch(`${SUPABASE_URL}/functions/v1/save-sample-report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
  return data;
}

// TRUNCATED SAMPLES (2026-09-04): the public /samples pages read only the
// preview columns, so a published row without a built preview renders the
// fail-closed state. Publishing therefore always rebuilds the preview.
async function callBuildSamplePreview(payload: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not signed in — sign in as an admin first");
  const r = await fetch(`${SUPABASE_URL}/functions/v1/build-sample-preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
  return data;
}

export default function AdminSampleReports() {
  const { user } = useAuth();
  const [runs, setRuns] = useState<Record<string, RunState>>({});
  const [samples, setSamples] = useState<SampleRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const cancelAll = useRef(false);

  const samplesByKey = useMemo(() => {
    const m: Record<string, SampleRow> = {};
    for (const s of samples) m[`${s.tool_slug}::${s.variant}`] = s;
    return m;
  }, [samples]);

  async function reloadSamples() {
    try {
      const { rows } = await callSaveSampleReport("list", {});
      setSamples(rows as SampleRow[]);
    } catch (e) {
      toast.error(`List failed: ${(e as Error).message}`);
    }
  }

  useEffect(() => { reloadSamples(); /* eslint-disable-next-line */ }, []);

  const setRun = (key: string, patch: Partial<RunState>) =>
    setRuns((r) => ({ ...r, [key]: { ...(r[key] ?? EMPTY_RUN), ...patch } }));
  const appendLog = (key: string, msg: string) =>
    setRuns((r) => {
      const cur = r[key] ?? EMPTY_RUN;
      return { ...r, [key]: { ...cur, log: [...cur.log, msg] } };
    });

  // Full pipeline for one fixture: live generator → auto PDF → saved sample.
  async function runPipeline(fix: SampleFixture): Promise<void> {
    if (!user) throw new Error("Sign in first");
    const key = `${fix.tool_slug}::${fix.variant}`;

    // Phase 1 — live generation (reuse an existing completed run for this card).
    let run = runs[key];
    let sourceRowId = run?.status === "complete" && run.sourceRowId ? run.sourceRowId : null;
    let resultUrl = sourceRowId ? run!.resultUrl : null;
    if (!sourceRowId) {
      setRun(key, { status: "running", phase: "report", log: [], sourceRowId: null, resultUrl: null, pdfSaved: false });
      appendLog(key, `▶ Generating ${fix.title} report…`);
      const out = await runGenerator(fix, user.id, (m) => appendLog(key, m));
      sourceRowId = out.sourceRowId;
      resultUrl = out.resultUrl;
      setRun(key, { sourceRowId, resultUrl });
    } else {
      setRun(key, { status: "running", phase: "pdf" });
      appendLog(key, "✓ Reusing existing completed run");
    }

    // Phase 2 — render + save the PDF (backend retries 409s while the row settles).
    setRun(key, { phase: "pdf" });
    appendLog(key, "▶ Rendering PDF via PDFShift…");
    const res = await callSaveSampleReport("generate_pdf", {
      tool_slug: fix.tool_slug,
      variant: fix.variant,
      title: fix.title,
      scenario_summary: fix.scenario_summary,
      fixture: fix.fixture,
      source_table: fix.source_table,
      source_row_id: sourceRowId,
    });
    appendLog(key, `✅ PDF saved (${res?.bytes ?? "?"} bytes) → /samples/report-output`);
    setRun(key, { status: "complete", phase: "", pdfSaved: true });
  }

  async function onGenerate(fix: SampleFixture) {
    const key = `${fix.tool_slug}::${fix.variant}`;
    setBusy(key);
    try {
      await runPipeline(fix);
      toast.success(`${fix.title} — PDF saved to /samples/report-output`);
      await reloadSamples();
    } catch (e) {
      appendLog(key, `❌ ${(e as Error).message}`);
      setRun(key, { status: "failed", phase: "" });
      toast.error(`${fix.title}: ${(e as Error).message}`);
    } finally { setBusy(null); }
  }

  // Force a fresh generation even if a completed run exists on the card.
  async function onRegenerate(fix: SampleFixture) {
    const key = `${fix.tool_slug}::${fix.variant}`;
    setRun(key, { ...EMPTY_RUN });
    setRuns((r) => ({ ...r, [key]: { ...EMPTY_RUN } }));
    await onGenerate(fix);
  }

  async function onGenerateAll() {
    if (!user) { toast.error("Sign in first"); return; }
    setRunningAll(true);
    cancelAll.current = false;
    let ok = 0, fail = 0;
    for (const fix of SAMPLE_FIXTURES) {
      if (cancelAll.current) break;
      const key = `${fix.tool_slug}::${fix.variant}`;
      setBusy(key);
      try {
        await runPipeline(fix);
        ok++;
      } catch (e) {
        appendLog(key, `❌ ${(e as Error).message}`);
        setRun(key, { status: "failed", phase: "" });
        fail++;
      }
    }
    setBusy(null);
    setRunningAll(false);
    await reloadSamples();
    toast[fail ? "warning" : "success"](`Generate All finished — ${ok} succeeded, ${fail} failed`);
  }

  async function onSaveSnapshot(fix: SampleFixture) {
    const key = `${fix.tool_slug}::${fix.variant}`;
    const run = runs[key];
    if (!run?.sourceRowId) { toast.error("Generate first"); return; }
    setBusy(`save::${key}`);
    try {
      await callSaveSampleReport("snapshot", {
        tool_slug: fix.tool_slug,
        variant: fix.variant,
        title: fix.title,
        scenario_summary: fix.scenario_summary,
        fixture: fix.fixture,
        source_table: fix.source_table,
        source_row_id: run.sourceRowId,
      });
      toast.success("Snapshot saved");
      await reloadSamples();
    } catch (e) {
      toast.error(`Snapshot failed: ${(e as Error).message}`);
    } finally { setBusy(null); }
  }

  async function onSetStatus(sample: SampleRow, status: string) {
    setBusy(`status::${sample.id}`);
    try {
      await callSaveSampleReport("set_status", { id: sample.id, status });
      if (status === "published") {
        await callBuildSamplePreview({ id: sample.id });
        toast.success("Status → published · public preview rebuilt");
      } else {
        toast.success(`Status → ${status}`);
      }
      await reloadSamples();
    } catch (e) {
      toast.error(`Status change failed: ${(e as Error).message}`);
    } finally { setBusy(null); }
  }

  async function onRebuildPreview(sample: SampleRow) {
    setBusy(`preview::${sample.id}`);
    try {
      await callBuildSamplePreview({ id: sample.id });
      toast.success("Public preview rebuilt");
    } catch (e) {
      toast.error(`Preview rebuild failed: ${(e as Error).message}`);
    } finally { setBusy(null); }
  }

  async function onRebuildAllPreviews() {
    setBusy("preview::all");
    try {
      const res = await callBuildSamplePreview({});
      const failures = Array.isArray(res?.failures) ? res.failures.length : 0;
      const built = Array.isArray(res?.results) ? res.results.length : 0;
      if (failures > 0) toast.error(`${built} rebuilt · ${failures} failed`);
      else toast.success(`${built} public previews rebuilt`);
    } catch (e) {
      toast.error(`Preview rebuild failed: ${(e as Error).message}`);
    } finally { setBusy(null); }
  }

  return (
    <div className="min-h-screen bg-brand-cloud flex flex-col">
      <Helmet><title>Admin — Sample Reports</title></Helmet>
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl mb-1">Admin — Sample Reports</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              One click per card: the live tool generates the report, the result is
              rendered to PDF via PDFShift, and the PDF is saved automatically.
              View, download, and delete everything at{" "}
              <Link to="/admin/samples/report-output" className="text-brand-teal-text underline underline-offset-2">
                /samples/report-output
              </Link>.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={onRebuildAllPreviews} disabled={busy !== null}>
              {busy === "preview::all" ? "Rebuilding…" : "Rebuild all public previews"}
            </Button>
            {runningAll ? (
              <Button variant="destructive" onClick={() => { cancelAll.current = true; }}>
                Stop after current
              </Button>
            ) : (
              <Button onClick={onGenerateAll} disabled={busy !== null}>
                Generate All (reports + PDFs)
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/admin/samples/report-output">Open PDF output</Link>
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SAMPLE_FIXTURES.map((fix) => {
            const key = `${fix.tool_slug}::${fix.variant}`;
            const run = runs[key] ?? EMPTY_RUN;
            const sample = samplesByKey[key];
            const isBusy = busy === key;
            return (
              <div key={key} className="border rounded-lg bg-card p-4 space-y-3">
                <div>
                  <div className="text-xs font-mono text-muted-foreground">{fix.tool_slug} · {fix.variant}</div>
                  <h2 className="font-serif text-lg leading-tight">{fix.title}</h2>
                  <p className="text-xs text-muted-foreground mt-1">{fix.scenario_summary}</p>
                </div>

                <div className="text-xs font-mono flex flex-wrap gap-3">
                  <span>
                    Run: <strong>{run.status}</strong>
                    {run.status === "running" && run.phase ? ` (${run.phase})` : ""}
                  </span>
                  <span>PDF: <strong>{run.pdfSaved || sample?.pdf_path ? "saved" : "—"}</strong></span>
                  {sample && <span>Sample: <strong>{sample.status}</strong></span>}
                  {run.status === "running" && run.log.length > 0 && (
                    <span className="text-muted-foreground truncate max-w-full">
                      {run.log[run.log.length - 1]}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => onGenerate(fix)} disabled={isBusy || runningAll}>
                    {isBusy
                      ? run.phase === "pdf" ? "Rendering PDF…" : "Generating report…"
                      : run.status === "complete" && !run.pdfSaved
                        ? "Render PDF"
                        : "Generate Report + PDF"}
                  </Button>
                  {run.status === "complete" && (
                    <Button size="sm" variant="outline" onClick={() => onRegenerate(fix)} disabled={isBusy || runningAll}>
                      Regenerate
                    </Button>
                  )}
                  {run.resultUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={run.resultUrl} target="_blank" rel="noreferrer">View result</a>
                    </Button>
                  )}
                </div>

                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Curation</summary>
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => onSaveSnapshot(fix)}
                      disabled={!run.sourceRowId || busy === `save::${key}`}>
                      {busy === `save::${key}` ? "Saving…" : "Snapshot data (for publishing)"}
                    </Button>
                    {sample && (
                      <select
                        className="text-xs border rounded px-2 py-1 bg-background"
                        value={sample.status}
                        onChange={(e) => onSetStatus(sample, e.target.value)}
                        disabled={busy === `status::${sample.id}`}
                      >
                        <option value="draft">draft</option>
                        <option value="approved">approved</option>
                        <option value="published">published</option>
                      </select>
                    )}
                    {sample && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRebuildPreview(sample)}
                        disabled={busy === `preview::${sample.id}`}
                      >
                        {busy === `preview::${sample.id}` ? "Rebuilding…" : "Rebuild public preview"}
                      </Button>
                    )}
                    {sample?.pdf_path && <span className="font-mono text-muted-foreground">{sample.pdf_path}</span>}
                  </div>
                </details>

                {run.log.length > 0 && (
                  <details className="text-xs" open={run.status === "running"}>
                    <summary className="cursor-pointer">Log ({run.log.length})</summary>
                    <pre className="bg-black text-green-400 font-mono p-2 mt-1 rounded max-h-40 overflow-auto">
{run.log.join("\n")}
                    </pre>
                  </details>
                )}
              </div>
            );
          })}
        </div>
        <StressRunsSection />
      </main>
      <Footer />
    </div>
  );
}
