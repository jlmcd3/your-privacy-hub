/**
 * DPIA REFINEMENT PASS — item376 (v1.0) / item377 (v1.1) / item378 (re-homed).
 *
 * ITEM 378: the engine now lives in ./refinement-core.ts so more than one
 * product can use it. This module is the DPIA CONFIG plus the public surface
 * the DPIA pipeline and its tests already import. Behaviour is byte-stable:
 * the composed prompts, protected-key sets, splicer and telemetry shape are
 * identical to item377.
 *
 * Architecture: CRITIC (Claude) -> VERIFIER (GPT-4o) -> DETERMINISTIC SPLICER.
 */

import {
  CRITIC_PROMPT_BASE,
  VERIFIER_PROMPT_BASE,
  composePrompt,
  applySplicesWith,
  isProtectedPathFor,
  protectedReasonFor,
  runRefinement,
  type RefinementConfig,
  type RefinementDeps,
  type RefinementTelemetry,
  type CriticFinding,
  type SpliceResult,
} from "./refinement-core.ts";

export {
  MAX_SPLICES,
  FINDINGS_LOG_QUOTE_MAX,
  parsePath,
  readPath,
  parseJsonLoose,
  buildCriticUser,
  buildVerifierUser,
} from "./refinement-core.ts";
export type {
  CriticFinding,
  StructuralFinding,
  Verdict,
  ProtectedRejection,
  FindingLogEntry,
  RefinementTelemetry,
  RefinementDeps,
  SpliceResult,
  PathSeg,
} from "./refinement-core.ts";

export const DPIA_REFINEMENT_VERSION = "refine-2026-08-05-item377-v1.1";

// -- DPIA-specific prompt blocks (item377 §§3-4, verbatim) -------------------

export const DPIA_CRITIC_WATCHLIST =
  `DPIA-SPECIFIC WATCHLIST (from this product's verified defect history — verify each specifically; report ONLY what you actually find, with evidence; watchlist findings carry no privilege: same anchors, same verification):
W1 Invented entities: processors, vendors, technologies, certifications, or workflows not in the intake (history: invented monitoring vendors and HR-review workflows).
W2 Basis contradictions: the stated legal basis, Art. 9 condition, or Art. 35(3) trigger contradicted elsewhere in the document (history: legal_basis vs article_35_3_trigger; engagement map vs metadata).
W3 False absence: any claim that the record does not supply something the intake in fact supplies. Check the intake both ways — an absence statement about a genuinely silent record is CORRECT and must not be flagged.
W4 Leaked candidacy markers: "CANDIDATE —" or "[TO COMPLETE — …]" where the record supplies the answer. A placeholder is correct ONLY when the record is silent on that item.
W5 Interchangeable filler: near-identical stock sentences repeated across risk rows or sections where fact-specific reasoning belongs.
W6 Mis-attached citations: a real citation attached to the wrong proposition or instrument.`;

export const DPIA_VERIFIER_EXEMPLARS =
  `DESIGNED-OUTPUT PATTERNS (these are deliberate product output; a proposal altering any of them fails condition 4 and must be REJECTED): the final disclaimer; quoted statutory text; "[TO BE COMPLETED …]"/"[TO BE ASSESSED]" placeholders where the intake is silent on the item; "(default — confirm)" markers; the canonical closes "…further clarification is advisable." / "…further internal investigation is advisable."; drafting-voice references to "the record"; the EDPB DPIA template v1.0 structure and its § 0.5 assessment-team/validation fields; plain-prose FSOR/Agency-position citations; corpus-verified recent law (SB 446 notice windows; Cal. Civ. Code § 1798.140(ag); UK GDPR Art. 6(11) per the DUAA 2025). Conversely: a placeholder or absence statement covering something the intake DOES supply is NOT protected — that is a record-contradiction, and its correction should be APPROVED when conditions 1–3 hold.`;

export const CRITIC_SYSTEM_PROMPT = composePrompt(CRITIC_PROMPT_BASE, DPIA_CRITIC_WATCHLIST);
export const VERIFIER_SYSTEM_PROMPT = composePrompt(VERIFIER_PROMPT_BASE, DPIA_VERIFIER_EXEMPLARS);

// -- Protected surfaces ------------------------------------------------------

export const PROTECTED_ROOT_KEYS = [
  "framework_disclaimer",
  "guidance_verbatim",
];

export const PROTECTED_LEAF_KEYS = [
  "name",
  "role",
  "approved_by_name",
  "approved_by_title",
  "approval_date",
  "status",
  "citation",
  "template_ref",
  "risk_id",
  "rule_id",
  "likelihood",
  "severity",
];

export const DPIA_REFINEMENT_CONFIG: RefinementConfig = {
  product: "dpia",
  version: DPIA_REFINEMENT_VERSION,
  criticSystemPrompt: CRITIC_SYSTEM_PROMPT,
  verifierSystemPrompt: VERIFIER_SYSTEM_PROMPT,
  protectedRootKeys: PROTECTED_ROOT_KEYS,
  protectedLeafKeys: PROTECTED_LEAF_KEYS,
};

export function isProtectedPath(path: string): boolean {
  return isProtectedPathFor(path, DPIA_REFINEMENT_CONFIG);
}

/** The rule that protects a path, or null when unprotected. */
export function protectedReason(path: string): string | null {
  return protectedReasonFor(path, DPIA_REFINEMENT_CONFIG);
}

export function applySplices(
  report: Record<string, unknown>,
  approved: CriticFinding[],
): SpliceResult {
  return applySplicesWith(report, approved, DPIA_REFINEMENT_CONFIG);
}

export async function runDpiaRefinement(
  report: Record<string, unknown>,
  intake: Record<string, unknown>,
  deps: RefinementDeps,
  opts: { enabled?: boolean } = {},
): Promise<RefinementTelemetry> {
  return await runRefinement(report, intake, deps, DPIA_REFINEMENT_CONFIG, opts);
}
