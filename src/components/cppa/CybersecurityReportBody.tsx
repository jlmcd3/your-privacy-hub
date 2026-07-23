// CybersecurityReportBody — extracted from src/pages/CPPACybersecurityResult.tsx
// so the sample-report shell (src/components/SampleToolReport.tsx) can render
// the same JSX without importing a page module. Page re-exports this name so
// external callers via the page path stay valid.
//
// RC-FLIP-3 — extraction eliminates a page↔shared-component cycle that could
// contribute to Rollup binding hoists across chunks.
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AnnotationCallout } from "@/components/AnnotationCallout";
import { CPPA_CYBER_FRAMEWORK_MAPPING } from "@/data/cppa-cyber-framework-mapping";
import AuditorIndependenceAdvisor from "@/components/cppa/AuditorIndependenceAdvisor";
import AuditScopeMemoGenerator from "@/components/cppa/AuditScopeMemoGenerator";
import { AuditorHandoffCover } from "@/components/cppa/AuditorHandoffPackage";
import BreachPrecedentMap from "@/components/cppa/BreachPrecedentMap";
import { useCitationVerification } from "@/hooks/useCitationVerification";
import CitationVerificationBadge from "@/components/cppa/CitationVerificationBadge";
import { readinessColor, controlStatusColor } from "@/pages/CPPACybersecurityResult.helpers";
import { AlertTriangle } from 'lucide-react';
import { CYBER_BANDS, isCyberGapStatus, type CyberStatus } from "@/lib/cppaCyberBands";

