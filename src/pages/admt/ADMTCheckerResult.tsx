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
          <p className="text-muted-foreground text-sm">Generating your ADMT gap analysis…</p>
          <p className="text-muted-foreground text-xs">This takes about 30 seconds.</p>
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
          <section className="space-y-3">
            <h3 className="font-serif text-lg">Scope Analysis</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                ["Qualifies as ADMT (§ 7001(e))", report.scope_analysis.is_admt],
                ["Triggers significant decision obligations (§ 7200)", report.scope_analysis.triggers_significant_decision],
                ["Triggers risk assessment requirement (§§ 7150–7157)", report.scope_analysis.triggers_risk_assessment],
                ["Triggers profiling assessment (§ 7150(b))", report.scope_analysis.triggers_profiling],
              ].map(([label, val]) => (
                <div key={String(label)} className="flex items-center gap-2 rounded-md border p-3 bg-card">
                  {val ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                  <div>
                    <p className="text-[12px] font-medium">{String(label)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {val ? "Yes — obligations apply" : "No — not triggered"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed">{report.scope_analysis.summary}</p>
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

        {report.risk_assessment_note && (
          <div className="rounded-lg border bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Risk Assessment Note
            </p>
            <p className="text-[13px] leading-relaxed">{report.risk_assessment_note}</p>
            <Link
              to="/cppa-risk-assessment"
              className="text-[12px] text-[hsl(var(--cobalt))] hover:underline mt-2 inline-block"
            >
              Open CPPA Risk Assessment →
            </Link>
          </div>
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
