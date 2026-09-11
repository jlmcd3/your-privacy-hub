// DOC 258 (2026-09-11) — the CEO's decisions on doc 257A, built. Pins the
// governance Art. 37(1)(c) conjunctive read (new intake elements, the scale
// rule, the four limb states and the overall result), the LIA and DPIA
// stale-review Conditions, the DPA 7.2 phasing clause and plain 2.3, the
// fleet-wide record-divider paragraph, and the Risk Q9 option set.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assessLimbC,
  buildDpoDetermination,
  LARGE_SCALE_SUBJECTS_FLOOR,
  parseApproximateCount,
  readGovernanceFacts,
  SMALL_SCALE_SUBJECTS_CEILING,
} from "../../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/build.ts";
import { governanceContract as GOVERNANCE_CONTRACT, SC_CORE_ACTIVITY, SC_DURATION, SC_GEOGRAPHIC_SCOPE, SC_POPULATION_PROPORTION } from "../../../../supabase/functions/_shared/intake-contracts/governance-assessment.ts";
import { staleAttestationConditions } from "../../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import { applyApprovalCurrency } from "../../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { assembleDpaDocument, type DpaAssembleInput } from "../../../../supabase/functions/generate-dpa/_local/clause-library/dpa-assemble.ts";
import { Q9_OPTS } from "../../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts";

type Bag = Record<string, unknown>;

async function src(rel: string): Promise<string> {
  return await Deno.readTextFile(new URL(rel, import.meta.url));
}

const GOV_BASE: Bag = {
  organization_name: "Calder Health Analytics Ltd",
  sector: "Healthcare/Life Sciences",
  org_size: "251-1000",
  jurisdictions: ["EU (GDPR)"],
  eu_uk_data: "Yes",
  data_categories: ["Customer records", "Health or medical data"],
  special_category: "Yes",
  special_categories_list: ["Health data"],
  dpo_status: "Yes, formal DPO",
};
const CORE_YES = SC_CORE_ACTIVITY[0];
const CORE_NO = SC_CORE_ACTIVITY[1];

// ── Item 4 — Article 37(1)(c) ──────────────────────────────────────────────

Deno.test("doc258 — the contract carries the seven Art. 37(1)(c) elements, gated on the categorical Yes", () => {
  const keys = GOVERNANCE_CONTRACT.fields.map((f) => f.key);
  for (const k of ["sc_core_activity", "sc_core_activity_explanation", "sc_data_subjects_count", "sc_population_proportion", "sc_data_volume", "sc_duration", "sc_geographic_scope"]) {
    assert(keys.includes(k), `contract carries ${k}`);
  }
  const core = GOVERNANCE_CONTRACT.fields.find((f) => f.key === "sc_core_activity")!;
  assertEquals(core.required, "conditional");
  assertEquals((core as Bag).hiddenValue, "n/a");
  assertEquals(SC_POPULATION_PROPORTION.length, 3);
  assertEquals(SC_DURATION.length, 4);
  assertEquals(SC_GEOGRAPHIC_SCOPE.length, 4);
});

Deno.test("doc258 — the form's option lists mirror the contract verbatim", async () => {
  const form = await src("../../../../src/pages/GovernanceAssessment.tsx");
  for (const list of [SC_CORE_ACTIVITY, SC_POPULATION_PROPORTION, SC_DURATION, SC_GEOGRAPHIC_SCOPE]) {
    for (const opt of list) assertStringIncludes(form, `"${opt}"`);
  }
  for (const k of ["sc_core_activity:", "sc_population_proportion:", "sc_duration:", "sc_geographic_scope:"]) assertStringIncludes(form, k);
});

Deno.test("doc258 — approximate counts parse", () => {
  assertEquals(parseApproximateCount("2,400,000"), 2_400_000);
  assertEquals(parseApproximateCount("2.4 million"), 2_400_000);
  assertEquals(parseApproximateCount("about 18k"), 18_000);
  assertEquals(parseApproximateCount("74,000"), 74_000);
  assertEquals(parseApproximateCount(""), null);
  assertEquals(parseApproximateCount("unknown"), null);
  assertEquals(LARGE_SCALE_SUBJECTS_FLOOR, 10_000);
  assertEquals(SMALL_SCALE_SUBJECTS_CEILING, 1_000);
});

