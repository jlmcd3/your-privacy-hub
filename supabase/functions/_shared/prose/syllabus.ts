// DOC 170 (2026-09-04) — SYLLABUS & RECORD, the fleet presentation system
// (docs 143/144 → 151, CEO-ratified 2026-09-03; canonical record
// docs/design/SYLLABUS-RECORD-DESIGN-SYSTEM.md).
//
// THE PAGE-1 PROJECTION. The Determination Syllabus is page one of every
// assessment-style report: brand line → activity title → the ONE display
// panel (disposition + one justified paragraph) → the determination table →
// the named conditions → the KEY DATES strip. It is a PROJECTION of
// determinations the product's engine/assembler already made — never a new
// one (doc 127 §28 law: renderers read persisted surfaces, never engines).
// Each product's assembler builds this object from its own typed outputs and
// attaches it to the skeleton document as `document.syllabus`; both renderers
// (generate-report-pdf, SkeletonDocumentView) read it by name; the skeleton
// grader payload prints it ahead of the sections so page one is graded like
// every other customer-visible page.
//
// Products opt in through SR_PRODUCTS (the render gate). A product not yet
// migrated keeps its existing presentation byte-for-byte.

export type SyllabusTone = "ok" | "hold" | "hi" | "neutral";

export interface SyllabusCondition {
  /** The run-in name (underline-only in the rendered page). */
  readonly name: string;
  /** The full closure text, verbatim from the product's § 4.D-equivalent. */
  readonly text: string;
}

export interface SyllabusProjection {
  readonly _typed: "syllabus@sr-2026-09-04";
  /** Brand-line right cell, line 1: "CPPA PRIVACY RISK ASSESSMENT · 11 CCR §§ 7150–7157". */
  readonly instrument_line: string;
  /** The eyebrow: the Company the report is prepared for. */
  readonly prepared_for: string;
  /** The R1 title: the activity/processing assessed (or the report's subject). */
  readonly activity: string;
  /** The line under the title: the instrument and the defined term. */
  readonly subtitle: string;
  /** The display panel's label ("ASSESSMENT DISPOSITION", "OUTCOME", …). */
  readonly disposition_label: string;
  /** The controlled disposition/outcome label, exactly as the product states it. */
  readonly disposition: string;
  readonly disposition_tone: SyllabusTone;
  /** The one justified paragraph beneath the disposition. */
  readonly paragraph: string;
  /** The determination table: [key, value] rows in display order. A value may
   *  carry a state word; the renderer tints the fleet lexicon words as text. */
  readonly rows: ReadonlyArray<readonly [string, string]>;
  /** The conditions eyebrow ("CONDITIONS TO PROCEED — the disposition depends
   *  on these"); "" when the product/record has none. */
  readonly conditions_heading: string;
  readonly conditions: readonly SyllabusCondition[];
  /** The KEY DATES strip: [label, value] pairs; empty when none. */
  readonly key_dates: ReadonlyArray<readonly [string, string]>;
  /** The Supporting Assessment Record map (record divider page): one row per
   *  appendix — [letter, title, one-line description]. */
  readonly record_map: ReadonlyArray<readonly [string, string, string]>;
  /** Running-head right cell ("CPPA PRIVACY RISK ASSESSMENT · COMPANY, INC."). */
  readonly running_head: string;
}

/** The render gate: products presenting in Syllabus & Record mode. Extended
 *  one product per batch as each product's assembler learns to project its
 *  syllabus; a product absent here keeps its current presentation. */
export const SR_PRODUCTS: ReadonlySet<string> = new Set<string>([
  "cppa-risk",
]);

export function isSyllabusRecordProduct(product: string | undefined | null): boolean {
  return !!product && SR_PRODUCTS.has(product);
}

/** The fleet State Lexicon (design system § 5): tinted as TEXT, never a
 *  filled chip; color never the sole carrier — the word is always written. */
export const SR_STATE_TONES: ReadonlyArray<readonly [RegExp, SyllabusTone]> = [
  [/^(Engaged|Credited|Addressed|Recorded|Confirmed|Yes|Low|Proceed|Necessary to the stated purpose|Implemented and tested|Complete)$/i, "ok"],
  [/^(Additional Information Required|Determination pending|Timeliness pending|Open|Partial|Open in part|Moderate|Unsure|Unconfirmed|Partly outside|Proceed with Conditions|Implemented, not tested|Planned, not yet implemented|Not stated — see the Follow-Ups in § 4\.D)$/i, "hold"],
  [/^(High|Critical|Do Not Proceed|Collected but not necessary to the stated purpose|Collected but not necessary)$/i, "hi"],
  [/^(Not engaged|Not established|Not applicable|Not assessed|No|Neutral|No Processing Decision Required|Not recorded)$/i, "neutral"],
];

export function toneForState(value: string): SyllabusTone | null {
  const v = value.trim();
  for (const [re, tone] of SR_STATE_TONES) if (re.test(v)) return tone;
  return null;
}

/** The disposition-family tone for a controlled disposition label (any product). */
export function dispositionTone(label: string): SyllabusTone {
  return toneForState(label) ?? "neutral";
}

/** Plain-text form of the syllabus for the grader payload (page one, graded
 *  like every other page). */
export function syllabusToText(s: SyllabusProjection): string {
  const lines: string[] = [];
  lines.push(`=== DETERMINATION SYLLABUS (page 1) ===`);
  lines.push(`${s.instrument_line}`);
  lines.push(`Prepared for ${s.prepared_for}`);
  lines.push(`${s.activity}`);
  if (s.subtitle) lines.push(s.subtitle);
  lines.push(`${s.disposition_label}: ${s.disposition}`);
  if (s.paragraph) lines.push(s.paragraph);
  for (const [k, v] of s.rows) lines.push(`${k} | ${v}`);
  if (s.conditions.length) {
    lines.push(s.conditions_heading);
    s.conditions.forEach((c, i) => lines.push(`${i + 1}. ${c.name} — ${c.text}`));
  }
  if (s.key_dates.length) lines.push(`KEY DATES · ${s.key_dates.map(([k, v]) => `${k}: ${v}`).join(" · ")}`);
  return lines.join("\n");
}

/** Reads the syllabus off a persisted skeleton document (renderers/graders). */
export function readSyllabus(doc: unknown): SyllabusProjection | null {
  const s = (doc as { syllabus?: unknown } | null | undefined)?.syllabus as SyllabusProjection | undefined;
  if (!s || typeof s !== "object" || s._typed !== "syllabus@sr-2026-09-04") return null;
  return s;
}
