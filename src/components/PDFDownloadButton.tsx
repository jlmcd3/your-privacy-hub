// PDFDownloadButton — appears in the navy header band of ReportShell.
// If pdf_url already exists, opens it in a new tab. Otherwise calls
// `generate-report-pdf` to render via PDFShift, then refreshes the parent.
//
// Designed to live on the dark header (white-on-navy styling).

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useConversionEvent } from "@/hooks/useConversionEvent";

type ToolType =
  | "biometric_checker"
  | "ir_playbook"
  | "dpa_generator"
  | "li_assessment"
  | "governance_assessment"
  | "dpia_framework"
  | "cppa_cybersecurity"
  | "cppa_risk"
  | "cppa_admt"
  | "cppa_scope"
  | "registration_assessment"
  | "registration_document"
  | "brief";

interface Props {
  toolType: ToolType;
  assessmentId: string;
  pdfUrl?: string | null;
  /** Called after a successful generation so parent can refetch the row. */
  onGenerated?: (pdfUrl: string) => void;
  /** Override default white-on-navy styling (e.g. for light backgrounds). */
  className?: string;
  /** Force regeneration, bypassing any cached PDF. */
  force?: boolean;
  /**
   * ITEM 369-IR LEG 1 — IR Playbook only: selects which of the two artifacts
   * from a single generation run to render and download. Ignored by every
   * other tool type.
   */
  artifact?: "standing_playbook" | "incident_worksheet";
  /** Override the button label (e.g. when two artifacts sit side by side). */
  label?: string;
}

export default function PDFDownloadButton({ toolType, assessmentId, pdfUrl, onGenerated, className, force, artifact, label }: Props) {
  const [busy, setBusy] = useState(false);
  const fireConversion = useConversionEvent();

  const baseClass = className ??
    "inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg no-underline transition-colors disabled:opacity-60";

  // Always (re)generate or refresh through the edge function so the URL
  // returned is a fresh signed URL against the now-private bucket. Legacy
  // public URLs stored in `pdf_url` no longer resolve.
  const handleDownload = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-report-pdf", {
        body: {
          tool_type: toolType,
          assessment_id: assessmentId,
          result_url: window.location.href,
          ...(force ? { force: true } : {}),
          ...(artifact ? { artifact } : {}),
        },
      });
      if (error) {
        // R0 guards return 409 with a machine-readable reason. FunctionsHttpError
        // exposes the original Response on `context` — read it to distinguish
        // "report not ready" from a genuine failure.
        let reason: string | undefined;
        let status: number | undefined;
        try {
          const ctx: any = (error as any).context;
          status = ctx?.status;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            reason = body?.error;
          }
        } catch { /* fall through to generic handling */ }
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
      if (!data?.pdf_url) {
        throw new Error(data?.error || "PDF generation is not yet configured. Please try again later.");
      }
      if (!pdfUrl) toast.success("PDF ready");
      onGenerated?.(data.pdf_url);
      fireConversion("report_download", { tool_slug: toolType, format: "pdf", ...(artifact ? { artifact } : {}) });
      window.open(data.pdf_url, "_blank", "noopener");
    } catch (e: any) {
      console.error("PDF generation failed:", e);
      toast.error(e?.message || "Could not generate PDF");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={handleDownload} disabled={busy} className={baseClass}>
      {busy ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {pdfUrl ? "Preparing…" : "Generating…"}</> : (label ?? "↓ Download PDF")}
    </button>
  );
}
