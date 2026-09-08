// DOC 213 §2 — CODE verification of what a model returned, as amended by
// DOC 222 (hooks contract v2). Pure, no I/O.
//
// Nothing a model says is trusted: every atom must parse and be in the closed
// vocabulary, every span must be a real substring, every enum must resolve,
// every paraphrase must be a clause that keeps its source's qualifiers, every
// pinpoint must anchor in the source. A failure is recorded on the row,
// never silently repaired. Automated checks validate SHAPE and QUALIFIER
// CARRIAGE only — legal accuracy is the critic's objection and the CEO's
// stamp (doc 222 §2.6 rule 5).

import type { HookProductVocabulary } from "./product-registry.ts";
import { checkAtoms } from "./vocabulary.ts";
import type { ProfileForHook } from "./prompts.ts";
import { ABSTAIN_REASONS_V2 } from "./prompts.ts";
import { atomConcept } from "./concepts.ts";
import type { HookDistinguishingPair, HookMaterialFact, HookPinpoint } from "../../_shared/corpus/hook-types.ts";

export type HookStatus =
  | "drafted" | "critiqued" | "settled" | "contested" | "ratified" | "retired";

export type Settledness = "R1" | "R2" | "R3" | "R4";

export type AbstainReason = typeof ABSTAIN_REASONS_V2[number];

export interface DraftPayload {
  profile_id: string;
  material_facts: HookMaterialFact[];
  distinguishing_pairs: HookDistinguishingPair[];
  /** Derived: the material facts' atoms (the join's `fact_atoms`). */
  fact_atoms: string[];
  /** Derived: the pairs' record atoms (the join's `distinguishing_atoms`). */
  distinguishing_atoms: string[];
  not_distinguishable: boolean;
  required_atoms: string[];
  finding_span: string;
  fact_pattern_paraphrase: string;
  finding_paraphrase: string;
  trigger_terms: string[];
  abstain_reason: AbstainReason;
  recognised_proposition: string | null;
  recognised_span: string | null;
  condition_text: string | null;
  condition_span: string | null;
  condition_atoms: string[] | null;
  pinpoint: HookPinpoint | null;
}

