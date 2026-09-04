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
// DOC 170 (2026-09-04) — Syllabus & Record, the fleet presentation system
// (web twin of generate-report-pdf's buildSyllabusRecordHTML; keep in sync).
import {
  isSyllabusRecordProduct,
  readSyllabus,
  SR_TONE_CLASS,
  toneForState,
  type SyllabusProjection,
} from "@/lib/syllabus-record";

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
  // BATCH 18b (doc 113 S2.5) — doubles as the readiness-banner trigger.
  "Readiness\\.",
  // BATCH 19b (doc 113 S4.3) — doubles as the determination-banner trigger.
  "Determination\\.",
  // DOC 144 (2026-09-02) — the CPPA-Risk statutory run-in. In risk mode a
  // chunk OPENING with this label takes the framed law-cite treatment (see
  // the risk-law-cite branch below); a mid-chunk occurrence falls back to
  // this ordinary run-in styling. Keep synced with the PDF renderer.
  "Governing requirement\\.",
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
    // BATCH 18 (Wave C1): the biometric duty walk emits RCW pinpoint
    // headings ("RCW 19.375.020(1) — Enrolment notice"); keep synced.
    `|(?:RCW [\\d.()]{1,24}\\s+—\\s+[A-Z][^.\\n]{0,80}\\.?)` +
    // BATCH 18b (doc 113 S2.15): instrument-anchored per-state/per-instrument
    // heading — "California — Cal. Civ. Code § 1798.99.82", "European Union
    // representative — GDPR Art. 27(1)". Anchored on both sides; keep synced.
    `|(?:[A-Z][A-Za-z .()&'\\-]{1,48} — (?:Cal\\.|ORS |Tex\\.|\\d+ V\\.S\\.A\\.|GDPR |UK GDPR |Regulation \\(EU\\) )[^\\n]{0,60})` +
    `|(?:${HEAD_LEAD_LABELS.join("|")})` +
    // DOC 127 §13 (2026-08-31) — the CPPA Risk adverse-disposition § 4.D
    // head, emitted as its own chunk per RULING 3.1's h3 mechanism
    // (HEAD_LEAD_LABELS itself stays frozen). Keep synced with the PDF
    // renderer (generate-report-pdf/index.ts).
    `|(?:Conditions for Reassessment\\.)` +
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
// DOC 127 §5/§6 (Phase B, 2026-09-01) — CPPA-Risk marker/heading split (web
// twin of the PDF's riskSplitLeadHtml): the section marker ("A.", "(B)",
// "Step N —", "1.") is bold and NEVER underlined; the heading words carry
// the underline (bold at lettered level, regular at numbered level). Risk
// only — every other product keeps the doc 66 Rule 2 whole-label treatment.
const RISK_U = "underline underline-offset-[2.5px] decoration-[0.5px]";
function riskSplitLead(label: string): React.ReactNode {
  const m = /^([A-Z]\.|\([A-H]\)|Step \d+ —|\d{1,2}\.)\s+([\s\S]*)$/.exec(label);
  if (!m) {
    const stop = /\.$/.test(label) ? "." : "";
    const core = stop ? label.slice(0, -1) : label;
    return (
      <strong>
        <span className={RISK_U}>{core}</span>
        {stop}
      </strong>
    );
  }
  const numbered = /^\d/.test(m[1]);
  const stop = /\.$/.test(m[2]) ? "." : "";
  const core = stop ? m[2].slice(0, -1) : m[2];
  const heading = numbered
    ? (
      <>
        <span className={RISK_U}>{core}</span>
        {stop}
      </>
    )
    : (
      <strong>
        <span className={RISK_U}>{core}</span>
        {stop}
      </strong>
    );
  return (
    <>
      <strong className="inline-block min-w-[1.65em]">{m[1]}</strong> {heading}
    </>
  );
}

function renderLeadStyledText(text: string, riskMode = false): React.ReactNode[] {
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
          riskMode
            ? <span key={`l${key++}`}>{riskSplitLead(label)}</span>
            : (
              <strong key={`l${key++}`} className="underline underline-offset-[2.5px] decoration-[0.5px]">
                {label}
              </strong>
            )
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
  /** DOC 170 — the Syllabus & Record page-1 projection (see @/lib/syllabus-record). */
  syllabus?: SyllabusProjection;
}

/** Type guard used by the result pages to decide which body to render. */
export function isSkeletonDocument(value: unknown): value is SkeletonDocument {
  const d = value as SkeletonDocument | null;
  return !!d && typeof d === "object" && Array.isArray(d.sections) && d.sections.length > 0
    && typeof d.title === "string";
}

