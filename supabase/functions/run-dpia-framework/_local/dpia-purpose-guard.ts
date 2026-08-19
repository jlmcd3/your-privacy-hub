// DPIA — PURPOSE / SECONDARY-USES CONFLATION GUARD.
//
// The necessity test (Art. 35(7)(b)) is measured against the STATED PURPOSE.
// Batch grading (quality-batch 0e2cbbe3, run 5b8240d3) caught the u3 generator
// quoting `intake.secondary_uses` as if it were `intake.purpose`, and reusing
// the same text as the "benefit" side of the proportionality balance. Both
// fields sit in the same context block and a secondary-uses answer often reads
// grammatically like a purpose statement ("None. Certificate data is not used
// for any purpose beyond …"), so this is a structural trap, not laziness.
//
// This module is the deterministic backstop to the labelling fix: it detects a
// meaningful chunk of the secondary-uses answer appearing in the necessity /
// proportionality prose under a purpose- or benefit-framing.

const FRAME = /\b(purpose|benefit|necessity|necessary|proportionalit)/i;

/** The window before an occurrence that a purpose/benefit frame can govern. */
const FRAME_WINDOW = 160;

/** Shortest secondary-uses chunk we will treat as a quotation, not a coincidence. */
export const MIN_CHUNK = 40;

const norm = (t: string): string => (typeof t === "string" ? t.replace(/\s+/g, " ").trim() : "");

/** Collect every reader-visible string in a section payload. */
export function collectProse(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    if (value.trim()) out.push(value);
  } else if (Array.isArray(value)) {
    for (const v of value) collectProse(v, out);
  } else if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) collectProse(v, out);
  }
  return out;
}

export interface ConflationFinding {
  readonly chunk: string;
  readonly excerpt: string;
}

// SO-FT FIX 1b (2026-08-11): literal-substring detection only caught a verbatim
// quotation. On regeneration the model reworded the secondary-uses answer and
// slipped straight past the guard, so the repair re-ask never fired. Paraphrase
// detection compares normalised significant-word overlap between each framed
// sentence and the secondary-uses answer.
export const PARAPHRASE_THRESHOLD = 0.6;

const STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "for", "and", "or", "in", "on", "at", "by", "with",
  "that", "this", "is", "are", "be", "as", "its", "it", "from", "which", "any",
  "not", "no", "used", "use", "data", "beyond", "other", "than", "we", "our",
]);

function sigWords(t: string): Set<string> {
  return new Set(
    t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

/** Shared significant words / smaller set size. 0 when either side is empty. */
export function wordOverlap(a: string, b: string): number {
  const A = sigWords(a), B = sigWords(b);
  if (A.size < 3 || B.size < 3) return 0;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared++;
  return shared / Math.min(A.size, B.size);
}

function sentences(t: string): string[] {
  return t.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter((x) => x.length > 0);
}

/**
 * Returns the occurrences where secondary-uses text is quoted OR paraphrased
 * inside a purpose/benefit framing. Empty array means clean.
 */
export function detectPurposeConflation(
  section: unknown,
  purpose: string,
  secondaryUses: string,
): ConflationFinding[] {
  const sec = norm(secondaryUses);
  const pur = norm(purpose);
  if (sec.length < MIN_CHUNK) return [];
  // Nothing to disambiguate when the two answers overlap in substance.
  if (pur && (pur.includes(sec) || sec.includes(pur))) return [];
  if (pur && wordOverlap(pur, sec) >= PARAPHRASE_THRESHOLD) return [];

  const findings: ConflationFinding[] = [];
  const haystacks = collectProse(section).map(norm);
  // Slide a window over the secondary-uses text; the first hit per haystack is
  // enough — one quotation is one defect.
  for (const hay of haystacks) {
    let hit = false;
    for (let i = 0; i + MIN_CHUNK <= sec.length; i += 8) {
      const chunk = sec.slice(i, i + MIN_CHUNK);
      if (pur.includes(chunk)) continue; // shared wording, not a mix-up
      const at = hay.indexOf(chunk);
      if (at < 0) continue;
      const before = hay.slice(Math.max(0, at - FRAME_WINDOW), at);
      if (!FRAME.test(before)) continue;
      findings.push({ chunk, excerpt: hay.slice(Math.max(0, at - 80), at + MIN_CHUNK + 40) });
      hit = true;
      break;
    }
    if (hit) continue;

    // Paraphrase pass — sentence-level overlap under a purpose/benefit frame.
    let cursor = 0;
    for (const sent of sentences(hay)) {
      const at = hay.indexOf(sent, cursor);
      cursor = at < 0 ? cursor : at + sent.length;
      const framed = FRAME.test(sent) ||
        FRAME.test(hay.slice(Math.max(0, (at < 0 ? 0 : at) - FRAME_WINDOW), at < 0 ? 0 : at));
      if (!framed) continue;
      if (pur && wordOverlap(sent, pur) >= wordOverlap(sent, sec)) continue; // reads on the purpose
      if (wordOverlap(sent, sec) < PARAPHRASE_THRESHOLD) continue;
      findings.push({ chunk: sec.slice(0, MIN_CHUNK), excerpt: sent.slice(0, 200) });
      break;
    }
  }
  return findings;
}


/** Corrective instruction appended to the single bounded u3 re-ask. */
export function conflationRepairInstruction(purpose: string, secondaryUses: string): string {
  return (
    "\n\nDETERMINISTIC CORRECTION — PURPOSE / SECONDARY USES CONFLATION DETECTED IN YOUR PREVIOUS OUTPUT. " +
    "You quoted the SECONDARY / COMPATIBLE USES answer as if it were the stated purpose (or as the benefit in the proportionality balance). " +
    "Regenerate this unit. The ONLY text that may be quoted or paraphrased as the purpose, and the ONLY basis for the benefit side of the balance, is:\n" +
    `STATED PURPOSE: ${norm(purpose) || "not specified"}\n` +
    `SECONDARY / COMPATIBLE USES (must NEVER be described as the purpose or the benefit): ${norm(secondaryUses) || "not specified"}\n` +
    "If the secondary-uses answer says the data is not used beyond the primary purpose, that is a statement about scope limitation — treat it as evidence of minimisation, never as the purpose itself."
  );
}
