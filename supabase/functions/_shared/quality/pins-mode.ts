// PROMPT 12G items 1–3 (2026-08-17) — PINS MODE ON DISPATCH.
//
// A batch now states, explicitly, what the pinned fixtures are FOR:
//
//   "only" — run the pinned fixtures and nothing else (the 9G all-pinned mode:
//            closed-loop pre-filter at dispatch, batch size clamped to the
//            passing pin count).
//   "seed" — DEFAULT and today's behaviour: pins go first, the generator fills
//            the delta up to batch_size.
//   "none" — no pins at all; every slot is generated (the kind-aware 12F fail
//            policy governs).
//
// The legacy boolean column `quality_batch_runs.pinned_only` is SUPERSEDED by
// `pins_mode` but keeps working: pinned_only=true maps to "only".

export type PinsMode = "only" | "seed" | "none";

export const PINS_MODES: readonly PinsMode[] = ["only", "seed", "none"];

export const DEFAULT_PINS_MODE: PinsMode = "seed";

/** One-line description per mode — shared by the console and the batch log. */
export const PINS_MODE_DESCRIPTIONS: Record<PinsMode, string> = {
  only: "Pinned fixtures only — nothing is generated; batch size clamps to the pins that pass the closed-loop check.",
  seed: "Pins first, generator fills the delta up to batch size (default).",
  none: "No pins — every slot is generated.",
};

/** Normalize a raw request value. Unknown/absent ⇒ null (caller decides). */
export function normalizePinsMode(raw: unknown): PinsMode | null {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return (PINS_MODES as readonly string[]).includes(v) ? (v as PinsMode) : null;
}

/**
 * Resolve the effective mode for a persisted batch row.
 * Precedence: explicit pins_mode → legacy pinned_only=true ⇒ "only" → default.
 */
export function resolvePinsMode(row: { pins_mode?: unknown; pinned_only?: unknown } | null | undefined): PinsMode {
  const explicit = normalizePinsMode(row?.pins_mode);
  if (explicit) return explicit;
  if (row?.pinned_only === true) return "only";
  return DEFAULT_PINS_MODE;
}

/** Batch-log composition line, e.g. `pins_mode=none: 0 pinned + 4 generated`. */
export function pinsCompositionLine(mode: PinsMode, tool: string, pinned: number, batchSize: number): string {
  const generated = Math.max(0, batchSize - pinned);
  return `pins_mode=${mode}: ${tool} runs ${pinned} pinned + ${generated} generated`;
}