export function SkeletonDocumentView({ doc, product }: { doc: SkeletonDocument; product?: string }) {
  // DOC 170 (2026-09-04) — Syllabus & Record products render through the
  // fleet presentation system; every other product is unchanged.
  if (isSyllabusRecordProduct(product)) return <SyllabusRecordView doc={doc} product={product} />;
  // BATCH 16 (R6): one amber Deadline box per document maximum.
  const deadlineUsedRef = { used: false };
  // DOC 127 PHASE B (2026-09-01) — the Risk presentation system gate (web
  // twin of generate-report-pdf's riskMode). The disposition shown on the
  // determination card is READ from the cover's exec_status_panel surface —
  // the one normalized state, never re-derived (§30.19).
  const riskMode = product === "cppa-risk";
  const riskDisposition = riskMode
    ? (() => {
      for (const sec of doc.sections) {
        for (const p of sec.paragraphs) {
          if (p.kind === "table" && p.table?.surface === "exec_status_panel") {
            const row = (p.table.rows ?? []).find((r) => String(r?.[0] ?? "") === "Assessment disposition");
            if (row) return String(row[1] ?? "");
          }
        }
      }
      return "";
    })()
    : "";
  return (
    <article className="font-serif-text space-y-8">
      <header className="space-y-1">
        <h2 className="font-serif text-display-card">{doc.title}</h2>
        {doc.subtitle && <p className="text-sm text-muted-foreground">{doc.subtitle}</p>}
      </header>

      {doc.sections.map((section) => {
        // DOC 144 (2026-09-02) — the risk section opener: numbered main
        // sections (1–5 only, never appendices) open with the large quiet
        // serif numeral left of the eyebrow+title stack, under the navy top
        // rule; the numeral marker is never underlined (Rule 1). Keep in
        // sync with the PDF renderer's risk-section-opener.
        const riskOpener = riskMode ? /^([1-5])\.\s+(.+)$/.exec(section.title) : null;
        return (
        <section key={section.id} className="space-y-3">
          {riskOpener ? (
            <div className="border-t-[2.5px] border-slate-800 pt-2 dark:border-slate-300">
              <div className="flex items-start gap-3">
                <span className="font-serif text-[40px] leading-none text-slate-300 dark:text-slate-600">{riskOpener[1]}</span>
                <span className="self-end pb-0.5">
                  <span className="block font-sans text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Section {riskOpener[1]}
                  </span>
                  <h3 className="font-body text-display-card font-semibold">{riskOpener[2]}</h3>
                </span>
              </div>
            </div>
          ) : (
            <h3 className="font-body text-display-card font-semibold">{section.title}</h3>
          )}
          {/* DOC 144 — the Assessment-at-a-Glance panel opens the executive
              summary (built from the persisted exec_status_panel/key_dates
              surfaces — the SAME data the cover card projects). */}
          {riskMode && section.id === "executive_summary" && <RiskGlancePanel doc={doc} />}
          {section.paragraphs.map((p, i) =>
            p.kind === "table" && p.table ? (
              <SkeletonTableView key={i} table={p.table} product={product} />
            ) : riskMode && p.kind === "customer_voice" ? (
              // DOC 144 — the § 2.A customer-voice block (kind-driven).
              <RiskCustomerVoice key={i} text={p.text} />
            ) : riskMode && section.id === "i_method" && /^Step \d+ — [^.]+\./.test(p.text.trim()) ? (
              // DOC 127 §9 (Phase B) — the Section-1 methodology strip row.
              (() => {
                const m = /^Step (\d+) — ([^.]+)\.\s*([\s\S]*)$/.exec(p.text.trim())!;
                return (
                  <div key={i} className="flex items-start gap-2 border-b border-border/60 py-1.5 text-[13px] leading-relaxed">
                    <span className="mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-slate-100 font-sans text-[10px] font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                      {m[1]}
                    </span>
                    <span>
                      <strong>{m[2]}</strong> — {m[3]}
                    </span>
                  </div>
                );
              })()
            ) : riskMode && section.id === "executive_summary" && p.kind === "lead" ? (
              // DOC 127 §12 (Phase B) — the executive DETERMINATION card.
              <div key={i} className="border-t-2 border-slate-800 bg-slate-50 px-4 py-3 dark:border-slate-300 dark:bg-slate-900/40">
                <div className="font-sans text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">
                  Determination
                </div>
                {riskDisposition && (
                  <div className="my-1.5">
                    <RiskBadge value={riskDisposition} large />
                  </div>
                )}
                <p className="leading-relaxed text-foreground whitespace-pre-line">
                  {renderLeadStyledText(p.text, true)}
                </p>
              </div>
            ) : section.id === "table_of_authorities" && p.kind !== "skeleton" ? (
              // Every product's ToA content composes as a "rule" block. CPPA
              // Risk v4.5 repurposes this section id for Appendix G and adds
              // a "skeleton" intro paragraph ahead of its table — that intro
              // is ordinary prose, not ToA citation lines, so it must not
              // route through ToaView's citation-line parser.
              <ToaView key={i} text={p.text} />
            ) : (

              p.kind === "legal_requirement" ? (
                <div key={i}>
                  <div className="inline-block rounded-sm border border-slate-400 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-2 mb-1">
                    Legal standard
                  </div>
                  <p className="text-[13.5px] leading-relaxed text-foreground whitespace-pre-line">{p.text}</p>
                </div>
              ) : p.kind === "quoted_authority" ? (
                // BATCH 16 (R4, kind-driven): composer-typed quoted
                // authority renders as the statute-quote block, verbatim.
                <div key={i} className="my-2 border-l-[3px] border-slate-400 pl-3 pr-2 py-1 text-[13px] leading-relaxed text-foreground whitespace-pre-line">
                  {p.text}
                </div>
              ) : (
              p.text.split(/\n{2,}/).map((chunk, j) => {
                const trimmed = chunk.trim();
                // DOC 144 (2026-09-02) — the plain-question landing line:
                // a chunk opening with the literal "[Q] " token (risk only)
                // drops the token and renders as the italic slate subline.
                // Keep in sync with the PDF renderer.
                if (riskMode && trimmed.startsWith("[Q] ")) {
                  return (
                    <p key={`${i}-${j}`} className="-mt-1 text-[13.5px] italic leading-snug text-slate-600 dark:text-slate-400">
                      {renderBodyText(trimmed.slice(4))}
                    </p>
                  );
                }
                // DOC 144 (2026-09-02) — the framed law-cite treatment: a
                // chunk opening with the "Governing requirement." run-in
                // (risk only) takes the slate-tinted hairline frame, the
                // label as the caps eyebrow, the statutory text as body.
                // Keep in sync with the PDF renderer's risk-law-cite.
                if (riskMode && trimmed.startsWith("Governing requirement.")) {
                  const rest = trimmed.slice("Governing requirement.".length).trim();
                  return (
                    <div key={`${i}-${j}`} className="rounded-sm border border-slate-300 bg-slate-100/70 px-3 py-2 dark:border-slate-600 dark:bg-slate-900/40">
                      <div className="mb-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Governing requirement
                      </div>
                      <p className="leading-relaxed text-foreground whitespace-pre-line">
                        {renderLeadStyledText(rest, true)}
                      </p>
                    </div>
                  );
                }
                // BATCH 16 (R2): a chunk that IS a structural lead renders
                // as a sub-heading.
                if (trimmed.length <= 96 && H3_CHUNK_RE.test(trimmed)) {
                  // DOC 127 §5/§6/§8 (Phase B) — Risk sub-heads carry the
                  // marker/heading split; numbered heads are regular-weight
                  // with only the heading words underlined.
                  if (riskMode) {
                    const numbered = /^\d{1,2}\./.test(trimmed);
                    return (
                      <h4 key={`${i}-${j}`} className={`font-serif text-[15px] ${numbered ? "font-normal" : "font-bold"} text-foreground mt-4 mb-1`}>
                        {riskSplitLead(trimmed)}
                      </h4>
                    );
                  }
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
                // BATCH 18b (doc 113 S2.5) — the IR readiness banner: a
                // "Readiness." chunk takes the condition-callout box; amber
                // when it carries the negative-state determination, the
                // same geometry with the calm slate border otherwise. Keep
                // in sync with generate-report-pdf/index.ts.
                const readinessCallout = trimmed.startsWith("Readiness.");
                const readinessNegative = readinessCallout && trimmed.includes("would not carry");
                // BATCH 19b (doc 113 S4.3) — the DPIA determination banner:
                // a "Determination." chunk takes the callout box; amber when
                // it records a blocking outcome, the calm slate box
                // otherwise. Keep in sync with generate-report-pdf/index.ts.
                const determinationCallout = trimmed.startsWith("Determination.");
                const determinationBlocking = determinationCallout &&
                  /may not begin|should not begin|cannot yet determine/.test(trimmed);
                // DOC 127 §13 (Phase B) — the adverse § 4.D items chunk opens
                // with the ratified reassessment intro; it joins the amber-
                // callout trigger. Keep in sync with the PDF renderer.
                const conditionCallout = deadlineCallout || readinessNegative || determinationBlocking ||
                  /^(?:[A-Z]\.\s+[^.]+\.\s+)?Conditions? to Proceed\./.test(chunk.trim()) ||
                  /^The Activity should not proceed in its present form\./.test(chunk.trim());
                // CEO report review 2026-09-04 (§ 4.D palette) — same lead-
                // string family the PDF renderer recognizes. Keep in sync
                // with generate-report-pdf/index.ts.
                const followupCallout =
                  /^(?:[A-Z]\.\s+[^.]+\.\s+)?(?:Follow-Ups?\.|Required Follow-Up\.|Assessment Follow-Up Required\.)/.test(chunk.trim());
                const recommendationCallout =
                  /^(?:[A-Z]\.\s+[^.]+\.\s+)?Recommendations?\./.test(chunk.trim());
                const calloutClass = conditionCallout
                  ? "rounded-md border-[1.5px] border-amber-600/70 bg-amber-50 px-3 py-2 dark:bg-amber-950/30"
                  : followupCallout
                  ? "rounded-md border-[1.5px] border-sky-600/70 bg-sky-50 px-3 py-2 dark:bg-sky-950/30"
                  : recommendationCallout
                  ? "rounded-md border-[1.5px] border-emerald-600/70 bg-emerald-50 px-3 py-2 dark:bg-emerald-950/30"
                  : readinessCallout || determinationCallout
                  ? "rounded-md border-[1.5px] border-slate-400/70 bg-slate-50 px-3 py-2 dark:bg-slate-900/30"
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
                          <p
                            key={k}
                            className="leading-relaxed text-foreground whitespace-pre-line"
                            style={riskMode ? { textIndent: "0.22in" } : undefined}
                          >
                            {renderLeadStyledText(seg.parts.join(" "), riskMode)}
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
                    // DOC 127 §7 (Phase B) — Risk first-line indent via CSS
                    // (pre-line means only the block's first line indents).
                    style={riskMode ? { textIndent: "0.22in" } : undefined}
                  >
                    {renderLeadStyledText(chunk, riskMode)}
                  </p>
                );
              })
              )
            ),
          )}
        </section>
        );
      })}
    </article>
  );
}

