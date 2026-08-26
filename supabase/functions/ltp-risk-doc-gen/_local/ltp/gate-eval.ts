/**
 * LTP — Deterministic gate evaluator for cppa-risk.
 * Evaluates CPPA_RISK_GATES against intake and returns GateRuleOutcome[].
 * Pure function; never throws; unknown/unreadable fields → "not_applicable".
 */
import { CPPA_RISK_GATES } from "../gates/cppa-risk-gates.ts";
import type { GateRuleOutcome } from "../render-plan/schema.ts";

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
        if (spi === undefined) {
          outcomes.push({ gate_id: gate.id, outcome: "not_applicable", reason: "q15_sensitive_pi absent" });
        } else if (isNegative(spi)) {
          outcomes.push({ gate_id: gate.id, outcome: "block", reason: "no sensitive-PI processing on the record" });
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
