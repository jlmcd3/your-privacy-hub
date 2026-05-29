// View a previously generated Custom DPA by ID. Subscribers reach this from My Reports.

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
import { AnnotationAppendix } from "@/components/AnnotationCallout";
import { detectDocumentType } from "@/lib/dpaDocumentType";


export default function DPAResult() {
  const { id } = useParams();
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let timer: any;
    const fetchOnce = async () => {
      const { data } = await supabase.from("dpa_documents").select("*").eq("id", id).maybeSingle();
      setRow(data);
      setLoading(false);
      if (data && (data.status === "pending" || data.status === "processing")) {
        timer = setTimeout(fetchOnce, 3000);
      }
    };
    fetchOnce();
    return () => timer && clearTimeout(timer);
  }, [id]);

  const intake = row?.intake_data || {};

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Helmet><title>Your Custom DPA | End User Privacy</title></Helmet>
      <Navbar />
      <main className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <BackLink to="/dashboard/reports" label="Back to My Reports" className="mb-4" />
        <ClientContextBadge />
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-navy" /></div>
        ) : !row ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <p className="text-slate">Document not found or you don't have access.</p>
            <Button asChild className="mt-4"><Link to="/dashboard/reports">Back to My Reports</Link></Button>
          </div>
        ) : row.status === "pending" || row.status === "processing" ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-brand-navy mx-auto mb-3" />
            <p className="text-foreground">Your DPA is being generated.</p>
            <p className="text-muted-foreground text-sm mt-1">Usually completes in 15–25 seconds.</p>
          </div>
        ) : (() => {
          const docType = detectDocumentType(intake.controllerJurisdiction || "", intake.processorJurisdiction || "");
          return (
          <ReportShell
            title={`Your ${docType.label} — ${intake.controllerName || "Controller"} / ${intake.processorName || "Processor"}`}
            meta={
              <>
                Generated {new Date(row.created_at).toLocaleDateString()} · {docType.label} · {intake.controllerJurisdiction || "—"} / {intake.processorJurisdiction || "—"}
              </>
            }

            actions={
              <>
                <PDFDownloadButton
                  toolType="dpa_generator"
                  assessmentId={row.id}
                  pdfUrl={row.pdf_url}
                  onGenerated={(url) => setRow({ ...row, pdf_url: url })}
                />
                <DownloadWordButton text={row?.document_text || ""} label="Custom DPA" />
                {row.document_text && <CopyButton text={row.document_text} />}
              </>
            }
          >
            <AssessmentReport text={row.document_text || ""} sectionChipLabel={null} />
            <AnnotationAppendix annotations={(row?.report_data as any)?.annotations} />
          </ReportShell>

          );
        })()}

      </main>
      <Footer />
    </div>
  );
}
