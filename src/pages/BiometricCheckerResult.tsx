// View a previously generated Biometric Compliance assessment by ID.

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CopyButton from "@/components/CopyButton";
import ToolDisclaimer from "@/components/ToolDisclaimer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import BackLink from "@/components/dashboard/BackLink";
import { Loader2 } from "lucide-react";

export default function BiometricCheckerResult() {
  const { id } = useParams();
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
  const text = row?.analysis_text || report?.assessment_text;
  const bipaRisk = report?.bipa_risk;

  return (
    <div className="min-h-screen bg-paper">
      <Helmet><title>Biometric Compliance Assessment | Your Privacy Hub</title></Helmet>
      <Navbar />
      <main className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <BackLink to="/dashboard/reports" label="Back to My Reports" className="mb-4" />
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
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h1 className="font-display font-bold text-navy text-[18px]">Biometric Compliance Assessment</h1>
              <div className="flex gap-2">
                {row.pdf_url && (
                  <a href={row.pdf_url} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-white bg-gradient-to-br from-slate-700 to-blue-700 rounded-lg hover:opacity-90 no-underline">
                    ↓ Download PDF
                  </a>
                )}
                {text && <CopyButton text={text} />}
              </div>
            </div>
            <p className="text-[12px] text-muted-foreground">
              Generated {new Date(row.created_at).toLocaleDateString()}
              {(row.jurisdictions || []).length > 0 && ` · ${(row.jurisdictions || []).join(", ")}`}
            </p>

            {bipaRisk && (
              <div className="border-2 border-amber-400 bg-amber-50 rounded-xl p-4">
                <h3 className="font-display font-bold text-amber-900 text-[14px] mb-2">⚠️ BIPA Litigation Risk Estimate</h3>
                <p className="text-[13px] text-amber-900">
                  Low end: <strong>${bipaRisk.lowEnd?.toLocaleString()}</strong> · High end: <strong>${bipaRisk.highEnd?.toLocaleString()}</strong>
                </p>
                {bipaRisk.note && <p className="text-[11px] text-amber-800 mt-1">{bipaRisk.note}</p>}
              </div>
            )}

            {text ? (
              <pre className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-foreground">{text}</pre>
            ) : (
              <p className="text-slate text-sm">No assessment content available.</p>
            )}
            <ToolDisclaimer />
            <div className="pt-2">
              <Button asChild variant="outline"><Link to="/dashboard/reports">← Back to My Reports</Link></Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
