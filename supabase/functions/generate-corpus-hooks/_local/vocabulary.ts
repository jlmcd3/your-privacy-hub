// DOC 213 §2 — the CLOSED atom vocabulary a hook may be expressed in.
//
// Pure. No I/O. `parseAtom` (the canonical grammar) is the only parser; this
// module decides membership only. An atom outside this vocabulary is never
// written to a hook row — it fails `vocabulary_checks_passed`.

import { parseAtom } from "./hooks-gate.ts";
import type { HookProductVocabulary } from "./product-registry.ts";
import { DPIA_REASON_SLUG_LIST } from "./product-registry.ts";
import { cppaAdmtContract } from "../../_shared/intake-contracts/cppa-admt.ts";
import type { IntakeContract } from "../../_shared/intake-contracts/types.ts";

// ── DOC 241 (2026-09-09, V3 gap closure) — ADMT and DPIA `state:` paths ────
//
// Both product builds left this file untouched ("vocabulary.ts is off-limits
// to the product builds" — doc 235 §8 / doc 232) and disclosed the gap: every
// ADMT `state:intake.*` atom and every DPIA `state:intake.reasons_to_conduct.*`
// atom was rejected by `checkAtom` below ("state path is not in the hook
// vocabulary"). Doc 236 wrote notice-content/01 live with
// `vocabulary_checks_passed = false` for exactly that reason. The entries are
// generated, not retyped:
//   - ADMT: the seven closed-list intake fields ADMT_ATOM_PHRASES
//     (run-admt-checker-v2/_local/corpus/maps/admt-hooks.ts) already phrases
//     and rule-states.ts's INTAKE_STATE_PATHS already populates; each option
//     list is READ OFF the intake contract (`cppaAdmtContract`, the same
//     object the form-parity tests pin), so this vocabulary cannot drift
//     from the form.
//   - DPIA: every `reasons_to_conduct` slug in DPIA_REASON_SLUG_LIST (the
//     closed list doc 232 added to product-registry.ts), admitting exactly
//     `true`/`false` — the two values DPIA_ATOM_PHRASES phrases for each.
// `STATE_ATOM_ENUMS` stays ONE FLAT, product-unscoped dict (the pre-existing
// design doc 237 flagged for a CEO ruling — unchanged here); the ownership
// lists below exist so each product's phrase-coverage test can scope to its
// own paths, exactly as RISK_ONLY_STATE_ATOM_PATHS already does.

/** The ADMT intake-contract keys whose closed options become `state:intake.<key>` paths. */
const ADMT_STATE_CONTRACT_KEYS: readonly string[] = [
  "human_review",
  "admt_detail.solely_advertising",
  "notice_has_specific_purpose",
  "notice_has_opt_out_desc",
  "access_response_timeline",
  "admt_detail.hi_authority_override",
  "admt_detail.nondiscrimination_testing",
];

/** The contract's VERBATIM option list for `key`, or a loud failure — a
 *  silent empty list would make every atom on that path unverifiable. */
function contractOptions(contract: IntakeContract, key: string): readonly string[] {
  const field = contract.fields.find((f) => f.key === key);
  if (!field || !field.options || field.options.length === 0) {
    throw new Error(`vocabulary.ts: intake contract has no closed options for "${key}"`);
  }
  return field.options;
}

function admtStateEnums(): Record<string, readonly string[]> {
  const out: Record<string, readonly string[]> = {};
  for (const key of ADMT_STATE_CONTRACT_KEYS) out[`intake.${key}`] = contractOptions(cppaAdmtContract, key);
  return out;
}

function dpiaStateEnums(): Record<string, readonly string[]> {
  const out: Record<string, readonly string[]> = {};
  for (const slug of DPIA_REASON_SLUG_LIST) out[`intake.reasons_to_conduct.${slug}`] = ["true", "false"];
  return out;
}

