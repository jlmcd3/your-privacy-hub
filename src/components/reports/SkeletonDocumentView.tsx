// SO WIRE-IN — the customer-facing view of the byte-pinned skeleton document.
//
// The edge functions assemble the ratified skeleton into `report_data.
// skeleton_document`. This component is the in-app renderer for that payload,
// and is the same content the PDF renders — one document, two surfaces.
//
// ITEM 4 — FIRST ToA FIX (CEO-directed, 2026-08-15; presentation only): the
// Table of Authorities renders VERTICALLY, one authority per row, single
// column, through the shared `toaLines` helper.

import { toaLines } from "@/lib/toa-lines";
import { renderBodyText, renderWithFootnotes, toaAnchorId } from "@/lib/footnote-marks";

// CEO report review 2026-08-24 — web twin of generate-report-pdf/index.ts's
// segmentDashText (which see for the full rationale: groups consecutive
// "— "-led sentences into list runs and everything else into paragraph
// runs, sentence-by-sentence, abbreviation-aware). `abbrevFirstSentence`
// mirrors clause-bound.ts's `firstSentence`/`ABBREV_TAIL` — no shared web
// import exists for that Deno-side module, so it's duplicated here byte-
// for-byte in intent (not text, since this is presentation-layer parsing,
// not byte-pinned content).
// CEO report review 2026-08-25 — negative lookbehind excludes "Appendix
// F."/"Exhibit F." from the generic single-letter fallback; see the
// clause-bound.ts twin for the full rationale.
const ABBREV_TAIL =
  /(?:\b(?:Art|Arts|Artt|No|Nos|Reg|Recital|Sched|Sec|Secs|Ch|Cl|para|paras|pp|cf|Cal|Civ|Code|Tex|Bus|Com|Ins|Bus\.\s&\sCom|Inc|Ltd|GmbH|AG|Co|Corp|plc|Nr|vs|v|e\.g|i\.e|etc|approx|Dr|Mr|Mrs|Ms|St|U\.S|U\.K)|(?<!Appendix|Exhibit)\s[A-Z])\.$/;
function abbrevFirstSentence(text: string): string {
  const t = text.trim();
  const re = /[.!?](?=\s|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const end = m.index + 1;
    const head = t.slice(0, end);
    if (ABBREV_TAIL.test(head)) continue;
    if (/^\s+[a-z0-9]/.test(t.slice(end))) continue;
    return head.trim();
  }
  return t;
}
interface SentenceSpan {
  text: string;
  start: number;
  end: number;
}
/**
 * Sentence boundaries with their offsets in the ORIGINAL string. Offsets
 * (not just trimmed sentence text) matter: item 5's fix deliberately
 * joins pathway/safeguard items with a bare "\n" so each starts its own
 * line, and a plain-prose run spanning that "\n" must keep it — rejoining
 * trimmed sentences with a fixed " " would flatten it back to a run-on
 * line, undoing that fix.
 */
