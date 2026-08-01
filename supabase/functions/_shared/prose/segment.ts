/**
 * ITEM 337 (PROSE PROGRAM 1 of 4) — ABBREVIATION-AWARE SENTENCE SEGMENTATION.
 *
 * ONE shared segmenter for every product. Legal prose is full of periods that
 * are NOT sentence boundaries ("Art. 35(11)", "Cal. Civ. Code § 1798.82",
 * "No. 24-1177", "Schrems v. Meta", "e.g.", "U.S.", "Acme Inc."). Splitting on
 * a naive /[^.!?]+[.!?]+/ produced two confirmed defect classes:
 *
 *   (1) COUNSEL-HEDGE SPLICE (dpia, governance) — the hedge sentence was
 *       spliced after "Art.", orphaning the article number:
 *         "GDPR Art. The organisation should confirm whether the described
 *          position applies here. 35(11) requires …"
 *   (2) DANGLING-ABBREVIATION TRUNCATION (cppa-cyber) — truncate-at-sentence
 *       cut after "Cal. Civ." leaving "Civ." fragments and a
 *       {"text":"Civ."} next_steps entry.
 *
 * Both now route through `splitSentencesSafe` / `truncateAtSentenceBoundary`.
 *
 * Pure. Never throws. No I/O.
 */

export const SEGMENTER_VERSION = "prose-segment-2026-08-01-item337";

/**
 * Tokens that end in "." and are NEVER sentence-final. Compared
 * case-insensitively against the last whitespace-delimited token before the
 * candidate boundary (leading punctuation stripped).
 */
export const LEGAL_ABBREVIATIONS: readonly string[] = [
  // citation furniture
  "art.", "arts.", "artt.", "sec.", "secs.", "s.", "ss.", "para.", "paras.",
  "pt.", "pts.", "ch.", "chs.", "cl.", "sched.", "reg.", "regs.", "rec.",
  "no.", "nos.", "p.", "pp.", "ff.", "cf.", "id.", "ibid.", "seq.", "et.",
  "al.", "v.", "vs.", "ex.", "supra.", "infra.",
  // california / us code furniture
  "cal.", "civ.", "code.", "proc.", "pen.", "gov.", "bus.", "prof.", "ccr.",
  "u.s.", "u.s.c.", "c.f.r.", "cfr.", "usc.", "stat.", "fed.", "app.",
  "dist.", "ct.", "cts.", "j.", "jj.", "amend.",
  // latin / editorial
  "e.g.", "i.e.", "viz.", "etc.", "n.b.", "approx.", "est.", "incl.",
  // entity suffixes
  "inc.", "ltd.", "llc.", "l.l.c.", "plc.", "corp.", "co.", "gmbh.", "s.a.",
  "s.a.s.", "b.v.", "n.v.", "a.s.", "oy.", "ab.", "pty.",
  // titles
  "mr.", "mrs.", "ms.", "dr.", "prof.", "hon.", "st.",
  // regulators / instruments seen in the corpus
  "reg.", "dir.", "comm.", "comm'n.", "dep't.", "att'y.", "gen.",
];

const ABBREV_SET: ReadonlySet<string> = new Set(LEGAL_ABBREVIATIONS);

/** A single capital letter followed by a period is an initial ("J. Smith"). */
const INITIAL_RE = /^[A-Z]\.$/;

