// QualityLoop.tsx — admin dashboard for the quality refinement loop.
// Route: /admin/quality-loop

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ExternalLink, RefreshCw } from "lucide-react";

const TOOLS = [
  { id: "cppa-admt",  label: "CPPA ADMT Assessment",    edgeFn: "run-admt-checker" },
  { id: "cppa-risk",  label: "CPPA Risk Assessment",     edgeFn: "run-cppa-risk-assessment" },
  { id: "cppa-cyber", label: "CPPA Cybersecurity Audit", edgeFn: "run-cppa-cybersecurity" },
  { id: "lia",        label: "LIA Tool",                 edgeFn: "run-li-assessment" },
  { id: "dpia",       label: "DPIA Framework",           edgeFn: "run-dpia-framework" },
  { id: "governance", label: "Governance Assessment",    edgeFn: "run-governance-assessment" },
];

const DIMS = [
  { id: "accuracy",      label: "Accuracy",        weight: "30%" },
  { id: "citation",      label: "Citation",         weight: "25%" },
  { id: "hallucination", label: "No Hallucination", weight: "20%" },
  { id: "analysis",      label: "Analysis",         weight: "15%" },
  { id: "intelligence",  label: "Intelligence",     weight: "5%"  },
  { id: "formatting",    label: "Formatting",       weight: "5%"  },
];

const IN_PROGRESS_STATUSES = ["pending", "generating", "building", "evaluating"];
const TERMINAL_STATUSES = ["complete", "error", "cancelled"];

type Run = {
  id: string; tool: string; status: string; batch_size: number; run_number: number;
  score_accuracy: number|null; score_citation: number|null; score_hallucination: number|null;
  score_analysis: number|null; score_intelligence: number|null; score_formatting: number|null;
  score_overall: number|null;
  gpt_score_overall: number|null;
  cross_review_complete: boolean;
  gpt_only_count: number;
  conflict_count: number;
  checks_total: number; checks_passed: number; checks_failed: number;
  started_at: string; completed_at: string|null; error: string|null;
  progress_log: any;
};

type CheckResult = {
  id: string; run_id: string; check_id: string; check_type: string;
  dimension: string; severity: string;
  pass_count: number; fail_count: number; fail_rate: number;
  sample_evidence: string[]|null;
  gpt_pass_count: number|null; gpt_fail_count: number|null; gpt_fail_rate: number|null;
  gpt_sample_evidence: string[]|null;
  cross_review_category: string|null; cross_review_summary: string|null;
  proposed_fix: string|null; fix_location: string|null;
  fix_selected: boolean; fix_applied: boolean;
  fix_commit_sha: string|null; fix_applied_at: string|null;
};

type Patch = {
  id: string; check_id: string; patch_description: string;
  commit_sha: string|null; commit_url: string|null; applied_at: string;
};

const severityClasses: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high:     "bg-orange-100 text-orange-700 border-orange-200",
  medium:   "bg-amber-100 text-amber-700 border-amber-200",
  low:      "bg-gray-100 text-gray-600 border-gray-200",
};

const crossCategoryClasses: Record<string, string> = {
  agree:       "bg-green-100 text-green-700 border-green-200",
  claude_only: "bg-blue-100 text-blue-700 border-blue-200",
  gpt_only:    "bg-purple-100 text-purple-800 border-purple-300",
  conflict:    "bg-red-100 text-red-700 border-red-200",
};

const crossCategoryLabels: Record<string, string> = {
  agree:       "✓ Both agree",
  claude_only: "Claude only",
  gpt_only:    "⚠ GPT only",
  conflict:    "⚡ Conflict",
};

function ScoreCard({ label, score, weight }: { label: string; score: number|null; weight: string }) {
  const v   = score ?? 0;
  const cls = v >= 80 ? "text-emerald-600" : v >= 60 ? "text-amber-600" : "text-red-600";
  return (
    <div className="flex flex-col items-center gap-1 px-3">
      <span className={`text-2xl font-bold ${cls}`}>{score != null ? v : "—"}</span>
      <span className="text-xs text-gray-500 text-center leading-tight">{label}</span>
      <span className="text-[10px] text-gray-400">{weight}</span>
      <Progress value={v} className="h-1 w-16 mt-0.5" />
    </div>
  );
}

