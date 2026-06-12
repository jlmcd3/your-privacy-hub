// Combined CPPA Suite PDF download button. Calls the
// generate-cppa-suite-pdf edge function with the risk_id + cyber_id from
// the current Suite Result page; opens the returned signed URL.

import { useState } from "react";
import { Loader2, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  riskId?: string | null;
  cyberId?: string | null;
  className?: string;
}

export default function CPPASuitePDFButton({ riskId, cyberId, className }: Props) {
  const [busy, setBusy] = useState(false);
  if (!riskId && !cyberId) return null;

  const handle = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cppa-suite-pdf", {
        body: { risk_id: riskId, cyber_id: cyberId },
      });
      if (error) {
        // R0 guards return 409 with a machine-readable reason. FunctionsHttpError
        // exposes the original Response on `context`.
        let reason: string | undefined;
        let status: number | undefined;
        try {
          const ctx: any = (error as any).context;
          status = ctx?.status;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            reason = body?.error;
          }
        } catch { /* fall through */ }
        if (status === 409) {
          if (reason === "report_not_ready") {
            throw new Error("Your report is still being generated. Please wait a moment and try again.");
          }
          if (reason === "report_body_empty" || reason === "report_data_invalid") {
            throw new Error("Report generation did not complete successfully. Please regenerate the report, then download the PDF. If this persists, contact support.");
          }
          throw new Error("The report isn't ready for PDF export yet. Please try again shortly.");
        }
        throw error;
      }
      if (!data?.pdf_url) throw new Error(data?.error || "PDF generation failed");
      if (!data.cached) toast.success("Combined Suite PDF ready");
      window.open(data.pdf_url, "_blank", "noopener");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Could not generate combined PDF");
    } finally {
      setBusy(false);
    }
  };

  const base = className ??
    "inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-white bg-brand-teal hover:bg-brand-teal/90 border border-brand-teal rounded-lg transition-colors disabled:opacity-60";

  return (
    <button type="button" onClick={handle} disabled={busy} className={base}>
      {busy ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing…</> : <><FileDown className="w-3.5 h-3.5" /> Download Combined Suite PDF</>}
    </button>
  );
}
