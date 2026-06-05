// View a previously generated Incident Response Playbook by ID.

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

export default function IRPlaybookResult() {
  const { id } = useParams();
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let timer: any;
    const fetchOnce = async () => {
      const { data } = await supabase.from("ir_playbooks").select("*").eq("id", id).maybeSingle();
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
      <Helmet><title>Your Incident Response Playbook | End User Privacy</title></Helmet>
      <Navbar />
      <main className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <BackLink to="/dashboard/reports" label="Back to My Reports" className="mb-4" />
        <ClientContextBadge />
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-navy" /></div>
        ) : !row ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <p className="text-slate">Playbook not found or you don't have access.</p>
            <Button asChild className="mt-4"><Link to="/dashboard/reports">Back to My Reports</Link></Button>
          </div>
        ) : row.status === "pending" || row.status === "processing" ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-brand-navy mx-auto mb-3" />
            <p className="text-foreground">Your playbook is being generated.</p>
          </div>
        ) : (
          <ReportShell
            topDisclaimer={
              <>
                This is an operational incident response guide to assist during a live
                breach event. It is not legal advice and does not constitute a formal
                legal compliance opinion. Notification deadlines are indicative based
                on publicly available regulatory guidance — confirm all timelines and
                obligations with qualified legal counsel before taking action.
              </>
            }
            title="Your Incident Response Playbook"
            meta={
              <>
                Generated {new Date(row.created_at).toLocaleDateString()}
                {(intake.jurisdictions || []).length > 0 && ` · ${(intake.jurisdictions || []).join(", ")}`}
              </>
            }
            actions={
              <>
                <PDFDownloadButton
                  toolType="ir_playbook"
                  assessmentId={row.id}
                  pdfUrl={row.pdf_url}
                  onGenerated={(url) => setRow({ ...row, pdf_url: url })}
                />
                <DownloadWordButton text={row?.playbook_text || ""} label="Incident Response Playbook" />
                {row.playbook_text && <CopyButton text={row.playbook_text} />}
              </>
            }
            callout={
              <p className="text-meta text-muted-foreground italic">
                This playbook and its documentation checklist contribute to your Article 33(5) accountability record.
              </p>
            }
          >
            <AssessmentReport text={row.playbook_text || ""} sectionChipLabel={null} />
            {Array.isArray((row?.report_data as any)?.annotations) && (row?.report_data as any).annotations.length > 0 && (
              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold mb-3">
                  Enforcement Basis for Timeline Recommendations
                </h3>
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
