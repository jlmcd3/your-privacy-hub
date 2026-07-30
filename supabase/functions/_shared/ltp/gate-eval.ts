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
