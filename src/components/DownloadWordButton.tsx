// DownloadWordButton — generates a brand-styled .docx download.
// Word can't render web fonts, so we use Cambria (DM Serif Display fallback)
// for headings and Calibri (DM Sans fallback) for body. Navy/teal accents
// match the website palette. Page header includes "EndUserPrivacy.com".
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  ShadingType,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";

interface Props {
  text: string;
  label: string;
  /** Optional subtitle line below the title (e.g. controller/processor names). */
  subtitle?: string;
  className?: string;
}

// Brand tokens (matches index.css / tailwind.config.ts)
const BRAND_NAVY = "0D2A45";
const BRAND_TEAL = "2A9D8F";
const BRAND_SLATE = "475569";
const BRAND_CLOUD = "F1F5F4";
const HEAD_FONT = "Cambria";    // Word-safe fallback for DM Serif Display
const BODY_FONT = "Calibri";    // Word-safe fallback for DM Sans

function brandBorder(color = "D9DDDC") {
  return { style: BorderStyle.SINGLE, size: 4, color };
}

export default function DownloadWordButton({ text, label, subtitle, className }: Props) {
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    if (!text?.trim()) {
      toast.error("No document text available to download.");
      return;
    }
    setBusy(true);
    try {
      // Defensive strip: remove markdown syntax
      const cleaned = text
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/\*\*\*/g, "")
        .replace(/\*\*/g, "")
        .replace(/\*([^*\n]+)\*/g, "$1")
        .replace(/^>\s?/gm, "");

      const lines = cleaned.split("\n");
      const children: Paragraph[] = [];

      // Title block
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: label,
              font: HEAD_FONT,
              size: 44, // 22pt
              bold: true,
              color: BRAND_NAVY,
            }),
          ],
        })
      );
      if (subtitle) {
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({ text: subtitle, font: BODY_FONT, size: 22, color: BRAND_SLATE }),
            ],
          })
        );
      }
      children.push(
        new Paragraph({
          spacing: { after: 240 },
          border: { bottom: { ...brandBorder(BRAND_TEAL), size: 12, space: 6 } },
          children: [
            new TextRun({
              text: `Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}  ·  EndUserPrivacy.com`,
              font: BODY_FONT,
              size: 18,
              color: BRAND_SLATE,
            }),
          ],
        })
      );

      for (const raw of lines) {
        const line = raw.trimEnd();
        if (!line.trim()) {
          children.push(new Paragraph({ spacing: { after: 100 } }));
          continue;
        }
        const trimmed = line.trim();
        const isMainHeading =
          trimmed === trimmed.toUpperCase() &&
          trimmed.length > 2 &&
          trimmed.length < 80 &&
          !/^\d+\./.test(trimmed) &&
          /[A-Z]/.test(trimmed);
        const isNumberedHeading = /^\d+(\.\d+)*\.\s+[A-Z]/.test(trimmed);
        const bulletMatch = line.match(/^([•\-*])\s+(.+)/);

        if (isMainHeading) {
          children.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 280, after: 120 },
              shading: { type: ShadingType.CLEAR, color: "auto", fill: BRAND_CLOUD },
              children: [
                new TextRun({
                  text: trimmed,
                  font: HEAD_FONT,
                  size: 30,
                  bold: true,
                  color: BRAND_NAVY,
                }),
              ],
            })
          );
        } else if (isNumberedHeading) {
          children.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 220, after: 80 },
              children: [
                new TextRun({
                  text: trimmed,
                  font: HEAD_FONT,
                  size: 26,
                  bold: true,
                  color: BRAND_TEAL,
                }),
              ],
            })
          );
        } else if (bulletMatch) {
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { after: 80 },
              children: [
                new TextRun({
                  text: bulletMatch[2].trim(),
                  font: BODY_FONT,
                  size: 22,
                  color: "1A1916",
                }),
              ],
            })
          );
        } else {
          children.push(
            new Paragraph({
              spacing: { after: 120, line: 312 },
              alignment: AlignmentType.JUSTIFIED,
              children: [
                new TextRun({
                  text: trimmed,
                  font: BODY_FONT,
                  size: 22,
                  color: "1A1916",
                }),
              ],
            })
          );
        }
      }

      // Disclaimer table at the end
      children.push(
        new Paragraph({ spacing: { before: 360 } }),
        new Paragraph({
          shading: { type: ShadingType.CLEAR, color: "auto", fill: BRAND_CLOUD },
          border: {
            top: brandBorder(BRAND_TEAL),
            bottom: brandBorder(BRAND_TEAL),
            left: brandBorder(BRAND_TEAL),
            right: brandBorder(BRAND_TEAL),
          },
          spacing: { before: 60, after: 60 },
          children: [
            new TextRun({
              text: "This document is a compliance framework tool and does not constitute legal advice. Review all findings with qualified legal counsel before relying on any regulatory position.",
              font: BODY_FONT,
              size: 18,
              italics: true,
              color: BRAND_SLATE,
            }),
          ],
        })
      );

      const doc = new Document({
        creator: "EndUserPrivacy.com",
        title: label,
        styles: {
          default: {
            document: { run: { font: BODY_FONT, size: 22, color: "1A1916" } },
          },
        },
        sections: [
          {
            properties: {
              page: {
                margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
              },
            },
            headers: {
              default: new Header({
                children: [
                  new Paragraph({
                    border: { bottom: { ...brandBorder(BRAND_TEAL), size: 6, space: 4 } },
                    children: [
                      new TextRun({
                        text: "EndUserPrivacy.com",
                        font: HEAD_FONT,
                        size: 20,
                        bold: true,
                        color: BRAND_NAVY,
                      }),
                      new TextRun({
                        text: `\t${label}`,
                        font: BODY_FONT,
                        size: 18,
                        color: BRAND_SLATE,
                      }),
                    ],
                  }),
                ],
              }),
            },
            footers: {
              default: new Footer({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: "Page ",
                        font: BODY_FONT,
                        size: 16,
                        color: BRAND_SLATE,
                      }),
                      new TextRun({
                        children: [PageNumber.CURRENT],
                        font: BODY_FONT,
                        size: 16,
                        color: BRAND_SLATE,
                      }),
                      new TextRun({
                        text: " / ",
                        font: BODY_FONT,
                        size: 16,
                        color: BRAND_SLATE,
                      }),
                      new TextRun({
                        children: [PageNumber.TOTAL_PAGES],
                        font: BODY_FONT,
                        size: 16,
                        color: BRAND_SLATE,
                      }),
                      new TextRun({
                        text: "  ·  © EndUserPrivacy.com",
                        font: BODY_FONT,
                        size: 16,
                        color: BRAND_SLATE,
                      }),
                    ],
                  }),
                ],
              }),
            },
            children,
          },
        ],
      });
      // Silence unused-import warning for Table helpers (kept for future structured exports)
      void Table; void TableRow; void TableCell; void WidthType;

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
