// CPPA RISK ANALOGY HOOKS — pinned, generated file (doc 213 / doc 222 / doc
// 229 / doc 231), CPPA RISK product. Mirrors the structure of
// run-li-assessment/_local/corpus/maps/lia-hooks.ts.
//
// This file is normally the OUTPUT of `generate-corpus-hooks`'s "generate"
// action (index.ts `actionGenerate`, once the "cppa-risk" registry entry —
// doc 231 — is used). Today it is hand-seeded EMPTY, exactly as LIA's own
// map file started (doc 213): zero ratified `authority_hooks` rows exist
// yet for `product = 'cppa-risk'` (doc 229 §5.3), so there is nothing to
// project. `RISK_HOOKS_ENABLED` (risk-hooks-flag.ts) is inert while this
// array is empty regardless of its value.
//
// [RATIFY — DRAFT, UNRATIFIED; CEO MUST RATIFY BEFORE THE FLAG FLIPS]
// Everything below the hooks array — the matrix (copied as data, product-
// agnostic, unchanged from LIA's), the atom-phrase map, the sentence
// shapes, the concept-dedupe table, the factor phrases, and the source-
// status/settledness labels — is DRAFT text for this build. None of it has
// been reviewed by the CEO. The matrix rows are byte-identical to
// hook-types.ts's `directionFor` (doc 222/224) because the matrix itself is
// PRODUCT-AGNOSTIC (doc 231 build-log instruction: "copy it as data"); the
// atom phrases, shapes and factor phrases are CPPA-specific drafting this
// build authored from the § 7150–7157 obligation vocabulary, keeping every
// SLOT NAME identical to LIA's ratified shapes so the shared join logic
// (hook-join.ts) needs no CPPA-specific branches.

import type { AuthorityHook } from "../../../../_shared/corpus/hook-types.ts";

export const RISK_HOOKS_VERSION = "risk-hooks-v2-draft-2026-09-08-0";

// EXCLUDED ROWS: none — the array is hand-seeded empty; no `authority_hooks`
// row for product='cppa-risk' exists to exclude (doc 229 §5.3).
export const RISK_HOOKS: readonly AuthorityHook[] = [];

// ── [RATIFY — DRAFT] — the direction matrix (doc 213 §4 / doc 222 §3 /
// doc 224), AS DATA. Byte-identical rows to `LIA_HOOK_DIRECTION_MATRIX`
// (run-li-assessment/_local/corpus/maps/lia-hooks.ts): the matrix is a
// property of `directionFor` (hook-types.ts), which every product shares
// unmodified — a product hooks map only ever TRANSCRIBES it for a pin test
// to catch drift between the shared function and this record of it. ──────

export interface RiskHookMatrixRow {
  readonly posture: string;
  readonly fact_agreement: string;
  readonly engine_verdict: string;
  readonly shape: string;
  readonly note: string;
}

