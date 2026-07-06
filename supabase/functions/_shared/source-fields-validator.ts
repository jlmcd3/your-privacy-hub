// source-fields-validator.ts — Doc O Step 3c-2(ii).
//
// Deterministic, NON-FATAL post-generation pass. Doc F posture: wrap
// call site in try/catch, never block on failure. Drops any
// source_fields[] value that is not a real intake_data key. Log counts
// so the July 13 corpus review can see the invented-id rate.
//
// Scope (per Doc O):
//   - inconsistency_flags[].source_fields (also intake_field_1/2 checked for logging only, not stripped: those are text-shaped historical keys)
//   - information_needed[].source_fields
//   - strengthen_items[].field_ids
//
// An entry left with zero valid source_fields keeps functioning (never
// removed) but is excluded from re-run highlighting downstream (the
// stripped-count log line is the signal).

export interface SourceFieldsValidationResult {
  droppedTotal: number;
  droppedByLocation: Record<string, number>;
  entriesLeftEmpty: number;
  invalidIdSamples: string[]; // first 10 invented ids seen, for the review
}

function filterToCanonical(
  arr: unknown,
  canonical: Set<string>,
  dropped: string[],
): { kept: string[]; droppedCount: number } {
  if (!Array.isArray(arr)) return { kept: [], droppedCount: 0 };
  const kept: string[] = [];
  let droppedCount = 0;
  for (const raw of arr) {
    if (typeof raw !== "string") { droppedCount++; continue; }
    if (canonical.has(raw)) {
      kept.push(raw);
    } else {
      droppedCount++;
      if (dropped.length < 10) dropped.push(raw);
    }
  }
  return { kept, droppedCount };
}

export function validateSourceFields(
  report: any,
  intake: Record<string, unknown> | null | undefined,
): SourceFieldsValidationResult {
  const canonical = new Set(
    Object.keys(intake ?? {}).filter((k) => k !== "assertions"),
  );
  const droppedByLocation: Record<string, number> = {};
  const invalidIdSamples: string[] = [];
  let entriesLeftEmpty = 0;
  let droppedTotal = 0;

  const walk = (
    listName: string,
    key: "source_fields" | "field_ids",
    entries: any[] | undefined,
  ) => {
    if (!Array.isArray(entries)) return;
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e || typeof e !== "object") continue;
      const original = e[key];
      if (original === undefined) continue; // key is optional
      const { kept, droppedCount } = filterToCanonical(
        original,
        canonical,
        invalidIdSamples,
      );
      if (droppedCount > 0) {
        droppedByLocation[`${listName}.${key}`] =
          (droppedByLocation[`${listName}.${key}`] ?? 0) + droppedCount;
        droppedTotal += droppedCount;
      }
      e[key] = kept;
      if (kept.length === 0 && Array.isArray(original) && original.length > 0) {
        entriesLeftEmpty++;
      }
    }
  };

  walk("inconsistency_flags", "source_fields", report?.inconsistency_flags);
  walk("information_needed", "source_fields", report?.information_needed);
  walk("strengthen_items", "field_ids", report?.strengthen_items);

  if (droppedTotal > 0) {
    console.log(
      JSON.stringify({
        evt: "source_fields_dropped",
        droppedTotal,
        droppedByLocation,
        entriesLeftEmpty,
        invalidIdSamples,
      }),
    );
  }

  return {
    droppedTotal,
    droppedByLocation,
    entriesLeftEmpty,
    invalidIdSamples,
  };
}
