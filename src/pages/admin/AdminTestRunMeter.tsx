/**
 * Stage 1 Acceptance Harness — run-meter + locking + regen + extension.
 * Route: /admin/test-run-meter
 * Admin-gated the same way as /admin/test-assertions.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Assertion = { name: string; pass: boolean; detail: string };
type JobRow = {
  id: string;
  status: string;
  progress: string | null;
  error: string | null;
  result: {
    assertions?: Assertion[];
    summary?: string;
    passed?: number;
    total?: number;
  } | null;
};

export default function AdminTestRunMeter() {
  const { user } = useAuth();
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobRow | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const pollTimer = useRef<number | null>(null);

  const stopPolling = () => {
    if (pollTimer.current !== null) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

  const runAcceptance = useCallback(async () => {
    if (!user) return;
    setStarting(true);
    setStartError(null);
    setJob(null);
    setJobId(null);
    stopPolling();
    try {
      const { data, error } = await supabase.functions.invoke(
        "test-run-meter-acceptance",
        { body: { action: "start" } },
      );
      if (error) throw error;
      const id = (data as any)?.job_id as string | undefined;
      if (!id) throw new Error("no job_id returned");
      setJobId(id);
      pollTimer.current = window.setInterval(async () => {
        const { data: row } = await supabase
          .from("long_running_jobs" as any)
          .select("id, status, progress, error, result")
          .eq("id", id)
          .maybeSingle();
        if (!row) return;
        setJob(row as unknown as JobRow);
        if ((row as any).status === "complete" || (row as any).status === "failed") {
          stopPolling();
        }
      }, 2000) as unknown as number;
    } catch (e) {
      setStartError((e as Error)?.message ?? String(e));
    } finally {
      setStarting(false);
    }
  }, [user]);

  const assertions: Assertion[] = job?.result?.assertions ?? [];
  const summary =
    job?.result?.summary ??
    (job?.status === "running"
      ? `Running… ${job?.progress ?? ""}`
      : job?.status === "failed"
        ? `Failed: ${job.error ?? "unknown error"}`
        : "");

  // Plain-text block that document.body.textContent picks up cleanly, matching
  // the existing test battery pattern.
  const textLines: string[] = [];
  for (const a of assertions) {
    textLines.push(`${a.pass ? "PASS" : "FAIL"} — ${a.name} — ${a.detail}`);
  }
  if (summary) textLines.push(summary);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-slate-900 mb-1">
            Stage 1 — Run-Meter Acceptance Harness
          </h1>
          <p className="text-sm text-slate-500">
            End-to-end check of tool_run_meter, tool_run_versions, locked-field
            enforcement, budget exhaustion, and extension grant against LIA.
            Creates and tears down a dedicated test assessment (no Stripe).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={runAcceptance}
            disabled={!user || starting || job?.status === "running"}
            className="px-4 py-2 rounded bg-brand-navy text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
          >
            {starting || job?.status === "running" ? "Running…" : "▶ Run acceptance"}
          </button>
          {!user && (
            <span className="text-xs text-red-600">
              Sign in as admin to run.
            </span>
          )}
          {startError && (
            <span className="text-xs text-red-600">Error: {startError}</span>
          )}
          {jobId && (
            <span className="text-xs text-slate-500 font-mono">
              job {jobId.slice(0, 8)}…
            </span>
          )}
        </div>

        {job && (
          <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
            <div className="text-sm mb-3">
              <span className="text-slate-500">Status </span>
              <span className="font-semibold">{job.status}</span>
              {job.progress && (
                <span className="text-slate-500 ml-3">{job.progress}</span>
              )}
            </div>
            <pre
              data-testid="acceptance-output"
              className="whitespace-pre-wrap font-mono text-xs bg-slate-50 border border-slate-200 rounded p-3"
            >
              {textLines.join("\n") || "(no output yet)"}
            </pre>
          </div>
        )}

        <div className="text-xs text-slate-400 pb-8">
          Stage 1 acceptance — dev/admin tool. 6 LIA generations run
          sequentially; expect roughly 2–3 minutes end-to-end.
        </div>
      </div>
    </div>
  );
}
