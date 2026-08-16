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
  // coordinating conjunction). Never mid-word, never mid-quote.
  const m = one.match(/^(.{20,}?)(?:;|,\s+(?:and|but|or|which|while|so that)\b)/i);
  const clause = noStop((m ? m[1] : one).trim());
  return clause;
}
