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
import EnforcementPrecedents from "@/components/EnforcementPrecedents";
import ReportTranslateMenu from "@/components/ReportTranslateMenu";
import ToolDisclaimer from "@/components/ToolDisclaimer";

export default function BiometricCheckerResult() {
  const { id } = useParams();
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [translated, setTranslated] = useState<any | null>(null);
  const [dir, setDir] = useState<"ltr" | "rtl">("ltr");

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

  const report = (translated?.report_data ?? row?.report_data) || {};
  const sourceText = (translated?.analysis_text ?? row?.analysis_text) || report?.assessment_text;
  const text = sourceText;
  const bipaRisk = report?.bipa_risk;

  const meta = row && (
    <>
      Generated {new Date(row.created_at).toLocaleDateString()}
      {(row.jurisdictions || []).length > 0 && ` · ${(row.jurisdictions || []).join(", ")}`}
    </>
  );

  const actions = row && (
    <>
      <ReportTranslateMenu
        toolType="biometric"
        reportId={row.id}
        onTranslated={(p, d) => { setTranslated(p); setDir(d); }}
      />
      <PDFDownloadButton
        toolType="biometric_checker"
        assessmentId={row.id}
        pdfUrl={row.pdf_url}
        onGenerated={(url) => setRow({ ...row, pdf_url: url })}
      />
      <DownloadWordButton
        text={text || ""}
        label="Biometric Compliance Assessment"
      />
      {text && <CopyButton text={text} />}
    </>
  );

  // Render the BIPA risk callout only when the assessment text confirms BIPA
  // applies in Illinois (Applies = Yes or Conditional). Never render it before
  // the applicability determination.
  const bipaApplies = (() => {
    if (!bipaRisk) return false;
    const t = String(text || "");
    if (!/Illinois/i.test(t)) return false;
    // Look for an Illinois section header followed (within ~600 chars) by
    // "Applies to this organisation: Yes" or "... Conditional".
    const idx = t.search(/Illinois[^\n]*\n/i);
    if (idx < 0) return false;
    const window = t.slice(idx, idx + 800);
    return /Applies to this organisation:\s*(Yes|Conditional)/i.test(window);
  })();

  const bipaCallout = bipaApplies && bipaRisk ? (
    <div className="border-l-4 border-[hsl(var(--warn))] bg-[hsl(var(--warn)/0.06)] rounded-r-md px-4 py-3 mt-6">
      <h3 className="text-[hsl(var(--warn))] mb-1">⚠️ BIPA Litigation Risk Estimate</h3>
      <p className="text-sm text-foreground">
        Low end: <span className="font-medium text-brand-navy">${bipaRisk.lowEnd?.toLocaleString()}</span> · High end: <span className="font-medium text-brand-navy">${bipaRisk.highEnd?.toLocaleString()}</span>
      </p>
      {bipaRisk.note && <p className="text-meta text-muted-foreground mt-1">{bipaRisk.note}</p>}
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Helmet><title>Biometric Compliance Assessment | End User Privacy</title></Helmet>
      <Navbar />
      <main className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <BackLink to="/dashboard/reports" label="Back to My Reports" className="mb-4" />
        <ClientContextBadge />
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-navy" /></div>
        ) : !row ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <p className="text-slate">Assessment not found or you don't have access.</p>
            <Button asChild className="mt-4"><Link to="/dashboard/reports">Back to My Reports</Link></Button>
          </div>
        ) : row.status === "pending" || row.status === "processing" ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-brand-navy mx-auto mb-3" />
            <p className="text-foreground">Your assessment is being generated.</p>
          </div>
        ) : (
          <ReportShell
            title="Biometric Compliance Assessment"
            meta={meta}
            actions={actions}
          >
            <div dir={dir} style={{ display: "contents" }}>
            <AssessmentReport text={text || ""} sectionChipLabel={null} />
            {bipaCallout}
            <EnforcementPrecedents
              precedents={(row?.report_data as any)?.enforcement_precedents}
              variant="standard"
              attempted={Boolean((row?.report_data as any)?.enforcement_meta?.attempted)}
              totalMatched={(row?.report_data as any)?.enforcement_meta?.total_matched}
              queryDescriptor={(row?.report_data as any)?.enforcement_meta?.query_descriptor}
            />
            {Array.isArray((row?.report_data as any)?.annotations) && (row?.report_data as any).annotations.length > 0 && (
              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold mb-2">Priority Action — Enforcement Basis</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  The following corpus citations inform the priority actions above.
                </p>
                <AnnotationCallout annotations={(row?.report_data as any)?.annotations} />
              </div>
            )}
            </div>
          </ReportShell>
        )}
      </main>
      <Footer />
    </div>
  );
}
