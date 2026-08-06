// ITEM 381 — INTAKE COMPLETENESS COACH, LAYER 1: feature flags.
//
// PER-PRODUCT AND DEFAULT OFF. With a flag off the intake flow behaves exactly
// as it does today: the review step is never constructed and never rendered.
// Flipping a flag is a separate, deliberate act after the walk-through in
// preview.
//
// Layer 2 (the asynchronous model call) is a separate gated item and has no
// flag, stub, or branch anywhere in this build.

import type { CoachProduct } from "@/lib/intakeCoach/thinSpots";

// ITEM 381 r3 — FLAGS FLIPPED ON after the review panel's unanimous walk of the
// r2 build (perfect fixtures zero cards, degraded fixtures fire at cap, truth
// rule holds). The review step is advisory and skippable; the checkout path is
// unchanged.
export const INTAKE_COACH_ENABLED: Record<CoachProduct, boolean> = {
  dpia: true,
  cppa_risk: true,
};


export function isIntakeCoachEnabled(product: CoachProduct): boolean {
  return INTAKE_COACH_ENABLED[product] === true;
}
