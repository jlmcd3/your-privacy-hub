import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Reg = { product: string; label: string; sampleSlug: string; applyKey: string };

const QL2_PRODUCTS: Reg[] = [
  { product: "governance",   label: "Governance",   sampleSlug: "governance",    applyKey: "governance" },
  { product: "dpa",          label: "DPA",          sampleSlug: "dpa",           applyKey: "dpa-generator" },
  { product: "ir-playbook",  label: "IR Playbook",  sampleSlug: "ir_playbook",   applyKey: "ir-playbook" },
  { product: "biometric",    label: "Biometric",    sampleSlug: "biometric",     applyKey: "biometric-checker" },
  { product: "registration", label: "Registration", sampleSlug: "registration",  applyKey: "registration" },
  { product: "lia",          label: "LIA",          sampleSlug: "li_assessment", applyKey: "lia" },
  { product: "dpia",         label: "DPIA",         sampleSlug: "dpia",          applyKey: "dpia" },
  { product: "cppa-risk",    label: "CPPA Risk",    sampleSlug: "cppa_risk",     applyKey: "cppa-risk" },
  { product: "cppa-cyber",   label: "CPPA Cyber",   sampleSlug: "cppa_cyber",    applyKey: "cppa-cyber" },
  { product: "cppa-admt",    label: "CPPA ADMT",    sampleSlug: "cppa_admt",     applyKey: "cppa-admt" },
  { product: "ropa",         label: "RoPA",         sampleSlug: "ropa",          applyKey: "ropa" },
  { product: "eu-notice",    label: "EU Notice",    sampleSlug: "eu_notice",     applyKey: "global-privacy-notice" },
  { product: "us-notice",    label: "US Notice",    sampleSlug: "us_notice",     applyKey: "privacy-notice-us" },
];

type Run = {
  id: string;
  status: string;
  phase: string;
  products: string[];
  stress_batch_id: string | null;
  started_at: string;
  completed_at: string | null;
  last_error: string | null;
};
type LogRow = {
  id: string; ts: string; level: string; product: string | null; message: string;
};
type ResultRow = {
  id: string; run_id: string; product: string;
  claude_score: number | null; openai_score: number | null; avg_score: number | null;
  recommendation: string | null; fix_location: string | null;
  check_result_id: string | null; quality_run_id: string | null;
  updatable: boolean; applied: boolean; applied_branch: string | null; commit_url: string | null;
};

