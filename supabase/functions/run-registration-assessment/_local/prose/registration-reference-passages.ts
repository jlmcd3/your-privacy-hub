// ─────────────────────────────────────────────────────────────────────────────
// ITEM 413 — REGISTRATION REFERENCE-PASSAGE DISCIPLINE.
//
// Same hard rule as ITEM 409 (biometric): every statutory passage this product
// renders verbatim MUST byte-match the corpus row its citation names, and the
// citation must name the row the bytes actually come from.
//
// This module COPIES NOTHING. The bytes live in exactly one place inside the
// codebase — `run-registration-assessment/_local/registry/
// registration-verified-authorities.ts`, whose rows carry `corpus_key` — and
// this module is the ASSERTION layer over them. The generic checkers are
// reused from the item409 module rather than re-implemented, because a second
// copy of a byte-comparison routine is exactly the ITEM 388 failure shape.
//
// Nothing here ever edits a corpus row, and nothing here ever "normalises" a
// passage into agreement: that would hide the drift this file exists to find.
// ─────────────────────────────────────────────────────────────────────────────

import {
  assertNoDrift,
  checkPassageShape,
  checkPassagesAgainstCorpus,
  checkPassagesSurviveAssembly,
  formatDrift,
  type PassageDrift,
  type PassageDriftReason,
  type ReferencePassage,
} from "./biometric-reference-passages.ts";

export const REGISTRATION_REFERENCE_PASSAGE_VERSION =
  "registration-reference-passages-2026-08-08-item413";

export type {
  PassageDrift,
  PassageDriftReason,
  ReferencePassage,
};

export {
  assertNoDrift,
  checkPassageShape,
  checkPassagesAgainstCorpus,
  checkPassagesSurviveAssembly,
  formatDrift,
};

/**
 * The registration duty-row shape. Structural, not nominal, so this module
 * does not import the function-local registry (which would drag the whole
 * `run-registration-assessment/_local` tree into every shared consumer).
 *
 * NOTE the field-name difference from the biometric registry: registration
 * rows key on `key` and carry no separate `pinpoint` — the citation IS the
 * pinpoint, because every registration row is already section-level.
 */
export interface RegistrationDutyRowLike {
  readonly key: string;
  readonly jurisdiction: string;
  readonly citation: string;
  readonly verbatim_quote: string;
  readonly corpus_key: string;
}

/** Adapt registration duty rows into the generic passage shape. */
export function toRegistrationReferencePassages(
  rows: readonly RegistrationDutyRowLike[],
): readonly ReferencePassage[] {
  return rows.map((r) => ({
    id: r.key,
    corpus_key: r.corpus_key,
    citation: r.citation,
    // The citation is the pinpoint for this product; stated explicitly rather
    // than left empty, so `checkPassageShape` is a real check and not a
    // vacuous one.
    pinpoint: r.citation,
    bytes: r.verbatim_quote,
  }));
}

/**
 * Corpus keys this product's rows cite that DO NOT live in `provision_texts`.
 * The GDPR/UK-GDPR articles are held in `gdpr_articles`, so a corpus audit must
 * resolve them from that table. Naming them here keeps the audit honest: a row
 * whose key is absent from BOTH tables is drift, not a known second home.
 */
export const REGISTRATION_GDPR_ARTICLE_KEY_RE = /^gdpr-articles:(eu|uk):(\d+)$/;

export function isGdprArticleCorpusKey(key: string): boolean {
  return REGISTRATION_GDPR_ARTICLE_KEY_RE.test(key);
}
