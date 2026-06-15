// src/pages/admt/ADMTCheckerResult.tsx
// ADMT Compliance Assessment result page — shows gap analysis with per-element
// status badges, citation links, and remediation steps.

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import { Helmet } from "react-helmet-async";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ReportShell from "@/components/ReportShell";
import PDFDownloadButton from "@/components/PDFDownloadButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle, AlertTriangle, XCircle, Clock, Copy, Check } from "lucide-react";

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

function GapTable({ items, title }: { items: any[]; title: string }) {
  if (!items?.length) return null;
  const gaps = items.filter((i) => i.status !== "compliant");
  const ok = items.filter((i) => i.status === "compliant");
  return (
    <section className="space-y-3">
      <h3 className="font-serif text-lg">{title}</h3>
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
                <StatusBadge status={item.status} />
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
              {item.enforcement_exposure && item.status !== "compliant" && (
                <div className="rounded-md bg-red-50/30 border border-red-100 px-3 py-2">
                  <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wide mb-0.5">
                    Enforcement Exposure
                  </p>
                  <p className="text-[12px] leading-relaxed text-foreground/80">{item.enforcement_exposure}</p>
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
  const purchased = searchParams.get("purchased") === "true";
  const { user } = useAuth();
  const [assessment, setAssessment] = useState<any>(null);
  const [polling, setPolling] = useState(true);
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (!id || !user) return;
    let attempts = 0;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      const { data } = await supabase
        .from("cppa_assessments")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

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
  }, [id, user]);

  if (polling || !assessment) {
    return (
      <div className="min-h-screen flex flex-col bg-brand-cloud">
      <Navbar />
      <DashboardSubnav />
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Clock className="w-8 h-8 text-muted-foreground animate-spin" />
          <p className="text-muted-foreground text-sm">Generating your ADMT Compliance Assessment…</p>
          <p className="text-muted-foreground text-xs">This typically takes 60–90 seconds. Two analysis passes run in sequence.</p>
        </div>
      <Footer />
    </div>
    );
  }

  const report = assessment.report_data as any;

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
      <ReportShell
        title={`ADMT Compliance Assessment — ${report.system_name}`}
        meta={`Generated ${new Date(assessment.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} · Compliance deadline: ${report.compliance_deadline}`}
        toolCategory="assessment"
        disclaimerAddition="This gap analysis is an analytical aid, not legal advice. Review with qualified California privacy counsel before relying on it for regulatory compliance decisions."
        actions={
          assessment.status === "complete" ? (
            <PDFDownloadButton
              toolType="cppa_admt"
              assessmentId={id!}
              pdfUrl={assessment.pdf_url}
              onGenerated={(url) => setAssessment({ ...assessment, pdf_url: url })}
            />
          ) : undefined
        }
      >
        {purchased && (
          <div className="p-3 border-l-4 border-green-500 bg-green-50 dark:bg-green-950/20 rounded text-sm mb-2">
            ✅ Purchase confirmed.
          </div>
        )}


        <div className="rounded-lg border p-5 bg-card">
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
          <section className="space-y-4">
            <h3 className="font-serif text-lg">Scope Analysis</h3>

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
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">⚠ {obligationIfTrue}</p>
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

        {report.enforcement_context && (
          <section className="space-y-3">
            <h3 className="font-serif text-lg">Enforcement Exposure</h3>
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

        {report.priority_actions?.length > 0 && (
          <section className="space-y-2">
            <h3 className="font-serif text-lg">Priority Actions</h3>
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

        <GapTable items={report.notice_gaps ?? []} title="Pre-Use Notice (§ 7220)" />
        <GapTable items={report.opt_out_gaps ?? []} title="Opt-Out Rights (§ 7221)" />
        <GapTable items={report.access_gaps ?? []} title="Access Rights (§ 7222)" />

        {report.risk_assessment_obligation?.required && (
          <section className="space-y-3">
            <h3 className="font-serif text-lg">Risk Assessment Obligation</h3>
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
          <section className="space-y-3">
            <h3 className="font-serif text-lg">Records to Maintain</h3>
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

        <p className="text-xs text-muted-foreground italic">
          All citations refer to the California Privacy Protection Agency's final regulations (11 CCR Article 11). Official text:{" "}
          <a href={OFFICIAL_REG_URL} target="_blank" rel="noreferrer" className="underline">
            CPPA Regulations PDF
          </a>
          .
        </p>
      </ReportShell>
    <Footer />
    </div>
  );
}