export const RISK_HOOK_DIRECTION_MATRIX: readonly RiskHookMatrixRow[] = [
  {
    posture: "accepted",
    fact_agreement: "same",
    engine_verdict: "any",
    shape: "S1 supports",
    note: "hedged to `likely` language; never lifts a verdict",
  },
  {
    posture: "accepted",
    fact_agreement: "different / unknown",
    engine_verdict: "any",
    shape: "omit",
    note: "nothing to say",
  },
  {
    posture: "conditional",
    fact_agreement: "same",
    engine_verdict: "passes, and every condition_atom holds on the record",
    shape: "S5b recognised + condition satisfied",
    note: "the engine's pass is what satisfies the condition; the hook only echoes it",
  },
  {
    posture: "conditional",
    fact_agreement: "same",
    engine_verdict: "otherwise (fails / uncertain, or condition_atoms null / not all held)",
    shape: "S5a recognised, condition unresolved",
    note: "the guidance is relevant; whether its condition is met is the factor's own finding — never asserted here",
  },
  {
    posture: "conditional",
    fact_agreement: "different (a distinguishing pair holds)",
    engine_verdict: "passes",
    shape: "omit + assessor flag `authority_not_dispositive` (`rule_missing` when the pair expressly excludes)",
    note: "a silent source under a pass is nothing missing; an express exclusion under a pass is the lawyer's rule",
  },
  {
    posture: "conditional",
    fact_agreement: "different (a distinguishing pair holds)",
    engine_verdict: "fails / uncertain",
    shape: "S6 source silent (S6x where the pair expressly excludes)",
    note: "\"does not extend\" only from an authored `source_expressly_excludes` pair with a verified exclusion span",
  },
  {
    posture: "conditional",
    fact_agreement: "unknown",
    engine_verdict: "any",
    shape: "omit",
    note: "",
  },
  {
    posture: "rejected",
    fact_agreement: "same",
    engine_verdict: "fails / uncertain",
    shape: "S2 cuts against and applied",
    note: "the verdict already reflects it",
  },
  {
    posture: "rejected",
    fact_agreement: "same",
    engine_verdict: "passes",
    shape: "omit + assessor flag `rule_missing`",
    note: "the lawyer's rule: an adverse authority on the same facts under a pass means a rule is missing — never printed as \"risk noted\"",
  },
  {
    posture: "rejected",
    fact_agreement: "different (a distinguishing pair holds)",
    engine_verdict: "any",
    shape: "S3 cuts against but distinguished",
    note: "renders only from the pair (source fact / record fact); never from an atom's generic phrase",
  },
  {
    posture: "rejected",
    fact_agreement: "unknown",
    engine_verdict: "any",
    shape: "omit",
    note: "",
  },
  {
    posture: "contested (R4)",
    fact_agreement: "same",
    engine_verdict: "any",
    shape: "S4 noted as a boundary",
    note: "prints the derived status and the appeal note; no relation drawn",
  },
  {
    posture: "contested (R4)",
    fact_agreement: "different / unknown",
    engine_verdict: "any",
    shape: "omit",
    note: "a contested decision on different facts adds nothing",
  },
  {
    posture: "any",
    fact_agreement: "unknown from atoms",
    engine_verdict: "—",
    shape: "the stored two-leg selection's agreement, if one exists; else omit + flag `selection_pending`; legs disagreed → omit + flag `selection_unsettled` (the ROO item)",
    note: "doc 224 §1: a call is made only where no stored decision exists AND the pre-filter says either answer could print",
  },
  {
    posture: "any",
    fact_agreement: "`required_atoms` not all held",
    engine_verdict: "—",
    shape: "not nominated",
    note: "",
  },
];

// ── [RATIFY — DRAFT] — the atom-phrase map. One clause per closed-list atom
// value in the CPPA Risk hook vocabulary (generate-corpus-hooks/_local/
// product-registry.ts's "cppa-risk" entry). ──────────────────────────────

