// ITEM 257 — SPEC-CONFORMANCE unit tests on applySingleWriterInjection.
//
// Verifies:
//   (a) Model row with valid refs ["L.i1_processing_purpose"] + present=true
//       survives injection with refs intact.
//   (b) Invalid ref "L.not_a_field" is dropped and counted.
//   (c) A row with all-invalid refs ends with intake_ledger_refs=[] and its
//       present flag is preserved (the coherence screen decides fate).
//   (d) Proposition refs remain adapter-derived regardless of model input.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { applySingleWriterInjection } from "./pass1-llm.ts";

const BASE_INPUT = {
  intake: {
    // Populate every LEDGER_KEYS field so pickLedger produces the full ledger.
    q1_revenue: "Over $100M",
    q2_consumers: "Over 100,000",
    q18_admt_use: "yes",
    sell_share: "no",
    sensitive_pi: "yes",
    processing_purposes: "SaaS analytics",
    safeguards_summary: "encryption at rest and in transit",
    retention_period: "24 months",
    entity_name: "Acme Co",
    q4_pi_categories: "identifiers",
    i1_processing_purpose: "provide SaaS analytics functionality to enterprise customers",
    q5_sell_share: "no",
    q5b_profiling_observation: "no",
    i1b_min_pi: "yes",
    i4_disclosure_mechanisms: "privacy notice",
    bought_sold_shared_count: "0",
  } as Record<string, unknown>,
  report_data: {} as Record<string, unknown>,
  buildStamp: "test@item257",
};

function findRow(plan: any, factor_id: string) {
  return plan.factor_table.find((r: any) => r.factor_id === factor_id);
}

Deno.test("(a) valid model refs survive injection with refs intact", () => {
  const parsed = {
    factor_table: [
      {
        factor_id: "benefit.other_stakeholders",
        present_in_intake: true,
        intake_ledger_refs: ["L.i1_processing_purpose"],
        weight_note: "Intake records enterprise customers as downstream recipients.",
      },
    ],
    propositions: [],
  };
  const { plan, factor_ref_drops } = applySingleWriterInjection(parsed, BASE_INPUT);
  const row = findRow(plan, "benefit.other_stakeholders");
  assert(row, "row must be present in scaffold");
  assertEquals(row.present_in_intake, true);
  assertEquals(row.intake_ledger_refs, ["L.i1_processing_purpose"]);
  assertEquals(factor_ref_drops, 0);
});

Deno.test("(b) invalid ref 'L.not_a_field' is dropped and counted", () => {
  const parsed = {
    factor_table: [
      {
        factor_id: "benefit.other_stakeholders",
        present_in_intake: true,
        intake_ledger_refs: ["L.i1_processing_purpose", "L.not_a_field"],
        weight_note: "mixed valid and invalid refs",
      },
    ],
    propositions: [],
  };
  const { plan, factor_ref_drops } = applySingleWriterInjection(parsed, BASE_INPUT);
  const row = findRow(plan, "benefit.other_stakeholders");
  assertEquals(row.intake_ledger_refs, ["L.i1_processing_purpose"]);
  assertEquals(factor_ref_drops, 1);
});

Deno.test("(c) all-invalid refs → refs=[] with present flag preserved for coherence screen", () => {
  const parsed = {
    factor_table: [
      {
        factor_id: "benefit.other_stakeholders",
        present_in_intake: true,
        intake_ledger_refs: ["L.not_a_field", "not_a_ledger_id", ""],
        weight_note: "all garbage",
      },
    ],
    propositions: [],
  };
  const { plan, factor_ref_drops } = applySingleWriterInjection(parsed, BASE_INPUT);
  const row = findRow(plan, "benefit.other_stakeholders");
  assertEquals(row.intake_ledger_refs, []);
  assertEquals(row.present_in_intake, true, "present flag preserved — coherence screen decides");
  assertEquals(factor_ref_drops, 3);
});

Deno.test("(d) proposition refs remain adapter-derived regardless of model input", () => {
  const parsed = {
    factor_table: [],
    propositions: [
      {
        conclusion_id: "any-conclusion-id-model-invents",
        intake_ledger_refs: ["L.hallucinated_by_model"],
        citation_binding_refs: ["cb.hallucinated"],
      },
    ],
  };
  const { plan } = applySingleWriterInjection(parsed, BASE_INPUT);
  // Model-authored refs on the phantom conclusion MUST NOT appear anywhere.
  for (const p of plan.propositions) {
    assert(
      !p.intake_ledger_refs.includes("L.hallucinated_by_model"),
      `proposition ${p.id} carries a hallucinated ledger ref`,
    );
    assert(
      !p.citation_binding_refs.includes("cb.hallucinated"),
      `proposition ${p.id} carries a hallucinated citation binding ref`,
    );
  }
});
