import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import BackLink from "@/components/dashboard/BackLink";
import { AnnotationCallout } from "@/components/AnnotationCallout";
import EnforcementPrecedents from "@/components/EnforcementPrecedents";
import DownloadWordButton from "@/components/DownloadWordButton";
import PDFDownloadButton from "@/components/PDFDownloadButton";
import { CPPA_CYBER_FRAMEWORK_MAPPING } from "@/data/cppa-cyber-framework-mapping";
import AuditorIndependenceAdvisor from "@/components/cppa/AuditorIndependenceAdvisor";
import AuditScopeMemoGenerator from "@/components/cppa/AuditScopeMemoGenerator";
import AuditorHandoffButton, { AuditorHandoffCover } from "@/components/cppa/AuditorHandoffPackage";
import BreachPrecedentMap from "@/components/cppa/BreachPrecedentMap";
import { useCitationVerification } from "@/hooks/useCitationVerification";
import CitationVerificationBadge from "@/components/cppa/CitationVerificationBadge";

export const readinessColor = (r: string) => {
  const x = (r || "").toLowerCase();
  if (x.includes("critical")) return "bg-red-100 text-red-800";
  if (x.includes("material")) return "bg-orange-100 text-orange-800";
  if (x.includes("substantially")) return "bg-amber-100 text-amber-800";
  if (x.includes("audit-ready")) return "bg-green-100 text-green-800";
  return "bg-muted text-foreground";
};
export const controlStatusColor = (s: string) => {
  const x = (s || "").toLowerCase();
  if (x === "critical gap") return "bg-red-100 text-red-800";
  if (x === "gap") return "bg-orange-100 text-orange-800";
  if (x === "partial") return "bg-amber-100 text-amber-800";
  if (x === "implemented") return "bg-green-100 text-green-800";
  return "bg-muted text-foreground";
};

