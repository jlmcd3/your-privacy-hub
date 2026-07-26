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

const readField = (intake: Intake, key: string): unknown => {
  if (!intake) return undefined;
  if (key in intake) return (intake as any)[key];
  // shallow dive into common intake substructures
  for (const k of Object.keys(intake)) {
    const v = (intake as any)[k];
    if (v && typeof v === "object" && !Array.isArray(v) && key in v) return (v as any)[key];
  }
  return undefined;
};

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
