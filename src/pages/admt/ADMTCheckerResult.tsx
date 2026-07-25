// src/pages/admt/ADMTCheckerResult.tsx
// ADMT Compliance Assessment result page — shows gap analysis with per-element
// status badges, citation links, and remediation steps.

import { useEffect, useRef, useState } from "react";
import { useLocation, useParams, useSearchParams, Link, Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import { Helmet } from "react-helmet-async";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ReportShell from "@/components/ReportShell";
import RunMeterBar from "@/components/RunMeterBar";
import InformationNeededBlock from "@/components/InformationNeededBlock";

import { useRunMeter } from "@/hooks/useRunMeter";
import { startMeterExtension } from "@/lib/meterExtension";
import PDFDownloadButton from "@/components/PDFDownloadButton";
import WordConversionPromptButton from "@/components/WordConversionPromptButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle, AlertTriangle, XCircle, Clock, Copy, Check, CheckCircle2 } from 'lucide-react';
import { useToolCompletedOnce } from "@/hooks/useToolCompletedOnce";
import { readAdmtScope } from "@/lib/admt/scope";

const OFFICIAL_REG_URL =
  "https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf";

function SampleLanguageBlock({ text, usageNote }: { text: string; usageNote?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-md border border-[hsl(var(--cobalt)/0.25)] bg-[hsl(var(--cobalt)/0.04)] px-3 py-3 space-y-2 mt-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--cobalt))]">
          Sample Language
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-[hsl(var(--cobalt))] hover:opacity-70 transition-opacity"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="text-[12px] leading-relaxed whitespace-pre-wrap font-mono text-foreground/85 border-l-2 border-[hsl(var(--cobalt)/0.3)] pl-3">
        {text}
      </p>
      {usageNote && (
        <p className="text-[11px] text-muted-foreground italic">
          ↳ {usageNote}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "compliant")
    return (
      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-0 text-[11px]">
        <CheckCircle className="w-3 h-3 mr-1" />
        Compliant
      </Badge>
    );
  if (status === "gap")
    return (
      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-0 text-[11px]">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Gap
      </Badge>
    );
  return (
    <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-0 text-[11px]">
      <XCircle className="w-3 h-3 mr-1" />
      Missing
    </Badge>
  );
}

// QB-P25 A3 — enum chip for enforcement_exposure. FULL-mode entries carry
// one of three tokens; the dollar detail lives in enforcement_context.
function ExposureChip({ value }: { value: string }) {
  const label =
    value === "per_consumer_scalable" ? "Scales per California consumer" :
    value === "per_violation" ? "Per-violation exposure" :
    "Not applicable";
  const cls =
    value === "per_consumer_scalable" ? "bg-red-100 text-red-800 border-red-200" :
    value === "per_violation" ? "bg-amber-100 text-amber-800 border-amber-200" :
    "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wide rounded-full border px-2 py-0.5 ${cls}`}>
      {label}
    </span>
  );
}

