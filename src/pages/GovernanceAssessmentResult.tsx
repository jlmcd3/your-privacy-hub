import { useState } from "react";
import { useGenerationStatus } from "@/hooks/useGenerationStatus";
import GenerationStalledCard from "@/components/GenerationStalledCard";
import { useToolCompletedOnce } from "@/hooks/useToolCompletedOnce";

const GOV_TERMINAL = new Set(["complete", "error", "failed", "refunded", "failed_resolved"]);
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import EnforcementPrecedents from "@/components/EnforcementPrecedents";
import PDFDownloadButton from "@/components/PDFDownloadButton";
import WordConversionPromptButton from "@/components/WordConversionPromptButton";
import ReportShell from "@/components/ReportShell";
import AuthorityExhibit from "@/components/report/AuthorityExhibit";
import RunMeterBar from "@/components/RunMeterBar";
import InformationNeededBlock from "@/components/InformationNeededBlock";

import { useRunMeter } from "@/hooks/useRunMeter";
import { startMeterExtension } from "@/lib/meterExtension";
import ReportTranslateMenu from "@/components/ReportTranslateMenu";

import { supabase } from "@/integrations/supabase/client";
import BackLink from "@/components/dashboard/BackLink";
import { ClientContextBadge } from "@/components/clients/ClientContextBadge";
import { AnnotationCallout, AnnotationBadge } from "@/components/AnnotationCallout";
import GovernanceDomainV2Fields from "@/components/reports/GovernanceDomainV2Fields";
import GovernanceTrackerFindings from "@/components/reports/GovernanceTrackerFindings";
import { ProcessingInterstitial } from "@/components/ProcessingInterstitial";
import { CheckCircle2 } from 'lucide-react';


const ratingColor = (r: string) => {
  const x = (r || "").toLowerCase();
  if (x === "initial") return "bg-red-100 text-red-800";
  if (x === "developing") return "bg-amber-100 text-amber-800";
  if (x === "defined") return "bg-blue-100 text-blue-800";
  if (x === "managed") return "bg-green-100 text-green-800";
  if (x === "optimised" || x === "optimized") return "bg-emerald-200 text-emerald-900";
  return "bg-muted text-foreground";
};
const sevColor = (s: string) => {
  const x = (s || "").toLowerCase();
  if (x === "critical") return "bg-red-100 text-red-800";
  if (x === "high") return "bg-orange-100 text-orange-800";
  if (x === "medium") return "bg-amber-100 text-amber-800";
  if (x === "low") return "bg-blue-100 text-blue-800";
  if (x === "compliant") return "bg-green-100 text-green-800";
  return "bg-muted text-foreground";
};
const sevBg = (s: string) => {
  const x = (s || "").toLowerCase();
  if (x === "critical") return "bg-red-50 border-red-300";
  if (x === "high") return "bg-orange-50 border-orange-300";
  if (x === "medium") return "bg-amber-50 border-amber-300";
  if (x === "low") return "bg-blue-50 border-blue-300";
  if (x === "compliant") return "bg-green-50 border-green-300";
  return "bg-muted/40 border-border";
};

