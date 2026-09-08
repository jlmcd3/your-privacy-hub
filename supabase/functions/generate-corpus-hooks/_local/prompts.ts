// DOC 213 §2 — prompt construction and the structured-output schema, as
// amended by DOC 222 (hooks contract v2, 2026-09-08): the drafter now
// produces material facts with reasons and spans, polarity-aware
// distinguishing pairs, a structured pinpoint, and — for a `conditional`
// source — the proposition split (what the authority recognises, and the
// condition it attaches), each anchored to a verbatim span. Every safeguard
// the CEO ratified is a FIELD here and a CHECK in verify.ts; none is a
// manual step.
//
// Pure. No I/O other than the SubtleCrypto digest used to stamp prompt and
// schema hashes onto the persisted row.

import type { HookProductVocabulary } from "./product-registry.ts";
import { vocabularyBlock } from "./vocabulary.ts";

export const DIRECTION_MATRIX_BLOCK = [
  "DIRECTION MATRIX (how a settled hook is later printed — you never print it yourself):",
  "  accepted + same facts              → supports",
  "  accepted + different facts         → omit",
  "  conditional + same facts           → 'recognised, condition unresolved' (S5a); the engine's own",
  "                                       pass, with the condition atoms held, is what makes S5b",
  "  conditional + different facts      → 'the guidance is silent' (S6); 'does not extend' (S6x) ONLY",
  "                                       where the source EXPRESSLY excludes, with a verified span",
  "  rejected + same                    → cuts against (only under a failing / uncertain verdict;",
  "                                       under a pass it is never printed and raises rule_missing)",
  "  rejected + different (a pair holds)→ cuts against but distinguished, rendered from the PAIR",
  "  contested (R4) + same facts        → noted as a boundary; on different facts, omitted",
  "  required_atoms not held            → not nominated",
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

export const ABSTAIN_REASONS_V2 = [
  "none",
  "quote_states_no_finding",
  "facts_not_in_atom_vocabulary",
  "posture_unclear",
  "pinpoint_unlocatable",
] as const;

export function draftSchema(profileId: string): Record<string, unknown> {
  const span = { type: ["string", "null"] };
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "profile_id", "material_facts", "distinguishing_pairs", "not_distinguishable", "required_atoms",
      "finding_span", "fact_pattern_paraphrase", "finding_paraphrase", "trigger_terms", "abstain_reason",
      "recognised_proposition", "recognised_span", "condition_text", "condition_span", "condition_atoms",
      "pinpoint",
    ],
    properties: {
      profile_id: { enum: [profileId] },
      material_facts: {
        type: "array",
        maxItems: 6,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["atom", "materiality_reason", "source_span"],
          properties: {
            atom: { type: "string" },
            materiality_reason: { type: "string", maxLength: 200 },
            source_span: span,
          },
        },
      },
      distinguishing_pairs: {
        type: "array",
        maxItems: 4,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["source_fact_span", "source_polarity", "record_atom", "record_polarity", "why_material", "source_expressly_excludes", "exclusion_span", "exclusion_paraphrase"],
          properties: {
            source_fact_span: { type: "string", maxLength: 400 },
            source_polarity: { enum: ["present", "absent"] },
            record_atom: { type: "string" },
            record_polarity: { enum: ["present", "absent"] },
            why_material: { type: "string", maxLength: 300 },
            source_expressly_excludes: { type: "boolean" },
            exclusion_span: span,
            exclusion_paraphrase: span,
          },
        },
      },
      not_distinguishable: { type: "boolean" },
      required_atoms: { type: "array", items: { type: "string" }, maxItems: 3 },
      finding_span: { type: "string", maxLength: 400 },
      fact_pattern_paraphrase: { type: "string", maxLength: 320 },
      finding_paraphrase: { type: "string", maxLength: 320 },
      trigger_terms: { type: "array", items: { type: "string" }, maxItems: 8 },
      abstain_reason: { enum: [...ABSTAIN_REASONS_V2] },
      recognised_proposition: span,
      recognised_span: span,
      condition_text: span,
      condition_span: span,
      condition_atoms: { type: ["array", "null"], items: { type: "string" }, maxItems: 4 },
      pinpoint: {
        type: ["object", "null"],
        additionalProperties: false,
        required: ["kind", "ref", "anchor_span"],
        properties: {
          kind: { enum: ["paragraph", "section", "page", "recital", "heading"] },
          ref: { type: "string", maxLength: 80 },
          anchor_span: { type: "string", maxLength: 400 },
        },
      },
    },
  };
}

