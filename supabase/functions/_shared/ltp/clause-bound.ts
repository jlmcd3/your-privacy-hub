/**
 * PROMPT 9J (CEO-ruled 2026-08-16) — SINGLE-WRITER CLAUSE BOUNDING.
 *
 * `boundedClause` (and the abbreviation-aware `firstSentence` it rests on) used
 * to live in dpia-skeleton-assemble.ts. The 9J span-based impact quote needs
 * the SAME bound inside dpia-deliverables/build.ts, and the assembler imports
 * build.ts — so the shared implementation moves here and both roots import it.
 * The bytes of the bound are unchanged; only its home moved.
 *
 * Pure. Never throws. No I/O.
 */

export const noStop = (t: string): string => String(t ?? "").replace(/\s*\.\s*$/, "");

// SO-3 DEFECT CLASS 2 — abbreviation-aware sentence boundaries. Without this
// guard "GDPR Art. 35(7)" truncates a sentence at "Art.".
//
// CEO report review 2026-08-25 — the generic `\s[A-Z]\.$` fallback (for a
// single capital letter not on the named list — a mid-name initial, a
// stray lettered cite) also caught "Appendix F." / "Exhibit F.": a real
// appendix/exhibit letter is a genuine sentence end, not an abbreviation,
// so treating it as one merged that sentence with the NEXT one ("...record
// in Appendix F. Conclusion." became one "sentence"), most visibly in
// Appendix A's Report Determination cells (firstSubstantiveSentence()).
// The negative lookbehind excludes exactly that case; every other
// single-letter abbreviation this branch was protecting is unaffected.
// 2026-08-25 (batch be0f9e02, dpia fragment findings): "Prof" and "est"
// joined the list — a live intake carried "Model validation conducted by
// Prof. Dr. …", and firstSentence() cut the quote to "…conducted by Prof".
export const ABBREV_TAIL =
  /(?:\b(?:Art|Arts|Artt|No|Nos|Reg|Recital|Sched|Sec|Secs|Ch|Cl|para|paras|pp|cf|Cal|Civ|Code|Tex|Bus|Com|Ins|Bus\.\s&\sCom|Inc|Ltd|GmbH|AG|Co|Corp|plc|Nr|vs|v|e\.g|i\.e|etc|approx|est|Prof|Dr|Mr|Mrs|Ms|St|U\.S|U\.K)|(?<!Appendix|Exhibit)\s[A-Z])\.$/;

/** 2026-08-25 (batch be0f9e02) — true iff every "(" in `s` is closed. A
 * sentence or clause boundary inside an unclosed parenthetical is never a
 * real boundary; splitting there produced mid-parenthetical fragments in
 * rendered customer quotes ("…lifestyle survey responses) as
 * insufficiently predictive…"). */
function parenBalanced(s: string): boolean {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(") depth++;
    else if (ch === ")" && depth > 0) depth--;
  }
  return depth === 0;
}

export function firstSentence(text: string): string {
  const t = String(text ?? "").trim();
  const re = /[.!?](?=\s|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const end = m.index + 1;
    const head = t.slice(0, end);
    if (ABBREV_TAIL.test(head)) continue;
    // 2026-08-25 — a period inside an unclosed parenthetical is not a
    // sentence end (batch be0f9e02 fragment class).
    if (!parenBalanced(head)) continue;
    if (/^\s+[a-z0-9]/.test(t.slice(end))) continue;
    return head.trim();
  }
  return t;
}

/**
 * 2026-08-25 (batch be0f9e02, dpia fragment findings) — SENTENCE-BOUNDED
 * PASSAGE. Whole abbreviation-aware sentences accumulated up to `maxChars`,
 * never cutting mid-sentence, mid-parenthetical, or mid-clause; always at
 * least the first sentence, however long. Built for the customer-quote
 * call sites (DPIA §3's "how", alternative-rejection reasons, and impact
 * statements) where `boundedClause`'s single-clause bound discarded the
 * substance of rich intake fields — the grader read the remnants as
 * boilerplate fragments.
 */
