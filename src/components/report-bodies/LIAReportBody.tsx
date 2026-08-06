// Pure presentational body for Legitimate Interest Assessment (LIA) reports.
// Extracted from LIAssessmentResult so sample pages render the same UI.
//
// UPGRADE-4 — the ICO three-part arc (Purpose → Necessity → Balancing) is the
// narrative spine. The eleven Upgrade-4 findings render inside their stage, in
// arc order, followed by the attestation block and then the shared authority
// exhibit, which sits immediately before the universal disclaimer supplied by
// ReportShell.
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import EnforcementPrecedents from "@/components/EnforcementPrecedents";
import AuthorityExhibit from "@/components/report/AuthorityExhibit";
import { AlertTriangle, Ban, ClipboardList } from 'lucide-react';

// ── UPGRADE-4 shared finding chrome ───────────────────────────────────
const STATUS_TONE: Record<string, string> = {
  record_sufficient: "bg-brand-teal/10 text-brand-teal-text dark:bg-brand-teal/40 dark:text-brand-teal",
  record_partial: "bg-brand-slate-teal/10 text-brand-slate-teal dark:bg-brand-slate-teal/40 dark:text-brand-light-teal",
  record_insufficient: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};
const statusLabel = (s?: string) =>
  ({ record_sufficient: "Record sufficient", record_partial: "Record partial", record_insufficient: "Record insufficient" } as Record<string, string>)[s || ""] ??
  String(s || "").replace(/_/g, " ");

const FindingCard = ({ title, finding, children }: { title: string; finding?: any; children?: React.ReactNode }) => {
  if (!finding) return null;
  return (
    <div className="bg-card border rounded-lg p-5">
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <h3 className="font-body text-display-card font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          {finding.verdict && (
            <span className={`px-2 py-1 text-xs rounded ${verdictColor(String(finding.verdict))}`}>
              {verdictLabel(String(finding.verdict))}
            </span>
          )}
          {finding.status && (
            <span className={`px-2 py-1 text-xs rounded ${STATUS_TONE[finding.status] || STATUS_TONE.record_insufficient}`}>
              {statusLabel(finding.status)}
            </span>
          )}
        </div>
      </div>
      {finding.standard && (
        <blockquote className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-3 mb-2 italic">
          {finding.standard}
          {finding.standard_citation && <span className="not-italic"> — {finding.standard_citation}</span>}
        </blockquote>
      )}
      {finding.record_fact && <p className="text-sm text-muted-foreground mb-2">{finding.record_fact}</p>}
      {finding.application && <p className="text-sm text-foreground mb-2">{finding.application}</p>}
      {finding.analysis && <p className="text-sm text-foreground mb-2">{finding.analysis}</p>}
      {children}
      {finding.cumulative_note && <p className="text-sm text-muted-foreground mt-2">{finding.cumulative_note}</p>}
      {finding.information_needed && (
        <p className="text-xs text-muted-foreground mt-2 italic">Information needed — {finding.information_needed}</p>
      )}
      {(finding.supporting_citation || finding.citation) && (
        <p className="text-xs text-muted-foreground mt-2">Authority: {finding.citation || finding.supporting_citation}</p>
      )}

    </div>
  );
};

const KeyValueRows = ({ rows }: { rows: [string, any][] }) => {
  const present = rows.filter(([, v]) => v != null && String(v).trim() !== "");
  if (present.length === 0) return null;
  return (
    <dl className="text-sm mt-1 space-y-1">
      {present.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <dt className="font-medium text-muted-foreground min-w-[10rem]">{k}</dt>
          <dd className="text-foreground">{String(v)}</dd>
        </div>
      ))}
    </dl>
  );
};