Deno.test("doc258 — the limb (c) table: not relevant / not engaged / engaged / undetermined", () => {
  const f = (over: Bag) => readGovernanceFacts({ ...GOV_BASE, ...over });
  assertEquals(assessLimbC(f({ special_category: "No" })).state, "not_relevant");
  assertEquals(assessLimbC(f({ sc_core_activity: CORE_NO, sc_data_subjects_count: "2,400,000" })).state, "not_engaged");
  assertEquals(assessLimbC(f({ sc_core_activity: CORE_YES, sc_data_subjects_count: "400", sc_population_proportion: "No", sc_geographic_scope: "Local" })).state, "not_engaged");
  const engaged = assessLimbC(f({ sc_core_activity: CORE_YES, sc_data_subjects_count: "74,000", sc_population_proportion: "No", sc_duration: "Continuous or ongoing", sc_geographic_scope: "Several Member States or countries" }));
  assertEquals(engaged.state, "engaged");
  assertEquals(engaged.scale, "established");
  assertEquals(assessLimbC(f({ sc_core_activity: CORE_YES, sc_data_subjects_count: "2,500", sc_population_proportion: "Unsure", sc_duration: "Recurring", sc_geographic_scope: "National" })).state, "undetermined");
  assertEquals(assessLimbC(f({ sc_core_activity: "Uncertain", sc_data_subjects_count: "2,400,000", sc_population_proportion: "Yes — a significant proportion of the relevant population", sc_duration: "Continuous or ongoing", sc_geographic_scope: "National" })).state, "undetermined");
  // Temporary processing never reads as large scale on the number alone.
  assertEquals(assessLimbC(f({ sc_core_activity: CORE_YES, sc_data_subjects_count: "50,000", sc_duration: "Temporary or one-off" })).scale, "undetermined");
  // Unanswered on a legacy record: live, not established, and flagged as unanswered.
  const legacy = assessLimbC(f({}));
  assertEquals(legacy.state, "undetermined");
  assertEquals(legacy.answered, false);
  // Hidden values are not answers.
  assertEquals(assessLimbC(f({ sc_core_activity: "n/a", sc_population_proportion: "n/a" })).answered, false);
});