export function boundedPassage(text: string, maxChars = 520): string {
  let t = String(text ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  const parts: string[] = [];
  let used = 0;
  for (let guard = 0; guard < 12 && t; guard++) {
    const s1 = firstSentence(t);
    if (!s1) break;
    if (parts.length > 0 && used + 1 + s1.length > maxChars) break;
    parts.push(s1);
    used += (parts.length > 1 ? 1 : 0) + s1.length;
    t = t.startsWith(s1) ? t.slice(s1.length).trim() : "";
  }
  return noStop(parts.join(" "));
}

// CEO report review 2026-08-24 — several composers (the risk factor engine
// chief among them) open a block with a bare structural subheading:
// "C. Conclusion.", "B. Material Risk Pathways.", "Analysis.",
// "Record Considered." — a fixed lettered/numbered head or a bare label,
// not substantive content. `ABBREV_TAIL` only protects a capital letter
// PRECEDED by whitespace (so "GDPR Art." doesn't truncate); it has no
// protection for a capital letter that OPENS the string, or a whole
// capitalized phrase immediately followed by a period. `firstSentence()`
// therefore returns exactly that fragment — a bare "C." or "Analysis." —
// when it is called on the FULL block instead of on the substantive
// sentence after the subheading. This is most visible in Appendix A /
// DPIA Appendix A / ADMT Appendix A's "Report Determination" cells, which
// call `firstSentence()` on a whole composed block to produce one summary
// sentence.
//
// `firstSentence()` itself is left untouched: many callers legitimately
// want the literal first sentence, including one that IS short. This is a
// second, narrowly-scoped function for the one call site that specifically
// wants the first SUBSTANTIVE sentence of a block that may open with a
// structural preface.
//
// Rather than a hand-maintained list of every bare-label constant in the
// codebase (fragile — a new one added later would silently reproduce this
// bug), this recognizes the SHAPE of a structural label: short (at most 6
// words) and every word Title-Case or a minor title-case word ("to",
// "of", ...). Real prose in this register always carries an ordinary
// lowercase content word (a verb, noun, adjective) within its first few
// words — the register guide itself bans headline-style fragments as
// sentences — so this reliably tells a label from a sentence without
// needing to know every label's exact text.
const MINOR_TITLE_WORD = /^(?:to|of|in|and|or|the|a|an|for|on|at)$/i;
function looksLikeStructuralLabel(sentence: string): boolean {
  const words = sentence.replace(/[.!?]\s*$/, "").split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 6) return false;
  return words.every((w) => MINOR_TITLE_WORD.test(w) || /^[A-Z]/.test(w.replace(/^[("]+/, "")));
}

/**
 * `firstSentence()`, but skips past a leading run of structural labels
 * ("C. Conclusion. ", "Analysis. ", "Record Considered. ") and "— "
 * list-item markers (see generate-report-pdf/index.ts's splitDashList) so
 * the returned sentence is the first SUBSTANTIVE one, never a bare
 * letter, label, or dangling dash. Bounded iteration; falls back to the
 * last candidate (even if still label-shaped) rather than returning "".
 */
export function firstSubstantiveSentence(text: string): string {
  let t = String(text ?? "").trim();
  for (let i = 0; i < 6 && t; i++) {
    t = t.replace(/^—\s*/, "");
    const one = firstSentence(t);
    if (!one) return t;
    if (!looksLikeStructuralLabel(one)) return one;
    t = t.slice(one.length).trim();
  }
  return firstSentence(t) || t;
}

/** S3-R3 — the first clause of a customer field, quote-safe and unpadded. */
export function boundedClause(text: string): string {
  const t = noStop(String(text ?? "").trim().replace(/\s+/g, " "));
  if (!t) return "";
  const one = noStop(firstSentence(t));
  // Bound further at the first clause boundary (semicolon, or a comma-led
  // coordinating conjunction). Never mid-word, never mid-quote. Single writer:
  // the boundaries live in splitClauses; the first clause IS this bound.
  return splitClauses(one)[0]?.text ?? "";
}

/**
 * PROMPT 9J.1 (CEO-ruled 2026-08-16) — CLAUSE-GRANULAR SELECTION.
 *
 * `boundedClause` bounds a sentence at its FIRST clause boundary. 9J.1 needs
 * the SAME boundaries enumerated, so selection can be clause-granular instead
 * of sentence-granular. One implementation: the boundary pattern and the
 * 20-character minimum below are exactly what `boundedClause` applies, and
 * `boundedClause` is re-expressed as `splitClauses(...)[0]` so the two can
 * never drift.
 */
const CLAUSE_BOUNDARY = /^(.{20,}?)(;|,\s+(?:and|but|or|which|while|so that)\b)/i;

/**
 * PROMPT 9L.1 item 2 (CEO redline, 2026-08-16) — COLON CLAUSE BOUNDARY FOR
 * SPAN EXTRACTION. Extraction (the impact span and the Step-2 "how" clause)
 * must start at the operative content AFTER an in-sentence lead-in, so the
 * rendered quote never double-frames the template's own lead. The colon is a
 * boundary for EXTRACTION only; `boundedClause`'s rendering bound is unchanged.
 */
const CLAUSE_BOUNDARY_COLON = /^(.{20,}?)(:|;|,\s+(?:and|but|or|which|while|so that)\b)/i;

export interface Clause {
  text: string;
  start: number;
  /** The separator that CLOSED this clause (":", ";", ","), or "" at the end. */
  sep: string;
}

/** The clauses of ONE sentence, in order, each with its offset in that sentence.
 *
 * 2026-08-25 (batch be0f9e02) — PAREN-AWARE: a boundary whose head carries
 * an unclosed "(" is skipped (the separator is absorbed into the clause),
 * so clause-granular selection can never start or end a customer quote
 * mid-parenthetical. Same boundaries, same 20-char minimum, same seps. */
export function splitClauses(sentence: string, opts?: { colon?: boolean }): Clause[] {
  const boundary = opts?.colon ? CLAUSE_BOUNDARY_COLON : CLAUSE_BOUNDARY;
  const s = String(sentence ?? "").trim().replace(/\s+/g, " ");
  const out: Clause[] = [];
  let offset = 0;
  let rest = s;
  let searchFrom = 0; // within `rest`: skip past paren-unbalanced boundaries
  while (rest) {
    const tail = rest.slice(searchFrom);
    const m = tail.match(boundary);
    if (!m) {
      const text = noStop(rest.trim());
      if (text) out.push({ text, start: offset + (rest.length - rest.trimStart().length), sep: "" });
      break;
    }
    const head = rest.slice(0, searchFrom + m[1].length);
    if (!parenBalanced(head)) {
      // Boundary sits inside a parenthetical — absorb it and keep looking.
      searchFrom = searchFrom + m[1].length + m[2].length;
      continue;
    }
    const text = noStop(head.trim());
    const sep = m[2].trim().startsWith(",") ? "," : m[2].trim();
    if (text) out.push({ text, start: offset + (head.length - head.trimStart().length), sep });
    offset += head.length + m[2].length;
    rest = s.slice(offset);
    searchFrom = 0;
  }
  return out;
}

/**
 * PROMPT 9L.1 item 2 — the EXTRACTION-START clause of a customer field: the
 * first clause of its first sentence, taken after any in-sentence lead-in that
 * ends in a colon. Same bound, same single writer; only the start moves.
 */
export function extractionClause(text: string): string {
  const t = noStop(String(text ?? "").trim().replace(/\s+/g, " "));
  if (!t) return "";
  const clauses = splitClauses(noStop(firstSentence(t)), { colon: true });
  if (clauses.length === 0) return "";
  if (clauses[0].sep === ":" && clauses[1]) return clauses[1].text;
  return clauses[0].text;
}

