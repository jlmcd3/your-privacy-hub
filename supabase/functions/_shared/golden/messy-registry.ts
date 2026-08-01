// ITEM 325 — MESSY fixture registry (PLATFORM ONLY; NO CONTENT YET).
//
// The "messy" variant measures each product against realistic, incomplete
// user input: blank optional fields, prose where an enum is expected,
// contradictory answers, missing conditional companions. None of it has
// been authored yet — that is separate, upcoming work, and this task is
// explicitly the plumbing only.
//
// This file therefore exists so that:
//   (a) the wiring has a real, typed seam to plug into (no `any` holes,
//       no "TODO" comment standing in for a module), and
//   (b) the CI matrix test in
//       src/registry/__tests__/fixture-contract-matrix.test.ts automatically
//       starts covering messy fixtures the moment the first one lands —
//       nobody has to remember to extend the test.
//
// DO NOT add perfect fixtures here as placeholders. An empty set makes the
// Messy toggle fail loudly with "no messy fixtures authored for <tool>";
// a copied perfect set would make it pass while measuring nothing.

import type { GoldenCase } from "./types.ts";

export const MESSY_BY_TOOL: Record<string, GoldenCase[]> = {
  // Intentionally empty. See header.
};

/** Messy intake payloads for pinning, or [] when none are authored yet. */
export function messyIntakes(tool: string): unknown[] {
  return (MESSY_BY_TOOL[tool] ?? []).map((c) => c.intake);
}

/** Tools that currently ship at least one messy fixture. */
export function toolsWithMessyFixtures(): string[] {
  return Object.keys(MESSY_BY_TOOL).filter((t) => (MESSY_BY_TOOL[t] ?? []).length > 0);
}