// ─── DOC 170 (2026-09-04) — SYLLABUS & RECORD (web twin of the PDF's
// buildSyllabusRecordHTML; docs 143/144 → 151, canonical record
// docs/design/SYLLABUS-RECORD-DESIGN-SYSTEM.md). The holding on page one
// (the Determination Syllabus, read from the persisted projection), the
// reasoning in the body, the record behind a divider. States are tinted
// TEXT, never filled chips; one rail geometry for every framed element;
// markers never underlined. Keep every rule in sync with the PDF twin. ───

const SR_LABEL = "font-sans text-[10px] font-bold uppercase tracking-[0.1em]";
const SR_STATE = "font-sans text-[10px] font-bold uppercase tracking-[0.08em] whitespace-nowrap";
const SR_U = "underline underline-offset-[2.5px] decoration-[0.5px]";

/** A state word tinted as text; "State — rest" tints the word and sets the
 *  rest small and slate; anything else renders verbatim. */
function SrState({ value }: { value: string }) {
  const v = value.trim();
  const whole = toneForState(v);
  if (whole) return <span className={`${SR_STATE} ${SR_TONE_CLASS[whole]}`}>{v}</span>;
  const m = /^([^—\n]{2,60}?)\s+—\s+([\s\S]+)$/.exec(v);
  if (m) {
    const tone = toneForState(m[1]);
    if (tone) {
      return (
        <>
          <span className={`${SR_STATE} ${SR_TONE_CLASS[tone]}`}>{m[1]}</span>
          {"  "}
          <span className="text-[12px] text-slate-600 dark:text-slate-400">{m[2]}</span>
        </>
      );
    }
  }
  return <>{renderWithFootnotes(value)}</>;
}

