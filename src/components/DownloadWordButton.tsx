// DownloadWordButton — generates a .docx download from stored document text.
// Styled to match PDFDownloadButton (white-on-navy in ReportShell header).
// Uses a Blob + anchor approach — no edge function needed for plain-text tools.
// For structured JSON tools (LIA, DPIA, Governance) callers build a clean
// plain-text representation first and pass it via the `text` prop.

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  /** The document text to export. Pass the raw string stored in the DB. */
  text: string;
  /** Used as the downloaded filename, e.g. "Custom DPA" → "Custom-DPA.docx" */
  label: string;
  /** Optional className override (defaults match in-header white-on-navy chrome). */
  className?: string;
}

export default function DownloadWordButton({ text, label, className }: Props) {
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    if (!text?.trim()) {
      toast.error("No document text available to download.");
      return;
    }
    setBusy(true);
    try {
      const escape = (s: string) =>
        s
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");

      const paragraphs = text
        .split("\n")
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>`;
          }
          const isHeading =
            trimmed === trimmed.toUpperCase() &&
            trimmed.length < 80 &&
            trimmed.length > 2;
          const runProps = isHeading
            ? `<w:rPr><w:b/><w:sz w:val="24"/></w:rPr>`
            : `<w:rPr><w:sz w:val="20"/></w:rPr>`;
          return `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r>${runProps}<w:t xml:space="preserve">${escape(
            trimmed
          )}</w:t></w:r></w:p>`;
        })
        .join("\n");

      const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"
               w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
    ${paragraphs}
  </w:body>
</w:document>`;

      const blob = new Blob([xml], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${label.replace(/\s+/g, "-")}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Word document downloaded.");
    } catch (err) {
      console.error("Word download error:", err);
      toast.error("Could not generate Word document. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const baseClass =
    className ??
    "inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors disabled:opacity-60";

  return (
    <button onClick={handleDownload} disabled={busy} className={baseClass}>
      {busy ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13 8V2H7v6H2l8 8 8-8h-5zM0 18h20v2H0v-2z" />
        </svg>
      )}
      {busy ? "Preparing…" : "Download Word"}
    </button>
  );
}
