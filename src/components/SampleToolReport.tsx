// SampleToolReport — dispatch sample_reports rows to the same rich
// renderer used by the live tool result pages.
//
// For prose-based tools (DPA, IR Playbook, Biometric) we render the
// document_text through AssessmentReport, exactly as the result pages do.
// For structured tools we render the tool-specific body component built
// from the same JSX as the real result page.
import { useEffect, useState } from "react";
import AssessmentReport from "@/components/AssessmentReport";
import { supabase } from "@/integrations/supabase/client";
import EnforcementPrecedents from "@/components/EnforcementPrecedents";
import { AnnotationCallout, AnnotationAppendix } from "@/components/AnnotationCallout";
import GovernanceReportBody from "@/components/report-bodies/GovernanceReportBody";
import LIAReportBody from "@/components/report-bodies/LIAReportBody";
import DPIAReportBody from "@/components/report-bodies/DPIAReportBody";
import CPPARiskReportBody from "@/components/report-bodies/CPPARiskReportBody";
import { CybersecurityReportBody } from "@/components/cppa/CybersecurityReportBody";
import { SampleReportBody } from "@/components/SampleReportBody";
import { isSkeletonDocument, SkeletonDocumentView } from "@/components/reports/SkeletonDocumentView";
import { readSyllabus } from "@/lib/syllabus-record";

// DOC 183 (2026-09-04) — the sample surface renders every Syllabus & Record
// product with the same product key its live result page passes (docs
// 170–178): the skeleton's page one IS the Syllabus, so a preview that kept
// it shows the contents page the customer sees. ADMT is version-gated the
// way its result page gates it (only admt_v2 projects a syllabus).
export function sampleSrProduct(toolSlug: string, doc: unknown): string | undefined {
  switch (toolSlug) {
    case "cppa_risk": return "cppa-risk";
    case "dpia": return "dpia";
    case "li_assessment": return "lia";
    case "governance": return "governance";
    case "cppa_cyber": return "cppa-cyber";
    case "ir_playbook": return "ir-playbook";
    case "registration": return "registration";
    case "cppa_admt": return readSyllabus(doc) ? "cppa-admt-v2" : undefined;
    default: return undefined;
  }
}

export interface SampleToolReportProps {
  toolSlug: string;
  documentText: string | null;
  reportData: Record<string, unknown> | null;
  publishedAt?: string | null;
  /** PANEL SAMP-3: storage path of a file-driven sample's PDF deliverable. */
  pdfPath?: string | null;
}

export function SampleToolReport({ toolSlug, documentText, reportData, publishedAt, pdfPath }: SampleToolReportProps) {
  const rd: any = reportData || {};

  // PANEL SAMP-1 (2026-08-30): the assembled byte-pinned skeleton IS the
  // customer document when present (the SO-3 wire-in every live result page
  // follows) — the published sample pages were the last surface still
  // rendering the legacy narrative bodies, which is why the samples showed
  // spine defects the product no longer ships. Some products store the
  // skeleton as the structured document object, others as flattened text;
  // both render through the same customer-facing surfaces.
  const sk = rd?.skeleton_document;
  if (isSkeletonDocument(sk)) {
    // DOC 127 PHASE B (2026-09-01) — the sample surface renders CPPA Risk
    // with the same Risk presentation system as the live result page.
    // DOC 171/172/173/175/177 (2026-09-04) — DPIA, LIA, Governance, Cyber
    // and IR Playbook join Syllabus & Record the same way
    // (SkeletonDocumentView's own readSyllabus() guard keeps a v3 Cyber
    // sample on its unchanged view). DOC 183 — ADMT v2 and Registration
    // added through sampleSrProduct().
    return <SkeletonDocumentView doc={sk} product={sampleSrProduct(toolSlug, sk)} />;
  }
  if (typeof sk === "string" && sk.trim().length > 0) {
    return <AssessmentReport text={sk} sectionChipLabel={null} />;
  }

  // DOC 183 (2026-09-04) — a preview whose deliverable is the stored PDF
  // (the file-driven Notices and RoPA, and the DPA's formal instrument,
  // doc 182) carries no row content: embed the PDF before any prose branch
  // could render an empty shell around it.
  const hasRowContent = Boolean(
    (documentText && documentText.trim().length > 0) ||
      (reportData && Object.keys(reportData).length > 0),
  );
  if (!hasRowContent && pdfPath) {
    return <SamplePdfEmbed pdfPath={pdfPath} />;
  }

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

  // PANEL SAMP-3 (2026-08-30): the file-driven samples (RoPA, US/EU
  // notices) carry their deliverable as a stored PDF and no row content —
  // the page used to say "No rendered content is available". The embed now
  // sits above the prose branches (DOC 183); this is the honest empty state.
  // Fallback for notice / ropa (no structured report_data yet).
  return <SampleReportBody documentText={documentText} reportData={reportData} />;
}

// The sample-reports bucket grants anon SELECT on objects joined to
// published sample rows (migration 20260728050447), so a signed URL can be
// minted from the public page. If signing fails, fall back honestly.
function SamplePdfEmbed({ pdfPath }: { pdfPath: string }) {
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage.from("sample-reports").createSignedUrl(pdfPath, 60 * 60);
      if (!cancelled) setUrl(data?.signedUrl ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfPath]);
  if (url === undefined) {
    return <div className="text-sm text-muted-foreground">Loading the sample document…</div>;
  }
  if (url === null) {
    return (
      <div className="text-sm text-muted-foreground">
        This sample is delivered as a PDF document; it could not be loaded right now. Please try again later.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <iframe
        src={url}
        title="Sample document (PDF)"
        className="w-full rounded-md border border-brand-cloud"
        style={{ height: "80vh" }}
      />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-md border border-brand-cloud px-4 py-2 text-sm font-medium text-brand-navy hover:bg-muted/40"
      >
        Open the PDF in a new tab
      </a>
    </div>
  );
}
