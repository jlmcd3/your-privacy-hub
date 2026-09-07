// DOC 213 §2 — CODE verification of what a model returned. Pure, no I/O.
//
// Nothing a model says is trusted: every atom must parse and be in the closed
// vocabulary, every span must be a real substring, every enum must resolve.
// A failure is recorded on the row, never silently repaired.

import type { HookProductVocabulary } from "./product-registry.ts";
import { checkAtoms } from "./vocabulary.ts";
import type { ProfileForHook } from "./prompts.ts";

export type HookStatus =
  | "drafted" | "critiqued" | "settled" | "contested" | "ratified" | "retired";

export type Settledness = "R1" | "R2" | "R3" | "R4";

export interface DraftPayload {
  profile_id: string;
  fact_atoms: string[];
  distinguishing_atoms: string[];
  not_distinguishable: boolean;
  required_atoms: string[];
  finding_span: string;
  fact_pattern_paraphrase: string;
  finding_paraphrase: string;
  trigger_terms: string[];
  abstain_reason: "none" | "quote_states_no_finding" | "facts_not_in_atom_vocabulary" | "posture_unclear";
}

const ABSTAIN_REASONS = new Set([
  "none", "quote_states_no_finding", "facts_not_in_atom_vocabulary", "posture_unclear",
]);

export function parseDraftPayload(raw: string, profileId: string): { ok: true; draft: DraftPayload } | { ok: false; error: string } {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return { ok: false, error: "draft response is not JSON" };
    try {
      parsed = JSON.parse(m[0]) as Record<string, unknown>;
    } catch {
      return { ok: false, error: "draft response is not JSON" };
    }
  }
  if (parsed.profile_id !== profileId) return { ok: false, error: "draft profile_id does not match the supplied id" };
  const arr = (key: string) => (Array.isArray(parsed[key]) ? (parsed[key] as unknown[]).map(String) : null);
  const fact_atoms = arr("fact_atoms");
  const distinguishing_atoms = arr("distinguishing_atoms");
  const required_atoms = arr("required_atoms");
  const trigger_terms = arr("trigger_terms");
  if (!fact_atoms || !distinguishing_atoms || !required_atoms || !trigger_terms) {
    return { ok: false, error: "draft is missing one of the atom/term arrays" };
  }
  const abstain = String(parsed.abstain_reason ?? "");
  if (!ABSTAIN_REASONS.has(abstain)) return { ok: false, error: `unknown abstain_reason "${abstain}"` };
  if (typeof parsed.finding_span !== "string" || typeof parsed.fact_pattern_paraphrase !== "string" ||
      typeof parsed.finding_paraphrase !== "string") {
    return { ok: false, error: "draft is missing a required string field" };
  }
  return {
    ok: true,
    draft: {
      profile_id: profileId,
      fact_atoms, distinguishing_atoms, required_atoms, trigger_terms,
      not_distinguishable: parsed.not_distinguishable === true,
      finding_span: parsed.finding_span,
      fact_pattern_paraphrase: parsed.fact_pattern_paraphrase,
      finding_paraphrase: parsed.finding_paraphrase,
      abstain_reason: abstain as DraftPayload["abstain_reason"],
    },
  };
}

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export interface DraftVerification {
  readonly hook_status: HookStatus;
  readonly vocabulary_checks_passed: boolean;
  readonly substring_checks_passed: boolean;
  readonly errors: string[];
  readonly contested_reason: string | null;
}

/**
 * Endorsement of the source a profile pins — supplied by the caller after the
 * source row is read; `null` where the source is not an EDPB guideline.
 */
export type SourceEndorsement =
  | "edpb_adopted" | "wp29_endorsed_2018" | "wp29_not_endorsed" | "draft_consultation" | null;

/** DOC 213 §2 — settledness is derived from the SOURCE, never asserted. */
export function settlednessFor(profile: ProfileForHook, endorsement: SourceEndorsement): Settledness {
  const note = (profile.curation_note ?? "").toLowerCase();
  if (note.includes("under appeal") || profile.outcome_posture === "contested") return "R4";
  if (profile.source_table === "regulatory_guidance") return "R1";
  if (profile.source_table === "edpb_guidelines") {
    if (endorsement === "edpb_adopted" || endorsement === "wp29_endorsed_2018") return "R1";
    return "R3";
  }
  return "R3";
}

/** A consultation draft is never a hook source. */
export function refusedForConsultationDraft(profile: ProfileForHook, endorsement: SourceEndorsement): boolean {
  return profile.source_table === "edpb_guidelines" && endorsement === "draft_consultation";
}

export function verifyDraft(
  draft: DraftPayload,
  profile: ProfileForHook,
  excerpt: string,
  registry: HookProductVocabulary,
): DraftVerification {
  const errors: string[] = [];

  const vocabErrors = [
    ...checkAtoms(draft.fact_atoms, registry),
    ...checkAtoms(draft.distinguishing_atoms, registry),
    ...checkAtoms(draft.required_atoms, registry),
  ];
  errors.push(...vocabErrors);

  // finding_span must be verbatim in the pinned quote; a human-curated profile
  // may instead anchor it in the source excerpt.
  const quote = profile.extracted_quote ?? "";
  let spanOk = draft.finding_span.length > 0 && quote.includes(draft.finding_span);
  if (!spanOk && profile.pipeline_stage === "human") {
    spanOk = draft.finding_span.length > 0 && excerpt.includes(draft.finding_span);
  }
  if (!spanOk) errors.push("finding_span is not a verbatim substring of the pinned quote");

  for (const [name, text] of [
    ["fact_pattern_paraphrase", draft.fact_pattern_paraphrase],
    ["finding_paraphrase", draft.finding_paraphrase],
  ] as const) {
    if (words(text) > 30) errors.push(`${name} exceeds 30 words`);
    if (text.includes("[") || text.includes("]")) errors.push(`${name} contains a bracket`);
  }

  const contested_reason = draft.abstain_reason !== "none" ? draft.abstain_reason : null;
  const hook_status: HookStatus = contested_reason ? "contested" : "drafted";

  return {
    hook_status,
    vocabulary_checks_passed: vocabErrors.length === 0,
    substring_checks_passed: spanOk,
    errors,
    contested_reason,
  };
}

