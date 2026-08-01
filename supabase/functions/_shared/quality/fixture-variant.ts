// ITEM 325 — FIXTURE VARIANT (Perfect / Messy).
//
// Shared vocabulary for the `/admin/final-test` console. A "variant" selects
// WHICH pinned fixture set a run is measured against:
//
//   "perfect" — the existing, ratified golden fixtures (GOLDEN_BY_TOOL).
//   "messy"   — deliberately incomplete / realistic-user fixtures.
//               NOT AUTHORED YET for any tool (upcoming, separate work).
//               The platform must therefore fail LOUDLY and EARLY with a
//               readable message rather than silently running perfect data
//               under a "messy" label.
//
// BACKWARD-COMPATIBILITY LAW: `null` (no variant supplied) is the legacy
// path. `/admin/quality-batch` never sends a variant, so every code path
// below must be a no-op when the value is null. `"perfect"` is an EXPLICIT
// label that resolves to the exact same fixture set as `null` — it changes
// only what is stamped on the rows, never what is run.

export type FixtureVariant = "perfect" | "messy";

export const FIXTURE_VARIANTS: readonly FixtureVariant[] = ["perfect", "messy"] as const;

/**
 * Coerce arbitrary request input to a FixtureVariant.
 * Returns null for null/undefined/empty (the legacy, unlabelled path).
 * Throws for a non-empty value that is not a known variant — an unknown
 * variant must never degrade silently into "perfect".
 */
export function normalizeVariant(raw: unknown): FixtureVariant | null {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  if (s === "") return null;
  if (s === "perfect" || s === "messy") return s;
  throw new Error(`unknown fixture variant: ${JSON.stringify(raw)} (expected "perfect" | "messy")`);
}

/**
 * Per-tool variant overrides, e.g. { "cppa-risk": "messy", "dpia": "perfect" }.
 * Unknown keys are rejected by the caller against RUN_QUALITY_BATCH_SLUGS;
 * unknown values throw via normalizeVariant.
 */
export function normalizeToolVariants(raw: unknown): Record<string, FixtureVariant> | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, FixtureVariant> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const nv = normalizeVariant(v);
    if (nv) out[k] = nv;
  }
  return Object.keys(out).length ? out : null;
}

/** Resolve the effective variant for one tool in a batch. */
export function resolveToolVariant(
  tool: string,
  toolVariants: Record<string, FixtureVariant> | null | undefined,
  batchLevel: FixtureVariant | null | undefined,
): FixtureVariant | null {
  return toolVariants?.[tool] ?? batchLevel ?? null;
}