const GovernanceAssessmentResult = () => {
  const { id } = useParams();
  const { meter } = useRunMeter("governance_assessment", id);
  const [searchParams] = useSearchParams();
  const purchased = searchParams.get("purchased") === "true";
  const [translated, setTranslated] = useState<any | null>(null);
  const [dir, setDir] = useState<"ltr" | "rtl">("ltr");
  const [openDomains, setOpenDomains] = useState<string[]>([]);

  const focusDomain = (i: number) => {
    const v = `d${i}`;
    setOpenDomains((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setTimeout(() => {
      const el = document.getElementById(`domain-${v}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const { row: assessment, loading, phase, refresh, setRow: setAssessment } = useGenerationStatus<any>({
    table: "governance_assessments",
    rowId: id,
    isTerminal: (r) => GOV_TERMINAL.has(String(r?.status ?? "")),
    isReportReady: (r) => r?.status === "complete",
  });
  useToolCompletedOnce("governance_assessment", assessment?.status === "complete");

  const report = (translated?.report_data ?? assessment?.report_data) || {};
  const intake = assessment?.intake_data || {};
  const status = assessment?.status;

  const domainList: any[] =
    report?.domain_findings && typeof report.domain_findings === "object" && !Array.isArray(report.domain_findings)
      ? (Object.values(report.domain_findings) as any[])
      : Array.isArray(report?.domain_findings)
        ? report.domain_findings
        : [];

  const metaBits: string[] = [];
  if (report?.generated_at) metaBits.push(new Date(report.generated_at).toLocaleDateString());

  const actions = (
    <>
      <Button asChild variant="secondary" size="sm">
        <Link to="/governance-assessment">Run New Assessment</Link>
      </Button>
      {status === "complete" && assessment?.id && (
        <ReportTranslateMenu
          toolType="governance_assessment"
          reportId={assessment.id}
          onTranslated={(p, d) => { setTranslated(p); setDir(d); }}
        />
      )}
      {status === "complete" && (
<>
<PDFDownloadButton
          toolType="governance_assessment"
          assessmentId={assessment?.id}
          pdfUrl={assessment?.pdf_url}
          onGenerated={(url) => setAssessment({ ...assessment, pdf_url: url })}
        />
<WordConversionPromptButton documentType="governance_assessment" />
</>
)}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet><title>GDPR Governance Assessment | End User Privacy</title></Helmet>
      <Navbar />

      <main id="main-content" className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <BackLink to="/dashboard/reports" label="Back to My Reports" />
        <ClientContextBadge />
        {purchased && status !== "complete" && status !== "failed" && status !== "error" && status !== "refunded" && status !== "failed_resolved" && (
          <div className="p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-950/20 rounded text-sm">
            {assessment?.retry_count > 0
              ? `⏳ We hit a problem on the first try and are automatically retrying (attempt ${assessment.retry_count + 1} of 3). No action needed.`
              : " Purchase confirmed. Your assessment is being generated."}
          </div>
        )}

        <ReportShell
          title="GDPR Governance Assessment"
          meta={metaBits.length ? metaBits.join(" · ") : undefined}
          actions={status === "complete" || status === "failed" ? actions : undefined}
          topDisclaimer={report.framework_disclaimer ?? report.disclaimer}
        >
          {(() => {
            const infoNeeded = (report as any)?.information_needed;
            return meter ? (
              <>
                <RunMeterBar
                  meter={meter}
                  refineHref={`/governance-assessment?refine=${id}`}
                  onExtend={() => startMeterExtension("governance_assessment", id!)}
                  infoNeededCount={Array.isArray(infoNeeded) ? infoNeeded.length : 0}
                />
                <InformationNeededBlock items={infoNeeded} />
              </>
            ) : null;
          })()}

          <div dir={dir} style={{ display: "contents" }}>
          {loading && <p>Loading…</p>}

          {(phase === "stalled" || phase === "stalled_pre_dispatch") && (
            <GenerationStalledCard variant={phase} retryHref="/governance-assessment" onRefresh={refresh} />
          )}

          {!loading && (phase === "running" || phase === "slow") && (
            <ProcessingInterstitial
              tool="governance"
              startedAt={assessment?.updated_at ?? assessment?.created_at}
              slow={phase === "slow"}
            />
          )}

          {(status === "failed" || status === "error") && (
            <div className="bg-card border rounded-lg p-6">
              <p className="font-medium text-red-700 mb-2">Assessment could not be completed.</p>
              <p className="text-sm text-muted-foreground mb-3">
                This can happen when the assessment takes longer than expected. Your inputs were saved — please try again.
              </p>
              <Button asChild><Link to="/governance-assessment">Try Again</Link></Button>
            </div>
          )}

          {status === "refunded" && (
            <div className="bg-card border rounded-lg p-6">
              <p className="font-medium mb-2">We couldn't generate this assessment and have refunded your payment.</p>
              <p className="text-sm text-muted-foreground mb-4">The refund will appear on your statement within 5–10 business days. You can start a fresh assessment whenever you're ready.</p>
              <Button asChild><Link to="/governance-assessment">Start a new assessment</Link></Button>
            </div>
          )}

          {status === "failed_resolved" && (
            <div className="bg-card border rounded-lg p-6">
              <p className="font-medium mb-2">We couldn't generate this assessment.</p>
              <p className="text-sm text-muted-foreground mb-4">As a subscriber make-good, a free service credit has been added to your account. Use it on any Smart Tool.</p>
              <Button asChild><Link to="/governance-assessment">Start a new assessment</Link></Button>
            </div>
          )}

          {status === "complete" && (
            <div className="space-y-6 font-serif-text">
              {/* Executive Summary */}
              {(report?.accountability_determination || report?.maturity_tier_readability_aid || report?.overall_readiness_rating || report?.executive_summary) && (
                <section className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-6">
                  <h2 className="font-body text-display-card font-semibold mb-3">Executive Summary</h2>
                  {(assessment?.organization_name || assessment?.intake_data?.organization_name) && (
                    <p className="text-sm text-foreground mb-3">
                      This assessment evaluates the privacy programme of <span className="font-semibold">{assessment?.organization_name || assessment?.intake_data?.organization_name}</span>.
                    </p>
                  )}
                  {/* ITEM 313 — the headline conclusion is the statutory
                      accountability determination under Arts. 5(2)/24(1). */}
                  {report?.accountability_determination && (
                    <div className="mb-4 rounded border border-blue-300 dark:border-blue-800 bg-background/60 p-4">
                      <p className="text-eyebrow font-mono uppercase tracking-wide text-muted-foreground mb-1">
                        Accountability determination — {report.accountability_determination.citation}
                      </p>
                      <p className="text-sm font-semibold text-foreground mb-2">
                        {String(report.accountability_determination.verdict || "").replace(/_/g, " ")}
                      </p>
                      {report.accountability_determination.reasoning && (
                        <p className="text-sm text-foreground">{report.accountability_determination.reasoning}</p>
                      )}
                    </div>
                  )}
                  {report?.executive_summary && <p className="text-sm text-foreground">{report.executive_summary}</p>}
                  {/* Demoted: non-statutory readability aid, never the conclusion. */}
                  {report?.maturity_tier_readability_aid && (
                    <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-900">
                      <p className="text-eyebrow font-mono uppercase tracking-wide text-muted-foreground mb-1">
                        {report.maturity_tier_readability_aid.label}
                      </p>
                      <span className={`inline-block px-2 py-1 rounded text-meta ${ratingColor(report.maturity_tier_readability_aid.tier)}`}>
                        {report.maturity_tier_readability_aid.tier}
                      </span>
                      <p className="text-xs text-muted-foreground mt-2">{report.maturity_tier_readability_aid.caveat}</p>
                    </div>
                  )}
                  {/* Legacy reports generated before Item 313 still carry the tier at top level. */}
                  {!report?.maturity_tier_readability_aid && report?.overall_readiness_rating && (
                    <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-900">
                      <p className="text-eyebrow font-mono uppercase tracking-wide text-muted-foreground mb-1">Non-statutory readability aid</p>
                      <span className={`inline-block px-2 py-1 rounded text-meta ${ratingColor(report.overall_readiness_rating)}`}>
                        {report.overall_readiness_rating}
                      </span>
                    </div>
                  )}
                </section>
              )}


              {/* 10-Domain Overview grid */}
              {domainList.length > 0 && (
                <section>
                  <h2 className="font-body text-display-card font-semibold mb-1">10-Domain Overview</h2>
                  <p className="text-sm text-muted-foreground mb-3">Click any domain below for detailed findings</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {domainList.map((d: any, i: number) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => focusDomain(i)}
                        className={`text-left border rounded-lg p-3 transition hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${sevBg(d.severity)}`}
                        aria-label={`View findings for ${d.domain_name || d.name}`}
                      >
                        <p className="text-meta font-semibold leading-snug mb-2">{d.domain_name || d.name}</p>
                        {d.severity && (
                          <span className={`inline-block px-1.5 py-0.5 text-eyebrow rounded ${sevColor(d.severity)}`}>
                            {d.severity}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Top risks */}
              {Array.isArray(report?.top_three_risks) && report.top_three_risks.length > 0 && (
                <section>
                  <h2 className="font-body text-display-card font-semibold mb-3">Top Risks</h2>
                  <div className="grid md:grid-cols-3 gap-4">
                    {report.top_three_risks.slice(0, 3).map((r: any, i: number) => (
                      <div key={i} className="bg-card border rounded-lg p-4">
                        <p className="font-medium">{r.risk_name || r.name}</p>
                        {r.domain && <p className="text-xs text-muted-foreground">{r.domain}</p>}
                        {r.severity && <span className={`inline-block mt-2 px-2 py-1 text-xs rounded ${sevColor(r.severity)}`}>{r.severity}</span>}
                        {r.why_urgent && <p className="text-sm mt-2">{r.why_urgent}</p>}
                        <AnnotationCallout
                          annotations={(report?.annotations || []).filter(
                            (a: any) => a.relevance?.toLowerCase().includes(
                              (r.risk_title || r.risk_name || r.name || "").toLowerCase().slice(0, 20)
                            )
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Immediate Actions */}
              {Array.isArray(report?.immediate_actions) && report.immediate_actions.length > 0 && (
                <section className="bg-card border rounded-lg p-6">
                  <h2 className="font-body text-display-card font-semibold mb-3">Immediate Actions</h2>
                  <ol className="list-decimal pl-5 space-y-2">
                    {report.immediate_actions.map((a: any, i: number) => (
                      <li key={i} className="text-sm">
                        <span className="font-medium">{a.action || a.name}</span>
                        {a.owner && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-muted">{a.owner}</span>}
                        {a.timeline && <span className="ml-2 text-xs text-muted-foreground">{a.timeline}</span>}
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* GOVERNANCE UPGRADE — generalised control walk + remediation */}
              <GovernanceTrackerFindings
                findings={(report as any)?.domain_element_findings}
                remediationPlan={(report as any)?.remediation_plan}
              />

              {/* Ten Domains — Domain Findings (handles Record OR Array shape) */}
              {report?.domain_findings &&
                typeof report.domain_findings === "object" &&
                !Array.isArray(report.domain_findings) &&
                Object.values(report.domain_findings).length > 0 && (
                  <section className="bg-card border rounded-lg p-6">
                    <h2 className="font-body text-display-card font-semibold mb-4">Domain Findings</h2>
                    <Accordion type="multiple" value={openDomains} onValueChange={setOpenDomains}>
                      {Object.values(report.domain_findings).map((d: any, i: number) => (
                        <AccordionItem key={i} value={`d${i}`} id={`domain-d${i}`}>
                          <AccordionTrigger>
                            <div className="flex items-center gap-3">
                              <span>{d.domain_name || d.name}</span>
                              {d.severity && (
                                <span className={`px-2 py-0.5 text-xs rounded ${sevColor(d.severity)}`}>
                                  {d.severity}
                                </span>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            {d.current_state && (
                              <p className="text-sm mb-2"><strong>Current state:</strong> {d.current_state}</p>
                            )}
                            {d.gap_description && (
                              <p className="text-sm mb-2"><strong>Gap:</strong> {d.gap_description}</p>
                            )}
                            <GovernanceDomainV2Fields
                              recommendedActionV2={(d as any).recommended_action_v2}
                              regulatoryBasisV2={(d as any).regulatory_basis_v2}
                              legacyRecommendedAction={d.recommended_action}
                              legacyRegulatoryBasis={d.regulatory_basis}
                            />
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              {d.suggested_owner && <span>Owner: {d.suggested_owner}</span>}
                              {d.suggested_timeline && <span>Timeline: {d.suggested_timeline}</span>}
                            </div>
                            <details className="mt-3">
                              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                                Enforcement citations
                                <AnnotationBadge
                                  count={(report?.annotations || []).filter(
                                    (a: any) => a.relevance?.toLowerCase().includes(
                                      (d.domain_name || "").toLowerCase().slice(0, 15)
                                    )
                                  ).length}
                                />
                              </summary>
                              <AnnotationCallout
                                annotations={(report?.annotations || []).filter(
                                  (a: any) => a.relevance?.toLowerCase().includes(
                                    (d.domain_name || "").toLowerCase().slice(0, 15)
                                  )
                                )}
                              />
                            </details>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </section>
                )}

              {Array.isArray(report?.domain_findings) && report.domain_findings.length > 0 && (
                <section className="bg-card border rounded-lg p-6">
                  <h2 className="font-body text-display-card font-semibold mb-4">Domain Findings</h2>
                  <Accordion type="multiple" value={openDomains} onValueChange={setOpenDomains}>
                    {report.domain_findings.map((d: any, i: number) => (
                      <AccordionItem key={i} value={`d${i}`} id={`domain-d${i}`}>
                        <AccordionTrigger>
                          <div className="flex items-center gap-3">
                            <span>{d.domain_name || d.name}</span>
                            {d.severity && <span className={`px-2 py-0.5 text-xs rounded ${sevColor(d.severity)}`}>{d.severity}</span>}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          {d.current_state && <p className="text-sm mb-2"><strong>Current state:</strong> {d.current_state}</p>}
                          {d.gap_description && <p className="text-sm mb-2"><strong>Gap:</strong> {d.gap_description}</p>}
                          <GovernanceDomainV2Fields
                            recommendedActionV2={(d as any).recommended_action_v2}
                            regulatoryBasisV2={(d as any).regulatory_basis_v2}
                            legacyRecommendedAction={d.recommended_action}
                            legacyRegulatoryBasis={d.regulatory_basis}
                          />
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            {d.suggested_owner && <span>Owner: {d.suggested_owner}</span>}
                            {d.suggested_timeline && <span>Timeline: {d.suggested_timeline}</span>}
                          </div>
                          <details className="mt-3">
                            <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                              Enforcement citations
                              <AnnotationBadge
                                count={(report?.annotations || []).filter(
                                  (a: any) => a.relevance?.toLowerCase().includes(
                                    (d.domain_name || "").toLowerCase().slice(0, 15)
                                  )
                                ).length}
                              />
                            </summary>
                            <AnnotationCallout
                              annotations={(report?.annotations || []).filter(
                                (a: any) => a.relevance?.toLowerCase().includes(
                                  (d.domain_name || "").toLowerCase().slice(0, 15)
                                )
                              )}
                            />
                          </details>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </section>
              )}

              {/* DPIA Scope */}
              {Array.isArray(report?.dpia_scope) && report.dpia_scope.length > 0 && (
                <section className="bg-[hsl(var(--cobalt)/0.06)] dark:bg-[hsl(var(--cobalt)/0.15)] border border-[hsl(var(--cobalt)/0.25)] rounded-lg p-6">
                  <h2 className="font-body text-display-card font-semibold mb-3">Processing Activities Requiring a Formal DPIA</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    The following processing activities identified in your assessment may require a Data Protection Impact Assessment under GDPR Article 35 or equivalent provisions before proceeding. This list is provided as a starting point for review with your Data Protection Officer or legal counsel.
                  </p>
                  <ul className="space-y-2 mb-4">
                    {report.dpia_scope.map((d: any, i: number) => (
                      <li key={i} className="border bg-card rounded p-3">
                        <p className="font-medium">{d.processing_activity || d.name}</p>
                        {d.regulatory_basis && <p className="text-xs text-muted-foreground">{d.regulatory_basis}</p>}
                        {d.priority && <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${sevColor(d.priority)}`}>{d.priority}</span>}
                      </li>
                    ))}
                  </ul>
                  <Button asChild>
                    <Link to={`/dpia-framework?source=${id}`}>Open Impact Assessment Builder for {report.dpia_scope[0]?.processing_activity || report.dpia_scope[0]?.name} →</Link>
                  </Button>
                </section>
              )}

              {report?.interaction_effects && (
                <section className="bg-muted/30 border rounded-lg p-6">
                  <h2 className="font-body text-display-card font-semibold mb-2">Cross-Domain Considerations</h2>
                  <p className="text-sm">{report.interaction_effects}</p>
                </section>
              )}

              <EnforcementPrecedents
                precedents={report?.enforcement_precedents}
                context="Enforcement signals from regulators in your jurisdictions and sector — context for the top three risks above."
              />

              {/* GOVERNANCE UPGRADE ITEM 5 — table of authorities, last in the
                  body and immediately before the universal disclaimer that
                  ReportShell renders. */}
              <AuthorityExhibit exhibit={report?.authority_exhibit} />
            </div>
          )}
          </div>
        </ReportShell>
      </main>
      <Footer />
    </div>
  );
};


export default GovernanceAssessmentResult;
