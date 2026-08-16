// PROMPT 4 (2026-08-11) — deterministic gap ledger + risk-count reconciliation.
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildDpiaDeliverables,
  buildGapLedger,
  buildGapLedgerDetailed,
  buildRiskCountNote,
  statedResidualRiskCount,
} from "../../run-dpia-framework/_local/ltp/dpia-deliverables/build.ts";
import { dpiaFrameworkContract } from "../intake-contracts/dpia-framework.ts";
import type {
  Art36Consultation,
  DpiaDecision,
  LegalBasisFinding,
  NecessityFinding,
  ProportionalityFinding,
  RiskRegisterEntry,
} from "../ltp/dpia-deliverables/types.ts";

const CONTRACT_KEYS = new Set(dpiaFrameworkContract.fields.map((f) => f.key));

function art36(over: Partial<Art36Consultation> = {}): Art36Consultation {
  return {
    determination: "consultation_not_required",
    why: "",
    exposure_note: "",
    separation_repairs: 0,
    driving_risk_ids: [],
    citation: "GDPR Art. 36(1)",
    authority_verbatim: "",
    procedural_note: "",
    procedural_citation: "GDPR Art. 36(3)",
    status: "analysed",
    ...over,
  };
}

function necessity(over: Partial<NecessityFinding> = {}): NecessityFinding {
  return {
    operation_id: "op_primary",
    operation_label: "Patient triage scoring",
    purpose_stated: true,
    purpose_text: "Prioritise urgent cases",
    alternatives_considered: [],
    verdict: "undetermined_on_the_record",
    why: "",
    citation: "GDPR Art. 35(7)(b)",
    authority_verbatim: "",
    status: "record_insufficient",
    ...over,
  };
}

function proportionality(over: Partial<ProportionalityFinding> = {}): ProportionalityFinding {
  return {
    operation_id: "op_primary",
    operation_label: "Patient triage scoring",
    benefit_argument: "",
    impact_argument: "",
    argued_both_directions: false,
    verdict: "undetermined_on_the_record",
    why: "",
    citation: "GDPR Art. 35(7)(b)",
    authority_verbatim: "",
    status: "record_insufficient",
    ...over,
  };
}

function legalBasis(over: Partial<LegalBasisFinding> = {}): LegalBasisFinding {
  return {
    operation_id: "op_primary",
    purpose: "Prioritise urgent cases",
    article_6_basis: "Art. 6(1)(f)",
    justification: "",
    verdict: "undetermined_on_the_record",
    citation: "GDPR Art. 6(1)(f)",
    authority_verbatim: "",
    status: "record_insufficient",
    ...over,
  };
}

function risk(over: Partial<RiskRegisterEntry> & { risk_id: string }): RiskRegisterEntry {
  return {
    risk_label: "Unauthorised access to health records",
    source: "",
    affected_rights: "",
    likelihood: "Possible",
    severity: "Significant",
    inherent_band: "high",
    measures: [],
    residual_band: "moderate",
    citation: "GDPR Art. 35(7)(c)",
    authority_verbatim: "",
    status: "analysed",
    ...over,
  };
}

const DECISION: DpiaDecision = {
  determination: "draft_incomplete",
  conditions: [],
  blockers: [],
  why: "",
  citation: "GDPR Art. 36(1)",
  rule_id: "dpia_decision_v1",
};

function bundle(over: Partial<Parameters<typeof buildGapLedgerDetailed>[1]> = {}) {
  return {
    necessity_findings: [] as readonly NecessityFinding[],
    proportionality: [] as readonly ProportionalityFinding[],
    risk_register: [] as readonly RiskRegisterEntry[],
    art36_consultation: art36(),
    legal_basis: [] as readonly LegalBasisFinding[],
    decision: DECISION,
    ...over,
  };
}

Deno.test("gap ledger: an ask with no content is never emitted and is counted", () => {
  const res = buildGapLedgerDetailed({}, bundle({
    necessity_findings: [necessity({ information_needed: "   " })],
    proportionality: [proportionality({ information_needed: "" })],
    legal_basis: [legalBasis({ information_needed: undefined })],
  }));
  assertEquals(res.gap_ledger, []);
  // An empty-string ask reaches push() only where the key is present.
  assert(res.dropped_empty >= 1, JSON.stringify(res));
});

Deno.test("gap ledger: two surfaces asking for the same fact deduplicate", () => {
  const ask =
    "The retention period applied to triage scores, stated in months rather than as a policy reference.";
  const res = buildGapLedgerDetailed({}, bundle({
    proportionality: [proportionality({ information_needed: ask })],
    risk_register: [risk({ risk_id: "r1", status: "record_insufficient", information_needed: ask })],
  }));
  assertEquals(res.gap_ledger.length, 1);
  assertEquals(res.merged, 1);
});

