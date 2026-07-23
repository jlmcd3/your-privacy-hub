import { useState } from "react";
import { useGenerationStatus } from "@/hooks/useGenerationStatus";
import GenerationStalledCard from "@/components/GenerationStalledCard";
import { useToolCompletedOnce } from "@/hooks/useToolCompletedOnce";

const LI_TERMINAL = new Set(["complete", "error", "failed", "refunded", "failed_resolved"]);
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import EnforcementPrecedents from "@/components/EnforcementPrecedents";
import { supabase } from "@/integrations/supabase/client";
import BackLink from "@/components/dashboard/BackLink";
import { ClientContextBadge } from "@/components/clients/ClientContextBadge";

import PDFDownloadButton from "@/components/PDFDownloadButton";
import WordConversionPromptButton from "@/components/WordConversionPromptButton";
import ReportShell from "@/components/ReportShell";
import RunMeterBar from "@/components/RunMeterBar";
import InformationNeededBlock from "@/components/InformationNeededBlock";

import { useRunMeter } from "@/hooks/useRunMeter";
import { startMeterExtension } from "@/lib/meterExtension";
import ReportTranslateMenu from "@/components/ReportTranslateMenu";
import { ProcessingInterstitial } from "@/components/ProcessingInterstitial";
import { AlertTriangle, Ban, CheckCircle2, ClipboardList } from 'lucide-react';


const strengthColor = (s: string) => {
  const v = (s || "").toLowerCase();
  if (v === "strong") return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200";
  if (v === "moderate") return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
};
const verdictColor = (v: string) => {
  const x = (v || "").toLowerCase();
  if (x.includes("pass")) return "bg-green-100 text-green-800";
  if (x.includes("fail")) return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-800";
};
const verdictLabel = (v: string) => ({ likely_passes: "Likely passes", likely_fails: "Likely fails", passes: "Passes", fails: "Fails", uncertain: "Uncertain" } as Record<string,string>)[v] ?? v.replace(/_/g, " ");

const tierLabelFor = (tier: number | null | undefined, isUk: boolean): { label: string; tone: string } | null => {
  if (tier === 1) return { label: isUk ? "UK GDPR enforcement" : "EU GDPR enforcement", tone: "bg-emerald-100 text-emerald-800 border-emerald-200" };
  if (tier === 2) return {
    label: isUk ? "Persuasive — EU decision (not binding under UK GDPR)" : "Persuasive — UK decision (not binding under EU GDPR)",
    tone: "bg-amber-100 text-amber-800 border-amber-200",
  };
  if (tier === 3) return { label: "Non-EU/UK — supportive only, not authoritative", tone: "bg-slate-100 text-slate-700 border-slate-200" };
  return null;
};

