// DownloadWordButton — generates a brand-styled .docx download.
// Uses marked.lexer to produce a real Markdown AST, then walks tokens into
// docx primitives. Word can't render web fonts, so Cambria substitutes for
// DM Serif Display (headings) and Calibri for DM Sans (body). Navy/teal
// accents match the website palette. Same {text,label,subtitle} props as
// before — drop-in replacement for every tool that calls this component.
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { marked, type Tokens } from "marked";
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
  LevelFormat,
  ExternalHyperlink,
  PageOrientation,
  type IRunOptions,
  type ParagraphChild,
} from "docx";

interface Props {
  text: string;
  label: string;
  /** Optional subtitle line below the title (e.g. controller/processor names). */
  subtitle?: string;
  className?: string;
  /** Override the default "Download Word" button text. */
  buttonLabel?: string;
}

// Brand tokens (matches index.css / tailwind.config.ts)
const BRAND_NAVY = "0D2A45";
const BRAND_TEAL = "2A9D8F";
const BRAND_SLATE = "475569";
const BRAND_CLOUD = "F1F5F4";
const BODY_INK = "1A1916";
const HEAD_FONT = "Cambria"; // Word-safe fallback for DM Serif Display
const BODY_FONT = "Calibri"; // Word-safe fallback for DM Sans
const MONO_FONT = "Consolas"; // Word-safe fallback for DM Mono

// US Letter, 1" margins. Content width = 12240 - 2880 = 9360 DXA.
const CONTENT_WIDTH = 9360;

function brandBorder(color = "D9DDDC", size = 4) {
  return { style: BorderStyle.SINGLE, size, color, space: 1 };
}

// ---------- Inline token → TextRun[] ----------

type InlineStyle = {
  bold?: boolean;
  italics?: boolean;
  strike?: boolean;
  code?: boolean;
};

function makeRun(text: string, style: InlineStyle, extra: Partial<IRunOptions> = {}): TextRun {
  return new TextRun({
    text,
    bold: style.bold,
    italics: style.italics,
    strike: style.strike,
    font: style.code ? MONO_FONT : BODY_FONT,
    size: 22,
    color: BODY_INK,
    ...extra,
  });
}

function walkInline(tokens: Tokens.Generic[] | undefined, style: InlineStyle = {}): ParagraphChild[] {
  if (!tokens) return [];
  const out: ParagraphChild[] = [];
  for (const tok of tokens) {
    switch (tok.type) {
      case "text": {
        const t = tok as Tokens.Text;
        if (t.tokens && t.tokens.length) {
          out.push(...walkInline(t.tokens as Tokens.Generic[], style));
        } else {
          out.push(makeRun(t.text, style));
        }
        break;
      }
      case "strong":
        out.push(...walkInline((tok as Tokens.Strong).tokens as Tokens.Generic[], { ...style, bold: true }));
        break;
      case "em":
        out.push(...walkInline((tok as Tokens.Em).tokens as Tokens.Generic[], { ...style, italics: true }));
        break;
      case "del":
        out.push(...walkInline((tok as Tokens.Del).tokens as Tokens.Generic[], { ...style, strike: true }));
        break;
      case "codespan":
        out.push(makeRun((tok as Tokens.Codespan).text, { ...style, code: true }));
        break;
      case "br":
        out.push(new TextRun({ text: "", break: 1 }));
        break;
      case "link": {
        const l = tok as Tokens.Link;
        out.push(
          new ExternalHyperlink({
            link: l.href,
            children: walkInline(l.tokens as Tokens.Generic[], { ...style }).map((child) =>
              child instanceof TextRun
                ? new TextRun({
                    text: (l.tokens?.[0] as Tokens.Text)?.text ?? l.text,
                    font: BODY_FONT,
                    size: 22,
                    color: BRAND_TEAL,
                    underline: {},
                  })
                : child,
            ),
          }),
        );
        break;
      }
      case "html": {
        // Strip HTML tags defensively — render textual content only.
        const stripped = (tok as Tokens.HTML).text.replace(/<[^>]+>/g, "");
        if (stripped) out.push(makeRun(stripped, style));
        break;
      }
      case "escape":
        out.push(makeRun((tok as Tokens.Escape).text, style));
        break;
      default:
        if ((tok as { text?: string }).text) {
          out.push(makeRun((tok as { text: string }).text, style));
        }
    }
  }
  return out;
}

// ---------- Block token → Paragraph/Table[] ----------

type Block = Paragraph | Table;

