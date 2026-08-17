// PROMPT 12G item 3 — pins-mode options for the batch-creation console.
// Mirrors supabase/functions/_shared/quality/pins-mode.ts (the dispatch law).

export type PinsMode = "only" | "seed" | "none";

export const PINS_MODE_OPTIONS: ReadonlyArray<{
  value: PinsMode;
  label: string;
  description: string;
}> = [
  {
    value: "only",
    label: "Pinned only",
    description:
      "Runs the pinned fixtures and nothing else; each is put through the product's own closed-loop check at dispatch and batch size clamps to the passing count (perfect variant).",
  },
  {
    value: "seed",
    label: "Pins seed the batch (default)",
    description: "Pinned fixtures go first, the generator fills the remaining slots up to batch size.",
  },
  {
    value: "none",
    label: "No pins — generate everything",
    description: "No pinned fixtures are used; every slot is generated under the kind-aware retry and fail policy.",
  },
];
