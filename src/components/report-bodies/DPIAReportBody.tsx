// Pure presentational body for Impact Assessment Builder (DPIA) reports.
// Extracted from DPIAFrameworkResult so sample pages render the same UI.
import EnforcementPrecedents from "@/components/EnforcementPrecedents";
import { AnnotationCallout } from "@/components/AnnotationCallout";
import DeterminationBlock from "@/components/report/DeterminationBlock";
import AuthorityExhibit from "@/components/report/AuthorityExhibit";

const sevColor = (s: string) => {
  const x = (s || "").toLowerCase();
  if (x.includes("critical") || x.includes("high")) return "bg-red-100 text-red-800";
  if (x.includes("medium")) return "bg-amber-100 text-amber-800";
  if (x.includes("low")) return "bg-blue-100 text-blue-800";
  return "bg-muted text-foreground";
};

const StatusBadge = ({ value }: { value: string }) => {
  const v = (value || "").toLowerCase();
  const cls =
    v.includes("not accept") ? "bg-red-100 text-red-800"
    : v.includes("partial") ? "bg-amber-100 text-amber-800"
    : v.includes("implemented") ? "bg-green-100 text-green-800"
    : v.includes("planned") ? "bg-blue-100 text-blue-800"
    : v.includes("accept") ? "bg-green-100 text-green-800"
    : "bg-muted text-foreground";
  return <span className={`inline-block px-2 py-0.5 text-xs rounded ${cls}`}>{value}</span>;
};

const RISK_BADGE = new Set(["likelihood", "severity", "risk_level", "residual_likelihood", "residual_severity", "residual_risk_level"]);
const STATUS_BADGE = new Set(["implementation_status", "acceptable"]);

const renderCell = (key: string, val: any) => {
  if (val === null || val === undefined || val === "") return <span className="text-muted-foreground">—</span>;
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "object") {
    if ("is_special" in val) return val.is_special ? `Yes${Array.isArray(val.categories) && val.categories.length ? ": " + val.categories.join(", ") : ""}` : "No";
    return JSON.stringify(val);
  }
  if (RISK_BADGE.has(key)) return <span className={`inline-block px-2 py-0.5 text-xs rounded ${sevColor(String(val))}`}>{String(val)}</span>;
  if (STATUS_BADGE.has(key)) return <StatusBadge value={String(val)} />;
  return <span className="whitespace-pre-wrap">{String(val)}</span>;
};

