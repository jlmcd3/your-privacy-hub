// AssessmentReport — pleasing, brand-aligned renderer for long-form
// assessment text returned by the AI tools (Biometric, IR Playbook, DPA, etc.)
//
// The AI returns markdown-flavoured plain text with a predictable shape:
//   ### JURISDICTION — STATUTE
//   **Section label:** body...
//   **Section label:**
//   - bullet
//   1. numbered item
//
// Rather than ship a heavyweight markdown library, this component does a
// targeted parse and renders the text into:
//   • One "jurisdiction card" per `### …` heading (collapsible-feeling stack)
//   • Sub-sections (the **bold labels**) styled as chapter heads with an
//     accent rule and DM Serif Display heading typography
//   • Numbered lists with a navy circle numeral and hanging indent
//   • Bullet lists with a slim accent dot
//   • Inline **bold** rendered with a slightly heavier navy weight
//
// All colours come from the design tokens defined in src/index.css and
// tailwind.config.ts. No hardcoded hex values.

import { ReactNode } from "react";

// ───────────────────────── inline formatter ─────────────────────────
// Render **bold** spans inside an arbitrary string. We deliberately
// don't try to support nested markdown — the text shape is predictable.
function renderInline(text: string, keyPrefix = "i"): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let n = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      // Use medium weight (500) so emphasized phrases remain readable
      // without the letterforms bleeding into each other.
      <strong key={`${keyPrefix}-${n++}`} className="font-medium text-foreground">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

// ───────────────────────── block parser ─────────────────────────
type Block =
  | { type: "subhead"; text: string; trailing?: string }   // **Label:** [optional inline body]
  | { type: "para"; text: string }
  | { type: "ol"; items: string[] }
  | { type: "ul"; items: string[] };

function parseBlocks(body: string): Block[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  // detect "**Label:**" (entire line) OR "**Label:** body…"
  const subheadRe = /^\*\*([^*]+?):\*\*\s*(.*)$/;
  const numberedRe = /^(\d+)\.\s+(.*)$/;
  const bulletRe = /^[-•]\s+(.*)$/;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) {
      i++;
      continue;
    }

    // Markdown-style horizontal rule — already separated visually by cards.
    if (/^[-*_]{3,}$/.test(line)) {
      i++;
      continue;
    }

    // Sub-heading line
    const sh = subheadRe.exec(line);
    if (sh) {
      blocks.push({
        type: "subhead",
        text: sh[1].trim(),
        trailing: sh[2] ? sh[2].trim() : undefined,
      });
      i++;
      continue;
    }

    // Numbered list — collect contiguous items, supporting wrapped lines
    if (numberedRe.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const cur = lines[i].trim();
        const m = numberedRe.exec(cur);
        if (m) {
          items.push(m[2]);
          i++;
        } else if (cur && !subheadRe.test(cur) && !bulletRe.test(cur) && items.length > 0 && !numberedRe.test(cur)) {
          // continuation line — append to the last item
          items[items.length - 1] += " " + cur;
          i++;
        } else {
          break;
        }
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Bullet list
    if (bulletRe.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const cur = lines[i].trim();
        const m = bulletRe.exec(cur);
        if (m) {
          items.push(m[1]);
          i++;
        } else if (cur && !subheadRe.test(cur) && !numberedRe.test(cur) && items.length > 0) {
          items[items.length - 1] += " " + cur;
          i++;
        } else {
          break;
        }
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Plain paragraph
    blocks.push({ type: "para", text: line });
    i++;
  }
  return blocks;
}

// ───────────────────────── jurisdiction split ─────────────────────────
type Section = {
  // Heading text after the leading "### " marker, e.g.
  // "UNITED KINGDOM — UK GDPR / DATA PROTECTION ACT 2018"
  heading: string | null; // null means "preamble before any heading"
  body: string;
};

