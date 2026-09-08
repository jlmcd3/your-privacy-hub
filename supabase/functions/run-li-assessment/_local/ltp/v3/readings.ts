// DOC 217 §5.2 — V3 READINGS. The engine-side shape of one `intake_readings`
// row (doc 217 §3.4: the customer's disposition of one proposition reading
// of one free-text answer — the Art. 5(2) record), and the two pure
// functions every consumer shares: `filterConfirmed` (the ONLY readings that
// may emit a `prop:` atom — Law L3, "no verdict-bearing proposition fires on
// an unconfirmed reading") and `propsFromReadings` (the emission itself,
// with the doc 217 §5.7 assertions).
//
// Pure: no I/O, no Date, no model, no import beyond this file. The loader
// (load-readings.ts) coerces DB rows into this shape; rule-states.ts turns
// confirmed rows into `states.props`; lia-skeleton-assemble.ts prints every
// row (confirmed / unconfirmed / stood) in the Schedule of Readings.
//
// NAMING NOTE: doc 217 names the row type `ConfirmedReading`. The type
// carries EVERY disposition — `disposition` says whether this particular
// row is the confirmed kind; `filterConfirmed` is the narrowing. The name
// is kept as the spec wrote it so the call sites read against the spec.

export type ReadingDisposition = "confirmed" | "corrected" | "stood" | "unconfirmed";

export const READING_DISPOSITIONS: readonly ReadingDisposition[] = [
  "confirmed",
  "corrected",
  "stood",
  "unconfirmed",
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
  /** The inventory's short lawyer label (`proposition_inventory.label`),
   *  travelling on the reading so the Schedule can print it without a
   *  second lookup; "" when the loader could not resolve it (the Schedule
   *  then prints the `prop_id` — an id, never invented prose). */
  readonly prop_label: string;
  /** Verbatim byte-substring of the answer (Law L8). */
  readonly evidence_span: string;
  readonly disposition: ReadingDisposition;
  /** sha256 of the answer the reading was taken from. */
  readonly answer_hash: string;
  /** The question as displayed when the answer was given (212F matter 1). */
  readonly question_text?: string;
  /** The content-addressed classification the reading came from (§3.2). */
  readonly decision_id?: string;
}

/** The readings that may emit an atom: `disposition === "confirmed"` only. */
export function filterConfirmed(rows: readonly ConfirmedReading[]): ConfirmedReading[] {
  return rows.filter((r) => r.disposition === "confirmed");
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
  /** `undefined` when no confirmed reading survived — the state bag then
   *  carries NO `props` key at all, so a record without V3 readings builds
   *  a bag deep-equal to the one it built before doc 217. */
  readonly props: Record<string, "asserted"> | undefined;
  /** doc 217 §5.7 — fail-visible, never blocking: each entry names the
   *  check and the reading that failed it; the reading emits nothing. */
  readonly assertion_failures: readonly string[];
}

/**
 * The emission (doc 217 §5.2): `props[prop_id] = "asserted"` for every
 * reading whose `disposition` is `confirmed` — and for nothing else.
 *
 * Assertions (§5.7), fail-visible and never blocking:
 *   - `confirmed_reading_without_span`: a confirmed reading with no evidence
 *     span cannot emit (L8 — an atom with no verbatim record behind it);
 *   - `prop_without_confirmed_reading`: every emitted prop is re-checked
 *     against the readings it came from (the invariant Law L3 states; by
 *     construction it cannot fail here, and the check exists so a future
 *     writer of `props` other than this function trips it, not the CEO).
 */
export function propsFromReadings(readings: readonly ConfirmedReading[]): PropsFromReadings {
  const failures: string[] = [];
  const props: Record<string, "asserted"> = {};
  for (const r of filterConfirmed(readings)) {
    if (!r.prop_id) {
      failures.push(`confirmed_reading_without_prop_id:${r.field_id}`);
      continue;
    }
    if (!r.evidence_span || r.evidence_span.trim().length === 0) {
      failures.push(`confirmed_reading_without_span:${r.prop_id}`);
      continue;
    }
    props[r.prop_id] = "asserted";
  }
  for (const propId of Object.keys(props)) {
    const backed = readings.some((r) => r.disposition === "confirmed" && r.prop_id === propId && !!r.evidence_span);
    if (!backed) {
      failures.push(`prop_without_confirmed_reading:${propId}`);
      delete props[propId];
    }
  }
  return {
    props: Object.keys(props).length > 0 ? props : undefined,
    assertion_failures: failures,
  };
}