/** Closed option sets for the `state:intake.` paths doc 213 admits. */
export const STATE_ATOM_ENUMS: Readonly<Record<string, readonly string[]>> = {
  "intake.balancing_details.opt_out_available": [
    "Yes — unconditional, on request, with no consequence",
    "Yes — but conditional or subject to review",
    "No opt-out is available",
  ],
  "intake.balancing_details.special_category_data": ["true", "false"],
  "intake.balancing_details.children_data_subjects": ["true", "false"],
  "intake.balancing_details.art9_condition": [
    "Explicit consent (Art. 9(2)(a))",
    "Employment, social security or social protection law (Art. 9(2)(b))",
    "Vital interests (Art. 9(2)(c))",
    "Not-for-profit body's legitimate activities (Art. 9(2)(d))",
    "Data manifestly made public by the individual (Art. 9(2)(e))",
    "Legal claims or judicial acts (Art. 9(2)(f))",
    "Substantial public interest (Art. 9(2)(g))",
    "Health or social care (Art. 9(2)(h))",
    "Public health (Art. 9(2)(i))",
    "Archiving, research or statistics (Art. 9(2)(j))",
    "None identified",
    "Not yet assessed",
  ],
  "intake.purpose_details.marketing_channels.automated_calls": ["true", "false"],
  "intake.purpose_details.marketing_channels.live_calls": ["true", "false"],
  "intake.purpose_details.marketing_channels.email_sms": ["true", "false"],
  "intake.purpose_details.marketing_channels.post": ["true", "false"],
  "intake.purpose_details.marketing_channels.online_advertising": ["true", "false"],
  "intake.purpose_details.marketing_channels.none": ["true", "false"],
  "intake.necessity_details.achievable_without_personal_data": [
    "Yes — the purpose could be achieved without personal data, or with anonymised or synthetic data",
    "No — personal data is required (explain why below)",
    "Not assessed",
  ],
  // CLOSED 2026-09-07 (doc 213 Track H2 review): the intake's own control is
  // a closed <select> (src/pages/LIAssessmentIntake.tsx, "What type of
  // interest is this?"), so the path is closed here too — every option has a
  // ratified phrase in the LIA hook map (LIA_ATOM_PHRASES), and an open value
  // would have no phrase to render.
  "intake.purpose_details.interest_type": [
    "Commercial / revenue-related",
    "Operational / service delivery",
    "Security / fraud prevention",
    "Legal / regulatory compliance",
    "Public interest / societal benefit",
    "Research / product improvement",
    "Political / electoral campaigning",
    "Other (describe below)",
  ],

  // DOC 231A (2026-09-08) — CPPA Risk `state:intake.*` entries. Every value
  // below is a closed-list option on the CPPA Risk intake contract
  // (_shared/intake-contracts/cppa-risk-assessment.ts); the entries
  // themselves were drafted by the prior doc231 build session and left
  // ready-to-copy in run-cppa-risk-assessment-v2/_local/corpus/maps/
  // risk-hooks.ts's atom-phrase comment block (RISK_ATOM_PHRASES already
  // carries a ratified-DRAFT phrase for every option here — see that file).
  // Closing NEED #7 (doc 231 build log §13 item 7): a `state:` atom a CPPA
  // Risk hook draft uses was rejected by `checkAtom` until these landed.
  "intake.processing_status": ["Planned", "Ongoing", "Discontinued"],
  "intake.q15_sensitive_pi": ["Yes", "No", "Unsure"],
  "intake.q5b_profiling_observation": ["Yes", "No"],
  "intake.q18_admt_use": ["Yes", "No", "In evaluation"],
  "intake.q5_sell_share": [
    "Yes — sell only",
    "Yes — share for advertising only",
    "Both",
    "No",
  ],
  "intake.q15b_under16_knowledge": [
    "Yes — we knowingly process under-16 data",
    "No — we do not knowingly process under-16 data",
    "Unsure",
  ],

  // DOC 241 — ADMT (seven paths, options read off cppaAdmtContract) and DPIA
  // (seventeen `reasons_to_conduct` slugs × true/false); see the header note.
  ...admtStateEnums(),
  ...dpiaStateEnums(),
};

/** DOC 241 — the ADMT-owned `STATE_ATOM_ENUMS` keys (`intake.<contract key>`),
 *  the ADMT twin of RISK_ONLY_STATE_ATOM_PATHS. Read by
 *  tests/edge/corpus/doc237-admt-vocabulary-phrase-coverage.test.ts and by the
 *  LIA coverage test's exclusion list. */
export const ADMT_ONLY_STATE_ATOM_PATHS: readonly string[] = ADMT_STATE_CONTRACT_KEYS.map((key) => `intake.${key}`);

/** DOC 241 — the DPIA-owned `STATE_ATOM_ENUMS` keys
 *  (`intake.reasons_to_conduct.<slug>`), one per DPIA_REASON_SLUG_LIST entry. */
export const DPIA_ONLY_STATE_ATOM_PATHS: readonly string[] = DPIA_REASON_SLUG_LIST.map((slug) => `intake.reasons_to_conduct.${slug}`);

/** DOC 231A — the six `STATE_ATOM_ENUMS` keys above that belong to the CPPA
 *  Risk product. `STATE_ATOM_ENUMS` stays ONE FLAT, product-unscoped dict —
 *  `checkAtom`'s `"state"` case (below) does not consult the registry for
 *  this atom kind, a pre-existing design this build does not change — so a
 *  test asserting "every atom the LIA drafter may emit has a ratified
 *  phrase" (tests/edge/corpus/doc213-vocabulary-phrase-coverage.test.ts)
 *  needs an explicit ownership list to exclude the other product's paths,
 *  rather than inferring it from `HookProductVocabulary.state_roots` (both
 *  products' roots include the bare `"intake."` prefix, so a prefix filter
 *  cannot disambiguate). Named and exported so that test reads it instead of
 *  hand-duplicating this list. */
