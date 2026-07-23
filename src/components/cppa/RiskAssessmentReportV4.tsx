// Renderer for the v4-five-stage CPPA Risk Assessment report shape produced by
// the run-cppa-risk-assessment edge function. Schema is documented inline in
// supabase/functions/run-cppa-risk-assessment/index.ts (OUTPUT FORMAT block).

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// CPPA-HF6R Task A — render-layer intake-field-id label map (parity with
// generate-report-pdf/index.ts RISK_INTAKE_FIELD_LABELS). Fail closed:
// route both sides of every conflicting-inputs pair through this map so
// raw ids never render.
const RISK_INTAKE_FIELD_LABELS: Array<[RegExp, string]> = [
  [/^i5_admt_logic$/i, "the ADMT logic description"],
  [/^q19_admt_description$/i, "the ADMT-system description"],
  [/^q20_admt_opt_out$/i, "the ADMT opt-out description"],
  [/^i5_admt_training_source$/i, "the ADMT-training source"],
  [/^q18b?_admt_training$/i, "the ADMT-training answer"],
  [/^q18[a-c]?_admt(?:_[a-z_]+)?$/i, "the ADMT trigger response"],
  [/^i7_internal_contributors$/i, "the internal-contributors roster"],
  [/^i1b_min_pi$/i, "the minimum-PI justification"],
  [/^i1_processing_purpose$/i, "the processing purpose"],
  [/^i2_retention_period$/i, "the recorded retention period"],
  [/^i2_retention_detail$/i, "the recorded retention detail"],
  [/^i2_retention_criteria$/i, "the recorded retention criteria"],
  [/^i6_vendors$/i, "the vendor roster"],
  [/^q15c_spi_volume$/i, "the sensitive-PI volume figure"],
  [/^q1_revenue$/i, "the recorded revenue"],
  [/^impact_intake(?:\.[a-z_]+)?$/i, "the impact-assessment record"],
  [/^exceptions_intake(?:\.[a-z_]+)?$/i, "the exceptions record"],
];
const RAW_FIELD_ID_RE = /^([a-z]{1,3}\d{1,3}[a-z]?_[a-z][a-z0-9_]{2,}|intake_field_\d+)$/i;
export function labelForIntakeFieldId(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return "";
  for (const [re, label] of RISK_INTAKE_FIELD_LABELS) {
    if (re.test(s)) return label;
  }
  if (RAW_FIELD_ID_RE.test(s)) return "the corresponding intake field";
  return s;
}

type Summary = {
  company_name?: string;
  sector?: string;
  assessment_date?: string;
  triggered_activities?: string[];
  exceptions_claimed?: string[];
  exceptions_status?: string;
  overall_risk_level?: "Low" | "Moderate" | "High" | "Critical" | string;
  cybersecurity_audit_required?: boolean;
  admt_disclosure_required?: boolean;
  corpus_enforcement_note?: string;
};

type TriggerDetail = {
  activity?: string;
  statutory_basis?: string;
  data_categories?: string[];
  consumer_categories?: string[];
  assessment_required?: boolean;
  assessment_required_rationale?: string;
};

type Exception = {
  exception_name?: string;
  statutory_basis?: string;
  claimed?: boolean;
  // New advocate-drafter shape (REBUILD-RISK C2)
  facts_supporting?: string;
  argument_strength?: "strong" | "colorable" | "counsel-review" | string;
  argument_strength_rationale?: string;
  strengthen_position?: string[];
  // QB-P25 B3 — pointer(s) into report.strengthen_items[] (single home).
  strengthen_item_ids?: string[];
  // Legacy shape (back-compat for rows generated pre-rebuild)
  scope_described?: string;
  safeguards_described?: string;
  documentation_status?: string;
  validity_assessment?: string;
  flags?: string[];
};

// ── D1 enum display mapping (REBUILD-RISK-UI Task 3) ──
// Stored enum values remain unchanged; map at render only.
const displayInsufficientBasis = (v?: string): string => {
  if (!v) return "";
  if (v === "Insufficient basis to assess" || v === "Insufficient basis") {
    return "Not yet resolved on the record";
  }
  return v;
};

// Human-readable argument-strength label.
const argStrengthLabel = (s?: string): string => {
  const x = (s || "").toLowerCase();
  if (x === "strong") return "Strong";
  if (x === "colorable") return "Colorable";
  if (x === "counsel-review" || x === "counsel review") return "Additional information required";
  return s || "";
};

