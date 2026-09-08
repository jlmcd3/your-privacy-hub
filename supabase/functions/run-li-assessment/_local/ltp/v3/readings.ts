// DOC 217 §5.2 (as amended by DOC 224, 2026-09-08) — V3 READINGS. The
// engine-side shape of one `intake_readings` row: the two-leg classifier's
// reading of one proposition in one free-text answer, and the two pure
// functions every consumer shares: `filterAgreed` (the ONLY readings that
// may emit a `prop:` atom) and `propsFromReadings` (the emission itself,
// with the doc 217 §5.7 assertions).
//
// THE CONSTRUCT (CEO, 2026-09-08 — ledger 210 A10-6): readings are NEVER
// shown to a customer. There is no confirm/correct step and no Schedule of
// Readings. A reading is `agreed` when both legs asserted it with a verified
// span; `disagreed` when the legs split; `unsettled_final` when a disagreed
// reading's answer was not revised on the next generation (doc 224A §3.4,
// "we let it go"); `superseded` when the answer changed. Law L3 restated:
// no verdict-bearing effect ever fires on a reading — `prop:` atoms feed
// `require_condition` / `flag_risk` rules only (the F11 family), never a cap
// or an override.
//
// Pure: no I/O, no Date, no model, no import beyond this file. The loader
// (load-readings.ts) coerces DB rows into this shape; rule-states.ts turns
// agreed rows into `states.props`; the record block counts every row.

export type ReadingDisposition = "agreed" | "disagreed" | "unsettled_final" | "superseded";

export const READING_DISPOSITIONS: readonly ReadingDisposition[] = [
  "agreed",
  "disagreed",
  "unsettled_final",
  "superseded",
];

export function isReadingDisposition(v: unknown): v is ReadingDisposition {
  return typeof v === "string" && (READING_DISPOSITIONS as readonly string[]).includes(v);
}

export interface ConfirmedReading {
  readonly assessment_id: string;
  /** doc 217 §1 field id (e.g. `necessity_details.why_consent_not_used`). */
  readonly field_id: string;
  /** `proposition_inventory.prop_id` (e.g. `lia/consent.bundled_in_terms`). */
  readonly prop_id: string;
  /** The inventory's short lawyer label (`proposition_inventory.label`);
   *  "" when the loader could not resolve it. Internal only — never printed. */
  readonly prop_label: string;
  /** Verbatim byte-substring of the answer (Law L8). */
  readonly evidence_span: string;
  readonly disposition: ReadingDisposition;
  /** sha256 of the canonical answer the reading was taken from. */
  readonly answer_hash: string;
  /** The question as displayed when the answer was given (212F matter 1). */
  readonly question_text?: string;
  /** The content-addressed classification the reading came from (§3.2). */
  readonly decision_id?: string;
}

/** The readings that may emit an atom: `disposition === "agreed"` only. */
export function filterAgreed(rows: readonly ConfirmedReading[]): ConfirmedReading[] {
  return rows.filter((r) => r.disposition === "agreed");
}

type Bag = Record<string, unknown>;
const bag = (v: unknown): Bag => (v && typeof v === "object" && !Array.isArray(v) ? v as Bag : {});
const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

/**
 * Total coercion of raw `intake_readings` rows (any shape, any source) into
 * `ConfirmedReading[]`. A row with no `prop_id`, no `field_id`, no
 * `assessment_id` or an unrecognised `disposition` is dropped — never
 * guessed. `labels` (prop_id -> label) fills `prop_label` when the row
 * itself carries none; a row's own `prop_label` (or an embedded
 * `proposition_inventory.label`) wins over the map.
 */
export function parseIntakeReadingRows(
  rows: unknown,
  labels?: ReadonlyMap<string, string>,
): ConfirmedReading[] {
  if (!Array.isArray(rows)) return [];
  const out: ConfirmedReading[] = [];
  for (const raw of rows) {
    const r = bag(raw);
    const assessment_id = str(r.assessment_id);
    const field_id = str(r.field_id);
    const prop_id = str(r.prop_id);
    const disposition = r.disposition;
    if (!assessment_id || !field_id || !prop_id || !isReadingDisposition(disposition)) continue;
    const embeddedLabel = str(bag(r.proposition_inventory).label);
    const prop_label = str(r.prop_label) || embeddedLabel || labels?.get(prop_id) || "";
    out.push({
      assessment_id,
      field_id,
      prop_id,
      prop_label,
      evidence_span: str(r.evidence_span),
      disposition,
      answer_hash: str(r.answer_hash),
      ...(str(r.question_text) ? { question_text: str(r.question_text) } : {}),
      ...(str(r.decision_id) ? { decision_id: str(r.decision_id) } : {}),
    });
  }
  return out;
}

export interface PropsFromReadings {
  /** `undefined` when no agreed reading survived — the state bag then
   *  carries NO `props` key at all, so a record without V3 readings builds
   *  a bag deep-equal to the one it built before doc 217. */
  readonly props: Record<string, "asserted"> | undefined;
  /** doc 217 §5.7 — fail-visible, never blocking: each entry names the
   *  check and the reading that failed it; the reading emits nothing. */
  readonly assertion_failures: readonly string[];
}

/**
 * The emission (doc 217 §5.2): `props[prop_id] = "asserted"` for every
 * reading whose `disposition` is `agreed` — and for nothing else.
 *
 * Assertions (§5.7), fail-visible and never blocking:
 *   - `agreed_reading_without_span`: an agreed reading with no evidence
 *     span cannot emit (L8 — an atom with no verbatim record behind it);
 *   - `prop_without_agreed_reading`: every emitted prop is re-checked
 *     against the readings it came from (by construction it cannot fail
 *     here; the check exists so a future writer of `props` other than this
 *     function trips it, not the CEO).
 */
export function propsFromReadings(readings: readonly ConfirmedReading[]): PropsFromReadings {
  const failures: string[] = [];
  const props: Record<string, "asserted"> = {};
  for (const r of filterAgreed(readings)) {
    if (!r.prop_id) {
      failures.push(`agreed_reading_without_prop_id:${r.field_id}`);
      continue;
    }
    if (!r.evidence_span || r.evidence_span.trim().length === 0) {
      failures.push(`agreed_reading_without_span:${r.prop_id}`);
      continue;
    }
    props[r.prop_id] = "asserted";
  }
  for (const propId of Object.keys(props)) {
    const backed = readings.some((r) => r.disposition === "agreed" && r.prop_id === propId && !!r.evidence_span);
    if (!backed) {
      failures.push(`prop_without_agreed_reading:${propId}`);
      delete props[propId];
    }
  }
  return {
    props: Object.keys(props).length > 0 ? props : undefined,
    assertion_failures: failures,
  };
}
