// ITEM 381 — INTAKE COMPLETENESS COACH, LAYER 1: the review-step builder.
//
// DATABASE-ONLY: pure functions over the customer's own intake record and the
// intake contract. Zero model calls, zero network calls.
//
// The asked/empty numbers come from src/lib/intakeCoach/askedKeys.ts, which
// mirrors the item380r5 gate (supabase/functions/_shared/ltp/record-complete.ts)
// field for field. Cards are drawn from the archive-mined thin-spot configs in
// src/lib/intakeCoach/thinSpots.ts.

import {
  askedKeys,
  coachEmptyAskedKeys,
  fieldWasAsked,
  isEmptyValue,
  readPath,
  type CoachContract,
} from "./askedKeys";
import { THIN_SPOTS, type CoachProduct, type ThinSpot } from "./thinSpots";

export const COACH_MAX_CARDS = 6;

/** Fixed copy. Scanned by the register battery in src/test/intakeCoach.register.test.ts. */
export const COACH_COPY = {
  heading: "Strengthen your answers",
  intro:
    "A short review of what your assessment will say with the answers you have given. Nothing here blocks you — you can continue now.",
  statAnswered: "questions answered",
  statStrengthen: "answers to strengthen",
  statStrong: "already strong",
  cardsHeading: "Worth a second look",
  strongHeading: "Already strong",
  strongIntro: "These answers carry enough detail for the assessment to work from.",
  consequenceLabel: "As written, your assessment will record…",
  detailsLabel: "The boxes to look at first",

  adviceLabel: "Strengthen your answer by…",
  jumpLabel: "Jump to this question",
  continueLabel: "Continue",
  footer:
    "This review is advisory. Your assessment runs with the answers as they stand.",
  noCards:
    "Nothing stands out for a second look. Your answers carry enough detail for the assessment to work from.",
} as const;

/**
 * The unanswered consequence. TRUE by construction: this is exactly what the
 * item380r5 gate does — an asked question left empty makes the record-complete
 * predicate false, so the affirmative sentence never renders, and where the
 * document needs the answer it prints an open item and opens with the draft
 * warning.
 *
 * Source: supabase/functions/_shared/ltp/record-complete.ts
 *   emptyAskedKeys / affirmativeParagraph / decideBanner / DRAFT_BANNER_HTML.
 */
export const UNANSWERED_CONSEQUENCE =
  "As written, this question is unanswered, so your assessment will not state that every question the intake asks has been answered. Where the document needs this answer, it prints an open item in its place and opens with the draft warning.";

export type CardReason = "unanswered" | "thin";

export interface CoachCard {
  key: string;
  title: string;
  reason: CardReason;
  /** Trimmed excerpt of the current answer (empty for unanswered). */
  excerpt: string;
  consequence: string;
  consequenceSource: string;
  advice: string;
  jumpSelector: string;
  /**
   * ITEM 381 r2 — for a consolidated block card (A4 benefits), the boxes
   * inside the block that are empty or short. Empty for every other card.
   */
  details?: string[];
}


export interface CoachResult {
  product: CoachProduct;
  stats: { asked: number; answered: number; toStrengthen: number; alreadyStrong: number };
  cards: CoachCard[];
  /** Titles of the configured fields that are answered and not flagged. */
  alreadyStrong: string[];
  /** Every flag found, before the fatigue cap. */
  flagged: number;
}

// ── text extraction ─────────────────────────────────────────────────────

/** Flatten every scalar reachable under a key into one comparison string. */
export function flattenText(intake: unknown, key: string): string {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (v === null || v === undefined) return;
    if (typeof v === "string") { out.push(v); return; }
    if (typeof v === "number" || typeof v === "boolean") { out.push(String(v)); return; }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (typeof v === "object") { Object.values(v as object).forEach(walk); }
  };
  for (const v of readPath(intake, key)) walk(v);
  return out.join(" ").replace(/\s+/g, " ").trim();
}