Deno.test("doc258 — the DPO determination: engaged (c) is mandatory with the recorded factors; ancillary is not engaged; unanswered is live with the headcount sentence", () => {
  const engaged = buildDpoDetermination({
    ...GOV_BASE,
    sc_core_activity: CORE_YES,
    sc_core_activity_explanation: "Clinical-outcome analytics is the service sold.",
    sc_data_subjects_count: "2,400,000",
    sc_population_proportion: "Yes — a significant proportion of the relevant population",
    sc_duration: "Continuous or ongoing",
    sc_geographic_scope: "Several Member States or countries",
  }) as unknown as Bag;
  const app = String((engaged.designation_trigger as Bag).application);
  assertStringIncludes(app, "Designation is mandatory here, not discretionary.");
  assertStringIncludes(app, "(c) applies: the company states that its processing of special categories (Health data) is a primary activity");
  assertStringIncludes(app, "approximately 2,400,000 data subjects; a significant proportion of the relevant population; continuous or ongoing processing; several Member States or countries in geographical scope");
  assertStringIncludes(String((engaged.designation_trigger as Bag).record_fact), "Special-category processing (Health data): core activity — Yes");
  assertEquals(String((engaged.designation_trigger as Bag).verdict), "satisfied");

  const ancillary = buildDpoDetermination({ ...GOV_BASE, sc_core_activity: CORE_NO, sc_core_activity_explanation: "Occupational-health records of our own staff.", sc_data_subjects_count: "620", sc_population_proportion: "No", sc_duration: "Continuous or ongoing", sc_geographic_scope: "Local" }) as unknown as Bag;
  const ancApp = String((ancillary.designation_trigger as Bag).application);
  assert(!ancApp.includes("Designation is mandatory here"));
  assertStringIncludes(ancApp, "Limb (c) is not engaged: on the company's own answer its processing of special categories (Health data) is an ancillary or supporting activity");
  assertStringIncludes(ancApp, "Designation is therefore voluntary.");
  assertEquals(String((ancillary.designation_trigger as Bag).verdict), "not_applicable");

  const legacy = buildDpoDetermination(GOV_BASE) as unknown as Bag;
  const legApp = String((legacy.designation_trigger as Bag).application);
  assertStringIncludes(legApp, "organisational headcount does not by itself establish that the relevant processing is large scale or forms part of the company's core activities, and the core-activity and scale questions were not answered in this assessment");
  assertStringIncludes(legApp, "Pending that answer, the prudent course is to treat designation as warranted");
  assertEquals(String((legacy.designation_trigger as Bag).verdict), "record_insufficient");
  assertStringIncludes(String((legacy.designation_trigger as Bag).information_needed), "the Article 37(1)(c) limb turns on those, not on headcount");

  const open = buildDpoDetermination({ ...GOV_BASE, sc_core_activity: CORE_YES, sc_data_subjects_count: "2,500", sc_population_proportion: "Unsure", sc_duration: "Recurring", sc_geographic_scope: "National" }) as unknown as Bag;
  assertStringIncludes(String((open.designation_trigger as Bag).application), "but the recorded scale factors — approximately 2,500 data subjects; recurring processing; national in geographical scope — do not settle whether that processing is large scale");
});

Deno.test("doc258 — a record with no EU or UK personal data reports the limbs but raises no designation gap", () => {
  const usOnly = buildDpoDetermination({ ...GOV_BASE, jurisdictions: ["California (CCPA/CPRA)"], eu_uk_data: "No", org_size: "51-250", dpo_status: "n/a", sc_core_activity: CORE_YES, sc_data_subjects_count: "74,000", sc_population_proportion: "No", sc_duration: "Continuous or ongoing", sc_geographic_scope: "National" }) as unknown as Bag;
  const t = usOnly.designation_trigger as Bag;
  assertEquals(String(t.verdict), "not_applicable");
  assertEquals(String(t.status), "analysed");
  assertStringIncludes(String(t.application), "designation would be mandatory were the GDPR or UK GDPR to apply");
  assertEquals(t.information_needed, undefined);
});

// ── Item 2 — stale review / approval as a Condition ────────────────────────

Deno.test("doc258 — LIA: a review or approval more than twelve months old draws a Condition; a current one does not", () => {
  const asOf = new Date("2026-09-11T00:00:00Z");
  const annual = staleAttestationConditions({ dpo_review_date: "2024-03-15", approval_date: "2024-03-20" }, { balancing_details: { safeguards: "DPO reviews the LIA annually" } }, asOf);
  assertEquals(annual.length, 2);
  assertEquals(annual[0].text, "Complete the review of this assessment by the data protection function: the last recorded review was on 2024-03-15, more than twelve months before this assessment, and the record commits to an annual review");
  assertEquals(annual[1].text, "Record a current approval of this assessment: the last recorded approval was on 2024-03-20, more than twelve months before this assessment");
  assertEquals(annual[0].provision, "GDPR Art. 5(2)");
  assertEquals(staleAttestationConditions({ dpo_review_date: "2026-03-15", approval_date: "2026-03-20" }, {}, asOf), []);
  assertEquals(staleAttestationConditions({}, {}, asOf), []);
});

