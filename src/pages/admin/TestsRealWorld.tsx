// /admin/tests-realworld — runs the REAL subscriber generation pipeline
// (same edge functions, same DB tables, same PDF renderer) against canned
// fixtures, then surfaces each generated artifact with View / Download PDF /
// Delete affordances. A single "Delete all" button wipes only rows recorded
// in the harness ledger, never real subscriber data.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageContainer from "@/components/PageContainer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, PlayCircle, Trash2, ExternalLink, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import PDFDownloadButton from "@/components/PDFDownloadButton";
import { TOOLS, TOOL_BY_ID } from "@/lib/testsRealWorld/runners";
import {
  listArtifacts,
  recordArtifact,
  deleteArtifact,
  deleteAllArtifacts,
  type HarnessArtifact,
  type ToolType,
} from "@/lib/testsRealWorld/ledger";

type RunState = {
  status: "queued" | "running" | "complete" | "failed";
  log: string[];
  startedAt: number;
  error?: string;
};

const GROUP_ORDER = ["Assessments", "Documents", "Briefing"] as const;

export default function TestsRealWorld() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<Set<ToolType>>(new Set());
  const [runs, setRuns] = useState<Record<ToolType, RunState>>({} as Record<ToolType, RunState>);
  const [artifacts, setArtifacts] = useState<HarnessArtifact[]>([]);
  const [busyAll, setBusyAll] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setArtifacts(await listArtifacts(user.id));
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof TOOLS>();
    for (const t of TOOLS) {
      const arr = m.get(t.group) || [];
      arr.push(t);
      m.set(t.group, arr);
    }
    return m;
  }, []);

  const artifactsByTool = useMemo(() => {
    const m: Record<string, HarnessArtifact[]> = {};
    for (const a of artifacts) {
      (m[a.tool_type] ||= []).push(a);
    }
    return m;
  }, [artifacts]);

  const toggle = (id: ToolType) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const toggleAll = () =>
    setSelected((prev) =>
      prev.size === TOOLS.length ? new Set() : new Set(TOOLS.map((t) => t.id)),
    );

  const runOne = useCallback(
    async (toolId: ToolType, runId: string) => {
      if (!user) return;
      const tool = TOOL_BY_ID[toolId];
      const append = (msg: string) =>
        setRuns((prev) => ({
          ...prev,
          [toolId]: {
            ...prev[toolId],
            log: [...(prev[toolId]?.log || []), msg],
          },
        }));

      setRuns((prev) => ({
        ...prev,
        [toolId]: { status: "running", log: [`▶ ${tool.label} starting…`], startedAt: Date.now() },
      }));
      try {
        const result = await tool.runner({ userId: user.id, log: append });
        append(`✓ generated ${result.targetTable}/${result.targetId}`);
        await recordArtifact({
          runId,
          adminUserId: user.id,
          toolType: toolId,
          targetTable: result.targetTable,
          targetId: result.targetId,
          label: result.label,
        });
        setRuns((prev) => ({
          ...prev,
          [toolId]: { ...prev[toolId], status: "complete" },
        }));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        append(`❌ ${msg}`);
        setRuns((prev) => ({
          ...prev,
          [toolId]: { ...prev[toolId], status: "failed", error: msg },
        }));
      }
    },
    [user],
  );

  const runSelected = useCallback(async () => {
    if (selected.size === 0) return;
    const runId = crypto.randomUUID();
    const ids = TOOLS.filter((t) => selected.has(t.id)).map((t) => t.id);
    // Fire in parallel — edge functions handle their own load
    await Promise.all(ids.map((id) => runOne(id, runId)));
    await refresh();
    toast.success(`Run complete (${ids.length} tools)`);
  }, [selected, runOne, refresh]);

  const handleDelete = async (artifactId: string) => {
    try {
      await deleteArtifact(artifactId);
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "delete failed");
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Delete all ${artifacts.length} harness artifacts? Real subscriber data is not touched.`)) {
      return;
    }
    setBusyAll(true);
    try {
      const n = await deleteAllArtifacts();
      toast.success(`Deleted ${n} artifacts`);
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "delete-all failed");
    } finally {
      setBusyAll(false);
    }
  };

  const allSelected = selected.size === TOOLS.length;
  const someSelected = selected.size > 0 && !allSelected;
  const anyRunning = Object.values(runs).some((r) => r.status === "running" || r.status === "queued");

  return (
    <>
      <Navbar />
      <Helmet><title>Admin · Tests Real-World | End User Privacy</title></Helmet>
      <PageContainer>
        <div className="py-8 space-y-6">
          <header className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-brand-navy">Tests · Real-World Pipeline</h1>
              <p className="text-sm text-slate mt-1 max-w-2xl">
                Runs the same edge functions, DB writes and PDF renderer a paying subscriber would
                trigger — using canned fixtures. Generated artifacts are tagged and listed below
                each tool. Stripe is bypassed; the admin's existing access is used.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={runSelected} disabled={selected.size === 0 || anyRunning} className="gap-1.5">
                {anyRunning
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Running…</>
                  : <><PlayCircle className="w-4 h-4" /> Run selected ({selected.size})</>}
              </Button>
              <Button
                onClick={handleDeleteAll}
                disabled={artifacts.length === 0 || busyAll}
                variant="destructive"
                className="gap-1.5"
              >
                {busyAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete all generated ({artifacts.length})
              </Button>
            </div>
          </header>

          <Card className="p-3 border border-amber-300 bg-amber-50">
            <p className="text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Phase 1:</strong> 7 of the 18 subscriber tools are wired (assessments, DPA, IR Playbook, Brief).
                RoPA, US/EU Notice Builders, Registration and the three CPPA modules use multi-step intake flows
                and will be added next — they currently still run from <Link to="/admin/tests-output" className="underline">/admin/tests-output</Link>.
              </span>
            </p>
          </Card>

          <Card className="p-4 border border-brand-cloud">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={toggleAll}
              />
              <span className="text-sm font-semibold text-brand-navy">
                Select all wired tools ({TOOLS.length})
              </span>
            </label>
          </Card>

          <div className="space-y-6">
            {GROUP_ORDER.map((group) => {
              const items = grouped.get(group);
              if (!items?.length) return null;
              return (
                <section key={group}>
                  <h2 className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-2">
                    {group}
                  </h2>
                  <div className="space-y-3">
                    {items.map((tool) => {
                      const checked = selected.has(tool.id);
                      const run = runs[tool.id];
                      const toolArtifacts = artifactsByTool[tool.id] || [];
                      return (
                        <Card
                          key={tool.id}
                          className={`border ${checked ? "border-brand-teal" : "border-brand-cloud"}`}
                        >
                          <div className="p-3 flex items-center justify-between gap-3 border-b border-brand-cloud">
                            <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                              <Checkbox checked={checked} onCheckedChange={() => toggle(tool.id)} />
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-brand-navy truncate">
                                  {tool.label}
                                </div>
                                <div className="text-xs text-slate-500">
                                  ~{tool.expectedSeconds}s · tool id <code>{tool.id}</code>
                                </div>
                              </div>
                            </label>
                            <div className="text-xs shrink-0">
                              {run?.status === "running" && (
                                <span className="inline-flex items-center gap-1 text-brand-teal">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> running
                                </span>
                              )}
                              {run?.status === "complete" && <span className="text-emerald-700">✓ complete</span>}
                              {run?.status === "failed" && <span className="text-red-700">✗ failed</span>}
                            </div>
                          </div>

                          {run?.log?.length ? (
                            <details className="px-3 py-2 border-b border-brand-cloud bg-cloud/30">
                              <summary className="text-xs text-slate cursor-pointer">
                                Log ({run.log.length})
                              </summary>
                              <pre className="text-[11px] mt-2 max-h-40 overflow-auto whitespace-pre-wrap">
                                {run.log.join("\n")}
                              </pre>
                            </details>
                          ) : null}

                          {toolArtifacts.length > 0 ? (
                            <ul className="divide-y divide-brand-cloud">
                              {toolArtifacts.map((a) => (
                                <li key={a.id} className="px-3 py-2 flex items-center justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-medium text-brand-navy truncate">
                                      {a.label || a.target_id}
                                    </div>
                                    <div className="text-[11px] text-slate-500 truncate">
                                      {a.target_table} · {new Date(a.created_at).toLocaleString()}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {(() => {
                                      const tool = TOOL_BY_ID[a.tool_type];
                                      // Look up the runner result fields via a fresh run — we
                                      // stored only label, so we reconstruct view + pdf info
                                      // from the tool definition.
                                      const def = TOOLS.find((t) => t.id === a.tool_type);
                                      const viewBase: Record<ToolType, string | null> = {
                                        lia: `/li-assessment/result/${a.target_id}`,
                                        dpia: `/dpia-framework/result/${a.target_id}`,
                                        governance: `/governance-assessment/result/${a.target_id}`,
                                        biometric: `/biometric-checker/result/${a.target_id}`,
                                        dpa: `/dpa-generator/result/${a.target_id}`,
                                        "ir-playbook": `/ir-playbook/result/${a.target_id}`,
                                        brief: null,
                                      };
                                      const pdfMap: Record<ToolType, RunnerPdfTool | null> = {
                                        lia: "li_assessment",
                                        dpia: "dpia_framework",
                                        governance: "governance_assessment",
                                        biometric: "biometric_checker",
                                        dpa: "dpa_generator",
                                        "ir-playbook": "ir_playbook",
                                        brief: "brief",
                                      };
                                      const viewUrl = viewBase[a.tool_type];
                                      const pdfTool = pdfMap[a.tool_type];
                                      return (
                                        <>
                                          {viewUrl && (
                                            <Link
                                              to={viewUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-brand-navy border border-brand-cloud rounded hover:bg-cloud/40"
                                            >
                                              View <ExternalLink className="w-3 h-3" />
                                            </Link>
                                          )}
                                          {pdfTool && (
                                            <PDFDownloadButton
                                              toolType={pdfTool}
                                              assessmentId={a.target_id}
                                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-white bg-brand-teal hover:bg-brand-teal/90 rounded disabled:opacity-60"
                                            />
                                          )}
                                          <button
                                            onClick={() => handleDelete(a.id)}
                                            className="inline-flex items-center justify-center px-2 py-1 text-red-700 hover:bg-red-50 rounded"
                                            aria-label="Delete"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="px-3 py-2 text-[11px] text-slate-400 italic">
                              No artifacts yet — select and Run to generate one.
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </PageContainer>
      <Footer />
    </>
  );
}

type RunnerPdfTool =
  | "biometric_checker"
  | "ir_playbook"
  | "dpa_generator"
  | "li_assessment"
  | "governance_assessment"
  | "dpia_framework"
  | "brief";
