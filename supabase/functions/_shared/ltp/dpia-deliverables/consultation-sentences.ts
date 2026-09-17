/**
 * DPIA — Section 5 consultation sentences (doc 266 INV-5, 2026-09-17).
 *
 * `dataSubjectsViewsSlot` and `dpoSentence` were the assembler's own
 * (dpia-skeleton-assemble.ts, PROMPT 8 / DOC 137 FIX 1) and minimal-units.ts
 * reused them under its SINGLE-SOURCE LAW. The assembler now lives in the DPIA
 * function's _local tree (Lovable's deploy carries all of _shared into every
 * function), while minimal-units.ts stays in _shared because the quality
 * harness's closed loop needs dpia-deliverables/build.ts. Both import from
 * here. The bytes of the sentences are unchanged; only their home moved.
 *
 * Pure. Never throws. No I/O.
 */

import { spliceVerbatim } from "../verbatim-splice.ts";
import { noStop } from "../clause-bound.ts";
import { dpoFromPreparedBy } from "./build.ts";

type Bag = Record<string, unknown>;
const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * PROMPT 8 — Section 5. The spine reads "the company has recorded:
 * {dataSubjectsViews}". Absence is stated honestly rather than left blank.
 */
export function dataSubjectsViewsSlot(intake: Bag): string {
  const views = spliceVerbatim(s(intake.data_subjects_views));
  if (views) return noStop(views);
  const sought = s(intake.data_subjects_views_sought);
  if (/^(no|not sought|none)/i.test(sought)) {
    return "that the views of data subjects or their representatives were not sought for this processing";
  }
  return "no views of data subjects or their representatives";
}

export function dpoSentence(intake: Bag): string {
  const advice = s(intake.dpo_advice);
  const info = s(intake.dpo_info);
  if (advice) return `The company has recorded the advice of its data protection officer as follows: ${noStop(advice)}`;
  if (info) return `The company has recorded its data protection officer as ${noStop(info)}`;
  // DOC 137 FIX 1 (2026-09-01, confirmed by reading the rendered PDF) —
  // Section 0's assessment team and the Controller table both credit a DPO
  // named only in the assessment team roster (via build.ts's
  // `dpoFromPreparedBy` fallback, S1.8, doc 119) when no formal `dpo_info`
  // record exists. Without this branch, Section 5 fell straight to the flat
  // "not recorded … obtained" line with no reference to that named DPO,
  // reading as a self-contradiction against Section 0/the Controller table
  // even though the actual gap is narrower: naming a DPO is not the same as
  // recording that DPO's advice was specifically sought FOR THIS ASSESSMENT.
  // Reuses `dpoFromPreparedBy` rather than reimplementing it, so the two
  // surfaces can never diverge on who is credited.
  const credited = dpoFromPreparedBy(intake);
  if (credited) {
    return `The company has not recorded that the advice of ${credited} was specifically sought for this assessment`;
  }
  return "The company has not recorded that the advice of a data protection officer has been obtained";
}
