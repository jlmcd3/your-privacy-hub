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

  // ─── Per-step runner ───────────────────────────────────────────────────
  const [assessmentId, setAssessmentId] = useState<string>(
    "9c27c5fe-cb6a-470e-8253-404f00c8cff0",
  );
  const [stepBusy, setStepBusy] = useState<string | null>(null);
  const [stepResults, setStepResults] = useState<
    { step: string; at: string; pass: boolean; body: any }[]
  >([]);

  const runStep = useCallback(
    async (step: string) => {
      setStepBusy(step);
      try {
        const { data, error } = await supabase.functions.invoke(
          "test-run-meter-acceptance",
          { body: { action: "step", step, assessment_id: assessmentId } },
        );
        const body = error ? { error: error.message } : data;
        setStepResults((prev) => [
          {
            step,
            at: new Date().toISOString(),
            pass: !!(body as any)?.pass,
            body,
          },
          ...prev,
        ]);
      } finally {
        setStepBusy(null);
      }
    },
    [assessmentId],
  );

  const assertions: Assertion[] = job?.result?.assertions ?? [];
  const summary =
    job?.result?.summary ??
    (job?.status === "running"
      ? `Running… ${job?.progress ?? ""}`
      : job?.status === "failed"
        ? `Failed: ${job.error ?? "unknown error"}`
        : "");

  const textLines: string[] = [];
  for (const a of assertions) {
    textLines.push(`${a.pass ? "PASS" : "FAIL"} — ${a.name} — ${a.detail}`);
  }
  if (summary) textLines.push(summary);

  const STEPS = ["D1", "D2", "E1", "E2", "F", "TEARDOWN"];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-slate-900 mb-1">
            Stage 1 — Run-Meter Acceptance Harness
          </h1>
          <p className="text-sm text-slate-500">
            Per-step runner (one Edge Function invocation per step) plus the
            legacy full-suite background job.
          </p>
        </div>

        {/* Per-step controls */}
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 space-y-3">
          <div className="text-sm font-semibold text-slate-800">
            Per-step runner
          </div>
          <label className="block text-xs text-slate-500">
            Assessment ID
            <input
              value={assessmentId}
              onChange={(e) => setAssessmentId(e.target.value.trim())}
              className="mt-1 block w-full font-mono text-xs border border-slate-300 rounded px-2 py-1"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {STEPS.map((s) => (
              <button
                key={s}
                onClick={() => runStep(s)}
                disabled={!user || !!stepBusy}
                className="px-3 py-1.5 rounded bg-slate-800 text-white text-xs font-medium disabled:opacity-40"
              >
                {stepBusy === s ? `${s}…` : `▶ ${s}`}
              </button>
            ))}
          </div>
          {stepResults.length > 0 && (
            <div className="space-y-2 max-h-[600px] overflow-auto">
              {stepResults.map((r, i) => (
                <details
                  key={i}
                  open={i === 0}
                  className="border border-slate-200 rounded bg-slate-50"
                >
                  <summary className="cursor-pointer px-3 py-2 text-xs font-mono">
                    <span
                      className={
                        r.pass ? "text-emerald-700" : "text-red-700"
                      }
                    >
                      {r.pass ? "PASS" : "FAIL"}
                    </span>{" "}
                    — {r.step} — {r.at.slice(11, 19)}
                  </summary>
                  <pre className="whitespace-pre-wrap font-mono text-[11px] p-3 border-t border-slate-200">
                    {JSON.stringify(r.body, null, 2)}
                  </pre>
                </details>
              ))}
            </div>
          )}
        </div>

        {/* Legacy full-suite */}
        <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
          <button
            onClick={runAcceptance}
            disabled={!user || starting || job?.status === "running"}
            className="px-4 py-2 rounded bg-brand-navy text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
          >
            {starting || job?.status === "running"
              ? "Running…"
              : "▶ Run full suite (legacy)"}
          </button>
          {!user && (
            <span className="text-xs text-red-600">Sign in as admin.</span>
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
      </div>
    </div>
  );
}
