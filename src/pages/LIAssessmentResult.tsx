import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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

const TestCard = ({ title, test }: { title: string; test: any }) => (
  <div className="bg-card border rounded-lg p-5">
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-semibold">{title}</h3>
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
    const fetchOnce = async () => {
      const { data } = await supabase.from("li_assessments").select("*").eq("id", id).maybeSingle();
      setAssessment(data);
      setLoading(false);
      if (data && (data.status === "pending" || data.status === "processing")) {
        timer = setTimeout(fetchOnce, 3000);
      }
    };
    fetchOnce();
    return () => timer && clearTimeout(timer);
  }, [id]);

  const report = assessment?.report_data || {};
  const status = assessment?.status;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet><title>LI Assessment Result | EndUserPrivacy</title></Helmet>
      <Navbar />

      <header className="bg-slate-900 text-white py-10">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="text-3xl font-serif mb-2">Legitimate Interest Assessment</h1>
          {assessment?.processing_description && (
            <p className="text-slate-300 text-sm">
              {assessment.processing_description.length > 120 ? assessment.processing_description.slice(0, 120) + "…" : assessment.processing_description}
            </p>
          )}
          {report?.generated_at && (
            <p className="text-slate-400 text-xs mt-2">Generated {new Date(report.generated_at).toLocaleString()}</p>
          )}
          <div className="mt-4 flex gap-2">
            <Button asChild variant="secondary"><Link to="/li-assessment">Run New Assessment</Link></Button>
            <Button variant="outline" disabled title="PDF export coming soon" className="text-slate-900">Download PDF</Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-10 space-y-6">
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
              <h2 className="text-lg font-semibold mb-3">Assessment Summary</h2>
              {report?.argument_strength && (
                <div className="mb-3">
                  <span className={`inline-block px-3 py-1.5 rounded font-medium ${strengthColor(report.argument_strength)}`}>
                    {report.argument_strength}
                  </span>
                </div>
              )}
              {report?.strength_basis && <p className="text-sm text-foreground">{report.strength_basis}</p>}
              {(report?.precedents_reviewed || report?.precedent_database_size) && (
                <p className="text-xs text-muted-foreground mt-3">
                  Precedent database reviewed: {report.precedents_reviewed ?? "—"} decisions | Database size: {report.precedent_database_size ?? "—"} tracked decisions
                </p>
              )}
            </section>

            {/* Three-Part Test */}
            <section className="grid md:grid-cols-3 gap-4">
              <TestCard title="Purpose Test" test={report?.purpose_test} />
              <TestCard title="Necessity Test" test={report?.necessity_test} />
              <TestCard title="Balancing Test" test={report?.balancing_test} />
            </section>

            {/* Precedent Landscape */}
            <section className="bg-card border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Most Analogous Regulatory Decisions</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded">
                  <h3 className="font-medium text-green-700 mb-2">Accepted Cases</h3>
                  <p className="text-sm">{report?.closest_accepted_precedent || "No closely analogous accepted precedents found in tracked database"}</p>
                </div>
                <div className="p-4 border rounded">
                  <h3 className="font-medium text-red-700 mb-2">Rejected Cases</h3>
                  <p className="text-sm">{report?.closest_rejected_precedent || "No closely analogous rejected precedents found in tracked database"}</p>
                </div>
              </div>
              {Array.isArray(report?.key_distinguishing_factors) && report.key_distinguishing_factors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-1">Key distinguishing factors</p>
                  <ul className="list-disc pl-5 text-sm space-y-1">{report.key_distinguishing_factors.map((f: string, i: number) => <li key={i}>{f}</li>)}</ul>
                </div>
              )}
              {report?.data_currency_note && <p className="text-xs text-muted-foreground mt-3 italic">{report.data_currency_note}</p>}
            </section>

            {/* Documentation */}
            {(Array.isArray(report?.recommended_documentation) || Array.isArray(report?.balancing_record_elements)) && (
              <section className="bg-card border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Recommended Documentation for Your LIA Record</h2>
                {Array.isArray(report?.recommended_documentation) && report.recommended_documentation.map((d: any, i: number) => (
                  <div key={i} className="mb-4 pb-4 border-b last:border-b-0">
                    <p className="font-medium">{d.document_name || d.name}</p>
                    {d.purpose && <p className="text-sm text-muted-foreground mt-1">{d.purpose}</p>}
                    {Array.isArray(d.key_elements) && (
                      <ul className="list-disc pl-5 text-sm mt-2 space-y-1">{d.key_elements.map((e: string, j: number) => <li key={j}>{e}</li>)}</ul>
                    )}
                    {d.basis && <p className="text-xs text-muted-foreground mt-2">Basis: {d.basis}</p>}
                  </div>
                ))}
                {Array.isArray(report?.balancing_record_elements) && (
                  <>
                    <h3 className="font-medium mt-4 mb-2">Balancing Record — Must Include</h3>
                    <ol className="list-decimal pl-5 text-sm space-y-1">{report.balancing_record_elements.map((e: string, i: number) => <li key={i}>{e}</li>)}</ol>
                  </>
                )}
                {report?.opt_out_mechanism?.required && (
                  <div className="mt-4 p-4 bg-amber-50 border-l-4 border-amber-500 text-sm rounded">
                    <p className="font-medium">Opt-Out Mechanism Required: {report.opt_out_mechanism.basis}</p>
                    {report.opt_out_mechanism.recommended_approach && (
                      <p className="mt-1">Recommended approach: {report.opt_out_mechanism.recommended_approach}</p>
                    )}
                  </div>
                )}
                {Array.isArray(report?.review_triggers) && (
                  <div className="mt-4">
                    <p className="text-sm font-medium">Circumstances requiring this LIA to be revisited</p>
                    <ul className="list-disc pl-5 text-sm mt-1 space-y-1">{report.review_triggers.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>
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
              <h3 className="font-semibold mb-2">Does this processing require a DPIA?</h3>
              <p className="text-sm text-muted-foreground mb-3">
                If your assessment identifies high-risk processing, you may be required to conduct a Data Protection Impact Assessment under GDPR Article 35.
              </p>
              <Button asChild><Link to="/dpia-framework">Open DPIA Framework →</Link></Button>
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default LIAssessmentResult;
