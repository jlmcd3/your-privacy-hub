// Pure presentational body for Legitimate Interest Assessment (LIA) reports.
// Extracted from LIAssessmentResult so sample pages render the same UI.
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import EnforcementPrecedents from "@/components/EnforcementPrecedents";

const strengthColor = (s: string) => {
  const v = (s || "").toLowerCase();
  if (v === "strong") return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200";
  if (v === "moderate") return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
};
const verdictColor = (v: string) => {
  const x = (v || "").toLowerCase();
  if (x.includes("pass")) return "bg-green-100 text-green-800";
  if (x.includes("fail")) return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-800";
};
const verdictLabel = (v: string) =>
  ({ likely_passes: "Likely passes", likely_fails: "Likely fails", passes: "Passes", fails: "Fails", uncertain: "Uncertain" } as Record<string, string>)[v] ?? v.replace(/_/g, " ");

const tierLabelFor = (tier: number | null | undefined, isUk: boolean) => {
  if (tier === 1) return { label: isUk ? "UK GDPR enforcement" : "EU GDPR enforcement", tone: "bg-emerald-100 text-emerald-800 border-emerald-200" };
  if (tier === 2) return { label: isUk ? "Persuasive — EU decision (not binding under UK GDPR)" : "Persuasive — UK decision (not binding under EU GDPR)", tone: "bg-amber-100 text-amber-800 border-amber-200" };
  if (tier === 3) return { label: "Non-EU/UK — supportive only, not authoritative", tone: "bg-slate-100 text-slate-700 border-slate-200" };
  return null;
};

