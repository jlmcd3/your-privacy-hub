// View a previously generated Custom DPA by ID. Subscribers reach this from My Reports.

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
import { Loader2 } from "lucide-react";
import AssessmentReport from "@/components/AssessmentReport";
import ReportShell from "@/components/ReportShell";
import RunMeterBar from "@/components/RunMeterBar";
import InformationNeededBlock from "@/components/InformationNeededBlock";

import { useRunMeter } from "@/hooks/useRunMeter";
import { startMeterExtension } from "@/lib/meterExtension";
import ReportTranslateMenu from "@/components/ReportTranslateMenu";
import PDFDownloadButton from "@/components/PDFDownloadButton";

import { AnnotationAppendix } from "@/components/AnnotationCallout";
import EnforcementPrecedents from "@/components/EnforcementPrecedents";
import { detectDocumentType } from "@/lib/dpaDocumentType";
import { useGenerationStatus } from "@/hooks/useGenerationStatus";
import GenerationStalledCard from "@/components/GenerationStalledCard";


const TERMINAL_STATUSES = new Set(["complete", "error", "failed", "refunded", "failed_resolved"]);

export default function DPAResult() {
  const { id } = useParams();
  const [translated, setTranslated] = useState<any | null>(null);
  const [dir, setDir] = useState<"ltr" | "rtl">("ltr");

  const { row, loading, phase, refresh, setRow } = useGenerationStatus<any>({
    table: "dpa_documents",
    rowId: id,
    isTerminal: (r) => TERMINAL_STATUSES.has(String(r?.status ?? "")),
    isReportReady: (r) => r?.status === "complete" && (!!r?.document_text || !!r?.report_data),
  });

  const intake = row?.intake_data || {};

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Helmet><title>Your Custom DPA | End User Privacy</title></Helmet>
      <Navbar />
      <main className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <BackLink to="/dashboard/reports" label="Back to My Reports" className="mb-4" />
        <ClientContextBadge />
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-navy" /></div>
        ) : !row ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <p className="text-slate">Document not found or you don't have access.</p>
            <Button asChild className="mt-4"><Link to="/dashboard/reports">Back to My Reports</Link></Button>
          </div>
        ) : phase === "stalled" || phase === "stalled_pre_dispatch" ? (
          <GenerationStalledCard
            variant={phase}
            retryHref="/dpa-generator"
            onRefresh={refresh}
          />
        ) : phase === "running" || phase === "slow" ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-brand-navy mx-auto mb-3" />
            <p className="text-foreground">
              {phase === "slow"
                ? "This is taking longer than expected — still working on your DPA."
                : "Your DPA is being generated."}
            </p>
            {phase === "running" && (
              <p className="text-muted-foreground text-sm mt-1">Usually completes in 15–25 seconds.</p>
            )}
          </div>
        ) : (() => {
          const docType = detectDocumentType(intake.controllerJurisdiction || "", intake.processorJurisdiction || "");
          return (
          <ReportShell
            topDisclaimer={(row?.report_data as any)?.framework_disclaimer ?? (row?.report_data as any)?.disclaimer}
            title={`Your ${docType.label} — ${intake.controllerName || "Controller"} / ${intake.processorName || "Processor"}`}
            meta={
              <>
                Generated {new Date(row.created_at).toLocaleDateString()} · {docType.label} · {intake.controllerJurisdiction || "—"} / {intake.processorJurisdiction || "—"}
              </>
            }

            actions={
              <>
                <ReportTranslateMenu
                  toolType="dpa"
                  reportId={row.id}
                  onTranslated={(p, d) => { setTranslated(p); setDir(d); }}
                />
                <PDFDownloadButton
                  toolType="dpa_generator"
                  assessmentId={row.id}
                  pdfUrl={row.pdf_url}
                  onGenerated={(url) => setRow({ ...row, pdf_url: url })}
                />
                
                {(translated?.document_text ?? row.document_text) && <CopyButton text={translated?.document_text ?? row.document_text} />}
              </>
            }
          >
            {(() => {
              const { meter } = useRunMeter("dpa_generator", row.id);
              const infoNeeded = (row?.report_data as any)?.information_needed;
              return meter ? (
                <>
                  <RunMeterBar
                    meter={meter}
                    refineHref={`/dpa-generator?refine=${row.id}`}
                    onExtend={() => startMeterExtension("dpa_generator", row.id)}
                    infoNeededCount={Array.isArray(infoNeeded) ? infoNeeded.length : 0}
                  />
                  <InformationNeededBlock items={infoNeeded} />
                </>
              ) : null;
            })()}

            <div dir={dir} style={{ display: "contents" }}>
            <AssessmentReport text={(translated?.document_text ?? row.document_text) || ""} sectionChipLabel={null} />
            <EnforcementPrecedents
              precedents={(row?.report_data as any)?.enforcement_precedents}
              variant="standard"
              attempted={Boolean((row?.report_data as any)?.enforcement_meta?.attempted)}
              totalMatched={(row?.report_data as any)?.enforcement_meta?.total_matched}
              queryDescriptor={(row?.report_data as any)?.enforcement_meta?.query_descriptor}
            />
            <AnnotationAppendix annotations={(row?.report_data as any)?.annotations} />
            </div>
          </ReportShell>

          );
        })()}

      </main>
      <Footer />
    </div>
  );
}
