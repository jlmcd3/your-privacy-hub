/**
 * info-needed-normalize — ITEM-204 residual fix (2026-07-27).
 *
 * Schema-conformance shim: every information_needed row must carry a
 * stable `id` and a `topic`. Emitters that omit these get their rows
 * normalized in-place; the shim is idempotent and fail-open.
 */

export const INFO_NEEDED_NORMALIZE_STAMP =
  "info-needed-normalize@2026-07-27-item204";

const DEFAULT_TOPIC = "unspecified";

function slugify(s: string): string {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48);
}

export interface NormalizeResult {
  readonly normalized: number;
  readonly total: number;
  readonly stamp: string;
}

export function normalizeInformationNeeded(report: any): NormalizeResult {
  const stamp = INFO_NEEDED_NORMALIZE_STAMP;
  try {
    if (!report || typeof report !== "object") return { normalized: 0, total: 0, stamp };
    const arr = Array.isArray(report.information_needed) ? report.information_needed : null;
    if (!arr) return { normalized: 0, total: 0, stamp };
    const seenIds = new Set<string>();
    let normalized = 0;
    arr.forEach((raw: any, i: number) => {
      if (!raw || typeof raw !== "object") return;
      const row = raw as Record<string, unknown>;
      let changed = false;
      // topic
      if (typeof row.topic !== "string" || !String(row.topic).trim()) {
        const field = typeof row.field === "string" ? row.field :
          (Array.isArray(row.source_fields) && typeof row.source_fields[0] === "string" ? row.source_fields[0] as string : "");
        row.topic = field ? slugify(field) : DEFAULT_TOPIC;
        changed = true;
      }
      // id
      if (typeof row.id !== "string" || !String(row.id).trim()) {
        const base = `info_${slugify(String(row.topic))}_${i}`;
        let candidate = base; let n = 1;
        while (seenIds.has(candidate)) { candidate = `${base}_${n++}`; }
        row.id = candidate;
        changed = true;
      }
      if (seenIds.has(row.id as string)) {
        let candidate = `${row.id}_${i}`; let n = 1;
        while (seenIds.has(candidate)) { candidate = `${row.id}_${i}_${n++}`; }
        row.id = candidate;
        changed = true;
      }
      seenIds.add(row.id as string);
      if (changed) normalized += 1;
    });
    return { normalized, total: arr.length, stamp };
  } catch {
    return { normalized: 0, total: 0, stamp };
  }
}
