// DOC 213 §2 — prompt construction and the structured-output schema.
//
// Pure. No I/O other than the SubtleCrypto digest used to stamp prompt and
// schema hashes onto the persisted row.

import type { HookProductVocabulary } from "./product-registry.ts";
import { vocabularyBlock } from "./vocabulary.ts";

export const DIRECTION_MATRIX_BLOCK = [
  "DIRECTION MATRIX (how a settled hook is later printed — you never print it yourself):",
  "  accepted + same facts            → supports",
  "  accepted + different facts       → omit",
  "  rejected/conditional + same      → cuts against (applied only when the engine's verdict on that factor",
  "                                     fails or is uncertain; under a pass it is never printed and raises a",
  "                                     rule_missing flag)",
  "  rejected/conditional + different → cuts against but distinguished (needs a distinguishing atom on the record)",
  "  contested                        → noted as a boundary",
  "  required_atoms not held          → not nominated",
].join("\n");

export interface ProfileForHook {
  readonly id: string;
  readonly product: string;
  readonly source_table: string;
  readonly source_row_id: string;
  readonly extracted_quote: string | null;
  readonly outcome_posture: string | null;
  readonly factor_ids: readonly string[] | null;
  readonly use_case_class: string | null;
  readonly flags: readonly string[] | null;
  readonly instrument: string | null;
  readonly curation_note: string | null;
  readonly pipeline_stage: string | null;
  /** enforcement_actions only. */
  readonly regulator?: string | null;
  readonly subject?: string | null;
  readonly decision_date?: string | null;
  readonly case_reference?: string | null;
}

export function profileBlock(profile: ProfileForHook): string {
  const lines = [
    `profile_id: ${profile.id}`,
    `source: ${profile.source_table} / ${profile.source_row_id}`,
    `extracted_quote: ${JSON.stringify(profile.extracted_quote ?? "")}`,
    `outcome_posture: ${profile.outcome_posture ?? "unknown"}`,
    `factor_ids: ${JSON.stringify(profile.factor_ids ?? [])}`,
    `use_case_class: ${profile.use_case_class ?? "null"}`,
    `flags: ${JSON.stringify(profile.flags ?? [])}`,
    `instrument: ${profile.instrument ?? "null"}`,
  ];
  if (profile.source_table === "enforcement_actions") {
    lines.push(
      `regulator: ${profile.regulator ?? "unknown"}`,
      `subject: ${profile.subject ?? "unknown"}`,
      `decision_date: ${profile.decision_date ?? "unknown"}`,
      `case_reference: ${profile.case_reference ?? "unknown"}`,
    );
  }
  return lines.join("\n");
}

export function draftSchema(profileId: string): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "profile_id", "fact_atoms", "distinguishing_atoms", "not_distinguishable", "required_atoms",
      "finding_span", "fact_pattern_paraphrase", "finding_paraphrase", "trigger_terms", "abstain_reason",
    ],
    properties: {
      profile_id: { enum: [profileId] },
      fact_atoms: { type: "array", items: { type: "string" }, maxItems: 6 },
      distinguishing_atoms: { type: "array", items: { type: "string" }, maxItems: 4 },
      not_distinguishable: { type: "boolean" },
      required_atoms: { type: "array", items: { type: "string" }, maxItems: 3 },
      finding_span: { type: "string", maxLength: 400 },
      fact_pattern_paraphrase: { type: "string", maxLength: 220 },
      finding_paraphrase: { type: "string", maxLength: 220 },
      trigger_terms: { type: "array", items: { type: "string" }, maxItems: 8 },
      abstain_reason: {
        enum: ["none", "quote_states_no_finding", "facts_not_in_atom_vocabulary", "posture_unclear"],
      },
    },
  };
}

