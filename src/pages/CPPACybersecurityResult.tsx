import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import BackLink from "@/components/dashboard/BackLink";
import { AnnotationCallout } from "@/components/AnnotationCallout";

export const readinessColor = (r: string) => {
  const x = (r || "").toLowerCase();
  if (x.includes("critical")) return "bg-red-100 text-red-800";
  if (x.includes("material")) return "bg-orange-100 text-orange-800";
  if (x.includes("substantially")) return "bg-amber-100 text-amber-800";
  if (x.includes("audit-ready")) return "bg-green-100 text-green-800";
  return "bg-muted text-foreground";
};
export const controlStatusColor = (s: string) => {
  const x = (s || "").toLowerCase();
  if (x === "critical gap") return "bg-red-100 text-red-800";
  if (x === "gap") return "bg-orange-100 text-orange-800";
  if (x === "partial") return "bg-amber-100 text-amber-800";
  if (x === "implemented") return "bg-green-100 text-green-800";
  return "bg-muted text-foreground";
};

export function CybersecurityReportBody({ row }: { row: any }) {
  const report = row?.report_data || {};
  return (
    <div className="space-y-6">
      <section className="p-4 bg-red-50 dark:bg-red-950/20 border-l-4 border-red-600 rounded">
        <p className="text-sm font-semibold text-red-900 dark:text-red-200">
          Compliance deadline: April 1, 2028
        </p>
        <p className="text-xs text-red-800 dark:text-red-300 mt-1">
          Businesses subject to CPPA's cybersecurity audit regulation must complete their first independent audit
          and certify compliance to the Agency by April 1, 2028. Highest-risk thresholds (revenue + sensitive data
          processing) trigger earlier obligations. Use this assessment to scope remediation now.
        </p>
      </section>
      <section className="bg-slate-900 text-white rounded-lg p-8">
        <h1 className="font-serif mb-2">CPPA Cybersecurity Audit Readiness</h1>
        <p className="text-slate-300 text-sm">
          Generated {row?.created_at ? new Date(row.created_at).toLocaleDateString() : ""}
        </p>
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          {report?.overall_score != null && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded font-medium bg-white/10">
              Overall score: <strong>{report.overall_score} / 100</strong>
            </span>
          )}
          {report?.readiness_level && (
            <span className={`inline-block px-3 py-1.5 rounded font-medium ${readinessColor(report.readiness_level)}`}>
              {report.readiness_level}
            </span>
          )}
        </div>
        {report?.executive_summary && <p className="mt-4 text-slate-200">{report.executive_summary}</p>}
      </section>

      {report?.enforcement_context && (
        <section className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 text-sm rounded">
          <p className="font-semibold mb-1">Enforcement Context</p>
          <p>{report.enforcement_context}</p>
        </section>
      )}

      {Array.isArray(report?.controls) && report.controls.length > 0 && (
        <section className="bg-card border rounded-lg p-6">
          <h2 className="mb-4">Control Findings</h2>
          <Accordion type="multiple">
            {report.controls.map((d: any, i: number) => (
              <AccordionItem key={i} value={`c${i}`}>
                <AccordionTrigger>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span>{d.control}</span>
                    {d.score != null && <span className="text-xs text-muted-foreground">{d.score}/100</span>}
                    {d.status && <span className={`px-2 py-0.5 text-xs rounded ${controlStatusColor(d.status)}`}>{d.status}</span>}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2">
                  {d.finding && <p className="text-sm"><strong>Finding:</strong> {d.finding}</p>}
                  {d.regulatory_basis && <p className="text-sm"><strong>Regulatory basis:</strong> {d.regulatory_basis}</p>}
                  {d.remediation && <p className="text-sm"><strong>Remediation:</strong> {d.remediation}</p>}
                  {d.priority && <p className="text-xs text-muted-foreground">Priority: {d.priority}</p>}
                  {(d.status === "Gap" || d.status === "Partial Gap") && (
                    <AnnotationCallout
                      annotations={(report?.annotations || []).filter(
                        (a: any) => a.relevance?.toLowerCase().includes(
                          (d.control || "").toLowerCase().slice(0, 20)
                        )
                      )}
                    />
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      {Array.isArray(report?.top_risks) && report.top_risks.length > 0 && (
        <section>
          <h2 className="mb-3">Top Risks</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {report.top_risks.slice(0, 3).map((r: any, i: number) => (
              <div key={i} className="bg-card border rounded-lg p-4">
                <p className="font-medium">{r.title}</p>
                {r.description && <p className="text-sm mt-1">{r.description}</p>}
                {r.deadline && <p className="text-xs text-muted-foreground mt-2">Deadline: {r.deadline}</p>}
                {r.consequence && <p className="text-xs text-red-700 mt-1">{r.consequence}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {Array.isArray(report?.next_steps) && report.next_steps.length > 0 && (
        <section className="bg-card border rounded-lg p-6">
          <h2 className="mb-3">Next Steps</h2>
          <ol className="list-decimal pl-5 space-y-1 text-sm">
            {report.next_steps.map((s: string, i: number) => <li key={i}>{s}</li>)}
          </ol>
        </section>
      )}

      <section className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 text-sm rounded">
        ⚠️ This compliance framework report does not constitute legal or security advice. Findings should be reviewed with qualified legal counsel and your security team.
      </section>
    </div>
  );
}

export default function CPPACybersecurityResult() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const purchased = searchParams.get("purchased") === "true";
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let timer: any;
    const fetchOnce = async () => {
      const { data } = await supabase.from("cppa_assessments").select("*").eq("id", id).maybeSingle();
      setRow(data);
      setLoading(false);
      if (data && (data.status === "pending" || data.status === "processing")) {
        timer = setTimeout(fetchOnce, 3000);
      }
    };
    fetchOnce();
    return () => timer && clearTimeout(timer);
  }, [id]);

  const status = row?.status;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet><title>CPPA Cybersecurity Audit Readiness — Module 2 | End User Privacy</title></Helmet>
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <BackLink to="/dashboard/reports" label="Back to My Reports" />
        {purchased && (
          <div className="p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-950/20 rounded text-sm">
            ✅ Purchase confirmed. Your readiness report is being generated.
          </div>
        )}
        {loading && <p>Loading…</p>}

        {!loading && (status === "pending" || status === "processing") && (
          <div className="bg-card border rounded-lg p-10 text-center">
            <div className="animate-pulse mb-4 text-2xl">⏳</div>
            <p>Running your CPPA Cybersecurity Readiness assessment.</p>
            <p className="text-muted-foreground text-sm mt-1">This typically takes 30–60 seconds.</p>
          </div>
        )}

        {status === "error" && (
          <div className="bg-card border rounded-lg p-6">
            <p className="font-medium text-red-700 mb-3">Assessment failed.</p>
            <Button asChild><Link to="/cppa-cybersecurity">Try Again</Link></Button>
          </div>
        )}

        {status === "complete" && (
          <>
            <CybersecurityReportBody row={row} />
            <div className="flex gap-2 flex-wrap">
              <Button asChild variant="outline"><Link to="/cppa-cybersecurity">Run New Assessment</Link></Button>
              <Button asChild><Link to="/dashboard/reports">Back to My Reports</Link></Button>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
