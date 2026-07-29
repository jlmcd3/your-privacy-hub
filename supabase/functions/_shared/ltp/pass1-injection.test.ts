// ITEM 257 — SPEC-CONFORMANCE unit tests on applySingleWriterInjection.
// ITEM 258 — BASE_INPUT rebuilt on contract-real field names (shadow-era
//            fossils sell_share/sensitive_pi/processing_purposes/
//            safeguards_summary/retention_period are gone with the
//            full-contract LEDGER_KEYS). (a)–(d) remain green; (e) added
//            for full-contract ledger coverage; (f) added for grounded-note
//            mass-replace abort threshold.
import { assert, assertEquals, assertThrows } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { applySingleWriterInjection } from "./pass1-llm.ts";
import { pickLedger, LEDGER_KEYS } from "./derive.ts";
import {
  applyGroundedNoteScreen,
  GroundedNoteMassReplaceAbort,
  GROUNDED_NOTE_MASS_REPLACE_ABORT_THRESHOLD,
} from "./grounded-note.ts";
import { cppaRiskContract } from "../intake-contracts/cppa-risk-assessment.ts";
import type { RenderPlan } from "../render-plan/schema.ts";

// Populate every contract-real (non-dotted, non-PII-excluded) key so pickLedger
// yields the full ledger. Values are illustrative — the ledger cares only
// that the key exists in the intake object.
const BASE_INTAKE: Record<string, unknown> = {
  entity_name: "Acme Co",
  subject_anchor: "SaaS analytics workflow",
  q1_revenue: "Over $100M",
  q2_consumers: "1,000,000 or more",
  q3_sector: "Technology/SaaS",
  q4_pi_categories: "Contact identifiers (name, email, phone)",
  q5_sell_share: "No",
  q5b_profiling_observation: "No",
  q5c_share_revenue_50pct: "",
  sensitive_location_basis: "Not applicable — no sensitive-location processing",
  bought_sold_shared_count: "Under 100,000",
  public_privacy_policy_url: "https://example.com/privacy",
  q6_right_know: "Online form with identity verification",
  q6_right_know_multi: "Online form with identity verification",
  q7_right_delete: "Automated deletion with confirmation",
  q8_right_correct: "Online self-service",
  q9_opt_out: "Yes, prominently on homepage",
  q10_id_verification: "Documented verification process matching CPPA guidance",
  q11_policy_review: "Within 12 months",
  q12_notice_at_collection: "Yes, covers all collection points",
  q13_notice_content: "Yes, all three",
  q14_employee_notice: "Yes",
  q15_sensitive_pi: "No",
  q15b_under16_knowledge: "No — we do not knowingly process under-16 data",
  q15c_spi_volume: "",
  q16_sensitive_limit: "",
  q17_sensitive_basis: "",
  q18_admt_use: "No",
  q19_admt_description: "",
  q20_admt_opt_out: "",
  q18b_admt_training: "No",
  i1_processing_purpose: "provide SaaS analytics functionality to enterprise customers",
  i1b_min_pi: "collection is limited to fields required for the stated purpose",
  i2_retention_period: "24 months",
  i2_retention_criteria: "Fixed period from collection",
  i2_retention_detail: "",
  i3_ca_consumer_band: "100,000–1,000,000",
  i4_disclosure_mechanisms: "Privacy policy",
  i4b_sources: "collected directly from consumers via account signup",
  i5_admt_logic: "",
  i5_admt_training_source: "",
  i5_admt_fairness_testing: "",
  i5_admt_human_review: "",
  i6_vendors: "Experian, Equifax, Plaid, Acxiom, LexisNexis",
  i7_internal_contributors: "Head of Privacy, CISO",
  i7_external_consultees: "",
  i8_certifying_exec_title: "Chief Privacy Officer",
  i9_has_existing_dpia: "No",
  i9_existing_dpia_summary: "",
  exceptions_intake: {},
  impact_intake: {},
};

