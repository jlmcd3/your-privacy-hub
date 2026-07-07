import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import BackLink from "@/components/dashboard/BackLink";
import { CybersecurityReportBody } from "./CPPACybersecurityResult";
import PDFDownloadButton from "@/components/PDFDownloadButton";

import CPPASuitePDFButton from "@/components/cppa/CPPASuitePDFButton";
import { ProcessingInterstitial } from "@/components/ProcessingInterstitial";
import { IMPROVEMENT_KIT_ENABLED } from "@/config/improvementKit";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { toast } from "@/hooks/use-toast";

const riskColor = (r: string) => {
  const x = (r || "").toLowerCase();
  if (x === "critical") return "bg-red-100 text-red-800";
  if (x === "high") return "bg-orange-100 text-orange-800";
  if (x === "medium") return "bg-amber-100 text-amber-800";
  if (x === "low") return "bg-green-100 text-green-800";
  return "bg-muted text-foreground";
};
const statusColor = (s: string) => {
  const x = (s || "").toLowerCase();
  if (x === "critical gap") return "bg-red-100 text-red-800";
  if (x === "gap") return "bg-orange-100 text-orange-800";
  if (x === "partial") return "bg-amber-100 text-amber-800";
  if (x === "compliant") return "bg-green-100 text-green-800";
  return "bg-muted text-foreground";
};