export const RISK_ATOM_PHRASES: Readonly<Record<string, string>> = {
  // — flags —
  "flag:sensitive_pi": "it processes sensitive personal information",
  "flag:profiling_or_systematic_observation": "its processing involves profiling or systematic observation of consumers or employees",
  "flag:admt_use": "it uses automated decisionmaking technology in this processing",
  "flag:sell_or_share": "it sells or shares personal information",
  "flag:under16_data": "it knowingly processes the personal information of consumers under sixteen",
  "flag:biometric_data": "it processes biometric information",
  "flag:children_data": "it processes the personal information of children under sixteen",

  // — data categories (verbatim PI_CATEGORIES,
  // _shared/intake-contracts/cppa-risk-assessment.ts) —
  "data_category:Contact identifiers (name, email, phone)": "it processes contact identifiers",
  "data_category:Government identifiers (SSN, driver's license, state ID, passport number)": "it processes government identifiers",
  "data_category:Device identifiers (IP, cookies, device IDs)": "it processes device identifiers",
  "data_category:Internet or network activity": "it processes internet or network activity data",
  "data_category:Contents of mail, email, or text messages": "it processes the contents of mail, email, or text messages",
  "data_category:Precise geolocation (GPS-level / specific address)": "it processes precise geolocation data",
  "data_category:General location (city, region, ZIP, IP-derived)": "it processes general location data",
  "data_category:Financial information": "it processes financial information",
  "data_category:Account log-in or financial-account credentials": "it processes account log-in or financial-account credentials",
  "data_category:Health or medical information": "it processes health or medical information",
  "data_category:Biometric information": "it processes biometric information",
  "data_category:Genetic data": "it processes genetic data",
  "data_category:Neural data": "it processes neural data",
  "data_category:Racial or ethnic origin": "it processes information about racial or ethnic origin",
  "data_category:Religious or philosophical beliefs": "it processes information about religious or philosophical beliefs",
  "data_category:Union membership": "it processes union-membership information",
  "data_category:Sexual orientation": "it processes information about sexual orientation",
  "data_category:Gender identity": "it processes information about gender identity",
  "data_category:Citizenship or immigration status": "it processes citizenship or immigration-status information",
  "data_category:Employment information": "it processes employment information",
  "data_category:Education information": "it processes education information",
  "data_category:Children's data (under 16)": "it processes the personal information of children under sixteen",
  "data_category:Other": "it processes other categories of personal information not separately listed",

  // — instruments —
  "instrument:CPPA Regulations": "its processing is assessed under the CPPA regulations",
  "instrument:CCPA": "its processing is assessed under the CCPA",

  // — state: atoms — one phrase per closed option the hook drafter may emit
  // (generate-corpus-hooks/_local/vocabulary.ts's STATE_ATOM_ENUMS would
  // need a "cppa-risk" set of entries before a hook using one of these could
  // be DRAFTED — see doc 231 build log [NEEDS]; the phrases below are ready
  // for that day and are what the RUNTIME join already reads).
  "state:intake.processing_status=Planned": "the processing this assessment covers has not yet begun",
  "state:intake.processing_status=Ongoing": "the processing this assessment covers is ongoing",
  "state:intake.processing_status=Discontinued": "the processing this assessment covers has been discontinued",
  "state:intake.q15_sensitive_pi=Yes": "it processes sensitive personal information",
  "state:intake.q15_sensitive_pi=No": "it does not process sensitive personal information",
  "state:intake.q15_sensitive_pi=Unsure": "whether it processes sensitive personal information has not yet been assessed",
  "state:intake.q5b_profiling_observation=Yes": "its processing involves profiling or systematic observation",
  "state:intake.q5b_profiling_observation=No": "its processing does not involve profiling or systematic observation",
  "state:intake.q18_admt_use=Yes": "it uses automated decisionmaking technology",
  "state:intake.q18_admt_use=No": "it does not use automated decisionmaking technology",
  "state:intake.q18_admt_use=In evaluation": "it is evaluating whether to use automated decisionmaking technology",
  "state:intake.q5_sell_share=Yes — sell only": "it sells personal information",
  "state:intake.q5_sell_share=Yes — share for advertising only": "it shares personal information for cross-context behavioral advertising",
  "state:intake.q5_sell_share=Both": "it sells and shares personal information",
  "state:intake.q5_sell_share=No": "it does not sell or share personal information",
  "state:intake.q15b_under16_knowledge=Yes — we knowingly process under-16 data": "it knowingly processes the personal information of consumers under sixteen",
  "state:intake.q15b_under16_knowledge=No — we do not knowingly process under-16 data": "it does not knowingly process the personal information of consumers under sixteen",
  "state:intake.q15b_under16_knowledge=Unsure": "whether it processes the personal information of consumers under sixteen has not yet been assessed",
};

// ── [RATIFY — DRAFT] — the sentence shapes, CPPA §§ 7150–7157 vocabulary.
// SLOT NAMES ARE IDENTICAL to LIA's ratified shapes (doc 222 §4) so
// hook-join.ts's renderer needs no per-product branching. {section} holds a
// § 7150–7157 pinpoint (e.g. "§ 7152(a)(6)"), not a Roman numeral — the
// factor→provision map lives in doc 231's build log and in
// generate-corpus-hooks/_local/risk-factor-element.ts. ────────────────────

