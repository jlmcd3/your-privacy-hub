/**
 * LTP — Deterministic gate evaluator for cppa-risk.
 * Evaluates CPPA_RISK_GATES against intake and returns GateRuleOutcome[].
 * Pure function; never throws; unknown/unreadable fields → "not_applicable".
 */
import { CPPA_RISK_GATES } from "../gates/cppa-risk-gates.ts";
import type { GateRuleOutcome } from "../render-plan/schema.ts";
import { resolveAdmtSignificantDecision } from "../admt-significant-decision.ts";

type Intake = Record<string, unknown>;

const isNegative = (v: unknown): boolean => {
  if (v === false || v === null || v === undefined) return true;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "" || s === "no" || s === "none" || s === "n/a" || s === "not_applicable" || s === "false";
  }
  if (Array.isArray(v)) return v.length === 0;
  return false;
};

/**
 * ITEM 243 defect 8 — canonical-contract → gate-normalized field aliases.
 * The applicability/documentation gates in `cppa-risk-gates.ts` read
 * normalized names (`q_sells_or_shares`, `q_extensive_profiling`,
 * `q_processes_sensitive_pi`, `q_trains_admt`, `pi_categories`, …) that
 * predate the current cppa-risk-assessment intake contract. Without an
 * alias shim the gate evaluator saw those fields as absent and the
 * matching § 7150(b) prong assertions vanished from scope/analysis on
 * every intake whose only source-of-truth is the canonical contract —
 * the q5b/q5c mapping gap exposed by the intake-fact coverage assert.
 *
 * The shim is READ-ONLY (never mutates intake); resolution order is
 * (1) exact key, (2) alias fallbacks in declaration order, (3) shallow
 * nested-object dive. Unrecognized keys still return undefined.
 */
const FIELD_ALIASES: Readonly<Record<string, readonly string[]>> = {
  q_sells_or_shares: ["q5_sell_share"],
  q_processes_sensitive_pi: ["q15_sensitive_pi"],
  q_sensitive_pi_carveout: ["q17_sensitive_basis"],
  q5b_profiling_observation: ["q_extensive_profiling"],
  q_trains_admt: ["q18b_admt_training"],
  q_admt_significant_decision: ["q19_admt_description"],
  pi_categories: ["q4_pi_categories"],
  sensitive_pi_categories: ["q15c_spi_volume", "q15_sensitive_pi"],
  processing_purpose: ["i1_processing_purpose"],
  retention_period: ["i2_retention_period"],
  consumer_interaction_channel: ["i4_disclosure_mechanisms"],
  approver_name: ["i8_certifying_exec_name"],
  approver_position: ["i8_certifying_exec_title"],
  approximate_consumer_count: ["i3_ca_consumer_band", "q2_consumers"],
  operational_method: ["i1_processing_purpose"],
  disclosures_made: ["i4_disclosure_mechanisms"],
  recipients: ["i6_vendors"],
  revenue_band: ["q1_revenue"],
  consumer_band: ["q2_consumers", "i3_ca_consumer_band"],
};

const readField = (intake: Intake, key: string): unknown => {
  if (!intake) return undefined;
  if (key in intake) return (intake as any)[key];
  const aliases = FIELD_ALIASES[key];
  if (aliases) {
    for (const a of aliases) {
      if (a in intake) return (intake as any)[a];
    }
  }
  // shallow dive into common intake substructures
  for (const k of Object.keys(intake)) {
    const v = (intake as any)[k];
    if (v && typeof v === "object" && !Array.isArray(v) && key in v) return (v as any)[key];
  }
  return undefined;
};

export { FIELD_ALIASES };


