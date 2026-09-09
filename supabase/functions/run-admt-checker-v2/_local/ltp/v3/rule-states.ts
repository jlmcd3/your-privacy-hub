// DOC 235 — `buildAdmtRuleStates(intake, computed)`.
//
// Adapts ADMT's typed deterministic output (`AdmtV2Computed`,
// admt-v2-deterministic.ts) into the SHARED, product-agnostic
// `TypedStateBag` (`_shared/corpus/rule-types.ts`, unmodified) that
// hook-join.ts evaluates a hook's atoms against. Mirrors LIA's
// `buildLiaRuleStates` (lia-deliverables/rule-states.ts) and its two V3
// successors' own rule-states files — never imports any of the three.
//
// FILE NAME LAW: named exactly `rule-states.ts` (not `admt-rule-states.ts`)
// so it satisfies `RULE_INTERPRETER_ALLOWED_IMPORTERS`'s basename regex
// with no test edit — the same choice CPPA Risk's build made for its own
// file (doc 231 §5), and the reason this file lives at `_local/ltp/v3/
// rule-states.ts` rather than a new `admt-deliverables/` subdirectory ADMT
// does not otherwise have.
//
// ── THE isPassingVerdict HAZARD (doc 232 §9.1's own warning to "the next
// hooks product") ─────────────────────────────────────────────────────────
// `_shared/corpus/hook-types.ts`'s `isPassingVerdict` hardcodes the literal
// strings "passes"/"likely_passes" as the only passing values — CODE-path
// product-agnostic but VALUE-hardcoded to LIA's own vocabulary. This file
// sidesteps the hazard the same way DPIA's and (per its own build log)
// Risk's own rule-states files did: `verdicts[factor_id]` is populated with
// exactly the literal strings "passes" / "fails" / "uncertain" — never an
// ADMT-native token like "SUPPORTS"/"MEETS_REPORTED" — so `isPassingVerdict`
// (unmodified, un-imported-around) resolves correctly with zero changes to
// shared code.
//
// ── WHAT "PASSING" MEANS FOR EACH OF ADMT'S EIGHT FACTORS (ORCHESTRATOR
// DEFAULT — first-pass judgment, NOT CEO-ratified; flagged in doc 235's
// build log for review before any hook using a `verdict:` atom on these
// factors is ratified) ────────────────────────────────────────────────────
// For the five duty-area factors (Notice delivery, Notice content,
// Opt-out pathway, Access process, Vendor dependency), ADMT's own
// deterministic engine already computes a `SubstantiveState` posture per
// duty area (MEETS_REPORTED / PARTIAL / GAP / INSUFFICIENT_RECORD /
// NOT_APPLICABLE) — this is a genuinely close analogue of LIA's
// purpose/necessity/balancing verdict (a closed-vocabulary "is the record's
// own position on this factor currently adequate" scale), so this file
// reuses it directly: MEETS_REPORTED -> "passes", GAP -> "fails", every
// other value -> "uncertain" (mirrors DPIA's own `substantivePassing`-style
// proxy, doc 232 §13 NEED #6).
//
// For the three Article-11-applicability factors (Significant decision,
// Human involvement, Advertising exclusion), ADMT's engine computes a
// per-factor `DecisionEffect` (SUPPORTS/WEIGHS_AGAINST/CONDITION/NEUTRAL)
// that does NOT map cleanly onto "the record's own position is currently
// adequate" the way SubstantiveState does — WEIGHS_AGAINST on "Human
// involvement," for instance, is favorable to the company (it cuts AGAINST
// ADMT status, meaning fewer duties apply), while WEIGHS_AGAINST on
// "Advertising exclusion" is also favorable (the exclusion applies) but for
// a different reason, and SUPPORTS on "Significant decision" is neither
// clearly favorable nor adverse — it is simply a resolved fact. Rather than
// invent a per-factor favorable/adverse judgment this build cannot verify
// against a CEO ruling, this file uses the record's OVERALL scope
// resolution (`computed.scope.scopeState`) uniformly for all three:
// IN_SCOPE or OUT_OF_SCOPE (both fully resolved determinations) -> "passes";
// INCONSISTENT_RECORD -> "fails"; UNABLE_TO_ASSESS -> "uncertain". This is a
// coarser proxy than the duty-area one above and is disclosed as such.

import type { TypedStateBag } from "../../../../_shared/corpus/rule-types.ts";
import type { AdmtV2Computed } from "../admt-v2-deterministic.ts";
import type { SubstantiveState } from "../admt-v2-vocab.ts";

type Bag = Record<string, unknown>;

const bag = (v: unknown): Bag => (v && typeof v === "object" && !Array.isArray(v) ? v as Bag : {});

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)) : [];
}

function get(root: Bag, path: string): unknown {
  let cur: unknown = root;
  for (const seg of path.split(".")) {
    cur = bag(cur)[seg];
    if (cur === undefined) return undefined;
  }
  return cur;
}

/** Coerce a state value the same way a `state:` atom's evaluator does
 *  (`String(raw)` against the trigger's own `<value>` string). */
function stateValue(v: unknown): string | number | boolean | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  if (Array.isArray(v)) return v.map((x) => String(x)).join(", ");
  return null;
}

/** doc 235's own `state:` atom coverage (admt-hooks.ts's ADMT_ATOM_PHRASES)
 *  — every `intake.<path>` a hook may reference. Free-text fields never
 *  become states. */