function RiskReportBody({ row }: { row: any }) {
  const report = row?.report_data || {};
  return (
    <div className="space-y-6">
      <section className="bg-slate-900 text-white rounded-lg p-8">
        <h1 className="font-serif mb-2">CPPA Privacy Risk Assessment</h1>
        <p className="text-slate-300 text-sm">
          Generated {row?.created_at ? new Date(row.created_at).toLocaleDateString() : ""}
        </p>
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
        {report?.executive_summary && <p className="mt-4 text-slate-200">{report.executive_summary}</p>}
      </section>

      {report?.scope_confirmation && (
        <section className="bg-card border rounded-lg p-6">
          <h2 className="mb-3">Scope Confirmation</h2>
          <p className="text-sm"><strong>In scope:</strong> {String(report.scope_confirmation.in_scope)}</p>
          {report.scope_confirmation.threshold_met && <p className="text-sm mt-1"><strong>Threshold met:</strong> {report.scope_confirmation.threshold_met}</p>}
          {Array.isArray(report.scope_confirmation.applicable_deadlines) && report.scope_confirmation.applicable_deadlines.length > 0 && (
            <div className="text-sm mt-2"><strong>Applicable deadlines:</strong>
              <ul className="list-disc pl-5 mt-1">{report.scope_confirmation.applicable_deadlines.map((d: string, i: number) => <li key={i}>{d}</li>)}</ul>
            </div>
          )}
        </section>
      )}

      {report?.enforcement_context && (
        <section className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 text-sm rounded">
          <p className="font-semibold mb-1">Enforcement Context</p>
          <p>{report.enforcement_context}</p>
        </section>
      )}

      {Array.isArray(report?.domains) && report.domains.length > 0 && (
        <section className="bg-card border rounded-lg p-6">
          <h2 className="mb-4">Domain Findings</h2>
          <Accordion type="multiple">
            {report.domains.map((d: any, i: number) => (
              <AccordionItem key={i} value={`d${i}`}>
                <AccordionTrigger>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span>{d.domain}</span>
                    {d.score != null && <span className="text-xs text-muted-foreground">{d.score}/100</span>}
                    {d.status && <span className={`px-2 py-0.5 text-xs rounded ${statusColor(d.status)}`}>{d.status}</span>}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2">
                  {d.finding && <p className="text-sm"><strong>Finding:</strong> {d.finding}</p>}
                  {d.regulatory_basis && <p className="text-sm"><strong>Regulatory basis:</strong> {d.regulatory_basis}</p>}
                  {d.remediation && <p className="text-sm"><strong>Remediation:</strong> {d.remediation}</p>}
                  {d.priority && <p className="text-xs text-muted-foreground">Priority: {d.priority}</p>}
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
        ⚠️ This compliance framework report does not constitute legal advice. Findings should be reviewed with qualified legal counsel.
      </section>
    </div>
  );
}

function StatusBlock({ row, label, ctaTo }: { row: any; label: string; ctaTo: string }) {
  if (!row) return <p className="text-sm text-muted-foreground">No record found.</p>;
  const status = row?.status;
  if (status === "pending" || status === "processing") {
    return (
      <ProcessingInterstitial tool="cppa_suite" label={label} />
    );
  }
  if (status === "error") {
    return (
      <div className="bg-card border rounded-lg p-6">
        <p className="font-medium text-red-700 mb-3">{label} failed.</p>
        <Button asChild><Link to={ctaTo}>Try Again</Link></Button>
      </div>
    );
  }
  return null;
}

export default function CPPASuiteResult() {
  const [params] = useSearchParams();
  const riskId = params.get("risk_id");
  const cyberId = params.get("cyber_id");
  const purchased = params.get("purchased") === "true";
  const [riskRow, setRiskRow] = useState<any>(null);
  const [cyberRow, setCyberRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { isPro } = useSubscriptionTier();
  const [kitLoading, setKitLoading] = useState(false);

  // Doc P Step 4: result-page entry point, flag-gated AND Professional-only.
  // Flag stays OFF in production. Non-Professional users with the flag on
  // see nothing here (upgrade teaser is Doc S, kept separate).
  const kitAvailable = IMPROVEMENT_KIT_ENABLED && isPro && riskRow?.status === "complete" && !!riskRow?.id;

  const handleDownloadKit = async () => {
    if (!riskRow?.id) return;
    setKitLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-improvement-kit", {
        body: { assessment_id: riskRow.id },
      });
      if (error) throw error;
      if (!data?.entitled) {
        toast({ title: "Not available", description: "This capability is Professional-only.", variant: "destructive" });
        return;
      }
      const md = data.rendered_markdown ?? "";
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `assessment-improvement-kit-${riskRow.id}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: "Could not generate Kit", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setKitLoading(false);
    }
  };


  useEffect(() => {
    let timer: any;
    const fetchOnce = async () => {
      const promises: Promise<any>[] = [];
      if (riskId) promises.push(Promise.resolve(supabase.from("cppa_assessments").select("*").eq("id", riskId).maybeSingle()));
      if (cyberId) promises.push(Promise.resolve(supabase.from("cppa_assessments").select("*").eq("id", cyberId).maybeSingle()));
      const results = await Promise.all(promises);
      let idx = 0;
      if (riskId) { setRiskRow(results[idx]?.data || null); idx++; }
      if (cyberId) { setCyberRow(results[idx]?.data || null); idx++; }
      setLoading(false);
      const stillRunning = results.some((r) => {
        const s = r?.data?.status;
        return s === "pending" || s === "processing";
      });
      if (stillRunning) timer = setTimeout(fetchOnce, 3000);
    };
    fetchOnce();
    return () => timer && clearTimeout(timer);
  }, [riskId, cyberId]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet><title>CPPA Audit Readiness Suite | End User Privacy</title></Helmet>
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <BackLink to="/dashboard/reports" label="Back to My Reports" />
        {purchased && (
          <div className="p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-950/20 rounded text-sm">
            ✅ Suite purchase confirmed. Both reports are being generated below.
          </div>
        )}

        <header className="bg-slate-900 text-white rounded-lg p-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            CPPA AUDIT READINESS SUITE
          </span>
          <h1 className="font-serif">Combined CPPA Audit Readiness Report</h1>
          <p className="text-slate-300 mt-2 text-sm">Module 1 (Privacy Risk Assessment) and Module 2 (Cybersecurity Audit Readiness) for your organisation.</p>
        </header>

        {loading && <p>Loading…</p>}

        {!loading && (
          <Tabs defaultValue="risk">
            <TabsList>
              <TabsTrigger value="risk">Module 1 · Privacy Risk</TabsTrigger>
              <TabsTrigger value="cyber">Module 2 · Cybersecurity</TabsTrigger>
            </TabsList>
            <TabsContent value="risk" className="mt-6 space-y-6">
              <StatusBlock row={riskRow} label="Privacy Risk Assessment" ctaTo="/cppa-risk-assessment?suite=true" />
              {riskRow?.status === "complete" && <RiskReportBody row={riskRow} />}
            </TabsContent>
            <TabsContent value="cyber" className="mt-6 space-y-6">
              <StatusBlock row={cyberRow} label="Cybersecurity Readiness Report" ctaTo="/cppa-cybersecurity?suite=true" />
              {cyberRow?.status === "complete" && <CybersecurityReportBody row={cyberRow} />}
            </TabsContent>
          </Tabs>
        )}

        <div className="flex gap-2 flex-wrap pt-4 border-t">
          {(riskRow?.status === "complete" || cyberRow?.status === "complete") && (
            <CPPASuitePDFButton
              riskId={riskRow?.status === "complete" ? riskRow?.id : null}
              cyberId={cyberRow?.status === "complete" ? cyberRow?.id : null}
            />
          )}
          {riskRow?.id && riskRow.status === "complete" && (
            <>
              <PDFDownloadButton
                toolType="cppa_risk"
                assessmentId={riskRow.id}
                pdfUrl={riskRow.pdf_url}
                onGenerated={(url) => setRiskRow({ ...riskRow, pdf_url: url })}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-brand-navy bg-brand-cloud hover:bg-brand-cloud/70 border border-brand-cloud rounded-lg no-underline transition-colors disabled:opacity-60"
              />
            </>
          )}
          {cyberRow?.id && cyberRow.status === "complete" && (
            <>
              <PDFDownloadButton
                toolType="cppa_cybersecurity"
                assessmentId={cyberRow.id}
                pdfUrl={cyberRow.pdf_url}
                onGenerated={(url) => setCyberRow({ ...cyberRow, pdf_url: url })}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-brand-navy bg-brand-cloud hover:bg-brand-cloud/70 border border-brand-cloud rounded-lg no-underline transition-colors disabled:opacity-60"
              />
            </>
          )}
          <Button asChild variant="outline"><Link to="/dashboard/reports">Back to My Reports</Link></Button>
          <Button asChild variant="ghost"><Link to="/account/cppa-runs">View all CPPA runs</Link></Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