function headingParagraph(depth: number, runs: ParagraphChild[]): Paragraph {
  const sizes = [36, 30, 26, 24, 22, 20]; // half-points: 18,15,13,12,11,10
  const idx = Math.min(Math.max(depth - 1, 0), 5);
  const isH1 = depth === 1;
  const color = depth <= 2 ? BRAND_NAVY : BRAND_TEAL;
  // Recolour runs to heading palette + heading font.
  const styled = runs.map((r) =>
    r instanceof TextRun
      ? new TextRun({
          text: (r as unknown as { options?: { text?: string } }).options?.text ?? "",
          bold: true,
          font: HEAD_FONT,
          size: sizes[idx],
          color,
        })
      : r,
  );
  return new Paragraph({
    heading: ([
      HeadingLevel.HEADING_1,
      HeadingLevel.HEADING_2,
      HeadingLevel.HEADING_3,
      HeadingLevel.HEADING_4,
      HeadingLevel.HEADING_5,
      HeadingLevel.HEADING_6,
    ] as const)[idx],
    spacing: { before: isH1 ? 320 : 240, after: isH1 ? 160 : 100 },
    shading: isH1 ? { type: ShadingType.CLEAR, color: "auto", fill: BRAND_CLOUD } : undefined,
    border: isH1
      ? { bottom: { ...brandBorder(BRAND_TEAL, 6), space: 4 } }
      : undefined,
    children: styled.length ? styled : runs,
  });
}

function paragraphFromInline(runs: ParagraphChild[]): Paragraph {
  return new Paragraph({
    spacing: { after: 140, line: 312 },
    alignment: AlignmentType.LEFT,
    children: runs,
  });
}

function blockquoteParagraph(runs: ParagraphChild[]): Paragraph {
  // Italic slate, left teal rule, padded.
  const restyled = runs.map((r) =>
    r instanceof TextRun
      ? new TextRun({
          text: (r as unknown as { options?: { text?: string } }).options?.text ?? "",
          italics: true,
          font: BODY_FONT,
          size: 22,
          color: BRAND_SLATE,
        })
      : r,
  );
  return new Paragraph({
    spacing: { before: 120, after: 140, line: 300 },
    indent: { left: 360 },
    border: { left: { ...brandBorder(BRAND_TEAL, 18), space: 12 } },
    children: restyled,
  });
}

function listItemParagraph(
  item: Tokens.ListItem,
  ordered: boolean,
  refOrdered: string,
  refBullet: string,
  level: number,
): Block[] {
  const out: Block[] = [];
  // Collect inline tokens that belong to this item (skip nested lists).
  const inlineTokens: Tokens.Generic[] = [];
  const nested: Tokens.List[] = [];
  for (const t of item.tokens as Tokens.Generic[]) {
    if (t.type === "list") nested.push(t as Tokens.List);
    else if (t.type === "text") {
      const tt = t as Tokens.Text;
      inlineTokens.push(...((tt.tokens as Tokens.Generic[]) ?? [{ type: "text", text: tt.text } as Tokens.Generic]));
    } else if (t.type === "paragraph") {
      inlineTokens.push(...((t as Tokens.Paragraph).tokens as Tokens.Generic[]));
    }
  }
  out.push(
    new Paragraph({
      numbering: { reference: ordered ? refOrdered : refBullet, level },
      spacing: { after: 80 },
      children: walkInline(inlineTokens),
    }),
  );
  for (const sub of nested) {
    for (const subItem of sub.items) {
      out.push(...listItemParagraph(subItem, !!sub.ordered, refOrdered, refBullet, level + 1));
    }
  }
  return out;
}