function keysOf(spot: ThinSpot): string[] {
  return [spot.key, ...(spot.companions ?? [])];
}

/** Combined text of the card's key and its companions. */
export function spotText(intake: unknown, spot: ThinSpot): string {
  return keysOf(spot).map((k) => flattenText(intake, k)).filter(Boolean).join(" ").trim();
}

/**
 * Deterministic thin detection. CONSERVATIVE: an answer is thin only when the
 * documented heuristic fires; anything else counts as strong.
 */
export function isThin(text: string, spot: ThinSpot): boolean {
  const t = text.trim();
  if (!t) return false; // empty is handled by the unanswered path
  if (spot.minLength !== undefined && t.length < spot.minLength) return true;
  if (spot.marker && !spot.marker.test(t)) return true;
  return false;
}

function excerptOf(text: string): string {
  const t = text.trim();
  return t.length <= 180 ? t : `${t.slice(0, 177)}…`;
}

/**
 * ITEM 381 r2 — for a consolidated block card, the labels of the boxes inside
 * the block that are empty or shorter than the block's sub-field threshold.
 * Undefined for every spot that declares no sub-fields.
 */
export function weakSubFields(intake: unknown, spot: ThinSpot): string[] | undefined {
  if (!spot.subFields?.length) return undefined;
  const min = spot.subFieldMinLength ?? 20;
  const out = spot.subFields
    .filter((f) => flattenText(intake, f.key).trim().length < min)
    .map((f) => f.label);
  return out.length ? out : undefined;
}


// ── the builder ─────────────────────────────────────────────────────────

export function buildCoach(
  product: CoachProduct,
  contract: CoachContract,
  intake: unknown,
): CoachResult {
  const asked = askedKeys(contract, intake);
  const empty = new Set(coachEmptyAskedKeys(contract, intake));
  const spots = THIN_SPOTS[product];

  const unanswered: CoachCard[] = [];
  const thin: CoachCard[] = [];
  const strong: string[] = [];

  for (const spot of [...spots].sort((a, b) => a.rank - b.rank)) {
    const text = spotText(intake, spot);
    const isEmpty = !text || keysOf(spot).every((k) => {
      const vals = readPath(intake, k);
      return vals.length === 0 || vals.every(isEmptyValue);
    });

    // An unanswered card only fires when the intake ACTUALLY ASKED the key and
    // the contract does not define blank as an answer.
    const wasAsked = fieldWasAsked(contract, spot.key, intake) && empty.has(spot.key);

    if (isEmpty && wasAsked && !spot.adviceOnlyWhenEmpty) {
      unanswered.push({
        key: spot.key,
        title: spot.title,
        reason: "unanswered",
        excerpt: "",
        consequence: UNANSWERED_CONSEQUENCE,
        consequenceSource:
          "supabase/functions/_shared/ltp/record-complete.ts (emptyAskedKeys, affirmativeParagraph, decideBanner)",
        advice: spot.advice,
        jumpSelector: spot.jumpSelector,
      });
      continue;
    }

    if (isThin(text, spot) || (isEmpty && spot.adviceOnlyWhenEmpty)) {
      thin.push({
        key: spot.key,
        title: spot.title,
        reason: "thin",
        excerpt: excerptOf(text),
        consequence: spot.consequence,
        consequenceSource: spot.consequenceSource,
        advice: spot.advice,
        jumpSelector: spot.jumpSelector,
        details: weakSubFields(intake, spot),
      });
      continue;
    }


    if (!isEmpty) strong.push(spot.title);
  }

  // Strongest report-impact first: unanswered before thin, then by rank
  // (both lists are already rank-ordered). Fatigue cap at six.
  const flagged = unanswered.length + thin.length;
  const cards = [...unanswered, ...thin].slice(0, COACH_MAX_CARDS);

  return {
    product,
    stats: {
      asked: asked.length,
      answered: asked.length - empty.size,
      toStrengthen: flagged,
      alreadyStrong: strong.length,
    },
    cards,
    alreadyStrong: strong,
    flagged,
  };
}