function sentenceSpans(text: string): SentenceSpan[] {
  const out: SentenceSpan[] = [];
  let cursor = 0;
  let rest = text;
  for (;;) {
    const leadingWs = /^\s*/.exec(rest)![0];
    cursor += leadingWs.length;
    rest = rest.slice(leadingWs.length);
    if (!rest) break;
    const one = abbrevFirstSentence(rest);
    let len = one ? one.length : rest.length;
    // A lead ending ":" immediately before a "— " item ("...testing: —
    // Encryption...") is ALSO a boundary here: some composers end their
    // lead with a colon, not a period, so without this the lead and its
    // first item glue into one sentence that doesn't itself start with
    // "—" and the whole run is missed as a list.
    const colonBoundary = /:\s+—\s/.exec(rest);
    if (colonBoundary && colonBoundary.index + 1 < len) len = colonBoundary.index + 1;
    out.push({ text: rest.slice(0, len).trim(), start: cursor, end: cursor + len });
    cursor += len;
    rest = rest.slice(len);
    if (!one) break;
  }
  return out;
}
// LEAD-PHRASE STYLING — the web twin of generate-report-pdf/index.ts's
// styleLeadPhrases (doc 66 Rule 2; run-in treatment re-ruled by the CEO
// 2026-08-26). Two closed-whitelist families:
//  HEAD — bold + underlined, inline where they stand: lettered leads
//   ("E. Residual Risk."), statutory harm labels ("(B) Unlawful …"),
//   method-step leads ("Step 1 — Triggers."), the named phrase-leads.
//  RUN-IN — "Conclusion.", "Out of scope.", "Analysis.", … render
//   UNDERLINED, NOT BOLD, and START A NEW LINE (the paragraph's
//   whitespace-pre-line renders the inserted "\n").
// Keep the two files' label lists and boundaries in sync.
// BATCH 16 (A-Team RULING 3.1 / doc 66 Rule 2 rewrite, 2026-08-30):
// HEAD_LEAD_LABELS is FROZEN — no new entries, ever. "Priority Matters:"
// and "Scope of Assessment:" moved HEAD → RUN-IN per RULING 3.1 item 4.
// Byte-equivalent with generate-report-pdf/index.ts.
const HEAD_LEAD_LABELS = [
  "Activity Assessed\\.", "Why a Risk Assessment Is Required\\.", "Key Findings\\.",
  "Overall Determination\\.", "Conditions to Proceed\\.", "Condition to Proceed\\.",
  "Assessment Follow-Up Required\\.", "Recommendation\\.", "Recommendations\\.",
  "Required Follow-Up\\.", "Follow-Ups\\.", "Record Considered\\.",
  "Risk Assessments\\.", "Outstanding Matters\\.", "Review and Maintenance\\.",
  "Withholding and Security:",
];
// RUN-IN additions ratified by doc 66 Rule 2 item 6 (A-Team RULING 3.1).
const RUNIN_LEAD_LABELS = [
  "Analysis\\.", "Conclusion\\.", "Reasoning\\.", "Consequence\\.",
  "Caution\\.", "Out of scope\\.", "Effectiveness analysis\\.",
  "Entry\\.", "Stages\\.", "Output\\.",
  "Rulemaking context — persuasive only\\.", "Analytical note\\.",
  "Statutory text\\.", "Record\\.", "Status\\.", "Controls described\\.",
  "Evidence identified\\.", "Auditor testability\\.", "Reliance notice\\.",
  "Deadline\\.", "Priority Matters:", "Scope of Assessment:",
];
// BATCH 16 (R2): a chunk that consists SOLELY of a structural lead renders
// as a sub-heading (doc 66 Rule 2 rewrite). Web sections already use h3, so
// sub-heads render as h4 at the same visual rank as the PDF's h3. Keep the
// shape regex byte-equivalent with generate-report-pdf/index.ts.
const H3_CHUNK_RE = new RegExp(
  `^(?:` +
    `(?:[A-Z]\\.\\s+[A-Z][^.\\n]{0,80}?\\.)` +
    `|(?:\\d{1,2}\\.\\s+[A-Z][^.\\n]{0,80}?)` +
    `|(?:§\\s?[\\d.()a-zA-Z/ ]{1,24}\\s+—\\s+[A-Z][^.\\n]{0,80}?\\.?)` +
    `|(?:Step \\d+ — [A-Z][^.\\n]{0,40}?\\.)` +
    `|(?:${HEAD_LEAD_LABELS.join("|")})` +
  `)$`,
);
// BATCH 16 (R4): one enquoted span of >= ~25 words renders as the
// statute-quote block (composer-typed quoted_authority paragraphs too).
const QUOTE_CHUNK_RE = /^[\u201c"][\s\S]{40,}[\u201d"]\.?$/;
const LEAD_PHRASE_RE = new RegExp(
  `(^|[.!?]\\s+|\\n\\s*)((?:[A-Z]\\.\\s+[A-Z][^.\\n]{0,80}?\\.)|(?:\\([A-H]\\)\\s+[A-Z][^.\\n]{0,140}?\\.)|(?:Step \\d+ — [A-Z][^.\\n]{0,40}?\\.)|${HEAD_LEAD_LABELS.join("|")})(?=\\s|$)` +
    `|(^|[.!?]\\s+|\\n\\s*)(${RUNIN_LEAD_LABELS.join("|")})(?=\\s|$)`,
  "g",
);
/** Chunk text → React nodes: HEAD leads bold+underlined inline; RUN-IN
 * labels underlined (not bold) on a new line; the remaining text routed
 * through renderBodyText (appendix-ref underlining). */