const BASE_INPUT = {
  intake: BASE_INTAKE,
  report_data: {} as Record<string, unknown>,
  buildStamp: "test@item258",
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

// ─────────────────────────────────────────────────────────────────────────
// ITEM 258 — additional coverage
// ─────────────────────────────────────────────────────────────────────────

Deno.test("(e) pickLedger over contract-real intake ledgers every populated non-dotted, non-PII-excluded contract field", () => {
  const ledger = pickLedger(BASE_INTAKE);
  const ledgeredKeys = new Set(ledger.map((l) => l.intake_field));

  // Every populated contract key that isn't dotted and isn't PII-excluded
  // must appear in the ledger.
  const expected = cppaRiskContract.fields
    .map((f) => f.key)
    .filter((k) => !k.includes("."))
    .filter((k) => !["i8_certifying_exec_name", "i8_contact_email", "i8_contact_phone"].includes(k))
    .filter((k) => Object.prototype.hasOwnProperty.call(BASE_INTAKE, k));

  for (const k of expected) {
    assert(ledgeredKeys.has(k), `expected ledger to carry field ${k}`);
  }

  // PII-excluded fields must NEVER appear in the ledger even if populated.
  for (const pii of ["i8_certifying_exec_name", "i8_contact_email", "i8_contact_phone"]) {
    assert(!ledgeredKeys.has(pii), `PII field ${pii} must not appear in ledger`);
    assert(!LEDGER_KEYS.includes(pii), `PII field ${pii} must not appear in LEDGER_KEYS`);
  }

  // Dotted leaves must NEVER appear.
  for (const k of ledgeredKeys) {
    assert(!k.includes("."), `dotted leaf ${k} must not appear in ledger`);
  }

  // Shadow-era fossils are gone.
  for (const fossil of ["sell_share", "sensitive_pi", "processing_purposes", "safeguards_summary", "retention_period"]) {
    assert(!LEDGER_KEYS.includes(fossil), `shadow-era fossil ${fossil} must not appear in LEDGER_KEYS`);
  }
});

function makePlanWithFactors(rows: Array<{ factor_id: string; weight_note: string }>): RenderPlan {
  return {
    plan_version: "v1",
    product: "cppa-risk-assessment",
    build_stamp: "test@item258-f",
    jurisdiction_tag: "cppa-ca",
    intake_ledger: [
      { ledger_id: "L.i1_processing_purpose", intake_field: "i1_processing_purpose",
        value: "provide SaaS analytics functionality", display: "stated processing purpose" },
    ],
    citation_bindings: [],
    propositions: [],
    factor_table: rows.map((r) => ({
      factor_id: r.factor_id,
      kind: "benefit" as const,
      jurisdiction_tag: "cppa-ca",
      present_in_intake: true,
      intake_ledger_refs: ["L.i1_processing_purpose"],
      guidance_refs: [],
      anchor: { corpus_key: "ccpa-regs", pinpoint: "§ 7152(a)" },
      display_label: r.factor_id,
      weight_note: r.weight_note,
    })) as any,
    weighing_frame: [],
    gate_outcomes: [],
    conservative_write_around: { triggered: false, disclosure: "silent+telemetry" },
  };
}

// ITEM 261 — the screen now DEFAULTS to observe mode (SPEC §6
// guard-lifecycle law); the Item-258 abort is an ENFORCE-mode instrument.
// This fixture is updated to pass { mode: "enforce" } explicitly so it
// remains the regression guard for a future promotion courier.
Deno.test("(f) grounded-note mass-replace ABORTS above threshold and does NOT abort at/below threshold (enforce mode)", () => {
  // ABOVE threshold: 4 rows, all with fully ungrounded prose → rate 1.0 > 0.5.
  const aboveRows = [
    { factor_id: "benefit.other_stakeholders", weight_note: "xyzzy plugh foobar quux garply" },
    { factor_id: "benefit.public",             weight_note: "xyzzy plugh foobar quux garply" },
    { factor_id: "benefit.business",           weight_note: "xyzzy plugh foobar quux garply" },
    { factor_id: "benefit.consumer",           weight_note: "xyzzy plugh foobar quux garply" },
  ];
  assertThrows(
    () => applyGroundedNoteScreen(makePlanWithFactors(aboveRows), { mode: "enforce" }),
    GroundedNoteMassReplaceAbort,
  );

  // AT/BELOW threshold: 4 candidates, 2 ungrounded + 2 grounded (lexicon
  // tokens only) → rate 0.5, NOT > 0.5. ("no record evidence" is
  // whitelisted and would not count as a candidate at all, so we use
  // real grounded prose to keep candidates=4.)
  const belowRows = [
    { factor_id: "benefit.other_stakeholders", weight_note: "xyzzy plugh foobar quux garply" },
    { factor_id: "benefit.public",             weight_note: "xyzzy plugh foobar quux garply" },
    { factor_id: "benefit.business",           weight_note: "record states the stated purpose" },
    { factor_id: "benefit.consumer",           weight_note: "record states the stated purpose" },
  ];
  const { telemetry } = applyGroundedNoteScreen(makePlanWithFactors(belowRows), { mode: "enforce" });
  assertEquals(telemetry.candidates, 4);
  assertEquals(telemetry.replacements, 2);
  assertEquals(telemetry.replacement_rate <= GROUNDED_NOTE_MASS_REPLACE_ABORT_THRESHOLD, true,
    `expected replacement_rate ≤ ${GROUNDED_NOTE_MASS_REPLACE_ABORT_THRESHOLD}, got ${telemetry.replacement_rate}`);
});


