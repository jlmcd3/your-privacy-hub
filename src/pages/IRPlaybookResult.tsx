// View a previously generated Incident Response Playbook by ID.

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
import WordConversionPromptButton from "@/components/WordConversionPromptButton";

import { AnnotationCallout } from "@/components/AnnotationCallout";
import EnforcementPrecedents from "@/components/EnforcementPrecedents";
import { useGenerationStatus } from "@/hooks/useGenerationStatus";
import GenerationStalledCard from "@/components/GenerationStalledCard";
import { useToolCompletedOnce } from "@/hooks/useToolCompletedOnce";
// ITEM 369-IR — two-artifact model + authority exhibit.
import StandingPlaybookView from "@/components/ir/StandingPlaybookView";
import IncidentWorksheetView from "@/components/ir/IncidentWorksheetView";
import AuthorityExhibit from "@/components/report/AuthorityExhibit";

const TERMINAL_STATUSES = new Set(["complete", "error", "failed", "refunded", "failed_resolved"]);

export default function IRPlaybookResult() {
  const { id } = useParams();
  const { meter } = useRunMeter("ir_playbook", id!);
  const [translated, setTranslated] = useState<any | null>(null);
  const [dir, setDir] = useState<"ltr" | "rtl">("ltr");

  const { row, loading, phase, refresh, setRow } = useGenerationStatus<any>({
    table: "ir_playbooks",
    rowId: id,
    isTerminal: (r) => TERMINAL_STATUSES.has(String(r?.status ?? "")),
    isReportReady: (r) => r?.status === "complete" && (!!r?.playbook_text || !!r?.report_data),
  });
  useToolCompletedOnce("ir_playbook", row?.status === "complete" && (!!row?.playbook_text || !!row?.report_data));

  const intake = row?.intake_data || {};

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Helmet><title>Your Incident Response Playbook | End User Privacy</title></Helmet>
      <Navbar />
      <main id="main-content" className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <BackLink to="/dashboard/reports" label="Back to My Reports" className="mb-4" />
        <ClientContextBadge />
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-navy" /></div>
        ) : !row ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <p className="text-slate">Playbook not found or you don't have access.</p>
            <Button asChild className="mt-4"><Link to="/dashboard/reports">Back to My Reports</Link></Button>
          </div>
        ) : phase === "stalled" || phase === "stalled_pre_dispatch" ? (
          <GenerationStalledCard
            variant={phase}
            retryHref="/ir-playbook"
            onRefresh={refresh}
          />
        ) : phase === "running" || phase === "slow" ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center" role="status" aria-live="polite">
            <Loader2 className="w-6 h-6 animate-spin text-brand-navy mx-auto mb-3" aria-hidden="true" />
            <p className="text-foreground">
              {phase === "slow"
                ? "This is taking longer than expected — still building your playbook."
                : "Your playbook is being generated."}
            </p>
          </div>
        ) : (
          <ReportShell
            topDisclaimer={
              <>
                This is an operational incident response guide to assist during a live
                breach event. It is not legal advice and does not constitute a formal
                legal compliance opinion. Notification deadlines are indicative based
                on publicly available regulatory guidance — confirm all timelines and
                obligations with qualified legal counsel before taking action.
              </>
            }
            title="Your Incident Response Playbook"
            meta={
              <>
                Generated {new Date(row.created_at).toLocaleDateString()}
                {(intake.jurisdictions || []).length > 0 && ` · ${(intake.jurisdictions || []).join(", ")}`}
              </>
            }
            actions={
              <>
                <ReportTranslateMenu
                  toolType="ir_playbook"
                  reportId={row.id}
                  onTranslated={(p, d) => { setTranslated(p); setDir(d); }}
                />
                {/* ITEM 369-IR LEG 1 — one run, two downloadable files. */}
                <PDFDownloadButton
                  toolType="ir_playbook"
                  assessmentId={row.id}
                  pdfUrl={row.pdf_url}
                  artifact="standing_playbook"
                  label="↓ Standing Playbook PDF"
                  onGenerated={(url) => setRow({ ...row, pdf_url: url })}
                />
                {Boolean((row?.report_data as any)?.incident_worksheet) && (
                  <PDFDownloadButton
                    toolType="ir_playbook"
                    assessmentId={row.id}
                    artifact="incident_worksheet"
                    label="↓ Incident Worksheet PDF"
                  />
                )}

                <WordConversionPromptButton documentType="ir_playbook" />
                
                {(translated?.playbook_text ?? row.playbook_text) && <CopyButton text={translated?.playbook_text ?? row.playbook_text} />}
              </>
            }
            callout={
              <p className="text-meta text-muted-foreground italic">
                This playbook and its documentation checklist contribute to your Article 33(5) accountability record.
              </p>
            }
          >
            {(() => {
              const infoNeeded = (row?.report_data as any)?.information_needed;
              return meter ? (
                <>
                  <RunMeterBar
                    meter={meter}
                    refineHref={`/ir-playbook?refine=${id}`}
                    onExtend={() => startMeterExtension("ir_playbook", id!)}
                    infoNeededCount={Array.isArray(infoNeeded) ? infoNeeded.length : 0}
                  />
                  <InformationNeededBlock items={infoNeeded} />
                </>
              ) : null;
            })()}

            <div dir={dir} style={{ display: "contents" }}>
            <AssessmentReport text={(translated?.playbook_text ?? row.playbook_text) || ""} sectionChipLabel={null} />
            <EnforcementPrecedents
              precedents={(row?.report_data as any)?.enforcement_precedents}
              variant="standard"
              attempted={Boolean((row?.report_data as any)?.enforcement_meta?.attempted)}
              totalMatched={(row?.report_data as any)?.enforcement_meta?.total_matched}
              queryDescriptor={(row?.report_data as any)?.enforcement_meta?.query_descriptor}
            />
            {Array.isArray((row?.report_data as any)?.annotations) && (row?.report_data as any).annotations.length > 0 && (
              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold mb-3">
                  Enforcement Basis for Timeline Recommendations
                </h3>
                <AnnotationCallout annotations={(row?.report_data as any)?.annotations} />
              </div>
            )}

            {/* ITEM 369-IR — ARTIFACT A: the standing playbook, then its
                authority exhibit. The exhibit belongs to this artifact only and
                sits immediately before the universal disclaimer, which
                ReportShell renders as the final element. */}
            <StandingPlaybookView
              playbook={(row?.report_data as any)?.standing_playbook}
              edpbTemplate={(row?.report_data as any)?.content_owner_mapping?.edpb_template}
            />
            <AuthorityExhibit exhibit={(row?.report_data as any)?.authority_exhibit} />

            {/* ITEM 369-IR — ARTIFACT B: blank forms, no exhibit, no analysis. */}
            <IncidentWorksheetView worksheet={(row?.report_data as any)?.incident_worksheet} />
            </div>
          </ReportShell>
        )}
      </main>
      <Footer />
    </div>
  );
}
