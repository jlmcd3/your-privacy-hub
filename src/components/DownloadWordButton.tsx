// DownloadWordButton — generates a real .docx (ZIP/OOXML) download.
// Uses the `docx` npm package which produces a proper Word-compatible file.
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from "docx";

interface Props {
  text: string;
  label: string;
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
      const lines = text.split("\n");
      const children: Paragraph[] = [];

      for (const raw of lines) {
        const line = raw.trimEnd();
        if (!line.trim()) {
          children.push(new Paragraph({ spacing: { after: 120 } }));
          continue;
        }

        const trimmed = line.trim();
        const isMainHeading =
          trimmed === trimmed.toUpperCase() &&
          trimmed.length > 2 &&
          trimmed.length < 80 &&
          !/^\d+\./.test(trimmed);

        const isNumberedHeading = /^\d+(\.\d+)*\.\s+[A-Z]/.test(trimmed);
        const bulletMatch = line.match(/^([•\-\*])\s+(.+)/);

        if (isMainHeading) {
          children.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 240, after: 120 },
              children: [new TextRun({ text: trimmed, bold: true, size: 24 })],
            })
          );
        } else if (isNumberedHeading) {
          children.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 80 },
              children: [new TextRun({ text: trimmed, bold: true, size: 22 })],
            })
          );
        } else if (bulletMatch) {
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { after: 80 },
              children: [new TextRun({ text: bulletMatch[2].trim(), size: 20 })],
            })
          );
        } else {
          children.push(
            new Paragraph({
              spacing: { after: 100 },
              children: [new TextRun({ text: trimmed, size: 20 })],
            })
          );
        }
      }

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
              },
            },
            children,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
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