function RunLog({ entries, live }: { entries: Array<{ t: string; level: string; msg: string }>; live: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [entries.length]);
  const levelClass: Record<string, string> = {
    info: "text-gray-300", success: "text-emerald-300", warn: "text-amber-300", error: "text-red-300",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          Live activity log
          {live && <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />}
        </h2>
        <span className="text-xs text-gray-400">{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
      </div>
      <div ref={ref} className="bg-[#0c1722] text-gray-100 rounded-lg p-3 font-mono text-xs leading-relaxed max-h-72 overflow-y-auto">
        {entries.map((e, i) => {
          const time = new Date(e.t).toLocaleTimeString();
          return (
            <div key={i} className="flex gap-2">
              <span className="text-gray-500 shrink-0">{time}</span>
              <span className={`shrink-0 uppercase text-[10px] font-semibold w-14 ${levelClass[e.level] ?? "text-gray-400"}`}>
                {e.level}
              </span>
              <span className={`${levelClass[e.level] ?? "text-gray-200"} whitespace-pre-wrap break-words`}>{e.msg}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function QualityLoop() {
  const [tool, setTool]                     = useState("cppa-admt");
  const [batchSize, setBatchSize]           = useState(10);
  const [running, setRunning]               = useState(false);
  const [applying, setApplying]             = useState(false);
  const [activeRun, setActiveRun]           = useState<Run|null>(null);
  const [prevRuns, setPrevRuns]             = useState<Run[]>([]);
  const [checks, setChecks]                 = useState<CheckResult[]>([]);
  const [patches, setPatches]               = useState<Patch[]>([]);
  const [selectedFixes, setSelectedFixes]   = useState<Set<string>>(new Set());
  const [expandedFix, setExpandedFix]       = useState<string|null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  const loadRun = useCallback(async (runId: string) => {
    const { data } = await supabase.from("quality_runs").select("*").eq("id", runId).single();
    if (data) {
      setActiveRun(data as Run);
      if (TERMINAL_STATUSES.includes(data.status)) stopPolling();
    }
  }, []);

  const loadChecks = useCallback(async (runId: string) => {
    const { data } = await supabase.from("quality_check_results")
      .select("*").eq("run_id", runId).order("fail_rate", { ascending: false });
    setChecks((data ?? []) as CheckResult[]);
  }, []);

  const loadPrevRuns = useCallback(async (t: string) => {
    const { data } = await supabase.from("quality_runs")
      .select("*").eq("tool", t).order("run_number", { ascending: false }).limit(10);
    setPrevRuns((data ?? []) as Run[]);
  }, []);

  const loadPatches = useCallback(async (t: string) => {
    const { data } = await supabase.from("quality_applied_patches")
      .select("*").eq("tool", t).order("applied_at", { ascending: false }).limit(20);
    setPatches((data ?? []) as Patch[]);
  }, []);

  useEffect(() => {
    loadPrevRuns(tool);
    loadPatches(tool);
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  useEffect(() => {
    (async () => {
      const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data } = await supabase.from("quality_runs")
        .select("*").eq("tool", tool).in("status", IN_PROGRESS_STATUSES)
        .gte("started_at", cutoff)
        .order("started_at", { ascending: false }).limit(1).maybeSingle();
      if (data) {
        setActiveRun(data as Run);
        setRunning(true);
        pollRef.current = setInterval(() => { loadRun(data.id); loadChecks(data.id); }, 3000);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  const startRun = async () => {
    setRunning(true);
    setActiveRun(null);
    setChecks([]);
    setSelectedFixes(new Set());
    try {
      const { data, error } = await supabase.functions.invoke("run-quality-batch", {
        body: { tool, batch_size: batchSize },
      });
      if (error) throw error;
      pollRef.current = setInterval(async () => {
        await loadRun(data.run_id);
        await loadChecks(data.run_id);
      }, 3000);
    } catch (e: any) {
      toast.error(`Run failed: ${e.message}`);
      setRunning(false);
    }
  };

  const stopRun = async () => {
    if (!activeRun) return;
    if (!confirm("Stop the current run? Any in-flight document will finish, then the run will halt.")) return;
    // Cancel any in-progress runs for this tool (defensive: also flags orphans).
    const { error } = await supabase.from("quality_runs")
      .update({ cancel_requested: true })
      .eq("tool", tool).in("status", IN_PROGRESS_STATUSES);
    if (error) { toast.error(`Stop failed: ${error.message}`); return; }
    toast.message("Stop requested — run will halt after the current document.");
    await loadRun(activeRun.id);
  };

  useEffect(() => {
    if (activeRun && TERMINAL_STATUSES.includes(activeRun.status)) {
      setRunning(false);
      stopPolling();
      if (activeRun.status === "complete") { loadPrevRuns(tool); loadPatches(tool); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRun?.status, tool]);

  const toggleFix = (id: string) => {
    const next = new Set(selectedFixes);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedFixes(next);
  };

  const applyFixes = async () => {
    if (!selectedFixes.size) return;
    setApplying(true);
    try {
      const { data, error } = await supabase.functions.invoke("apply-quality-fix", {
        body: { check_result_ids: [...selectedFixes] },
      });
      if (error) throw error;
      if (data.all_succeeded) {
        toast.success(data.message);
        for (const url of data.commit_urls ?? []) {
          toast.message("View commit on GitHub", {
            action: { label: "Open", onClick: () => window.open(url, "_blank") },
          });
        }
      } else {
        toast.warning(data.message);
      }
      setSelectedFixes(new Set());
      if (activeRun) await loadChecks(activeRun.id);
      await loadPatches(tool);
    } catch (e: any) {
      toast.error(`Apply failed: ${e.message}`);
    } finally {
      setApplying(false);
    }
  };

  const statusLabel = (s: string) => ({
    pending: "Pending", generating: "Generating intakes…", building: "Building documents…",
    evaluating: "Evaluating…", complete: "Complete", error: "Error", cancelled: "Cancelled",
  }[s] ?? s);

  const statusColor = (s: string) =>
    s === "complete" ? "text-emerald-600"
    : s === "error" ? "text-red-600"
    : s === "cancelled" ? "text-amber-600"
    : "text-blue-600";

  const failingChecks  = checks.filter(c => c.fail_count > 0 && !c.fix_applied);
  const appliedChecks  = checks.filter(c => c.fix_applied);
  const passingChecks  = checks.filter(c => c.fail_count === 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-6xl mx-auto px-4 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0c2a44]">Quality Refinement Loop</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Run tests → review findings → select fixes → push to main → run again to measure improvement.
            GPT-4o reviews the same documents independently; Claude cross-reviews both evaluations.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Tool</label>
            <select value={tool} onChange={e => setTool(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-52" disabled={running}>
              {TOOLS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Documents</label>
            <select value={batchSize} onChange={e => setBatchSize(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" disabled={running}>
              {[5, 10, 20].map(n => <option key={n} value={n}>{n} documents</option>)}
            </select>
          </div>
          <Button onClick={startRun} disabled={running} className="bg-[#0c2a44] hover:bg-[#1a3a5c] text-white h-10">
            {running
              ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Running…</>
              : "▶ Run Tests"}
          </Button>
          {activeRun && running && (
            <span className={`text-sm font-medium ${statusColor(activeRun.status)}`}>
              {statusLabel(activeRun.status)}
            </span>
          )}
        </div>

        {activeRun && Array.isArray(activeRun.progress_log) && activeRun.progress_log.length > 0 && (
          <RunLog entries={activeRun.progress_log} live={running} />
        )}

        {activeRun && activeRun.score_overall != null && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-700">
                Run #{activeRun.run_number} · {activeRun.batch_size} documents
                <span className={`ml-3 text-xs font-medium ${statusColor(activeRun.status)}`}>
                  {statusLabel(activeRun.status)}
                </span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-gray-900">{activeRun.score_overall}</span>
                <span className="text-gray-400 text-sm">/ 100</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-1 mb-2">
              {DIMS.map(dim => (
                <ScoreCard key={dim.id} label={dim.label} weight={dim.weight}
                  score={(activeRun as any)[`score_${dim.id}`]} />
              ))}
            </div>

            {activeRun.cross_review_complete && activeRun.gpt_score_overall != null && (
              <div className="border-t border-dashed border-gray-200 mt-4 pt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-500">GPT-4o independent review</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-purple-700">{activeRun.gpt_score_overall}</span>
                    <span className="text-gray-400 text-xs">/ 100</span>
                    {activeRun.gpt_only_count > 0 && (
                      <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded px-2 py-0.5">
                        {activeRun.gpt_only_count} GPT-only {activeRun.gpt_only_count === 1 ? "finding" : "findings"}
                      </span>
                    )}
                    {activeRun.conflict_count > 0 && (
                      <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded px-2 py-0.5">
                        {activeRun.conflict_count} {activeRun.conflict_count === 1 ? "conflict" : "conflicts"}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  GPT-4o reviewed the same {activeRun.batch_size} documents independently.
                  {activeRun.gpt_only_count > 0 && ` ${activeRun.gpt_only_count} finding${activeRun.gpt_only_count > 1 ? "s" : ""} flagged only by GPT-4o (purple) are your highest-priority prompt improvements.`}
                  {activeRun.conflict_count > 0 && ` ${activeRun.conflict_count} conflict${activeRun.conflict_count > 1 ? "s" : ""} require manual legal review.`}
                </p>
              </div>
            )}

            {activeRun.error && (
              <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{activeRun.error}</div>
            )}
          </div>
        )}

        {checks.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-800">
                Findings
                <span className="ml-2 text-xs text-gray-400 font-normal">
                  {failingChecks.length} failing · {passingChecks.length} passing
                </span>
              </h2>
              {selectedFixes.size > 0 && (
                <Button onClick={applyFixes} disabled={applying}
                  className="bg-[#2d9b90] hover:bg-[#237a70] text-white h-8 text-sm">
                  {applying
                    ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Pushing to main…</>
                    : `Apply ${selectedFixes.size} fix${selectedFixes.size > 1 ? "es" : ""} → push to main`}
                </Button>
              )}
            </div>

            {failingChecks.length > 0 && (
              <div className="space-y-2 mb-4">
                {failingChecks.map(chk => {
                  const isConflict   = chk.cross_review_category === "conflict";
                  const canSelect    = !!chk.proposed_fix && !isConflict;
                  const cardBorder   = selectedFixes.has(chk.id) ? "border-[#2d9b90] bg-teal-50"
                    : isConflict ? "border-red-200 bg-red-50"
                    : "border-orange-200 bg-orange-50";

                  return (
                    <div key={chk.id} className={`border rounded-lg p-4 ${cardBorder}`}>
                      <div className="flex items-start gap-3">
                        {canSelect && (
                          <Checkbox checked={selectedFixes.has(chk.id)}
                            onCheckedChange={() => toggleFix(chk.id)}
                            className="mt-0.5 shrink-0" />
                        )}
                        {!canSelect && <div className="w-4 h-4 mt-0.5 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="font-mono text-xs font-semibold text-gray-700">{chk.check_id}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${severityClasses[chk.severity] ?? severityClasses.low}`}>
                              {chk.severity}
                            </span>
                            <span className="text-xs text-gray-400">{chk.dimension}</span>
                            <span className={`text-xs font-semibold ${chk.fail_rate > 0.5 ? "text-red-600" : "text-amber-600"}`}>
                              {Math.round(chk.fail_rate * 100)}% fail ({chk.fail_count}/{chk.pass_count + chk.fail_count})
                            </span>
                            {chk.cross_review_category && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${crossCategoryClasses[chk.cross_review_category] ?? ""}`}>
                                {crossCategoryLabels[chk.cross_review_category] ?? chk.cross_review_category}
                              </span>
                            )}
                          </div>

                          {chk.sample_evidence?.[0] && (
                            <div className="text-xs text-gray-600 bg-white border border-gray-200 rounded px-2 py-1 font-mono mb-1 truncate">
                              <span className="text-gray-400 mr-1">Claude:</span>{chk.sample_evidence[0]}
                            </div>
                          )}

                          {chk.gpt_sample_evidence?.[0] && (chk.cross_review_category === "gpt_only" || chk.cross_review_category === "conflict") && (
                            <div className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded px-2 py-1 font-mono mb-2 truncate">
                              <span className="font-semibold mr-1">GPT-4o:</span>{chk.gpt_sample_evidence[0]}
                            </div>
                          )}

                          {chk.cross_review_category === "gpt_only" && chk.cross_review_summary && (
                            <div className="text-xs text-purple-800 bg-purple-50 border border-purple-200 rounded px-2 py-1.5 mb-2">
                              <span className="font-semibold">Cross-review: </span>{chk.cross_review_summary}
                            </div>
                          )}

                          {isConflict && (
                            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5 mb-2">
                              <span className="font-semibold">⚡ Conflict: </span>
                              Claude and GPT-4o reached different conclusions — manual legal review required before applying any fix.
                            </div>
                          )}

                          {chk.proposed_fix && (
                            <div>
                              <button onClick={() => setExpandedFix(expandedFix === chk.id ? null : chk.id)}
                                className="text-xs text-blue-600 hover:underline mb-1">
                                {expandedFix === chk.id ? "Hide proposed fix ▲" : "View proposed fix ▼"}
                              </button>
                              {expandedFix === chk.id && (
                                <div className="text-xs text-gray-700 bg-blue-50 border border-blue-200 rounded p-2 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                                  {chk.proposed_fix}
                                </div>
                              )}
                              {chk.fix_location && (
                                <div className="text-[10px] text-gray-400 mt-1">Location: {chk.fix_location}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {passingChecks.length > 0 && (
              <div className="border border-green-200 rounded-lg p-3 bg-green-50 mb-2">
                <div className="text-xs font-medium text-green-700 mb-1">✓ Passing ({passingChecks.length})</div>
                <div className="flex flex-wrap gap-1">
                  {passingChecks.map(c => (
                    <span key={c.id} className="text-[10px] font-mono bg-white border border-green-200 rounded px-1.5 py-0.5 text-green-700">
                      {c.check_id}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {appliedChecks.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="text-xs font-medium text-gray-500 mb-1">✓ Fixes already applied ({appliedChecks.length})</div>
                <div className="flex flex-wrap gap-1">
                  {appliedChecks.map(c => (
                    <span key={c.id} className="text-[10px] font-mono bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-500">
                      {c.check_id}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {patches.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Applied patches — {TOOLS.find(t => t.id === tool)?.label}
            </h2>
            <div className="space-y-2">
              {patches.map(p => (
                <div key={p.id} className="flex items-start justify-between gap-3 text-xs border-b border-gray-100 pb-2">
                  <div>
                    <span className="font-medium text-gray-700">{p.check_id}</span>
                    <span className="text-gray-400 ml-2">{p.patch_description}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-gray-400">{new Date(p.applied_at).toLocaleString()}</span>
                    {p.commit_url && (
                      <a href={p.commit_url} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-0.5">
                        <ExternalLink className="w-3 h-3" />
                        <span className="font-mono">{p.commit_sha?.slice(0, 7)}</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {prevRuns.length > 1 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Run history — {TOOLS.find(t => t.id === tool)?.label}
            </h2>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="text-gray-400 border-b">
                    <th className="text-left pb-2 pr-4">Run</th>
                    <th className="text-right pb-2 pr-2">Overall</th>
                    <th className="text-right pb-2 pr-2">GPT</th>
                    {DIMS.map(d => <th key={d.id} className="text-right pb-2 pr-2">{d.label}</th>)}
                    <th className="text-right pb-2">Fail %</th>
                  </tr>
                </thead>
                <tbody>
                  {prevRuns.map((r, i) => {
                    const prev  = prevRuns[i + 1];
                    const delta = prev?.score_overall != null && r.score_overall != null
                      ? r.score_overall - prev.score_overall : null;
                    return (
                      <tr key={r.id}
                        className={`border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${i === 0 ? "font-semibold" : ""}`}
                        onClick={() => { setActiveRun(r); loadChecks(r.id); }}>
                        <td className="py-1.5 pr-4 text-gray-600">
                          #{r.run_number}
                          {delta != null && (
                            <span className={`ml-1.5 text-[10px] ${delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-500" : "text-gray-400"}`}>
                              {delta > 0 ? "▲" : delta < 0 ? "▼" : "="}{Math.abs(Math.round(delta))}
                            </span>
                          )}
                        </td>
                        <td className={`text-right pr-2 ${r.score_overall != null && r.score_overall >= 80 ? "text-emerald-600" : r.score_overall != null && r.score_overall >= 60 ? "text-amber-600" : "text-red-500"}`}>
                          {r.score_overall ?? "—"}
                        </td>
                        <td className="text-right pr-2 text-purple-600">
                          {r.gpt_score_overall ?? "—"}
                        </td>
                        {DIMS.map(d => (
                          <td key={d.id} className="text-right pr-2 text-gray-500">
                            {(r as any)[`score_${d.id}`] ?? "—"}
                          </td>
                        ))}
                        <td className="text-right text-gray-500">
                          {r.checks_total > 0 ? `${Math.round((r.checks_failed / r.checks_total) * 100)}%` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