function renderLeadStyledText(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  LEAD_PHRASE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LEAD_PHRASE_RE.exec(text)) !== null) {
    const isHead = m[2] !== undefined;
    const pre = (isHead ? m[1] : m[3]) ?? "";
    const label = (isHead ? m[2] : m[4]) as string;
    const labelStart = m.index + pre.length;
    if (labelStart > last) {
      const preText = text.slice(last, labelStart);
      // Run-in labels start a new line: trim the separating spaces off the
      // preceding text and insert a "\n" (rendered by whitespace-pre-line),
      // unless the label already sits at a line start.
      const needsBreak = !isHead && preText !== "" && !/\n\s*$/.test(preText);
      nodes.push(
        <span key={`t${key++}`}>
          {renderBodyText(needsBreak ? preText.replace(/[^\S\n]+$/, "") : preText)}
        </span>,
      );
      if (needsBreak) nodes.push(<span key={`b${key++}`}>{"\n"}</span>);
    }
    // doc 72 §4 — dropped, thin underline (clears descenders), matching
    // generate-report-pdf's styleLeadPhrases treatment.
    nodes.push(
      isHead
        ? (
          <strong key={`l${key++}`} className="underline underline-offset-[2.5px] decoration-[0.5px]">
            {label}
          </strong>
        )
        : (
          <span key={`l${key++}`} className="underline underline-offset-[2.5px] decoration-[0.5px]">
            {label}
          </span>
        ),
    );
    last = labelStart + label.length;
  }
  if (last < text.length) {
    nodes.push(<span key={`t${key++}`}>{renderBodyText(text.slice(last))}</span>);
  }
  return nodes.length ? nodes : [<span key="t0">{renderBodyText(text)}</span>];
}