const strengthColor = (s: string) => {
  const v = (s || "").toLowerCase();
  if (v === "strong") return "bg-brand-teal/10 text-brand-teal-text dark:bg-brand-teal/40 dark:text-brand-teal";
  if (v === "moderate") return "bg-brand-slate-teal/10 text-brand-slate-teal dark:bg-brand-slate-teal/40 dark:text-brand-light-teal";
  return "bg-brand-navy/10 text-brand-navy dark:bg-brand-navy/40 dark:text-brand-mist";
};
const verdictColor = (v: string) => {
  const x = (v || "").toLowerCase();
  if (x.includes("pass")) return "bg-brand-teal/10 text-brand-teal-text";
  if (x.includes("fail")) return "bg-brand-navy/10 text-brand-navy";
  return "bg-brand-slate-teal/10 text-brand-slate-teal";
};
const verdictLabel = (v: string) =>
  ({ likely_passes: "Likely passes", likely_fails: "Likely fails", passes: "Passes", fails: "Fails", uncertain: "Uncertain" } as Record<string, string>)[v] ?? v.replace(/_/g, " ");

const tierLabelFor = (tier: number | null | undefined, isUk: boolean) => {
  if (tier === 1) return { label: isUk ? "UK GDPR enforcement" : "EU GDPR enforcement", tone: "bg-brand-teal/10 text-brand-teal-text border-brand-teal/20" };
  if (tier === 2) return { label: isUk ? "Persuasive — EU decision (not binding under UK GDPR)" : "Persuasive — UK decision (not binding under EU GDPR)", tone: "bg-brand-slate-teal/10 text-brand-slate-teal border-brand-slate-teal/20" };
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
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide"><ClipboardList aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Corpus citation</span>
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
      <h3 className="font-body text-display-card font-semibold ">{title}</h3>
      {test?.verdict && <span className={`px-2 py-1 text-xs rounded ${verdictColor(test.verdict)}`}>{verdictLabel(test.verdict)}</span>}
    </div>
    {test?.analysis && <p className="text-sm text-foreground mb-3">{test.analysis}</p>}
    {test?.special_category_flag && (
      <div className="text-sm p-2 bg-brand-slate-teal/5 border border-brand-slate-teal/20 rounded mb-3 text-brand-slate-teal">
        <AlertTriangle aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Special category data — heightened scrutiny applies
      </div>
    )}
    {Array.isArray(test?.supporting_factors) && test.supporting_factors.length > 0 && (
      <div className="mb-2">
        <p className="text-xs font-medium text-brand-teal-text mb-1">Supporting factors</p>
        <ul className="list-disc pl-5 text-sm space-y-1">{test.supporting_factors.map((f: string, i: number) => <li key={i}>{f}</li>)}</ul>
      </div>
    )}
    {Array.isArray(test?.risk_factors) && test.risk_factors.length > 0 && (
      <div>
        <p className="text-xs font-medium text-brand-navy mb-1">Risk factors</p>
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
    <div className="space-y-6 font-serif-text">
      <section className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-6">
        <h2 className="font-body text-display-card font-semibold mb-3">Assessment Summary</h2>
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

      {/* UPGRADE-4 — PURPOSE STAGE */}
      {(report?.interest_legitimacy || report?.benefit_and_beneficiary) && (
        <section className="space-y-4">
          <h2 className="font-body text-display-card font-semibold">Purpose — Is the interest legitimate?</h2>
          <FindingCard title="Legitimacy of the interest" finding={report?.interest_legitimacy}>
            {Array.isArray(report?.interest_legitimacy?.sub_tests) && report.interest_legitimacy.sub_tests.length > 0 && (
              <ul className="space-y-2 mt-2">
                {report.interest_legitimacy.sub_tests.map((t: any, i: number) => (
                  <li key={t?.id ?? i} className="border-l-2 border-slate-300 dark:border-slate-600 pl-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{t?.label}</span>
                      {t?.verdict && <span className={`px-1.5 py-0.5 text-[10px] rounded ${verdictColor(String(t.verdict))}`}>{verdictLabel(String(t.verdict))}</span>}
                    </div>
                    {t?.reasoning && <p className="text-sm text-muted-foreground mt-0.5">{t.reasoning}</p>}
                    {t?.information_needed && <p className="text-xs text-muted-foreground mt-0.5 italic">{t.information_needed}</p>}
                  </li>
                ))}
              </ul>
            )}
          </FindingCard>
          <FindingCard title="Benefit and beneficiary" finding={report?.benefit_and_beneficiary}>
            <KeyValueRows
              rows={[
                ["Benefit", report?.benefit_and_beneficiary?.benefit],
                ["Beneficiaries", (report?.benefit_and_beneficiary?.beneficiary_labels || report?.benefit_and_beneficiary?.beneficiaries || []).join(", ")],
              ]}
            />
          </FindingCard>
        </section>
      )}

      {/* UPGRADE-4 — NECESSITY STAGE */}
      {report?.alternatives_considered && (
        <section className="space-y-4">
          <h2 className="font-body text-display-card font-semibold">Necessity — Were less intrusive options ruled out?</h2>
          <FindingCard title="Alternatives considered" finding={report?.alternatives_considered}>
            {Array.isArray(report?.alternatives_considered?.alternatives) && report.alternatives_considered.alternatives.length > 0 && (
              <ul className="space-y-2 mt-2">
                {report.alternatives_considered.alternatives.map((a: any, i: number) => (
                  <li key={i} className="border-l-2 border-slate-300 dark:border-slate-600 pl-3">
                    <p className="text-sm font-medium">{a?.alternative}</p>
                    {a?.why_inadequate && <p className="text-sm text-muted-foreground mt-0.5">{a.why_inadequate}</p>}
                  </li>
                ))}
              </ul>
            )}
          </FindingCard>
        </section>
      )}

      {/* UPGRADE-4 — BALANCING STAGE */}
      {(report?.relationship_with_individual || report?.scale_frequency_duration || report?.potential_harms || report?.opt_out_feasibility) && (
        <section className="space-y-4">
          <h2 className="font-body text-display-card font-semibold">Balancing — The individual's side of the scale</h2>
          <FindingCard title="Relationship with the individual" finding={report?.relationship_with_individual}>
            <KeyValueRows
              rows={[
                ["Category", report?.relationship_with_individual?.category_label || report?.relationship_with_individual?.category],
                ["Recorded in the record", report?.relationship_with_individual?.explicitly_recorded ? "Yes" : "No"],
              ]}
            />
          </FindingCard>
          <FindingCard title="Scale, frequency and duration" finding={report?.scale_frequency_duration}>
            {Array.isArray(report?.scale_frequency_duration?.dimensions) && (
              <ul className="space-y-1 mt-2">
                {report.scale_frequency_duration.dimensions.map((d: any, i: number) => (
                  <li key={d?.id ?? i} className="text-sm">
                    <span className="font-medium">{d?.label}: </span>
                    <span className="text-muted-foreground">{d?.recorded || statusLabel(d?.status)}</span>
                  </li>
                ))}
              </ul>
            )}
          </FindingCard>
          <FindingCard title="Potential harms" finding={report?.potential_harms}>
            {Array.isArray(report?.potential_harms?.harms) && report.potential_harms.harms.length > 0 && (
              <ul className="space-y-2 mt-2">
                {report.potential_harms.harms.map((h: any, i: number) => (
                  <li key={i} className="border-l-2 border-slate-300 dark:border-slate-600 pl-3">
                    <p className="text-sm font-medium">{h?.harm}{h?.severity ? ` — ${h.severity}` : ""}</p>
                    {h?.bearing_on_balance && <p className="text-sm text-muted-foreground mt-0.5">{h.bearing_on_balance}</p>}
                  </li>
                ))}
              </ul>
            )}
          </FindingCard>
          <FindingCard title="Opt-out feasibility" finding={report?.opt_out_feasibility}>
            <KeyValueRows
              rows={[
                ["Feasibility", report?.opt_out_feasibility?.feasibility],
                ["Mechanism", report?.opt_out_feasibility?.mechanism],
              ]}
            />
          </FindingCard>
        </section>
      )}



      {Array.isArray(overall?.blocking_issues) && overall.blocking_issues.length > 0 && (
        <section className="border-l-4 border-brand-navy bg-brand-navy/5 dark:bg-brand-navy/40 rounded-lg p-5">
          <h3 className="font-body text-display-card font-semibold text-brand-navy dark:text-brand-mist mb-3"><Ban aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Blocking Issues — Resolve Before Relying on Legitimate Interest</h3>
          <ul className="space-y-2">
            {overall.blocking_issues.map((issue: string, i: number) => (
              <li key={i} className="text-sm text-brand-navy dark:text-brand-mist flex gap-2">
                <span className="font-mono">•</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-card border rounded-lg p-6">
        <h2 className="font-body text-display-card font-semibold mb-4">Most Analogous Regulatory Decisions</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 border rounded">
            <h3 className="font-body text-display-card font-semibold text-brand-teal-text mb-2">Accepted Cases</h3>
            <p className="text-sm">{overall?.closest_accepted_precedent || "No closely analogous accepted precedents found in tracked database"}</p>
          </div>
          <div className="p-4 border rounded">
            <h3 className="font-body text-display-card font-semibold text-brand-navy mb-2">Rejected Cases</h3>
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
          <h2 className="font-body text-display-card font-semibold mb-4">Recommended Documentation for Your LIA Record</h2>
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
              <h3 className="font-body text-display-card font-semibold mt-4 mb-2">Balancing Record — Must Include</h3>
              <ol className="list-decimal pl-5 text-sm space-y-1">{docs.balancing_record_elements.map((e: string, i: number) => <li key={i}>{e}</li>)}</ol>
            </>
          )}
        </section>
      )}

      <section className="bg-card border rounded-lg p-6">
        <h3 className="font-body text-display-card font-semibold mb-2">Does this processing require a DPIA?</h3>
        <p className="text-sm text-muted-foreground mb-3">
          If your assessment identifies high-risk processing, you may be required to conduct a Data Protection Impact Assessment under GDPR Article 35.
        </p>
        <Button asChild><Link to="/dpia-framework">Open Impact Assessment Builder →</Link></Button>
      </section>

      {/* UPGRADE-4 — ATTESTATION (close of the body) */}
      {report?.attestation_block && (
        <section className="bg-card border rounded-lg p-6">
          <h2 className="font-body text-display-card font-semibold mb-3">Attestation and Review</h2>
          {report.attestation_block.text && (
            <p className="text-sm text-foreground mb-3">{report.attestation_block.text}</p>
          )}
          <KeyValueRows
            rows={[
              ["DPO review — who", report.attestation_block.dpo_review?.reviewer],
              ["DPO review — when", report.attestation_block.dpo_review?.review_date],
              ["Approved by", (report.attestation_block.approvers || []).map((a: any) => [a?.name, a?.position].filter(Boolean).join(", ")).join("; ")],
              ["Date of approval", report.attestation_block.approval_date],
            ]}
          />
          {Array.isArray(report.attestation_block.review_triggers) && report.attestation_block.review_triggers.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-1">Re-review triggers{report.attestation_block.triggers_are_default ? " (standard set)" : ""}</p>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {report.attestation_block.review_triggers.map((t: string, i: number) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
          {report.attestation_block.information_needed && (
            <p className="text-xs text-muted-foreground mt-3 italic">Information needed — {report.attestation_block.information_needed}</p>
          )}

        </section>
      )}

      {/* UPGRADE-4 — AUTHORITY EXHIBIT, immediately before the universal disclaimer */}
      <AuthorityExhibit exhibit={report?.authority_exhibit} />

    </div>
  );
}
