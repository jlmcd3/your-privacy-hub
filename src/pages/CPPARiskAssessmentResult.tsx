import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import BackLink from "@/components/dashboard/BackLink";
import { AnnotationCallout, AnnotationAppendix } from "@/components/AnnotationCallout";
import DownloadWordButton from "@/components/DownloadWordButton";
import PDFDownloadButton from "@/components/PDFDownloadButton";
import { AdminOnly } from "@/components/AdminOnly";
import RiskAssessmentReportV3 from "@/components/cppa/RiskAssessmentReportV3";

// Truncate to first sentence (or 200 chars if no sentence boundary).
const firstSentence = (text: string): string => {
  if (!text) return "";
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : text.slice(0, 200).trim();
};

// Filter: a domain only displays in the user-facing report if it has a non-empty finding.
const hasUserFacingFinding = (d: any): boolean =>
  typeof d?.finding === "string" && d.finding.trim().length > 0;

const riskColor = (r: string) => {
  const x = (r || "").toLowerCase();
  if (x === "critical") return "bg-red-100 text-red-800";
  if (x === "high") return "bg-orange-100 text-orange-800";
  if (x === "medium") return "bg-amber-100 text-amber-800";
  if (x === "low") return "bg-green-100 text-green-800";
  return "bg-muted text-foreground";
};
const statusColor = (s: string) => {
  const x = (s || "").toLowerCase();
  if (x === "critical gap") return "bg-red-100 text-red-800";
  if (x === "gap") return "bg-orange-100 text-orange-800";
  if (x === "partial") return "bg-amber-100 text-amber-800";
  if (x === "compliant") return "bg-green-100 text-green-800";
  return "bg-muted text-foreground";
};
const confidenceColor = (c?: string) => {
  const x = (c || "").toLowerCase();
  if (x === "high") return "bg-green-100 text-green-800";
  if (x === "medium") return "bg-amber-100 text-amber-800";
  if (x === "low") return "bg-red-100 text-red-800";
  return "bg-muted text-foreground";
};
const ledgerColor = (c?: string) => {
  const x = (c || "").toLowerCase();
  if (x === "supported") return "bg-green-100 text-green-800";
  if (x === "partially supported" || x === "overstated") return "bg-amber-100 text-amber-800";
  if (x === "unsupported" || x === "not-in-corpus" || x === "contradicted-by-authority") return "bg-red-100 text-red-800";
  return "bg-muted text-foreground";
};

// Sprint 1 #5 — Confidence stratification.
// Tier derived from corpus + FSOR alignment so attorneys can prioritise review.
type ConfidenceTier = "High-confidence" | "Inference" | "Heuristic";
const NO_AUTH_PHRASE = "no retrieved authority";
function classifyDomain(d: any): ConfidenceTier {
  const basis = typeof d?.regulatory_basis === "string" ? d.regulatory_basis : "";
  const hasFsor = Array.isArray(d?.fsor_commentary) && d.fsor_commentary.length > 0;
  const noCorpus = !basis || basis.toLowerCase().includes(NO_AUTH_PHRASE) || basis.includes("[removed");
  if (noCorpus) return "Heuristic";
  if (hasFsor) return "High-confidence";
  return "Inference";
}
const tierColor = (t: ConfidenceTier) => {
  if (t === "High-confidence") return "bg-green-100 text-green-800 border-green-300";
  if (t === "Inference") return "bg-amber-100 text-amber-800 border-amber-300";
  return "bg-red-100 text-red-800 border-red-300";
};
const tierBlurb: Record<ConfidenceTier, string> = {
  "High-confidence": "Statutory or regulatory authority on point AND agency commentary (FSOR) reinforces the conclusion.",
  "Inference": "Statutory or regulatory authority is on point, but no agency commentary (FSOR) was matched. Treat the legal conclusion as well-grounded but the interpretation as a reasoned inference.",
  "Heuristic": "Conclusion is a best-effort interpretation and requires attorney review before relying on it.",
};


