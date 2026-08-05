// ITEM 380 r2 — the four defects proven by the LIVE perfect-fixture runs.
//
// A. the truth gate counted REPAIRED csc false-absence violations,
// B. by-design DPIA acts (completion date / validation date / sign-off) and
//    "assign …" asks classified as record gaps,
// C. the risk affirmative framing never reached the PERSISTED document
//    because both live surfaces are string / array, not objects,
// D. VALUE_DEMAND_RE matched the NOUN "record".
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  affirmativeParagraph,
  classifyOpenItem,
  computeRecordComplete,
  isByDesignActionSurface,
  RECORD_COMPLETE_VERSION,
  VALUE_DEMAND_RE,
} from "../../../supabase/functions/_shared/ltp/record-complete.ts";
import { applyRiskRecordCompleteFraming } from "../../../supabase/functions/_shared/ltp/generate-cppa-risk.ts";
import { cppaRiskContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts";
import { dpiaFrameworkContract } from "../../../supabase/functions/_shared/intake-contracts/dpia-framework.ts";
import { CPPA_RISK_PERFECT } from "../../../supabase/functions/_shared/golden/cppa-risk.ts";
import { DPIA_PERFECT } from "../../../supabase/functions/_shared/golden/dpia.ts";

const CLEAN_COVERAGE = { crashed: false, counts: { orphans: 0 } } as never;
const riskIntake = (CPPA_RISK_PERFECT as readonly { intake: Record<string, unknown> }[])[0].intake;
const dpiaIntake = (DPIA_PERFECT as readonly { intake: Record<string, unknown> }[])[0].intake;

const gate = (csc: unknown) =>
  computeRecordComplete({
    product: "cppa-risk",
    contract: cppaRiskContract,
    intake: riskIntake,
    coverage: CLEAN_COVERAGE,
    csc: csc as never,
    recordNeedsMissingData: 0,
  });

// --- (1) GATE: repaired false absences do not hold the gate shut ------------
Deno.test("gate: TRUE when every false-absence violation is repaired", () => {
  const t = gate({
    crashed: false,
    violations: [
      { check_id: "r1_benefits_vs_intake", repaired: true },
      { check_id: "r2_exception_vs_record", repaired: true },
    ],
  });
  assertEquals(t.counts.csc_false_absence, 0);
  assertEquals(t.failed_conditions, []);
  assert(t.value);
});

Deno.test("gate: FALSE when any false-absence violation is unrepaired", () => {
  const t = gate({
    crashed: false,
    violations: [
      { check_id: "r1_benefits_vs_intake", repaired: true },
      { check_id: "r2_exception_vs_record", repaired: false },
    ],
  });
  assertEquals(t.counts.csc_false_absence, 1);
  assert(t.failed_conditions.includes("csc_false_absence"));
  assertEquals(t.value, false);
});

Deno.test("gate: still fail-closed on absent / crashed csc telemetry", () => {
  assertEquals(gate(null).value, false);
  assertEquals(gate({ crashed: true, violations: [] }).value, false);
});

Deno.test("record-complete version is bumped to item380r4", () => {
  assertEquals(RECORD_COMPLETE_VERSION, "record-complete-2026-08-05-item380r4");
});

// --- (2) VALUE_DEMAND_RE: noun "record" vs verb "record" --------------------
const NOUN_ASKS = [
  "The record does not yet include the decision whether to initiate.",
  "This record establishes the retention period.",
  "The present record is sufficient for the balancing frame.",
];
const VERB_ASKS = [
  "Record the retention period for each category.",
  "Record each transfer in the register.",
  "Record who approved the processing.",
];

Deno.test("VALUE_DEMAND_RE: noun 'record' does not trip the rule", () => {
  for (const t of NOUN_ASKS) assertEquals(VALUE_DEMAND_RE.test(t), false, t);
});

Deno.test("VALUE_DEMAND_RE: imperative verb 'record' still trips the rule", () => {
  for (const t of VERB_ASKS) assertEquals(VALUE_DEMAND_RE.test(t), true, t);
});

// --- (3)+(4) by-design action surfaces --------------------------------------
const BY_DESIGN = [
  "Enter the date in DD/MM/YYYY form at technical_sheet.completion_date.",
  "The technical_sheet.formal_validation_date is completed on validation.",
  "The entry this document leaves blank at section_6_conclusion.sign_off_template.",
  "The record does not yet include the decision whether to initiate the processing, which 11 CCR § 7152(a)(7) requires.",
];

Deno.test("by-design surfaces are recognised", () => {
  for (const t of BY_DESIGN) assert(isByDesignActionSurface(t), t);
});

Deno.test("by-design surfaces classify as action_item on the perfect records", () => {
  for (const text of BY_DESIGN.slice(0, 3)) {
    const c = classifyOpenItem(text, { contract: dpiaFrameworkContract, intake: dpiaIntake } as never);
    assertEquals(c.klass, "action_item", text);
  }
  const risk = classifyOpenItem(BY_DESIGN[3], {
    contract: cppaRiskContract,
    intake: riskIntake,
  } as never);
  assertEquals(risk.klass, "action_item");
});

Deno.test("assign / appoint / designate asks are action items", () => {
  for (const text of [
    "Assign the remediation plan to the CISO.",
    "Appoint the DPO named in the record.",
    "Designate the reviewer for the annual re-assessment.",
    "Attach the transfer instrument to the file.",
  ]) {
    const c = classifyOpenItem(text, { contract: dpiaFrameworkContract, intake: dpiaIntake } as never);
    assertEquals(c.klass, "action_item", text);
  }
});

// --- (5) risk affirmative framing survives the LIVE surface shapes ----------
const TEL = { value: true } as never;
const CLASS = { counts: { action_item: 0, preconditions: 0 } } as never;
const TEXT = affirmativeParagraph(0, 0);

Deno.test("framing lands on the LIVE shapes (string exec summary, array record_sufficiency)", () => {
  const report: Record<string, unknown> = {
    executive_summary: "The assessment concludes the processing may proceed.",
    record_sufficiency: ["Element one.", "Element two."],
  };
  applyRiskRecordCompleteFraming(report, TEL, CLASS);
  assert(String(report.executive_summary).includes(TEXT));
  assert(Array.isArray(report.record_sufficiency));
  assertEquals((report.record_sufficiency as string[])[0], TEXT);
  assertEquals(report.record_sufficiency_statement, TEXT);
});

Deno.test("framing is idempotent and preserves surface shape", () => {
  const report: Record<string, unknown> = {
    executive_summary: "Summary.",
    record_sufficiency: ["Element one."],
  };
  applyRiskRecordCompleteFraming(report, TEL, CLASS);
  applyRiskRecordCompleteFraming(report, TEL, CLASS);
  assertEquals((report.record_sufficiency as string[]).length, 2);
  assertEquals(typeof report.executive_summary, "string");
});

Deno.test("framing still supports the object exec-summary shape", () => {
  const report: Record<string, unknown> = { executive_summary: {}, record_sufficiency: {} };
  applyRiskRecordCompleteFraming(report, TEL, CLASS);
  assertEquals((report.executive_summary as Record<string, unknown>).record_sufficiency_statement, TEXT);
  assertEquals((report.record_sufficiency as Record<string, unknown>).prose, TEXT);
});

Deno.test("framing is a no-op when the gate is false", () => {
  const report: Record<string, unknown> = { executive_summary: "Summary.", record_sufficiency: ["x"] };
  applyRiskRecordCompleteFraming(report, { value: false } as never, CLASS);
  assertEquals(report.executive_summary, "Summary.");
  assertEquals(report.record_sufficiency_statement, undefined);
});