/**
 * ITEM 272 → TURN 1d (2026-08-26, fleet intake audit findings 1+2).
 * q5b_profiling_observation is now a direct Yes/No on the § 7150(b)(4)
 * element ONLY (inference from systematic observation of workers/students/
 * applicants). The retired 4-option enum's sensitive-location branch is
 * GONE from this field: it fed the § 7150(b)(5) gate WITHOUT the inference
 * caveat the TURN 1c sensitive_location_basis redesign added — a second
 * door into the exact false positive that redesign closed (audit finding
 * 1). § 7150(b)(5) resolves solely from sensitive_location_basis below.
 *
 * LEGACY COMPAT (narrow, deliberate): the two retired values that
 * genuinely affirmed the OBSERVATION branch stay recognised, so a stored
 * record re-run under this engine does not silently lose a trigger it had
 * legitimately engaged. The retired sensitive-location-only value affirms
 * nothing anywhere — that IS the loophole being closed, and unlike the
 * observation values it was never a reliable affirmation of any element.
 */
const q5bSaysObservation = (v: unknown): boolean =>
  typeof v === "string" &&
  (/^yes$/i.test(v.trim()) ||
    v.trim() === "Yes — systematic observation of workers/students/applicants" ||
    /^both$/i.test(v.trim()));
// TURN 1c (2026-08-26, CEO-directed redesign) — sensitive_location_basis is
// now a direct Yes/No answer to the statute's own inference-from-presence
// test (see src/pages/CPPARiskAssessment.enums.ts). The prior version of
// this predicate treated ANY non-empty, non-"not applicable" answer as
// engaging the trigger — including a bare location-TYPE label with no
// inference described anywhere in the record, which over-fired for an
// entire class of real businesses (e.g. a healthcare analytics vendor that
// scores hospital-sourced clinical data, and never observes anyone's
// presence anywhere). A plain equality check is now correct because the
// question itself asks the statutory element directly.
const sensitiveLocationBasisEngaged = (v: unknown): boolean =>
  typeof v === "string" && /^yes$/i.test(v.trim());

/**
 * PN-CORPUS-L-RISK-1 (2026-08-22) — § 7150(b)(2)(A) personnel carve-out.
 * Exact enum match against the q15d_hr_carveout option (a legal
 * determination gates on the ratified literal, never a fuzzy match).
 */
const hrCarveoutApplies = (v: unknown): boolean =>
  typeof v === "string" && v.trim() === "Yes — solely for those personnel purposes";