Deno.test("gap ledger: every emitted field is a real DPIA intake contract key", () => {
  const ledger = buildGapLedger({}, bundle({
    necessity_findings: [
      necessity({ purpose_stated: false, information_needed: "The specific purpose pursued." }),
      necessity({
        operation_id: "op_two",
        information_needed: "Each less intrusive alternative that was considered and rejected.",
      }),
    ],
    proportionality: [
      proportionality({ information_needed: "The impact on the data subjects, in the company's words." }),
    ],
    legal_basis: [
      legalBasis({ information_needed: "The balancing exercise weighed before relying on this basis." }),
      legalBasis({
        operation_id: "op_two",
        article_6_basis: "Art. 6(1)(c)",
        information_needed: "The legal obligation relied on, by instrument and provision.",
      }),
    ],
    risk_register: [
      risk({
        risk_id: "r1",
        status: "record_insufficient",
        information_needed: "The technical measures applied to limit access to health records.",
      }),
    ],
    art36_consultation: art36({
      status: "record_insufficient",
      information_needed: "The residual position left after the measures recorded above.",
    }),
  }));
  assert(ledger.length >= 5, JSON.stringify(ledger));
  for (const e of ledger) {
    assert(CONTRACT_KEYS.has(e.field), `not a contract key: ${e.field}`);
    assert(e.dimensions.trim().length > 0);
    assert(e.enables.trim().length > 0);
  }
});

Deno.test("reconciliation: note appears when the stated count differs from the register", () => {
  const intake = { residual_risks: "Two moderate risks remain after the controls we operate." };
  assertEquals(statedResidualRiskCount(intake.residual_risks), 2);
  const note = buildRiskCountNote(intake, [
    risk({ risk_id: "r1" }),
    risk({ risk_id: "r2" }),
    risk({ risk_id: "r3" }),
  ]);
  assert(note);
  assertEquals(note!.register_count, 3);
  assertEquals(note!.stated_count, 2);
  // PROMPT 8E item 1 — ratified bytes: number words, no lead-in sentence.
  assertEquals(
    note!.note,
    "The company self-identified two of these risks; this assessment surfaces one more. The company's own account is recorded in its own words in Section 6 below.",
  );
});

Deno.test("reconciliation: nothing attached when the counts agree", () => {
  const note = buildRiskCountNote(
    { residual_risks: "Two moderate risks remain." },
    [risk({ risk_id: "r1" }), risk({ risk_id: "r2" })],
  );
  assertEquals(note, undefined);
});

Deno.test("reconciliation: nothing attached when the narrative states no count", () => {
  assertEquals(
    statedResidualRiskCount("Some residual risk remains, which we monitor quarterly."),
    null,
  );
  assertEquals(
    buildRiskCountNote(
      { residual_risks: "Some residual risk remains, which we monitor quarterly." },
      [risk({ risk_id: "r1" })],
    ),
    undefined,
  );
  assertEquals(buildRiskCountNote({}, [risk({ risk_id: "r1" })]), undefined);
});

// ── PROMPT 8C (2026-08-12) — dimensions never carry retired meta-text ──
const RETIRED_META_DIMENSIONS = [
  "The record does not settle this point, and it is carried in the information needed list.",
  "the measures that keep this data accurate and up to date, and how often they run",
  "a principle-by-principle account (lawfulness, fairness and transparency; purpose limitation; minimisation; accuracy; storage limitation; integrity and confidentiality) naming the measure that carries each one",
  "a right-by-right account (access, rectification, erasure, restriction, portability, objection) naming the route and the response time for each",
];

Deno.test("8C: gap-ledger dimensions are fact-naming, never the retired meta-strings", () => {
  const intake = {
    organization_name: "Northwind Clinics Ltd",
    processing_activity_name: "Patient triage scoring",
    purpose: "To triage patients arriving at urgent care.",
    data_categories: ["Contact details", "Health or medical data"],
    data_subjects: "Patients",
    jurisdictions: ["EU (GDPR)"],
    legal_basis_proposed: "Legal obligation (Art. 6(1)(c))",
    article_9_condition: "Health or social care (Art. 9(2)(h))",
  };
  const deliverables = buildDpiaDeliverables(intake) as unknown as {
    gap_ledger: Array<{ dimensions: string }>;
  };
  const ledger = deliverables.gap_ledger ?? [];
  assert(ledger.length > 0);
  for (const e of ledger) {
    assert(e.dimensions.trim().length > 0);
    for (const retired of RETIRED_META_DIMENSIONS) {
      assert(e.dimensions !== retired, `retired meta-string in ledger: ${e.dimensions}`);
    }
  }
});
