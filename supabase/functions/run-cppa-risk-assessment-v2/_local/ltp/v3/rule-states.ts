// DOC 213 §0 / DOC 231 — CPPA RISK'S TypedStateBag BUILDER.
//
// Pure `buildRiskRuleStates(intake)`: projects the CPPA Risk intake record
// (supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts)
// onto the SAME atom grammar every hook's `fact_atoms` /
// `distinguishing_atoms` / `required_atoms` are drawn from
// (_shared/corpus/rule-types.ts `TypedStateBag` / `evaluateAtom`) — the
// hook-vocabulary analog of LIA's `buildLiaRuleStates`.
//
// FILE NAME IS LOAD-BEARING: `rule-states.ts` is one of the path shapes
// tests/edge/corpus/corpus-relevance-rule-boundary.test.ts's
// `RULE_INTERPRETER_ALLOWED_IMPORTERS` admits to import
// `_shared/corpus/rule-types.ts` (the regex matches any path ENDING in
// `/rule-states.ts`, so this file's directory does not matter, only its
// basename) — the same door LIA's own rule-states.ts uses. Do not rename.
//
// SCOPE (doc 231, honestly narrowed from doc 229 §1's full field list):
// only CLOSED-LIST fields are projected into flags / data_categories /
// state: values here — free-text narrative fields are never atom sources
// (an atom must be a closed value; that's what makes it hook-safe). The
// FREE-TEXT fields doc 229 §1 lists are read separately, as the two-leg
// selection's raw ANSWER text (v3/field-labels.ts `riskV3Answer`), never
// turned into an atom.
//
// [NEEDS] (documented in doc 231, not silently guessed):
//   - `use_case_class` is always null: CPPA Risk has no activity
//     classifier equivalent to LIA's `_shared/lia/lia-use-case-classifier.ts`.
//     A hook whose `required_atoms` includes a `class:` atom can never be
//     nominated until one is built.
//   - `relationship` is always null: CPPA Risk's intake has no closed
//     relationship-to-subject field (LIA's `relationship:` atoms have no
//     analog here); the `relationships` vocabulary is left empty in the
//     generate-corpus-hooks registry entry for the same reason.

import type { TypedStateBag } from "../../../../_shared/corpus/rule-types.ts";
export type { TypedStateBag };

type Bag = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/**
 * Build the typed state bag CPPA Risk hooks are evaluated against. Never
 * throws: a malformed or absent intake field is simply absent from the
 * bag (an absent `state:` path never matches — rule-types.ts's own Law B2).
 */
export function buildRiskRuleStates(intake: Bag | null | undefined): TypedStateBag {
  const record = intake ?? {};
  const flags: string[] = [];
  const states: Record<string, string | number | boolean | null> = {};

  const q15 = str(record.q15_sensitive_pi);
  if (q15) states["intake.q15_sensitive_pi"] = q15;
  if (q15 === "Yes") flags.push("sensitive_pi");

  const q5b = str(record.q5b_profiling_observation);
  if (q5b) states["intake.q5b_profiling_observation"] = q5b;
  if (q5b === "Yes") flags.push("profiling_or_systematic_observation");

  const q18 = str(record.q18_admt_use);
  if (q18) states["intake.q18_admt_use"] = q18;
  if (q18 === "Yes" || q18 === "In evaluation") flags.push("admt_use");

  const q5 = str(record.q5_sell_share);
  if (q5) states["intake.q5_sell_share"] = q5;
  if (q5 && q5 !== "No") flags.push("sell_or_share");

  const q15b = str(record.q15b_under16_knowledge);
  if (q15b) states["intake.q15b_under16_knowledge"] = q15b;
  if (q15b.startsWith("Yes")) flags.push("under16_data");

  const q3 = str(record.q3_sector);
  if (q3) states["intake.q3_sector"] = q3;

  const status = str(record.processing_status);
  if (status) states["intake.processing_status"] = status;

  const dataCategories = strArray(record.q4_pi_categories);
  if (dataCategories.includes("Biometric information")) flags.push("biometric_data");
  if (dataCategories.includes("Children's data (under 16)")) flags.push("children_data");

  return {
    instrument: "CPPA Regulations",
    use_case_class: null, // [NEEDS] — see file header
    relationship: null, // [NEEDS] — see file header
    data_categories: dataCategories,
    flags,
    verdicts: {}, // unused — the caller passes verdicts to applyRiskHooks separately (LIA's own signature shape)
    states,
  };
}