/** Trailing token immediately before the boundary index. */
function trailingToken(text: string, endIdxExclusive: number): string {
  let i = endIdxExclusive;
  // walk back over the punctuation run itself
  while (i > 0 && /[.!?]/.test(text[i - 1])) i--;
  let start = i;
  while (start > 0 && !/\s/.test(text[start - 1])) start--;
  return text.slice(start, endIdxExclusive).replace(/^[("'\[«]+/, "");
}

/**
 * True when the punctuation run ending at `endIdxExclusive` is a real
 * sentence boundary.
 */
export function isSentenceBoundary(text: string, endIdxExclusive: number): boolean {
  if (!text) return false;
  const punct = text.slice(Math.max(0, endIdxExclusive - 3), endIdxExclusive);
  // "!" and "?" are always terminal.
  if (/[!?]/.test(punct[punct.length - 1] ?? "")) return true;

  const tok = trailingToken(text, endIdxExclusive);
  const lower = tok.toLowerCase();
  if (ABBREV_SET.has(lower)) return false;
  if (INITIAL_RE.test(tok)) return false;
  // "§ 7152(a)." style — a bare section symbol run is never terminal when a
  // pinpoint follows.
  if (/^§+\.?$/.test(tok)) return false;
  // Parenthesised enumerator "(a)." "(iv)." or a single-digit list marker "1."
  if (/^\([0-9ivxIVX]+\)\.$/.test(tok)) return false;
  if (/^[0-9ivxIVX]\.$/.test(tok)) return false;

  // Look-ahead: a boundary is not a boundary when the next non-space char
  // continues the same citation or clause.
  const rest = text.slice(endIdxExclusive);
  const m = /^\s*(\S)/.exec(rest);
  if (m) {
    const nextCh = m[1];
    if (/[a-z]/.test(nextCh)) return false;      // "… Art. seq" / lowercase continuation
    if (/[0-9]/.test(nextCh)) return false;      // "Art. 35(11)" / "§ 1798. 140"
    if (nextCh === "(" || nextCh === "§") return false;
  }
  return true;
}

/**
 * Split prose into sentences, honouring legal abbreviations. Returns trimmed,
 * non-empty sentences with their terminal punctuation preserved. A trailing
 * fragment without terminal punctuation is returned as its own sentence
 * (matching the legacy splitter's contract).
 */
export function splitSentencesSafe(input: string): string[] {
  const s = String(input ?? "");
  if (!s.trim()) return [];
  const out: string[] = [];
  let start = 0;
  const re = /[.!?]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const end = m.index + m[0].length;
    if (!isSentenceBoundary(s, end)) continue;
    const piece = s.slice(start, end).trim();
    if (piece) out.push(piece);
    start = end;
  }
  const tail = s.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

/** Rejoin sentences with single spaces. */
export function rejoinSentences(parts: readonly string[]): string {
  return parts.map((p) => String(p ?? "").trim()).filter(Boolean).join(" ");
}

/**
 * Truncate at the last REAL sentence boundary at or before `maxLen`.
 * Never leaves a dangling abbreviation ("… Cal. Civ."). When no safe boundary
 * exists past `minRatio` of the budget, the text is ellipsised at the last
 * whitespace instead of being cut mid-token.
 */
export function truncateAtSentenceBoundary(
  text: string | null | undefined,
  maxLen = 600,
  minRatio = 0.5,
): string | null {
  if (text === null || text === undefined) return text ?? null;
  const t = String(text);
  if (t.length <= maxLen) return t;
  const window = t.slice(0, maxLen);

  // Walk every punctuation run in the window; keep the last real boundary.
  let lastBoundary = -1;
  const re = /[.!?]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(window)) !== null) {
    const end = m.index + m[0].length;
    // A boundary at the very end of the window has no look-ahead in `window`;
    // evaluate it against the full text so "Cal. Civ." is still rejected.
    if (isSentenceBoundary(t, end)) lastBoundary = end;
  }
  if (lastBoundary > maxLen * minRatio) return window.slice(0, lastBoundary).trim();

  const lastSpace = window.lastIndexOf(" ");
  const cut = lastSpace > maxLen * minRatio ? window.slice(0, lastSpace) : window;
  return `${cut.trim()}…`;
}

/**
 * True when the string is nothing but an abbreviation fragment
 * ("Civ.", "Cal. Civ.", "Art."). Used by callers to drop degenerate list
 * entries such as the recorded cppa-cyber {"text":"Civ."} next_step.
 */
export function isAbbreviationFragment(s: unknown): boolean {
  const t = String(s ?? "").trim();
  if (!t) return false;
  const tokens = t.split(/\s+/);
  if (tokens.length > 3) return false;
  return tokens.every((tok) => ABBREV_SET.has(tok.toLowerCase()) || INITIAL_RE.test(tok));
}
