// QualityLoopAugmentation — B6 of Workstream B.
// Embedded into /admin/quality-loop. Surfaces:
//   1. "Run four-team deliberation" → invokes deliberate-quality-fixes
//   2. Per-check deliberation panel (verdict + four team approve flags +
//      Claude/GPT cross-review status, with collapsible reviewer detail)
//   3. Per-tool auto-apply strip (runs_used/cap, enabled, target branch) with Halt
//   4. "Auto-apply eligible → quality-auto" → invokes auto-apply-fixes
//   5. "Promote quality-auto → main" → opens the GitHub compare/PR page


import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ExternalLink, GitPullRequest, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";

type Deliberation = {
  id: string;
  run_id: string;
  tool: string;
  check_id: string;
  dimension: string | null;
  severity: string | null;
  team1_position: any;
  team2_position: any;
  team3_position: any;
  team4_position: any;
  devils_advocate: any; // deprecated — no longer populated; kept for legacy rows
  team3_approve: boolean | null;
  team4_approve: boolean | null;
  consensus: boolean;
  verdict: "auto_eligible" | "human_review" | "reject" | "pending";
  disagreements: any[] | null;
  recommended_change: string | null;
  change_location: string | null;
  status: string;
  auto_applied: boolean;
};

type ToolState = {
  tool: string;
  runs_used: number;
  cap: number;
  enabled: boolean;
  target_branch: string;
  last_score_overall: number | null;
  updated_at: string;
};

type RunScores = {
  score_overall: number | null;
  score_overall_tuning: number | null;
  score_overall_holdout: number | null;
};

const GITHUB_OWNER = "jlmcd3";
const GITHUB_REPO = "your-privacy-hub";

const verdictBadge: Record<string, string> = {
  auto_eligible: "bg-emerald-50 text-emerald-700 border-emerald-200",
  human_review:  "bg-amber-50  text-amber-800   border-amber-200",
  reject:        "bg-gray-50   text-gray-600    border-gray-200",
  pending:       "bg-blue-50   text-blue-700    border-blue-200",
};

function TeamCell({ label, t }: { label: string; t: any }) {
  if (!t) return <div className="text-[10px] text-gray-400">{label}: —</div>;
  const ok = !!t.approve;
  return (
    <div className="text-[11px] leading-snug">
      <div className="flex items-center gap-1">
        <span className={`font-semibold ${ok ? "text-emerald-700" : "text-amber-700"}`}>{label}</span>
        <span className="text-gray-400">·</span>
        <span className="text-gray-600">{t.stance ?? "—"}</span>
        <span className={`text-[9px] uppercase font-bold ${ok ? "text-emerald-700" : "text-red-700"}`}>
          {ok ? "approve" : "withhold"}
        </span>
      </div>
      <div className="text-gray-500 line-clamp-2">{t.rationale ?? ""}</div>
    </div>
  );
}