const AnnotationCallout = ({ annotations, precedents, isUk }: { annotations: any[]; precedents?: any[]; isUk: boolean }) => {
  if (!Array.isArray(annotations) || annotations.length === 0) return null;
  const byId: Record<string, any> = {};
  for (const p of precedents || []) if (p?.id) byId[p.id] = p;
  return (
    <div className="mt-3 space-y-2">
      {annotations.map((a: any, i: number) => {
        const ctx = byId[a.enforcement_action_id] || {};
        const tier = a.authority_tier ?? ctx.authority_tier ?? null;
        const tl = tierLabelFor(tier, isUk);
        return (
          <div key={i} className="bg-slate-50 dark:bg-slate-900/40 border-l-2 border-slate-300 dark:border-slate-600 rounded-r px-3 py-2">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">📋 Corpus citation</span>
                {tl && <span className={`ml-2 text-[10px] font-semibold px-1.5 py-0.5 border rounded ${tl.tone}`}>{tl.label}</span>}
                <p className="text-xs text-foreground mt-0.5">
                  <span className="font-medium">{a.regulator}</span>
                  {a.jurisdiction ? ` · ${a.jurisdiction}` : ""}
                  {a.decision_date ? ` · ${a.decision_date?.slice(0, 7)}` : ""}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.summary}</p>
                {a.relevance && <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 italic">{a.relevance}</p>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const TestCard = ({ title, test, annotations, precedents, isUk }: any) => (
  <div className="bg-card border rounded-lg p-5">
    <div className="flex items-center justify-between mb-3">
      <h3 className="">{title}</h3>
      {test?.verdict && <span className={`px-2 py-1 text-xs rounded ${verdictColor(test.verdict)}`}>{verdictLabel(test.verdict)}</span>}
    </div>
    {test?.analysis && <p className="text-sm text-foreground mb-3">{test.analysis}</p>}
    {test?.special_category_flag && (
      <div className="text-sm p-2 bg-amber-50 border border-amber-200 rounded mb-3 text-amber-900">
        ⚠️ Special category data — heightened scrutiny applies
      </div>
    )}
    {Array.isArray(test?.supporting_factors) && test.supporting_factors.length > 0 && (
      <div className="mb-2">
        <p className="text-xs font-medium text-green-700 mb-1">Supporting factors</p>
        <ul className="list-disc pl-5 text-sm space-y-1">{test.supporting_factors.map((f: string, i: number) => <li key={i}>{f}</li>)}</ul>
      </div>
    )}
    {Array.isArray(test?.risk_factors) && test.risk_factors.length > 0 && (
      <div>
        <p className="text-xs font-medium text-red-700 mb-1">Risk factors</p>
        <ul className="list-disc pl-5 text-sm space-y-1">{test.risk_factors.map((f: string, i: number) => <li key={i}>{f}</li>)}</ul>
      </div>
    )}
    <AnnotationCallout
      annotations={(annotations || []).filter((a: any) => a.relevance?.toLowerCase().includes(title.toLowerCase().replace(" test", "")))}
      precedents={precedents}
      isUk={isUk}
    />
  </div>
);

export interface LIAReportBodyProps {
  report: any;
  intake?: any;
}

export default function LIAReportBody({ report = {}, intake = {} }: LIAReportBodyProps) {
  const overall = report?.three_part_test?.overall_assessment;
  const docs = report?.documentation_recommendations;
  const js = Array.isArray(intake?.jurisdictions) ? intake.jurisdictions : [];
  const isUk = js.some((j: string) => /united kingdom|uk|gb/i.test(String(j)));
  const precs = report?.enforcement_precedents;

  return (
    <div className="space-y-6">
      <section className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-6">
        <h2 className="mb-3">Assessment Summary</h2>
        {(intake?.organization_name || intake?.processing_description) && (
          <p className="text-sm text-foreground mb-3">
            {intake?.organization_name ? (
              <>This legitimate interest assessment evaluates processing carried out by <span className="font-semibold">{intake.organization_name}</span>.{" "}</>
            ) : (
              <>This legitimate interest assessment evaluates the following processing.{" "}</>
            )}
            {intake?.processing_description && <><span className="italic">{intake.processing_description}</span>{" "}</>}
          </p>
        )}
        {overall?.argument_strength && (
          <div className="mb-3">
            <span className={`inline-block px-3 py-1.5 rounded font-medium ${strengthColor(overall.argument_strength)}`}>
              {overall.argument_strength}
            </span>
          </div>
        )}
        {overall?.strength_basis && <p className="text-sm text-foreground">{overall.strength_basis}</p>}
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <TestCard title="Purpose Test" test={report?.three_part_test?.purpose_test} annotations={report?.annotations} precedents={precs} isUk={isUk} />
        <TestCard title="Necessity Test" test={report?.three_part_test?.necessity_test} annotations={report?.annotations} precedents={precs} isUk={isUk} />
        <TestCard title="Balancing Test" test={report?.three_part_test?.balancing_test} annotations={report?.annotations} precedents={precs} isUk={isUk} />
      </section>

      {Array.isArray(overall?.blocking_issues) && overall.blocking_issues.length > 0 && (
        <section className="border-l-4 border-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg p-5">
          <h3 className="text-red-800 dark:text-red-300 mb-3">⛔ Blocking Issues — Resolve Before Relying on Legitimate Interest</h3>
          <ul className="space-y-2">
            {overall.blocking_issues.map((issue: string, i: number) => (
              <li key={i} className="text-sm text-red-900 dark:text-red-200 flex gap-2">
                <span className="font-mono">•</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-card border rounded-lg p-6">
        <h2 className="mb-4">Most Analogous Regulatory Decisions</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 border rounded">
            <h3 className="text-green-700 mb-2">Accepted Cases</h3>
            <p className="text-sm">{overall?.closest_accepted_precedent || "No closely analogous accepted precedents found in tracked database"}</p>
          </div>
          <div className="p-4 border rounded">
            <h3 className="text-red-700 mb-2">Rejected Cases</h3>
            <p className="text-sm">{overall?.closest_rejected_precedent || "No closely analogous rejected precedents found in tracked database"}</p>
          </div>
        </div>
        {Array.isArray(overall?.key_distinguishing_factors) && overall.key_distinguishing_factors.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-1">Key distinguishing factors</p>
            <ul className="list-disc pl-5 text-sm space-y-1">{overall.key_distinguishing_factors.map((f: string, i: number) => <li key={i}>{f}</li>)}</ul>
          </div>
        )}
      </section>

      <EnforcementPrecedents
        precedents={report?.enforcement_precedents}
        context="Recent regulator decisions matched to your processing activity, data categories, and jurisdictions."
      />

      {(Array.isArray(docs?.recommended_documentation) || Array.isArray(docs?.balancing_record_elements)) && (
        <section className="bg-card border rounded-lg p-6">
          <h2 className="mb-4">Recommended Documentation for Your LIA Record</h2>
          {Array.isArray(docs?.recommended_documentation) && docs.recommended_documentation.map((d: any, i: number) => (
            <div key={i} className="mb-4 pb-4 border-b last:border-b-0">
              <p className="font-medium">{d.document_name || d.name || d.document}</p>
              {d.purpose && <p className="text-sm text-muted-foreground mt-1">{d.purpose}</p>}
              {Array.isArray(d.key_elements) && (
                <ul className="list-disc pl-5 text-sm mt-2 space-y-1">{d.key_elements.map((e: string, j: number) => <li key={j}>{e}</li>)}</ul>
              )}
              {d.basis && <p className="text-xs text-muted-foreground mt-2">Basis: {d.basis}</p>}
            </div>
          ))}
          {Array.isArray(docs?.balancing_record_elements) && docs.balancing_record_elements.length > 0 && (
            <>
              <h3 className="mt-4 mb-2">Balancing Record — Must Include</h3>
              <ol className="list-decimal pl-5 text-sm space-y-1">{docs.balancing_record_elements.map((e: string, i: number) => <li key={i}>{e}</li>)}</ol>
            </>
          )}
        </section>
      )}

      <section className="bg-card border rounded-lg p-6">
        <h3 className="mb-2">Does this processing require a DPIA?</h3>
        <p className="text-sm text-muted-foreground mb-3">
          If your assessment identifies high-risk processing, you may be required to conduct a Data Protection Impact Assessment under GDPR Article 35.
        </p>
        <Button asChild><Link to="/dpia-framework">Open Impact Assessment Builder →</Link></Button>
      </section>
    </div>
  );
}
