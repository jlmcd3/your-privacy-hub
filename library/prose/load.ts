// ITEM 348 — authored prose library, loaded from JSON for tests and scripts.
//
// RUNTIME NEVER IMPORTS THIS. The edge functions read the library from
// `prose_frame_sets` / `prose_document_plans` through
// `_shared/prose/library-source.ts`. These JSON files are the change-controlled
// source of truth that `scripts/prose/seed-library.ts` writes into those rows;
// they live outside `supabase/functions` so they never enter a function bundle.

import type { FrameSet } from "../../supabase/functions/_shared/prose/frames.ts";
import type { DocumentPlan } from "../../supabase/functions/_shared/prose/plan.ts";

async function read<T>(rel: string): Promise<T> {
  return JSON.parse(await Deno.readTextFile(new URL(rel, import.meta.url))) as T;
}

export const CPPA_RISK_FRAMES = await read<FrameSet>("./frames/cppa-risk.frames.json");
export const CPPA_RISK_PLAN = await read<DocumentPlan>("./plans/cppa-risk.plan.json");
export const DPIA_PLAN = await read<DocumentPlan>("./plans/dpia.plan.json");
export const GOVERNANCE_PLAN = await read<DocumentPlan>("./plans/governance.plan.json");
export const REGISTRATION_PLAN = await read<DocumentPlan>("./plans/registration.plan.json");
