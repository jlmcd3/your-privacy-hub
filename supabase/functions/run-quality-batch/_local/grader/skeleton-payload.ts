// SO-FINAL-TEST — ADDITIVE skeleton-document grader payload.
//
// This module is NEW and standalone. It does not import from, wrap, or modify
// _shared/grader/payload.ts: `buildGraderPayload`, `BODY_FIELDS`,
// `GRADER_PAYLOAD_BUDGET` and every legacy caller are untouched and remain on
// the DO NOT TOUCH list from the SO-1..SO-11 sequence.
//
// The legacy path grades a curated, per-product field list pulled out of
// report_data. THIS path grades exactly one thing: `report_data
// .skeleton_document` — every section, every paragraph, every block kind,
// nothing curated out and nothing from the legacy narrative merged alongside
// it. Because the skeleton_document shape is identical across all eleven
// SO-migrated products, one family serves them all — no per-product field
// list exists here by design.
//
// BUDGET (measured, not guessed). Largest persisted skeleton_document across
// the SO pilots, measured as `length(report_data->'skeleton_document')`:
//
//   cppa_cybersecurity  51,575    ropa                26,494
//   biometric           48,096    cppa_risk           21,016
//   governance          31,610    registration        18,429
//   lia                 28,705    cppa_admt           13,817
//   ir_playbook          7,360    scope_checker        7,299
//   dpia                 6,030
//
// Largest observed = 51,575 chars. The rendered payload is slightly larger
// than the raw JSON (kind labels + section headers), so the budget is set to
// 120,000 — ~2.3x the largest observed document, leaving real headroom for
// longer intakes and future skeleton growth without ever truncating today's
// documents.
export const SKELETON_GRADER_BUDGET = 120_000;

export interface SkeletonParagraphLike {
  kind?: string;
  text?: string;
  [k: string]: unknown;
}

export interface SkeletonSectionLike {
  id?: string;
  title?: string;
  paragraphs?: SkeletonParagraphLike[];
}

export interface SkeletonDocumentLike {
  title?: string;
  subtitle?: string;
  spine_version?: string;
  sections?: SkeletonSectionLike[];
}

export interface BuiltSkeletonPayload {
  text: string;
  truncated: boolean;
  original_length: number;
  /** Section count actually rendered into the payload. */
  section_count: number;
  /** Paragraph count actually rendered into the payload. */
  paragraph_count: number;
}

/** True when the report carries a gradeable skeleton_document. */
export function hasSkeletonDocument(report: unknown): boolean {
  const rd = (report && typeof report === "object") ? (report as Record<string, unknown>) : {};
  const doc = rd.skeleton_document as SkeletonDocumentLike | undefined;
  return !!doc && typeof doc === "object" && Array.isArray(doc.sections) && doc.sections.length > 0;
}

/**
 * Grader rubric addendum for the skeleton path. Appended to the existing
 * rubric system prompt (never replacing it) so the grader understands the
 * block-kind semantics of the document it is being handed.
 */