export default function QualityLoop2() {
  const [selected, setSelected] = useState<Set<string>>(new Set(QL2_PRODUCTS.map((p) => p.product)));
  const [activeRun, setActiveRun] = useState<Run | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [target, setTarget] = useState<Record<string, "quality-auto" | "main">>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Load latest run on mount.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("quality_loop2_runs" as any).select("*").order("started_at", { ascending: false }).limit(1).maybeSingle();
      if (data) setActiveRun(data as any);
    })();
  }, []);

  // Poll logs + active run every 10s.
  useEffect(() => {
    if (!activeRun) return;
    let cancelled = false;
    const load = async () => {
      const [{ data: run }, { data: log }] = await Promise.all([
        supabase.from("quality_loop2_runs" as any).select("*").eq("id", activeRun.id).maybeSingle(),
        supabase.from("quality_loop2_log" as any).select("*").eq("run_id", activeRun.id).order("ts", { ascending: false }).limit(200),
      ]);
      if (cancelled) return;
      if (run) setActiveRun(run as any);
      if (log) setLogs(log as any);
    };
    load();
    const t = setInterval(load, 10_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [activeRun?.id]);

  // Poll results (all runs) every 10s.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.from("quality_loop2_results" as any).select("*").order("created_at", { ascending: false }).limit(1000);
      if (!cancelled && data) setResults(data as any);
    };
    load();
    const t = setInterval(load, 10_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const isRunning = activeRun?.status === "running";

  const productAgg = useMemo(() => {
    const m = new Map<string, { count: number; avg: number | null; latest: ResultRow | null }>();
    for (const reg of QL2_PRODUCTS) m.set(reg.product, { count: 0, avg: null, latest: null });
    for (const r of results) {
      const e = m.get(r.product) ?? { count: 0, avg: null, latest: null };
      e.count++;
      if (!e.latest || new Date(r.id) > new Date(e.latest.id)) e.latest = r;
      m.set(r.product, e);
    }
    // compute avg across run results
    for (const reg of QL2_PRODUCTS) {
      const e = m.get(reg.product)!;
      const vals = results.filter((r) => r.product === reg.product && typeof r.avg_score === "number").map((r) => r.avg_score!) ;
      e.avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }
    return m;
  }, [results]);

  // Latest results for the active run, keyed by product (used to find check_result_id).
  const latestForActive = useMemo(() => {
    const m = new Map<string, ResultRow>();
    if (!activeRun) return m;
    for (const r of results) if (r.run_id === activeRun.id) m.set(r.product, r);
    return m;
  }, [results, activeRun]);

  async function onStart() {
    if (selected.size === 0) { toast.error("Select at least one product"); return; }
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ql2-orchestrator", {
        body: { action: "start", products: Array.from(selected) },
      });
      if (error) throw error;
      if (data?.run_id) {
        const { data: run } = await supabase.from("quality_loop2_runs" as any).select("*").eq("id", data.run_id).maybeSingle();
        setActiveRun(run as any);
        toast.success("Run started");
      }
    } catch (e: any) {
      toast.error(`Start failed: ${e.message ?? e}`);
    } finally {
      setStarting(false);
    }
  }

  async function onStop() {
    if (!activeRun) return;
    const { error } = await supabase.functions.invoke("ql2-orchestrator", {
      body: { action: "cancel", run_id: activeRun.id },
    });
    if (error) toast.error(`Cancel failed: ${error.message}`);
    else toast.success("Cancel requested");
  }

  async function onUpdate(product: string, latest: ResultRow) {
    const tgt = target[product] ?? "quality-auto";
    if (!latest.check_result_id) { toast.error("No check_result to apply"); return; }
    if (tgt === "main") {
      const ok = window.confirm(
        "This commits an AI-written prompt change DIRECTLY to `main` on a live compliance product. The function must be redeployed for it to take effect. Proceed?",
      );
      if (!ok) return;
    }
    setBusy((b) => ({ ...b, [product]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("apply-quality-fix", {
        body: { check_result_ids: [latest.check_result_id], ...(tgt === "main" ? { branch: "main" } : {}) },
      });
      if (error) {
        toast.message("Apply slow/timed out — may have committed; use Re-check.", { description: error.message });
        return;
      }
      const checkId = `ql2:${product}`;
      const r = (data?.results || []).find((x: any) => x.check_id === checkId) ?? data?.results?.[0];
      if (r?.success && r.commit_url) {
        await supabase.from("quality_loop2_results" as any).update({
          applied: true, applied_branch: tgt, commit_url: r.commit_url,
        }).eq("id", latest.id);
        toast.success(tgt === "main" ? "Committed to main — redeploy the function for it to go live." : "Staged to quality-auto.");
      } else if (r && r.success === false) {
        toast.error(r.error ?? "Apply rejected");
      } else if (r?.skipped) {
        toast.message("Already applied server-side — use Re-check.");
      } else {
        toast.error("Apply returned no usable result");
      }
    } catch (e: any) {
      toast.message("Apply slow/timed out — may have committed; use Re-check.", { description: e.message });
    } finally {
      setBusy((b) => ({ ...b, [product]: false }));
    }
  }

  async function onRecheck(product: string, latest: ResultRow) {
    if (!latest.check_result_id) return;
    setBusy((b) => ({ ...b, [product]: true }));
    try {
      const { data } = await supabase.from("quality_check_results")
        .select("fix_applied, fix_commit_sha")
        .eq("id", latest.check_result_id).maybeSingle();
      if (data?.fix_applied) {
        const tgt = target[product] ?? "quality-auto";
        await supabase.from("quality_loop2_results" as any).update({
          applied: true, applied_branch: latest.applied_branch ?? tgt,
        }).eq("id", latest.id);
        toast.success("Reconciled to applied");
      } else {
        toast.message("Not yet applied");
      }
    } finally {
      setBusy((b) => ({ ...b, [product]: false }));
    }
  }

  function onExportMarkdown() {
    // Scope to the latest run only (by created_at on quality_loop2_results).
    const latestRunId = results.reduce<{ id: string | null; ts: string }>(
      (acc, r) => (r.created_at && r.created_at > acc.ts ? { id: r.run_id, ts: r.created_at } : acc),
      { id: null, ts: "" },
    ).id;
    const scoped = latestRunId ? results.filter((r) => r.run_id === latestRunId) : [];
    const lines: string[] = [];
    lines.push(`# Quality Loop 2 — Recommendations`);
    lines.push("");
    lines.push(`_Exported ${new Date().toISOString()}_`);
    if (latestRunId) lines.push(`_Run: ${latestRunId}_`);
    lines.push("");
    for (const p of QL2_PRODUCTS) {
      const rows = scoped
        .filter((r) => r.product === p.product && r.recommendation && r.recommendation.trim())
        .sort((a, b) => (a.id < b.id ? 1 : -1));
      lines.push(`## ${p.label}`);
      lines.push("");
      if (rows.length === 0) {
        lines.push("_No recommendations._");
        lines.push("");
        continue;
      }
      for (const r of rows) {
        const scoreBits = [
          r.avg_score != null ? `avg ${r.avg_score.toFixed(1)}` : null,
          r.claude_score != null ? `claude ${r.claude_score}` : null,
          r.openai_score != null ? `openai ${r.openai_score}` : null,
          r.fix_location ? `location: ${r.fix_location}` : null,
          r.applied ? `applied → ${r.applied_branch ?? "?"}` : null,
        ].filter(Boolean).join(" · ");
        lines.push(`### Run ${r.run_id.slice(0, 8)}${scoreBits ? ` — ${scoreBits}` : ""}`);
        if (r.commit_url) lines.push(`Commit: ${r.commit_url}`);
        lines.push("");
        lines.push("```");
        lines.push(r.recommendation!.trim());
        lines.push("```");
        lines.push("");
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quality-loop2-recommendations-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Markdown exported");
  }

  const hasAnyRecommendation = results.some((r) => r.recommendation && r.recommendation.trim());

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
        <h1 className="text-3xl font-serif">Quality Loop 2</h1>
        <p className="text-muted-foreground mt-1 max-w-3xl">
          Deliberately slow, one-product-at-a-time loop. Generates dummy data → OpenAI and Claude review each
          product once → produces a recommended prompt update you can stage to <code>quality-auto</code> or commit
          directly to <code>main</code>.
        </p>
        </div>
        <Button variant="outline" onClick={onExportMarkdown} disabled={!hasAnyRecommendation}>
          Export recommendations (.md)
        </Button>
      </div>

      {/* Panel A — Run */}
      <Card>
        <CardHeader><CardTitle>Run</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {QL2_PRODUCTS.map((p) => (
              <label key={p.product} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selected.has(p.product)}
                  onCheckedChange={(v) => {
                    setSelected((s) => {
                      const n = new Set(s);
                      if (v) n.add(p.product); else n.delete(p.product);
                      return n;
                    });
                  }}
                  disabled={isRunning}
                />
                {p.label}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={onStart} disabled={starting || isRunning}>
              {starting ? "Starting…" : "Run quality loop 2"}
            </Button>
            {isRunning && <Button variant="destructive" onClick={onStop}>Stop</Button>}
            {activeRun && (
              <div className="text-sm text-muted-foreground">
                Run <code>{activeRun.id.slice(0, 8)}</code> · <Badge variant="outline">{activeRun.status}</Badge> ·
                phase <code>{activeRun.phase}</code> · {Math.min(latestForActive.size, activeRun.products.length)}/{activeRun.products.length}
                {activeRun.last_error && <span className="text-destructive ml-2">{activeRun.last_error}</span>}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            <code>quality-auto</code> stages the change on a side branch (review then promote via PR). <code>main</code>
            commits to the live source — the edge function still must be <strong>redeployed</strong> for a prompt change to
            take effect (committed ≠ deployed). A change already applied to one branch can't be re-applied to the other
            from here; use the existing Promote PR flow to move quality-auto → main.
          </p>
        </CardContent>
      </Card>

      {/* Panel B — Live log */}
      <Card>
        <CardHeader><CardTitle>Live log {activeRun && <span className="text-xs text-muted-foreground ml-2">run {activeRun.id.slice(0, 8)}</span>}</CardTitle></CardHeader>
        <CardContent>
          <div className="font-mono text-xs max-h-[28rem] overflow-y-auto border rounded p-3 bg-muted/30">
            {logs.length === 0 && <div className="text-muted-foreground">No log entries.</div>}
            {logs.map((l) => (
              <div key={l.id} className={l.level === "error" ? "text-destructive" : l.level === "warn" ? "text-yellow-600" : ""}>
                {new Date(l.ts).toLocaleTimeString()} · {l.level} · {l.product ?? "—"} · {l.message}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Panel C — Products & average score */}
      <Card>
        <CardHeader><CardTitle>Products & average score</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 pr-3">Tests</th>
                  <th className="py-2 pr-3">Avg score</th>
                  <th className="py-2 pr-3">Latest recommendation</th>
                  <th className="py-2 pr-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {QL2_PRODUCTS.map((p) => {
                  const agg = productAgg.get(p.product)!;
                  const latest = latestForActive.get(p.product) ?? agg.latest;
                  const isApplied = latest?.applied;
                  const exp = expanded[p.product];
                  return (
                    <tr key={p.product} className="border-b align-top">
                      <td className="py-2 pr-3 font-medium">{p.label}</td>
                      <td className="py-2 pr-3">{agg.count}</td>
                      <td className="py-2 pr-3">{agg.avg == null ? "—" : agg.avg.toFixed(1)}</td>
                      <td className="py-2 pr-3 max-w-md">
                        {latest?.recommendation ? (
                          <>
                            <button
                              className="text-left underline-offset-2 hover:underline"
                              onClick={() => setExpanded((e) => ({ ...e, [p.product]: !exp }))}
                            >
                              {exp ? "Hide" : "Show"} recommendation
                            </button>
                            {exp && (
                              <pre className="mt-2 whitespace-pre-wrap text-xs bg-muted/40 p-2 rounded border max-h-72 overflow-y-auto">
                                {latest.recommendation}
                              </pre>
                            )}
                          </>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2 pr-3">
                        {!latest ? <span className="text-muted-foreground">—</span> :
                          isApplied ? (
                            <div className="flex items-center gap-2">
                              <Badge>{latest.applied_branch ?? "applied"}</Badge>
                              {latest.commit_url && (
                                <a className="text-primary underline text-xs" href={latest.commit_url} target="_blank" rel="noreferrer">View commit</a>
                              )}
                            </div>
                          ) : !latest.updatable || !latest.check_result_id ? (
                            <span className="text-muted-foreground text-xs">not updatable</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Select
                                value={target[p.product] ?? "quality-auto"}
                                onValueChange={(v) => setTarget((t) => ({ ...t, [p.product]: v as any }))}
                              >
                                <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="quality-auto">quality-auto</SelectItem>
                                  <SelectItem value="main">main</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button size="sm" disabled={busy[p.product]} onClick={() => onUpdate(p.product, latest)}>
                                {busy[p.product] ? "Updating…" : "Update prompt"}
                              </Button>
                              <Button size="sm" variant="outline" disabled={busy[p.product]} onClick={() => onRecheck(p.product, latest)}>
                                Re-check
                              </Button>
                            </div>
                          )
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