export function CybersecurityReportBody({ row, hideHeader = false }: { row: any; hideHeader?: boolean }) {
  const report = row?.report_data || {};
  const ledgerCitations = Array.isArray(report?.citation_ledger)
    ? report.citation_ledger.map((c: any) => c?.citation || c?.cite || "")
    : [];
  const { isVerified } = useCitationVerification(ledgerCitations);
  return (
    <div className="space-y-6 font-serif-text">
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
          <h2 className="font-body text-display-card font-semibold mb-4">Control Findings</h2>
          <Accordion type="multiple">
            {/* QB-P25 CYBER — render controls sorted by generator-assigned `rank` (1 = highest reader priority). */}
            {[...report.controls]
              .sort((a: any, b: any) => {
                const ra = Number.isFinite(Number(a?.rank)) ? Number(a.rank) : 999;
                const rb = Number.isFinite(Number(b?.rank)) ? Number(b.rank) : 999;
                return ra - rb;
              })
              .map((d: any, i: number) => (
              <AccordionItem key={i} value={`c${i}`}>
                <AccordionTrigger>
                  <div className="flex items-center gap-3 flex-wrap">
                    {Number.isFinite(Number(d?.rank)) && (
                      <span className="text-xs font-mono text-muted-foreground">#{d.rank}</span>
                    )}
                    <span>{d.control}</span>
                    {d.score != null && <span className="text-xs text-muted-foreground">{d.score}/100</span>}
                    {d.status && <span className={`px-2 py-0.5 text-xs rounded ${controlStatusColor(d.status)}`}>{d.status}</span>}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2">
                  {d.finding && <p className="text-sm"><strong>Finding:</strong> {d.finding}</p>}
                  {d.evidence && <p className="text-sm"><strong>Evidence:</strong> {d.evidence}</p>}
                  {d.differentiator && <p className="text-sm"><strong>Why this ranks here:</strong> {d.differentiator}</p>}
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
                      <ul className="space-y-3">
                        {d.fsor_commentary.slice(0, 3).map((f: any) => {
                          const positionText = f.agency_position_summary || f.agency_response || "";
                          const sourceLabel = [f.fsor_package, f.page_ref].filter(Boolean).join(" · ");
                          return (
                            <li key={f.id} className="space-y-1">
                              {positionText && (
                                <p className="text-xs text-foreground leading-relaxed">{positionText}</p>
                              )}
                              <details className="group">
                                <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground list-none">
                                  <span className="group-open:hidden">▸ View source</span>
                                  <span className="hidden group-open:inline">▾ Hide source</span>
                                  {sourceLabel && <span className="ml-1 font-medium">{sourceLabel}</span>}
                                  {f.source_url && (
                                    <> · <a href={f.source_url} target="_blank" rel="noreferrer" className="underline">source</a></>
                                  )}
                                </summary>
                                <div className="mt-2 pl-3 border-l-2 border-muted space-y-2">
                                  {f.comment_summary && (
                                    <p className="text-[11px] text-muted-foreground">
                                      <span className="font-semibold">Comment: </span>{f.comment_summary}
                                    </p>
                                  )}
                                  {f.agency_response && (
                                    <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">
                                      <span className="font-semibold">Agency (verbatim): </span>{f.agency_response}
                                    </p>
                                  )}
                                </div>
                              </details>
                            </li>
                          );
                        })}
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

      {/* Scoring legend — static UI, not AI-generated */}
      {Array.isArray(report?.controls) && report.controls.length > 0 && (
        <section className="bg-card border rounded-lg p-4 text-sm">
          <p className="font-semibold mb-2">How to read these scores</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
            {CYBER_BANDS.map((b) => {
              const cls = b.label === "Critical Gap" ? "bg-red-100 text-red-900"
                : b.label === "Gap / Partial" ? "bg-orange-100 text-orange-900"
                : b.label === "Implemented" ? "bg-emerald-100 text-emerald-900"
                : "bg-sky-100 text-sky-900";
              return (
                <div key={b.label} className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs rounded ${cls}`}>{b.label}</span>
                  <span className="text-xs text-muted-foreground">{b.bandText}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Scores reflect this tool's assessment of program maturity based on the inputs you provided. They are not a substitute for an independent auditor's determination and should be reviewed with a qualified CPPA-registered or equivalent cybersecurity auditor before certification.
          </p>
        </section>
      )}

      {/* Sprint 2 #1 — Auditor Independence Advisor (§ 7122(b)) */}
      <AuditorIndependenceAdvisor />

      {/* Sprint 2 #2 — Audit Scope Memo Generator (§ 7123) */}
      <AuditScopeMemoGenerator intake={row?.intake_data} report={report} />


      {/* Sprint 1 #4 — Pre-audit readiness gap log */}
      {Array.isArray(report?.controls) && (() => {
        const gaps = report.controls.filter((c: any) => isCyberGapStatus(c.status));
        if (gaps.length === 0) return null;
        // Back-solve from the fixed April 1, 2028 audit submission deadline.
        // Tighter buffer for higher-severity gaps so remediation lands well
        // before the auditor walks in.
        const AUDIT_DEADLINE = new Date("2028-04-01T00:00:00Z");
        // QB-P25 Final-B R5 — re-keyed to the shared CyberStatus enum from
        // cppaCyberBands. Semantics preserved: more-severe status = earlier
        // target date (deeper remediation buffer before the audit deadline).
        // No styling changes.
        const targetForSeverity = (status: CyberStatus | string): Date => {
          const s = String(status || "").toLowerCase();
          const d = new Date(AUDIT_DEADLINE);
          if (s === "critical gap") d.setUTCMonth(d.getUTCMonth() - 6);
          else if (s === "gap" || s === "partial") d.setUTCMonth(d.getUTCMonth() - 3);
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
            <h2 className="font-body text-display-card font-semibold mb-1">Pre-Audit Readiness Gap Log</h2>
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
        <h2 className="font-body text-display-card font-semibold mb-1">Framework Mapping</h2>
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
                <th className="p-2 border">CPPA component (§ 7123(c))</th>
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
          <h2 className="font-body text-display-card font-semibold mb-3">Top Risks</h2>
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
          <h2 className="font-body text-display-card font-semibold mb-3">Next Steps</h2>
          {/* QB-P25 CYBER — next_steps are objects { text, owner, trigger } (legacy strings tolerated). */}
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            {report.next_steps.slice(0, 3).map((s: any, i: number) => {
              if (typeof s === "string") return <li key={i}>{s}</li>;
              return (
                <li key={i} className="space-y-1">
                  <p>{s?.text}</p>
                  {(s?.owner || s?.trigger) && (
                    <p className="text-xs text-muted-foreground">
                      {s?.owner && <><span className="font-semibold">Owner:</span> {s.owner}</>}
                      {s?.owner && s?.trigger && <span className="mx-2">·</span>}
                      {s?.trigger && <><span className="font-semibold">Trigger:</span> {s.trigger}</>}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Sprint 2 #3 — Citation ledger (included so the handoff PDF is self-contained) */}
      {Array.isArray(report?.citation_ledger) && report.citation_ledger.length > 0 && (
        <section className="bg-card border rounded-lg p-6">
          <h2 className="font-body text-display-card font-semibold mb-1">Citation Ledger</h2>
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
        <AlertTriangle aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> This compliance framework report does not constitute legal or security advice. Findings should be validated against your organization's authoritative records and security posture before operational reliance.
      </section>
    </div>
  );
}