function tableBlock(tok: Tokens.Table): Table {
  const colCount = tok.header.length || 1;
  const colWidth = Math.floor(CONTENT_WIDTH / colCount);
  const columnWidths = Array(colCount).fill(colWidth);
  // Adjust last column so widths sum to CONTENT_WIDTH exactly.
  columnWidths[colCount - 1] += CONTENT_WIDTH - colWidth * colCount;

  const cellBorders = {
    top: brandBorder("CBD5E1"),
    bottom: brandBorder("CBD5E1"),
    left: brandBorder("CBD5E1"),
    right: brandBorder("CBD5E1"),
  };

  const headerRow = new TableRow({
    tableHeader: true,
    children: tok.header.map((cell, i) =>
      new TableCell({
        width: { size: columnWidths[i], type: WidthType.DXA },
        borders: cellBorders,
        shading: { type: ShadingType.CLEAR, color: "auto", fill: BRAND_NAVY },
        margins: { top: 100, bottom: 100, left: 140, right: 140 },
        children: [
          new Paragraph({
            children: walkInline(cell.tokens as Tokens.Generic[]).map((r) =>
              r instanceof TextRun
                ? new TextRun({
                    text: (r as unknown as { options?: { text?: string } }).options?.text ?? "",
                    bold: true,
                    font: HEAD_FONT,
                    size: 20,
                    color: "FFFFFF",
                  })
                : r,
            ),
          }),
        ],
      }),
    ),
  });

  const bodyRows = tok.rows.map(
    (row, rIdx) =>
      new TableRow({
        children: row.map(
          (cell, i) =>
            new TableCell({
              width: { size: columnWidths[i], type: WidthType.DXA },
              borders: cellBorders,
              shading:
                rIdx % 2 === 1
                  ? { type: ShadingType.CLEAR, color: "auto", fill: BRAND_CLOUD }
                  : undefined,
              margins: { top: 80, bottom: 80, left: 140, right: 140 },
              children: [new Paragraph({ children: walkInline(cell.tokens as Tokens.Generic[]) })],
            }),
        ),
      }),
  );

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths,
    rows: [headerRow, ...bodyRows],
  });
}

function hrParagraph(): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { ...brandBorder(BRAND_TEAL, 6), space: 6 } },
    children: [new TextRun({ text: "" })],
  });
}

function codeBlockParagraph(code: string): Paragraph {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    shading: { type: ShadingType.CLEAR, color: "auto", fill: "F1F5F9" },
    border: {
      top: brandBorder("E2E8F0"),
      bottom: brandBorder("E2E8F0"),
      left: brandBorder("E2E8F0"),
      right: brandBorder("E2E8F0"),
    },
    children: code.split("\n").map(
      (line, i) =>
        new TextRun({
          text: line,
          font: MONO_FONT,
          size: 20,
          color: BODY_INK,
          break: i === 0 ? undefined : 1,
        }),
    ),
  });
}

function walkBlocks(
  tokens: Tokens.Generic[],
  refOrdered: string,
  refBullet: string,
): Block[] {
  const out: Block[] = [];
  for (const tok of tokens) {
    switch (tok.type) {
      case "heading": {
        const h = tok as Tokens.Heading;
        out.push(headingParagraph(h.depth, walkInline(h.tokens as Tokens.Generic[])));
        break;
      }
      case "paragraph": {
        const p = tok as Tokens.Paragraph;
        out.push(paragraphFromInline(walkInline(p.tokens as Tokens.Generic[])));
        break;
      }
      case "blockquote": {
        const bq = tok as Tokens.Blockquote;
        // Flatten inner paragraphs into single-line blockquote runs.
        const inner = walkBlocks(bq.tokens as Tokens.Generic[], refOrdered, refBullet);
        for (const block of inner) {
          if (block instanceof Paragraph) {
            // Re-wrap children as blockquote-styled paragraph.
            const childRuns = (block as unknown as { root: ParagraphChild[] }).root ?? [];
            out.push(blockquoteParagraph(childRuns));
          } else {
            out.push(block);
          }
        }
        break;
      }
      case "list": {
        const l = tok as Tokens.List;
        for (const item of l.items) {
          out.push(...listItemParagraph(item, !!l.ordered, refOrdered, refBullet, 0));
        }
        out.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
        break;
      }
      case "table":
        out.push(tableBlock(tok as Tokens.Table));
        out.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
        break;
      case "hr":
        out.push(hrParagraph());
        break;
      case "code":
        out.push(codeBlockParagraph((tok as Tokens.Code).text));
        break;
      case "space":
        out.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
        break;
      case "html": {
        const stripped = (tok as Tokens.HTML).text.replace(/<[^>]+>/g, "").trim();
        if (stripped) out.push(paragraphFromInline([makeRun(stripped, {})]));
        break;
      }
      default:
        if ((tok as { text?: string }).text) {
          out.push(paragraphFromInline([makeRun((tok as { text: string }).text, {})]));
        }
    }
  }
  return out;
}

