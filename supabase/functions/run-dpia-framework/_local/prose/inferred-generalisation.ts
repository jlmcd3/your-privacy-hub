// ITEM 372 (SECOND CORRECTION ROUND, 7) — INFERRED-DATA OVER-SPECIFICATION.
//
// THE DEFECT
// ----------
// A row of `section_1_description.processed_personal_data` marked
// `source.basis = "inferred"` is, by definition, a row the intake does not
// enumerate. Several such rows nevertheless shipped with SPECIFIC examples
// attached — named portal event types, named purchase-history categories —
// none of which appears anywhere in the record. An inferred row that names
// examples reads exactly like a stated one, which is the fact-discipline
// failure the provenance stamp exists to prevent.
//
// THE RULE
// --------
// An inferred row states the CATEGORY and the BASIS of the inference. It never
// enumerates specific examples the intake does not contain. This pass finds the
// enumerations in an inferred row's prose ("e.g. …", "such as …", "including
// …") and removes them, keeping every example that IS present in the intake
// text. The row keeps its category, keeps its explanation, and gains nothing.
//
// Deterministic, in-place, never throws. Telemetry on
// `_meta.internal.inferred_generalisation`.

export const INFERRED_GENERALISATION_VERSION = "inferred-general-2026-08-05-item372r2";

/** Rows carrying provenance stamps, per the DPIA W3-T1 contract. */
const PROVENANCE_ARRAYS = ["processed_personal_data", "purposes", "functional_description"];

/** Prose fields on those rows that a reader treats as the row's content. */
const PROSE_FIELDS = ["item", "explanation", "purpose", "personal_data_involved_and_justification", "operations_note"];

/**
 * "e.g. a, b and c", "such as a, b", "including a and b" — the lead-in and
 * everything it introduces, up to the end of the clause. The lead-in keeps no
 * trailing `\b`: "e.g." ends in a period, and a word boundary after it fails,
 * which would leave the enumeration itself behind.
 */
const ENUMERATION_RE =
  /\s*(?:[,;(—–-]\s*)?\b(?:e\.?\s?g\.?|i\.?\s?e\.?|for example|such as|including|includes|namely)[:,]?(?:\s+[^.;)]*)?/gi;

export interface InferredGeneralisationCounters {
  version: string;
  /** rows inspected */
  rows: number;
  /** rows whose basis is "inferred" */
  inferred_rows: number;
  /** enumerations removed from inferred rows */
  enumerations_removed: number;
  /** enumerations kept because the intake contains them */
  enumerations_kept: number;
  crashed: boolean;
}

function tidy(text: string): string {
  return text
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,;:)])/g, "$1")
    .replace(/,\s*\./g, ".")
    .replace(/[,;]\s*$/g, "")
    .trim();
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * True when EVERY substantive term of the enumeration appears in the intake
 * text. An enumeration the intake supports is not over-specification and is
 * kept exactly as written.
 */
export function enumerationSupported(fragment: string, intakeNorm: string): boolean {
  const body = fragment
    .replace(/\b(?:e\.?g\.?|for example|such as|including|includes|namely|i\.?e\.?)\b/gi, " ");
  const terms = body
    .split(/[,;/]|\band\b|\bor\b/i)
    .map((t) => normalize(t))
    .filter((t) => t.length >= 4);
  if (!terms.length) return false;
  return terms.every((t) => intakeNorm.includes(t));
}

/** Flatten intake values into one normalised haystack. */
export function intakeHaystack(intake: unknown): string {
  const parts: string[] = [];
  const walk = (node: unknown): void => {
    if (node == null) return;
    if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
      parts.push(String(node));
      return;
    }
    if (Array.isArray(node)) { for (const x of node) walk(x); return; }
    if (typeof node === "object") for (const v of Object.values(node as Record<string, unknown>)) walk(v);
  };
  walk(intake);
  return normalize(parts.join(" "));
}

export function applyInferredGeneralisation(
  report: Record<string, unknown> | null | undefined,
  intake: unknown,
): InferredGeneralisationCounters {
  const c: InferredGeneralisationCounters = {
    version: INFERRED_GENERALISATION_VERSION,
    rows: 0,
    inferred_rows: 0,
    enumerations_removed: 0,
    enumerations_kept: 0,
    crashed: false,
  };
  try {
    if (!report || typeof report !== "object") return c;
    const intakeNorm = intakeHaystack(intake);
    const s1 = (report.section_1_description ?? {}) as Record<string, unknown>;

    for (const key of PROVENANCE_ARRAYS) {
      const arr = s1[key];
      if (!Array.isArray(arr)) continue;
      for (const row of arr) {
        if (!row || typeof row !== "object") continue;
        c.rows += 1;
        const rec = row as Record<string, unknown>;
        const src = rec.source as Record<string, unknown> | undefined;
        if (!src || src.basis !== "inferred") continue;
        c.inferred_rows += 1;

        for (const field of PROSE_FIELDS) {
          const value = rec[field];
          if (typeof value !== "string" || !value.trim()) continue;
          ENUMERATION_RE.lastIndex = 0;
          if (!ENUMERATION_RE.test(value)) continue;
          ENUMERATION_RE.lastIndex = 0;
          const next = value.replace(ENUMERATION_RE, (frag) => {
            if (enumerationSupported(frag, intakeNorm)) {
              c.enumerations_kept += 1;
              return frag;
            }
            c.enumerations_removed += 1;
            return "";
          });
          if (next !== value) {
            const cleaned = tidy(next);
            rec[field] = /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
          }
        }
      }
    }

    const meta = (report._meta ??= {}) as Record<string, unknown>;
    const internal = (meta.internal ??= {}) as Record<string, unknown>;
    internal.inferred_generalisation = { ...c };
  } catch (e) {
    c.crashed = true;
    console.warn("[inferred-generalisation] failed (non-fatal):", (e as Error)?.message);
  }
  return c;
}
