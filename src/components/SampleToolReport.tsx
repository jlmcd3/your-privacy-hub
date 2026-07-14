// SampleToolReport — dispatch sample_reports rows to the same rich
// renderer used by the live tool result pages.
//
// For prose-based tools (DPA, IR Playbook, Biometric) we render the
// document_text through AssessmentReport, exactly as the result pages do.
// For structured tools we render the tool-specific body component built
// from the same JSX as the real result page.
import AssessmentReport from "@/components/AssessmentReport";
import EnforcementPrecedents from "@/components/EnforcementPrecedents";
import { AnnotationCallout, AnnotationAppendix } from "@/components/AnnotationCallout";
import GovernanceReportBody from "@/components/report-bodies/GovernanceReportBody";
import LIAReportBody from "@/components/report-bodies/LIAReportBody";
import DPIAReportBody from "@/components/report-bodies/DPIAReportBody";
import CPPARiskReportBody from "@/components/report-bodies/CPPARiskReportBody";
import { CybersecurityReportBody } from "@/components/cppa/CybersecurityReportBody";
import { SampleReportBody } from "@/components/SampleReportBody";

export interface SampleToolReportProps {
  toolSlug: string;
  documentText: string | null;
  reportData: Record<string, unknown> | null;
  publishedAt?: string | null;
}

export function SampleToolReport({ toolSlug, documentText, reportData, publishedAt }: SampleToolReportProps) {
  const rd: any = reportData || {};

  // Prose tools: render markdown/plaintext through AssessmentReport (same as
  // the live result pages), plus enforcement precedents and annotation
  // callouts pulled from report_data.
  if (toolSlug === "dpa" || toolSlug === "ir_playbook" || toolSlug === "biometric") {
    const text = documentText || rd?.document_text || rd?.playbook_text || rd?.analysis_text || rd?.assessment_text || "";
    return (
      <div className="space-y-6">
        {text && <AssessmentReport text={text} sectionChipLabel={null} />}
        <EnforcementPrecedents
          precedents={rd?.enforcement_precedents}
          variant="standard"
          attempted={Boolean(rd?.enforcement_meta?.attempted)}
          totalMatched={rd?.enforcement_meta?.total_matched}
          queryDescriptor={rd?.enforcement_meta?.query_descriptor}
        />
        {Array.isArray(rd?.annotations) && rd.annotations.length > 0 && (
          toolSlug === "dpa" ? (
            <AnnotationAppendix annotations={rd.annotations} />
          ) : (
            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-semibold mb-3">
                {toolSlug === "ir_playbook" ? "Enforcement Basis for Timeline Recommendations" : "Priority Action — Enforcement Basis"}
              </h3>
              <AnnotationCallout annotations={rd.annotations} />
            </div>
          )
        )}
      </div>
    );
  }

  if (toolSlug === "governance") {
    return <GovernanceReportBody report={rd} sampleMode />;
  }
  if (toolSlug === "li_assessment") {
    return <LIAReportBody report={rd} intake={rd?.normalised_intake} />;
  }
  if (toolSlug === "dpia") {
    return <DPIAReportBody report={rd} />;
  }
  if (toolSlug === "cppa_risk") {
    return <CPPARiskReportBody report={rd} createdAt={publishedAt || undefined} />;
  }
  if (toolSlug === "cppa_cyber") {
    // CybersecurityReportBody reads from row.report_data and row.intake_data.
    const fakeRow = { report_data: rd, intake_data: rd?.normalised_intake || {}, created_at: publishedAt || undefined };
    return <CybersecurityReportBody row={fakeRow} hideHeader />;
  }

  // Fallback for notice / ropa (no structured report_data yet).
  return <SampleReportBody documentText={documentText} reportData={reportData} />;
}