export function evaluateCppaRiskGates(intake: Intake): GateRuleOutcome[] {
  const outcomes: GateRuleOutcome[] = [];
  for (const gate of CPPA_RISK_GATES) {
    try {
      if (gate.id === "G.q18.admt_consequence") {
        const v = readField(intake, "q18_admt_use");
        if (v === undefined) {
          outcomes.push({ gate_id: gate.id, outcome: "not_applicable", reason: "q18_admt_use absent" });
        } else if (isNegative(v)) {
          outcomes.push({ gate_id: gate.id, outcome: "block", reason: "q18_admt_use negative → suppress § 7001(ddd) assertions" });
        } else {
          outcomes.push({ gate_id: gate.id, outcome: "pass" });
        }
        continue;
      }
      if (gate.id === "G.applicability.admt_significant_decision") {
        // DOC 148 (2026-09-02, A-Team Batch-8 P0) — the generic evaluator
        // passed this gate on a bare q18_admt_use = "Yes" (and even on a
        // non-empty q19 description alone, since the alias maps
        // q_admt_significant_decision → q19_admt_description and any
        // non-empty text is "not negative"). That bypassed the doc-137
        // § 7001(ddd) category gate + FSOR advertising exclusion at the ONE
        // site that feeds the rendered trigger table (composeScope reads
        // this gate). Same rule as risk-opening.ts S1 / _w9_risk_slots:
        // the trigger passes only when the described activity names an
        // enumerated significant-decision category. The two block reasons
        // are distinct so downstream composers can tell a determined FSOR
        // exclusion from an unresolved record.
        const use = readField(intake, "q18_admt_use");
        if (use === undefined) {
          outcomes.push({ gate_id: gate.id, outcome: "not_applicable", reason: "q18_admt_use absent" });
        } else if (isNegative(use)) {
          outcomes.push({ gate_id: gate.id, outcome: "block", reason: "q18_admt_use negative" });
        } else if (typeof use === "string" && /^in evaluation$/i.test(use.trim())) {
          // DOC 154 (2026-09-03, code review item 2) — evaluation is not
          // deployed use for a significant decision; the prong is a
          // determined non-engagement on the Company's own answer, with a
          // distinct reason so the composer renders the evaluation posture
          // (never the generic "record does not support this trigger").
          outcomes.push({
            gate_id: gate.id,
            outcome: "block",
            reason: "b3_evaluation_not_deployed — q18_admt_use answers In evaluation; § 7150(b)(3) applies to deployed use",
          });
        } else {
          // DOC 157 (2026-09-03, model-vs-law build) — the categorical
          // § 7001(ddd) answer (q19a_decision_categories / q19b_housing_basis)
          // governs when present; the free-text classifier remains the
          // fallback for records without it. Two further determined blocks:
          // the Company records the decision as outside every category, or
          // as a housing decision within the (ddd)(2) exclusion.
          const desc = readField(intake, "q_admt_significant_decision");
          const cls = resolveAdmtSignificantDecision({
            q19a_decision_categories: readField(intake, "q19a_decision_categories"),
            q19b_housing_basis: readField(intake, "q19b_housing_basis"),
            q19_admt_description: typeof desc === "string" ? desc : "",
          }).cls;
          if (cls === "significant") {
            outcomes.push({ gate_id: gate.id, outcome: "pass" });
          } else if (cls === "advertising_only") {
            outcomes.push({
              gate_id: gate.id,
              outcome: "block",
              reason: "b3_advertising_exclusion_fsor_7001_ddd_6 — described decision use is advertising only",
            });
          } else if (cls === "not_significant") {
            outcomes.push({
              gate_id: gate.id,
              outcome: "block",
              reason: "b3_not_significant_category — the Company records the decision as outside every § 7001(ddd) significant-decision category",
            });
          } else if (cls === "housing_excluded") {
            outcomes.push({
              gate_id: gate.id,
              outcome: "block",
              reason: "b3_housing_availability_exclusion_7001_ddd_2 — the Company records a housing decision based solely on availability, vacancy, or receipt of payment",
            });
          } else {
            outcomes.push({
              gate_id: gate.id,
              outcome: "block",
              reason: "b3_significant_decision_category_unresolved — no § 7001(ddd) category identified",
            });
          }
        }
        continue;
      }
      if (gate.id === "G.applicability.systematic_observation") {
        const v = readField(intake, "q5b_profiling_observation");
        if (v === undefined) {
          outcomes.push({ gate_id: gate.id, outcome: "not_applicable", reason: "q5b_profiling_observation absent" });
        } else if (q5bSaysObservation(v)) {
          outcomes.push({ gate_id: gate.id, outcome: "pass" });
        } else {
          outcomes.push({ gate_id: gate.id, outcome: "block", reason: "q5b option does not select systematic observation" });
        }
        continue;
      }
      if (gate.id === "G.applicability.sensitive_pi") {
        // PN-CORPUS-L-RISK-1 (2026-08-22) — § 7150(b)(2)(A). The generic
        // any-positive-passes rule gave the carve-out field the WRONG
        // polarity (an answered carve-out made the trigger MORE likely to
        // pass). (b)(2) needs its own branch: engaged iff sensitive PI is
        // processed AND the record does not affirm the solely-for-exempt-
        // personnel-purposes carve-out. FSOR provenance: the Agency added
        // (b)(2)(A) to limit the risk-assessment burden for routine
        // personnel processing (cppa_fsor_commentary a2ce1f02-…; CAM row
        // cppa-risk/regulatory-trigger-and-applicability/01).
        const spi = readField(intake, "q_processes_sensitive_pi");
        const carve = readField(intake, "q15d_hr_carveout");
        // DOC 157 (2026-09-03, model-vs-law build) — § 7001(bbb)(4): the
        // personal information of consumers the business has actual
        // knowledge are under 16 IS sensitive personal information. A "Yes"
        // on the under-16 question engages (b)(2) even when the general
        // sensitive-PI answer is No, Unsure, or absent (the form's own
        // comment promised this "SPI elevation"; it was never implemented).
        const under16 = readField(intake, "q15b_under16_knowledge");
        const under16Known = typeof under16 === "string" && /^yes/i.test(under16.trim());
        if (under16Known && !(typeof spi === "string" && /^yes$/i.test(spi.trim()))) {
          outcomes.push({
            gate_id: gate.id,
            outcome: "pass",
            reason: "b2_under16_elevation — § 7001(bbb)(4): the Company records actual knowledge that it processes the personal information of consumers under 16",
          });
          continue;
        }
        if (spi === undefined) {
          outcomes.push({ gate_id: gate.id, outcome: "not_applicable", reason: "q15_sensitive_pi absent" });
        } else if (isNegative(spi)) {
          outcomes.push({ gate_id: gate.id, outcome: "block", reason: "no sensitive-PI processing on the record" });
        } else if (typeof spi === "string" && /^unsure$/i.test(spi.trim())) {
          // DOC 154 (code review item 1) — "Unsure" is an UNRESOLVED state,
          // not an engagement: the generic any-non-negative-passes rule
          // rendered § 7150(b)(2) as Engaged with no qualifying fact.
          outcomes.push({
            gate_id: gate.id,
            outcome: "block",
            reason: "b2_unresolved — q15_sensitive_pi answers Unsure; the trigger is carried as additional information required",
          });
        } else if (hrCarveoutApplies(carve)) {
          outcomes.push({
            gate_id: gate.id,
            outcome: "block",
            reason:
              "§ 7150(b)(2)(A) personnel carve-out — sensitive PI of employees/contractors processed solely for exempt personnel-administration purposes",
          });
        } else {
          outcomes.push({ gate_id: gate.id, outcome: "pass" });
        }
        continue;
      }
      if (gate.id === "G.applicability.sensitive_location") {
        // TURN 1d (2026-08-26, audit finding 1) — the q5b OR-path is
        // removed: this prong resolves SOLELY from the corrected TURN 1c
        // Yes/No field, so no answer on any other field can re-open the
        // sector-for-mechanism false positive that redesign closed.
        const basis = readField(intake, "sensitive_location_basis");
        if (basis === undefined) {
          outcomes.push({ gate_id: gate.id, outcome: "not_applicable", reason: "sensitive_location_basis absent" });
        } else if (sensitiveLocationBasisEngaged(basis)) {
          outcomes.push({ gate_id: gate.id, outcome: "pass" });
        } else {
          outcomes.push({ gate_id: gate.id, outcome: "block", reason: "no sensitive-location inference on the record" });
        }
        continue;
      }

      // Generic evaluator: gate blocks iff EVERY listed field is negative/absent.
      const reads = gate.intake_fields.map((f) => readField(intake, f));
      if (reads.every((v) => v === undefined)) {
        outcomes.push({ gate_id: gate.id, outcome: "not_applicable", reason: "intake fields absent" });
      } else if (reads.every((v) => isNegative(v))) {
        outcomes.push({ gate_id: gate.id, outcome: "block", reason: "all keyed intake fields negative" });
      } else {
        outcomes.push({ gate_id: gate.id, outcome: "pass" });
      }
    } catch (e) {
      outcomes.push({ gate_id: gate.id, outcome: "not_applicable", reason: `eval_error:${(e as Error)?.message ?? "?"}` });
    }
  }
  return outcomes;
}
