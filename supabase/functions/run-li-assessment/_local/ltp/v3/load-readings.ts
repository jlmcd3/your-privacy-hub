// DOC 217 §5.2 — THE GUARDED READINGS FETCH. Loads this assessment's
// `intake_readings` rows (doc 217 §3.4) through the existing service-role
// client, plus the two lookups the Schedule and the record block need (the
// inventory label per prop_id, doc 217 §5.4; the decision's
// `inventory_version`, §5.6). FAILS OPEN: a missing table, a query error,
// a thrown client — every failure path returns `readings: []` with the
// message in `error`, and the caller (index.ts) writes it to
// `_meta.internal.lia_v3.readings_error` and carries on with the V2
// document. The secondary lookups degrade independently (a label that
// cannot be resolved prints as the prop_id; a version that cannot be
// resolved is `null`) and are noted in `warnings`, never fatal.
//
// The client is typed to the three calls this module makes, not to
// supabase-js, so tests drive it with a stub and no network is ever needed
// here. Row order from the store is NOT trusted for anything: the assembler
// sorts readings itself before printing (replay must be byte-identical).

import {
  type ConfirmedReading,
  parseIntakeReadingRows,
  READING_DISPOSITIONS,
  type ReadingDisposition,
} from "./readings.ts";

export interface ReadingsQueryResult {
  readonly data: unknown;
  readonly error: unknown;
}

/** The minimal query shape used: `.from(t).select(cols).in(col, values)`. */
export interface ReadingsClientLike {
  from(table: string): {
    select(columns: string): {
      in(column: string, values: readonly string[]): PromiseLike<ReadingsQueryResult>;
    };
  };
}

export interface LoadedReadings {
  readonly readings: readonly ConfirmedReading[];
  /** Distinct `decision_id`s the rows reference (record block §5.6). */
  readonly decision_ids: readonly string[];
  /** The decisions' `inventory_version` ("|"-joined when several; null when none resolved). */
  readonly inventory_version: string | null;
  readonly counts: Readonly<Record<ReadingDisposition, number>>;
  /** The readings fetch failed (table missing, RLS, network): rows are []. */
  readonly error: string | null;
  /** Secondary-lookup degradations (labels, versions). */
  readonly warnings: readonly string[];
}

const EMPTY_COUNTS: Readonly<Record<ReadingDisposition, number>> = Object.freeze({
  confirmed: 0,
  corrected: 0,
  stood: 0,
  unconfirmed: 0,
});

function errText(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}

export function emptyLoadedReadings(error: string | null): LoadedReadings {
  return { readings: [], decision_ids: [], inventory_version: null, counts: EMPTY_COUNTS, error, warnings: [] };
}

export function countDispositions(readings: readonly ConfirmedReading[]): Readonly<Record<ReadingDisposition, number>> {
  const counts: Record<ReadingDisposition, number> = { ...EMPTY_COUNTS };
  for (const r of readings) counts[r.disposition] += 1;
  for (const d of READING_DISPOSITIONS) counts[d] = counts[d] ?? 0;
  return counts;
}

/**
 * Load every `intake_readings` row whose `assessment_id` is one of
 * `assessmentIds` (the paid row's id, plus the preview row's id when the
 * record still carries it — intake-time readings are keyed on the id the
 * form had). Never throws.
 */
export async function loadIntakeReadings(
  client: ReadingsClientLike,
  assessmentIds: readonly string[],
): Promise<LoadedReadings> {
  const ids = [...new Set(assessmentIds.map((s) => String(s ?? "").trim()).filter(Boolean))];
  if (ids.length === 0) return emptyLoadedReadings("no_assessment_id");

  let rows: unknown[] = [];
  try {
    const res = await client.from("intake_readings").select("*").in("assessment_id", ids);
    if (res.error) return emptyLoadedReadings(`intake_readings: ${errText(res.error)}`);
    rows = Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    return emptyLoadedReadings(`intake_readings: ${errText(e)}`);
  }

  const warnings: string[] = [];
  const parsed = parseIntakeReadingRows(rows);
  if (parsed.length === 0) {
    return { ...emptyLoadedReadings(null), warnings: rows.length ? [`${rows.length} row(s) dropped by parseIntakeReadingRows`] : [] };
  }

  // Labels — proposition_inventory.label per prop_id (degrades to "").
  const labels = new Map<string, string>();
  try {
    const propIds = [...new Set(parsed.map((r) => r.prop_id))];
    const res = await client.from("proposition_inventory").select("prop_id,label").in("prop_id", propIds);
    if (res.error) warnings.push(`proposition_inventory: ${errText(res.error)}`);
    for (const raw of Array.isArray(res.data) ? res.data : []) {
      const row = (raw ?? {}) as Record<string, unknown>;
      if (typeof row.prop_id === "string" && typeof row.label === "string") labels.set(row.prop_id, row.label);
    }
  } catch (e) {
    warnings.push(`proposition_inventory: ${errText(e)}`);
  }

  // Decisions — inventory_version per decision_id (degrades to null).
  const decisionIds = [...new Set(parsed.map((r) => r.decision_id ?? "").filter(Boolean))];
  const versions = new Set<string>();
  if (decisionIds.length > 0) {
    try {
      const res = await client.from("proposition_decisions").select("decision_id,inventory_version").in("decision_id", decisionIds);
      if (res.error) warnings.push(`proposition_decisions: ${errText(res.error)}`);
      for (const raw of Array.isArray(res.data) ? res.data : []) {
        const row = (raw ?? {}) as Record<string, unknown>;
        if (typeof row.inventory_version === "string" && row.inventory_version) versions.add(row.inventory_version);
      }
    } catch (e) {
      warnings.push(`proposition_decisions: ${errText(e)}`);
    }
  }

  const readings = parsed.map((r) => (r.prop_label ? r : { ...r, prop_label: labels.get(r.prop_id) ?? "" }));
  return {
    readings,
    decision_ids: decisionIds,
    inventory_version: versions.size > 0 ? [...versions].sort().join("|") : null,
    counts: countDispositions(readings),
    error: null,
    warnings,
  };
}
