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
export const ABBREV_TAIL =
  /(?:\b(?:Art|Arts|Artt|No|Nos|Reg|Recital|Sched|Sec|Secs|Ch|Cl|para|paras|pp|cf|Cal|Civ|Code|Tex|Bus|Com|Ins|Bus\.\s&\sCom|Inc|Ltd|GmbH|AG|Co|Corp|plc|Nr|vs|v|e\.g|i\.e|etc|approx|Dr|Mr|Mrs|Ms|St|U\.S|U\.K)|\s[A-Z])\.$/;

export function firstSentence(text: string): string {
  const t = String(text ?? "").trim();
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

/** The clauses of ONE sentence, in order, each with its offset in that sentence. */
export function splitClauses(sentence: string, opts?: { colon?: boolean }): Clause[] {
  const boundary = opts?.colon ? CLAUSE_BOUNDARY_COLON : CLAUSE_BOUNDARY;
  const s = String(sentence ?? "").trim().replace(/\s+/g, " ");
  const out: Clause[] = [];
  let offset = 0;
  let rest = s;
  while (rest) {
    const m = rest.match(boundary);
    if (!m) {
      const text = noStop(rest.trim());
      if (text) out.push({ text, start: offset + (rest.length - rest.trimStart().length), sep: "" });
      break;
    }
    const head = m[1];
    const text = noStop(head.trim());
    const sep = m[2].trim().startsWith(",") ? "," : m[2].trim();
    if (text) out.push({ text, start: offset + (head.length - head.trimStart().length), sep });
    offset += m[0].length;
    rest = s.slice(offset);
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

