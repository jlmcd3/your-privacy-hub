/**
 * LTP — DERIVE stage (Phase-2 shadow-mode).
 *
 * Deterministically assembles a RenderPlan v1 from intake + already-generated
 * report_data. The intent of the design is a Pass-1 structured-output model
 * call; the shadow-mode landing here uses deterministic derivation over the
 * canonical Phase-1 registries so the pipeline scaffold (validators, gates,
 * telemetry, Pass G, closeness heuristic) is exercised end-to-end without
 * disturbing the customer path. LLM-driven Pass-1 replaces this body in a
 * downstream turn after two clean shadow waves.
 *
 * Pure; never throws (returns a plan with conservative_write_around triggered
 * on any internal error).
 */
import type {
  CitationBinding,
  FactorTableEntry,
  IntakeLedgerEntry,
  Proposition,
  RenderPlan,
} from "../render-plan/schema.ts";
import { CPPA_RISK_CONCLUSIONS } from "../legal-test/cppa-risk-conclusions.ts";
import { CPPA_RISK_FACTORS, WEIGHING_TESTS } from "../factors/cppa-risk-factors.ts";
import { evaluateCppaRiskGates } from "./gate-eval.ts";

export interface DeriveInput {
  readonly intake: Record<string, unknown>;
  readonly report_data: Record<string, unknown>;
  readonly buildStamp: string;
}

const LEDGER_KEYS: readonly string[] = [
  // Base contract fields.
  "q1_revenue", "q2_consumers", "q18_admt_use",
  "sell_share", "sensitive_pi", "processing_purposes",
  "safeguards_summary", "retention_period",
  // ITEM 237 fix (a) — Fields referenced by the T7 deterministic opening
  // (risk-opening.ts) provenance sources. Absent from the ledger, the
  // harvest guard rejects opening_summary with
  // `harvest_intake_ref_not_in_plan_ledger` even though the fields are
  // legitimate intake inputs. The ledger must carry them so the guard
  // can verify grounding without weakening.
  "entity_name", "q4_pi_categories", "i1_processing_purpose",
  "q5_sell_share", "q5b_profiling_observation",
  "i1b_min_pi", "i4_disclosure_mechanisms",
  "bought_sold_shared_count",
];

function pickLedger(intake: Record<string, unknown>): IntakeLedgerEntry[] {
  const out: IntakeLedgerEntry[] = [];
  for (const k of LEDGER_KEYS) {
    if (intake && k in intake) {
      const v = (intake as any)[k];
      out.push({
        ledger_id: `L.${k}`,
        intake_field: k,
        value: (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null) ? v : JSON.stringify(v),
        display: typeof v === "string" ? v : JSON.stringify(v ?? null),
      });
    }
  }
  return out;
}

function pickCitationBindings(): CitationBinding[] {
  // Seed with the anchors named by the conclusion inventory.
  const seen = new Set<string>();
  const out: CitationBinding[] = [];
  for (const c of CPPA_RISK_CONCLUSIONS) {
    const key = `${c.anchor.corpus_key}::${c.anchor.pinpoint}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      pinpoint_ref: `cb.${c.id}`,
      corpus_key: c.anchor.corpus_key,
      pinpoint: c.anchor.pinpoint,
      jurisdiction_tag: c.jurisdiction_tag,
      authority_weight: "binding",
    });
  }
  return out;
}

function pickPropositions(bindings: readonly CitationBinding[], ledger: readonly IntakeLedgerEntry[]): Proposition[] {
  const bindingIdByConclusion = new Map(bindings.map((b) => [b.pinpoint_ref.replace(/^cb\./, ""), b.pinpoint_ref]));
  const ledgerIds = ledger.map((l) => l.ledger_id);
  return CPPA_RISK_CONCLUSIONS.map((c) => {
    const p: Proposition = {
      id: `p.${c.id}`,
      conclusion_id: c.id,
      epistemic_type: c.epistemic_type,
      jurisdiction_tag: c.jurisdiction_tag,
      anchor: c.anchor,
      intake_ledger_refs: c.epistemic_type === "R" ? ledgerIds.slice(0, 2) : [],
      citation_binding_refs: [bindingIdByConclusion.get(c.id) ?? `cb.${c.id}`],
      ...(c.epistemic_type === "R" ? { polarity: "not_applicable" as const } : {}),
      ...(c.epistemic_type === "W" && c.weighing_test_id ? { weighing_frame_ref: `wf.${c.weighing_test_id}` } : {}),
    };
    return p;
  });
}

function pickFactorTable(): FactorTableEntry[] {
  return CPPA_RISK_FACTORS.map((f) => ({
    factor_id: f.id,
    kind: f.kind,
    jurisdiction_tag: f.jurisdiction_tag,
    present_in_intake: false, // shadow-mode: presence detection is a Pass-1 model responsibility
    intake_ledger_refs: [],
    guidance_refs: f.guidance_refs ?? [],
    anchor: f.anchor,
  }));
}

export function derivePlan(input: DeriveInput): RenderPlan {
  try {
    const ledger = pickLedger(input.intake ?? {});
    const bindings = pickCitationBindings();
    const propositions = pickPropositions(bindings, ledger);
    const factor_table = pickFactorTable();
    const gate_outcomes = evaluateCppaRiskGates(input.intake ?? {});
    return {
      plan_version: "v1",
      product: "cppa-risk-assessment",
      build_stamp: input.buildStamp,
      jurisdiction_tag: "cppa-ca",
      intake_ledger: ledger,
      citation_bindings: bindings,
      propositions,
      factor_table,
      weighing_frame: [], // populated by Guide stage
      gate_outcomes,
      conservative_write_around: { triggered: false, disclosure: "silent+telemetry" },
    };
  } catch (e) {
    return {
      plan_version: "v1",
      product: "cppa-risk-assessment",
      build_stamp: input.buildStamp,
      jurisdiction_tag: "cppa-ca",
      intake_ledger: [],
      citation_bindings: [],
      propositions: [],
      factor_table: [],
      weighing_frame: [],
      gate_outcomes: [],
      conservative_write_around: { triggered: true, reason: `derive_error:${(e as Error)?.message ?? "?"}`, disclosure: "silent+telemetry" },
    };
  }
}

export { WEIGHING_TESTS };