// DOC 238 (2026-09-09) — AMENDED, still [RATIFY — DRAFT, unratified]: same
// amendment as DPIA's own (see dpia-hooks.ts's doc comment above this same
// block for the full rationale — paragraph form, `{quote}`, optional
// `{governing_provision}` on S1–S4, forward-looking S2/S6x section pointer).
// Risk's own approved prose (doc 234) is the clearest evidence for the
// governing-provision sentence specifically: doc 234 §2.5's editorial pass
// added exactly this — "California's rule requires X (§ Y)" — BEFORE the
// cited authority, for candidates 1–4 (foreign enforcement) AND every FSOR
// candidate names its § in-sentence the same way. See doc 238 §"CPPA Risk".

export const RISK_HOOK_SHAPES: Readonly<Record<"S1" | "S2" | "S3" | "S4" | "S5a" | "S5b" | "S6" | "S6x", string>> = {
  S1:
    "The company has stated that {customer_fact}. {governing_provision}In {authority}, {regulator} {verb} that where {fact_pattern}, {finding} — in its own words, \"{quote}\". That finding supports the company's position on {factor}. Section {section} records that determination. ({citation}; {status}.)",
  S2:
    "The company has stated that {customer_fact}. {governing_provision}In {authority}, {regulator} found that where {fact_pattern}, {finding} — in its own words, \"{quote}\". That finding cuts against the company's position on {factor}. Whether that holds on this record is addressed at {section}. ({citation}; {status}.)",
  S3:
    "{governing_provision}In {authority}, {regulator} found that where {fact_pattern}, {finding} — in its own words, \"{quote}\". That finding turned on the fact that {source_fact}; on this record the company has instead stated that {record_fact}. The decision marks a boundary rather than a finding against the company. ({citation}; {status}.)",
  S4:
    "{governing_provision}In {authority}, {regulator} found that where {fact_pattern}, {finding} — in its own words, \"{quote}\". The company has stated that {customer_fact}. That decision is {status}; it is noted as a boundary and is not applied. ({citation}.)",
  S5a:
    "In {authority}, {regulator} {verb} that {proposition} — in its own words, \"{quote}\" — subject to {condition}. That guidance is relevant to the company's asserted {factor}; whether its condition is satisfied is addressed at {section}. ({citation}; {status}.)",
  S5b:
    "In {authority}, {regulator} {verb} that {proposition} — in its own words, \"{quote}\" — subject to {condition}. That guidance is relevant to the company's asserted {factor}; whether its condition is satisfied is addressed at {section}. The facts identified at {section} satisfy that stated condition. ({citation}; {status}.)",
  S6:
    "The company has stated that {record_fact}. In {authority}, {regulator} {verb} that {proposition} — in its own words, \"{quote}\" — subject to {condition}, but does not address whether a compliant risk assessment is available where {record_fact}. The conclusion at {section} therefore rests on the separately identified rules and facts, not on that guidance. ({citation}; {status}.)",
  S6x:
    "The company has stated that {record_fact}. In {authority}, {regulator} {verb} that {proposition} — in its own words, \"{quote}\" — subject to {condition}, and that {exclusion_paraphrase}; that exclusion applies to processing of the kind the company describes. Whether it applies here is addressed at {section}. ({citation}; {status}.)",
};

// ── [RATIFY — DRAFT] — concept equivalence (doc 222 §2.3): two atoms naming
// the same underlying fact share a concept; render dedupes `{customer_fact}`
// by concept. ──────────────────────────────────────────────────────────────

export const RISK_ATOM_CONCEPTS: Readonly<Record<string, string>> = {
  "flag:sensitive_pi": "sensitive_pi",
  "state:intake.q15_sensitive_pi=Yes": "sensitive_pi",
  "flag:biometric_data": "biometric",
  "data_category:Biometric information": "biometric",
  "flag:children_data": "children",
  "data_category:Children's data (under 16)": "children",
  "state:intake.q15b_under16_knowledge=Yes — we knowingly process under-16 data": "children",
  "flag:under16_data": "children",
  "flag:admt_use": "admt",
  "state:intake.q18_admt_use=Yes": "admt",
  "flag:profiling_or_systematic_observation": "profiling_observation",
  "state:intake.q5b_profiling_observation=Yes": "profiling_observation",
};

