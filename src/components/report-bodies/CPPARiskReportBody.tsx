// Pure presentational body for CPPA Risk Assessment.
// Uses the same V3/V4 renderer as the real result page so sample and live
// reports look identical.
//
// ITEM 274 — the LTP (Track-2) shape is dispatched FIRST, on the SAME
// discriminator the PDF exporter uses (`isLtpRiskShape`, mirrored in
// src/lib/cppa-risk-shape.ts). Before this, LTP reports matched isV4Report
// (schema_version "cppa_risk_v4" + array sections) and rendered blank because
// the V4 renderer expects object-shaped sections.
import EnforcementPrecedents from "@/components/EnforcementPrecedents";
import RiskAssessmentReportV3 from "@/components/cppa/RiskAssessmentReportV3";
import RiskAssessmentReportV4, { isV4Report } from "@/components/cppa/RiskAssessmentReportV4";
import RiskAssessmentReportLTP from "@/components/cppa/RiskAssessmentReportLTP";
import { isLtpRiskShape } from "@/lib/cppa-risk-shape";


const riskColor = (r: string) => {
  const x = (r || "").toLowerCase();
  if (x === "critical") return "bg-red-100 text-red-800";
  if (x === "high") return "bg-orange-100 text-orange-800";
  if (x === "medium") return "bg-amber-100 text-amber-800";
  if (x === "low") return "bg-green-100 text-green-800";
  return "bg-muted text-foreground";
};

export interface CPPARiskReportBodyProps {
  report: any;
  createdAt?: string;
}

export default function CPPARiskReportBody({ report = {}, createdAt }: CPPARiskReportBodyProps) {
  const isV3 = !!(report?.schema_version === "v3-part-a-part-b" && report?.part_a);
  const isV4 = !isV3 && isV4Report(report);

  return (
    <div className="space-y-6 font-serif-text">
      {!isV4 && (
        <section className="bg-slate-900 text-white rounded-lg p-8">
          <h1 className="font-serif mb-2">CPPA Privacy Risk Assessment</h1>
          {createdAt && (
            <p className="text-slate-300 text-sm">Generated {new Date(createdAt).toLocaleDateString()}</p>
          )}
          {!isV3 && (
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              {report?.overall_score != null && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded font-medium bg-white/10">
                  Overall score: <strong>{report.overall_score} / 100</strong>
                </span>
              )}
              {report?.risk_level && (
                <span className={`inline-block px-3 py-1.5 rounded font-medium ${riskColor(report.risk_level)}`}>
                  {report.risk_level} risk
                </span>
              )}
            </div>
          )}
          {!isV3 && report?.executive_summary && <p className="mt-4 text-slate-200">{report.executive_summary}</p>}
        </section>
      )}

      {isV3 && <RiskAssessmentReportV3 report={report as any} />}
      {isV4 && <RiskAssessmentReportV4 report={report as any} />}

      {report?.enforcement_context
        && typeof report.enforcement_context === "string"
        && report.enforcement_context.trim() !== ""
        && report.enforcement_context.trim().toLowerCase() !== "null" && (
          <section className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 text-sm rounded">
            <p className="font-semibold mb-1">Enforcement Context</p>
            <p>{report.enforcement_context}</p>
          </section>
        )}

      <EnforcementPrecedents
        precedents={report?.enforcement_precedents}
        context="Recent regulator decisions matched to your processing activities and jurisdictions."
      />
    </div>
  );
}