const INTAKE_STATE_PATHS: readonly string[] = [
  "human_review",
  "admt_detail.solely_advertising",
  "notice_has_specific_purpose",
  "notice_has_opt_out_desc",
  "access_response_timeline",
  "admt_detail.hi_authority_override",
  "admt_detail.nondiscrimination_testing",
];

/** The regulated decision-domain strings (SIGNIFICANT_DECISION_DOMAINS in
 *  `_shared/intake-contracts/cppa-admt.ts`) mapped to `use_case_class`
 *  slugs, reduced to the FIRST regulated domain the record selects — a
 *  multi-select field collapsed to a single `class:` atom value (`class:`
 *  atoms test equality against ONE `use_case_class`, per rule-types.ts's
 *  grammar). ORCHESTRATOR DEFAULT, first-pass reduction, disclosed in the
 *  build log's [NEEDS] — a future use-case classifier (doc 216/227 both
 *  note ADMT has none today) may resolve this more precisely than "first
 *  selected." */
const DOMAIN_CLASS_SLUGS: Readonly<Record<string, string>> = {
  "Financial or lending services (credit decisions, loans, accounts)": "lending_financial",
  "Housing (rental or purchase eligibility)": "housing",
  "Education enrollment or opportunities (admission, credentials, suspension)": "education",
  "Hiring or admission decisions": "hiring_admission",
  "Work allocation, scheduling, or compensation": "work_allocation",
  "Promotion, demotion, suspension, or termination": "employment_action",
  "Healthcare services (diagnosis, treatment, care eligibility)": "healthcare",
};

const BIOMETRIC_MODEL_TYPES: ReadonlySet<string> = new Set(["Biometric", "Emotion recognition", "Identity verification"]);

/** Duty-area posture -> passing/failing/uncertain (see file header). */
function substantivePassing(s: SubstantiveState | undefined): "passes" | "fails" | "uncertain" {
  if (s === "MEETS_REPORTED") return "passes";
  if (s === "GAP") return "fails";
  return "uncertain"; // PARTIAL, INSUFFICIENT_RECORD, NOT_APPLICABLE, or missing
}

/** Overall scope resolution -> passing/failing/uncertain for the three
 *  Article-11-applicability factors (see file header's coarser-proxy note). */
function scopeResolutionPassing(scopeState: string): "passes" | "fails" | "uncertain" {
  if (scopeState === "IN_SCOPE" || scopeState === "OUT_OF_SCOPE") return "passes";
  if (scopeState === "INCONSISTENT_RECORD") return "fails";
  return "uncertain"; // UNABLE_TO_ASSESS
}

export function buildAdmtRuleStates(intake: Bag, computed: AdmtV2Computed): TypedStateBag {
  const { scope, notice, optOut, access, vendor } = computed;
  const d = bag((intake as any)?.admt_detail);

  // ── use_case_class (see DOMAIN_CLASS_SLUGS's own note) ──────────────────
  const domains = arr((intake as any)?.decision_domains);
  let use_case_class: string | null = null;
  for (const domain of domains) {
    const slug = DOMAIN_CLASS_SLUGS[domain];
    if (slug) { use_case_class = slug; break; }
  }

  // ── flags ─────────────────────────────────────────────────────────────
  const flags: string[] = [];
  if (scope.significantDecisionEffect === "SUPPORTS") flags.push("significant_decision");
  const humanReview = str((intake as any)?.human_review);
  if (humanReview === "No — fully automated, no human review") flags.push("no_human_review");
  if (humanReview === "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision") flags.push("qualifying_human_review");
  if (str(d.solely_advertising) === "Yes — solely advertising") flags.push("solely_advertising");
  if (str(d.hosting) === "Hosted by the vendor") flags.push("vendor_hosted");
  if (arr(d.model_types).some((t) => BIOMETRIC_MODEL_TYPES.has(t))) flags.push("biometric_model");
  if (computed.optOutPath === "FULL_OPT_OUT") flags.push("full_opt_out");
  if (computed.optOutPath === "HUMAN_APPEAL_EXCEPTION") flags.push("human_appeal_exception");
  if (computed.optOutPath === "HIRING_ADMISSION_EXCEPTION") flags.push("hiring_admission_exception");
  if (computed.optOutPath === "WORK_ALLOCATION_COMP_EXCEPTION") flags.push("work_allocation_exception");

  // ── verdicts, one per CAM factor_id (bears_on_element) ───────────────────
  const scopeVerdict = scopeResolutionPassing(scope.scopeState);
  const verdicts: Record<string, string> = {
    "Significant decision": scopeVerdict,
    "Human involvement": scopeVerdict,
    "Advertising exclusion": scopeVerdict,
    "Notice delivery": substantivePassing(notice.delivery?.status),
    "Notice content": substantivePassing(notice.posture),
    "Opt-out pathway": substantivePassing(optOut.posture),
    "Access process": substantivePassing(access.posture),
    "Vendor dependency": substantivePassing(vendor.posture),
  };

  // ── states — the closed-list intake fields a hook's `state:` atom may
  // reference (doc 235's first-wave coverage; see INTAKE_STATE_PATHS) ──────
  const states: Record<string, string | number | boolean | null> = {};
  for (const path of INTAKE_STATE_PATHS) {
    states[`intake.${path}`] = stateValue(get(intake, path));
  }

  return {
    instrument: "CPPA ADMT Regulations",
    use_case_class,
    relationship: null, // ADMT has no closed relationship-to-affected-person field (doc 216/227); [NEEDS] if one is ever added
    data_categories: [], // ADMT has no closed data-category field (doc 216/227); [NEEDS] if one is ever added
    flags,
    verdicts,
    states,
  };
}
