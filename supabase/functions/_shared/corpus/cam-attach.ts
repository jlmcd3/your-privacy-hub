// Generation-plane attachment (doc 48 §II.2a law 2 — the determinism law):
// `attach(cam, typedStates) -> rows` is a PURE function. The only inputs
// are the CAM and the product's own typed determination states. No text
// similarity, no runtime DB query, no ranking — a row renders iff every
// one of its render_when tokens is present in the fired-state set.
//
// Phase 2 (2026-08-22): first wiring, for CPPA Risk's S5 surface.

import type { CamRow, CamSurface, CorpusMap } from "./cam-types.ts";

/** All render-eligible rows on `surface` whose render_when tokens are ALL
 * present in `firedStates`. Order is map order (curation order) — stable
 * and deterministic by construction. */
export function attachCorpusRows(
  map: CorpusMap,
  surface: CamSurface,
  firedStates: ReadonlySet<string>,
): CamRow[] {
  return map.rows.filter((row) => {
    if (!row.render_eligible || row.render_surface !== surface) return false;
    if (!row.render_when || row.render_when.length === 0) {
      // S0 rows carry no state predicate — they attach to intake fields
      // unconditionally; state-gated surfaces (S5) always declare one.
      return surface === "S0";
    }
    return row.render_when.every((token) => firedStates.has(token));
  });
}