export function CybersecurityReportBody({ row, hideHeader = false }: { row: any; hideHeader?: boolean }) {
  const report = row?.report_data || {};
  const ledgerCitations = Array.isArray(report?.citation_ledger)
    ? report.citation_ledger.map((c: any) => c?.citation || c?.cite || "")
    : [];
  const { isVerified } = useCitationVerification(ledgerCitations);
  return (
    <div className="space-y-6">
      {/* Sprint 2 #3 — Cover (print-only by default; visible when handoff package is being generated) */}
      <AuditorHandoffCover row={row} />

      <section className="p-4 bg-red-50 dark:bg-red-950/20 border-l-4 border-red-600 rounded">
        <p className="text-sm font-semibold text-red-900 dark:text-red-200">
          Compliance deadline: April 1, 2028
        </p>
        <p className="text-xs text-red-800 dark:text-red-300 mt-1">
          Businesses subject to CPPA's cybersecurity audit regulation must complete their first independent audit
          and certify compliance to the Agency by April 1, 2028. Highest-risk thresholds (revenue + sensitive data
          processing) trigger earlier obligations. Use this assessment to scope remediation now.
        </p>
      </section>
      {!hideHeader && (
        <section className="bg-slate-900 text-white rounded-lg p-8">
          <h1 className="font-serif mb-2">CPPA Cybersecurity Audit Readiness</h1>
          <p className="text-slate-300 text-sm">
            Generated {row?.created_at ? new Date(row.created_at).toLocaleDateString() : ""}
          </p>
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            {report?.overall_score != null && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded font-medium bg-white/10">
                Overall score: <strong>{report.overall_score} / 100</strong>
              </span>
            )}
            {report?.readiness_level && (
              <span className={`inline-block px-3 py-1.5 rounded font-medium ${readinessColor(report.readiness_level)}`}>
                {report.readiness_level}
              </span>
            )}
          </div>
          {report?.executive_summary && <p className="mt-4 text-slate-200">{report.executive_summary}</p>}
        </section>
      )}
      {hideHeader && (report?.overall_score != null || report?.readiness_level || report?.executive_summary) && (
        <section className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-6">
          <div className="flex items-center gap-3 flex-wrap mb-3">
            {report?.overall_score != null && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded font-medium bg-muted">
                Overall score: <strong>{report.overall_score} / 100</strong>
              </span>
            )}
            {report?.readiness_level && (
              <span className={`inline-block px-3 py-1.5 rounded font-medium ${readinessColor(report.readiness_level)}`}>
                {report.readiness_level}
              </span>
            )}
          </div>
          {report?.executive_summary && <p className="text-sm text-foreground">{report.executive_summary}</p>}
        </section>
      )}


      {report?.enforcement_context && (
        <section className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 text-sm rounded">
          <p className="font-semibold mb-1">Enforcement Context</p>
          <p>{report.enforcement_context}</p>
        </section>
      )}

      {Array.isArray(report?.controls) && report.controls.length > 0 && (
        <section className="bg-card border rounded-lg p-6">
          <h2 className="mb-4">Control Findings</h2>
          <Accordion type="multiple">
            {report.controls.map((d: any, i: number) => (
              <AccordionItem key={i} value={`c${i}`}>
                <AccordionTrigger>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span>{d.control}</span>
                    {d.score != null && <span className="text-xs text-muted-foreground">{d.score}/100</span>}
                    {d.status && <span className={`px-2 py-0.5 text-xs rounded ${controlStatusColor(d.status)}`}>{d.status}</span>}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2">
                  {d.finding && <p className="text-sm"><strong>Finding:</strong> {d.finding}</p>}
                  {d.regulatory_basis && <p className="text-sm"><strong>Regulatory basis:</strong> {d.regulatory_basis}</p>}
                  {d.remediation && <p className="text-sm"><strong>Remediation:</strong> {d.remediation}</p>}
                  {d.priority && <p className="text-xs text-muted-foreground">Priority: {d.priority}</p>}
                  {Array.isArray(d.fsor_commentary) && d.fsor_commentary.length > 0 && (
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/40 border-l-4 border-brand-teal rounded text-sm">
                      <p className="font-semibold mb-2">
                        What the agency said
                        {d.fsor_citation && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {d.fsor_citation}
                          </span>
                        )}
                      </p>
                      <ul className="space-y-2">
                        {d.fsor_commentary.slice(0, 3).map((f: any) => (
                          <li key={f.id} className="space-y-1">
                            {f.comment_summary && (
                              <p className="text-xs text-muted-foreground">
                                <strong>Comment:</strong> {f.comment_summary}
                              </p>
                            )}
                            {f.agency_response && (
                              <p className="text-xs">
                                <strong>Agency response:</strong> {f.agency_response}
                              </p>
                            )}
                            <p className="text-[11px] text-muted-foreground">
                              {f.fsor_package}{f.page_ref ? ` · ${f.page_ref}` : ""}
                              {f.source_url && (
                                <> · <a href={f.source_url} target="_blank" rel="noreferrer" className="underline">source</a></>
                              )}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(d.status === "Gap" || d.status === "Partial Gap") && (
                    <AnnotationCallout
                      annotations={(report?.annotations || []).filter(
                        (a: any) => a.relevance?.toLowerCase().includes(
                          (d.control || "").toLowerCase().slice(0, 20)
                        )
                      )}
                    />
                  )}
                </AccordionContent>

              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}
      {/* Sprint 2 #1 — Auditor Independence Advisor (§ 7122(b)) */}
      <AuditorIndependenceAdvisor />

      {/* Sprint 2 #2 — Audit Scope Memo Generator (§ 7123) */}
      <AuditScopeMemoGenerator intake={row?.intake_data} report={report} />


      {/* Sprint 1 #4 — Pre-audit readiness gap log */}
      {Array.isArray(report?.controls) && (() => {
        const isGap = (s?: string) => {
          const x = (s || "").toLowerCase();
          return x === "critical gap" || x === "gap" || x === "partial gap";
        };
        const gaps = report.controls.filter((c: any) => isGap(c.status));
        if (gaps.length === 0) return null;
        // Back-solve from the fixed April 1, 2028 audit submission deadline.
        // Tighter buffer for higher-severity gaps so remediation lands well
        // before the auditor walks in.
        const AUDIT_DEADLINE = new Date("2028-04-01T00:00:00Z");
        const targetForSeverity = (status: string): Date => {
          const x = (status || "").toLowerCase();
          const d = new Date(AUDIT_DEADLINE);
          if (x === "critical gap") d.setUTCMonth(d.getUTCMonth() - 6);
          else if (x === "gap") d.setUTCMonth(d.getUTCMonth() - 3);
          else d.setUTCMonth(d.getUTCMonth() - 1);
          return d;
        };
        const fmt = (d: Date) =>
          d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
        // Acceptance criteria: prefer the first matched FSOR agency_response
        // (that's what the regulator explicitly said it expects to see).
        // Fall back to the control's remediation text.
        const acceptanceFor = (c: any): { text: string; source: "FSOR" | "Remediation" | "None" } => {
          const fsor = Array.isArray(c.fsor_commentary) ? c.fsor_commentary : [];
          const firstResp = fsor.find((f: any) => f?.agency_response)?.agency_response;
          if (firstResp) return { text: firstResp, source: "FSOR" };
          if (c.remediation) return { text: c.remediation, source: "Remediation" };
          return { text: "Document evidence demonstrating the control is implemented, tested, and reviewed on the cadence the regulation contemplates.", source: "None" };
        };
        return (
          <section className="bg-card border rounded-lg p-6">
            <h2 className="mb-1">Pre-Audit Readiness Gap Log</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Remediation tasks for every Gap, Critical Gap, and Partial Gap control. Target dates back-solved
              from the April 1, 2028 audit submission deadline (Critical Gap = 6 months before, Gap = 3 months
              before, Partial Gap = 1 month before). Acceptance criteria use the FSOR agency response where
              available — that's what the agency explicitly said it expects to see.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="text-left bg-muted/40">
                  <tr>
                    <th className="p-2 border">Control</th>
                    <th className="p-2 border">Status</th>
                    <th className="p-2 border">Target date</th>
                    <th className="p-2 border">Acceptance criteria</th>
                    <th className="p-2 border">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {gaps.map((c: any, i: number) => {
                    const accept = acceptanceFor(c);
                    return (
                      <tr key={i} className="border-t align-top">
                        <td className="p-2 border">{c.control}</td>
                        <td className="p-2 border">
                          <span className={`px-2 py-0.5 text-xs rounded ${controlStatusColor(c.status)}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-2 border font-mono text-[11px] whitespace-nowrap">
                          {fmt(targetForSeverity(c.status))}
                        </td>
                        <td className="p-2 border">{accept.text}</td>
                        <td className="p-2 border text-[11px] text-muted-foreground">{accept.source}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })()}

      {/* Sprint 3 — Breach Precedent Map (dynamic, scoped to flagged gaps) */}
      <BreachPrecedentMap report={report} />

      {/* Sprint 1 #7 — Existing-framework cross-walk */}
      <section className="bg-card border rounded-lg p-6">
        <h2 className="mb-1">Framework Mapping</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Where your existing NIST CSF, ISO 27001, or SOC 2 controls likely apply to each CPPA cybersecurity component, and the
          CPPA-specific evidence the agency expects in addition. The FSOR is explicit that holding a NIST / ISO / SOC 2
          certification does <strong>not</strong>, on its own, satisfy the CPPA cybersecurity audit.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="text-left bg-muted/40">
              <tr>
                <th className="p-2 border">#</th>
                <th className="p-2 border">CPPA component (§ 7122(a))</th>
                <th className="p-2 border">NIST CSF 2.0</th>
                <th className="p-2 border">ISO 27001:2022</th>
                <th className="p-2 border">SOC 2 (TSC)</th>
                <th className="p-2 border">CPPA-specific evidence required</th>
              </tr>
            </thead>
            <tbody>
              {CPPA_CYBER_FRAMEWORK_MAPPING.map((r) => (
                <tr key={r.index} className="border-t align-top">
                  <td className="p-2 border font-mono">{r.index}</td>
                  <td className="p-2 border">{r.cppa_component}</td>
                  <td className="p-2 border font-mono text-[11px]">{r.nist_csf}</td>
                  <td className="p-2 border font-mono text-[11px]">{r.iso_27001}</td>
                  <td className="p-2 border font-mono text-[11px]">{r.soc2}</td>
                  <td className="p-2 border">{r.cppa_specific_evidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {Array.isArray(report?.top_risks) && report.top_risks.length > 0 && (
        <section>
          <h2 className="mb-3">Top Risks</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {report.top_risks.slice(0, 3).map((r: any, i: number) => (
              <div key={i} className="bg-card border rounded-lg p-4">
                <p className="font-medium">{r.title}</p>
                {r.description && <p className="text-sm mt-1">{r.description}</p>}
                {r.deadline && <p className="text-xs text-muted-foreground mt-2">Deadline: {r.deadline}</p>}
                {r.consequence && <p className="text-xs text-red-700 mt-1">{r.consequence}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {Array.isArray(report?.next_steps) && report.next_steps.length > 0 && (
        <section className="bg-card border rounded-lg p-6">
          <h2 className="mb-3">Next Steps</h2>
          <ol className="list-decimal pl-5 space-y-1 text-sm">
            {report.next_steps.map((s: string, i: number) => <li key={i}>{s}</li>)}
          </ol>
        </section>
      )}

      {/* Sprint 2 #3 — Citation ledger (included so the handoff PDF is self-contained) */}
      {Array.isArray(report?.citation_ledger) && report.citation_ledger.length > 0 && (
        <section className="bg-card border rounded-lg p-6">
          <h2 className="mb-1">Citation Ledger</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Every authority cited in this report with the validator's verification status. Entries marked
            "Not in corpus" or "Unsupported" must be independently verified against the primary source
            before being relied upon.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="text-left bg-muted/40">
                <tr>
                  <th className="p-2 border">#</th>
                  <th className="p-2 border">Citation</th>
                  <th className="p-2 border">Type</th>
                  <th className="p-2 border">Status</th>
                  <th className="p-2 border">Corpus</th>
                  <th className="p-2 border">Context</th>
                </tr>
              </thead>
              <tbody>
                {report.citation_ledger.map((c: any, i: number) => {
                  const cite = c.citation || c.cite || "";
                  return (
                    <tr key={i} className="border-t align-top">
                      <td className="p-2 border font-mono">{i + 1}</td>
                      <td className="p-2 border font-mono text-[11px]">{cite || "—"}</td>
                      <td className="p-2 border text-[11px]">{c.type || c.source_type || "—"}</td>
                      <td className="p-2 border text-[11px]">{c.status || c.verification || "—"}</td>
                      <td className="p-2 border"><CitationVerificationBadge verified={isVerified(cite)} /></td>
                      <td className="p-2 border">{c.context || c.note || c.where || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 text-sm rounded">
        ⚠️ This compliance framework report does not constitute legal or security advice. Findings should be reviewed with qualified legal counsel and your security team.
      </section>
    </div>
  );
}

export default function CPPACybersecurityResult() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const purchased = searchParams.get("purchased") === "true";
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [priorId, setPriorId] = useState<string | null>(null);

  // Look for an earlier cybersecurity assessment by the same user (for drift compare).
  useEffect(() => {
    if (!row?.user_id || !row?.id || !row?.created_at) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("cppa_assessments")
        .select("id")
        .eq("user_id", row.user_id)
        .eq("module", "cybersecurity")
        .eq("status", "complete")
        .lt("created_at", row.created_at)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setPriorId((data as any)?.id ?? null);
    })();
    return () => { cancelled = true; };
  }, [row?.user_id, row?.id, row?.created_at]);

  useEffect(() => {
    if (!id) return;
    let timer: any;
    let attempts = 0;
    const fetchOnce = async () => {
      const { data } = await supabase.from("cppa_assessments").select("*").eq("id", id).maybeSingle();
      setRow(data);
      setLoading(false);
      // Dual-polling: keep polling not only on pending/processing, but also when
      // status flipped to `complete` before report_data was written (race seen in
      // the cyber hotfix). Stops once both signals agree, or after ~5 min budget.
      const reportReady = data?.report_data
        && typeof data.report_data === "object"
        && Object.keys(data.report_data).length > 0
        && (
          Array.isArray((data.report_data as any).controls)
          || typeof (data.report_data as any).executive_summary === "string"
        );
      const stillRunning = data && (
        data.status === "pending"
        || data.status === "processing"
        || (data.status === "complete" && !reportReady)
      );
      attempts += 1;
      if (stillRunning && attempts < 100) {
        timer = setTimeout(fetchOnce, 3000);
      }
    };
    fetchOnce();
    return () => timer && clearTimeout(timer);
  }, [id]);

  const status = row?.status;
  const reportReady = !!(
    row?.report_data
    && typeof row.report_data === "object"
    && Object.keys(row.report_data).length > 0
    && (Array.isArray(row.report_data.controls) || typeof row.report_data.executive_summary === "string")
  );
  const showRunning = !loading && (
    status === "pending"
    || status === "processing"
    || (status === "complete" && !reportReady)
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet><title>CPPA Cybersecurity Audit Readiness — Module 2 | End User Privacy</title></Helmet>
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <BackLink to="/dashboard/reports" label="Back to My Reports" />
        {purchased && (
          <div className="p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-950/20 rounded text-sm">
            ✅ Purchase confirmed. Your readiness report is being generated.
          </div>
        )}
        {loading && <p>Loading…</p>}

        {showRunning && (
          <div className="bg-card border rounded-lg p-10 text-center">
            <div className="animate-pulse mb-4 text-2xl">⏳</div>
            <p>Running your CPPA Cybersecurity Readiness assessment.</p>
            <p className="text-muted-foreground text-sm mt-1">This typically takes 30–60 seconds.</p>
          </div>
        )}

        {status === "error" && (
          <div className="bg-card border rounded-lg p-6">
            <p className="font-medium text-red-700 mb-3">Assessment failed.</p>
            <Button asChild><Link to="/cppa-cybersecurity">Try Again</Link></Button>
          </div>
        )}

        {status === "complete" && reportReady && (
          <>
            <CybersecurityReportBody row={row} />
            <EnforcementPrecedents
              precedents={(row?.report_data as any)?.enforcement_precedents}
              variant="cppa"
              attempted={Boolean((row?.report_data as any)?.enforcement_meta?.attempted)}
              totalMatched={(row?.report_data as any)?.enforcement_meta?.total_matched}
              queryDescriptor={(row?.report_data as any)?.enforcement_meta?.query_descriptor}
            />
            <div className="flex gap-2 flex-wrap" data-print-hide>
              <AuditorHandoffButton row={row} />
              {priorId && (
                <Button asChild variant="outline">
                  <Link to={`/cppa-cybersecurity/drift/${row.id}/${priorId}`}>Compare to previous</Link>
                </Button>
              )}
              <PDFDownloadButton
                toolType="cppa_cybersecurity"
                assessmentId={row.id}
                pdfUrl={row.pdf_url}
                onGenerated={(url) => setRow({ ...row, pdf_url: url })}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-brand-navy bg-brand-cloud hover:bg-brand-cloud/70 border border-brand-cloud rounded-lg no-underline transition-colors disabled:opacity-60"
              />
              <DownloadWordButton
                text={[
                  row?.report_data?.executive_summary,
                  ...(Array.isArray(row?.report_data?.controls) ? row.report_data.controls.map((c: any) =>
                    `${c.control}\nStatus: ${c.status ?? ""}\n${c.finding ?? ""}\n${c.remediation ?? ""}`) : [])
                ].filter(Boolean).join("\n\n")}
                label="CPPA Cybersecurity Readiness"
                className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-brand-navy bg-brand-cloud hover:bg-brand-cloud/70 border border-brand-cloud rounded-lg transition-colors disabled:opacity-60"
              />

              <Button asChild variant="outline"><Link to="/cppa-cybersecurity">Run New Assessment</Link></Button>
              <Button asChild><Link to="/dashboard/reports">Back to My Reports</Link></Button>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