function SrRail({ label, tone, children }: { label: string; tone?: "teal" | "hair" | "hold"; children: React.ReactNode }) {
  const border = tone === "teal"
    ? "border-l-[#2d9b90]"
    : tone === "hair"
    ? "border-l-[#c9d2d9]"
    : tone === "hold"
    ? "border-l-[#6e5518]"
    : "border-l-[#0c2a44] dark:border-l-slate-300";
  const labelColor = tone === "teal"
    ? "text-[#2d9b90]"
    : tone === "hair"
    ? "text-slate-500"
    : tone === "hold"
    ? "text-[#6e5518] dark:text-amber-300"
    : "text-[#0c2a44] dark:text-slate-200";
  return (
    <div className={`my-3 border-l-2 pl-3 py-0.5 ${border}`}>
      <span className={`block ${SR_LABEL} ${labelColor}`}>{label}</span>
      <div className="text-[13px] leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

/** The Governing-Requirement rail label with the cite the sentence names. */
function srGoverningLabel(rest: string): string {
  const m = /^Sections?\s+(\d{4}[()\w.–-]*(?:(?:,\s*|\s+and\s+|–)\d{4}[()\w.–-]*)*)/.exec(rest.trim());
  if (!m) return "Governing requirement";
  const cites = m[1].split(/,\s*|\s+and\s+/).map((c) => c.trim()).filter(Boolean);
  const sym = cites.length > 1 || /–/.test(m[1]) ? "§§" : "§";
  return `Governing requirement · 11 CCR ${sym} ${cites.join(", ")}`;
}

/** Marker split for sub-heads (Rule 1): marker never underlined, title underline-only. */
function SrHead({ label }: { label: string }) {
  const m = /^([A-Z]\.|\([A-H]\)|Step \d+ —|\d{1,2}\.)\s+([\s\S]*)$/.exec(label);
  const body = m ? m[2] : label;
  const stop = /\.$/.test(body) ? "." : "";
  const core = stop ? body.slice(0, -1) : body;
  return (
    <h4 className="mt-3 mb-1 font-serif text-[15px] font-bold text-foreground">
      {m && <span className="font-normal text-slate-500">{m[1]} </span>}
      <u className={SR_U}>{core}</u>{stop}
    </h4>
  );
}

function SrTable({ table }: { table: SkeletonTable }) {
  if (!table.rows?.length) return null;
  const kv = table.hideHeader === true && table.columns.length === 2;
  return (
    <figure className="my-3 space-y-1">
      {table.title && <figcaption className={`${SR_LABEL} text-slate-500`}>{table.title}</figcaption>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12px]">
          {!kv && !table.hideHeader && (
            <thead>
              <tr>
                {table.columns.map((c, i) => (
                  <th key={i} scope="col" className="border-b-2 border-slate-500 bg-[#f3f6f8] px-2 py-1 text-left font-sans text-[10px] font-bold uppercase tracking-wide text-foreground dark:bg-slate-900/40">
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
                  <td key={c} className={`border-b border-border px-2 py-1.5 leading-relaxed text-foreground${kv && c === 0 ? ` w-[30%] ${SR_LABEL} text-slate-500` : ""}`}>
                    {/^_{6,}$/.test(String(cell).trim()) ? cellContent(String(cell)) : <SrState value={String(cell ?? "")} />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.note && <figcaption className="text-xs text-muted-foreground">{table.note}</figcaption>}
    </figure>
  );
}

/** Page one — the Determination Syllabus. */
function SrSyllabus({ s }: { s: SyllabusProjection }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between border-b-2 border-[#0c2a44] pb-2 dark:border-slate-300">
        <span className="font-sans text-[11px] font-bold tracking-[0.2em] text-[#0c2a44] dark:text-slate-200">END USER PRIVACY</span>
        <span className="text-right font-sans text-[10px] tracking-[0.08em] text-slate-500">{s.instrument_line}</span>
      </div>
      <div className="pt-2">
        <div className={`${SR_LABEL} text-slate-500`}>Prepared for {s.prepared_for}</div>
        <h2 className="font-serif text-[26px] font-normal leading-tight text-[#0c2a44] dark:text-slate-100">{s.activity}</h2>
        {s.subtitle && <div className="text-[13px] text-slate-500">{s.subtitle}</div>}
      </div>
      <div className="border border-[#c9d2d9] border-l-2 border-l-[#0c2a44] bg-[#f3f6f8] px-4 py-3 dark:border-slate-600 dark:bg-slate-900/40">
        <div className={`${SR_LABEL} text-slate-500`}>{s.disposition_label}</div>
        <div className="my-1 font-serif text-[22px] text-[#0c2a44] dark:text-slate-100">{s.disposition}</div>
        {s.paragraph && <p className="text-[13px] leading-relaxed text-foreground">{s.paragraph}</p>}
      </div>
      {s.rows.length > 0 && (
        <table className="w-full border-collapse text-[12.5px]">
          <tbody>
            {s.rows.map(([k, v]) => (
              <tr key={k} className="align-top">
                <td className={`w-[34%] border-b border-border py-1.5 pr-3 ${SR_LABEL} text-slate-500`}>{k}</td>
                <td className="border-b border-border py-1.5"><SrState value={v} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {s.conditions.length > 0 && (
        <div>
          <div className={`${SR_LABEL} mt-2 text-slate-500`}>{s.conditions_heading}</div>
          {s.conditions.map((c, i) => (
            <div key={i} className="my-2 border-l-2 border-[#c9d2d9] pl-3">
              <div className="text-[13.5px]">{i + 1}.&nbsp;&nbsp;<u className={SR_U}>{c.name}</u></div>
              <p className="text-[12.5px] leading-relaxed text-foreground">{c.text}</p>
            </div>
          ))}
        </div>
      )}
      {s.key_dates.length > 0 && (
        <div className="mt-2 border-y border-[#c9d2d9] py-1.5 font-sans text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
          <b className="tracking-[0.05em]">KEY DATES</b>
          {s.key_dates.map(([k, v]) => (
            <span key={k}> &nbsp;·&nbsp; {k}: <SrState value={v} /></span>
          ))}
        </div>
      )}
    </section>
  );
}

function SrDivider({ s, appendices }: { s: SyllabusProjection | null; appendices: Array<{ letter: string; title: string }> }) {
  return (
    <section className="mt-8 border-t-[3px] border-[#0c2a44] pt-5 dark:border-slate-300">
      <div className={`${SR_LABEL} text-slate-500`}>End of the decision report</div>
      <h3 className="font-serif text-[22px] font-normal text-[#0c2a44] dark:text-slate-100">Supporting Assessment Record</h3>
      <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-foreground">
        The record that stands behind every conclusion above: authority traceability, the complete factual inventories, the full risk and safeguard register, the technical record, and the materials considered. A decision-maker may stop at the last numbered section. Counsel, auditors, and regulators continue here — and every entry cites the body section it supports.
      </p>
      {appendices.length > 0 && (
        <table className="mt-3 w-full border-collapse text-[12.5px]">
          <tbody>
            {appendices.map((a) => (
              <tr key={a.letter} className="align-top">
                <td className="w-[8%] border-b border-border py-1.5 font-serif text-[17px] text-slate-400">{a.letter}</td>
                <td className="w-[34%] border-b border-border py-1.5 font-semibold">{a.title}</td>
                <td className="border-b border-border py-1.5 text-foreground">{s?.record_map.find((r) => r[0] === a.letter)?.[2] ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

const SR_ACTION_LEADS: ReadonlyArray<[RegExp, string, "hair" | "hold"]> = [
  [/^(?:Conditions? to Proceed\.)/, "Conditions to proceed — these condition the determination", "hold"],
  [/^(?:Conditions for Reassessment\.)/, "Conditions for reassessment — a different disposition depends on these", "hold"],
  [/^(?:Follow-Ups?\.|Required Follow-Up\.|Assessment Follow-Up Required\.)/, "Follow-ups — these complete the record", "hair"],
  [/^(?:Recommendations?\.)/, "Recommendations — non-blocking", "hair"],
];

function SrChunk({ chunk }: { chunk: string }) {
  const trimmed = chunk.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("[Q] ")) {
    return <p className="text-[13.5px] italic leading-snug text-slate-600 dark:text-slate-400">{renderBodyText(trimmed.slice(4))}</p>;
  }
  if (trimmed.startsWith("Governing requirement.")) {
    const rest = trimmed.slice("Governing requirement.".length).trim();
    return <SrRail label={srGoverningLabel(rest)}><p className="whitespace-pre-line">{renderLeadStyledText(rest, true)}</p></SrRail>;
  }
  if (trimmed.length <= 96 && H3_CHUNK_RE.test(trimmed)) return <SrHead label={trimmed} />;
  if (QUOTE_CHUNK_RE.test(trimmed) && trimmed.split(/\s+/).length >= 25) {
    return <SrRail label="Statutory text"><p className="whitespace-pre-line">{trimmed}</p></SrRail>;
  }
  for (const [re, label, tone] of SR_ACTION_LEADS) {
    const m = re.exec(trimmed);
    if (m) {
      const body = trimmed.slice(m[0].length).trim();
      return <SrRail label={label} tone={tone}>{body && <p className="whitespace-pre-line">{renderBodyText(body)}</p>}</SrRail>;
    }
  }
  if (/^The Activity should not proceed in its present form\./.test(trimmed)) {
    return <SrRail label="Conditions for reassessment — a different disposition depends on these" tone="hold"><p className="whitespace-pre-line">{renderBodyText(trimmed)}</p></SrRail>;
  }
  if (trimmed.startsWith("Rulemaking context — persuasive only.")) {
    return <SrRail label="Rulemaking context · persuasive only" tone="hair"><p className="whitespace-pre-line">{renderBodyText(trimmed.slice("Rulemaking context — persuasive only.".length).trim())}</p></SrRail>;
  }
  const lead = /^(Deadline|Readiness|Determination)\.\s*/.exec(trimmed);
  if (lead) {
    const body = trimmed.slice(lead[0].length);
    const hold = lead[1] === "Deadline" || /would not carry|may not begin|should not begin|cannot yet determine/.test(body);
    return <SrRail label={lead[1]} tone={hold ? "hold" : undefined}><p className="whitespace-pre-line">{renderLeadStyledText(body, true)}</p></SrRail>;
  }
  if (trimmed.length <= 600 && /not yet assessable/i.test(trimmed)) {
    return <SrRail label="Not yet assessable" tone="hair"><p className="whitespace-pre-line">{renderBodyText(trimmed)}</p></SrRail>;
  }
  const segments = segmentDashText(chunk);
  if (segments) {
    return (
      <div>
        {segments.map((seg, k) =>
          seg.kind === "list" && seg.parts.length >= 2 ? (
            <ul key={k} className="list-disc space-y-1 pl-5 text-justify leading-relaxed text-foreground">
              {seg.parts.map((item, m) => <li key={m}>{renderBodyText(item)}</li>)}
            </ul>
          ) : (
            <p key={k} className="text-justify leading-relaxed text-foreground whitespace-pre-line">{renderLeadStyledText(seg.parts.join(" "), true)}</p>
          )
        )}
      </div>
    );
  }
  return <p className="text-justify leading-relaxed text-foreground whitespace-pre-line">{renderLeadStyledText(chunk, true)}</p>;
}

export function SyllabusRecordView({ doc, product }: { doc: SkeletonDocument; product?: string }) {
  const syllabus = readSyllabus(doc);
  const appendices = doc.sections
    .map((sec) => /^Appendix ([A-Z])\s*[—–-]\s*(.+)$/.exec(sec.title))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ letter: m[1], title: m[2] }));
  let dividerDone = false;
  void product;
  return (
    <article className="font-serif-text space-y-8" data-sr="1">
      {syllabus ? (
        <SrSyllabus s={syllabus} />
      ) : (
        <header className="space-y-1">
          <h2 className="font-serif text-display-card">{doc.title}</h2>
          {doc.subtitle && <p className="text-sm text-muted-foreground">{doc.subtitle}</p>}
        </header>
      )}
      {doc.sections.map((section) => {
        const title = section.title.trim();
        const appendixM = /^Appendix ([A-Z])\s*[—–-]\s*(.+)$/.exec(title);
        const numM = /^(\d{1,2})\.\s+(.+)$/.exec(title) ?? /^Section (\d{1,2})\s*[—–-]\s*(.+)$/.exec(title);
        const divider = appendixM && !dividerDone ? (dividerDone = true, <SrDivider s={syllabus} appendices={appendices} />) : null;
        // The section question-line rides in the head when the first prose
        // chunk is a "[Q] " landing line (token stripped).
        let headQ = "";
        const paragraphs = section.paragraphs.map((p) => ({ ...p }));
        const firstText = paragraphs.find((p) => p.kind !== "table" && typeof p.text === "string" && p.text.trim());
        if (firstText && firstText.text.trim().startsWith("[Q] ")) {
          const chunks = firstText.text.split(/\n{2,}/);
          headQ = chunks[0].trim().slice(4);
          firstText.text = chunks.slice(1).join("\n\n");
        }
        const numeral = numM ? numM[1] : appendixM ? appendixM[1] : "";
        const heading = numM ? numM[2] : appendixM ? appendixM[2] : title;
        return (
          <div key={section.id}>
            {divider}
            <section className="space-y-3">
              <div className="border-b-[1.5px] border-[#0c2a44] pb-1.5 dark:border-slate-300">
                <div className="flex items-baseline gap-3">
                  {numeral && <span className={`font-serif ${appendixM ? "text-[28px]" : "text-[36px]"} leading-none text-slate-300 dark:text-slate-600`}>{numeral}</span>}
                  <span>
                    <h3 className="font-serif text-[19px] font-normal text-[#0c2a44] dark:text-slate-100">{heading}</h3>
                    {headQ && <span className="block text-[13px] italic text-slate-500">{renderBodyText(headQ)}</span>}
                    {appendixM && <span className={`block ${SR_LABEL} text-slate-400`}>Supporting Assessment Record · Appendix {appendixM[1]}</span>}
                  </span>
                </div>
              </div>
              {paragraphs.map((p, i) => {
                if (p.kind === "table" && p.table) {
                  // DOC 173 (2026-09-04) — Governance's programme scoreboard
                  // is read straight into the syllabus's determination table
                  // (buildGovernanceSyllabus); the mirror of the PDF
                  // renderer's identical suppression.
                  if (
                    syllabus &&
                    (p.table.surface === "cover_summary" || p.table.surface === "exec_status_panel" ||
                      p.table.surface === "art30_element_findings+demonstrability_findings+domain_element_findings+remediation_plan")
                  ) return null;
                  return <SrTable key={i} table={p.table} />;
                }
                if (!p.text.trim()) return null;
                if (syllabus && section.id === "executive_summary" && p.kind === "lead") return null;
                if (p.kind === "customer_voice") {
                  const lines = p.text.split("\n").map((l) => l.trim()).filter(Boolean);
                  const [attribution, ...rest] = lines;
                  return (
                    <SrRail key={i} label={attribution ?? ""} tone="teal">
                      {rest.map((line, j) => {
                        const m = /^(Processing|Purpose)\.\s*([\s\S]*)$/.exec(line);
                        return m
                          ? <p key={j}><span className={`${SR_LABEL} mr-1 text-slate-500`}>{m[1]}</span> {m[2]}</p>
                          : <p key={j}>{line}</p>;
                      })}
                    </SrRail>
                  );
                }
                if (p.kind === "legal_requirement") {
                  return <SrRail key={i} label={srGoverningLabel(p.text.trim())}><p className="whitespace-pre-line">{renderLeadStyledText(p.text.trim(), true)}</p></SrRail>;
                }
                if (p.kind === "quoted_authority") {
                  return <SrRail key={i} label="Statutory text"><p className="whitespace-pre-line">{p.text.trim()}</p></SrRail>;
                }
                if (section.id === "table_of_authorities" && p.kind !== "skeleton") return <ToaView key={i} text={p.text} />;
                return <div key={i}>{p.text.split(/\n{2,}/).map((chunk, j) => <SrChunk key={j} chunk={chunk} />)}</div>;
              })}
            </section>
          </div>
        );
      })}
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

// ─── DOC 127 PHASE B (2026-09-01) — CPPA-Risk table surfaces (web twin of
// the PDF's riskTableHtml family). Risk-gated; surface-keyed, never matched
// on visible cell text (§28). Doc 128 is the fleet-portability ledger. ───

/** Restrained status badge — §4.2/§21: light tint, dark text, 1px border.
 * DOC 144 (2026-09-02): the `tone` override maps determination words the
 * value-regexes don't know (necessity words, likelihood/severity scale
 * words) onto the SAME tint families — synced with the PDF renderer.
 * DOC 147 (2026-09-02) — CEO T8 ruling: "Additional Information Required"
 * reads slate GLOBALLY (removed from the warn regex; falls to neutral),
 * closing doc 144 §D.1. */
type RiskBadgeTone = "ok" | "warn" | "hi" | "neutral";
const RISK_BADGE_TONE_CLASS: Record<RiskBadgeTone, string> = {
  hi: "border-red-300 bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200",
  warn: "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
  ok: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200",
  neutral: "border-border bg-muted text-foreground",
};
function RiskBadge({ value, large, tone }: { value: string; large?: boolean; tone?: RiskBadgeTone }) {
  const v = value.trim();
  const resolved: RiskBadgeTone = tone ?? (
    /^(Critical|High|Do Not Proceed)$/i.test(v)
      ? "hi"
      : /^(Moderate|Unresolved)$/i.test(v)
      ? "warn"
      : /^(Low|Yes|Proceed|Proceed with Conditions|Engaged|No Processing Decision Required)$/i.test(v)
      ? "ok"
      : "neutral"
  );
  return (
    <span className={`inline-block rounded-sm border font-sans font-bold tracking-wide ${large ? "px-2.5 py-0.5 text-[12px]" : "px-1.5 py-px text-[10px]"} ${RISK_BADGE_TONE_CLASS[resolved]}`}>
      {v}
    </span>
  );
}

function riskLevelCell(value: string): React.ReactNode {
  const m = /^(Low|Moderate|High|Critical|Not assessed)\s*(\(reduced\)|\(unchanged\))?$/.exec(value.trim());
  if (!m) return renderWithFootnotes(value);
  return (
    <>
      <RiskBadge value={m[1]} />
      {m[2] && <span className="ml-1 text-[10px] text-muted-foreground">{m[2]}</span>}
    </>
  );
}
function riskHarmCell(value: string): React.ReactNode {
  const m = /^(\([A-H]\))\s+([\s\S]*)$/.exec(value.trim());
  return m ? <><strong>{m[1]}</strong> {m[2]}</> : renderWithFootnotes(value);
}
function riskStatusLeadCell(value: string): React.ReactNode {
  const m = /^(Engaged|Unresolved)( — )([\s\S]*)$/.exec(value.trim());
  return m ? <><strong>{m[1]}</strong>{m[2]}{m[3]}</> : renderWithFootnotes(value);
}
/** DOC 144 — the § 4.A ledger's Likelihood/Severity cells: the Company's
 * enum scale words badge onto the existing tint families; anything else
 * ("Not recorded", free text) passes through. Synced with the PDF twin. */
function riskScaleCell(value: string): React.ReactNode {
  const v = value.trim();
  const tone: RiskBadgeTone | null = /^(Unlikely|Minimal)$/.test(v)
    ? "ok"
    : /^(Possible|Likely|Moderate)$/.test(v)
    ? "warn"
    : /^(Highly likely|Significant|Severe)$/.test(v)
    ? "hi"
    : null;
  return tone ? <RiskBadge value={v} tone={tone} /> : renderWithFootnotes(value);
}
/** DOC 144 — the § 3.B necessity Determination cell: the three exact words
 * the engine emits, mapped onto the tint families. Synced with the PDF twin. */
function riskNecessityCell(value: string): React.ReactNode {
  const v = value.trim();
  if (v === "Necessary to the stated purpose") return <RiskBadge value={v} tone="ok" />;
  if (v === "Collected but not necessary to the stated purpose") return <RiskBadge value={v} tone="hi" />;
  if (v === "Unsure") return <RiskBadge value={v} tone="warn" />;
  return renderWithFootnotes(value);
}
const RISK_CELL_RENDERERS: Record<string, (value: string, col: number) => React.ReactNode> = {
  exec_triggers: (v, c) => (c === 1 ? riskStatusLeadCell(v) : renderWithFootnotes(v)),
  exec_ledger: (v, c) => (c === 2 ? riskLevelCell(v) : c === 0 ? riskHarmCell(v) : renderWithFootnotes(v)),
  // DOC 144 — the six-column § 4.A ledger: harm | likelihood | severity |
  // before | safeguard credited (status) | remaining. Badge columns 1/2/3/5.
  risk_ledger: (v, c) =>
    c === 0
      ? riskHarmCell(v)
      : c === 1 || c === 2
      ? riskScaleCell(v)
      : c === 3 || c === 5
      ? riskLevelCell(v)
      : renderWithFootnotes(v),
  // DOC 144 — the § 3.B in-body necessity matrix (Element | Determination |
  // Basis); Determination badges (surface + column keyed).
  necessity_matrix: (v, c) => (c === 1 ? riskNecessityCell(v) : renderWithFootnotes(v)),
};

/** §4.1 — the Assessment Profile executive fact panel. */
function RiskProfilePanel({ table }: { table: SkeletonTable }) {
  return (
    <div className="rounded-sm border-l-[3px] border-slate-800 bg-slate-50 px-4 py-2 dark:border-slate-300 dark:bg-slate-900/40">
      <table className="w-full border-collapse">
        <tbody>
          {table.rows.map((r, i) => (
            <tr key={i} className={i < table.rows.length - 1 ? "border-b border-border/50" : ""}>
              <td className="w-[30%] py-1.5 pr-4 align-top font-sans text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {String(r[0] ?? "")}
              </td>
              <td className="py-1.5 align-top text-[13.5px] font-semibold text-foreground">
                {String(r[1] ?? "")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** §4.2 — the Assessment Result executive card; falls back to the generic
 * table when the expected rows are absent (legacy payloads). */
function RiskResultCard({ table }: { table: SkeletonTable }) {
  const get = (label: string): string => {
    const row = table.rows.find((r) => String(r?.[0] ?? "") === label);
    return row ? String(row[1] ?? "") : "";
  };
  const disp = get("Assessment disposition");
  if (!disp) return null;
  const path = get("Path forward");
  // DOC 144 (2026-09-02) — Wave-1 dashboard rows (tallies, "What this
  // means") projected onto this surface render too: rows the card does not
  // consume by name render as compact label/value lines. Synced with the
  // PDF renderer.
  const CONSUMED = new Set([
    "Assessment required",
    "Inherent privacy risk",
    "Residual privacy risk",
    "Assessment disposition",
    "Path forward",
    "What this means",
  ]);
  const whatThisMeans = get("What this means");
  const extraRows = table.rows.filter((r) => Array.isArray(r) && !CONSUMED.has(String(r[0] ?? "")));
  const tierRow = (label: string) => {
    const v = get(label);
    if (!v) return null;
    const badge = /^(Low|Moderate|High|Critical|Yes|No)$/.test(v.trim());
    return (
      <div key={label} className="flex items-center justify-between py-1">
        <span className="text-[12.5px] text-slate-600 dark:text-slate-300">{label}</span>
        {badge ? <RiskBadge value={v.trim()} /> : <span className="text-[12.5px] text-foreground">{v}</span>}
      </div>
    );
  };
  return (
    <div className="rounded border border-border px-4 py-3">
      <div className="mb-1 font-sans text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">
        Assessment Result
      </div>
      {tierRow("Assessment required")}
      {tierRow("Inherent privacy risk")}
      {tierRow("Residual privacy risk")}
      <div className="mt-1.5 border-t border-border pt-2">
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] text-slate-600 dark:text-slate-300">Assessment disposition</span>
          <RiskBadge value={disp} large />
        </div>
        {path && <div className="mt-1.5 text-[12.5px] leading-relaxed text-foreground">{path}</div>}
        {extraRows.map((r, i) => (
          <div key={i} className="flex items-center justify-between py-0.5">
            <span className="text-[12px] text-slate-600 dark:text-slate-300">{String(r[0] ?? "")}</span>
            <span className="text-[12px] text-foreground">{String(r[1] ?? "")}</span>
          </div>
        ))}
        {whatThisMeans && (
          <div className="mt-1.5 text-[12.5px] leading-relaxed text-foreground">
            <strong>What this means:</strong> {whatThisMeans}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DOC 144 (2026-09-02) — the page-2 "Assessment at a Glance" panel and
// § 2.A customer-voice block (web twins of the PDF renderer's
// riskGlancePanelHtml / riskCustomerVoiceHtml — keep in sync). ───

/** The disposition-family accent for the glance panel's left rule:
 * proceed=green, conditions=amber, AIR/NPDR=slate/neutral,
 * do-not-proceed=red — the badges' own grayscale-safe families. */
function riskDispositionAccentClass(label: string): string {
  const v = label.trim();
  if (/^Do Not Proceed$/i.test(v)) return "border-l-red-900/70 dark:border-l-red-300/70";
  if (/^Proceed with Conditions$/i.test(v)) return "border-l-amber-700/80 dark:border-l-amber-300/70";
  if (/^Proceed$/i.test(v)) return "border-l-emerald-900/70 dark:border-l-emerald-300/70";
  return "border-l-slate-500/70 dark:border-l-slate-300/70";
}

/** The panel-scoped disposition badge tone for the SAME family mapping.
 * DOC 147 (2026-09-02): since the CEO's T8 ruling the generic badge
 * machinery also reads AIR as neutral/slate, so this override now matters
 * only for future divergence; kept for explicitness. Synced with the PDF
 * renderer's riskDispositionPanelTone. */
function riskDispositionPanelTone(label: string): RiskBadgeTone {
  const v = label.trim();
  if (/^Do Not Proceed$/i.test(v)) return "hi";
  if (/^Proceed with Conditions$/i.test(v)) return "warn";
  if (/^Proceed$/i.test(v)) return "ok";
  return "neutral";
}

/** The glance panel: eyebrow + dominant disposition badge, the count-tile
 * strip (serif numerals, sans caps labels, hairline separators), the
 * key-dates line, the fixed "What this means" line. Built ONLY from the
 * persisted exec_status_panel / key_dates surfaces (doc 127 §28 law) — the
 * SAME rows the cover card projects, never re-derived. */
function RiskGlancePanel({ doc }: { doc: SkeletonDocument }) {
  let panelRows: string[][] | null = null;
  let keyDateRows: string[][] | null = null;
  for (const sec of doc.sections) {
    for (const p of sec.paragraphs) {
      if (p.kind !== "table" || !p.table) continue;
      if (p.table.surface === "exec_status_panel") panelRows = p.table.rows;
      else if (p.table.surface === "key_dates") keyDateRows = p.table.rows;
    }
  }
  if (!panelRows) return null;
  const get = (label: string): string => {
    const row = panelRows!.find((r) => String(r?.[0] ?? "") === label);
    return row ? String(row[1] ?? "") : "";
  };
  const disp = get("Assessment disposition");
  if (!disp) return null;
  const tiles = ([
    ["Triggers engaged", get("Triggers engaged")],
    ["Risks identified", get("Risks identified")],
    ["Benefits credited", get("Benefits credited")],
    ["Conditions", get("Number of conditions")],
  ] as Array<[string, string]>).filter(([, v]) => v !== "");
  const keyDateOf = (label: string): string => {
    const row = (keyDateRows ?? []).find((r) => String(r?.[0] ?? "") === label);
    return row ? String(row[2] ?? "") : "";
  };
  const keyDates = ([
    ["Initial assessment", keyDateOf("Initial risk assessment")],
    ["Three-year review", keyDateOf("Three-year review")],
  ] as Array<[string, string]>).filter(([, v]) => v !== "");
  const plain = get("What this means");
  return (
    <div className={`rounded border border-border border-l-[3px] bg-slate-50 px-4 py-3 dark:bg-slate-900/40 ${riskDispositionAccentClass(disp)}`}>
      <div className="mb-1 font-sans text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">
        Assessment at a Glance
      </div>
      <RiskBadge value={disp} large tone={riskDispositionPanelTone(disp)} />
      {tiles.length > 0 && (
        <div className="mt-2 flex">
          {tiles.map(([label, v], i) => (
            <div key={label} className={`flex-1 px-2 text-center ${i > 0 ? "border-l border-border/70" : ""}`}>
              <div className="font-serif text-[26px] leading-tight text-slate-800 dark:text-slate-200">{v}</div>
              <div className="font-sans text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">{label}</div>
            </div>
          ))}
        </div>
      )}
      {keyDates.length > 0 && (
        <div className="mt-2 border-t border-border/60 pt-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
          <span className="font-sans text-[9px] font-bold uppercase tracking-wider">Key dates</span>
          {" — "}
          {keyDates.map(([l, v]) => `${l}: ${v}`).join(" · ")}
        </div>
      )}
      {plain && (
        <div className="mt-1.5 text-[12.5px] leading-relaxed text-foreground">
          <strong>What this means:</strong> {plain}
        </div>
      )}
    </div>
  );
}

/** The § 2.A customer-voice block (kind `customer_voice`): attribution line
 * as the teal eyebrow, the Processing/Purpose labels as caps slate, the
 * quoted values with their typographic quotes preserved. */
function RiskCustomerVoice({ text }: { text: string }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  const [attribution, ...rest] = lines;
  return (
    <div className="border-l-[3px] border-teal-600/80 bg-teal-50/50 px-4 py-2.5 dark:border-teal-400/70 dark:bg-teal-950/20">
      <div className="mb-1 font-sans text-[10px] font-bold uppercase tracking-widest text-teal-800 dark:text-teal-300">
        {attribution}
      </div>
      {rest.map((line, i) => {
        const m = /^(Processing|Purpose)\.\s*([\s\S]*)$/.exec(line);
        if (!m) {
          return (
            <div key={i} className="text-[13.5px] leading-relaxed text-foreground">{line}</div>
          );
        }
        return (
          <div key={i} className="text-[13.5px] leading-relaxed text-foreground">
            <span className="mr-1.5 font-sans text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{m[1]}</span>
            {m[2]}
          </div>
        );
      })}
    </div>
  );
}

function SkeletonTableView({ table, product }: { table: SkeletonTable; product?: string }) {
  if (!table.rows?.length) return null;
  if (product === "cppa-risk" && table.surface === "cover_summary") {
    return <RiskProfilePanel table={table} />;
  }
  if (
    product === "cppa-risk" && table.surface === "exec_status_panel" &&
    table.rows.some((r) => String(r?.[0] ?? "") === "Assessment disposition")
  ) {
    return <RiskResultCard table={table} />;
  }
  const riskCell = product === "cppa-risk" ? RISK_CELL_RENDERERS[table.surface ?? ""] : undefined;
  return (
    <figure className="my-4 space-y-2">
      {table.title && (
        <figcaption className="font-body text-sm font-semibold text-foreground">
          {table.title}
        </figcaption>
      )}
      {/* doc 72 (Fleet Report Design System, 2026-08-25) — horizontal-rules-
          only table anatomy, matching generate-report-pdf's skeletonTableHtml
          byte-for-byte in intent: no vertical rules, no zebra striping.
          A-TEAM S4 RULING S3.3 (doc 119): doc 72's no-header-fill rule is
          AMENDED by CEO directive to permit this one very light navy-grey
          header tint (#f3f6f8; dark-mode slate equivalent), synced with the
          PDF renderer. */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-y-2 border-foreground text-xs">
          {!table.hideHeader && (
            <thead>
              <tr>
                {table.columns.map((c, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="border-b-2 border-foreground/70 bg-[#f3f6f8] dark:bg-slate-900/40 px-3 py-2 text-left font-sans text-[11px] font-bold uppercase tracking-wide text-foreground"
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
                    {/^_{6,}$/.test(String(cell).trim())
                      ? cellContent(String(cell))
                      : riskCell
                      ? riskCell(String(cell ?? ""), c)
                      : renderWithFootnotes(cell)}
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
