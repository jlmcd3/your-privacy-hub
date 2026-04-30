// View a previously generated Breach Response Playbook by ID.

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CopyButton from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import BackLink from "@/components/dashboard/BackLink";
import { Loader2 } from "lucide-react";
import AssessmentReport from "@/components/AssessmentReport";
import ReportShell from "@/components/ReportShell";

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
    <div className="min-h-screen bg-paper">
      <Helmet><title>Your Breach Response Playbook | End User Privacy</title></Helmet>
      <Navbar />
      <main className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <BackLink to="/dashboard/reports" label="Back to My Reports" className="mb-4" />
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-navy" /></div>
        ) : !row ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <p className="text-slate">Playbook not found or you don't have access.</p>
            <Button asChild className="mt-4"><Link to="/dashboard/reports">Back to My Reports</Link></Button>
          </div>
        ) : row.status === "pending" || row.status === "processing" ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-navy mx-auto mb-3" />
            <p className="text-foreground">Your playbook is being generated.</p>
          </div>
        ) : (
          <ReportShell
            title="Your Breach Response Playbook"
            meta={
              <>
                Generated {new Date(row.created_at).toLocaleDateString()}
                {(intake.jurisdictions || []).length > 0 && ` · ${(intake.jurisdictions || []).join(", ")}`}
              </>
            }
            actions={
              <>
                {row.pdf_url && (
                  <a href={row.pdf_url} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg no-underline transition-colors">
                    ↓ Download PDF
                  </a>
                )}
                {row.playbook_text && <CopyButton text={row.playbook_text} />}
              </>
            }
            callout={
              <p className="text-[12px] text-muted-foreground italic">
                This playbook and its documentation checklist contribute to your Article 33(5) accountability record.
              </p>
            }
          >
            <AssessmentReport text={row.playbook_text || ""} sectionChipLabel={null} />
          </ReportShell>
        )}
      </main>
      <Footer />
    </div>
  );
}