const ABSTAIN_REASONS = new Set<string>(ABSTAIN_REASONS_V2);
const PINPOINT_KINDS = new Set(["paragraph", "section", "page", "recital", "heading"]);

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const strOrEmpty = (v: unknown): string => (typeof v === "string" ? v : "");
const arr = (v: unknown): unknown[] | null => (Array.isArray(v) ? v : null);

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

  const materialRaw = arr(parsed.material_facts);
  const pairsRaw = arr(parsed.distinguishing_pairs);
  const required_atoms = arr(parsed.required_atoms)?.map(String);
  const trigger_terms = arr(parsed.trigger_terms)?.map(String);
  if (!materialRaw || !pairsRaw || !required_atoms || !trigger_terms) {
    return { ok: false, error: "draft is missing one of the material_facts / distinguishing_pairs / required_atoms / trigger_terms arrays" };
  }
  const abstain = String(parsed.abstain_reason ?? "");
  if (!ABSTAIN_REASONS.has(abstain)) return { ok: false, error: `unknown abstain_reason "${abstain}"` };
  if (typeof parsed.finding_span !== "string" || typeof parsed.fact_pattern_paraphrase !== "string" ||
      typeof parsed.finding_paraphrase !== "string") {
    return { ok: false, error: "draft is missing a required string field" };
  }

  const material_facts: HookMaterialFact[] = [];
  for (const m of materialRaw) {
    const o = (m ?? {}) as Record<string, unknown>;
    if (typeof o.atom !== "string") return { ok: false, error: "material_facts entry without an atom" };
    material_facts.push({ atom: o.atom, materiality_reason: strOrEmpty(o.materiality_reason), source_span: str(o.source_span) });
  }
  const distinguishing_pairs: HookDistinguishingPair[] = [];
  for (const p of pairsRaw) {
    const o = (p ?? {}) as Record<string, unknown>;
    if (typeof o.record_atom !== "string" || typeof o.source_fact_span !== "string") {
      return { ok: false, error: "distinguishing_pairs entry without record_atom / source_fact_span" };
    }
    distinguishing_pairs.push({
      source_fact_span: o.source_fact_span,
      source_polarity: o.source_polarity === "absent" ? "absent" : "present",
      record_atom: o.record_atom,
      record_polarity: o.record_polarity === "absent" ? "absent" : "present",
      why_material: strOrEmpty(o.why_material),
      source_expressly_excludes: o.source_expressly_excludes === true,
      exclusion_span: str(o.exclusion_span),
      exclusion_paraphrase: str(o.exclusion_paraphrase),
    });
  }
  let pinpoint: HookPinpoint | null = null;
  if (parsed.pinpoint && typeof parsed.pinpoint === "object") {
    const o = parsed.pinpoint as Record<string, unknown>;
    const kind = String(o.kind ?? "");
    if (!PINPOINT_KINDS.has(kind)) return { ok: false, error: `unknown pinpoint kind "${kind}"` };
    pinpoint = { kind: kind as HookPinpoint["kind"], ref: strOrEmpty(o.ref), anchor_span: strOrEmpty(o.anchor_span) };
  }
  const condition_atoms = arr(parsed.condition_atoms)?.map(String) ?? null;

  return {
    ok: true,
    draft: {
      profile_id: profileId,
      material_facts,
      distinguishing_pairs,
      fact_atoms: material_facts.map((m) => m.atom),
      distinguishing_atoms: distinguishing_pairs.map((p) => p.record_atom),
      not_distinguishable: parsed.not_distinguishable === true,
      required_atoms,
      finding_span: parsed.finding_span,
      fact_pattern_paraphrase: parsed.fact_pattern_paraphrase,
      finding_paraphrase: parsed.finding_paraphrase,
      trigger_terms,
      abstain_reason: abstain as AbstainReason,
      recognised_proposition: str(parsed.recognised_proposition),
      recognised_span: str(parsed.recognised_span),
      condition_text: str(parsed.condition_text),
      condition_span: str(parsed.condition_span),
      condition_atoms,
      pinpoint,
    },
  };
}

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ── DOC 222 §2.6 — clause form and qualifier preservation ──────────────────

/** CEO ruling 2026-09-08 (amending doc 222 §2.6): every paraphrase,
 *  proposition and condition must be LESS THAN 60 words. The drafter is
 *  instructed in those words (prompts.ts) and code refuses at 60. There is
 *  no soft target: accuracy wins over length below the ceiling. */
export const PARAPHRASE_MAX_WORDS = 60;

/** The closed qualifier list (doc 222 §2.6 rule 3). Order matters only for
 *  reporting; each is matched case-insensitively as a whole word/phrase. */
export const QUALIFIERS: readonly string[] = [
  "could", "may", "might", "only where", "only", "strictly", "necessary", "proportionate",
  "case-by-case", "case by case", "in principle", "cannot be ruled out", "not excluded",
  "subject to", "provided that", "unless", "rarely", "generally",
];

const PROPER_START = /^(?:[A-Z][A-Z0-9]+\b|Article\b|Regulation\b|Directive\b|Recital\b|Schedule\b|Section\b|[A-Z][a-z]+\s+[0-9])/;

/** Clause-form errors for one text (doc 222 §2.6 rules 1–4). */
export function clauseFormErrors(name: string, text: string): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const t = text.trim();
  if (t.length === 0) {
    errors.push(`${name} is empty`);
    return { errors, warnings };
  }
  const n = words(t);
  if (n >= PARAPHRASE_MAX_WORDS) errors.push(`${name} must be less than ${PARAPHRASE_MAX_WORDS} words (has ${n})`);
  if (/[[\]]/.test(t)) errors.push(`${name} contains a bracket`);
  if (/…|\.\.\./.test(t)) errors.push(`${name} contains an ellipsis`);
  if (/["“”]/.test(t)) errors.push(`${name} contains a quotation mark`);
  if (/[.;]$/.test(t)) errors.push(`${name} ends with punctuation`);
  // an internal period that is not part of an abbreviation/number (e.g. "Art. 6(1)(f)", "6.1")
  if (/[a-z)]\.\s+[a-zA-Z]/.test(t) && !/\b(?:Art|Arts|para|paras|No|e\.g|i\.e|cf|s)\.\s/.test(t)) errors.push(`${name} contains an internal period (two clauses)`);
  if (/^[A-Z]/.test(t) && !PROPER_START.test(t)) errors.push(`${name} starts upper-case without a proper noun`);
  return { errors, warnings };
}

