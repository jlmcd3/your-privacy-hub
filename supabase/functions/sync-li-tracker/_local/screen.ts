// Deterministic ingestion-time screen: is this newly ingested enforcement
// action a legitimate-interest action? Confirmation only — nothing here writes
// an authority profile; confirmed rows are handed to the classify pipeline.

export const SCREEN_VERSION = "li-ingest-screen@2026-09-08";

/** Minimum body text before a confirmation can be trusted. */
export const MIN_TEXT_CHARS = 1000;

const LI_PHRASES: readonly string[] = [
  "legitimate interest",
  "legitimate interests",
  "article 6(1)(f)",
  "art. 6(1)(f)",
  "art 6(1)(f)",
  "6(1)(f)",
  "balancing test",
  "berechtigtes interesse",
  "berechtigten interessen",
  "intérêt légitime",
  "intérêts légitimes",
  "interés legítimo",
  "intereses legítimos",
  "interesse legittimo",
  "legitiem belang",
  "gerechtvaardigd belang",
];

/** Same instrument law as the corpus triage handoff predicate. */
export function isGdprFamilyInstrument(instrument: string | null | undefined): boolean {
  const norm = (instrument ?? "").trim().toLowerCase();
  if (!norm) return false;
  if (/\bdirective\s*95\/46\b/.test(norm)) return true;
  if (/\bgdpr\b/.test(norm)) return true;
  if (/\b2016\/679\b/.test(norm)) return true;
  return false;
}

export interface ScreenInput {
  id: string;
  law: string | null;
  violation: string | null;
  subject: string | null;
  source_document_text: string | null;
}

export interface ScreenOutcome {
  enforcement_action_id: string;
  confirmed: boolean;
  reason: string;
  signal_hits: string[];
  instrument: string | null;
}

export function screenAction(row: ScreenInput): ScreenOutcome {
  const instrument = (row.law ?? "").trim() || null;
  const text = (row.source_document_text ?? "").trim();
  const haystack = `${text}\n${row.violation ?? ""}`.toLowerCase();
  const hits = LI_PHRASES.filter((p) => haystack.includes(p));

  const base = { enforcement_action_id: row.id, signal_hits: hits, instrument };

  if (!isGdprFamilyInstrument(instrument)) {
    return { ...base, confirmed: false, reason: "not_gdpr_family_instrument" };
  }
  if (text.length < MIN_TEXT_CHARS) {
    return { ...base, confirmed: false, reason: "insufficient_source_text" };
  }
  if (hits.length === 0) {
    return { ...base, confirmed: false, reason: "no_li_signal" };
  }
  return { ...base, confirmed: true, reason: "li_signal_in_primary_text" };
}