const argStrengthBadge = (s?: string): string => {
  const x = (s || "").toLowerCase();
  if (x === "strong") return "bg-green-100 text-green-800";
  if (x === "colorable") return "bg-amber-100 text-amber-800";
  if (x === "counsel-review" || x === "counsel review") return "bg-blue-100 text-blue-800";
  return "bg-slate-100 text-slate-800";
};

type AdverseEffect = {
  harm_type?: string;
  likelihood?: string;
  severity?: string;
  description?: string;
};

type ActivityRisk = {
  activity?: string;
  statutory_basis?: string;
  purpose?: string;
  benefits_to_business?: string;
  benefits_to_consumers?: string;
  adverse_effects?: AdverseEffect[];
  current_safeguards?: string;
  safeguard_gaps?: string;
  benefits_outweigh_risks_conclusion?: string;
  benefits_outweigh_risks_rationale?: string;
  section_7152_mapping?: string;
};

type Inconsistency = {
  description?: string;
  intake_field_1?: string;
  intake_field_2?: string;
  regulatory_citation?: string;
  resolution_required?: string;
};

type PriorityAction = {
  action?: string;
  statutory_basis?: string;
  deadline?: string;
  priority?: string;
};

export type V4Report = {
  schema_version?: string;
  assessment_summary?: Summary;
  scope_and_triggers?: { triggered_activities_detail?: TriggerDetail[]; scope_notes?: string };
  exception_analysis?: Exception[];
  risk_assessment_by_activity?: ActivityRisk[];
  inconsistency_flags?: Inconsistency[];
  enforcement_context?: {
    relevant_precedents?: string;
    sector_specific_patterns?: string;
    audit_division_priorities?: string;
  } | string;
  priority_actions?: PriorityAction[];
  cross_tool_recommendations?: {
    cybersecurity_audit?: boolean;
    cybersecurity_audit_rationale?: string;
    admt_assessment?: boolean;
    admt_assessment_rationale?: string;
  };
  document_metadata?: {
    assessment_version?: string;
    statutory_framework?: string;
    compliance_deadline?: string;
    disclaimer?: string;
  };
};

export function isV4Report(rd: any): boolean {
  if (!rd || typeof rd !== "object") return false;
  if (typeof rd.schema_version === "string" && rd.schema_version.startsWith("v4")) return true;
  return !!(rd.assessment_summary || rd.risk_assessment_by_activity);
}

const riskBadge = (level?: string) => {
  switch (level) {
    case "Critical": return "bg-red-600 text-white";
    case "High": return "bg-red-100 text-red-800";
    case "Moderate": return "bg-amber-100 text-amber-800";
    case "Low": return "bg-green-100 text-green-800";
    default: return "bg-slate-100 text-slate-800";
  }
};

const priorityBadge = (p?: string) => {
  if (!p) return "bg-slate-100 text-slate-800";
  if (p.toLowerCase().includes("immediate")) return "bg-red-100 text-red-800";
  if (p.includes("30")) return "bg-amber-100 text-amber-800";
  return "bg-blue-100 text-blue-800";
};

const yn = (b?: boolean) => (b === true ? "Yes" : b === false ? "No" : "—");