export default function CPPARiskAssessmentResult() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const purchased = searchParams.get("purchased") === "true";
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let timer: any;
    let attempts = 0;
    const fetchOnce = async () => {
      const { data } = await supabase.from("cppa_assessments").select("*").eq("id", id).maybeSingle();
      setRow(data);
      setLoading(false);
      // Dual-polling: keep polling not only on pending/processing, but also when
      // status === 'complete' arrived before report_data was written.
      const rd = data?.report_data as any;
      const reportReady = rd && typeof rd === "object" && Object.keys(rd).length > 0
        && (Array.isArray(rd.domains) || typeof rd.executive_summary === "string");
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

  const report = row?.report_data || {};
  const status = row?.status;
  const isV3 = !!(row?.report_data && (row.report_data as any).schema_version === "v3-part-a-part-b" && (row.report_data as any).part_a);
  const reportReady = !!(
    row?.report_data
    && typeof row.report_data === "object"
    && Object.keys(row.report_data).length > 0
    && (isV3 || Array.isArray((row.report_data as any).domains) || typeof (row.report_data as any).executive_summary === "string")
  );
  const showRunning = !loading && (
    status === "pending"
    || status === "processing"
    || (status === "complete" && !reportReady)
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet><title>CPPA Risk Assessment — Module 1 | End User Privacy</title></Helmet>
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <BackLink to="/dashboard/reports" label="Back to My Reports" />
        {purchased && (
          <div className="p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-950/20 rounded text-sm">
            ✅ Purchase confirmed. Your assessment is being generated.
          </div>
        )}
        {loading && <p>Loading…</p>}

        {showRunning && (
          <div className="bg-card border rounded-lg p-10 text-center">
            <div className="animate-pulse mb-4 text-2xl">⏳</div>
            <p>Running your CPPA Risk Assessment.</p>
            <p className="text-muted-foreground text-sm mt-1">This typically takes 30–60 seconds.</p>
          </div>
        )}

        {status === "error" && (
          <div className="bg-card border rounded-lg p-6">
            <p className="font-medium text-red-700 mb-3">Assessment failed.</p>
            <Button asChild><Link to="/cppa-risk-assessment">Try Again</Link></Button>
          </div>
        )}

        {status === "complete" && reportReady && (
          <>
            <section className="bg-slate-900 text-white rounded-lg p-8">
              <h1 className="font-serif mb-2">CPPA Privacy Risk Assessment</h1>
              <p className="text-slate-300 text-sm">
                Generated {row?.created_at ? new Date(row.created_at).toLocaleDateString() : ""}
              </p>
              {isV3 && (
                <p className="text-slate-300 text-sm mt-2">
                  Regulation-mapped framework (Cal. Code Regs. tit. 11 § 7152(a)(1)–(9)) — pre-populated from your intake, ready for review, completion, and executive sign-off.
                </p>
              )}
              {!isV3 && (
                <div className="mt-4 flex items-center gap-3 flex-wrap">
                  {report?.overall_score != null && (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded font-medium bg-white/10">
                      Overall score: <strong>{report.overall_score} / 100</strong>
                    </span>
                  )}
                  {report?.risk_level && (
                    <span className={`inline-block px-3 py-1.5 rounded font-medium ${riskColor(report.risk_level)}`}>
                      {report.risk_level} risk
                    </span>
                  )}
                </div>
              )}
              {!isV3 && report?.executive_summary && <p className="mt-4 text-slate-200">{report.executive_summary}</p>}
            </section>

            {isV3 && <RiskAssessmentReportV3 report={report as any} />}


            {report?.accuracy_caveat && (
              <AdminOnly>
                <section className="p-4 border-l-4 border-red-500 bg-red-50 dark:bg-red-950/20 rounded">
                  <p className="font-semibold text-red-800 dark:text-red-200 mb-1">Accuracy caveat <span className="text-[10px] font-normal uppercase tracking-wider text-red-700">(admin)</span></p>
                  <p className="text-sm">{report.accuracy_caveat}</p>
                </section>
              </AdminOnly>
            )}

            {Array.isArray(report?.requires_attorney_review) && report.requires_attorney_review.length > 0 && (
              <AdminOnly>
                <section className="p-4 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20 rounded">
                  <p className="font-semibold mb-2">Requires attorney review <span className="text-[10px] font-normal uppercase tracking-wider text-amber-700">(admin)</span></p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {report.requires_attorney_review.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </section>
              </AdminOnly>
            )}

            {report?.scope_confirmation && (
              <section className="bg-card border rounded-lg p-6">
                <h2 className="mb-3">Scope Confirmation</h2>
                <p className="text-sm"><strong>In scope:</strong> {String(report.scope_confirmation.in_scope)}</p>
                {report.scope_confirmation.threshold_met && <p className="text-sm mt-1"><strong>Threshold met:</strong> {report.scope_confirmation.threshold_met}</p>}
                {Array.isArray(report.scope_confirmation.applicable_deadlines) && report.scope_confirmation.applicable_deadlines.length > 0 && (
                  <div className="text-sm mt-2"><strong>Applicable deadlines:</strong>
                    <ul className="list-disc pl-5 mt-1">{report.scope_confirmation.applicable_deadlines.map((d: string, i: number) => <li key={i}>{d}</li>)}</ul>
                  </div>
                )}
              </section>
            )}

            {report?.enforcement_context
              && typeof report.enforcement_context === "string"
              && report.enforcement_context.trim() !== ""
              && report.enforcement_context.trim().toLowerCase() !== "null" && (
              <section className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 text-sm rounded">
                <p className="font-semibold mb-1">Enforcement Context</p>
                <p>{report.enforcement_context}</p>
              </section>
            )}

            {Array.isArray(report?.domains) && report.domains.filter(hasUserFacingFinding).length > 0 && (() => {
              const visibleDomains = report.domains.filter(hasUserFacingFinding);
              const stratified: Record<ConfidenceTier, any[]> = {
                "High-confidence": [], "Inference": [], "Heuristic": [],
              };
              for (const d of visibleDomains) stratified[classifyDomain(d)].push(d);
              const order: ConfidenceTier[] = ["High-confidence", "Inference", "Heuristic"];
              return (
                <AdminOnly>
                  <section className="bg-card border rounded-lg p-6">
                    <h2 className="mb-1">Confidence Stratification <span className="text-[10px] font-normal uppercase tracking-wider text-muted-foreground">(admin)</span></h2>
                    <p className="text-xs text-muted-foreground mb-4">
                      Domains grouped by how strongly the conclusion is grounded in statutory or regulatory authority and agency commentary (FSOR). Use this to prioritise attorney review.
                    </p>
                    <div className="grid md:grid-cols-3 gap-3">
                      {order.map((tier) => (
                        <div key={tier} className={`rounded-lg border p-3 ${tierColor(tier)}`}>
                          <p className="text-[11px] font-bold tracking-wider uppercase">{tier}</p>
                          <p className="text-2xl font-semibold mt-1">{stratified[tier].length}</p>
                          <p className="text-[11px] leading-snug mt-1 opacity-80">{tierBlurb[tier]}</p>
                          {stratified[tier].length > 0 && (
                            <ul className="mt-2 text-[11px] list-disc pl-4 space-y-0.5">
                              {stratified[tier].map((d: any, i: number) => (
                                <li key={i}>{d.domain}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                </AdminOnly>
              );
            })()}

            {Array.isArray(report?.domains) && report.domains.filter(hasUserFacingFinding).length > 0 && (
              <section className="bg-card border rounded-lg p-6">
                <h2 className="mb-4">Domain Findings</h2>
                <Accordion type="multiple">
                  {report.domains.filter(hasUserFacingFinding).map((d: any, i: number) => {
                    const tier = classifyDomain(d);
                    return (
                    <AccordionItem key={i} value={`d${i}`}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span>{d.domain}</span>
                          {d.score != null && <span className="text-xs text-muted-foreground">{d.score}/100</span>}
                          {d.status && <span className={`px-2 py-0.5 text-xs rounded ${statusColor(d.status)}`}>{d.status}</span>}
                          <AdminOnly>
                            <span className={`px-2 py-0.5 text-xs rounded border ${tierColor(tier)}`}>{tier}</span>
                            {d.attorney_review_needed && (
                              <span className="px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-800">Attorney review</span>
                            )}
                          </AdminOnly>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-2">
                        {d.finding && <p className="text-sm"><strong>Finding:</strong> {d.finding}</p>}
                        <AdminOnly>
                          {d.regulatory_basis && <p className="text-sm"><strong>Regulatory basis <span className="text-[10px] uppercase tracking-wider text-muted-foreground">(admin)</span>:</strong> {d.regulatory_basis}</p>}
                        </AdminOnly>
                        {d.remediation && <p className="text-sm"><strong>Remediation:</strong> {d.remediation}</p>}
                        {d.priority && <p className="text-xs text-muted-foreground">Priority: {d.priority}</p>}
                        {Array.isArray(d.fsor_commentary) && d.fsor_commentary.length > 0 && (
                          <div className="mt-3 border-l-2 border-brand-teal bg-brand-teal/5 pl-3 py-2 space-y-2">
                            <p className="text-[11px] font-bold tracking-wider uppercase text-brand-teal">
                              Background
                            </p>
                            {d.fsor_commentary.slice(0, 3).map((f: any, fi: number) => (
                              <div key={f.id ?? fi} className="text-xs space-y-1">
                                {f.comment_summary && (
                                  <p>{firstSentence(f.comment_summary)}</p>
                                )}
                                <AdminOnly>
                                  <p className="font-mono text-[10px] text-muted-foreground">
                                    {f.regulation_citation}
                                    {f.fsor_package ? ` · ${f.fsor_package}` : ""}
                                    {f.page_ref ? ` · ${f.page_ref}` : ""}
                                  </p>
                                  {f.agency_response && (
                                    <p><strong>Agency response:</strong> {f.agency_response}</p>
                                  )}
                                  {f.source_url && (
                                    <a href={f.source_url} target="_blank" rel="noopener noreferrer"
                                      className="text-brand-teal underline">Source</a>
                                  )}
                                </AdminOnly>
                              </div>
                            ))}
                          </div>
                        )}
                        <AnnotationCallout
                          annotations={(report?.annotations || []).filter(
                            (a: any) => a.relevance?.toLowerCase().includes(
                              (d.domain || "").toLowerCase().slice(0, 20)
                            )
                          )}
                        />
                      </AccordionContent>
                    </AccordionItem>
                    );
                  })}
                </Accordion>
              </section>
            )}

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

            {Array.isArray(report?.citation_ledger) && report.citation_ledger.length > 0 && (
              <AdminOnly>
                <section className="bg-card border rounded-lg p-6">
                  <h2 className="mb-3">Citation Ledger <span className="text-[10px] font-normal uppercase tracking-wider text-muted-foreground">(admin)</span></h2>
                  {report?.validation_summary && (
                    <p className="text-sm text-muted-foreground mb-3 italic">{report.validation_summary}</p>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left bg-muted/40">
                        <tr>
                          <th className="p-2">Statement</th>
                          <th className="p-2">Citation</th>
                          <th className="p-2">Classification</th>
                          <th className="p-2">Corrected</th>
                          <th className="p-2">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.citation_ledger.map((e: any, i: number) => (
                          <tr key={i} className="border-t align-top">
                            <td className="p-2">{e.statement}</td>
                            <td className="p-2 font-mono text-xs">{e.citation}</td>
                            <td className="p-2">
                              <span className={`px-2 py-0.5 text-xs rounded ${ledgerColor(e.classification)}`}>
                                {e.classification}
                              </span>
                            </td>
                            <td className="p-2 font-mono text-xs">{e.corrected_citation ?? "—"}</td>
                            <td className="p-2 text-xs text-muted-foreground">{e.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </AdminOnly>
            )}

            {Array.isArray(report?.debug_review_notes) && report.debug_review_notes.length > 0 && (
              <AdminOnly>
                <section className="p-4 border-l-4 border-slate-400 bg-slate-50 dark:bg-slate-950/20 rounded">
                  <p className="font-semibold mb-2">Debug review notes <span className="text-[10px] font-normal uppercase tracking-wider text-muted-foreground">(admin)</span></p>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
                    {report.debug_review_notes.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </section>
              </AdminOnly>
            )}

            {Array.isArray(report?.fsor_commentary) && report.fsor_commentary.length > 0 && (
              <AdminOnly>
                <section className="bg-card border rounded-lg p-6">
                  <h2 className="mb-1">Agency Rationale <span className="text-[10px] font-normal uppercase tracking-wider text-muted-foreground">(admin)</span></h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    Non-binding interpretive context from the California Privacy Protection Agency's
                    Final Statement of Reasons (FSOR). Shows why the cited regulations read the way
                    they do, and what concerns the Agency was responding to.
                  </p>
                  <div className="space-y-4">
                    {report.fsor_commentary.map((f: any, i: number) => (
                      <details key={f.id ?? i} className="border rounded p-3 group">
                        <summary className="cursor-pointer text-sm font-semibold flex flex-wrap gap-2 items-baseline">
                          <span className="font-mono text-xs text-brand-teal">
                            {f.regulation_citation}
                          </span>
                          <span className="text-foreground">{f.comment_summary}</span>
                          <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
                            {f.fsor_package}{f.page_ref ? ` · ${f.page_ref}` : ""}
                          </span>
                        </summary>
                        <div className="mt-3 text-sm whitespace-pre-wrap text-muted-foreground">
                          {f.agency_response}
                        </div>
                        {Array.isArray(f.topic_tags) && f.topic_tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {f.topic_tags.map((t: string) => (
                              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </details>
                    ))}
                  </div>
                </section>
              </AdminOnly>
            )}


            <section className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 text-sm rounded">
              ⚠️ This compliance framework report does not constitute legal advice. Findings should be reviewed with qualified legal counsel.
            </section>

            <AnnotationAppendix annotations={(row?.report_data as any)?.annotations} />


            <div className="flex gap-2 flex-wrap">
              <PDFDownloadButton
                toolType="cppa_risk"
                assessmentId={row.id}
                pdfUrl={row.pdf_url}
                onGenerated={(url) => setRow({ ...row, pdf_url: url })}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-brand-navy bg-brand-cloud hover:bg-brand-cloud/70 border border-brand-cloud rounded-lg no-underline transition-colors disabled:opacity-60"
              />
              <DownloadWordButton
                text={isV3
                  ? buildV3Text(report)
                  : [
                      report?.executive_summary,
                      ...(Array.isArray(report?.domains)
                        ? report.domains
                            .filter(hasUserFacingFinding)
                            .map((d: any) =>
                              `${d.domain}\nStatus: ${d.status ?? ""}\n${d.finding}\n${d.remediation ?? ""}`)
                        : [])
                    ].filter(Boolean).join("\n\n")}
                label="CPPA Risk Assessment"
                buttonLabel="Download Word — Risk Assessment"
                className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-brand-navy bg-brand-cloud hover:bg-brand-cloud/70 border border-brand-cloud rounded-lg transition-colors disabled:opacity-60"
              />

              {/* Sprint 1 #2 — Regulator-Rationale Memo */}
              {Array.isArray(report?.fsor_commentary) && report.fsor_commentary.length > 0 && (() => {
                const memoLines: string[] = [
                  "REGULATOR RATIONALE MEMO",
                  "CPPA Risk Assessment — Final Statement of Reasons (FSOR) Appendix",
                  "",
                  "This memo bundles the agency commentary cited in the assessment, drawn verbatim from the California Privacy Protection Agency's Final Statement of Reasons. It is non-binding interpretive context — included to support legal review of the regulatory conclusions in the underlying report.",
                  "",
                ];
                // Per-domain section
                if (Array.isArray(report?.domains)) {
                  for (const d of report.domains) {
                    const rows = Array.isArray(d.fsor_commentary) ? d.fsor_commentary : [];
                    if (rows.length === 0) continue;
                    memoLines.push(`DOMAIN: ${d.domain}`);
                    if (d.regulatory_basis) memoLines.push(`Regulatory basis: ${d.regulatory_basis}`);
                    memoLines.push("");
                    for (const f of rows) {
                      memoLines.push(`Citation: ${f.regulation_citation ?? ""}${f.fsor_package ? ` (${f.fsor_package}${f.page_ref ? `, ${f.page_ref}` : ""})` : ""}`);
                      if (f.comment_summary) memoLines.push(`Comment: ${f.comment_summary}`);
                      if (f.agency_response) memoLines.push(`Agency response: ${f.agency_response}`);
                      if (f.source_url) memoLines.push(`Source: ${f.source_url}`);
                      memoLines.push("");
                    }
                  }
                }
                // Full FSOR appendix
                memoLines.push("FULL FSOR APPENDIX");
                memoLines.push("");
                for (const f of report.fsor_commentary) {
                  memoLines.push(`Citation: ${f.regulation_citation ?? ""}${f.fsor_package ? ` (${f.fsor_package}${f.page_ref ? `, ${f.page_ref}` : ""})` : ""}`);
                  if (f.comment_summary) memoLines.push(`Comment: ${f.comment_summary}`);
                  if (f.agency_response) memoLines.push(`Agency response: ${f.agency_response}`);
                  if (f.source_url) memoLines.push(`Source: ${f.source_url}`);
                  memoLines.push("");
                }
                return (
                  <AdminOnly>
                    <DownloadWordButton
                      text={memoLines.join("\n")}
                      label="Regulator Rationale Memo"
                      subtitle="CPPA Risk Assessment — FSOR Appendix"
                      buttonLabel="Download Word — Regulator Memo (admin)"
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-brand-navy bg-brand-cloud hover:bg-brand-cloud/70 border border-brand-cloud rounded-lg transition-colors disabled:opacity-60"
                    />
                  </AdminOnly>
                );
              })()}

              <Button asChild variant="outline"><Link to="/cppa-risk-assessment">Run New Assessment</Link></Button>
              <Button asChild><Link to="/dashboard/reports">Back to My Reports</Link></Button>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

// Build a flat text export for the v3 Part A / Part B structure.
function buildV3Text(report: any): string {
  const a = report?.part_a ?? {};
  const lines: string[] = [];
  lines.push("CPPA RISK ASSESSMENT — Part A (Cal. Code Regs. tit. 11 § 7152(a)(1)–(9))", "");
  lines.push(`§ 0 Cover — ${a.cover?.business_legal_name || "[FILL IN]"} | Activity: ${a.cover?.activity_name ?? ""}`);
  lines.push(`Certifying executive: ${a.cover?.certifying_executive?.name || "[FILL IN]"} — ${a.cover?.certifying_executive?.title || "[FILL IN]"}`, "");
  lines.push(`§ 1 Regulatory trigger (§ 7150(b)): ${a.sec_1_trigger?.narrative ?? ""}`, "");
  lines.push(`§ 2 Processing purpose (§ 7152(a)(1)): ${a.sec_2_purpose?.purpose_statement ?? ""}`);
  if (a.sec_2_purpose?.validator?.note) lines.push(`  Validator: ${a.sec_2_purpose.validator.note}`);
  lines.push("");
  lines.push(`§ 3 PI inventory (§ 7152(a)(2)):`);
  for (const c of a.sec_3_pi_inventory?.pi_categories ?? []) lines.push(`  - ${c.category}${c.is_spi ? " (SPI)" : ""}`);
  lines.push(`  Minimum-necessary justification: ${a.sec_3_pi_inventory?.minimum_necessary_justification ?? ""}`, "");
  lines.push(`§ 4 Operations (§ 7152(a)(3)):`);
  const op = a.sec_4_operations ?? {};
  lines.push(`  A Sources: ${op.a_sources ?? ""}`);
  lines.push(`  B Retention: ${op.b_retention ?? ""}`);
  lines.push(`  C Consumer interaction: ${op.c_consumer_interaction ?? ""}`);
  lines.push(`  D Consumer count: ${op.d_consumer_count ?? ""}`);
  lines.push(`  E Disclosures: ${op.e_disclosures ?? ""}`);
  lines.push(`  F Service providers: ${op.f_service_providers ?? ""}`);
  if (op.g_admt) lines.push(`  G ADMT: ${JSON.stringify(op.g_admt)}`);
  lines.push("");
  lines.push(`§ 5 Benefits (§ 7152(a)(4)):`);
  lines.push(`  Business: ${a.sec_5_benefits?.to_business ?? ""}`);
  lines.push(`  Consumer: ${a.sec_5_benefits?.to_consumer ?? ""}`);
  lines.push(`  Public: ${a.sec_5_benefits?.to_public ?? ""}`, "");
  lines.push(`§ 6 Negative impacts (§ 7152(a)(5)):`);
  for (const h of a.sec_6_harms?.harms ?? []) {
    lines.push(`  - ${h.category}: likelihood ${h.likelihood ?? "?"}, magnitude ${h.magnitude ?? "?"}, residual ${h.residual_after_safeguards ?? "?"}`);
    if (h.source) lines.push(`      Source: ${h.source}`);
  }
  lines.push("");
  lines.push(`§ 7 Safeguards (§ 7152(a)(6)):`);
  for (const group of ["technical", "organizational", "consumer_facing", "contractual"] as const) {
    lines.push(`  ${group}:`);
    for (const s of (a.sec_7_safeguards?.[group] ?? []) as any[]) {
      lines.push(`    - ${s.name}${s.description ? `: ${s.description}` : ""} (links: ${(s.linked_harms ?? []).join(", ") || "none"})`);
    }
  }
  lines.push("");
  lines.push(`§ 8 Decision (§§ 7152(a)(7), 7154):`);
  lines.push(`  Analysis: ${a.sec_8_decision?.analysis ?? ""}`);
  lines.push(`  AI recommendation: ${a.sec_8_decision?.ai_recommended_outcome ?? ""} — ${a.sec_8_decision?.recommendation_rationale ?? ""}`);
  lines.push(`  Executive decision (REQUIRED): ${a.sec_8_decision?.user_decision ?? "[NOT YET RECORDED]"}`, "");
  lines.push(`§ 9 Stakeholders (§§ 7151, 7152(a)(8)):`);
  for (const c of a.sec_9_stakeholders?.internal_contributors ?? []) lines.push(`  Internal — ${c.role}: ${c.name ?? "[FILL IN]"}`);
  for (const c of a.sec_9_stakeholders?.external_consultees ?? []) lines.push(`  External — ${c.role}: ${c.name ?? "[FILL IN]"}`);
  lines.push("");
  lines.push(`§ 10 Governance (§§ 7152(a)(9), 7155, 7156(c)):`);
  lines.push(`  Triennial review: ${a.sec_10_governance?.triennial_review_date ?? ""}`);
  lines.push(`  ${a.sec_10_governance?.material_change_commitment ?? ""}`);
  lines.push(`  ${a.sec_10_governance?.retention_commitment ?? ""}`);
  lines.push(`  ${a.sec_10_governance?.production_commitment ?? ""}`);
  lines.push(`  Approver: ${a.sec_10_governance?.approver?.name ?? "[FILL IN]"} — ${a.sec_10_governance?.approver?.title ?? "[FILL IN]"} on ${a.sec_10_governance?.approver?.date ?? "[FILL IN]"}`);
  if (report?.part_b) {
    const b = report.part_b;
    lines.push("", "", "PART B — § 7157 ANNUAL SUBMISSION WORKSHEET", "");
    lines.push(`Business: ${b.business_legal_name || "[FILL IN]"}`);
    lines.push(`Point of contact: ${b.point_of_contact ?? ""}`);
    lines.push(`Assessments in period: ${b.assessment_count_in_period ?? 1}`);
    lines.push(`PI categories: ${(b.pi_categories_aggregated ?? []).join(", ")}`);
    lines.push(`Sensitive PI: ${(b.spi_flagged ?? []).join(", ") || "None"}`, "");
    lines.push("Attestation:");
    lines.push(b.perjury_attestation_block ?? "");
    lines.push("", b.submission_banner ?? "");
  }
  if (report?.gating?.blockers?.length) {
    lines.push("", "", "SIGN-OFF BLOCKERS:");
    for (const blk of report.gating.blockers) lines.push(`  - ${blk}`);
  }
  return lines.join("\n");
}

