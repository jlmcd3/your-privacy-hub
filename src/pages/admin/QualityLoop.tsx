// QualityLoop.tsx — One-button prompt-improvement dashboard.
// Route: /admin/quality-loop
//
// One row per tool. Each row: name · current golden pass-rate · "Improve prompt" button.
// Click → spinner → single result line. Accepted improvements are staged to the
// `quality-auto` branch — humans review and merge to `main` via the diff link.
//
// The legacy 4-team deliberation / cross-review surface has been retired; the
// `deliberate-quality-fixes` edge function is still deployed but off the critical path.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ExternalLink, RefreshCw } from "lucide-react";

type ToolDef = { id: string; label: string };

// Only tools with a registered golden set can be improved.
// Others are listed but the button surfaces "Add golden cases to enable".
const TOOLS: ToolDef[] = [
  { id: "biometric-checker", label: "Biometric Checker" },
  { id: "cppa-admt",         label: "CPPA ADMT Assessment" },
  { id: "cppa-risk",         label: "CPPA Risk Assessment" },
  { id: "cppa-cyber",        label: "CPPA Cybersecurity Audit" },
  { id: "lia",               label: "LIA Tool" },
  { id: "dpia",              label: "Impact Assessment Builder" },
  { id: "governance",        label: "Governance Assessment" },
  { id: "dpa-generator",     label: "DPA Generator" },
  { id: "ir-playbook",       label: "IR Playbook" },
  { id: "registration",      label: "Registration Manager" },
];

const TOOLS_WITH_GOLDEN = new Set(["biometric-checker"]);

const GITHUB_OWNER = "jlmcd3";
const GITHUB_REPO  = "your-privacy-hub";
const DIFF_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/compare/main...quality-auto?expand=1`;

type PassRate = { passed: number; total: number } | null;
type Result = {
  status: "improved" | "already_passing" | "no_improvement" | "regression" | "error" | "no_golden_set" | "no_proposal" | "gpt_disagrees" | "patch_too_short" | "stage_failed";
  message: string;
  delta?: number;
  commit_url?: string;
  proposed_edit?: string;
  rationale?: string;
} | null;

function ResultLine({ r }: { r: Result }) {
  if (!r) return null;
  if (r.status === "improved") {
    return (
      <div className="text-sm text-emerald-700 flex items-center gap-2">
        ✓ Improved: <strong>+{r.delta ?? 0}</strong> assertions, 0 regressions — staged to{" "}
        <code className="font-mono text-xs bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">quality-auto</code>.
        {r.commit_url && (
          <a href={r.commit_url} target="_blank" rel="noopener noreferrer"
            className="text-emerald-700 underline inline-flex items-center gap-1">
            View commit <ExternalLink className="w-3 h-3" />
          </a>
        )}
        <a href={DIFF_URL} target="_blank" rel="noopener noreferrer"
          className="text-emerald-700 underline inline-flex items-center gap-1">
          Promote to main <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }
  if (r.status === "already_passing") {
    return <div className="text-sm text-gray-600">Already passing — no change.</div>;
  }
  if (r.status === "no_golden_set") {
    return <div className="text-sm text-gray-500">Add golden cases to enable.</div>;
  }
  if (r.status === "error") {
    return <div className="text-sm text-red-700">Error: {r.message}</div>;
  }
  return <div className="text-sm text-amber-700">No improvement found — prompt unchanged ({r.status.replace(/_/g, " ")}).</div>;
}

function ToolRow({ tool }: { tool: ToolDef }) {
  const hasGolden = TOOLS_WITH_GOLDEN.has(tool.id);
  const [rate, setRate] = useState<PassRate>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [showDetail, setShowDetail] = useState(false);

  const loadRate = useCallback(async () => {
    if (!hasGolden) return;
    // Latest baseline grouped by case_id — take the most recent row per case
    const { data } = await supabase
      .from("golden_results")
      .select("case_id, assertions_total, assertions_passed, created_at")
      .eq("tool", tool.id)
      .eq("run_kind", "baseline")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!data?.length) { setRate(null); return; }
    const seen = new Set<string>();
    let passed = 0, total = 0;
    for (const row of data) {
      if (seen.has(row.case_id)) continue;
      seen.add(row.case_id);
      passed += row.assertions_passed ?? 0;
      total  += row.assertions_total ?? 0;
    }
    setRate({ passed, total });
  }, [tool.id, hasGolden]);

  useEffect(() => { loadRate(); }, [loadRate]);

  const improve = async () => {
    setBusy(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("improve-prompt", { body: { tool: tool.id } });
      if (error) throw error;
      if (data?.status === "no_golden_set") {
        setResult({ status: "no_golden_set", message: "no golden set" });
      } else if (data?.improved) {
        setResult({
          status: "improved",
          message: "improved",
          delta: data.delta,
          commit_url: data.commit_url,
          proposed_edit: data.proposed_edit,
          rationale: data.rationale,
        });
        toast.success(`+${data.delta} assertions staged to quality-auto.`);
      } else if (data?.reason === "already_passing") {
        setResult({ status: "already_passing", message: "already_passing" });
      } else {
        setResult({
          status: (data?.reason as Result["status"]) ?? "no_improvement",
          message: data?.reason ?? "no_improvement",
          proposed_edit: data?.proposed_edit,
          rationale: data?.rationale,
        });
      }
      await loadRate();
    } catch (e: any) {
      setResult({ status: "error", message: e?.message ?? String(e) });
      toast.error(`Improve failed: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl bg-white px-5 py-4 flex flex-wrap items-center gap-4">
      <div className="flex-1 min-w-[180px]">
        <div className="text-sm font-semibold text-[#0c2a44]">{tool.label}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          {hasGolden
            ? rate ? <>Pass-rate: <span className="font-semibold">{rate.passed}/{rate.total}</span></> : "Pass-rate: — (run once to measure)"
            : "No golden set yet"}
        </div>
      </div>
      <Button
        onClick={improve}
        disabled={busy || !hasGolden}
        className="bg-[#0c2a44] hover:bg-[#1a3a5c] text-white h-9"
      >
        {busy ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Improving…</> : "Improve prompt"}
      </Button>
      <div className="basis-full">
        <ResultLine r={result} />
        {result && (result.proposed_edit || result.rationale) && (
          <details className="mt-2" open={showDetail} onToggle={(e) => setShowDetail((e.target as HTMLDetailsElement).open)}>
            <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">Show proposed edit</summary>
            {result.rationale && <div className="mt-1 text-xs text-gray-700"><strong>Rationale:</strong> {result.rationale}</div>}
            {result.proposed_edit && (
              <pre className="mt-1 bg-slate-50 border border-slate-200 rounded p-2 text-[11px] text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">{result.proposed_edit}</pre>
            )}
          </details>
        )}
      </div>
    </div>
  );
}

export default function QualityLoop() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0c2a44]">Prompt Improvement</h1>
          <p className="text-gray-500 mt-1 text-sm max-w-2xl">
            One button per tool. Each press runs the tool's golden cases against the live prompt, asks for ONE
            minimal edit if anything fails, A/B-tests the candidate against the held-out cases, and stages the
            edit to <code className="font-mono">quality-auto</code> only when it strictly improves pass-rate with
            zero regressions. Humans merge <code className="font-mono">quality-auto → main</code>.
          </p>
        </div>
        <div className="space-y-3">
          {TOOLS.map(t => <ToolRow key={t.id} tool={t} />)}
        </div>
        <div className="mt-6 text-xs text-gray-500">
          <a href={DIFF_URL} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline inline-flex items-center gap-1">
            Open quality-auto → main compare <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