Deno.test("doc258 — DPIA: a stale approval turns an approval into a conditional approval; anything else is untouched", () => {
  const approved = { determination: "approved", conditions: [], blockers: [], why: "May proceed.", citation: "GDPR Art. 35(1)", rule_id: "dpia_decision_v1" } as const;
  const asOf = new Date("2026-09-11T00:00:00Z");
  const stale = applyApprovalCurrency({ dpia_approval_date: "2024-03-20", dpia_signoff_basis: "Condition: annual DPO re-review." }, approved, asOf);
  assertEquals(stale.determination, "conditionally_approved");
  assertEquals(stale.conditions, ["completing and recording the current review of this assessment — the approval recorded on 2024-03-20 is more than twelve months old at the date of this report, and the sign-off basis itself calls for an annual re-review"]);
  assertStringIncludes(stale.why, "May proceed. The processing may proceed as described on one condition: completing and recording the current review");
  assertEquals(applyApprovalCurrency({ dpia_approval_date: "2026-07-30" }, approved, asOf), approved);
  assertEquals(applyApprovalCurrency({}, approved, asOf), approved);
  const conditional = { ...approved, determination: "conditionally_approved" as const, conditions: ["x"] };
  assertEquals(applyApprovalCurrency({ dpia_approval_date: "2024-03-20" }, conditional, asOf), conditional);
});

// ── Items 1 and 5 — DPA clauses ────────────────────────────────────────────

const DPA_BASE: DpaAssembleInput = {
  documentType: "gdpr", controllerName: "Acme GmbH", controllerJurisdiction: "Germany", processorName: "CloudOps GmbH", processorJurisdiction: "Germany",
  services: "cloud hosting", dataCategories: ["General personal data"], retention: "For the term", hasSubProcessors: false, subProcessorList: "",
  subprocessorAuthorizationModel: "general", subprocessorNoticeDays: 30, auditRights: "Annual audit", includeTransferClause: false, transferMechanism: "",
  securityMeasuresSelected: ["encryption_at_rest"], securityMeasuresDetails: "AES-256", californiaEngaged: false,
};

Deno.test("doc258 — DPA 7.2 carries the Art. 33(4) phasing clause and 2.3 is the plain definition (gdpr and uk)", () => {
  for (const documentType of ["gdpr", "uk"] as const) {
    const t = assembleDpaDocument({ ...DPA_BASE, documentType }).document_text;
    assertStringIncludes(t, "and in any event within [48] hours, or within such shorter period as is necessary");
    assertStringIncludes(t, "providing the information then reasonably available to the Processor and supplementing it in phases without undue further delay as further information becomes available (Article 33(4) of");
    assertStringIncludes(t, "The notification shall describe the nature of the breach");
    assertStringIncludes(t, '2.3 "DPA" means this Data Processing Agreement.');
    assert(!t.includes("not used to refer to any data protection authority"));
  }
});

// ── Item 6 — the record divider, fleet-wide ────────────────────────────────

Deno.test("doc258 — every copy of the record-divider paragraph carries ChatGPT's text and none the old one", async () => {
  const NEW = "The appendices provide the factual and legal support for the conclusions above. They are intended for counsel, auditors, and regulators.";
  for (const rel of [
    "../../../../supabase/functions/generate-report-pdf/index.ts",
    "../../../../supabase/functions/generate-ropa-document/_local/prose/syllabus-page-html.ts",
    "../../../../src/components/reports/SkeletonDocumentView.tsx",
  ]) {
    const t = await src(rel);
    assertStringIncludes(t, NEW);
    assert(!t.includes("The record that stands behind every conclusion above"), rel);
  }
});

// ── Item 7 — Risk Q9 option set ────────────────────────────────────────────

Deno.test("doc258 — Q9 carries the settings-area option beside the homepage options", async () => {
  assert(Q9_OPTS.includes("Yes — in the settings area of our app, smart TV or other device without a homepage"));
  assert(Q9_OPTS.includes("Yes, but in footer only"));
  const form = await src("../../../../src/pages/CPPARiskAssessment.tsx");
  assertStringIncludes(form, "Yes — in the settings area of our app, smart TV or other device without a homepage");
  const engine = await src("../../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-factor-engine.ts");
  assert(!engine.includes("Credited — footer placement"), "the placement label is retired");
  assert(!engine.includes("Confirm that the “Do Not Sell or Share My Personal Information” link is clear and conspicuous"), "the confirmation Recommendation is retired");
});
