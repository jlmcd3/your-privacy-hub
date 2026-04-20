import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import EnforcementPrecedents from "@/components/EnforcementPrecedents";
import { supabase } from "@/integrations/supabase/client";

const ratingColor = (r: string) => {
  const x = (r || "").toLowerCase();
  if (x === "initial") return "bg-red-100 text-red-800";
  if (x === "developing") return "bg-amber-100 text-amber-800";
  if (x === "defined") return "bg-blue-100 text-blue-800";
  if (x === "managed") return "bg-green-100 text-green-800";
  if (x === "optimised" || x === "optimized") return "bg-emerald-200 text-emerald-900";
  return "bg-muted text-foreground";
};
const sevColor = (s: string) => {
  const x = (s || "").toLowerCase();
  if (x === "critical") return "bg-red-100 text-red-800";
  if (x === "high") return "bg-orange-100 text-orange-800";
  if (x === "medium") return "bg-amber-100 text-amber-800";
  if (x === "low") return "bg-blue-100 text-blue-800";
  if (x === "compliant") return "bg-green-100 text-green-800";
  return "bg-muted text-foreground";
};

const GovernanceAssessmentResult = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const purchased = searchParams.get("purchased") === "true";
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let timer: any;
    const fetchOnce = async () => {
      const { data } = await supabase.from("governance_assessments").select("*").eq("id", id).maybeSingle();
      setAssessment(data);
      setLoading(false);
      if (data && (data.status === "pending" || data.status === "processing")) {
        timer = setTimeout(fetchOnce, 4000);
      }
    };
    fetchOnce();
    return () => timer && clearTimeout(timer);
  }, [id]);

  const report = assessment?.report_data || {};
  const intake = assessment?.intake_data || {};
  const status = assessment?.status;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet><title>Privacy Programme Assessment | EndUserPrivacy</title></Helmet>
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {purchased && (
          <div className="p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-950/20 rounded text-sm">
            ✅ Purchase confirmed. Your assessment is being generated.
          </div>
        )}
        {loading && <p>Loading…</p>}

        {!loading && (status === "pending" || status === "processing") && (
          <div className="bg-card border rounded-lg p-10 text-center">
            <div className="animate-pulse mb-4 text-2xl">⏳</div>
            <p>Running your governance assessment.</p>
            <p className="text-muted-foreground text-sm mt-1">This typically takes 45-60 seconds.</p>
          </div>
        )}

        {status === "failed" && (
          <div className="bg-card border rounded-lg p-6">
            <p className="font-medium text-red-700 mb-3">Assessment failed.</p>
            <Button asChild><Link to="/governance-assessment">Try Again</Link></Button>
          </div>
        )}

        {status === "complete" && (
          <>
            {/* Cover */}
            <section className="bg-slate-900 text-white rounded-lg p-8">
              <h1 className="text-3xl font-serif mb-2">Privacy Programme Assessment</h1>
              <p className="text-slate-300 text-sm">
                {intake.sector ? `${intake.sector} · ` : ""}{report?.generated_at ? new Date(report.generated_at).toLocaleDateString() : ""}
              </p>
              {report?.overall_readiness_rating && (
                <div className="mt-4">
                  <span className={`inline-block px-3 py-1.5 rounded font-medium ${ratingColor(report.overall_readiness_rating)}`}>
                    {report.overall_readiness_rating}
                  </span>
                </div>
              )}
              {report?.executive_summary && <p className="mt-4 text-slate-200">{report.executive_summary}</p>}
            </section>

            {/* Top risks */}
            {Array.isArray(report?.top_risks) && report.top_risks.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3">Top Risks</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  {report.top_risks.slice(0, 3).map((r: any, i: number) => (
                    <div key={i} className="bg-card border rounded-lg p-4">
                      <p className="font-medium">{r.risk_name || r.name}</p>
                      {r.domain && <p className="text-xs text-muted-foreground">{r.domain}</p>}
                      {r.severity && <span className={`inline-block mt-2 px-2 py-1 text-xs rounded ${sevColor(r.severity)}`}>{r.severity}</span>}
                      {r.why_urgent && <p className="text-sm mt-2">{r.why_urgent}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Immediate Actions */}
            {Array.isArray(report?.immediate_actions) && report.immediate_actions.length > 0 && (
              <section className="bg-card border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-3">Immediate Actions</h2>
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

            {/* Ten Domains */}
            {Array.isArray(report?.domain_findings) && (
              <section className="bg-card border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Domain Findings</h2>
                <Accordion type="multiple">
                  {report.domain_findings.map((d: any, i: number) => (
                    <AccordionItem key={i} value={`d${i}`}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3">
                          <span>{d.domain_name || d.name}</span>
                          {d.severity && <span className={`px-2 py-0.5 text-xs rounded ${sevColor(d.severity)}`}>{d.severity}</span>}
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
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            )}

            {/* DPIA Scope */}
            {Array.isArray(report?.dpia_scope) && report.dpia_scope.length > 0 && (
              <section className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-3">Processing Activities Requiring a Formal DPIA</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  The following processing activities identified in your assessment may require a Data Protection Impact Assessment under GDPR Article 35 or equivalent provisions before proceeding. This list is provided as a starting point for review with your Data Protection Officer or legal counsel.
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
                  <Link to={`/dpia-framework?source=${id}`}>Open Impact Assessment Builder for {report.dpia_scope[0]?.processing_activity || report.dpia_scope[0]?.name} →</Link>
                </Button>
              </section>
            )}

            {report?.interaction_effects && (
              <section className="bg-muted/30 border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-2">Cross-Domain Considerations</h2>
                <p className="text-sm">{report.interaction_effects}</p>
              </section>
            )}

            <EnforcementPrecedents
              precedents={report?.enforcement_precedents}
              context="Enforcement signals from regulators in your jurisdictions and sector — context for the top three risks above."
            />

            <section className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 text-sm rounded">
              ⚠️ {report?.disclaimer || "This is a compliance framework tool. Review findings with qualified legal counsel."}
            </section>

            <div className="flex gap-2 flex-wrap">
              <Button asChild variant="outline"><Link to="/governance-assessment">Run New Assessment</Link></Button>
              <Button asChild><Link to="/dashboard">Back to Dashboard</Link></Button>
              {assessment?.pdf_url ? (
                <a
                  href={assessment.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-semibold text-white bg-gradient-to-br from-slate-700 to-blue-700 rounded-lg hover:opacity-90 transition-all no-underline"
                >
                  ↓ Download PDF
                </a>
              ) : (
                <button
                  disabled
                  className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-semibold text-muted-foreground bg-muted rounded-lg cursor-not-allowed"
                  title="PDF is being prepared — refresh in a moment"
                >
                  ↓ PDF preparing...
                </button>
              )}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default GovernanceAssessmentResult;
