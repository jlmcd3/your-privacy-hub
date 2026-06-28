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
  const [busy, setBusy] = useState<"none" | "deliberate" | "auto" | "halt">("none");
  const [override, setOverride] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!runId) { setDeliberations([]); return; }
    const [{ data: d }, { data: s }] = await Promise.all([
      supabase.from("quality_fix_deliberations").select("*").eq("run_id", runId).order("created_at", { ascending: false }),
      supabase.from("quality_autoapply_tool_state").select("*").eq("tool", tool).maybeSingle(),
    ]);
    setDeliberations((d ?? []) as Deliberation[]);
    setToolState((s ?? null) as ToolState | null);
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

      {deliberations.length > 0 && (
        <div className="space-y-2">
          {deliberations.map((d) => {
            const isApplied = d.auto_applied || d.status === "applied" || d.status === "auto_applied";
            const needsOverride = d.verdict === "human_review" || d.verdict === "reject";
            const overrideTicked = override.has(d.id);
            const canManualApply = !isApplied && (d.verdict === "auto_eligible" || overrideTicked);
            return (
              <div key={d.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="font-mono text-xs font-semibold text-gray-700">{d.check_id}</span>
                  <span className="text-xs text-gray-400">{d.dimension} · {d.severity}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${verdictBadge[d.verdict] ?? verdictBadge.pending}`}>
                    {d.verdict.replace("_", " ")}
                  </span>
                  {d.team3_approve && <span className="text-[10px] text-emerald-700 font-semibold">T3 ✓</span>}
                  {d.team4_approve && <span className="text-[10px] text-emerald-700 font-semibold">T4 ✓</span>}
                  {d.devils_advocate?.agree && <span className="text-[10px] text-emerald-700 font-semibold">DA ✓</span>}
                  {!d.devils_advocate?.agree && <span className="text-[10px] text-red-700 font-semibold">DA ✗</span>}
                  {isApplied && (
                    <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                      applied
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1.5 mb-2">
                  <TeamCell label="T1 minimal"   t={d.team1_position} />
                  <TeamCell label="T2 registry"  t={d.team2_position} />
                  <TeamCell label="T3 legal"     t={d.team3_position} />
                  <TeamCell label="T4 root-cause" t={d.team4_position} />
                </div>

                {d.devils_advocate && (
                  <div className={`text-[11px] rounded px-2 py-1 mb-2 border
                    ${d.devils_advocate.agree
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-red-50 text-red-800 border-red-200"}`}>
                    <span className="font-semibold">GPT-4o devil's-advocate:</span>{" "}
                    {d.devils_advocate.agree ? "agrees with consensus." : (d.devils_advocate.objection || "objects.")}
                  </div>
                )}

                {Array.isArray(d.disagreements) && d.disagreements.length > 0 && (
                  <div className="text-[11px] bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-2">
                    <span className="font-semibold text-amber-900">Disagreements ({d.disagreements.length}):</span>{" "}
                    <span className="text-amber-800">
                      {d.disagreements.slice(0, 3).map((x: any) => x.team ?? "?").join(", ")}
                      {d.disagreements.length > 3 ? "…" : ""}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] text-gray-500 truncate">
                    {d.change_location ?? "(no location)"}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {needsOverride && !isApplied && (
                      <label className="flex items-center gap-1 text-[11px] text-amber-800">
                        <input type="checkbox" className="w-3.5 h-3.5"
                          checked={overrideTicked}
                          onChange={(e) => {
                            const next = new Set(override);
                            e.target.checked ? next.add(d.id) : next.delete(d.id);
                            setOverride(next);
                          }} />
                        override
                      </label>
                    )}
                    <Button
                      size="sm" variant="outline"
                      disabled={!canManualApply}
                      onClick={() => manualApply(d)}
                      className="h-7 text-xs"
                    >
                      Apply → main
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
        </div>
      )}
    </div>
  );
}