export const RISK_ONLY_STATE_ATOM_PATHS: readonly string[] = [
  "intake.processing_status",
  "intake.q15_sensitive_pi",
  "intake.q5b_profiling_observation",
  "intake.q18_admt_use",
  "intake.q5_sell_share",
  "intake.q15b_under16_knowledge",
];

/** `state:` paths admitted with an open value (no closed option set).
 *  EMPTY by design: a hook atom must have a ratified phrase to render, and a
 *  phrase can only be ratified for a closed option
 *  (tests/edge/corpus/doc213-vocabulary-phrase-coverage.test.ts pins this). */
export const OPEN_STATE_PATHS: readonly string[] = [];

export interface AtomCheck {
  readonly ok: boolean;
  readonly error?: string;
}

/**
 * A hook atom is one of: flag / class / relationship / data_category /
 * instrument / state. `verdict:` atoms are REFUSED — a hook never sees, and
 * never speaks about, the engine's verdict on a customer record.
 */
export function checkAtom(atom: string, registry: HookProductVocabulary): AtomCheck {
  let parsed;
  try {
    parsed = parseAtom(atom);
  } catch (e) {
    return { ok: false, error: `atom "${atom}" does not parse: ${(e as Error).message}` };
  }
  const vocabulary = registry.typed_state_vocabulary;
  const inSet = (list: readonly string[]) => list.includes(parsed.key);
  switch (parsed.kind) {
    case "flag":
      return inSet(vocabulary.flags) ? { ok: true } : { ok: false, error: `atom "${atom}": unknown flag` };
    case "class":
      return inSet(vocabulary.classes) ? { ok: true } : { ok: false, error: `atom "${atom}": unknown class` };
    case "relationship":
      return inSet(vocabulary.relationships)
        ? { ok: true }
        : { ok: false, error: `atom "${atom}": unknown relationship` };
    case "data_category":
      return inSet(vocabulary.data_categories)
        ? { ok: true }
        : { ok: false, error: `atom "${atom}": unknown data category` };
    case "instrument":
      return registry.instrument_scope.includes(parsed.key)
        ? { ok: true }
        : { ok: false, error: `atom "${atom}": instrument is not in scope for this product` };
    case "verdict":
      return { ok: false, error: `atom "${atom}": verdict atoms are never admitted in a hook` };
    case "state": {
      const options = STATE_ATOM_ENUMS[parsed.key];
      if (options) {
        return options.includes(parsed.value ?? "")
          ? { ok: true }
          : { ok: false, error: `atom "${atom}": value is not one of the closed options for this path` };
      }
      if (OPEN_STATE_PATHS.includes(parsed.key)) return { ok: true };
      return { ok: false, error: `atom "${atom}": state path is not in the hook vocabulary` };
    }
    default:
      return { ok: false, error: `atom "${atom}": unsupported atom kind` };
  }
}

export function checkAtoms(atoms: readonly string[], registry: HookProductVocabulary): string[] {
  const errors: string[] = [];
  for (const atom of atoms) {
    const check = checkAtom(atom, registry);
    if (!check.ok) errors.push(check.error!);
  }
  return errors;
}

/** The vocabulary, rendered for a prompt. Closed lists, verbatim. */
export function vocabularyBlock(registry: HookProductVocabulary): string {
  const v = registry.typed_state_vocabulary;
  const lines: string[] = [];
  lines.push("CLOSED ATOM VOCABULARY — an atom outside this list is rejected by code.");
  lines.push(`flag:<x> where x ∈ ${JSON.stringify(v.flags)}`);
  lines.push(`class:<x> where x ∈ ${JSON.stringify(v.classes)}`);
  lines.push(`relationship:<x> where x ∈ ${JSON.stringify(v.relationships)}`);
  lines.push(`data_category:<x> where x ∈ ${JSON.stringify(v.data_categories)}`);
  lines.push(`instrument:<x> where x ∈ ${JSON.stringify(registry.instrument_scope)}`);
  lines.push("state:<path>=<value> where path and value are exactly one of:");
  for (const [path, options] of Object.entries(STATE_ATOM_ENUMS)) {
    lines.push(`  state:${path}= one of ${JSON.stringify(options)}`);
  }
  for (const path of OPEN_STATE_PATHS) {
    lines.push(`  state:${path}=<free value taken from the source>`);
  }
  lines.push("verdict: atoms are FORBIDDEN. No customer record and no engine verdict is ever shown to you or written by you.");
  return lines.join("\n");
}
