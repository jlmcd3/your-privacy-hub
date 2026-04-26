// View a previously generated Breach Response Playbook by ID.

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CopyButton from "@/components/CopyButton";
import ToolDisclaimer from "@/components/ToolDisclaimer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

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
      <Helmet><title>Your Breach Response Playbook | Your Privacy Hub</title></Helmet>
      <Navbar />
      <main className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
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
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h1 className="font-display font-bold text-navy text-[18px]">Your Breach Response Playbook</h1>
              <div className="flex gap-2">
                {row.pdf_url && (
                  <a href={row.pdf_url} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-white bg-gradient-to-br from-slate-700 to-blue-700 rounded-lg hover:opacity-90 no-underline">
                    ↓ Download PDF
                  </a>
                )}
                {row.playbook_text && <CopyButton text={row.playbook_text} />}
              </div>
            </div>
            <p className="text-[12px] text-muted-foreground mb-4">
              Generated {new Date(row.created_at).toLocaleDateString()}
              {(intake.jurisdictions || []).length > 0 && ` · ${(intake.jurisdictions || []).join(", ")}`}
            </p>
            {row.playbook_text ? (
              <pre className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-foreground">{row.playbook_text}</pre>
            ) : (
              <p className="text-slate text-sm">No playbook content available.</p>
            )}
            <p className="text-[12px] text-muted-foreground mt-4">
              This playbook and its documentation checklist contribute to your Article 33(5) accountability record.
            </p>
            <ToolDisclaimer />
            <div className="mt-6">
              <Button asChild variant="outline"><Link to="/dashboard/reports">← Back to My Reports</Link></Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