function splitSections(text: string): Section[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const sections: Section[] = [];
  let current: Section = { heading: null, body: "" };
  for (const line of lines) {
    const m = /^(?:#{1,3}\s+)?([A-Z][A-Z\s\(\)\/0-9,\.]+(?:\s+[—–-]\s+.+)?)$/.exec(line);
    if (m) {
      // close previous section
      if (current.heading || current.body.trim()) sections.push(current);
      current = { heading: m[1].trim(), body: "" };
    } else {
      current.body += (current.body ? "\n" : "") + line;
    }
  }
  if (current.heading || current.body.trim()) sections.push(current);
  return sections;
}

// Heuristic: split a heading like
//   "UNITED KINGDOM — UK GDPR / DATA PROTECTION ACT 2018"
// into { jurisdiction, statute }. We accept either em-dash or " - ".
function splitHeading(heading: string): { jurisdiction: string; statute?: string } {
  const m = /^(.+?)\s+[—–-]\s+(.+)$/.exec(heading);
  if (m) return { jurisdiction: m[1].trim(), statute: m[2].trim() };
  return { jurisdiction: heading };
}

// ───────────────────────── block renderer ─────────────────────────
function BlockList({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((b, idx) => {
        if (b.type === "subhead") {
          return (
            <div key={idx} className="pt-2">
              {/* DM Sans medium reads cleaner than DM Serif Display bold at this size */}
              <h4 className="text-sm font-semibold text-brand-navy tracking-tight uppercase">
                {b.text}
              </h4>
              <div className="mt-1 h-[2px] w-10 bg-[hsl(var(--steel))] rounded-full" />
              {b.trailing && (
                <p className="mt-2 text-sm leading-relaxed text-foreground">
                  {renderInline(b.trailing, `sh-${idx}`)}
                </p>
              )}
            </div>
          );
        }
        if (b.type === "para") {
          return (
            <p key={idx} className="text-sm leading-relaxed text-foreground">
              {renderInline(b.text, `p-${idx}`)}
            </p>
          );
        }
        if (b.type === "ol") {
          return (
            <ol key={idx} className="space-y-2.5">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-2">
                  <span
                    className="flex-shrink-0 text-sm font-semibold text-brand-navy tabular-nums leading-relaxed min-w-[1.5rem]"
                    aria-hidden
                  >
                    {j + 1}.
                  </span>
                  <span className="text-sm leading-relaxed text-foreground">
                    {renderInline(it, `ol-${idx}-${j}`)}
                  </span>
                </li>
              ))}
            </ol>
          );
        }

        // ul
        return (
          <ul key={idx} className="space-y-2">
            {b.items.map((it, j) => (
              <li key={j} className="flex gap-3">
                <span
                  className="flex-shrink-0 mt-[9px] w-1.5 h-1.5 rounded-full bg-[hsl(var(--accent))]"
                  aria-hidden
                />
                <span className="text-sm leading-relaxed text-foreground">
                  {renderInline(it, `ul-${idx}-${j}`)}
                </span>
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}

// ───────────────────────── main component ─────────────────────────
export interface AssessmentReportProps {
  /** The raw markdown-flavoured text returned by the AI tool. */
  text: string;
  /**
   * Optional label printed in a small chip above each jurisdiction
   * heading (e.g. "Jurisdiction"). Set to null to suppress.
   */
  sectionChipLabel?: string | null;
}

export default function AssessmentReport({
  text,
  sectionChipLabel = "Jurisdiction",
}: AssessmentReportProps) {
  if (!text || !text.trim()) {
    return (
      <p className="text-slate text-sm">No assessment content available.</p>
    );
  }

  const sections = splitSections(text);

  // If the document has no `###` headings at all, render as one card so
  // tools like the IR Playbook and DPA Generator still get the polished look.
  const hasJurisdictions = sections.some((s) => s.heading);

  return (
    <div className="space-y-6">
      {sections.map((sec, idx) => {
        const blocks = parseBlocks(sec.body);
        if (blocks.length === 0 && !sec.heading) return null;

        if (!sec.heading) {
          // Preamble paragraph — render unwrapped, no card
          return (
            <div key={idx} className="px-1">
              <BlockList blocks={blocks} />
            </div>
          );
        }

        const { jurisdiction, statute } = splitHeading(sec.heading);

        return (
          <article
            key={idx}
            className="relative bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
          >
            {/* Accent rail — matches ArticleCard convention */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 bg-[hsl(var(--steel))]"
              aria-hidden
            />

            {/* Header band */}
            <header className="px-6 pt-6 pb-4 border-b border-border bg-gradient-to-br from-[hsl(var(--paper))] to-card">
              {hasJurisdictions && sectionChipLabel && (
                <span className="inline-block text-meta font-semibold uppercase tracking-[0.08em] text-slate bg-[hsl(var(--silver))] px-2 py-0.5 rounded-full mb-2">
                  {sectionChipLabel}
                </span>
              )}
              <h3 className="text-brand-navy leading-tight">
                {jurisdiction}
              </h3>
              {statute && (
                <p className="mt-1 text-meta font-mono text-slate uppercase tracking-wide">
                  {statute}
                </p>
              )}
            </header>

            {/* Body */}
            <div className="px-6 py-6">
              <BlockList blocks={blocks} />
            </div>
          </article>
        );
      })}
    </div>
  );
}
