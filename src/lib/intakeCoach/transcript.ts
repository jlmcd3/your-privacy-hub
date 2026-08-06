// ITEM 398 — CEO RULING D6 ▣4: COACH TRANSCRIPT STORAGE.
//
// Records what the coach actually told the customer, and whether the customer
// went back and edited a flagged field before purchase (spec §7 acceptance
// rate).
//
// HARD RULES (ruled 2026-08-06):
//   • FAIL-OPEN. Every call is fire-and-forget with a catch. A write failure
//     never blocks, delays, or alters the customer flow.
//   • ZERO MODEL CALLS. Layer 1 stays database-only; this module only writes
//     rows already computed in the browser by buildCoach.
//   • NO NEW PII. The cards jsonb carries the coach's own text, field keys and
//     the current-answer excerpt exactly as buildCoach already truncated it.

import { supabase } from "@/integrations/supabase/client";
import type { CoachResult } from "./buildCoach";
import type { CoachProduct } from "./thinSpots";

export interface TranscriptRef {
  userId: string;
  product: CoachProduct;
  referenceKind?: string | null;
  referenceId?: string | null;
}

/** The exact card payload persisted — coach text only, no new intake fields. */
export function transcriptCards(result: CoachResult) {
  return result.cards.map((c) => ({
    key: c.key,
    title: c.title,
    reason: c.reason,
    excerpt: c.excerpt,
    consequence: c.consequence,
    advice: c.advice,
  }));
}

/** Writes the transcript + one row per card. Returns null on any failure. */
export async function writeCoachTranscript(
  ref: TranscriptRef,
  result: CoachResult,
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("coach_transcripts")
      .insert({
        user_id: ref.userId,
        product: ref.product,
        reference_kind: ref.referenceKind ?? null,
        reference_id: ref.referenceId ?? null,
        asked: result.stats.asked,
        answered: result.stats.answered,
        to_strengthen: result.stats.toStrengthen,
        already_strong: result.stats.alreadyStrong,
        cards: transcriptCards(result),
      })
      .select("id")
      .single();
    if (error || !data) return null;

    if (result.cards.length) {
      await supabase.from("coach_transcript_cards").insert(
        result.cards.map((c) => ({
          transcript_id: data.id,
          user_id: ref.userId,
          card_key: c.key,
          reason: c.reason,
        })),
      );
    }
    return data.id;
  } catch {
    return null;
  }
}

export async function markTranscriptOutcome(
  transcriptId: string,
  outcome: "skipped" | "continued",
): Promise<void> {
  try {
    await supabase
      .from("coach_transcripts")
      .update(
        outcome === "skipped"
          ? { skipped_at: new Date().toISOString() }
          : { continued_at: new Date().toISOString() },
      )
      .eq("id", transcriptId);
  } catch {
    /* fail-open */
  }
}

export async function markCardEdited(
  transcriptId: string,
  cardKey: string,
): Promise<void> {
  try {
    await supabase
      .from("coach_transcript_cards")
      .update({ field_edited_after: true, edited_at: new Date().toISOString() })
      .eq("transcript_id", transcriptId)
      .eq("card_key", cardKey);
  } catch {
    /* fail-open */
  }
}
