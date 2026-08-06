// Pure presentational body for GDPR Governance Assessment reports.
// Extracted from GovernanceAssessmentResult so sample pages render the
// same UI as the real result page.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import EnforcementPrecedents from "@/components/EnforcementPrecedents";
import { AnnotationCallout, AnnotationBadge } from "@/components/AnnotationCallout";

const ratingColor = (r: string) => {
  const x = (r || "").toLowerCase();
  if (x === "initial") return "bg-brand-navy/10 text-brand-navy";
  if (x === "developing") return "bg-brand-slate-teal/10 text-brand-slate-teal";
  if (x === "defined") return "bg-blue-100 text-blue-800";
  if (x === "managed") return "bg-brand-teal/10 text-brand-teal-text";
  if (x === "optimised" || x === "optimized") return "bg-brand-teal/20 text-brand-teal-text";
  return "bg-muted text-foreground";
};
const sevColor = (s: string) => {
  const x = (s || "").toLowerCase();
  if (x === "critical") return "bg-brand-navy/10 text-brand-navy";
  if (x === "high") return "bg-brand-ocean/10 text-brand-ocean";
  if (x === "medium") return "bg-brand-slate-teal/10 text-brand-slate-teal";
  if (x === "low") return "bg-blue-100 text-blue-800";
  if (x === "compliant") return "bg-brand-teal/10 text-brand-teal-text";
  return "bg-muted text-foreground";
};
const sevBg = (s: string) => {
  const x = (s || "").toLowerCase();
  if (x === "critical") return "bg-brand-navy/5 border-brand-navy/30";
  if (x === "high") return "bg-brand-ocean/5 border-brand-ocean/30";
  if (x === "medium") return "bg-brand-slate-teal/5 border-brand-slate-teal/30";
  if (x === "low") return "bg-blue-50 border-blue-300";
  if (x === "compliant") return "bg-brand-teal/5 border-brand-teal/30";
  return "bg-muted/40 border-border";
};

export interface GovernanceReportBodyProps {
  report: any;
  organizationName?: string | null;
  /** When true, deep-link CTAs point at marketing tool pages, not `?source=<id>`. */
  sampleMode?: boolean;
  assessmentId?: string;
}

