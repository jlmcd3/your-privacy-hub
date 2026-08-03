// View a previously generated Biometric Compliance assessment by ID.

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CopyButton from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ClientContextBadge } from "@/components/clients/ClientContextBadge";
import BackLink from "@/components/dashboard/BackLink";
import { ProcessingInterstitial } from "@/components/ProcessingInterstitial";
import { Loader2 } from "lucide-react";
import AssessmentReport from "@/components/AssessmentReport";
import ReportShell from "@/components/ReportShell";
import RunMeterBar from "@/components/RunMeterBar";
import InformationNeededBlock from "@/components/InformationNeededBlock";

import { useRunMeter } from "@/hooks/useRunMeter";
import { startMeterExtension } from "@/lib/meterExtension";
import PDFDownloadButton from "@/components/PDFDownloadButton";
import WordConversionPromptButton from "@/components/WordConversionPromptButton";

import { AnnotationCallout } from "@/components/AnnotationCallout";
import EnforcementPrecedents from "@/components/EnforcementPrecedents";
import ReportTranslateMenu from "@/components/ReportTranslateMenu";
import { useGenerationStatus } from "@/hooks/useGenerationStatus";
import GenerationStalledCard from "@/components/GenerationStalledCard";
import { useToolCompletedOnce } from "@/hooks/useToolCompletedOnce";

const TERMINAL_STATUSES = new Set(["complete", "error", "failed", "refunded", "failed_resolved"]);

export default function BiometricCheckerResult() {
  const { id } = useParams();
  const { meter } = useRunMeter("biometric_checker", id);
  const [translated, setTranslated] = useState<any | null>(null);
  const [dir, setDir] = useState<"ltr" | "rtl">("ltr");

  const { row, loading, phase, refresh, setRow } = useGenerationStatus<any>({
    table: "biometric_assessments",
    rowId: id,
    isTerminal: (r) => TERMINAL_STATUSES.has(String(r?.status ?? "")),
    isReportReady: (r) => r?.status === "complete" && (!!r?.analysis_text || !!r?.report_data),
  });
  useToolCompletedOnce("biometric_checker", row?.status === "complete" && (!!row?.analysis_text || !!row?.report_data));

  const report = (translated?.report_data ?? row?.report_data) || {};
  const sourceText = (translated?.analysis_text ?? row?.analysis_text) || report?.assessment_text;
  // Remove the repeated transitional sentence that appears between sections in
  // older stress-generated outputs.
  const text = sourceText
    ? sourceText.replace(
        /Biometric identity verification creates elevated regulatory and litigation exposure unless consent, retention, and vendor controls are provable\.\s*/gi,
        ""
      )
    : sourceText;
  // bipa_risk retired 2026-07-14 — field is hard-null at emit; callout removed.

  const orgName = (row?.intake_data as any)?.orgName || (row?.intake_data as any)?.organizationName || null;
  const orgType = (row?.intake_data as any)?.orgType || null;

  const meta = row && (
    <>
      Generated {new Date(row.created_at).toLocaleDateString()}
      {(row.jurisdictions || []).length > 0 && ` · ${(row.jurisdictions || []).join(", ")}`}
    </>
  );

  const actions = row && (
    <>
      <ReportTranslateMenu
        toolType="biometric"
        reportId={row.id}
        onTranslated={(p, d) => { setTranslated(p); setDir(d); }}
      />
      <PDFDownloadButton
        toolType="biometric_checker"
        assessmentId={row.id}
        pdfUrl={row.pdf_url}
        onGenerated={(url) => setRow({ ...row, pdf_url: url })}
      />
      <WordConversionPromptButton documentType="biometric_checker" />
      {text && <CopyButton text={text} />}
    </>
  );

  // BIPA risk callout retired 2026-07-14 — bipa_risk is hard-null at emit; JSX and render site removed.

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Helmet><title>Biometric Compliance Assessment | End User Privacy</title></Helmet>
      <Navbar />
      <main id="main-content" className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <BackLink to="/dashboard/reports" label="Back to My Reports" className="mb-4" />
        <ClientContextBadge />
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-navy" /></div>
        ) : !row ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <p className="text-slate">Assessment not found or you don't have access.</p>
            <Button asChild className="mt-4"><Link to="/dashboard/reports">Back to My Reports</Link></Button>
          </div>
        ) : phase === "stalled" || phase === "stalled_pre_dispatch" ? (
          <GenerationStalledCard variant={phase} retryHref="/biometric-checker" onRefresh={refresh} />
        ) : phase === "running" || phase === "slow" ? (
          <ProcessingInterstitial
            tool="biometric"
            startedAt={row.updated_at ?? row.created_at}
            slow={phase === "slow"}
          />
        ) : (
          <ReportShell
            title="Biometric Compliance Assessment"
            meta={meta}
            actions={actions}
            topDisclaimer={report.framework_disclaimer ?? report.disclaimer}
          >
            {(() => {
              
              const infoNeeded = (report as any)?.information_needed;
              return meter ? (
                <>
                  <RunMeterBar
                    meter={meter}
                    refineHref={`/biometric-checker?refine=${row.id}`}
                    onExtend={() => startMeterExtension("biometric_checker", row.id)}
                    infoNeededCount={Array.isArray(infoNeeded) ? infoNeeded.length : 0}
                  />
                  <InformationNeededBlock items={infoNeeded} />
                </>
              ) : null;
            })()}

            <div dir={dir} style={{ display: "contents" }}>
            {(orgName || orgType) && (
              <div className="mb-6 px-4 py-3 bg-slate-50 border border-border rounded-lg text-sm text-foreground">
                {orgName && (
                  <div><span className="font-medium text-brand-navy">Prepared for:</span> {orgName}</div>
                )}
                {orgType && (
                  <div className="text-muted-foreground mt-0.5">{orgType}</div>
                )}
              </div>
            )}
            <AssessmentReport text={text || ""} sectionChipLabel={null} />
            {/* bipaCallout render site retired 2026-07-14 */}
            <EnforcementPrecedents
              precedents={(row?.report_data as any)?.enforcement_precedents}
              variant="standard"
              attempted={Boolean((row?.report_data as any)?.enforcement_meta?.attempted)}
              totalMatched={(row?.report_data as any)?.enforcement_meta?.total_matched}
              queryDescriptor={(row?.report_data as any)?.enforcement_meta?.query_descriptor}
            />
            {Array.isArray((row?.report_data as any)?.annotations) && (row?.report_data as any).annotations.length > 0 && (
              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold mb-2">Priority Action — Enforcement Basis</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  The following corpus citations inform the priority actions above.
                </p>
                <AnnotationCallout annotations={(row?.report_data as any)?.annotations} />
              </div>
            )}
            </div>
          </ReportShell>
        )}
      </main>
      <Footer />
    </div>
  );
}