export default function DownloadWordButton({ text, label, subtitle, className, buttonLabel }: Props) {
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    if (!text?.trim()) {
      toast.error("No document text available to download.");
      return;
    }
    setBusy(true);
    try {
      // Lex Markdown into an AST. gfm:true gives us tables + strikethrough.
      const tokens = marked.lexer(text, { gfm: true, breaks: false }) as Tokens.Generic[];

      const refOrdered = "eup-ordered";
      const refBullet = "eup-bullet";

      const body: Block[] = [];

      // Title block
      body.push(
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
        }),
      );
      if (subtitle) {
        body.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({ text: subtitle, font: BODY_FONT, size: 22, color: BRAND_SLATE }),
            ],
          }),
        );
      }
      body.push(
        new Paragraph({
          spacing: { after: 280 },
          border: { bottom: { ...brandBorder(BRAND_TEAL, 12), space: 6 } },
          children: [
            new TextRun({
              text: `Generated ${new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}  ·  EndUserPrivacy.com`,
              font: BODY_FONT,
              size: 18,
              color: BRAND_SLATE,
            }),
          ],
        }),
      );

      // Walk the AST.
      body.push(...walkBlocks(tokens, refOrdered, refBullet));

      // Disclaimer block
      body.push(new Paragraph({ spacing: { before: 360 }, children: [] }));
      body.push(
        new Paragraph({
          shading: { type: ShadingType.CLEAR, color: "auto", fill: BRAND_CLOUD },
          border: {
            top: brandBorder(BRAND_TEAL),
            bottom: brandBorder(BRAND_TEAL),
            left: brandBorder(BRAND_TEAL),
            right: brandBorder(BRAND_TEAL),
          },
          spacing: { before: 120, after: 120 },
          indent: { left: 180, right: 180 },
          children: [
            new TextRun({
              text: "This document is a compliance framework tool and does not constitute legal advice. Review all findings with qualified legal counsel before relying on any regulatory position.",
              font: BODY_FONT,
              size: 18,
              italics: true,
              color: BRAND_SLATE,
            }),
          ],
        }),
      );

      const doc = new Document({
        creator: "EndUserPrivacy.com",
        title: label,
        numbering: {
          config: [
            {
              reference: refBullet,
              levels: [0, 1, 2, 3].map((lvl) => ({
                level: lvl,
                format: LevelFormat.BULLET,
                text: ["•", "◦", "▪", "·"][lvl] ?? "•",
                alignment: AlignmentType.LEFT,
                style: {
                  paragraph: { indent: { left: 720 * (lvl + 1), hanging: 360 } },
                },
              })),
            },
            {
              reference: refOrdered,
              levels: [0, 1, 2, 3].map((lvl) => ({
                level: lvl,
                format: LevelFormat.DECIMAL,
                text: `%${lvl + 1}.`,
                alignment: AlignmentType.LEFT,
                style: {
                  paragraph: { indent: { left: 720 * (lvl + 1), hanging: 360 } },
                },
              })),
            },
          ],
        },
        styles: {
          default: {
            document: { run: { font: BODY_FONT, size: 22, color: BODY_INK } },
          },
          paragraphStyles: [
            {
              id: "Heading1",
              name: "Heading 1",
              basedOn: "Normal",
              next: "Normal",
              quickFormat: true,
              run: { font: HEAD_FONT, size: 36, bold: true, color: BRAND_NAVY },
              paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 },
            },
            {
              id: "Heading2",
              name: "Heading 2",
              basedOn: "Normal",
              next: "Normal",
              quickFormat: true,
              run: { font: HEAD_FONT, size: 30, bold: true, color: BRAND_NAVY },
              paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 },
            },
            {
              id: "Heading3",
              name: "Heading 3",
              basedOn: "Normal",
              next: "Normal",
              quickFormat: true,
              run: { font: HEAD_FONT, size: 26, bold: true, color: BRAND_TEAL },
              paragraph: { spacing: { before: 220, after: 80 }, outlineLevel: 2 },
            },
          ],
        },
        sections: [
          {
            properties: {
              page: {
                size: {
                  width: 12240,
                  height: 15840,
                  orientation: PageOrientation.PORTRAIT,
                },
                margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
              },
            },
            headers: {
              default: new Header({
                children: [
                  new Paragraph({
                    border: { bottom: { ...brandBorder(BRAND_TEAL, 6), space: 4 } },
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
                      new TextRun({ text: "Page ", font: BODY_FONT, size: 16, color: BRAND_SLATE }),
                      new TextRun({
                        children: [PageNumber.CURRENT],
                        font: BODY_FONT,
                        size: 16,
                        color: BRAND_SLATE,
                      }),
                      new TextRun({ text: " / ", font: BODY_FONT, size: 16, color: BRAND_SLATE }),
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
            children: body,
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
      {busy ? "Preparing…" : (buttonLabel ?? "Download Word")}
    </button>
  );
}