export const DRAFT_SYSTEM = [
  "You build ANALOGY HOOKS over a corpus of privacy authorities. A hook records, in a closed",
  "vocabulary, the fact pattern an authority decided and the finding it made, so that a later",
  "deterministic engine can decide whether a record is analogous.",
  "",
  "You never see a customer record and you never see any verdict. You describe the AUTHORITY only.",
  "",
  "RULES",
  "  fact_atoms            — facts the authority itself had before it, expressed as vocabulary atoms.",
  "  distinguishing_atoms  — atoms that, if a later record holds them, make it materially different.",
  "  not_distinguishable   — true only when no material distinction is possible.",
  "  required_atoms        — atoms a record MUST hold for the hook to be nominated at all.",
  "  finding_span          — a VERBATIM substring of the supplied quote (or, where the profile was",
  "                          curated by a human, of the supplied source excerpt) stating the finding.",
  "  paraphrases           — ≤ 30 words each, no square brackets, plain prose.",
  "  trigger_terms         — literal words likely to appear in a record describing this fact pattern.",
  "  abstain_reason        — 'none' unless the quote states no finding, the facts fall outside the",
  "                          vocabulary, or the posture is unclear. Abstaining is correct behaviour.",
].join("\n");

export function draftUserPrompt(
  profile: ProfileForHook,
  excerpt: string,
  registry: HookProductVocabulary,
): string {
  return [
    "PROFILE",
    profileBlock(profile),
    "",
    "SOURCE EXCERPT (verbatim, truncated)",
    excerpt,
    "",
    vocabularyBlock(registry),
    "",
    DIRECTION_MATRIX_BLOCK,
    "",
    "Return the JSON object required by the schema. Nothing else.",
  ].join("\n");
}

export const CRITIQUE_SYSTEM = [
  "You are an adversarial reviewer of ANALOGY HOOKS drafted over privacy authorities.",
  "Your single job: find the record on which this hook would MISFIRE.",
  "You never propose a hook of your own and you never see the drafter's reasoning.",
  "",
  "Return JSON only:",
  '{"hook_id":"...","verdict":"no_objection"|"objections","objections":[{"code":"...","target":"...","index":null|number,"source_span":null|"...","severity":"block"|"warn"}]}',
  "",
  "code ∈ finding_span_not_a_finding, finding_span_overstates_width, fact_atom_not_in_source,",
  "       fact_atom_is_legal_conclusion, distinguishing_atom_immaterial, distinguishing_atom_missing,",
  "       posture_mismatch, settledness_overclaim, atom_not_in_vocabulary, trigger_term_overbroad",
  "target ∈ finding_span, fact_atoms, distinguishing_atoms, required_atoms, trigger_terms, settledness, paraphrase",
  "A source_span, when given, MUST be a verbatim substring of the supplied source excerpt.",
  "",
  "ATOM KINDS — READ BEFORE OBJECTING.",
  "An atom prefixed `state:` describes the CUSTOMER RECORD this hook will be matched",
  "against (a field of the intake), NOT a fact the authority states. It is normal and",
  "correct for a `state:` atom to restate an accepted `flag:` or `class:` atom.",
  "NEVER raise fact_atom_not_in_source (or any other source-presence objection)",
  "against a `state:` atom. Source-presence objections apply only to atoms that",
  "assert something the authority itself must say.",
].join("\n");

export function critiqueUserPrompt(
  hook: Record<string, unknown>,
  excerpt: string,
  registry: HookProductVocabulary,
): string {
  return [
    "DRAFT HOOK",
    JSON.stringify(hook, null, 2),
    "",
    "SOURCE EXCERPT (verbatim, truncated)",
    excerpt,
    "",
    vocabularyBlock(registry),
    "",
    DIRECTION_MATRIX_BLOCK,
    "",
    "Return the JSON object. Nothing else.",
  ].join("\n");
}

export function reviseUserPrompt(hook: Record<string, unknown>, objections: unknown): string {
  return [
    "CURRENT HOOK",
    JSON.stringify(hook, null, 2),
    "",
    "OBJECTIONS RAISED AGAINST IT",
    JSON.stringify(objections, null, 2),
    "",
    "Revise the hook to answer every blocking objection. Return the JSON object required by the schema.",
  ].join("\n");
}

export async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