const DataTable = ({ columns, rows }: { columns: { key: string; label: string }[]; rows: any[] }) =>
  Array.isArray(rows) && rows.length ? (
    <div className="overflow-x-auto rounded border">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-muted/40 border-b">
            {columns.map((c) => (
              <th key={c.key} className="text-left font-medium px-3 py-2 align-top text-[11px] uppercase tracking-wide text-muted-foreground">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0 align-top">
              {columns.map((c) => <td key={c.key} className="px-3 py-2">{renderCell(c.key, r?.[c.key])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : <p className="text-sm text-muted-foreground italic">[TO COMPLETE — no rows generated]</p>;

const Section = ({ num, title, guidance, completion, children }: any) => (
  <section className="bg-card border rounded-lg p-6 print:break-before-page">
    <h2 className="font-body text-display-card font-semibold mb-2">Section {num}: {title}</h2>
    {guidance && (
      <details className="mb-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded p-3 text-sm">
        <summary className="cursor-pointer font-medium">Guidance</summary>
        <p className="mt-2">{guidance}</p>
      </details>
    )}
    <div className="space-y-3">{children}</div>
    {completion && (
      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 text-sm rounded">
        <p className="font-medium mb-1">Your DPO/Counsel Must Complete</p>
        <p>{completion}</p>
      </div>
    )}
  </section>
);

const Field = ({ label, value }: { label: string; value: any }) => value ? (
  <div><span className="text-xs uppercase font-medium text-muted-foreground">{label}</span><p className="text-sm mt-1 whitespace-pre-wrap">{value}</p></div>
) : null;

const SubH = ({ children }: any) => <h3 className="font-body text-display-card font-semibold text-sm font-semibold mt-5 mb-1.5">{children}</h3>;

export interface DPIAReportBodyProps {
  report: any;
}

export default function DPIAReportBody({ report = {} }: DPIAReportBodyProps) {
  const meta = report?.dpia_metadata || {};
  const ov = report?.section_0_overview;
  const ts = ov?.technical_sheet || {};
  const d1 = report?.section_1_description;
  const an = report?.section_2_analysis;
  const np = report?.section_3_necessity_proportionality;
  const rm = report?.section_4_risk_management;
  const ip = report?.section_5_interested_parties;
  const cc = report?.section_6_conclusion;

  return (
    <div className="space-y-6 font-serif-text">
      {/* ITEM 372 METHOD 2a — the determination leads the document. */}
      <DeterminationBlock determination={report?.determination} />

      {Array.isArray(meta.applicable_frameworks) && meta.applicable_frameworks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {meta.applicable_frameworks.map((f: string) => (
            <span key={f} className="px-2 py-1 text-xs rounded bg-muted">{f}</span>
          ))}
        </div>
      )}

      {report?.supervisory_authority_consultation?.trigger_conditions && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 text-sm rounded">
          <p className="font-medium mb-1">Supervisory authority consultation may be required</p>
          <p>{report.supervisory_authority_consultation.trigger_conditions}</p>
        </div>
      )}

      {ov && (
        <Section num={0} title="Overview of the Processing" guidance={ov.guidance_note} completion={ov.completion_guidance}>
          <SubH>Controller(s)</SubH>
          <DataTable columns={[{ key: "name", label: "Controller" }, { key: "responsible_unit", label: "Responsible unit" }, { key: "main_establishment_or_representative", label: "Main establishment / representative" }, { key: "dpo", label: "DPO" }]} rows={ov.controllers} />
          <SubH>Processor(s) / sub-processor(s)</SubH>
          <DataTable columns={[{ key: "name", label: "Processor" }, { key: "obligations_and_tasks", label: "Obligations & tasks" }]} rows={ov.processors} />
          <Field label="Processing name" value={ov.processing_name} />
          <Field label="Version / change history" value={ov.processing_version} />
          <Field label="Estimated launch date" value={ov.planning?.estimated_launch_date} />
          <Field label="Estimated end date" value={ov.planning?.estimated_end_date} />
          <SubH>DPIA technical sheet</SubH>
          <Field label="Team (RACI)" value={ts.team_raci} />
          <Field label="Reference materials" value={ts.reference_materials} />
          <Field label="Reasons to conduct" value={Array.isArray(ts.reasons_to_conduct) ? ts.reasons_to_conduct.join("; ") : ts.reasons_to_conduct} />
          <Field label="Scope" value={ts.scope} />
          <Field label="Completion date" value={ts.completion_date} />
          <Field label="Formal validation date" value={ts.formal_validation_date} />
          <Field label="Publication intent" value={ts.publication_intent} />
        </Section>
      )}

      {d1 && (
        <Section num={1} title="Systematic Description of the Processing" guidance={d1.guidance_note} completion={d1.completion_guidance}>
          <SubH>Processed personal data</SubH>
          <DataTable columns={[{ key: "item", label: "Data item" }, { key: "explanation", label: "Explanation" }, { key: "special_category", label: "Special category" }]} rows={d1.processed_personal_data} />
          <SubH>Purposes</SubH>
          <DataTable columns={[{ key: "purpose", label: "Purpose" }, { key: "personal_data_involved_and_justification", label: "Data involved & justification" }]} rows={d1.purposes} />
          <SubH>Secondary or compatible uses</SubH>
          <DataTable columns={[{ key: "use", label: "Use" }, { key: "conditions_and_compatibility", label: "Conditions & compatibility" }]} rows={d1.secondary_uses} />
          <Field label="Nature" value={d1.nature} />
          <Field label="Scope" value={d1.scope} />
          <Field label="Context" value={d1.context} />
          <Field label="Cross-border" value={d1.cross_border} />
          <Field label="International transfers" value={d1.international_transfers} />
          <SubH>Functional description</SubH>
          <DataTable columns={[{ key: "phase", label: "Phase" }, { key: "operations", label: "Operations" }, { key: "explanation", label: "Explanation" }]} rows={d1.functional_description} />
          <SubH>Supporting assets</SubH>
          <DataTable columns={[{ key: "phase", label: "Phase" }, { key: "assets", label: "Assets" }, { key: "explanation", label: "Explanation" }]} rows={d1.supporting_assets} />
          <SubH>Codes of conduct</SubH>
          <DataTable columns={[{ key: "code", label: "Code" }, { key: "basis", label: "Basis" }, { key: "explanation", label: "Explanation" }]} rows={d1.codes_of_conduct} />
        </Section>
      )}

      {an && (
        <Section num={2} title="Analysis of the Processing" guidance={an.guidance_note} completion={an.completion_guidance}>
          <SubH>Legal basis (per purpose)</SubH>
          <DataTable columns={[{ key: "purpose", label: "Purpose / use" }, { key: "article_6_basis", label: "Art. 6(1) basis" }, { key: "justification", label: "Justification" }]} rows={an.legal_basis} />
          <SubH>Reasons to lift the prohibition (special categories)</SubH>
          <DataTable columns={[{ key: "data_item", label: "Data item" }, { key: "article_9_condition", label: "Art. 9(2) condition" }, { key: "justification", label: "Justification" }]} rows={an.special_category_conditions} />
          <SubH>Data minimisation & retention</SubH>
          <DataTable columns={[{ key: "data_item", label: "Data item" }, { key: "need_justification", label: "Need" }, { key: "recipients", label: "Recipients" }, { key: "retention_period", label: "Retention" }, { key: "retention_justification", label: "Retention justification" }]} rows={an.data_minimisation_retention} />
          <SubH>Data quality</SubH>
          <DataTable columns={[{ key: "data_item", label: "Data item" }, { key: "metrics", label: "Metrics" }, { key: "justification", label: "Justification" }]} rows={an.data_quality} />
          <SubH>Measures — Article 5(1) principles</SubH>
          <DataTable columns={[{ key: "principle", label: "Principle" }, { key: "measures", label: "Measures" }, { key: "appropriateness", label: "Appropriateness" }, { key: "implementation_status", label: "Status" }]} rows={an.measures_article5} />
          <SubH>Measures — data subject rights</SubH>
          <DataTable columns={[{ key: "right", label: "Right" }, { key: "measures", label: "Measures" }, { key: "appropriateness", label: "Appropriateness" }, { key: "implementation_status", label: "Status" }]} rows={an.measures_rights} />
          <SubH>Measures — other GDPR requirements</SubH>
          <DataTable columns={[{ key: "requirement", label: "Requirement" }, { key: "measures", label: "Measures" }, { key: "appropriateness", label: "Appropriateness" }, { key: "implementation_status", label: "Status" }]} rows={an.measures_other} />
          <SubH>Measures — data protection by design & default (Art. 25)</SubH>
          <DataTable columns={[{ key: "measures", label: "Measures" }, { key: "appropriateness", label: "Appropriateness" }, { key: "implementation_status", label: "Status" }]} rows={an.measures_dpbd} />
          <SubH>Measures — security of processing (Art. 32)</SubH>
          <DataTable columns={[{ key: "measures", label: "Measures" }, { key: "appropriateness", label: "Appropriateness" }, { key: "implementation_status", label: "Status" }]} rows={an.measures_security} />
        </Section>
      )}

      {np && (
        <Section num={3} title="Necessity and Proportionality" guidance={np.guidance_note} completion={np.completion_guidance}>
          <SubH>Design / structural risk impacts <span className="font-normal text-muted-foreground">— risks even if everything works exactly as designed</span></SubH>
          <DataTable columns={[{ key: "threat", label: "Threat" }, { key: "how_materialised", label: "How it materialises" }, { key: "risk_sources", label: "Risk sources" }, { key: "impact_on_rights", label: "Impact on rights" }]} rows={np.design_risk_impacts} />
          <Field label="Necessity assessment" value={np.necessity_assessment} />
          <Field label="Proportionality assessment" value={np.proportionality_assessment} />
        </Section>
      )}

      {rm && (
        <Section num={4} title="Risk Assessment and Management" guidance={rm.guidance_note} completion={rm.completion_guidance}>
          <SubH>Incident / deviation risk impacts <span className="font-normal text-muted-foreground">— when something deviates from the intended state</span></SubH>
          <DataTable columns={[{ key: "threat", label: "Threat" }, { key: "how_materialised", label: "How it materialises" }, { key: "risk_sources", label: "Risk sources" }, { key: "impact_on_rights", label: "Impact on rights" }]} rows={rm.incident_risk_impacts} />
          <Field label="Method" value={rm.method} />
          <SubH>Inherent risk assessment</SubH>
          <DataTable columns={[{ key: "risk", label: "Risk" }, { key: "likelihood", label: "Likelihood" }, { key: "severity", label: "Severity" }, { key: "modulating_factors", label: "Modulating factors" }, { key: "risk_level", label: "Risk level" }, { key: "acceptable", label: "Acceptable?" }]} rows={rm.inherent_risk_assessment} />
          {Array.isArray(report?.annotations) && report.annotations.length > 0 && <AnnotationCallout annotations={report.annotations} />}
          <SubH>Additional mitigating measures</SubH>
          <DataTable columns={[{ key: "measure", label: "Measure" }, { key: "mitigated_risks", label: "Mitigates" }, { key: "appropriateness", label: "Appropriateness" }, { key: "implementation_status", label: "Status" }]} rows={rm.additional_mitigating_measures} />
          <SubH>Residual risk assessment</SubH>
          <DataTable columns={[{ key: "risk", label: "Risk" }, { key: "residual_likelihood", label: "Residual likelihood" }, { key: "residual_severity", label: "Residual severity" }, { key: "residual_risk_level", label: "Residual level" }, { key: "acceptable", label: "Acceptable?" }]} rows={rm.residual_risk_assessment} />
          <Field label="Action plan" value={rm.plan} />
        </Section>
      )}

      {ip && (
        <Section num={5} title="Involvement of Interested Parties" guidance={ip.guidance_note} completion={ip.completion_guidance}>
          <Field label="DPO advice" value={ip.dpo_advice} />
          <Field label="Views of data subjects or their representatives" value={ip.data_subject_views} />
        </Section>
      )}

      {cc && (
        <Section num={6} title="Conclusion and Decision" guidance={cc.guidance_note} completion={cc.completion_guidance}>
          <Field label="Decision" value={cc.decision} />
          {Array.isArray(cc.conditions) && cc.conditions.length > 0 && (
            <div>
              <span className="text-xs uppercase font-medium text-muted-foreground">Conditions</span>
              <ul className="list-disc pl-5 text-sm mt-1">{cc.conditions.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul>
            </div>
          )}
          <Field label="Supervisory authority consultation" value={cc.supervisory_authority_consultation_required} />
          {cc.sign_off_template && (
            <div className="border rounded p-4 bg-muted/30 font-mono text-sm">
              <p className="whitespace-pre-wrap">{cc.sign_off_template}</p>
            </div>
          )}
          <Field label="Review schedule" value={cc.review_schedule} />
          <Field label="Justification" value={cc.justification} />
        </Section>
      )}

      <EnforcementPrecedents
        precedents={report?.enforcement_precedents}
        context="Recent regulator decisions on similar processing activities — review these alongside Section 4 (Risk Assessment and Management)."
      />

      <AuthorityExhibit exhibit={report?.authority_exhibit} />
    </div>
  );
}