export const DRAFT_SYSTEM = [
  "You build ANALOGY HOOKS over a corpus of privacy authorities. A hook records, in a closed",
  "vocabulary, the fact pattern an authority decided and the finding it made, so that a later",
  "deterministic engine can decide whether a record is analogous. A lawyer stamps every hook",
  "from rendered samples; code rejects anything below that cannot be verified against the source.",
  "",
  "You never see a customer record and you never see any verdict. You describe the AUTHORITY only.",
  "",
  "FIELDS",
  "  material_facts        — the facts the authority itself had before it, each as ONE vocabulary atom",
  "                          with a one-line reason it is legally material and a VERBATIM source span",
  "                          (span may be null only for a state: atom, which describes the record side).",
  "                          At most 6; never an instrument: atom; never two atoms for one fact.",
  "  distinguishing_pairs  — hook-specific, polarity-aware pairs: the source's own fact (verbatim span,",
  "                          present/absent), the record atom whose presence/absence distinguishes, why",
  "                          it matters legally. source_expressly_excludes is true ONLY where the source",
  "                          itself excludes that situation — then give the verbatim exclusion_span and",
  "                          a clause-form exclusion_paraphrase; otherwise both null.",
  "  not_distinguishable   — true only when no material distinction is possible.",
  "  required_atoms        — atoms a record MUST hold for the hook to be nominated at all.",
  "  finding_span          — a VERBATIM substring of the supplied quote (or, where the profile was",
  "                          curated by a human, of the supplied source excerpt) stating the finding.",
  "  pinpoint              — where the finding sits: kind (paragraph / section / page / recital /",
  "                          heading), ref (e.g. \"20\", \"II.B\"), and a VERBATIM anchor_span from the",
  "                          excerpt at that place. If you cannot locate it, set pinpoint null and",
  "                          abstain_reason 'pinpoint_unlocatable' — never guess a number.",
  "  recognised_proposition / recognised_span, condition_text / condition_span, condition_atoms —",
  "                          for a CONDITIONAL source only (an authority that says X may qualify IF Y):",
  "                          the proposition it recognises, and the condition it attaches, each a clause",
  "                          anchored to a verbatim span; condition_atoms are record atoms that, if all",
  "                          held, satisfy the condition — null when the condition is a legal judgment",
  "                          (e.g. 'strictly necessary'), not a fact. Null for other postures.",
  "",
  "CLAUSE FORM (every paraphrase, proposition and condition; code enforces):",
  "  - a clause, not a sentence: lower-case start unless a proper noun; no trailing period; no",
  "    internal period; no brackets, ellipsis or quotation marks; reads after 'found that where …';",
  "  - PRESERVE EVERY QUALIFIER in the span you paraphrase — could, may, might, only, only where,",
  "    strictly, necessary, proportionate, case-by-case, in principle, cannot be ruled out, not",
  "    excluded, subject to, provided that, unless, rarely, generally — a paraphrase whose legal scope",
  "    is broader than its source is rejected;",
  "  - every paraphrase, proposition and condition must be less than 60 words; accuracy wins over length.",
  "",
  "  trigger_terms         — literal words likely to appear in a record describing this fact pattern.",
  "  abstain_reason        — 'none' unless the quote states no finding, the facts fall outside the",
  "                          vocabulary, the posture is unclear, or the pinpoint cannot be located.",
  "                          Abstaining is correct behaviour.",
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
  "Your single job: find the record on which this hook would MISFIRE, or the way this hook",
  "overstates its source.",
  "You never propose a hook of your own and you never see the drafter's reasoning.",
  "",
  "Return JSON only:",
  '{"hook_id":"...","verdict":"no_objection"|"objections","objections":[{"code":"...","target":"...","index":null|number,"source_span":null|"...","severity":"block"|"warn"}]}',
  "",
  "code ∈ finding_span_not_a_finding, finding_span_overstates_width, fact_atom_not_in_source,",
  "       fact_atom_is_legal_conclusion, fact_immaterial, material_fact_missing,",
  "       distinguishing_pair_immaterial, distinguishing_pair_missing, exclusion_overclaim,",
  "       proposition_not_in_source, proposition_broader_than_source, condition_omitted,",
  "       condition_narrowed, condition_atoms_overclaim, paraphrase_broader_than_source,",
  "       pinpoint_wrong, posture_mismatch, settledness_overclaim, atom_not_in_vocabulary,",
  "       trigger_term_overbroad",
  "target ∈ finding_span, material_facts, distinguishing_pairs, required_atoms, trigger_terms,",
  "         settledness, paraphrase, proposition, condition, pinpoint",
  "A source_span, when given, MUST be a verbatim substring of the supplied source excerpt.",
  "",
  "ATOM KINDS — READ BEFORE OBJECTING.",
  "An atom prefixed `state:` describes the CUSTOMER RECORD this hook will be matched",
  "against (a field of the intake), NOT a fact the authority states. It is normal and",
  "correct for a `state:` atom to restate an accepted `flag:` or `class:` atom.",
  "NEVER raise fact_atom_not_in_source (or any other source-presence objection)",
  "against a `state:` atom. Source-presence objections apply only to atoms that",
  "assert something the authority itself must say.",
  "",
  "LEGAL ACCURACY IS YOURS: code checks shape and spans; you check that every paraphrase,",
  "proposition and condition is no broader than its span, that every material fact the",
  "authority relied on is present (children, special-category data, scale, an opt-out —",
  "wherever the authority made them matter), that a pair's record atom really distinguishes,",
  "and that 'expressly excludes' is only claimed where the source says so.",
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