export default function QualityLoopAugmentation({
  runId, tool,
}: { runId: string | null; tool: string }) {
  const [deliberations, setDeliberations] = useState<Deliberation[]>([]);
  const [toolState, setToolState] = useState<ToolState | null>(null);
  const [runScores, setRunScores] = useState<RunScores | null>(null);
  const [busy, setBusy] = useState<"none" | "deliberate" | "auto" | "halt" | "consolidate">("none");
  const [override, setOverride] = useState<Set<string>>(new Set());
  const [validating, setValidating] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!runId) { setDeliberations([]); setRunScores(null); return; }
    const [{ data: d }, { data: s }, { data: r }] = await Promise.all([
      supabase.from("quality_fix_deliberations").select("*").eq("run_id", runId).order("created_at", { ascending: false }),
      supabase.from("quality_autoapply_tool_state").select("*").eq("tool", tool).maybeSingle(),
      supabase.from("quality_runs").select("score_overall, score_overall_tuning, score_overall_holdout").eq("id", runId).maybeSingle(),
    ]);
    setDeliberations((d ?? []) as Deliberation[]);
    setToolState((s ?? null) as ToolState | null);
    setRunScores((r ?? null) as RunScores | null);
  }, [runId, tool]);

  useEffect(() => { load(); }, [load]);

  const runDeliberation = async () => {
    if (!runId) return;
    setBusy("deliberate");
    try {
      const { error } = await supabase.functions.invoke("deliberate-quality-fixes", { body: { run_id: runId } });
      if (error) throw error;
      toast.success("Four-team deliberation started — refreshing in a moment.");
      setTimeout(load, 5000);
    } catch (e: any) {
      toast.error(`Deliberation failed: ${e.message}`);
    } finally {
      setBusy("none");
    }
  };

  const runAutoApply = async () => {
    if (!runId) return;
    setBusy("auto");
    try {
      const { error } = await supabase.functions.invoke("auto-apply-fixes", { body: { run_id: runId } });
      if (error) throw error;
      toast.success(`Auto-apply dispatched → ${toolState?.target_branch ?? "quality-auto"}.`);
      setTimeout(load, 5000);
    } catch (e: any) {
      toast.error(`Auto-apply failed: ${e.message}`);
    } finally {
      setBusy("none");
    }
  };

  const toggleEnabled = async (next: boolean) => {
    setBusy("halt");
    try {
      const row = toolState ?? { tool, runs_used: 0, cap: 15, enabled: true, target_branch: "quality-auto", last_score_overall: null, updated_at: "" };
      const { error } = await supabase.from("quality_autoapply_tool_state").upsert({
        ...row, tool, enabled: next, updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success(next ? "Auto-apply re-enabled for this tool." : "Auto-apply HALTED for this tool.");
      await load();
    } catch (e: any) {
      toast.error(`Halt toggle failed: ${e.message}`);
    } finally {
      setBusy("none");
    }
  };

  const manualApply = async (delib: Deliberation) => {
    // Look up the check_result_id to call apply-quality-fix.
    const { data: chk } = await supabase
      .from("quality_check_results")
      .select("id").eq("run_id", delib.run_id).eq("check_id", delib.check_id).maybeSingle();
    if (!chk) { toast.error("Could not find quality_check_results row."); return; }

    try {
      const { error } = await supabase.functions.invoke("apply-quality-fix", {
        body: { check_result_ids: [chk.id] }, // default branch = main
      });
      if (error) throw error;
      await supabase.from("quality_fix_deliberations").update({ status: "applied", reviewed_at: new Date().toISOString() }).eq("id", delib.id);
      toast.success(`Staged ${delib.check_id} to quality-auto.`);
      load();

    } catch (e: any) {
      toast.error(`Apply failed: ${e.message}`);
    }
  };

  const rejectDeliberation = async (delib: Deliberation) => {
    if (!confirm(`Reject and delete deliberation for ${delib.check_id}?`)) return;
    try {
      const { error } = await supabase
        .from("quality_fix_deliberations")
        .delete()
        .eq("id", delib.id);
      if (error) throw error;
      setDeliberations((prev) => prev.filter((x) => x.id !== delib.id));
      toast.success(`Rejected ${delib.check_id}.`);
    } catch (e: any) {
      toast.error(`Reject failed: ${e.message}`);
    }
  };

  const runConsolidate = async () => {
    if (!confirm(`Run consolidation pass on ${tool}? This merges duplicate rules and resolves contradictions, then stages the result to ${toolState?.target_branch ?? "quality-auto"} for human review.`)) return;
    setBusy("consolidate");
    try {
      const { data, error } = await supabase.functions.invoke("consolidate-rulebook", { body: { tool } });
      if (error) throw error;
      toast.success(`Consolidation staged. ${data?.changelog ? "See PR diff." : ""}`);
    } catch (e: any) {
      toast.error(`Consolidation failed: ${e.message}`);
    } finally {
      setBusy("none");
    }
  };

  const runValidateFix = async (delib: Deliberation) => {
    if (tool !== "biometric-checker") {
      toast.error("Validate-fix pilot is biometric-checker only.");
      return;
    }
    if (!delib.recommended_change) {
      toast.error("Deliberation has no recommended_change to validate.");
      return;
    }
    setValidating((prev) => new Set(prev).add(delib.id));
    try {
      const { data, error } = await supabase.functions.invoke("validate-fix", {
        body: {
          tool,
          check_id: delib.check_id,
          system_prompt_override: delib.recommended_change,
          run_id: delib.run_id,
        },
      });
      if (error) throw error;
      toast.success(`Validation started (id ${data?.validate_run_id?.slice(0, 8) ?? "?"}). Results appear in quality_validate_fix_runs.`);
    } catch (e: any) {
      toast.error(`Validate failed: ${e.message}`);
    } finally {
      setValidating((prev) => { const n = new Set(prev); n.delete(delib.id); return n; });
    }
  };

  if (!runId) return null;

  const counts = {
    auto_eligible: deliberations.filter(d => d.verdict === "auto_eligible" && !d.auto_applied).length,
    human_review:  deliberations.filter(d => d.verdict === "human_review").length,
    reject:        deliberations.filter(d => d.verdict === "reject").length,
    applied:       deliberations.filter(d => d.auto_applied || d.status === "applied").length,
  };

  const compareUrl =
    `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/compare/main...${toolState?.target_branch ?? "quality-auto"}?expand=1`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Four-Team Deliberation &amp; Auto-Apply</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Phase 2 quality loop: Claude + GPT cross-review must agree AND all four teams must approve before auto-apply.
            Auto-apply targets the <span className="font-mono">{toolState?.target_branch ?? "quality-auto"}</span> branch — never main.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={runDeliberation} disabled={busy !== "none"} size="sm" className="bg-[#0c2a44] hover:bg-[#1a3a5c] text-white">
            {busy === "deliberate" ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Deliberating…</> : "Run four-team deliberation"}
          </Button>
          <Button onClick={runAutoApply}
            disabled={busy !== "none" || counts.auto_eligible === 0 || !(toolState?.enabled ?? true)}
            size="sm" className="bg-[#2d9b90] hover:bg-[#237a70] text-white">
            {busy === "auto" ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Applying…</>
              : `Auto-apply ${counts.auto_eligible} → ${toolState?.target_branch ?? "quality-auto"}`}
          </Button>
          <Button onClick={runConsolidate} disabled={busy !== "none"} size="sm" variant="outline"
            title="Merge duplicate rules and resolve contradictions in this tool's rulebook. Stages to quality-auto.">
            {busy === "consolidate" ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Consolidating…</> : "Consolidate rulebook"}
          </Button>
        </div>
      </div>

      {/* Per-tool auto-apply strip */}
      <div className="border border-gray-200 rounded-lg p-3 mb-4 bg-slate-50 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          {toolState?.enabled ?? true
            ? <ShieldCheck className="w-4 h-4 text-emerald-600" />
            : <ShieldAlert className="w-4 h-4 text-red-600" />}
          <span className="font-semibold text-gray-700">
            {(toolState?.enabled ?? true) ? "Auto-apply enabled" : "Auto-apply HALTED"}
          </span>
        </div>
        <div className="text-gray-600">
          <span className="font-semibold">{toolState?.runs_used ?? 0}</span>
          <span className="text-gray-400"> / </span>
          <span className="font-semibold">{toolState?.cap ?? 15}</span> runs used
        </div>
        <div className="text-gray-600">
          Target branch: <span className="font-mono">{toolState?.target_branch ?? "quality-auto"}</span>
        </div>
        {toolState?.last_score_overall != null && (
          <div className="text-gray-500">Last score: <span className="font-semibold">{toolState.last_score_overall}</span>/100</div>
        )}
        {runScores && (runScores.score_overall_tuning != null || runScores.score_overall_holdout != null) && (
          <div className="text-gray-600" title="Tuning = first 70% of intakes (fixes generated from these). Holdout = last 30% (never used for fix generation). Tuning ↑ + Holdout flat = overfitting.">
            This run:{" "}
            <span className="font-semibold">tuning {runScores.score_overall_tuning ?? "n/a"}</span>
            <span className="text-gray-400"> · </span>
            <span className="font-semibold">holdout {runScores.score_overall_holdout ?? "n/a"}</span>
            {runScores.score_overall_tuning != null && runScores.score_overall_holdout != null && (
              <span className={`ml-1.5 font-semibold ${runScores.score_overall_tuning - runScores.score_overall_holdout > 10 ? "text-amber-700" : "text-gray-500"}`}>
                (Δ {Math.round((runScores.score_overall_tuning - runScores.score_overall_holdout) * 10) / 10})
              </span>
            )}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm" variant="outline"
            onClick={() => toggleEnabled(!(toolState?.enabled ?? true))}
            disabled={busy !== "none"}
            className={`h-8 ${(toolState?.enabled ?? true) ? "border-red-300 text-red-700 hover:bg-red-50" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}`}
          >
            {(toolState?.enabled ?? true) ? "■ Halt auto-apply" : "▶ Re-enable"}
          </Button>
          <a href={compareUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded px-2.5 py-1.5">
            <GitPullRequest className="w-3.5 h-3.5" />
            Promote {toolState?.target_branch ?? "quality-auto"} → main
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Verdict counts */}
      <div className="flex flex-wrap gap-2 text-xs mb-3">
        <span className={`px-2 py-0.5 rounded border font-semibold ${verdictBadge.auto_eligible}`}>
          {counts.auto_eligible} auto-eligible
        </span>
        <span className={`px-2 py-0.5 rounded border font-semibold ${verdictBadge.human_review}`}>
          {counts.human_review} human review
        </span>
        <span className={`px-2 py-0.5 rounded border font-semibold ${verdictBadge.reject}`}>
          {counts.reject} rejected
        </span>
        <span className="px-2 py-0.5 rounded border font-semibold bg-blue-50 text-blue-700 border-blue-200">
          {counts.applied} applied
        </span>
      </div>

      {deliberations.length === 0 && (
        <div className="text-sm text-gray-500 border border-dashed border-gray-200 rounded p-4 text-center">
          No deliberations yet. Click "Run four-team deliberation" to evaluate every failing check with a proposed fix.
        </div>
      )}

      {deliberations.length > 0 && (() => {
        const consensus = deliberations.filter(d => d.verdict === "auto_eligible");
        const nonConsensus = deliberations.filter(d => d.verdict !== "auto_eligible");
        const heldCount = nonConsensus.filter(d => d.verdict === "human_review").length;
        const rejectCount = nonConsensus.filter(d => d.verdict === "reject").length;
        const pendingCount = nonConsensus.filter(d => d.verdict === "pending").length;
        return (
          <div className="space-y-2">
            {consensus.length === 0 && (
              <div className="text-sm text-gray-500 border border-dashed border-gray-200 rounded p-4 text-center">
                No consensus fixes from this run. Everything is held for human review or rejected.
              </div>
            )}
            {consensus.length > 0 && (
              <div className="text-xs font-semibold text-emerald-800 mb-1">
                Everyone agrees — fix this ({consensus.length})
              </div>
            )}
            {consensus.map((d) => {
              const isApplied = d.auto_applied || d.status === "applied" || d.status === "auto_applied";
              const overrideTicked = override.has(d.id);
              const canManualApply = !isApplied;
              const disagreements = Array.isArray(d.disagreements) ? d.disagreements : [];
              return (
                <div key={d.id} className="border border-emerald-200 rounded-lg p-3 bg-emerald-50/30">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-[11px] px-2 py-0.5 rounded border font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
                      Everyone agrees — fix this
                    </span>
                    <span className="font-mono text-xs font-semibold text-gray-700">{d.check_id}</span>
                    <span className="text-xs text-gray-400">{d.dimension} · {d.severity}</span>
                    {isApplied && (
                      <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                        applied
                      </span>
                    )}
                  </div>

                  {d.recommended_change && (
                    <div className="text-[12px] text-gray-700 mb-2 line-clamp-3">
                      {d.recommended_change}
                    </div>
                  )}

                  <details className="mb-2">
                    <summary className="cursor-pointer text-[11px] font-semibold text-gray-600 hover:text-gray-800">
                      Reviewer detail (Claude + GPT cross-review)
                    </summary>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1.5">
                      <TeamCell label="T1 minimal"    t={d.team1_position} />
                      <TeamCell label="T2 registry"   t={d.team2_position} />
                      <TeamCell label="T3 legal"      t={d.team3_position} />
                      <TeamCell label="T4 root-cause" t={d.team4_position} />
                    </div>
                    {disagreements.length > 0 && (
                      <div className="mt-2 text-[11px] text-amber-800">
                        Disagreements logged: {disagreements.length}
                      </div>
                    )}
                  </details>

                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] text-gray-500 truncate">
                      {d.change_location ?? "(no location)"}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {tool === "biometric-checker" && !isApplied && d.recommended_change && (
                        <Button
                          size="sm" variant="outline"
                          disabled={validating.has(d.id)}
                          onClick={() => runValidateFix(d)}
                          className="h-7 text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                          title="Run held-out A/B (baseline vs candidate prompt) on fresh biometric intakes."
                        >
                          {validating.has(d.id) ? "Validating…" : "Validate on holdout"}
                        </Button>
                      )}
                      <Button
                        size="sm" variant="outline"
                        disabled={!canManualApply}
                        onClick={() => manualApply(d)}
                        className="h-7 text-xs"
                      >
                        Stage to quality-auto
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        onClick={() => rejectDeliberation(d)}
                        className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {nonConsensus.length > 0 && (
              <details className="border border-gray-200 rounded-lg bg-slate-50">
                <summary className="cursor-pointer px-3 py-2 text-xs text-gray-600">
                  {heldCount} held for human review · {rejectCount} rejected{pendingCount > 0 ? ` · ${pendingCount} pending` : ""}
                </summary>
                <div className="px-3 py-2 space-y-1 text-[11px] text-gray-600">
                  {nonConsensus.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-2 border-t border-gray-200 pt-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${verdictBadge[d.verdict] ?? verdictBadge.pending}`}>
                          {d.verdict}
                        </span>
                        <span className="font-mono truncate">{d.check_id}</span>
                        <span className="text-gray-400 truncate">{d.dimension}</span>
                      </div>
                      <button
                        onClick={() => rejectDeliberation(d)}
                        className="text-[10px] text-red-700 hover:underline shrink-0"
                      >
                        reject
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        );
      })()}
    </div>
  );
}