// ── Critique ────────────────────────────────────────────────────────────────

export const OBJECTION_CODES = new Set([
  "finding_span_not_a_finding", "finding_span_overstates_width", "fact_atom_not_in_source",
  "fact_atom_is_legal_conclusion", "distinguishing_atom_immaterial", "distinguishing_atom_missing",
  "posture_mismatch", "settledness_overclaim", "atom_not_in_vocabulary", "trigger_term_overbroad",
]);

export const OBJECTION_TARGETS = new Set([
  "finding_span", "fact_atoms", "distinguishing_atoms", "required_atoms", "trigger_terms",
  "settledness", "paraphrase",
]);

export interface Objection {
  code: string;
  target: string;
  index: number | null;
  source_span: string | null;
  severity: "block" | "warn";
}

export interface CritiqueVerification {
  readonly ok: boolean;
  readonly error?: string;
  readonly verdict: "no_objection" | "objections";
  readonly objections: Objection[];
  readonly discarded: string[];
}

// LEDGER B5-6 item 4 — a `state:` atom describes the CUSTOMER RECORD the hook
// is matched against, not a fact the authority must state. Source-presence
// objections against `state:` atoms are category errors and are discarded.
const SOURCE_PRESENCE_CODES = new Set(["fact_atom_not_in_source"]);

export function isStateAtom(atom: unknown): boolean {
  return typeof atom === "string" && atom.trim().startsWith("state:");
}

export function verifyCritique(
  raw: string,
  hookId: string,
  excerpt: string,
  factAtoms: readonly string[] = [],
): CritiqueVerification {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "critique response is not JSON", verdict: "objections", objections: [], discarded: [] };
  }
  if (parsed.hook_id !== undefined && parsed.hook_id !== hookId) {
    return { ok: false, error: "critique hook_id does not match", verdict: "objections", objections: [], discarded: [] };
  }
  const verdictRaw = String(parsed.verdict ?? "");
  if (verdictRaw !== "no_objection" && verdictRaw !== "objections") {
    return { ok: false, error: `unknown verdict "${verdictRaw}"`, verdict: "objections", objections: [], discarded: [] };
  }
  const objections: Objection[] = [];
  const discarded: string[] = [];
  const list = Array.isArray(parsed.objections) ? parsed.objections : [];
  for (const item of list as Record<string, unknown>[]) {
    const code = String(item?.code ?? "");
    const target = String(item?.target ?? "");
    if (!OBJECTION_CODES.has(code)) { discarded.push(`unknown code "${code}"`); continue; }
    if (!OBJECTION_TARGETS.has(target)) { discarded.push(`unknown target "${target}"`); continue; }
    const severity = item?.severity === "block" ? "block" : item?.severity === "warn" ? "warn" : null;
    if (!severity) { discarded.push(`unknown severity on "${code}"`); continue; }
    const span = typeof item?.source_span === "string" ? item.source_span : null;
    if (span !== null && !excerpt.includes(span)) {
      discarded.push(`source_span on "${code}" is not in the source excerpt`);
      continue;
    }
    const index = typeof item?.index === "number" ? item.index : null;
    if (
      SOURCE_PRESENCE_CODES.has(code) && target === "fact_atoms" &&
      index !== null && isStateAtom(factAtoms[index])
    ) {
      discarded.push(`"${code}" raised against a state: atom (index ${index}) — record-side, not source-side`);
      continue;
    }
    objections.push({ code, target, index, source_span: span, severity });
  }
  const verdict = objections.length === 0 ? "no_objection" : "objections";
  return { ok: true, verdict, objections, discarded };
}

// ── Settle (mechanical, no model) ───────────────────────────────────────────

export interface SettleInput {
  readonly substring_checks_passed: boolean;
  readonly vocabulary_checks_passed: boolean;
  readonly objections: readonly { severity: string }[];
  readonly outcome_posture: string | null;
  readonly not_distinguishable: boolean;
  readonly distinguishing_atoms: readonly string[];
  readonly round: number;
}

export interface SettleDecision {
  readonly hook_status: HookStatus | null; // null → leave as is (more rounds available)
  readonly reasons: string[];
}

export function settleDecision(input: SettleInput): SettleDecision {
  const reasons: string[] = [];
  if (!input.substring_checks_passed) reasons.push("substring_checks_failed");
  if (!input.vocabulary_checks_passed) reasons.push("vocabulary_checks_failed");
  if (input.objections.some((o) => o.severity === "block")) reasons.push("blocking_objection_outstanding");
  const distinguishable = input.outcome_posture === "accepted" || input.not_distinguishable ||
    input.distinguishing_atoms.length > 0;
  if (!distinguishable) reasons.push("no_distinguishing_atom_on_a_non_accepted_posture");

  if (reasons.length === 0) return { hook_status: "settled", reasons: [] };
  if (input.round >= 2) return { hook_status: "contested", reasons };
  return { hook_status: null, reasons };
}