function hasQualifier(text: string, q: string): boolean {
  const re = new RegExp(`(^|[^a-z])${q.replace(/[-\s]+/g, "[-\\s]+")}(?=$|[^a-z])`, "i");
  return re.test(text);
}

/** Qualifiers present in `span` but absent from `paraphrase` (doc 222 §2.6 rule 3). */
export function droppedQualifiers(span: string, paraphrase: string): string[] {
  const out: string[] = [];
  for (const q of QUALIFIERS) {
    if (q === "only" && hasQualifier(span, "only where")) continue; // covered by the phrase
    if (hasQualifier(span, q) && !hasQualifier(paraphrase, q)) out.push(q);
  }
  return out;
}

// ── DOC 222 §2.5 — the pinpoint anchor check ───────────────────────────────

export const PINPOINT_WINDOW_CHARS = 600;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The anchor must be verbatim in the source text; a paragraph ref's marker
 *  must precede it within the window; a section/heading ref must precede it. */
export function pinpointErrors(pin: HookPinpoint | null, sourceText: string): string[] {
  if (!pin) return ["pinpoint missing"];
  const errors: string[] = [];
  if (!pin.ref.trim()) errors.push("pinpoint ref is empty");
  if (!pin.anchor_span || !sourceText.includes(pin.anchor_span)) {
    errors.push("pinpoint anchor_span is not a verbatim substring of the source text");
    return errors;
  }
  const at = sourceText.indexOf(pin.anchor_span);
  const window = sourceText.slice(Math.max(0, at - PINPOINT_WINDOW_CHARS), at + pin.anchor_span.length);
  const ref = escapeRe(pin.ref.trim());
  if (pin.kind === "paragraph") {
    const marker = new RegExp(`(?:^|[\\s(¶§])${ref}(?:[.)]|\\b)`, "m");
    if (!marker.test(window)) errors.push(`pinpoint paragraph marker "${pin.ref}" not found within ${PINPOINT_WINDOW_CHARS} characters before the anchor`);
  } else if (pin.kind === "section" || pin.kind === "heading" || pin.kind === "recital") {
    const before = sourceText.slice(0, at + pin.anchor_span.length);
    if (!before.includes(pin.ref.trim())) errors.push(`pinpoint ${pin.kind} "${pin.ref}" does not occur before the anchor`);
  }
  return errors;
}

// ── Draft verification ──────────────────────────────────────────────────────

export interface DraftVerification {
  readonly hook_status: HookStatus;
  readonly vocabulary_checks_passed: boolean;
  readonly substring_checks_passed: boolean;
  readonly errors: string[];
  readonly warnings: string[];
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
  const warnings: string[] = [];

  // Atoms — every atom in the closed vocabulary; instrument: never a fact.
  const vocabErrors = [
    ...checkAtoms(draft.fact_atoms, registry),
    ...checkAtoms(draft.distinguishing_atoms, registry),
    ...checkAtoms(draft.required_atoms, registry),
    ...checkAtoms(draft.condition_atoms ?? [], registry),
  ];
  errors.push(...vocabErrors);
  for (const m of draft.material_facts) {
    if (m.atom.startsWith("instrument:")) errors.push(`material_facts: instrument atom "${m.atom}" is a scope filter, not a fact (doc 222 §2.2)`);
  }
  // Concept dedupe (doc 222 §2.3).
  const seenConcepts = new Map<string, string>();
  for (const m of draft.material_facts) {
    const c = atomConcept(m.atom);
    const prior = seenConcepts.get(c);
    if (prior && prior !== m.atom) errors.push(`material_facts: "${m.atom}" and "${prior}" name the same fact (concept ${c})`);
    seenConcepts.set(c, m.atom);
  }
  if (draft.material_facts.length > 6) errors.push("material_facts exceeds 6 entries");
  if (draft.distinguishing_pairs.length > 4) errors.push("distinguishing_pairs exceeds 4 entries");
  for (const c of draft.condition_atoms ?? []) {
    if (c.startsWith("verdict:")) errors.push(`condition_atoms: "${c}" is a verdict, not a fact (doc 222 §2.1)`);
  }