function GapTable({
  items,
  title,
  showNoGapsMessage,
  compact,
}: {
  items: any[];
  title: string;
  showNoGapsMessage?: boolean;
  compact?: boolean;
}) {
  if (!items || items.length === 0) {
    if (showNoGapsMessage) {
      return (
        <section className="space-y-2">
          <h3 className="font-body text-display-card font-semibold">{title}</h3>
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
            No gaps identified in assessed elements.
          </p>
        </section>
      );
    }
    return null;
  }

  // QB-P25 A3 — COMPACT mode: entries carry only element / duty_if_in_scope / citation.
  if (compact) {
    return (
      <section className="space-y-3">
        <h3 className="font-body text-display-card font-semibold">{title}</h3>
        <div className="rounded-lg border bg-card divide-y">
          {items.map((item, i) => (
            <div key={i} className="px-4 py-3 space-y-1">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <p className="text-[13px] font-medium">{item.element}</p>
                {item.citation && (
                  <a
                    href={OFFICIAL_REG_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[11px] text-[hsl(var(--cobalt))] hover:underline shrink-0"
                  >
                    {item.citation}
                  </a>
                )}
              </div>
              {item.duty_if_in_scope && (
                <p className="text-[12px] leading-relaxed text-foreground/80">{item.duty_if_in_scope}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }

  const gaps = items.filter((i) => i.status !== "compliant");
  const ok = items.filter((i) => i.status === "compliant");
  return (
    <section className="space-y-3">
      <h3 className="font-body text-display-card font-semibold">{title}</h3>
      {gaps.length > 0 && (
        <div className="space-y-3">
          {gaps.map((item, i) => (
            <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-medium text-[13px]">{item.element}</p>
                  <a
                    href={OFFICIAL_REG_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[11px] text-[hsl(var(--cobalt))] hover:underline"
                  >
                    {item.citation}
                  </a>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.enforcement_exposure && item.enforcement_exposure !== "na" && item.status !== "compliant" && (
                    <ExposureChip value={item.enforcement_exposure} />
                  )}
                  <StatusBadge status={item.status} />
                </div>
              </div>
              <p className="text-[13px] text-foreground/80">{item.finding}</p>
              {item.remediation && (
                <div className="rounded-md bg-muted/40 px-3 py-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                    Remediation
                  </p>
                  <p className="text-[12px] leading-relaxed">{item.remediation}</p>
                </div>
              )}
              {item.sample_language && (
                <SampleLanguageBlock
                  text={item.sample_language}
                  usageNote={item.usage_note}
                />
              )}
            </div>
          ))}
        </div>
      )}
      {ok.length > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10 p-3">
          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1 uppercase tracking-wide">
            Compliant elements
          </p>
          <ul className="space-y-1">
            {ok.map((item, i) => (
              <li key={i} className="text-[12px] flex items-start gap-1.5">
                <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  {item.element} —{" "}
                  <span className="font-mono text-muted-foreground">{item.citation}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default function ADMTCheckerResult() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const purchased = searchParams.get("purchased") === "true";
  const { user, loading: authLoading } = useAuth();
  const [assessment, setAssessment] = useState<any>(null);
  const [polling, setPolling] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const triggeredRef = useRef(false);
  useToolCompletedOnce("cppa_admt", assessment?.status === "complete");

  useEffect(() => {
    if (!id || authLoading) return;
    if (!user) {
      setPolling(false);
      return;
    }
    let attempts = 0;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      const { data, error } = await supabase
        .from("cppa_assessments")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) {
        setAssessment(null);
        setNotFound(true);
        setPolling(false);
        return;
      }

      // Kick off generation if the row is still pending and we haven't already.
      if (data?.status === "pending" && !triggeredRef.current) {
        triggeredRef.current = true;
        void supabase.functions.invoke("run-admt-checker", {
          body: { assessment_id: id },
        });
      }

      if (data?.status === "complete" || data?.status === "error" || attempts > 60) {
        setAssessment(data);
        setPolling(false);
      } else {
        attempts++;
        setTimeout(poll, 3000);
      }
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [id, user, authLoading]);

  if (!authLoading && !user) {
    const from = location.pathname + location.search;
    return <Navigate to={`/login?redirect=${encodeURIComponent(from)}`} replace />;
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col bg-brand-cloud">
        <Navbar />
        <DashboardSubnav />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-foreground mb-2 font-medium">Assessment not available.</p>
          <p className="text-muted-foreground text-sm mb-4">
            Sign in with the account that created this ADMT assessment, then reopen the result link.
          </p>
          <Link to="/cppa-admt-checker">
            <Button variant="outline">Back to ADMT Checker</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  if (polling || !assessment) {
    return (
      <div className="min-h-screen flex flex-col bg-brand-cloud">
      <Navbar />
      <DashboardSubnav />
        <main id="main-content" aria-label="ADMT Compliance Assessment generating" className="flex flex-col items-center justify-center py-24 gap-4" role="status" aria-live="polite">
          <Clock className="w-8 h-8 text-muted-foreground animate-spin" aria-hidden="true" />
          <p className="text-muted-foreground text-sm">Generating your ADMT Compliance Assessment…</p>
          <p className="text-muted-foreground text-xs">This typically takes 60–90 seconds. Two analysis passes run in sequence.</p>
        </main>
      <Footer />
    </div>
    );
  }

  const rawReport = assessment.report_data as any;
  // POST-C1-FIX-1C: hydrate canonical scope_analysis from the shared contract so
  // historical reports carrying top-level scope fields still render correctly.
  const report = rawReport && typeof rawReport === "object"
    ? { ...rawReport, scope_analysis: { ...(rawReport.scope_analysis ?? {}), ...readAdmtScope(rawReport) } }
    : rawReport;

  if (assessment.status === "error" || !report) {
    return (
      <div className="min-h-screen flex flex-col bg-brand-cloud">
      <Navbar />
      <DashboardSubnav />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-destructive mb-4">Generation failed. Please contact support.</p>
          <Link to="/cppa-admt-checker">
            <Button variant="outline">Try again</Button>
          </Link>
        </div>
      <Footer />
    </div>
    );
  }

  const overallColor =
    report.overall_status === "compliant"
      ? "text-emerald-700"
      : report.overall_status === "gaps_identified"
      ? "text-amber-700"
      : "text-red-700";

  const orgName =
    (assessment?.intake_data as any)?.company_name ||
    (assessment?.intake_data as any)?.org_name ||
    (assessment?.intake_data as any)?.organizationName ||
    null;

  const totalGaps =
    (report.notice_gaps ?? []).filter((i: any) => i.status !== "compliant").length +
    (report.opt_out_gaps ?? []).filter((i: any) => i.status !== "compliant").length +
    (report.access_gaps ?? []).filter((i: any) => i.status !== "compliant").length;

  return (
    <div className="min-h-screen flex flex-col bg-brand-cloud">
      <Navbar />
      <DashboardSubnav />
      <Helmet>
        <title>ADMT Compliance Assessment — {report.system_name} | End User Privacy</title>
      </Helmet>
      <main id="main-content" aria-label="ADMT Compliance Assessment">
      <ReportShell
        title={`ADMT Compliance Assessment — ${report.system_name}`}
        meta={`Generated ${new Date(assessment.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} · Compliance deadline: ${report.compliance_deadline}`}
        topDisclaimer={report.framework_disclaimer ?? report.disclaimer}
        toolCategory="assessment"
        disclaimerAddition="This gap analysis is an analytical aid, not legal advice. Review with qualified California privacy counsel before relying on it for regulatory compliance decisions."
        actions={
          assessment.status === "complete" ? (
            <>
              <PDFDownloadButton
                toolType="cppa_admt"
                assessmentId={id!}
                pdfUrl={assessment.pdf_url}
                onGenerated={(url) => setAssessment({ ...assessment, pdf_url: url })}
              />
              <WordConversionPromptButton documentType="cppa_admt" />
            </>
          ) : undefined
        }

      >
        {(() => {
          const { meter } = useRunMeter("cppa_admt", id);
          const infoNeeded = (report as any)?.information_needed;
          return meter ? (
            <>
              <RunMeterBar
                meter={meter}
                refineHref={`/cppa-admt-checker?refine=${id}`}
                onExtend={() => startMeterExtension("cppa_admt", id!)}
                infoNeededCount={Array.isArray(infoNeeded) ? infoNeeded.length : 0}
              />
              <InformationNeededBlock items={infoNeeded} />
            </>
          ) : null;
        })()}

        {purchased && (
          <div className="p-3 border-l-4 border-green-500 bg-green-50 dark:bg-green-950/20 rounded text-sm mb-2">
            <CheckCircle2 aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Purchase confirmed.
          </div>
        )}


        <div className="font-serif-text rounded-lg border p-5 bg-card">
          {orgName && (
            <div className="text-sm text-muted-foreground mb-2">
              Prepared for: <span className="font-medium text-foreground">{orgName}</span>
            </div>
          )}
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Overall Status
          </p>
          <p className={`text-2xl font-serif ${overallColor}`}>
            {report.overall_status === "compliant"
              ? "No gaps identified"
              : report.overall_status === "gaps_identified"
              ? "Gaps identified — action required"
              : "Significant gaps — urgent action required"}
          </p>
        </div>

        {report.scope_analysis && (
          <section className="font-serif-text space-y-4">
            <h3 className="font-body text-display-card font-semibold">Scope Analysis</h3>

            {/* Exception qualification — most consequential finding */}
            {report.scope_analysis.exception_reasoning && report.scope_analysis.exception_claimed && report.scope_analysis.exception_claimed !== "none" && (
              <div className={`rounded-lg border p-4 space-y-2 ${
                report.scope_analysis.exception_qualifies === true
                  ? "border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10"
                  : report.scope_analysis.exception_qualifies === false
                  ? "border-red-200 bg-red-50/30 dark:bg-red-950/10"
                  : "border-amber-200 bg-amber-50/30 dark:bg-amber-950/10"
              }`}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="text-[12px] font-semibold">Exception claimed: {report.scope_analysis.exception_claimed}</p>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded shrink-0 ${
                    report.scope_analysis.exception_qualifies === true
                      ? "bg-emerald-100 text-emerald-800"
                      : report.scope_analysis.exception_qualifies === false
                      ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {report.scope_analysis.exception_qualifies === true
                      ? "Qualifies on facts provided"
                      : report.scope_analysis.exception_qualifies === false
                      ? "Does not qualify — opt-out required"
                      : "Cannot determine — legal review required"}
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed">{report.scope_analysis.exception_reasoning}</p>
              </div>
            )}

            {/* Scope trigger tiles with reasoning */}
            <div className="space-y-2">
              {[
                {
                  label: "Qualifies as ADMT",
                  citation: "11 CCR § 7001(e)",
                  val: report.scope_analysis.is_admt,
                  reasoning: report.scope_analysis.is_admt_reasoning,
                  obligationIfTrue: "Pre-use notice, opt-out, and access right obligations apply",
                },
                {
                  label: "Triggers significant decision obligations",
                  citation: "11 CCR § 7001(ddd) / § 7200(a)",
                  val: report.scope_analysis.triggers_significant_decision,
                  reasoning: report.scope_analysis.significant_decision_reasoning,
                  obligationIfTrue: "Full ADMT compliance required by January 1, 2027",
                },
                {
                  label: "Human review satisfies § 7001(e)(1)(A)-(C) — system may not be ADMT",
                  citation: "11 CCR § 7001(e)(1)",
                  val: report.scope_analysis.human_review_qualifies,
                  reasoning: report.scope_analysis.human_review_reasoning,
                  invert: true,
                  obligationIfTrue: "If all three elements satisfied, system may fall outside ADMT definition",
                },
                {
                  label: "Triggers risk assessment requirement",
                  citation: "11 CCR §§ 7150–7157",
                  val: report.scope_analysis.triggers_risk_assessment,
                  reasoning: report.scope_analysis.risk_assessment_reasoning,
                  obligationIfTrue: "Separate risk assessment required — see Risk Assessment section below",
                },
                {
                  label: "Triggers profiling assessment",
                  citation: "11 CCR § 7150(b)",
                  val: report.scope_analysis.triggers_profiling,
                  reasoning: null,
                  obligationIfTrue: "Profiling risk assessment required",
                },
              ].map(({ label, citation, val, reasoning, invert, obligationIfTrue }) => (
                <details key={label} className="rounded-md border bg-card group">
                  <summary className="flex items-center gap-2 p-3 cursor-pointer list-none select-none">
                    {(invert ? !val : val) ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium">{label}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{citation}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[11px] font-semibold ${(invert ? !val : val) ? "text-amber-600" : "text-emerald-600"}`}>
                        {val ? "Yes" : "No"}
                      </span>
                      <p className="text-[10px] text-muted-foreground">click for reasoning</p>
                    </div>
                  </summary>
                  <div className="border-t px-3 pb-3 pt-2 space-y-1">
                    {reasoning ? (
                      <p className="text-[12px] leading-relaxed text-foreground/80">{reasoning}</p>
                    ) : (
                      <p className="text-[12px] text-muted-foreground italic">No detailed reasoning provided.</p>
                    )}
                    {val && obligationIfTrue && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1"><AlertTriangle aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> {obligationIfTrue}</p>
                    )}
                  </div>
                </details>
              ))}
            </div>

            {report.scope_analysis.third_party_responsibility_note && (
              <div className="rounded-md border-l-4 border-amber-400 bg-amber-50/30 dark:bg-amber-950/10 px-4 py-3">
                <p className="text-[12px] font-semibold mb-1">Third-Party ADMT Tools</p>
                <p className="text-[12px] leading-relaxed">{report.scope_analysis.third_party_responsibility_note}</p>
              </div>
            )}

            <p className="text-[13px] text-muted-foreground leading-relaxed">{report.scope_analysis.summary}</p>
          </section>
        )}

        {report.consolidated_notice_analysis && (
          <section className="font-serif-text space-y-3">
            <h3 className="font-body text-display-card font-semibold">Consolidated Notice Eligibility</h3>
            <div className={`rounded-lg border p-4 space-y-3 ${
              report.consolidated_notice_analysis.applicable
                ? "border-[hsl(var(--cobalt)/0.3)] bg-[hsl(var(--cobalt)/0.04)]"
                : "bg-card"
            }`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                  report.consolidated_notice_analysis.applicable
                    ? "bg-[hsl(var(--cobalt)/0.15)] text-[hsl(var(--cobalt))]"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {report.consolidated_notice_analysis.applicable
                    ? "Consolidation eligible — § 7220(e)"
                    : "Not applicable to this deployment"}
                </span>
              </div>

              {report.consolidated_notice_analysis.basis && (
                <p className="text-[12px] leading-relaxed">
                  <strong>Basis:</strong> {report.consolidated_notice_analysis.basis}
                </p>
              )}

              {report.consolidated_notice_analysis.applicable && (
                <>
                  {report.consolidated_notice_analysis.consolidation_benefit && (
                    <div className="rounded-md bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200 px-3 py-2">
                      <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide mb-0.5">Benefit</p>
                      <p className="text-[12px] leading-relaxed">{report.consolidated_notice_analysis.consolidation_benefit}</p>
                    </div>
                  )}
                  {report.consolidated_notice_analysis.conditions_to_consolidate && (
                    <div className="rounded-md bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 px-3 py-2">
                      <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-0.5">Required conditions</p>
                      <p className="text-[12px] leading-relaxed">{report.consolidated_notice_analysis.conditions_to_consolidate}</p>
                    </div>
                  )}
                  {report.consolidated_notice_analysis.consolidation_risk && (
                    <div className="rounded-md bg-red-50/30 dark:bg-red-950/10 border border-red-100 px-3 py-2">
                      <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wide mb-0.5">Compliance trap</p>
                      <p className="text-[12px] leading-relaxed">{report.consolidated_notice_analysis.consolidation_risk}</p>
                    </div>
                  )}
                </>
              )}

              {report.consolidated_notice_analysis.recommendation && (
                <p className="text-[12px] text-muted-foreground italic border-l-2 border-muted-foreground/30 pl-3">
                  {report.consolidated_notice_analysis.recommendation}
                </p>
              )}
            </div>
          </section>
        )}

        {report.enforcement_context && (
          <section className="font-serif-text space-y-3">
            <h3 className="font-body text-display-card font-semibold">Enforcement Exposure</h3>
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-md bg-muted/40 p-3">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Per violation — unintentional</p>
                  <p className="text-[22px] font-serif font-semibold">
                    ${(report.enforcement_context.penalty_per_violation_unintentional ?? 2663).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono">{report.enforcement_context.penalty_statutory_basis}</p>
                </div>
                <div className="rounded-md bg-red-50/50 dark:bg-red-950/10 border border-red-100 p-3">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Per violation — intentional</p>
                  <p className="text-[22px] font-serif font-semibold text-red-700">
                    ${(report.enforcement_context.penalty_per_violation_intentional ?? 7988).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono">{report.enforcement_context.penalty_statutory_basis}</p>
                </div>
              </div>
              {report.enforcement_context.aggregate_exposure_note && (
                <p className="text-[12px] leading-relaxed text-foreground/80 border-l-2 border-muted-foreground/30 pl-3">
                  {report.enforcement_context.aggregate_exposure_note}
                </p>
              )}
            </div>
          </section>
        )}

        {Array.isArray(report.top_3_actions) && report.top_3_actions.length > 0 && (
          <section className="font-serif-text space-y-2">
            <h3 className="font-body text-display-card font-semibold">Top 3 Actions</h3>
            <div className="rounded-lg border border-brand-teal/30 bg-brand-teal/5 divide-y divide-brand-teal/20">
              {report.top_3_actions.map((entry: any, i: number) => {
                const action = typeof entry?.action === "string" ? entry.action : "";
                const citation = typeof entry?.citation === "string" ? entry.citation : "";
                const deadline = typeof entry?.deadline === "string" ? entry.deadline : "";
                // LEAK-PREV-P0: prefer the additive structured flag over the
                // literal-text match. The string check is retained ONLY as a
                // legacy fallback for reports generated before the flag existed.
                const insufficient =
                  entry?.insufficient_basis === true ||
                  action === "insufficient basis to state a top action"; // legacy
                return (
                  <div key={i} className="flex gap-3 px-4 py-3">
                    <span className="text-[11px] font-bold text-brand-teal shrink-0 mt-0.5">{entry?.rank ?? i + 1}</span>
                    <div className="flex-1 space-y-1">
                      <p className={`text-[13px] leading-relaxed ${insufficient ? "italic text-muted-foreground" : ""}`}>{action}</p>
                      {(citation || deadline) && (
                        <p className="text-[11px] font-mono text-muted-foreground">
                          {citation && <span>{citation}</span>}
                          {citation && deadline && <span> · </span>}
                          {deadline && <span>Deadline: {deadline}</span>}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {report.priority_actions?.length > 0 && (
          <section className="font-serif-text space-y-2">
            <h3 className="font-body text-display-card font-semibold">Priority Actions</h3>
            <div className="rounded-lg border border-red-200 bg-red-50/30 dark:bg-red-950/10 divide-y divide-red-100">
              {report.priority_actions.map((action: string, i: number) => (
                <div key={i} className="flex gap-3 px-4 py-3">
                  <span className="text-[11px] font-bold text-red-600 shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-[13px] leading-relaxed">{action}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {(() => {
          const conservative = report.scope_analysis?.determination_basis === "conservative_assumption";
          return (
            <>
              {conservative && (
                <section className="space-y-2">
                  <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50/40 dark:bg-amber-950/10 px-4 py-3">
                    <p className="text-[12px] font-semibold text-amber-900 dark:text-amber-200 mb-1">
                      Obligations if the scope determination is confirmed
                    </p>
                    <p className="text-[12px] leading-relaxed text-foreground/80">
                      The intake does not affirmatively place this system inside an enumerated § 7001(ddd) category, so the § 7220–§ 7222 duties below are stated as prospective obligations that attach only after the business confirms the significant-decision category. Per-element findings, remediations, and drafted sample language are withheld until that confirmation.
                    </p>
                  </div>
                </section>
              )}
              <GapTable
                items={report.notice_gaps ?? []}
                title="Pre-Use Notice (§ 7220)"
                showNoGapsMessage={report.scope_analysis?.triggers_significant_decision === true && !conservative}
                compact={conservative}
              />
              <GapTable
                items={report.opt_out_gaps ?? []}
                title="Opt-Out Rights (§ 7221)"
                showNoGapsMessage={report.scope_analysis?.triggers_significant_decision === true && !conservative}
                compact={conservative}
              />
              <GapTable
                items={report.access_gaps ?? []}
                title="Access Rights (§ 7222)"
                showNoGapsMessage={report.scope_analysis?.triggers_significant_decision === true && !conservative}
                compact={conservative}
              />
            </>
          );
        })()}

        {report.risk_assessment_obligation?.required && (
          <section className="font-serif-text space-y-3">
            <h3 className="font-body text-display-card font-semibold">Risk Assessment Obligation</h3>
            <div className="rounded-lg border border-amber-200 bg-amber-50/20 dark:bg-amber-950/10 p-5 space-y-4">
              <p className="text-[13px] leading-relaxed font-medium">
                {report.risk_assessment_obligation.summary}
              </p>
              <div className="grid sm:grid-cols-3 gap-3 text-[12px]">
                {[
                  ["Existing activities", report.risk_assessment_obligation.compliance_deadline_existing_activities],
                  ["New activities", report.risk_assessment_obligation.compliance_deadline_new_activities],
                  ["Submission requirement", report.risk_assessment_obligation.submission_requirement],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={String(label)} className="rounded-md bg-white/60 dark:bg-white/5 border p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{String(label)}</p>
                    <p className="text-[12px] leading-snug">{String(value)}</p>
                  </div>
                ))}
              </div>
              {Array.isArray(report.risk_assessment_obligation.triggers_identified) && report.risk_assessment_obligation.triggers_identified.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Triggers that apply to this system</p>
                  <ul className="space-y-1">
                    {report.risk_assessment_obligation.triggers_identified.map((t: string, i: number) => (
                      <li key={i} className="text-[12px] flex gap-2">
                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Link
                to="/cppa-risk-assessment"
                className="inline-flex items-center gap-1 text-[12px] text-[hsl(var(--cobalt))] hover:underline font-medium"
              >
                Open CPPA Privacy Risk Assessment →
              </Link>
            </div>
          </section>
        )}

        {Array.isArray(report.documentation_to_maintain) && report.documentation_to_maintain.length > 0 && (
          <section className="font-serif-text space-y-3">
            <h3 className="font-body text-display-card font-semibold">Records to Maintain</h3>
            <p className="text-[12px] text-muted-foreground">
              The CPPA may request these records at any time, independent of annual submission deadlines. Maintain them continuously from the date ADMT processing begins.
            </p>
            <div className="rounded-lg border bg-card divide-y">
              {report.documentation_to_maintain.map((item: any, i: number) => (
                <div key={i} className="px-4 py-3 space-y-1">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <p className="text-[13px] font-medium">{item.document}</p>
                    {item.citation && (
                      <a
                        href={OFFICIAL_REG_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[11px] text-[hsl(var(--cobalt))] hover:underline shrink-0"
                      >
                        {item.citation}
                      </a>
                    )}
                  </div>
                  {item.purpose && (
                    <p className="text-[12px] text-foreground/80">{item.purpose}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {report.aggregate_access_response && (
          <section className="space-y-3">
            <h3 className="font-body text-display-card font-semibold">Aggregate Access Response Option</h3>
            <div className={`rounded-lg border p-4 space-y-3 ${
              report.aggregate_access_response.applicable === true
                ? "border-[hsl(var(--cobalt)/0.3)] bg-[hsl(var(--cobalt)/0.04)]"
                : "bg-card"
            }`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                  report.aggregate_access_response.applicable === true
                    ? "bg-[hsl(var(--cobalt)/0.15)] text-[hsl(var(--cobalt))]"
                    : report.aggregate_access_response.applicable === "cannot_determine"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {report.aggregate_access_response.applicable === true
                    ? "Threshold met — aggregate response available"
                    : report.aggregate_access_response.applicable === "cannot_determine"
                    ? "Threshold unknown — monitor request frequency"
                    : "Below threshold — individualized response required"}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">11 CCR § 7222(j)</span>
              </div>

              {report.aggregate_access_response.threshold && (
                <p className="text-[12px] text-muted-foreground">
                  <strong>Threshold:</strong> {report.aggregate_access_response.threshold}
                </p>
              )}

              {report.aggregate_access_response.explanation && (
                <p className="text-[12px] leading-relaxed">{report.aggregate_access_response.explanation}</p>
              )}

              {report.aggregate_access_response.applicable === true && report.aggregate_access_response.what_aggregate_response_may_include && (
                <div className="rounded-md bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 px-3 py-2">
                  <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-0.5">Scope of aggregate option</p>
                  <p className="text-[12px] leading-relaxed">{report.aggregate_access_response.what_aggregate_response_may_include}</p>
                </div>
              )}

              {report.aggregate_access_response.applicable === true && report.aggregate_access_response.operational_note && (
                <p className="text-[12px] text-muted-foreground italic border-l-2 border-muted-foreground/30 pl-3">
                  {report.aggregate_access_response.operational_note}
                </p>
              )}
            </div>
          </section>
        )}



        <p className="text-xs text-muted-foreground italic">
          All citations refer to the California Privacy Protection Agency's final regulations (11 CCR Article 11). Official text:{" "}
          <a href={OFFICIAL_REG_URL} target="_blank" rel="noreferrer" className="underline">
            CPPA Regulations PDF
          </a>
          .
        </p>
      </ReportShell>
    </main>
    <Footer />
    </div>
  );
}
