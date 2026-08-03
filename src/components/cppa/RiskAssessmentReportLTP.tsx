// ITEM 274 — On-screen renderer for the LTP (Track-2) cppa-risk shape.
// The exact on-screen analog of buildCPPARiskLtpHTML in
// supabase/functions/generate-report-pdf/index.ts:1177-1263: same section set,
// same order, same customer-first headers, same narrative coercion.
//
// Every section is a flat narrative (string) or a list of narrative strings —
// never the object-shaped V4 payloads. Omitted sections degrade to nothing.

import {
  coerceNarrativeList,
  coerceNarrativeScalar,
  headerForSection,
} from "@/lib/cppa-risk-shape";

/** Renders `**bold**` spans inline; everything else is plain text. */
function InlineText({ value }: { value: string }) {
  const parts = value.split(/(\*\*[^*]+\*\*)/g).filter((p) => p !== "");
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function Paragraphs({ value }: { value: string }) {
  const paras = value.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <>
      {paras.map((p, i) => (
        <p key={i} className="mb-2 whitespace-pre-line">
          <InlineText value={p} />
        </p>
      ))}
    </>
  );
}

function SectionShell({
  sectionKey,
  fallbackTitle,
  children,
}: {
  sectionKey: string;
  fallbackTitle: string;
  children: React.ReactNode;
}) {
  return (
    <section data-section={sectionKey} className="mt-6">
      <h2 className="font-serif text-xl text-primary border-b pb-1.5 mb-3">
        {headerForSection(sectionKey, fallbackTitle)}
      </h2>
      {children}
    </section>
  );
}

function ScalarSection({
  sectionKey,
  fallbackTitle,
  value,
}: {
  sectionKey: string;
  fallbackTitle: string;
  value: unknown;
}) {
  const text = coerceNarrativeScalar(value);
  if (!text) return null;
  return (
    <SectionShell sectionKey={sectionKey} fallbackTitle={fallbackTitle}>
      <Paragraphs value={text} />
    </SectionShell>
  );
}

function ListSection({
  sectionKey,
  fallbackTitle,
  value,
}: {
  sectionKey: string;
  fallbackTitle: string;
  value: unknown;
}) {
  const items = coerceNarrativeList(value);
  if (!items) return null;
  return (
    <SectionShell sectionKey={sectionKey} fallbackTitle={fallbackTitle}>
      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="border rounded-lg p-4 bg-card">
            <Paragraphs value={it} />
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export interface LtpRiskReport {
  [key: string]: any;
}

export default function RiskAssessmentReportLTP({
  report,
  createdAt,
}: {
  report: LtpRiskReport;
  createdAt?: string;
}) {
  const summary =
    report?.assessment_summary && typeof report.assessment_summary === "object"
      ? report.assessment_summary
      : {};
  const meta =
    report?.document_metadata && typeof report.document_metadata === "object"
      ? report.document_metadata
      : {};
  const opening = coerceNarrativeScalar(report?.opening_summary);
  const summaryNarrative = coerceNarrativeScalar(summary.narrative);
  const scope = report?.scope_and_triggers ?? report?.scope_confirmation;

  return (
    <div className="font-serif-text">
      <header className="bg-primary text-primary-foreground rounded-lg p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-80 mb-1">
          Compliance Tool · Customized Analysis
        </p>
        <h1 className="font-serif text-2xl">CPPA Privacy Risk Assessment</h1>
        {createdAt && (
          <p className="text-xs opacity-80 mt-1.5">
            Generated {new Date(createdAt).toLocaleDateString()}
          </p>
        )}
      </header>

      {opening && (
        <div data-section="opening_summary" className="italic text-primary mt-4">
          <Paragraphs value={opening} />
        </div>
      )}

      <ScalarSection
        sectionKey="executive_summary"
        fallbackTitle="Executive Summary"
        value={report?.executive_summary}
      />

      {(summaryNarrative ||
        summary.company_name ||
        summary.assessment_date ||
        summary.overall_risk_level) && (
        <SectionShell sectionKey="assessment_summary" fallbackTitle="Assessment Summary">
          {summary.company_name && (
            <p className="mb-1">
              <span className="font-bold">Company:</span> {summary.company_name}
            </p>
          )}
          {summary.assessment_date && (
            <p className="mb-1">
              <span className="font-bold">Assessment date:</span> {summary.assessment_date}
            </p>
          )}
          {summary.overall_risk_level && (
            <p className="mb-1">
              <span className="font-bold">Overall risk level:</span> {summary.overall_risk_level}
            </p>
          )}
          {summary.exceptions_status && (
            <p className="mb-1">
              <span className="font-bold">Exceptions:</span> {summary.exceptions_status}
            </p>
          )}
          {summaryNarrative && <Paragraphs value={summaryNarrative} />}
        </SectionShell>
      )}

      <ListSection sectionKey="scope_and_triggers" fallbackTitle="Scope & Triggers" value={scope} />
      <ListSection
        sectionKey="processing_narrative"
        fallbackTitle="How the business processes personal information"
        value={report?.processing_narrative}
      />
      <ListSection
        sectionKey="risk_assessment_by_activity"
        fallbackTitle="Risk Assessment by Activity"
        value={report?.risk_assessment_by_activity}
      />
      <ListSection
        sectionKey="exception_analysis"
        fallbackTitle="Exception Analysis"
        value={report?.exception_analysis}
      />
      <ListSection
        sectionKey="priority_actions"
        fallbackTitle="Priority Actions"
        value={report?.priority_actions}
      />
      <ListSection sectionKey="next_steps" fallbackTitle="Next Steps" value={report?.next_steps} />
      <ListSection
        sectionKey="strengthen_items"
        fallbackTitle="What Would Strengthen the Record"
        value={report?.strengthen_items}
      />
      <ListSection
        sectionKey="information_needed"
        fallbackTitle="Items for Your Review"
        value={report?.information_needed}
      />
      <ListSection
        sectionKey="record_sufficiency"
        fallbackTitle="Record Sufficiency"
        value={report?.record_sufficiency}
      />
      <ScalarSection
        sectionKey="submission_summary"
        fallbackTitle="Submission Summary"
        value={report?.submission_summary}
      />

      {meta.build_stamp && (
        <p className="text-[10px] text-muted-foreground text-center mt-3">
          build {String(meta.build_stamp)}
        </p>
      )}
    </div>
  );
}