  // Spans — finding_span must be verbatim in the pinned quote; a human-curated
  // profile may instead anchor it in the source excerpt. Material-fact spans
  // and pair spans anchor in the excerpt (state: atoms are record-side —
  // ledger B5-6 item 4 — and carry no source span).
  const quote = profile.extracted_quote ?? "";
  let spanOk = draft.finding_span.length > 0 && quote.includes(draft.finding_span);
  if (!spanOk && profile.pipeline_stage === "human") {
    spanOk = draft.finding_span.length > 0 && excerpt.includes(draft.finding_span);
  }
  if (!spanOk) errors.push("finding_span is not a verbatim substring of the pinned quote");
  const inSource = (s: string | null | undefined): boolean => typeof s === "string" && s.length > 0 && (excerpt.includes(s) || quote.includes(s));
  for (const m of draft.material_facts) {
    if (m.atom.startsWith("state:")) continue;
    if (!inSource(m.source_span)) { errors.push(`material_facts: no verbatim source_span for "${m.atom}"`); spanOk = false; }
  }
  for (const [i, p] of draft.distinguishing_pairs.entries()) {
    if (!inSource(p.source_fact_span)) { errors.push(`distinguishing_pairs[${i}]: source_fact_span is not verbatim in the source`); spanOk = false; }
    if (!p.why_material.trim()) errors.push(`distinguishing_pairs[${i}]: why_material is empty`);
    if (p.source_expressly_excludes) {
      if (!inSource(p.exclusion_span)) { errors.push(`distinguishing_pairs[${i}]: source_expressly_excludes without a verbatim exclusion_span`); spanOk = false; }
      if (!p.exclusion_paraphrase) errors.push(`distinguishing_pairs[${i}]: source_expressly_excludes without an exclusion_paraphrase`);
      else {
        const cf = clauseFormErrors(`distinguishing_pairs[${i}].exclusion_paraphrase`, p.exclusion_paraphrase);
        errors.push(...cf.errors);
        warnings.push(...cf.warnings);
      }
    }
  }

  // Clause form + qualifier carriage (doc 222 §2.6).
  for (const [name, text] of [
    ["fact_pattern_paraphrase", draft.fact_pattern_paraphrase],
    ["finding_paraphrase", draft.finding_paraphrase],
  ] as const) {
    const cf = clauseFormErrors(name, text);
    errors.push(...cf.errors);
    warnings.push(...cf.warnings);
  }
  if (spanOk) {
    for (const q of droppedQualifiers(draft.finding_span, draft.finding_paraphrase)) {
      errors.push(`finding_paraphrase drops the qualifier "${q}" present in finding_span`);
    }
  }

  // The proposition split (doc 222 §2.1) — required for a conditional source.
  const conditional = profile.outcome_posture === "conditional";
  if (conditional) {
    if (!draft.recognised_proposition || !draft.condition_text) {
      errors.push("conditional source without recognised_proposition / condition_text (doc 222 §2.1)");
    }
    if (!inSource(draft.recognised_span)) { errors.push("recognised_span is not verbatim in the source"); spanOk = false; }
    if (!inSource(draft.condition_span)) { errors.push("condition_span is not verbatim in the source"); spanOk = false; }
  }
  if (draft.recognised_proposition) {
    const cf = clauseFormErrors("recognised_proposition", draft.recognised_proposition);
    errors.push(...cf.errors);
    warnings.push(...cf.warnings);
    if (draft.recognised_span && inSource(draft.recognised_span)) {
      for (const q of droppedQualifiers(draft.recognised_span, draft.recognised_proposition)) errors.push(`recognised_proposition drops the qualifier "${q}"`);
    }
  }
  if (draft.condition_text) {
    const cf = clauseFormErrors("condition_text", draft.condition_text);
    errors.push(...cf.errors);
    warnings.push(...cf.warnings);
    if (draft.condition_span && inSource(draft.condition_span)) {
      for (const q of droppedQualifiers(draft.condition_span, draft.condition_text)) errors.push(`condition_text drops the qualifier "${q}"`);
    }
  }

