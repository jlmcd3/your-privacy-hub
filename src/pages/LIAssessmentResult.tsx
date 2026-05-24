import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import EnforcementPrecedents from "@/components/EnforcementPrecedents";
import { supabase } from "@/integrations/supabase/client";
import BackLink from "@/components/dashboard/BackLink";
import { ClientContextBadge } from "@/components/clients/ClientContextBadge";
import DownloadWordButton from "@/components/DownloadWordButton";

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

const AnnotationCallout = ({ annotations }: { annotations: any[] }) => {
  if (!Array.isArray(annotations) || annotations.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      {annotations.map((a: any, i: number) => (
        <div key={i} className="bg-slate-50 dark:bg-slate-900/40 border-l-2 border-slate-300 dark:border-slate-600 rounded-r px-3 py-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                📋 Corpus citation
              </span>
              <p className="text-xs text-foreground mt-0.5">
                <span className="font-medium">{a.regulator}</span>
                {a.jurisdiction ? ` · ${a.jurisdiction}` : ""}
                {a.decision_date ? ` · ${a.decision_date?.slice(0,7)}` : ""}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{a.summary}</p>
              {a.relevance && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 italic">{a.relevance}</p>
              )}
            </div>
            {a.enforcement_action_id && (
              <Link
                to={`/enforcement-intelligence/${a.enforcement_action_id}`}
                className="text-[11px] text-blue-700 hover:underline shrink-0 whitespace-nowrap"
              >
                View case →
              </Link>
            )}
          </div>
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground italic mt-1 leading-relaxed">
        Enforcement citations are drawn from enforcement actions tracked by EUP on a regular basis. Actual enforcement actions can lag publication, so please review primary sources and consult qualified legal counsel before relying on any regulatory position.
      </p>
    </div>
  );
};

const TestCard = ({ title, test, annotations }: { title: string; test: any; annotations?: any[] }) => (
  <div className="bg-card border rounded-lg p-5">
    <div className="flex items-center justify-between mb-3">
      <h3 className="">{title}</h3>
      {test?.verdict && <span className={`px-2 py-1 text-xs rounded ${verdictColor(test.verdict)}`}>{test.verdict}</span>}
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
      annotations={(annotations || []).filter(
        (a: any) => a.relevance?.toLowerCase().includes(title.toLowerCase().replace(" test",""))
      )}
    />
  </div>
);

const LIAssessmentResult = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const purchased = searchParams.get("purchased") === "true";
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let timer: any;
    let pollCount = 0;
    const MAX_POLLS = 25; // 75 seconds at 3s intervals

    const fetchOnce = async () => {
      const { data } = await supabase.from("li_assessments").select("*").eq("id", id).maybeSingle();
      setAssessment(data);
      setLoading(false);

      if (data && (data.status === "pending" || data.status === "processing")) {
        pollCount += 1;
        if (pollCount < MAX_POLLS) {
          timer = setTimeout(fetchOnce, 3000);
        } else {
          setAssessment((prev: any) => ({ ...prev, status: "failed" }));
        }
      }
    };

    fetchOnce();
    return () => timer && clearTimeout(timer);
  }, [id]);

  const report = assessment?.report_data || {};
  const status = assessment?.status;
  const overall = report?.three_part_test?.overall_assessment;
  const docs = report?.documentation_recommendations;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet><title>Legitimate Interest Assessment Tool | End User Privacy</title></Helmet>
      <Navbar />
      <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <BackLink to="/dashboard/reports" label="Back to My Reports" />
        <ClientContextBadge />
      </div>

      <header className="bg-slate-900 text-white py-10">
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-serif mb-2">Legitimate Interest Assessment Tool</h1>
          {assessment?.processing_description && (
            <p className="text-slate-300 text-sm">
              {assessment.processing_description.length > 120 ? assessment.processing_description.slice(0, 120) + "…" : assessment.processing_description}
            </p>
          )}
          {report?.generated_at && (
            <p className="text-slate-400 text-xs mt-2">Generated {new Date(report.generated_at).toLocaleString()}</p>
          )}
          <div className="mt-4 flex gap-2 flex-wrap">
            <Button asChild variant="secondary"><Link to="/li-assessment">Run New Assessment</Link></Button>
            {assessment?.pdf_url ? (
              <a
                href={assessment.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-meta font-semibold text-white bg-gradient-to-br from-slate-700 to-blue-700 rounded-lg hover:opacity-90 transition-all no-underline"
              >
                ↓ Download PDF
              </a>
            ) : status === "complete" ? (
              <button
                disabled
                className="inline-flex items-center gap-2 px-4 py-2 text-meta font-semibold text-muted-foreground bg-muted rounded-lg cursor-not-allowed"
                title="PDF is being prepared — refresh in a moment"
              >
                ↓ PDF preparing...
              </button>
            ) : null}
            <DownloadWordButton
              text={[
                report?.three_part_test?.overall_assessment?.summary,
                report?.three_part_test?.purpose_test?.analysis,
                report?.three_part_test?.necessity_test?.analysis,
                report?.three_part_test?.balancing_test?.analysis,
              ]
                .filter(Boolean)
                .join("\n\n")}
              label="Legitimate Interest Assessment"
            />
          </div>
        </div>
      </header>

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
            <p className="text-foreground">Analysing your processing activity against the regulatory precedent database.</p>
            <p className="text-muted-foreground text-sm mt-1">This typically takes 20-40 seconds.</p>
          </div>
        )}

        {status === "failed" && (
          <div className="bg-card border rounded-lg p-6">
            <p className="font-medium text-red-700 mb-3">Assessment could not be completed. Please try again.</p>
            <Button asChild><Link to="/li-assessment">Try Again</Link></Button>
          </div>
        )}

        {status === "complete" && (
          <>
            {/* Summary */}
            <section className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-6">
              <h2 className="mb-3">Assessment Summary</h2>
              {overall?.argument_strength && (
                <div className="mb-3">
                  <span className={`inline-block px-3 py-1.5 rounded font-medium ${strengthColor(overall.argument_strength)}`}>
                    {overall.argument_strength}
                  </span>
                </div>
              )}
              {overall?.strength_basis && <p className="text-sm text-foreground">{overall.strength_basis}</p>}
              {(report?.precedents_reviewed || report?.precedent_database_size) && (
                <p className="text-xs text-muted-foreground mt-3">
                  Precedent database reviewed: {report.precedents_reviewed ?? "—"} decisions | Database size: {report.precedent_database_size ?? "—"} tracked decisions
                </p>
              )}
            </section>

            {/* Three-Part Test */}
            <section className="grid md:grid-cols-3 gap-4">
              <TestCard title="Purpose Test" test={report?.three_part_test?.purpose_test} annotations={report?.annotations} />
              <TestCard title="Necessity Test" test={report?.three_part_test?.necessity_test} annotations={report?.annotations} />
              <TestCard title="Balancing Test" test={report?.three_part_test?.balancing_test} annotations={report?.annotations} />
            </section>

            {/* Blocking Issues Alert */}
            {Array.isArray(overall?.blocking_issues) && overall.blocking_issues.length > 0 && (
              <section className="border-l-4 border-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg p-5">
                <h3 className="text-red-800 dark:text-red-300 mb-3">
                  ⛔ Blocking Issues — Resolve Before Relying on Legitimate Interest
                </h3>
                <ul className="space-y-2">
                  {overall.blocking_issues.map((issue: string, i: number) => (
                    <li key={i} className="text-sm text-red-900 dark:text-red-200 flex gap-2">
                      <span className="font-mono">•</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-red-700 dark:text-red-400 mt-3">
                  These issues must be resolved before you can lawfully rely on legitimate interest as a processing basis. Consult qualified legal counsel before proceeding.
                </p>
              </section>
            )}

            {/* Precedent Landscape */}
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
              {report?.data_currency_note && <p className="text-xs text-muted-foreground mt-3 italic">{report.data_currency_note}</p>}
            </section>

            {/* Enforcement precedents from get-enforcement-context */}
            <EnforcementPrecedents
              precedents={report?.enforcement_precedents}
              context="Recent regulator decisions matched to your processing activity, data categories, and jurisdictions."
            />

            {/* Documentation */}
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
                {Array.isArray(docs?.balancing_record_elements) && (
                  <>
                    <h3 className="mt-4 mb-2">Balancing Record — Must Include</h3>
                    <ol className="list-decimal pl-5 text-sm space-y-1">{docs.balancing_record_elements.map((e: string, i: number) => <li key={i}>{e}</li>)}</ol>
                  </>
                )}
                {docs?.opt_out_mechanism?.required && (
                  <div className="mt-4 p-4 bg-amber-50 border-l-4 border-amber-500 text-sm rounded">
                    <p className="font-medium">Opt-Out Mechanism Required: {docs.opt_out_mechanism.basis}</p>
                    {docs.opt_out_mechanism.recommended_approach && (
                      <p className="mt-1">Recommended approach: {docs.opt_out_mechanism.recommended_approach}</p>
                    )}
                  </div>
                )}
                {Array.isArray(docs?.review_triggers) && (
                  <div className="mt-4">
                    <p className="text-sm font-medium">Circumstances requiring this LIA to be revisited</p>
                    <ul className="list-disc pl-5 text-sm mt-1 space-y-1">{docs.review_triggers.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>
                  </div>
                )}
              </section>
            )}

            {/* Disclaimer */}
            <section className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 text-sm rounded">
              {report?.disclaimer || "This is a compliance framework tool. Review findings with qualified legal counsel."}
            </section>

            {/* DPIA CTA */}
            <section className="bg-card border rounded-lg p-6">
              <h3 className="mb-2">Does this processing require a DPIA?</h3>
              <p className="text-sm text-muted-foreground mb-3">
                If your assessment identifies high-risk processing, you may be required to conduct a Data Protection Impact Assessment under GDPR Article 35.
              </p>
              <Button asChild><Link to="/dpia-framework">Open Impact Assessment Builder →</Link></Button>
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default LIAssessmentResult;