export default function GovernanceReportBody({ report = {}, organizationName, sampleMode, assessmentId }: GovernanceReportBodyProps) {
  const [openDomains, setOpenDomains] = useState<string[]>([]);
  const focusDomain = (i: number) => {
    const v = `d${i}`;
    setOpenDomains((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setTimeout(() => {
      document.getElementById(`domain-${v}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const domainList: any[] =
    report?.domain_findings && typeof report.domain_findings === "object" && !Array.isArray(report.domain_findings)
      ? (Object.values(report.domain_findings) as any[])
      : Array.isArray(report?.domain_findings)
        ? report.domain_findings
        : [];

  return (
    <div className="space-y-6 font-serif-text">
      {(report?.overall_readiness_rating || report?.executive_summary) && (
        <section className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-6">
          <h2 className="font-body text-display-card font-semibold mb-3">Executive Summary</h2>
          {organizationName && (
            <p className="text-sm text-foreground mb-3">
              This assessment evaluates the privacy programme of <span className="font-semibold">{organizationName}</span>.
            </p>
          )}
          {report?.overall_readiness_rating && (
            <div className="mb-3">
              <span className={`inline-block px-3 py-1.5 rounded font-medium ${ratingColor(report.overall_readiness_rating)}`}>
                {report.overall_readiness_rating}
              </span>
            </div>
          )}
          {report?.executive_summary && <p className="text-sm text-foreground">{report.executive_summary}</p>}
        </section>
      )}

      {domainList.length > 0 && (
        <section>
          <h2 className="font-body text-display-card font-semibold mb-1">10-Domain Overview</h2>
          <p className="text-sm text-muted-foreground mb-3">Click any domain below for detailed findings</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {domainList.map((d: any, i: number) => (
              <button
                key={i}
                type="button"
                onClick={() => focusDomain(i)}
                className={`text-left border rounded-lg p-3 transition hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${sevBg(d.severity)}`}
                aria-label={`View findings for ${d.domain_name || d.name}`}
              >
                <p className="text-meta font-semibold leading-snug mb-2">{d.domain_name || d.name}</p>
                {d.severity && (
                  <span className={`inline-block px-1.5 py-0.5 text-eyebrow rounded ${sevColor(d.severity)}`}>{d.severity}</span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {Array.isArray(report?.top_three_risks) && report.top_three_risks.length > 0 && (
        <section>
          <h2 className="font-body text-display-card font-semibold mb-3">Top Risks</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {report.top_three_risks.slice(0, 3).map((r: any, i: number) => (
              <div key={i} className="bg-card border rounded-lg p-4">
                <p className="font-medium">{r.risk_name || r.name}</p>
                {r.domain && <p className="text-xs text-muted-foreground">{r.domain}</p>}
                {r.severity && <span className={`inline-block mt-2 px-2 py-1 text-xs rounded ${sevColor(r.severity)}`}>{r.severity}</span>}
                {r.why_urgent && <p className="text-sm mt-2">{r.why_urgent}</p>}
                <AnnotationCallout
                  annotations={(report?.annotations || []).filter(
                    (a: any) => a.relevance?.toLowerCase().includes(
                      (r.risk_title || r.risk_name || r.name || "").toLowerCase().slice(0, 20)
                    )
                  )}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {Array.isArray(report?.immediate_actions) && report.immediate_actions.length > 0 && (
        <section className="bg-card border rounded-lg p-6">
          <h2 className="font-body text-display-card font-semibold mb-3">Immediate Actions</h2>
          <ol className="list-decimal pl-5 space-y-2">
            {report.immediate_actions.map((a: any, i: number) => (
              <li key={i} className="text-sm">
                <span className="font-medium">{a.action || a.name}</span>
                {a.owner && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-muted">{a.owner}</span>}
                {a.timeline && <span className="ml-2 text-xs text-muted-foreground">{a.timeline}</span>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {domainList.length > 0 && (
        <section className="bg-card border rounded-lg p-6">
          <h2 className="font-body text-display-card font-semibold mb-4">Domain Findings</h2>
          <Accordion type="multiple" value={openDomains} onValueChange={setOpenDomains}>
            {domainList.map((d: any, i: number) => (
              <AccordionItem key={i} value={`d${i}`} id={`domain-d${i}`}>
                <AccordionTrigger>
                  <div className="flex items-center gap-3">
                    <span>{d.domain_name || d.name}</span>
                    {d.severity && (
                      <span className={`px-2 py-0.5 text-xs rounded ${sevColor(d.severity)}`}>{d.severity}</span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {d.current_state && <p className="text-sm mb-2"><strong>Current state:</strong> {d.current_state}</p>}
                  {d.gap_description && <p className="text-sm mb-2"><strong>Gap:</strong> {d.gap_description}</p>}
                  {d.regulatory_basis && <p className="text-sm mb-2"><strong>Regulatory basis:</strong> {d.regulatory_basis}</p>}
                  {d.recommended_action && <p className="text-sm mb-2"><strong>Recommended action:</strong> {d.recommended_action}</p>}
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {d.suggested_owner && <span>Owner: {d.suggested_owner}</span>}
                    {d.suggested_timeline && <span>Timeline: {d.suggested_timeline}</span>}
                  </div>
                  <details className="mt-3">
                    <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                      Enforcement citations
                      <AnnotationBadge
                        count={(report?.annotations || []).filter(
                          (a: any) => a.relevance?.toLowerCase().includes(
                            (d.domain_name || "").toLowerCase().slice(0, 15)
                          )
                        ).length}
                      />
                    </summary>
                    <AnnotationCallout
                      annotations={(report?.annotations || []).filter(
                        (a: any) => a.relevance?.toLowerCase().includes(
                          (d.domain_name || "").toLowerCase().slice(0, 15)
                        )
                      )}
                    />
                  </details>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      {Array.isArray(report?.dpia_scope) && report.dpia_scope.length > 0 && (
        <section className="bg-[hsl(var(--cobalt)/0.06)] dark:bg-[hsl(var(--cobalt)/0.15)] border border-[hsl(var(--cobalt)/0.25)] rounded-lg p-6">
          <h2 className="font-body text-display-card font-semibold mb-3">Processing Activities Requiring a Formal DPIA</h2>
          <p className="text-sm text-muted-foreground mb-4">
            The following processing activities identified in your assessment may require a Data Protection Impact Assessment under GDPR Article 35 or equivalent provisions before proceeding.
          </p>
          <ul className="space-y-2 mb-4">
            {report.dpia_scope.map((d: any, i: number) => (
              <li key={i} className="border bg-card rounded p-3">
                <p className="font-medium">{d.processing_activity || d.name}</p>
                {d.regulatory_basis && <p className="text-xs text-muted-foreground">{d.regulatory_basis}</p>}
                {d.priority && <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${sevColor(d.priority)}`}>{d.priority}</span>}
              </li>
            ))}
          </ul>
          <Button asChild>
            <Link to={sampleMode || !assessmentId ? "/dpia-framework" : `/dpia-framework?source=${assessmentId}`}>
              Open Impact Assessment Builder for {report.dpia_scope[0]?.processing_activity || report.dpia_scope[0]?.name} →
            </Link>
          </Button>
        </section>
      )}

      {report?.interaction_effects && (
        <section className="bg-muted/30 border rounded-lg p-6">
          <h2 className="font-body text-display-card font-semibold mb-2">Cross-Domain Considerations</h2>
          <p className="text-sm">{report.interaction_effects}</p>
        </section>
      )}

      <EnforcementPrecedents
        precedents={report?.enforcement_precedents}
        context="Enforcement signals from regulators in your jurisdictions and sector — context for the top three risks above."
      />
    </div>
  );
}