/** The concept an atom names — itself when the table has no entry. */
export function riskAtomConcept(atom: string): string {
  return RISK_ATOM_CONCEPTS[atom] ?? atom;
}

// ── [RATIFY — DRAFT] — factor phrases (doc 222 §5 pattern): the `{factor}`
// slot, without a leading article. Every one of the 17 CAM factor_id
// values (_shared/corpus/maps/risk-corpus-map.ts). ────────────────────────

export const RISK_FACTOR_PHRASES: Readonly<Record<string, string>> = {
  "Regulatory trigger and applicability": "whether a risk assessment is required for this processing",
  "Material privacy risks": "the material privacy risks this processing presents",
  "Processing purpose specificity": "the specificity of the stated processing purpose",
  "Safeguards": "the adequacy of the safeguards applied to this processing",
  "Approval and authority": "the assessment's approval and the approver's authority",
  "Stakeholder involvement and information providers": "the stakeholders and information providers involved in this assessment",
  "Processing methods and coherence": "the coherence of the processing methods described",
  "Retention": "the retention period and criteria for this processing",
  "Consumer interaction and scale": "the scale of consumer interaction this processing presents",
  "Transparency and disclosures": "the transparency and disclosures made about this processing",
  "Consumer benefit": "the benefits claimed for this processing",
  "ADMT made available to another business": "the automated decisionmaking technology made available to another business",
  "Benefits-risks balancing": "the balance between the processing's benefits and its risks",
  "Assessment timing and material changes": "the timing of this assessment relative to the processing it covers",
  "Assessment retention": "the retention of this assessment record",
  "Prior DPIA or other assessment": "any prior data protection impact assessment or other assessment of this processing",
  "CPPA submission and certifying executive": "the assessment's submission to the CPPA and its certifying executive",
};

// ── [RATIFY — DRAFT] — source status labels (doc 222 §2.7 pattern), CPPA
// framing (adapted from the CAM's own existing AP-row convention, e.g.
// risk-corpus-map.ts `ap-01`'s "persuasive only; decided under the GDPR,
// not the CCPA"). EDPB/WP29 statuses are carried for type completeness only
// — CPPA Risk has no EU-guidance-institution analog and is not expected to
// use them; every candidate in doc 229 §6 is either an `sa_decision*`
// (GDPR enforcement cited by analogy) or `regulator_guidance` (a CPPA FSOR
// position). ────────────────────────────────────────────────────────────

export const RISK_SOURCE_STATUS_LABELS: Readonly<Record<string, string>> = {
  edpb_guidelines_final: "EDPB guidelines — interpretive guidance, not binding under California law [unused today]",
  edpb_opinion: "EDPB Article 64 opinion — Board opinion, not binding under California law [unused today]",
  wp29_opinion: "Article 29 Working Party opinion — historical interpretive guidance, not binding under California law [unused today]",
  regulator_guidance: "CPPA agency guidance — non-binding on this Company beyond the regulation it interprets",
  sa_decision: "supervisory-authority decision under the GDPR — persuasive only; not binding under California law or the CPPA regulations",
  sa_decision_affirmed: "supervisory-authority decision under the GDPR, affirmed on appeal — persuasive only; not binding under California law or the CPPA regulations",
  sa_decision_appeal_pending: "under appeal",
};

// ── [RATIFY — DRAFT] — the appeal sentence, byte-mirrored from
// LIA_APPEAL_SENTENCE (run-li-assessment/_local/corpus/maps/lia-hooks.ts).
// Ratified once, product-agnostic prose (CEO ruling 2026-09-08, doc 225
// §13) — reproduced here rather than imported (cross-function-import ban;
// run-li-assessment/ is off-limits). ──────────────────────────────────────

export const RISK_APPEAL_SENTENCE = "This matter is subject to an appeal which could invalidate this ruling.";

export const RISK_SETTLEDNESS_LABELS: Readonly<Record<"R1" | "R2" | "R3" | "R4", string>> = {
  R1: "adopted guidance or settled authority",
  R2: "a settled line of decisions",
  R3: "a single supervisory authority's decision",
  R4: "under appeal / contested",
};
