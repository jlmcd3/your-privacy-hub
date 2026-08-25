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

              p.text.split(/\n{2,}/).map((chunk, j) => {
                // 2026-08-25 polish round — mirror of the PDF renderer's
                // .condition-callout: a Condition(s)-to-Proceed chunk wraps
                // in a bordered amber box so it can't be missed against a
                // favorable disposition. Keep the detection regex in sync
                // with generate-report-pdf/index.ts.
                const conditionCallout =
                  /^(?:[A-Z]\.\s+[^.]+\.\s+)?Conditions? to Proceed\./.test(chunk.trim());
                const calloutClass = conditionCallout
                  ? "rounded-md border-[1.5px] border-amber-600/70 bg-amber-50 px-3 py-2 dark:bg-amber-950/30"
                  : "";
                // CEO report review 2026-08-24 — a chunk containing a
                // "— item" list run (see segmentDashText) renders those
                // runs as real bullet lists and everything else as
                // ordinary paragraphs, ahead of the lettered-lead check
                // below. Same convention as the PDF renderer.
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
                            {renderBodyText(seg.parts.join(" "))}
                          </p>
                        )
                      )}
                    </div>
                  );
                }
                // Part B item 1 (2026-08-21, CEO-confirmed) — bold a
                // paragraph's lettered lead ("E. Residual Risk.") when one
                // opens the chunk. Same pattern/regex as the PDF renderer
                // (generate-report-pdf/index.ts's skeletonSectionsHtml).
                //
                // CEO report review 2026-08-23/24 — extended to the named,
                // unlettered CPPA Risk Executive Summary phrase-leads. Same
                // list as the PDF renderer; see its comment for provenance.
                const lead = /^(Activity Assessed\.|Why a Risk Assessment Is Required\.|Key Findings\.|Overall Determination\.|Conditions to Proceed\.|Assessment Follow-Up Required\.|[A-Z]\.\s+[^.]+\.)(\s+)([\s\S]*)$/
                  .exec(chunk);
                return (
                  <p
                    key={`${i}-${j}`}
                    className={`leading-relaxed text-foreground whitespace-pre-line${calloutClass ? ` ${calloutClass}` : ""}`}
                  >
                    {lead
                      ? (
                        <>
                          {/* CEO report review 2026-08-24 — bold alone
                              doesn't read as distinct enough; underlined too. */}
                          <strong className="underline">{renderBodyText(lead[1])}</strong>
                          {lead[2]}
                          {renderBodyText(lead[3])}
                        </>
                      )
                      : renderBodyText(chunk)}
                  </p>
                );
              })
            ),
          )}
        </section>
      ))}
    </article>
  );
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
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-xs">
          {!table.hideHeader && (
            <thead>
              <tr className="bg-muted/60">
                {table.columns.map((c, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="border-b border-border px-3 py-2 text-left font-body font-semibold text-foreground"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {table.rows.map((row, r) => (
              <tr key={r} className="align-top even:bg-muted/20">
                {row.map((cell, c) => (
                  <td key={c} className="border-b border-border px-3 py-2 leading-relaxed text-foreground">
                    {renderWithFootnotes(cell)}
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
