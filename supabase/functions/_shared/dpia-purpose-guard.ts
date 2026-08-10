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

/**
 * Returns the occurrences where secondary-uses text is quoted inside a
 * purpose/benefit framing. Empty array means clean.
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

  const findings: ConflationFinding[] = [];
  const haystacks = collectProse(section).map(norm);
  // Slide a window over the secondary-uses text; the first hit per haystack is
  // enough — one quotation is one defect.
  for (const hay of haystacks) {
    for (let i = 0; i + MIN_CHUNK <= sec.length; i += 8) {
      const chunk = sec.slice(i, i + MIN_CHUNK);
      if (pur.includes(chunk)) continue; // shared wording, not a mix-up
      const at = hay.indexOf(chunk);
      if (at < 0) continue;
      const before = hay.slice(Math.max(0, at - FRAME_WINDOW), at);
      if (!FRAME.test(before)) continue;
      findings.push({ chunk, excerpt: hay.slice(Math.max(0, at - 80), at + MIN_CHUNK + 40) });
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