export const SKELETON_BLOCK_KIND_ADDENDUM = `

SKELETON-DOCUMENT GRADING ADDENDUM (this document only).

You are grading a SPECIFIED-OUTPUT document assembled from a byte-pinned,
CEO-ratified skeleton. Each paragraph is tagged with its block kind as
[kind=...]. The kinds are not stylistic labels — they change what you are
entitled to criticise:

- [kind=skeleton] — BYTE-PINNED FIXED PROSE. This text is ratified law for the
  product: it is reproduced verbatim and cannot be edited by the generator.
  NEVER raise a finding about its wording, tone, length, or style. The only
  admissible finding against a skeleton block is a factual/legal error in the
  fixed text itself, and you must say explicitly that the error is in the
  pinned prose. Slot VALUES interpolated inside a skeleton sentence ARE
  gradeable — attribute such findings to the slot content, not to the prose.

- [kind=lead] — a single deterministic or model-written sentence that opens a
  section. Grade ONE thing: does it cohere with, and not overstate, the typed
  determination it introduces? Do not grade it for depth or analysis.

- [kind=generated] and [kind=conditional] — counsel-voice analysis composed by
  the generator. These get the FULL scrutiny: accuracy, citation correctness
  and pinpoint fidelity, attribution of claims to the record, hallucination,
  unsupported business claims, and generic boilerplate. Nearly every legitimate
  finding should land here.

- [kind=rule] — deterministic machine-assembled output (e.g. the Table of
  Authorities). Check CITATION PRESENCE and correctness only: that cited
  authorities exist and match what the body relies on. Do not grade prose
  quality, ordering aesthetics, or phrasing.

When you cite evidence, quote the paragraph text verbatim and name the section
id and the block kind it came from.

CALIBRATION FOR CONVERTED DOCUMENTS (CEO-approved 2026-08-12; skeleton mode only):
- A ratified per-row template that repeats across the rows of a typed register
  is legal drafting, not boilerplate. Do not raise generic-boilerplate findings
  on repetition of a ratified template alone.
- Where the document reproduces the controller's own recorded selection (for
  example its legal basis) faithfully and carries the non-substitution caveat,
  that is fidelity to the record, not a misapplied citation.
- A reconciliation or count that carries its own provenance disclosure, and an
  analytic conclusion expressly attributed to this assessment's own pre-set
  taxonomy, are disclosed outputs of the assessment — they are not unsupported
  claims about the business requiring intake support.`;

/**
 * Build the grader payload from report.skeleton_document ALONE.
 *
 * No legacy report_data fields are merged in; no key is curated out. Every
 * paragraph is emitted in document order with its section id/title and its
 * block kind, because the grader's block-kind rules depend on those tags.
 */
export function buildSkeletonGraderPayload(
  report: unknown,
  budget: number = SKELETON_GRADER_BUDGET,
  opts: { fixtureSet?: string | null } = {},
): BuiltSkeletonPayload {
  const rd = (report && typeof report === "object") ? (report as Record<string, unknown>) : {};
  const doc = (rd.skeleton_document ?? {}) as SkeletonDocumentLike;
  const sections = Array.isArray(doc.sections) ? doc.sections : [];

  const parts: string[] = [];
  if (opts.fixtureSet && typeof opts.fixtureSet === "string") {
    parts.push(`GOLDEN_FIXTURE_SET: ${opts.fixtureSet}`);
  }
  parts.push("GRADER_PATH: skeleton_document (whole document, all block kinds)");

  const head: string[] = [];
  if (doc.title) head.push(`TITLE: ${doc.title}`);
  if (doc.subtitle) head.push(`SUBTITLE: ${doc.subtitle}`);
  if (doc.spine_version) head.push(`SPINE_VERSION: ${doc.spine_version}`);
  if (head.length) parts.push(head.join("\n"));

  let paragraphCount = 0;
  const body: string[] = [];
  for (const section of sections) {
    const paragraphs = Array.isArray(section?.paragraphs) ? section.paragraphs : [];
    const lines: string[] = [
      `=== SECTION ${section?.id ?? "(no id)"} — ${section?.title ?? "(untitled)"} ===`,
    ];
    for (const p of paragraphs) {
      paragraphCount += 1;
      lines.push(`[kind=${p?.kind ?? "unknown"}] ${typeof p?.text === "string" ? p.text : String(p?.text ?? "")}`);
    }
    body.push(lines.join("\n"));
  }
  parts.push(`--- SKELETON DOCUMENT ---\n${body.join("\n\n")}`);

  const assembled = parts.join("\n\n");
  const original_length = assembled.length;
  if (original_length <= budget) {
    return {
      text: assembled,
      truncated: false,
      original_length,
      section_count: sections.length,
      paragraph_count: paragraphCount,
    };
  }
  return {
    text: assembled.slice(0, budget) + "\n[...truncated for skeleton grader budget...]",
    truncated: true,
    original_length,
    section_count: sections.length,
    paragraph_count: paragraphCount,
  };
}
