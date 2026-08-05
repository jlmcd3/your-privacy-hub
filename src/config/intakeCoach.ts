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

export const INTAKE_COACH_ENABLED: Record<CoachProduct, boolean> = {
  dpia: false,
  cppa_risk: false,
};

export function isIntakeCoachEnabled(product: CoachProduct): boolean {
  return INTAKE_COACH_ENABLED[product] === true;
}