interface TextSegment {
  kind: "list" | "para";
  parts: string[];
}
function segmentDashText(text: string): TextSegment[] | null {
  const sentences = sentenceSpans(text);
  const segments: TextSegment[] = [];
  let hasRealList = false;
  let runStart = 0;
  let runKind: "list" | "para" | null = null;
  const flush = (endIdx: number) => {
    if (runKind === null || endIdx <= runStart) return;
    if (runKind === "list") {
      // A "(addresses: ...)." sentence is a parenthetical continuation of
      // the item just before it — merge it into the previous item rather
      // than letting it become a stray non-list entry.
      const items: string[] = [];
      for (const s of sentences.slice(runStart, endIdx)) {
        if (/^\(/.test(s.text) && items.length > 0) items[items.length - 1] += ` ${s.text}`;
        else items.push(s.text.replace(/^—\s*/, "").trim());
      }
      segments.push({ kind: "list", parts: items });
      if (items.length >= 2) hasRealList = true;
    } else {
      segments.push({ kind: "para", parts: [text.slice(sentences[runStart].start, sentences[endIdx - 1].end).trim()] });
    }
  };
  sentences.forEach((sentence, i) => {
    const kind: "list" | "para" = /^—\s/.test(sentence.text)
      ? "list"
      : (/^\(/.test(sentence.text) && runKind) ? runKind : "para";
    if (runKind !== null && kind !== runKind) { flush(i); runStart = i; }
    runKind = kind;
  });
  flush(sentences.length);
  return hasRealList ? segments : null;
}

/** ITEM 4 — FIRST ToA FIX: single-column, one-authority-per-row ToA. */
function ToaView({ text }: { text: string }) {
  const lines = toaLines(text);
  if (!lines.length) return null;
  return (
    <ul data-testid="toa-list" className="list-none space-y-1 font-mono text-xs leading-relaxed">
      {lines.map((l, i) => {
        // ITEM SO-12 — anchor a numbered ADMT-v2 entry so body footnote
        // markers can jump to it. Every other product's lines have no
        // leading "N. " and pass through with id=null (no-op).
        const { id, rest } = l.is_heading ? { id: null, rest: l.text } : toaAnchorId(l.text);
        return (
          <li
            key={i}
            id={id ?? undefined}
            data-toa-heading={l.is_heading ? "true" : "false"}
            className={
              l.is_heading
                ? "font-body text-sm font-semibold text-foreground"
                : "pl-6 text-foreground"
            }
          >
            {rest}
          </li>
        );
      })}
    </ul>
  );
}



/** PROMPT 8 — a typed surface rendered as a table (spine `table` blocks). */
export interface SkeletonTable {
  key?: string;
  surface?: string;
  title?: string;
  columns: string[];
  rows: string[][];
  note?: string;
  /** CEO report review 2026-08-24 — see RenderedTable.hideHeader (backend). */
  hideHeader?: boolean;
}

export interface SkeletonParagraph {
  kind: string;
  text: string;
  /** Present only on `kind: "table"` paragraphs. */
  table?: SkeletonTable;
}

export interface SkeletonSection {
  id: string;
  title: string;
  paragraphs: SkeletonParagraph[];
}

export interface SkeletonDocument {
  _typed?: string;
  spine_version?: string;
  title: string;
  subtitle?: string;
  sections: SkeletonSection[];
}

/** Type guard used by the result pages to decide which body to render. */
export function isSkeletonDocument(value: unknown): value is SkeletonDocument {
  const d = value as SkeletonDocument | null;
  return !!d && typeof d === "object" && Array.isArray(d.sections) && d.sections.length > 0
    && typeof d.title === "string";
}

export function SkeletonDocumentView({ doc }: { doc: SkeletonDocument }) {
  // BATCH 16 (R6): one amber Deadline box per document maximum.
  const deadlineUsedRef = { used: false };
  return (
    <article className="font-serif-text space-y-8">
      <header className="space-y-1">
        <h2 className="font-serif text-display-card">{doc.title}</h2>
        {doc.subtitle && <p className="text-sm text-muted-foreground">{doc.subtitle}</p>}
      </header>

      {doc.sections.map((section) => (
        <section key={section.id} className="space-y-3">
          <h3 className="font-body text-display-card font-semibold">{section.title}</h3>
          {section.paragraphs.map((p, i) =>
            p.kind === "table" && p.table ? (
              <SkeletonTableView key={i} table={p.table} />
            ) : section.id === "table_of_authorities" && p.kind !== "skeleton" ? (
              // Every product's ToA content composes as a "rule" block. CPPA
              // Risk v4.5 repurposes this section id for Appendix G and adds
              // a "skeleton" intro paragraph ahead of its table — that intro
              // is ordinary prose, not ToA citation lines, so it must not
              // route through ToaView's citation-line parser.
              <ToaView key={i} text={p.text} />
            ) : (

              p.kind === "quoted_authority" ? (
                // BATCH 16 (R4, kind-driven): composer-typed quoted
                // authority renders as the statute-quote block, verbatim.
                <div key={i} className="my-2 border-l-[3px] border-slate-400 pl-3 pr-2 py-1 text-[13px] leading-relaxed text-foreground whitespace-pre-line">
                  {p.text}
                </div>
              ) : (
              p.text.split(/\n{2,}/).map((chunk, j) => {
                const trimmed = chunk.trim();
                // BATCH 16 (R2): a chunk that IS a structural lead renders
                // as a sub-heading.
                if (trimmed.length <= 96 && H3_CHUNK_RE.test(trimmed)) {
                  return (
                    <h4 key={`${i}-${j}`} className="font-serif text-[15px] font-bold text-foreground mt-4 mb-1">
                      {trimmed}
                    </h4>
                  );
                }
                // BATCH 16 (R4, shape-driven).
                if (QUOTE_CHUNK_RE.test(trimmed) && trimmed.split(/\s+/).length >= 25) {
                  return (
                    <div key={`${i}-${j}`} className="my-2 border-l-[3px] border-slate-400 pl-3 pr-2 py-1 text-[13px] leading-relaxed text-foreground whitespace-pre-line">
                      {trimmed}
                    </div>
                  );
                }
                // BATCH 16 (R5/R6): guidance panel for rulemaking context;
                // muted panel for short not-yet-assessable states; the
                // "Deadline." amber trigger fires once per document.
                const guidancePanel = trimmed.startsWith("Rulemaking context — persuasive only.");
                const mutedPanel = !guidancePanel && trimmed.length <= 600 && /not yet assessable/i.test(trimmed);
                const deadlineCallout = trimmed.startsWith("Deadline.") && !deadlineUsedRef.used;
                if (deadlineCallout) deadlineUsedRef.used = true;
                const conditionCallout = deadlineCallout ||
                  /^(?:[A-Z]\.\s+[^.]+\.\s+)?Conditions? to Proceed\./.test(chunk.trim());
                const calloutClass = conditionCallout
                  ? "rounded-md border-[1.5px] border-amber-600/70 bg-amber-50 px-3 py-2 dark:bg-amber-950/30"
                  : guidancePanel
                  ? "border-l-4 border-slate-400 bg-slate-100 dark:bg-slate-900/40 px-3 py-2 text-[13px]"
                  : mutedPanel
                  ? "border-l-[3px] border-slate-400 bg-muted/40 px-3 py-2 italic text-muted-foreground text-[13px]"
                  : "";
                // CEO report review 2026-08-24 — a chunk containing a
                // "— item" list run (see segmentDashText) renders those
                // runs as real bullet lists and everything else as
                // ordinary paragraphs. Same convention as the PDF renderer.
                // 2026-08-25 batch be0f9e02 — lead styling now runs through
                // renderLeadStyledText (see its definition) on every plain
                // paragraph run in BOTH branches, matching the PDF renderer:
                // list-carrying chunks no longer lose their lettered lead,
                // and run-in analytic labels ("Analysis.", "Conclusion.", …)
                // are styled mid-paragraph too.
                const segments = segmentDashText(chunk);
                if (segments) {
                  return (
                    <div key={`${i}-${j}`} className={calloutClass || undefined}>
                      {segments.map((seg, k) =>
                        seg.kind === "list" && seg.parts.length >= 2 ? (
                          <ul key={k} className="list-disc space-y-1 pl-5 leading-relaxed text-foreground">
                            {seg.parts.map((item, m) => (
                              <li key={m}>{renderBodyText(item)}</li>
                            ))}
                          </ul>
                        ) : (
                          <p key={k} className="leading-relaxed text-foreground whitespace-pre-line">
                            {renderLeadStyledText(seg.parts.join(" "))}
                          </p>
                        )
                      )}
                    </div>
                  );
                }
                return (
                  <p
                    key={`${i}-${j}`}
                    className={`leading-relaxed text-foreground whitespace-pre-line${calloutClass ? ` ${calloutClass}` : ""}`}
                  >
                    {renderLeadStyledText(chunk)}
                  </p>
                );
              })
              )
            ),
          )}
        </section>
      ))}
    </article>
  );
}

// BATCH 16 (R7): signature fill-ins draw a bottom-border rule, never
// literal underscore runs (doc 109 §1.6). Mirrors skeletonTableHtml.
function cellContent(v: string): React.ReactNode {
  return /^_{6,}$/.test(v.trim())
    ? <span className="inline-block min-w-[220px] border-b border-foreground">&nbsp;</span>
    : v;
}

function SkeletonTableView({ table }: { table: SkeletonTable }) {
  if (!table.rows?.length) return null;
  return (
    <figure className="my-4 space-y-2">
      {table.title && (
        <figcaption className="font-body text-sm font-semibold text-foreground">
          {table.title}
        </figcaption>
      )}
      {/* doc 72 (Fleet Report Design System, 2026-08-25) — horizontal-rules-
          only table anatomy, matching generate-report-pdf's skeletonTableHtml
          byte-for-byte in intent: no vertical rules, no header fill, no
          zebra striping. The table itself carries the heavy open/close
          rule; the header its own rule; body rows a light separator. */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-y-2 border-foreground text-xs">
          {!table.hideHeader && (
            <thead>
              <tr>
                {table.columns.map((c, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="border-b-2 border-foreground/70 px-3 py-2 text-left font-sans text-[11px] font-bold uppercase tracking-wide text-foreground"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {table.rows.map((row, r) => (
              <tr key={r} className="align-top">
                {row.map((cell, c) => (
                  <td key={c} className="border-b border-border px-3 py-2 leading-relaxed text-foreground">
                    {/^_{6,}$/.test(String(cell).trim()) ? cellContent(String(cell)) : renderWithFootnotes(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.note && (
        <figcaption className="text-xs text-muted-foreground">{table.note}</figcaption>
      )}
    </figure>
  );
}
