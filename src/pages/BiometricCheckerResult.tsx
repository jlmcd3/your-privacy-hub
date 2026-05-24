// View a previously generated Biometric Compliance assessment by ID.

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CopyButton from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ClientContextBadge } from "@/components/clients/ClientContextBadge";
import BackLink from "@/components/dashboard/BackLink";
import { Loader2 } from "lucide-react";
import AssessmentReport from "@/components/AssessmentReport";
import ReportShell from "@/components/ReportShell";
import PDFDownloadButton from "@/components/PDFDownloadButton";
import DownloadWordButton from "@/components/DownloadWordButton";
import { AnnotationCallout } from "@/components/AnnotationCallout";
import TranslateReportButton from "@/components/TranslateReportButton";

export default function BiometricCheckerResult() {
  const { id } = useParams();
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [translation, setTranslation] = useState<{ lang: string; text: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    let timer: any;
    const fetchOnce = async () => {
      const { data } = await supabase.from("biometric_assessments").select("*").eq("id", id).maybeSingle();
      setRow(data);
      setLoading(false);
      if (data && (data.status === "pending" || data.status === "processing")) {
        timer = setTimeout(fetchOnce, 3000);
      }
    };
    fetchOnce();
    return () => timer && clearTimeout(timer);
  }, [id]);

  const report = row?.report_data || {};
  const sourceText = row?.analysis_text || report?.assessment_text;
  const text = translation?.text ?? sourceText;
  const bipaRisk = report?.bipa_risk;

  const meta = row && (
    <>
      Generated {new Date(row.created_at).toLocaleDateString()}
      {(row.jurisdictions || []).length > 0 && ` · ${(row.jurisdictions || []).join(", ")}`}
    </>
  );

  const actions = row && (
    <>
      <TranslateReportButton
        reportType="biometric"
        reportId={row.id}
        onTranslated={(translated: any, lang) => {
          // Edge function returns { report_data, analysis_text? }
          const t = translated?.analysis_text || translated?.report_data?.assessment_text || "";
          if (t) setTranslation({ lang, text: t });
        }}
        onReverted={() => setTranslation(null)}
      />
      <PDFDownloadButton
        toolType="biometric_checker"
        assessmentId={row.id}
        pdfUrl={row.pdf_url}
        onGenerated={(url) => setRow({ ...row, pdf_url: url })}
      />
      <DownloadWordButton
        text={row?.analysis_text || (row?.report_data as any)?.assessment_text || ""}
        label="Biometric Compliance Assessment"
      />
      {text && <CopyButton text={text} />}
    </>
  );

  const callout = bipaRisk && (
    <div className="border-l-4 border-[hsl(var(--warn))] bg-[hsl(var(--warn)/0.06)] rounded-r-md px-4 py-3">
      <h3 className="text-[hsl(var(--warn))] mb-1">⚠️ BIPA Litigation Risk Estimate</h3>
      <p className="text-sm text-foreground">
        Low end: <span className="font-medium text-navy">${bipaRisk.lowEnd?.toLocaleString()}</span> · High end: <span className="font-medium text-navy">${bipaRisk.highEnd?.toLocaleString()}</span>
      </p>
      {bipaRisk.note && <p className="text-meta text-muted-foreground mt-1">{bipaRisk.note}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-paper">
      <Helmet><title>Biometric Compliance Assessment | End User Privacy</title></Helmet>
      <Navbar />
      <main className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <BackLink to="/dashboard/reports" label="Back to My Reports" className="mb-4" />
        <ClientContextBadge />
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-navy" /></div>
        ) : !row ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <p className="text-slate">Assessment not found or you don't have access.</p>
            <Button asChild className="mt-4"><Link to="/dashboard/reports">Back to My Reports</Link></Button>
          </div>
        ) : row.status === "pending" || row.status === "processing" ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-navy mx-auto mb-3" />
            <p className="text-foreground">Your assessment is being generated.</p>
          </div>
        ) : (
          <ReportShell
            title="Biometric Compliance Assessment"
            meta={meta}
            actions={actions}
            callout={callout}
          >
            <AssessmentReport text={text || ""} sectionChipLabel={null} />
            {Array.isArray((row?.report_data as any)?.annotations) && (row?.report_data as any).annotations.length > 0 && (
              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold mb-2">Priority Action — Enforcement Basis</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  The following corpus citations inform the priority actions above.
                </p>
                <AnnotationCallout annotations={(row?.report_data as any)?.annotations} />
              </div>
            )}
          </ReportShell>
        )}
      </main>
      <Footer />
    </div>
  );
}
