// LEAK-PREV-P2 — schema-driven customer-report serializer.
// Version: rs-w1-2026-07-25
//
// Replaces the C1 blacklist strip with a WHITELIST: only schema-declared
// keys can appear on the customer surface. Unknown/internal keys can never
// ship again by construction.
//
// Semantics:
//   - Deep-clones the input; never mutates the caller's object.
//   - Root keys not in `schema.topLevel` are DROPPED (path recorded).
//   - `_meta` is preserved but reduced to `{ internal }` only; everything
//     else under `_meta` is dropped.
//   - For each key in `schema.entries` whose value is an array, per-entry
//     keys not in the allow-list are dropped (path recorded). Nested arrays
//     inside entries are traversed with the same rule if their key is also
//     a schema entry key list (e.g. adverse_effects[]).
//   - For each key in `schema.objects` whose value is an object, per-object
//     keys not in the allow-list are dropped (path recorded).
//   - `dropped_keys` is capped at 100 path entries; overflow is recorded as
//     a `truncated_at` counter.
//   - FAIL-VISIBLE: on internal error, returns the input unchanged with
//     `_meta.internal.serializer.crashed=true`. Availability is never
//     blocked. Callers keep the C1 blacklist strip as an outer safety net
//     for cases where the serializer itself throws.

export const SERIALIZER_VERSION = "rs-w1-2026-07-25";
const DROPPED_KEYS_CAP = 100;

export interface ReportSchema {
  version: string;
  tool: string;
  topLevel: readonly string[];
  /** For array-of-object fields: allow-list of entry keys. */
  entries?: Record<string, readonly string[]>;
  /** For object fields (non-array): allow-list of nested keys. */
  objects?: Record<string, readonly string[]>;
}

export interface SerializerTelemetry {
  version: string;
  tool: string;
  dropped_keys: string[];
  dropped_count: number;
  truncated_at?: number;
  crashed?: boolean;
  crash_message?: string;
}

function deepClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

function record(dropped: string[], path: string): void {
  if (dropped.length < DROPPED_KEYS_CAP) dropped.push(path);
}

function pruneObject(
  obj: Record<string, unknown>,
  allowed: Set<string>,
  pathPrefix: string,
  dropped: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) {
    if (allowed.has(k)) out[k] = obj[k];
    else record(dropped, pathPrefix ? `${pathPrefix}.${k}` : k);
  }
  return out;
}

function pruneEntry(
  entry: unknown,
  allowed: Set<string>,
  entryEntries: Record<string, readonly string[]> | undefined,
  pathPrefix: string,
  dropped: string[],
): unknown {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
  const src = entry as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(src)) {
    if (!allowed.has(k)) {
      record(dropped, `${pathPrefix}.${k}`);
      continue;
    }
    const v = src[k];
    // Recurse into nested arrays-of-objects whose key is also a schema
    // entry list (e.g. adverse_effects[] on risk activities).
    if (Array.isArray(v) && entryEntries && entryEntries[k]) {
      const nestedAllowed = new Set(entryEntries[k]);
      out[k] = v.map((it, i) =>
        pruneEntry(it, nestedAllowed, entryEntries, `${pathPrefix}.${k}[${i}]`, dropped),
      );
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Serialize a report against a schema. Returns a NEW report containing only
 * schema-declared keys (plus `_meta.internal`). On internal error, returns
 * the input unchanged with a crashed telemetry marker.
 */
export function serializeCustomerReport(
  report: unknown,
  schema: ReportSchema,
): { report: unknown; telemetry: SerializerTelemetry } {
  const telemetry: SerializerTelemetry = {
    version: SERIALIZER_VERSION,
    tool: schema.tool,
    dropped_keys: [],
    dropped_count: 0,
  };
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    return { report, telemetry };
  }
  try {
    const src = deepClone(report as Record<string, unknown>);
    const allowedTop = new Set(schema.topLevel);
    const dropped: string[] = [];

    const out: Record<string, unknown> = {};
    for (const k of Object.keys(src)) {
      if (!allowedTop.has(k)) {
        record(dropped, k);
        continue;
      }
      out[k] = src[k];
    }

    // _meta reduction — keep only .internal
    if (out._meta && typeof out._meta === "object" && !Array.isArray(out._meta)) {
      const meta = out._meta as Record<string, unknown>;
      const kept: Record<string, unknown> = {};
      for (const k of Object.keys(meta)) {
        if (k === "internal") kept.internal = meta.internal;
        else record(dropped, `_meta.${k}`);
      }
      out._meta = kept;
    }

    // Object-typed slots
    if (schema.objects) {
      for (const [key, allowList] of Object.entries(schema.objects)) {
        const v = out[key];
        if (v && typeof v === "object" && !Array.isArray(v)) {
          out[key] = pruneObject(
            v as Record<string, unknown>,
            new Set(allowList),
            key,
            dropped,
          );
        }
      }
    }

    // Array-of-object entry buckets
    if (schema.entries) {
      for (const [key, allowList] of Object.entries(schema.entries)) {
        const v = out[key];
        if (Array.isArray(v)) {
          const allowed = new Set(allowList);
          out[key] = v.map((it, i) =>
            pruneEntry(it, allowed, schema.entries, `${key}[${i}]`, dropped),
          );
        }
      }
    }

    // Persist telemetry under _meta.internal.serializer.
    const meta = (out._meta = (out._meta && typeof out._meta === "object")
      ? out._meta as Record<string, unknown>
      : {});
    const internal = (meta.internal = (meta.internal && typeof meta.internal === "object")
      ? meta.internal as Record<string, unknown>
      : {});
    const totalDropped = dropped.length;
    const truncated = dropped.length >= DROPPED_KEYS_CAP;
    telemetry.dropped_keys = dropped;
    telemetry.dropped_count = totalDropped;
    if (truncated) telemetry.truncated_at = DROPPED_KEYS_CAP;
    internal.serializer = {
      version: SERIALIZER_VERSION,
      tool: schema.tool,
      dropped_keys: dropped,
      dropped_count: totalDropped,
      ...(truncated ? { truncated_at: DROPPED_KEYS_CAP } : {}),
    };

    return { report: out, telemetry };
  } catch (e) {
    telemetry.crashed = true;
    telemetry.crash_message = (e as Error)?.message ?? String(e);
    // FAIL-VISIBLE: return input unchanged, mark telemetry on it if we can.
    try {
      const r = report as Record<string, unknown>;
      const meta = (r._meta = (r._meta && typeof r._meta === "object")
        ? r._meta as Record<string, unknown>
        : {});
      const internal = (meta.internal = (meta.internal && typeof meta.internal === "object")
        ? meta.internal as Record<string, unknown>
        : {});
      internal.serializer = {
        version: SERIALIZER_VERSION,
        tool: schema.tool,
        crashed: true,
        crash_message: telemetry.crash_message,
      };
    } catch { /* ignore */ }
    return { report, telemetry };
  }
}