const AnnotationCallout = ({ annotations, precedents, isUk }: { annotations: any[]; precedents?: any[]; isUk: boolean }) => {
  if (!Array.isArray(annotations) || annotations.length === 0) return null;
  const byId: Record<string, any> = {};
  for (const p of precedents || []) if (p?.id) byId[p.id] = p;
  return (
    <div className="mt-3 space-y-2">
      {annotations.map((a: any, i: number) => {
        const ctx = byId[a.enforcement_action_id] || {};
        const tier = a.authority_tier ?? ctx.authority_tier ?? null;
        const tl = tierLabelFor(tier, isUk);
        const unverified = ctx.verified === false;
        return (
          <div key={i} className="bg-slate-50 dark:bg-slate-900/40 border-l-2 border-slate-300 dark:border-slate-600 rounded-r px-3 py-2">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide"><ClipboardList aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Corpus citation</span>
                {tl && (
                  <span className={`ml-2 text-[10px] font-semibold px-1.5 py-0.5 border rounded ${tl.tone}`}>{tl.label}</span>
                )}
                <p className="text-xs text-foreground mt-0.5">
                  <span className="font-medium">{a.regulator}</span>
                  {a.jurisdiction ? ` · ${a.jurisdiction}` : ""}
                  {a.decision_date ? ` · ${a.decision_date?.slice(0,7)}` : ""}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.summary}</p>
                {a.relevance && (<p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 italic">{a.relevance}</p>)}
                {unverified && (<p className="text-[11px] text-amber-700 mt-1 italic">(fine amount unverified — omitted)</p>)}
              </div>
              {a.enforcement_action_id && (
                <Link to={`/enforcement/${a.enforcement_action_id}`} className="text-[11px] text-blue-700 hover:underline shrink-0 whitespace-nowrap">View case →</Link>
              )}
            </div>
          </div>
        );
      })}
      <p className="text-[10px] text-muted-foreground italic mt-1 leading-relaxed">
        Enforcement citations are drawn from enforcement actions tracked by EUP on a regular basis. Actual enforcement actions can lag publication; further clarification against primary sources is advisable before relying on any regulatory position.
      </p>
    </div>
  );
};

// W3-T2: factor label + direction chip helpers.
const FACTOR_LABEL: Record<string, string> = {
  reasonable_expectations: "Reasonable expectations",
  relationship: "Nature of the relationship",
  impact_severity: "Impact and severity",
  safeguards: "Safeguards (incl. opt-out)",
};
const directionChip = (d?: string) => {
  const dir = String(d || "").toLowerCase();
  if (dir === "for_controller") return { label: "Tips for controller", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" };
  if (dir === "for_subjects")   return { label: "Tips for data subjects", cls: "bg-red-50 text-red-800 border-red-200" };
  return { label: "Neutral", cls: "bg-slate-50 text-slate-700 border-slate-200" };
};
const BalancingFactors = ({ factors, synthesis }: { factors: any[]; synthesis?: string }) => (
  <div className="mb-3 space-y-3">
    <p className="text-xs font-medium text-foreground/80">EDPB four-factor balancing</p>
    {factors.map((f: any, i: number) => {
      const chip = directionChip(f?.direction);
      return (
        <div key={i} className="border rounded p-3 bg-muted/30">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm font-semibold">{FACTOR_LABEL[f?.factor] || f?.factor || `Factor ${i + 1}`}</span>
            <span className={`text-[11px] px-2 py-0.5 rounded border ${chip.cls}`}>{chip.label}</span>
          </div>
          {f?.reasoning && <p className="text-sm text-foreground mb-2">{f.reasoning}</p>}
          {Array.isArray(f?.intake_evidence) && f.intake_evidence.length > 0 && (
            <ul className="text-[11px] text-muted-foreground list-disc pl-4 space-y-0.5">
              {f.intake_evidence.map((ev: any, j: number) => (
                <li key={j}><span className="font-medium">{ev?.field}:</span> {String(ev?.value ?? "")}</li>
              ))}
            </ul>
          )}
        </div>
      );
    })}
    {synthesis && <p className="text-sm text-foreground italic">{synthesis}</p>}
  </div>
);

const TestCard = ({ title, test, annotations, precedents, isUk }: { title: string; test: any; annotations?: any[]; precedents?: any[]; isUk: boolean }) => (
  <div className="bg-card border rounded-lg p-5">
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-body text-display-card font-semibold">{title}</h3>
      {test?.verdict && <span className={`px-2 py-1 text-xs rounded ${verdictColor(test.verdict)}`}>{verdictLabel(test.verdict)}</span>}
    </div>
    {test?.analysis && <p className="text-sm text-foreground mb-3">{test.analysis}</p>}
    {Array.isArray(test?.factors) && test.factors.length > 0 && (
      <BalancingFactors factors={test.factors} synthesis={test?.synthesis} />
    )}
    {test?.special_category_flag && (
      <div className="text-sm p-2 bg-amber-50 border border-amber-200 rounded mb-3 text-amber-900">
        <AlertTriangle aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Special category data — heightened scrutiny applies
      </div>
    )}
    {Array.isArray(test?.supporting_factors) && test.supporting_factors.length > 0 && (
      <div className="mb-2">
        <p className="text-xs font-medium text-green-700 mb-1">Supporting factors</p>
        <ul className="list-disc pl-5 text-sm space-y-1">{test.supporting_factors.map((f: string, i: number) => <li key={i}>{f}</li>)}</ul>
      </div>
    )}
    {Array.isArray(test?.risk_factors) && test.risk_factors.length > 0 && (
      <div>
        <p className="text-xs font-medium text-red-700 mb-1">Risk factors</p>
        <ul className="list-disc pl-5 text-sm space-y-1">{test.risk_factors.map((f: string, i: number) => <li key={i}>{f}</li>)}</ul>
      </div>
    )}
    <AnnotationCallout
      annotations={(annotations || []).filter(
        (a: any) => a.relevance?.toLowerCase().includes(title.toLowerCase().replace(" test",""))
      )}
      precedents={precedents}
      isUk={isUk}
    />
  </div>
);

const LIAssessmentResult = () => {
  const { id } = useParams();
  const { meter } = useRunMeter("li_assessment", id);
  const [searchParams] = useSearchParams();
  const purchased = searchParams.get("purchased") === "true";
  const [translated, setTranslated] = useState<any | null>(null);
  const [dir, setDir] = useState<"ltr" | "rtl">("ltr");

  const { row: assessment, loading, phase, refresh, setRow: setAssessment } = useGenerationStatus<any>({
    table: "li_assessments",
    rowId: id,
    isTerminal: (r) => LI_TERMINAL.has(String(r?.status ?? "")),
    isReportReady: (r) => r?.status === "complete",
  });
  useToolCompletedOnce("li_assessment", assessment?.status === "complete");

  const report = (translated?.report_data ?? assessment?.report_data) || {};
  const status = assessment?.status;
  const overall = report?.three_part_test?.overall_assessment;
  const docs = report?.documentation_recommendations;

  const metaParts: string[] = [];
  if (status === "complete" && report?.generated_at) {
    metaParts.push(`Generated ${new Date(report.generated_at).toLocaleString()}`);
  }

  const actions = (
    <>
      <Button asChild variant="secondary" size="sm">
        <Link to="/li-assessment">Run New Assessment</Link>
      </Button>
      {status === "complete" && assessment?.id && (
        <ReportTranslateMenu
          toolType="li_assessment"
          reportId={assessment.id}
          onTranslated={(p, d) => { setTranslated(p); setDir(d); }}
        />
      )}
      {/* SEC-1b: PDF affordance requires an owner. Preview-stage (user_id NULL)
          rows never render the button and no replacement CTA per §3b ruling. */}
      {status === "complete" && assessment?.user_id && (
<>
<PDFDownloadButton
          toolType="li_assessment"
          assessmentId={assessment.id}
          pdfUrl={assessment.pdf_url}
          onGenerated={(url) => setAssessment({ ...assessment, pdf_url: url })}
        />
<WordConversionPromptButton documentType="li_assessment" />
</>
)}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet><title>Legitimate Interest Assessment Tool | End User Privacy</title></Helmet>
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
          title="Legitimate Interest Assessment"
          meta={metaParts.length ? metaParts.join(" · ") : undefined}
          actions={status === "complete" || status === "failed" ? actions : undefined}
          topDisclaimer={report.framework_disclaimer ?? report.disclaimer}
        >
          {(() => {
            const infoNeeded = (report as any)?.information_needed;
            return meter ? (
              <>
                <RunMeterBar
                  meter={meter}
                  refineHref={`/li-assessment?refine=${id}`}
                  onExtend={() => startMeterExtension("li_assessment", id!)}
                  infoNeededCount={Array.isArray(infoNeeded) ? infoNeeded.length : 0}
                />
                <InformationNeededBlock items={infoNeeded} />
              </>
            ) : null;
          })()}

          <div dir={dir} style={{ display: "contents" }}>
          {loading && <p>Loading…</p>}

          {(phase === "stalled" || phase === "stalled_pre_dispatch") && (
            <GenerationStalledCard variant={phase} retryHref="/li-assessment" onRefresh={refresh} />
          )}

          {!loading && (phase === "running" || phase === "slow") && (
            <ProcessingInterstitial
              tool="lia"
              startedAt={assessment?.updated_at ?? assessment?.created_at}
              slow={phase === "slow"}
            />
          )}

          {(status === "failed" || status === "error") && (
            <div className="bg-card border rounded-lg p-6">
              <p className="font-medium text-red-700 mb-3">Assessment could not be completed. Please try again.</p>
              <Button asChild><Link to="/li-assessment">Try Again</Link></Button>
            </div>
          )}

          {status === "refunded" && (
            <div className="bg-card border rounded-lg p-6">
              <p className="font-medium mb-2">We couldn't generate this assessment and have refunded your payment.</p>
              <p className="text-sm text-muted-foreground mb-4">The refund will appear on your statement within 5–10 business days. You can start a fresh assessment whenever you're ready.</p>
              <Button asChild><Link to="/li-assessment">Start a new assessment</Link></Button>
            </div>
          )}

          {status === "failed_resolved" && (
            <div className="bg-card border rounded-lg p-6">
              <p className="font-medium mb-2">We couldn't generate this assessment.</p>
              <p className="text-sm text-muted-foreground mb-4">As a subscriber make-good, a free service credit has been added to your account. Use it on any Smart Tool.</p>
              <Button asChild><Link to="/li-assessment">Start a new assessment</Link></Button>
            </div>
          )}

          {status === "complete" && (
            <div className="space-y-6 font-serif-text">
              {/* Summary */}
              <section className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-6">
                <h2 className="font-body text-display-card font-semibold mb-3">Assessment Summary</h2>
                {/* Context paragraph — what is being assessed */}
                {(assessment?.organization_name || assessment?.processing_description) && (
                  <p className="text-sm text-foreground mb-3">
                    {assessment?.organization_name ? (
                      <>This legitimate interest assessment evaluates processing carried out by <span className="font-semibold">{assessment.organization_name}</span>.{" "}</>
                    ) : (
                      <>This legitimate interest assessment evaluates the following processing.{" "}</>
                    )}
                    {assessment?.processing_description && (
                      <><span className="italic">{assessment.processing_description}</span>{" "}</>
                    )}
                    {Array.isArray(assessment.data_categories) && assessment.data_categories.length > 0 && (
                      <>Data involved includes {assessment.data_categories.join(", ")}.{" "}</>
                    )}
                    {assessment.relationship_type && (
                      <>The relationship with data subjects is described as {assessment.relationship_type.toLowerCase()}.{" "}</>
                    )}
                    {assessment.sector && <>Sector: {assessment.sector}.{" "}</>}
                    {Array.isArray(assessment.jurisdictions) && assessment.jurisdictions.length > 0 && (
                      <>Jurisdictions in scope: {assessment.jurisdictions.join(", ")}.{" "}</>
                    )}
                    {assessment.stated_purpose && (
                      <>Stated purpose to data subjects: "{assessment.stated_purpose}".</>
                    )}
                  </p>
                )}
                {overall?.argument_strength && (
                  <div className="mb-3">
                    <span className={`inline-block px-3 py-1.5 rounded font-medium ${strengthColor(overall.argument_strength)}`}>
                      {overall.argument_strength}
                    </span>
                  </div>
                )}
                {overall?.strength_basis && <p className="text-sm text-foreground">{overall.strength_basis}</p>}
                {report?.generated_at && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Precedent database last updated: {new Date(report.generated_at).toLocaleDateString(undefined, { year: "numeric", month: "long" })}
                  </p>
                )}
              </section>

              {/* Three-Part Test */}
              {(() => {
                const js = Array.isArray(assessment?.jurisdictions) ? assessment.jurisdictions : [];
                const isUk = js.some((j: string) => /united kingdom|uk|gb/i.test(String(j)));
                const precs = report?.enforcement_precedents;
                return (
                  <section className="grid md:grid-cols-3 gap-4">
                    <TestCard title="Purpose Test" test={report?.three_part_test?.purpose_test} annotations={report?.annotations} precedents={precs} isUk={isUk} />
                    <TestCard title="Necessity Test" test={report?.three_part_test?.necessity_test} annotations={report?.annotations} precedents={precs} isUk={isUk} />
                    <TestCard title="Balancing Test" test={report?.three_part_test?.balancing_test} annotations={report?.annotations} precedents={precs} isUk={isUk} />
                  </section>
                );
              })()}

              {/* Blocking Issues Alert */}
              {Array.isArray(overall?.blocking_issues) && overall.blocking_issues.length > 0 && (
                <section className="border-l-4 border-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg p-5">
                  <h3 className="font-body text-display-card font-semibold text-red-800 dark:text-red-300 mb-3">
                    <Ban aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Blocking Issues — Resolve Before Relying on Legitimate Interest
                  </h3>
                  <ul className="space-y-2">
                    {overall.blocking_issues.map((issue: string, i: number) => (
                      <li key={i} className="text-sm text-red-900 dark:text-red-200 flex gap-2">
                        <span className="font-mono">•</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-3">
                    These issues must be resolved before you can lawfully rely on legitimate interest as a processing basis; additional information is required before proceeding.
                  </p>
                </section>
              )}

              {/* Precedent Landscape */}
              <section className="bg-card border rounded-lg p-6">
                <h2 className="font-body text-display-card font-semibold mb-4">Most Analogous Regulatory Decisions</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded">
                    <h3 className="font-body text-display-card font-semibold text-green-700 mb-2">Accepted Cases</h3>
                    <p className="text-sm">{overall?.closest_accepted_precedent || "No closely analogous accepted precedents found in tracked database"}</p>
                  </div>
                  <div className="p-4 border rounded">
                    <h3 className="font-body text-display-card font-semibold text-red-700 mb-2">Rejected Cases</h3>
                    <p className="text-sm">{overall?.closest_rejected_precedent || "No closely analogous rejected precedents found in tracked database"}</p>
                  </div>
                </div>
                {Array.isArray(overall?.key_distinguishing_factors) && overall.key_distinguishing_factors.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-1">Key distinguishing factors</p>
                    <ul className="list-disc pl-5 text-sm space-y-1">{overall.key_distinguishing_factors.map((f: string, i: number) => <li key={i}>{f}</li>)}</ul>
                  </div>
                )}
                {report?.data_currency_note && <p className="text-xs text-muted-foreground mt-3 italic">{report.data_currency_note}</p>}
              </section>

              {/* Enforcement precedents from get-enforcement-context */}
              <EnforcementPrecedents
                precedents={report?.enforcement_precedents}
                context="Recent regulator decisions matched to your processing activity, data categories, and jurisdictions."
              />

              {/* Documentation */}
              {(Array.isArray(docs?.recommended_documentation) || Array.isArray(docs?.balancing_record_elements)) && (
                <section className="bg-card border rounded-lg p-6">
                  <h2 className="font-body text-display-card font-semibold mb-4">Recommended Documentation for Your LIA Record</h2>
                  {Array.isArray(docs?.recommended_documentation) && docs.recommended_documentation.map((d: any, i: number) => (
                    <div key={i} className="mb-4 pb-4 border-b last:border-b-0">
                      <p className="font-medium">{d.document_name || d.name || d.document}</p>
                      {d.purpose && <p className="text-sm text-muted-foreground mt-1">{d.purpose}</p>}
                      {Array.isArray(d.key_elements) && (
                        <ul className="list-disc pl-5 text-sm mt-2 space-y-1">{d.key_elements.map((e: string, j: number) => <li key={j}>{e}</li>)}</ul>
                      )}
                      {d.basis && <p className="text-xs text-muted-foreground mt-2">Basis: {d.basis}</p>}
                    </div>
                  ))}
                  {Array.isArray(docs?.balancing_record_elements) && docs.balancing_record_elements.length > 0 && (
                    <>
                      <h3 className="font-body text-display-card font-semibold mt-4 mb-2">Balancing Record — Must Include</h3>
                      <ol className="list-decimal pl-5 text-sm space-y-1">{docs.balancing_record_elements.map((e: string, i: number) => <li key={i}>{e}</li>)}</ol>
                    </>
                  )}
                  {docs?.opt_out_mechanism?.required && (
                    <div className="mt-4 p-4 bg-amber-50 border-l-4 border-amber-500 text-sm rounded">
                      <p className="font-medium">Opt-Out Mechanism Required: {docs.opt_out_mechanism.basis}</p>
                      {docs.opt_out_mechanism.recommended_approach && (
                        <p className="mt-1">Recommended approach: {docs.opt_out_mechanism.recommended_approach}</p>
                      )}
                    </div>
                  )}
                  {Array.isArray(docs?.review_triggers) && (
                    <div className="mt-4">
                      <p className="text-sm font-medium">Circumstances requiring this LIA to be revisited</p>
                      <ul className="list-disc pl-5 text-sm mt-1 space-y-1">{docs.review_triggers.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>
                    </div>
                  )}
                </section>
              )}

              {/* DPIA CTA */}
              <section className="bg-card border rounded-lg p-6">
                <h3 className="font-body text-display-card font-semibold mb-2">Does this processing require a DPIA?</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  If your assessment identifies high-risk processing, you may be required to conduct a Data Protection Impact Assessment under GDPR Article 35.
                </p>
                <Button asChild><Link to="/dpia-framework">Open Impact Assessment Builder →</Link></Button>
              </section>
            </div>
          )}
          </div>
        </ReportShell>
      </main>

      <Footer />
    </div>
  );
};


export default LIAssessmentResult;
