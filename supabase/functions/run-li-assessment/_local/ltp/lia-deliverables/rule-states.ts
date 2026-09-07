// DOC 207 TRACK 3a — `buildLiaRuleStates(report, intake, typed)`.
//
// Adapts LIA's typed findings into the generic rule interpreter's
// `TypedStateBag` (`_shared/corpus/rule-types.ts`). Reuses
// `buildLiaRelevanceQuery` (lia-persuasive-authority.ts) for `instrument`,
// `use_case_class`, `relationship`, `data_categories` and `flags` — those
// five fields are NOT re-derived here, so the rule vocabulary's
// `flag:`/`class:`/`relationship:`/`data_category:`/`instrument:` atoms and
// the Persuasive Authority section's relevance scorer read the identical
// facts off the same record (single source of truth; doc 207 §2.1).
//
// `typed` is the JUST-BUILT `LiaTypedStage2Result` — `buildThreePartTestTyped`'s
// return value — NOT `report.three_part_test`. At the rule-pass call site
// (index.ts, inside the `LIA_DETERMINISTIC_ENABLED` block, before the typed
// result is written onto `reportData`), `report.three_part_test` still
// carries whatever the legacy Stage-2 placeholder held; the fresh verdicts
// live only on `typed` until the write happens. Every OTHER typed finding
// this file reads (`child_factor`, `public_authority_exclusion`, ...) IS
// already attached to `report` by that point — `attachLiaDeliverables`,
// `attachLiaUpgrade4` and `attachPrecedentClassPosture` all run earlier in
// the same request, ahead of the typed three-part-test block.
//
// KNOWN LIMITATION (documented for 207A, not fixed here): `flags` comes from
// `buildLiaRelevanceQuery`, which derives `eprivacy_terminal_equipment` from
// `report.engagement_map` — built LATER in index.ts's pipeline (after the
// typed block runs). At the point rule-pass runs, `report.engagement_map`
// is not yet set, so a rule keyed on `flag:eprivacy_terminal_equipment` can
// never fire today. None of the doc 206B W1-W7 worksheets use that atom; a
// future rule that needs it requires either moving the rule-pass call site
// after the engagement-map build, or re-deriving the flag directly from
// `eprivacy_short_circuit.determination` (itself already read as a `state:`
// path below, unaffected by this ordering).

import { buildLiaRelevanceQuery } from "../lia-persuasive-authority.ts";
import type { TypedStateBag } from "../../../../_shared/corpus/rule-types.ts";
import type { LiaTypedStage2Result } from "./three-part-test-typed.ts";

type Bag = Record<string, unknown>;

const bag = (v: unknown): Bag => (v && typeof v === "object" && !Array.isArray(v) ? v as Bag : {});

/** String-coerce a state value the same way a `state:` atom's evaluator does
 *  (`String(raw)` against the trigger's own `<value>` string) — the two
 *  sides must agree on what a given field "is" as a string. Arrays join
 *  with ", "; no atom in the current vocabulary (206B §0) targets a
 *  multi-value field through `state:`, but the coercion stays total rather
 *  than throwing on one that someday does. */
function stateValue(v: unknown): string | number | boolean | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  if (Array.isArray(v)) return v.map((x) => String(x)).join(", ");
  return null;
}

function get(root: Bag, path: string): unknown {
  let cur: unknown = root;
  for (const seg of path.split(".")) {
    cur = bag(cur)[seg];
    if (cur === undefined) return undefined;
  }
  return cur;
}

/** 206B0 §4's closed-list intake fields, plus the three Stage-A fields the
 *  vocabulary (206B §0) also names — every `intake.<path>` atom a rule may
 *  reference. Free-text fields are never states (206B0 §4 lists them
 *  separately and the vocabulary note excludes them by omission). */
const INTAKE_STATE_PATHS: readonly string[] = [
  "jurisdictions",
  "data_categories",
  "relationship_type",
  "purpose_details.controller_is_public_authority",
  "purpose_details.public_task_processing",
  "purpose_details.device_access",
  "purpose_details.device_access_strictly_necessary",
  "purpose_details.interest_holder",
  "purpose_details.interest_type",
  "purpose_details.beneficiary",
  "balancing_details.reasonable_expectation",
  "balancing_details.vulnerable_subjects",
  "balancing_details.children_data_subjects",
  "balancing_details.potential_harm",
  "balancing_details.safeguards",
  "balancing_details.opt_out_mechanism",
  "balancing_details.special_category_data",
  "balancing_details.relationship_category",
  "balancing_details.opt_out_available",
  "attestation.dpo_reviewed",
  "attestation.review_triggers",
  "stage",
  "preview_assessment_id",
];

export function buildLiaRuleStates(report: Bag, intake: Bag, typed: LiaTypedStage2Result): TypedStateBag {
  const query = buildLiaRelevanceQuery(report, intake);

  const tpt = bag(typed.three_part_test);
  const verdicts: Record<string, string> = {
    purpose: String(bag(tpt.purpose_test).verdict ?? ""),
    necessity: String(bag(tpt.necessity_test).verdict ?? ""),
    balancing: String(bag(tpt.balancing_test).verdict ?? ""),
  };

  const states: Record<string, string | number | boolean | null> = {};
  const setFrom = (key: string) => {
    states[key] = stateValue(get(report, key));
  };
  setFrom("interest_legitimacy.verdict");
  setFrom("child_factor.determination");
  setFrom("public_authority_exclusion.determination");
  setFrom("public_authority_exclusion.basis_unavailable");
  setFrom("scale_frequency_duration.large_scale_indicated");
  setFrom("eprivacy_short_circuit.determination");
  setFrom("precedent_class_posture.use_case_class");
  setFrom("reasonable_expectations.verdict");
  setFrom("potential_harms.material_weight_against_controller");
  setFrom("potential_harms.worst_case_severity");
  setFrom("opt_out_feasibility.feasibility");
  setFrom("relationship_with_individual.category");
  setFrom("automated_decision_analysis.regime");

  const alternatives = bag(report.alternatives_considered).alternatives;
  states["alternatives_considered.alternatives_recorded"] = Array.isArray(alternatives) && alternatives.length > 0;

  for (const path of INTAKE_STATE_PATHS) {
    states[`intake.${path}`] = stateValue(get(intake, path));
  }

  return {
    instrument: query.instrument,
    use_case_class: query.use_case_class,
    relationship: query.relationship,
    data_categories: [...query.data_categories],
    flags: [...query.flags],
    verdicts,
    states,
  };
}