export default function RiskAssessmentReportV4({ report }: { report: V4Report }) {
  const s = report.assessment_summary || {};
  const triggers = report.scope_and_triggers?.triggered_activities_detail || [];
  const exceptions = report.exception_analysis || [];
  const activities = report.risk_assessment_by_activity || [];
  const inconsistencies = report.inconsistency_flags || [];
  // QB-P25 B3 — priority_actions sorted by rank (ascending, 1 = highest);
  // entries missing a numeric rank sink to the end preserving input order.
  const actionsRaw = report.priority_actions || [];
  const actions = [...actionsRaw].sort((a: any, b: any) => {
    const ar = typeof a?.rank === "number" ? a.rank : Number.POSITIVE_INFINITY;
    const br = typeof b?.rank === "number" ? b.rank : Number.POSITIVE_INFINITY;
    return ar - br;
  });
  const xtool = report.cross_tool_recommendations || {};
  const enf = report.enforcement_context;

  // QB-P25 B3 — strengthen_items lookup for resolving strengthen_item_ids
  // pointers from exception_analysis / record_sufficiency entries.
  const strengthenItemsMap: Record<string, any> = {};
  for (const it of ((report as any).strengthen_items ?? [])) {
    if (it && typeof it === "object" && typeof it.item_id === "string") {
      strengthenItemsMap[it.item_id] = it;
    }
  }

  return (
    <div className="space-y-6 font-serif-text">
      {/* Header band */}
      <section className="bg-slate-900 text-white rounded-lg p-8">
        <h1 className="font-serif mb-2">CPPA Privacy Risk Assessment</h1>
        <p className="text-slate-300 text-sm">
          {s.company_name ? <>{s.company_name} · </> : null}
          {s.sector ? <>{s.sector} · </> : null}
          {s.assessment_date || ""}
        </p>
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {s.overall_risk_level && (
            <span className={`inline-block px-3 py-1.5 rounded font-medium ${riskBadge(s.overall_risk_level)}`}>
              Overall risk: {displayInsufficientBasis(s.overall_risk_level)}
            </span>
          )}
          {s.exceptions_status && (
            <span className="inline-block px-3 py-1.5 rounded font-medium bg-white/10">
              Exceptions: {displayInsufficientBasis(s.exceptions_status === "Material gaps identified" ? "Material deficiencies identified" : s.exceptions_status)}
            </span>
          )}
          <span className="inline-block px-3 py-1.5 rounded font-medium bg-white/10">
            Cybersecurity audit required: {yn(s.cybersecurity_audit_required)}
          </span>
          <span className="inline-block px-3 py-1.5 rounded font-medium bg-white/10">
            ADMT disclosure required: {yn(s.admt_disclosure_required)}
          </span>
        </div>
        {s.corpus_enforcement_note && (
          <p className="mt-4 text-sm text-slate-200">{s.corpus_enforcement_note}</p>
        )}
      </section>

      {/* Triggered activities */}
      {triggers.length > 0 && (
        <section className="bg-card border rounded-lg p-6">
          <h2 className="font-body text-display-card font-semibold mb-3">Scope & Triggered Activities</h2>
          {report.scope_and_triggers?.scope_notes && (
            <p className="text-sm text-muted-foreground mb-4">{report.scope_and_triggers.scope_notes}</p>
          )}
          <div className="space-y-3">
            {triggers.map((t, i) => (
              <div key={i} className="border rounded p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <p className="font-medium">{t.activity}</p>
                  {t.statutory_basis && (
                    <span className="font-mono text-xs text-brand-teal-text">{t.statutory_basis}</span>
                  )}
                </div>
                {(t.data_categories?.length || t.consumer_categories?.length) ? (
                  <div className="grid sm:grid-cols-2 gap-3 mt-3 text-sm">
                    {t.data_categories?.length ? (
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">Data categories</p>
                        <p>{t.data_categories.join(", ")}</p>
                      </div>
                    ) : null}
                    {t.consumer_categories?.length ? (
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">Consumer categories</p>
                        <p>{t.consumer_categories.join(", ")}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {t.assessment_required_rationale && (
                  <p className="text-sm mt-3">
                    <strong>Assessment required:</strong> {yn(t.assessment_required)} — {t.assessment_required_rationale}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Exceptions */}
      {exceptions.length > 0 && (
        <section className="bg-card border rounded-lg p-6">
          <h2 className="font-body text-display-card font-semibold mb-3">§ 7152 Exception Analysis</h2>
          <Accordion type="multiple">
            {exceptions.map((e, i) => {
              // Branch on field presence: new advocate-drafter shape vs legacy shape.
              const resolvedStrengthen: any[] = Array.isArray(e.strengthen_item_ids)
                ? e.strengthen_item_ids.map((id) => strengthenItemsMap[id]).filter(Boolean)
                : [];
              const hasNew = !!(e.facts_supporting || e.argument_strength || (Array.isArray(e.strengthen_position) && e.strengthen_position.length) || resolvedStrengthen.length);
              const hasOld = !!(e.documentation_status || e.validity_assessment || e.scope_described || e.safeguards_described);
              return (
                <AccordionItem key={i} value={`e${i}`}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span>{e.exception_name || "Exception"}</span>
                      {e.statutory_basis && <span className="font-mono text-xs text-brand-teal-text">{e.statutory_basis}</span>}
                      {hasNew && e.argument_strength && (
                        <span className={`text-xs px-2 py-0.5 rounded ${argStrengthBadge(e.argument_strength)}`}>
                          {argStrengthLabel(e.argument_strength)}
                        </span>
                      )}
                      {!hasNew && e.documentation_status && (
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800">{e.documentation_status}</span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2 text-sm">
                    {hasNew ? (
                      <>
                        {e.facts_supporting && (
                          <div>
                            <p className="font-semibold">Facts supporting the exception</p>
                            <p>{e.facts_supporting}</p>
                          </div>
                        )}
                        {e.argument_strength && (
                          <div>
                            <p className="font-semibold">
                              {argStrengthLabel(e.argument_strength) === "Additional information required"
                                ? "Additional information required"
                                : `Argument strength: ${argStrengthLabel(e.argument_strength)}`}
                            </p>
                            {e.argument_strength_rationale && <p>{e.argument_strength_rationale}</p>}
                          </div>
                        )}
                        {(resolvedStrengthen.length > 0 || (Array.isArray(e.strengthen_position) && e.strengthen_position.length > 0)) && (
                          <div>
                            <p className="font-semibold">What would strengthen the position</p>
                            <ul className="list-disc pl-5">
                              {resolvedStrengthen.map((it, si) => (
                                <li key={`ptr-${si}`}>
                                  {it.recorded_basis || it.item_id}
                                  {(it.citation || (Array.isArray(it.field_ids) && it.field_ids.length)) && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      {it.citation ? <span className="font-mono">{it.citation}</span> : null}
                                      {Array.isArray(it.field_ids) && it.field_ids.length ? <> · fields: {it.field_ids.join(", ")}</> : null}
                                    </span>
                                  )}
                                </li>
                              ))}
                              {Array.isArray(e.strengthen_position) && e.strengthen_position.map((sp, si) => <li key={`sp-${si}`}>{sp}</li>)}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : hasOld ? (
                      <>
                        {e.scope_described && <p><strong>Scope:</strong> {e.scope_described}</p>}
                        {e.safeguards_described && <p><strong>Safeguards:</strong> {e.safeguards_described}</p>}
                        {e.validity_assessment && <p><strong>Validity:</strong> {e.validity_assessment}</p>}
                      </>
                    ) : (
                      <p className="text-muted-foreground italic">No detail recorded for this exception.</p>
                    )}
                    {Array.isArray(e.flags) && e.flags.length > 0 && (
                      <div>
                        <p className="font-semibold">Flags</p>
                        <ul className="list-disc pl-5">
                          {e.flags.map((f, fi) => <li key={fi}>{f}</li>)}
                        </ul>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </section>
      )}

      {/* Risk by activity */}
      {activities.length > 0 && (
        <section className="bg-card border rounded-lg p-6">
          <h2 className="font-body text-display-card font-semibold mb-3">Risk Assessment by Activity (§ 7153)</h2>
          <Accordion type="multiple">
            {activities.map((a, i) => (
              <AccordionItem key={i} value={`a${i}`}>
                <AccordionTrigger>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span>{a.activity || `Activity ${i + 1}`}</span>
                    {a.statutory_basis && <span className="font-mono text-xs text-brand-teal-text">{a.statutory_basis}</span>}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm">
                  {a.purpose && <p><strong>Purpose:</strong> {a.purpose}</p>}
                  {(a.benefits_to_business || a.benefits_to_consumers) && (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {a.benefits_to_business && (
                        <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Benefits to business</p><p>{a.benefits_to_business}</p></div>
                      )}
                      {a.benefits_to_consumers && (
                        <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Benefits to consumers</p><p>{a.benefits_to_consumers}</p></div>
                      )}
                    </div>
                  )}
                  {Array.isArray(a.adverse_effects) && a.adverse_effects.length > 0 && (
                    <div>
                      <p className="font-semibold mb-1">Adverse effects</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="text-left bg-muted/40">
                            <tr><th className="p-2">Harm</th><th className="p-2">Likelihood</th><th className="p-2">Severity</th><th className="p-2">Description</th></tr>
                          </thead>
                          <tbody>
                            {a.adverse_effects.map((h, hi) => (
                              <tr key={hi} className="border-t align-top">
                                <td className="p-2">{h.harm_type}</td>
                                <td className="p-2">{h.likelihood}</td>
                                <td className="p-2">{h.severity}</td>
                                <td className="p-2">{h.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {a.current_safeguards && <p><strong>Current safeguards:</strong> {a.current_safeguards}</p>}
                  {a.safeguard_gaps && <p><strong>Safeguard gaps:</strong> {a.safeguard_gaps}</p>}
                  {(a.benefits_outweigh_risks_conclusion || a.benefits_outweigh_risks_rationale) && (
                    <div className="border-l-4 border-brand-teal pl-3">
                      {a.benefits_outweigh_risks_conclusion && (
                        <p><strong>Benefits-outweigh-risks conclusion:</strong> {a.benefits_outweigh_risks_conclusion}</p>
                      )}
                      {a.benefits_outweigh_risks_rationale && (
                        <p className="mt-1">{a.benefits_outweigh_risks_rationale}</p>
                      )}
                    </div>
                  )}
                  {a.section_7152_mapping && (
                    <p className="text-xs text-muted-foreground"><strong>§ 7152 mapping:</strong> {a.section_7152_mapping}</p>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      {/* Inconsistency flags */}
      {inconsistencies.length > 0 && (
        <section className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded p-4">
          <h2 className="font-body text-display-card font-semibold mb-2 text-amber-900 dark:text-amber-200">Inconsistency Flags</h2>
          <ul className="space-y-2 text-sm">
            {inconsistencies.map((f, i) => (
              <li key={i} className="border-l-2 border-amber-400 pl-3">
                <p>{f.description}</p>
                {(f.intake_field_1 || f.intake_field_2) && (
                  <p className="text-xs text-muted-foreground">
                    Between: {labelForIntakeFieldId(f.intake_field_1)}{f.intake_field_2 ? <> ↔ {labelForIntakeFieldId(f.intake_field_2)}</> : null}
                  </p>
                )}
                {f.regulatory_citation && (
                  <p className="font-mono text-xs text-brand-teal-text">{f.regulatory_citation}</p>
                )}
                {f.resolution_required && <p className="text-xs"><strong>Resolution:</strong> {f.resolution_required}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Priority actions */}
      {actions.length > 0 && (
        <section className="bg-card border rounded-lg p-6">
          <h2 className="font-body text-display-card font-semibold mb-3">Priority Actions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left bg-muted/40">
                <tr><th className="p-2">Action</th><th className="p-2">Basis</th><th className="p-2">Deadline</th><th className="p-2">Priority</th></tr>
              </thead>
              <tbody>
                {actions.map((a, i) => (
                  <tr key={i} className="border-t align-top">
                    <td className="p-2">{a.action}</td>
                    <td className="p-2 font-mono text-xs">{a.statutory_basis}</td>
                    <td className="p-2">{a.deadline}</td>
                    <td className="p-2"><span className={`px-2 py-0.5 text-xs rounded ${priorityBadge(a.priority)}`}>{a.priority}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Cross-tool recommendations */}
      {(xtool.cybersecurity_audit_rationale || xtool.admt_assessment_rationale) && (
        <section className="bg-card border rounded-lg p-6">
          <h2 className="font-body text-display-card font-semibold mb-3">Cross-Tool Recommendations</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="border rounded p-3">
              <p className="font-medium">Cybersecurity Audit: {yn(xtool.cybersecurity_audit)}</p>
              {xtool.cybersecurity_audit_rationale && <p className="mt-1">{xtool.cybersecurity_audit_rationale}</p>}
            </div>
            <div className="border rounded p-3">
              <p className="font-medium">ADMT Assessment: {yn(xtool.admt_assessment)}</p>
              {xtool.admt_assessment_rationale && <p className="mt-1">{xtool.admt_assessment_rationale}</p>}
            </div>
          </div>
        </section>
      )}

      {/* Enforcement context */}
      {enf && (typeof enf === "string"
        ? enf.trim() && (
            <section className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 text-sm rounded">
              <p className="font-semibold mb-1">Enforcement Context</p>
              <p>{enf}</p>
            </section>
          )
        : (enf.relevant_precedents || enf.sector_specific_patterns || enf.audit_division_priorities) && (
            <section className="bg-card border rounded-lg p-6 text-sm space-y-2">
              <h2 className="font-body text-display-card font-semibold mb-2">Enforcement Context</h2>
              {enf.relevant_precedents && <p><strong>Relevant precedents:</strong> {enf.relevant_precedents}</p>}
              {enf.sector_specific_patterns && <p><strong>Sector patterns:</strong> {enf.sector_specific_patterns}</p>}
              {enf.audit_division_priorities && <p><strong>Audit Division priorities:</strong> {enf.audit_division_priorities}</p>}
            </section>
          ))}

      {/* Disclaimer */}
      {report.document_metadata?.disclaimer && (
        <p className="text-xs text-muted-foreground italic">{report.document_metadata.disclaimer}</p>
      )}
    </div>
  );
}
