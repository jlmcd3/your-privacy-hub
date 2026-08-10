// BRIEF-2 intake gate — shared subject sanitation for enforcement_actions.
//
// A subset of upstream extractors write a sentence fragment or a truncated
// slice of the decision narrative into `subject` instead of the named party.
// Rendered anywhere (weekly brief, archive, memos) those read as titles with
// the opening words missing.
//
// This module is the single definition of "is this string a party name?" plus
// a deterministic recovery from narrative text. It is used at INTAKE (so the
// defect never enters the corpus again) and by the backfill pass (so the
// residual is repaired with the same rule).
//
// Degradation law: never invent a name. When nothing usable is available the
// gate returns null with a reason so the row stays measurable.

/** Corporate/abbreviation suffix at the end of a name, e.g. "S.A.U.", "Inc." */
const ABBREV_TAIL = /(?:^|\s)[\p{Lu}&][\p{Lu}\p{Ll}&./]{0,8}\.$/u;

const NARRATIVE_WORDS =
  /\b(failed|fails|did not|does not|had not|has not|was not|were not|considered|pursuant|thereby|because|which|whereas|alleging|alleged that|in breach of|violated|infringed)\b/i;

// Narrative summaries usually open with the ENFORCER ("The Spanish DPA fined
// X…"). Those openers must never be captured as the respondent.
const ENFORCER_OPENER =
  /\b(DPA|DPC|ICO|CNIL|AEPD|Garante|Datatilsynet|UODO|NAIH|ANSPDCP|FTC|data protection (authority|authorities|commissioner|commission|agency|board)|supervisory authority|privacy commissioner|regulator|attorney general|court|tribunal|ministry)\b/i;

const GENERIC_PARTY =
  /^(the\s+)?(bank|company|organi[sz]ation|court|firm|controller|processor|defendant|respondent|authority|entity|business|employer|hospital|municipality|operator|subject|complainant)$/i;

const PLACEHOLDERS = new Set<string>([
  "company", "controller", "processor", "respondent", "defendant", "entity",
  "organization", "organisation", "data controller", "data processor",
  "the company", "the controller", "the respondent", "unknown", "redacted",
  "anonymous", "n/a", "na", "unspecified", "tbd", "tba", "placeholder",
]);

export type SubjectRejection =
  | "empty"
  | "placeholder"
  | "starts_mid_sentence"
  | "too_long"
  | "narrative"
  | "unterminated_clause"
  | "generic_party";

/**
 * True when `v` reads as a party name rather than a narrative fragment.
 * Deliberately conservative: false positives here silently degrade titles.
 */
export function looksLikeEntityName(v: string | null | undefined): boolean {
  return classifySubject(v) === null;
}

/** Returns the rejection reason, or null when the value is a usable name. */
export function classifySubject(v: string | null | undefined): SubjectRejection | null {
  const s = (v ?? "").trim();
  if (s.length < 3) return "empty";
  if (PLACEHOLDERS.has(s.toLowerCase())) return "placeholder";
  if (GENERIC_PARTY.test(s)) return "generic_party";
  if (/^[\p{Ll}]/u.test(s)) return "starts_mid_sentence";
  if (s.split(/\s+/).length > 9) return "too_long";
  if (s.length > 90) return "too_long";
  if (NARRATIVE_WORDS.test(s)) return "narrative";
  // A trailing full stop is fine only when it terminates an abbreviation
  // ("Vodafone España, S.A.U."), not a sentence.
  if (/\.\s*$/.test(s) && !ABBREV_TAIL.test(s)) return "unterminated_clause";
  return null;
}

/**
 * Deterministic recovery: the leading proper-noun phrase of a narrative
 * ("KFC Restaurants Spain, S.L.U. failed to …" → "KFC Restaurants Spain, S.L.U.").
 * Returns null when the opener carries no identifying value.
 */
export function entityFromNarrative(text: string | null | undefined): string | null {
  const t = (text ?? "").trim();
  if (!t) return null;
  const m = t.match(
    /^([\p{Lu}][\p{L}\p{N}&.,'’\-\s]{2,80}?)\s+(?:failed|fails|did not|was|were|has|had|must|unlawfully|processed|collected|agreed|settled|received|breached|violated)\b/u,
  );
  const name = m?.[1]?.trim().replace(/[,\s]+$/, "");
  if (!name) return null;
  if (ENFORCER_OPENER.test(name)) return null;
  return looksLikeEntityName(name) ? name : null;
}

export interface GateResult {
  subject: string | null;
  /** true when the value came through unchanged */
  ok: boolean;
  /** set when the candidate was rejected */
  reason: SubjectRejection | null;
  /** how the returned subject was obtained */
  origin: "candidate" | "narrative_recovery" | "none";
}

/**
 * INTAKE GATE. Accepts the extractor's candidate; if it is not a party name,
 * attempts a deterministic recovery from the supplied narrative text. Never
 * returns a fragment.
 */
export function gateSubject(
  candidate: string | null | undefined,
  narrative?: string | null,
): GateResult {
  const cleaned = (candidate ?? "").trim().replace(/\s+/g, " ");
  const reason = classifySubject(cleaned);
  if (reason === null) return { subject: cleaned, ok: true, reason: null, origin: "candidate" };
  const recovered = entityFromNarrative(narrative) ?? entityFromNarrative(cleaned);
  if (recovered) return { subject: recovered, ok: false, reason, origin: "narrative_recovery" };
  return { subject: null, ok: false, reason: reason ?? "empty", origin: "none" };
}