  // The pinpoint (doc 222 §2.5): mandatory unless the drafter abstained for
  // exactly that reason; verified against the source text.
  if (draft.abstain_reason !== "pinpoint_unlocatable") {
    const pe = pinpointErrors(draft.pinpoint, excerpt || quote);
    errors.push(...pe);
    if (pe.some((e) => e.includes("verbatim"))) spanOk = false;
  }

  const contested_reason = draft.abstain_reason !== "none" ? draft.abstain_reason : null;
  const hook_status: HookStatus = contested_reason ? "contested" : "drafted";

  return {
    hook_status,
    vocabulary_checks_passed: vocabErrors.length === 0,
    substring_checks_passed: spanOk,
    errors,
    warnings,
    contested_reason,
  };
}

// ── Critique ────────────────────────────────────────────────────────────────

export const OBJECTION_CODES = new Set([
  "finding_span_not_a_finding", "finding_span_overstates_width", "fact_atom_not_in_source",
  "fact_atom_is_legal_conclusion", "fact_immaterial", "material_fact_missing",
  "distinguishing_pair_immaterial", "distinguishing_pair_missing", "exclusion_overclaim",
  "proposition_not_in_source", "proposition_broader_than_source", "condition_omitted",
  "condition_narrowed", "condition_atoms_overclaim", "paraphrase_broader_than_source",
  "pinpoint_wrong", "posture_mismatch", "settledness_overclaim", "atom_not_in_vocabulary",
  "trigger_term_overbroad",
  // v1 codes kept for rows critiqued before doc 222
  "distinguishing_atom_immaterial", "distinguishing_atom_missing",
]);

export const OBJECTION_TARGETS = new Set([
  "finding_span", "material_facts", "distinguishing_pairs", "required_atoms", "trigger_terms",
  "settledness", "paraphrase", "proposition", "condition", "pinpoint",
  // v1 targets
  "fact_atoms", "distinguishing_atoms",
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
      SOURCE_PRESENCE_CODES.has(code) && (target === "fact_atoms" || target === "material_facts") &&
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
  /** DOC 222 §2.5 — a settled hook carries a verified pinpoint. */
  readonly pinpoint_present?: boolean;
  /** DOC 222 §2.1 — a conditional hook carries its proposition split. */
  readonly proposition_split_present?: boolean;
  /** Verification errors outstanding on the draft (any → not settled). */
  readonly verification_errors?: number;
}

export interface SettleDecision {
  readonly hook_status: HookStatus | null; // null → leave as is (more rounds available)
  readonly reasons: string[];
}

export function settleDecision(input: SettleInput): SettleDecision {
  const reasons: string[] = [];
  if (!input.substring_checks_passed) reasons.push("substring_checks_failed");
  if (!input.vocabulary_checks_passed) reasons.push("vocabulary_checks_failed");
  if ((input.verification_errors ?? 0) > 0) reasons.push("verification_errors_outstanding");
  if (input.objections.some((o) => o.severity === "block")) reasons.push("blocking_objection_outstanding");
  const distinguishable = input.outcome_posture === "accepted" || input.not_distinguishable ||
    input.distinguishing_atoms.length > 0;
  if (!distinguishable) reasons.push("no_distinguishing_atom_on_a_non_accepted_posture");
  if (input.pinpoint_present === false) reasons.push("pinpoint_missing");
  if (input.outcome_posture === "conditional" && input.proposition_split_present === false) reasons.push("proposition_split_missing");

  if (reasons.length === 0) return { hook_status: "settled", reasons: [] };
  if (input.round >= 2) return { hook_status: "contested", reasons };
  return { hook_status: null, reasons };
}
