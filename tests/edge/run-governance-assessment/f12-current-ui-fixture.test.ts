// F12 (Governance Intake Master Review, 2026-09-15) — current-UI fixture
// coverage for the `governance-perfect` golden set.
//
// F12 found that the registered `gov-occupational-health-eu-uk-perfect`
// fixture (a) has no `retention_schedule_status` at all, so reconstructing
// its Step 3 submission through the page's own `stepValid` fails, and
// (b) uses `transfer_mechanism: "EU Standard Contractual Clauses (SCCs)"`,
// which is not a selectable option once BOTH "EU (GDPR)" and "United
// Kingdom (UK GDPR)" are in `jurisdictions` (the mixed-branch option list is
// different from the EU-only branch's). The intake contract accepts the
// union of mechanism labels and marks retention "optional" (legacy-row
// compatibility), so this was UI/fixture drift, not a backend rejection.
//
// governance-perfect.ts keeps the historical fixture byte-for-byte, and adds
// a second fixture, `gov-occupational-health-eu-uk-perfect-ui-2026-09`, that
// reconstructs the same fictional organisation as a fully current-UI-valid
// submission. This file:
//   1. imports both fixtures;
//   2. validates the new fixture with validateIntake() against the live
//      governanceContract — ok must be true;
//   3. reads the live page source and, by regex, extracts every option list
//      the new fixture's enum answers must appear in verbatim (including the
//      mixed EU+UK transfer_mechanism branch), and checks each one;
//   4. asserts retention_schedule_status is present/non-empty on the new
//      fixture and absent/empty on the historical one (documenting the
//      drift F12 found, so this test starts failing the day someone
//      "fixes" the historical fixture instead of adding a new one);
//   5. pins the historical fixture against an embedded JSON snapshot so it
//      cannot drift silently;
// and, as a belt-and-suspenders double-check, reimplements stepValid's own
// per-step requirements (GovernanceAssessment.tsx ~L198-231) and confirms
// the new fixture satisfies every branch actually reachable from its
// answers.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { GOVERNANCE_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/governance-perfect.ts";
import { governanceContract } from "../../../supabase/functions/_shared/intake-contracts/governance-assessment.ts";
import { validateIntake } from "../../../supabase/functions/run-quality-batch/_local/intake-contracts/validate.ts";

// ── (1) import both fixtures ────────────────────────────────────────────
const HISTORICAL = GOVERNANCE_PERFECT.find((c) => c.id === "gov-occupational-health-eu-uk-perfect");
const CURRENT_UI = GOVERNANCE_PERFECT.find((c) => c.id === "gov-occupational-health-eu-uk-perfect-ui-2026-09");

Deno.test("F12: both the historical and current-UI governance-perfect fixtures are registered", () => {
  assert(HISTORICAL, "historical fixture gov-occupational-health-eu-uk-perfect not found in GOVERNANCE_PERFECT");
  assert(CURRENT_UI, "current-UI fixture gov-occupational-health-eu-uk-perfect-ui-2026-09 not found in GOVERNANCE_PERFECT");
  assertEquals(HISTORICAL!.tool, "governance");
  assertEquals(CURRENT_UI!.tool, "governance");
});

// ── (2) validateIntake against the live contract ────────────────────────
Deno.test("F12 current-UI fixture: validateIntake against governanceContract is ok", () => {
  const res = validateIntake(governanceContract, CURRENT_UI!.intake as Record<string, unknown>);
  assertEquals(res.violations, [], `unexpected contract violations: ${JSON.stringify(res.violations, null, 2)}`);
  assertEquals(res.ok, true);
});

// ── (4) retention_schedule_status: present on the new fixture, absent/empty
//        on the historical one — this is the drift F12 found, and this
//        assertion documents it rather than silently normalizing it away.
Deno.test("F12: retention_schedule_status is present on the current-UI fixture and absent/empty on the historical one", () => {
  const curIntake = CURRENT_UI!.intake as Record<string, unknown>;
  const histIntake = HISTORICAL!.intake as Record<string, unknown>;

  const curVal = curIntake.retention_schedule_status;
  assert(typeof curVal === "string" && curVal.length > 0,
    `current-UI fixture must have a non-empty retention_schedule_status, got: ${JSON.stringify(curVal)}`);

  const histVal = histIntake.retention_schedule_status;
  assert(histVal === undefined || histVal === null || histVal === "",
    "historical fixture is expected to omit retention_schedule_status (this is the F12 drift being documented); " +
    "if this now fails, the historical fixture's facts were changed, which F12 says not to do — add/keep the drift " +
    "here and let the current-UI fixture carry the fix instead");
});

// ── (3) page option-list parity, by regex extraction from the live source ─

const PAGE_SRC = await Deno.readTextFile(
  new URL("../../../src/pages/GovernanceAssessment.tsx", import.meta.url),
);

// Parses a bracketed array-literal substring, e.g. `["a", "b"]`, into string
// values. Every option list on this page is a flat array of double-quoted
// string literals (no nesting), so matching individual `"..."` runs and
// JSON-parsing each is exact and doesn't need a full JS parser.
function parseArrayLiteral(bracket: string): string[] {
  const out: string[] = [];
  const re = /"(?:[^"\\]|\\.)*"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(bracket)) !== null) out.push(JSON.parse(m[0]));
  return out;
}

// Resolves an `options={...}` capture: either an inline array literal or a
// reference to a top-level `const NAME = [...]` on the page (the master
// review moved several lists to named consts so the contract can pin them).
function resolveOptions(capture: string, where: string): string[] {
  if (capture.startsWith("[")) return parseArrayLiteral(capture);
  return constArray(capture, where);
}

// Extracts the options array for a `<Radio name="..." options={[...]} .../>`
// (or `options={CONST}`) block, keyed on its unique `name` attribute.
function radioOptions(name: string): string[] {
  const re = new RegExp(`name="${name}"\\s+options=\\{(\\[[^\\]]*\\]|[A-Za-z_][A-Za-z0-9_]*)\\}`);
  const m = PAGE_SRC.match(re);
  assert(m, `<Radio name="${name}" ...> options array not found in GovernanceAssessment.tsx`);
  return resolveOptions(m![1], `<Radio name="${name}">`);
}

// Extracts the options array for a `<Pills options={[...]} value={binding}
// .../>` (or `options={CONST}`) block, keyed on its unique `value` binding.
function pillsOptionsForValue(valueBinding: string): string[] {
  const re = new RegExp(`options=\\{(\\[[^\\]]*\\]|[A-Za-z_][A-Za-z0-9_]*)\\}\\s*value=\\{${valueBinding}\\}`);
  const m = PAGE_SRC.match(re);
  assert(m, `<Pills ... value={${valueBinding}}> options array not found in GovernanceAssessment.tsx`);
  return resolveOptions(m![1], `<Pills value={${valueBinding}}>`);
}

// Extracts a top-level `const NAME = [...]` array literal.
function constArray(name: string, where = ""): string[] {
  const re = new RegExp(`const ${name} = (\\[[^\\]]*\\]);`);
  const m = PAGE_SRC.match(re);
  assert(m, `const ${name} = [...] array not found in GovernanceAssessment.tsx${where ? ` (referenced by ${where})` : ""}`);
  return parseArrayLiteral(m![1]);
}

// The mixed EU+UK branch of transferMechOptions (GovernanceAssessment.tsx
// ~L191-194): a three-way ternary keyed on isUk/isEu whose default (third)
// arm is the mixed-jurisdiction option list. This fixture carries both EU
// and UK jurisdictions, so it is always on that third arm.
function mixedTransferMechOptions(): string[] {
  const m = PAGE_SRC.match(/const transferMechOptions =([\s\S]*?);/);
  assert(m, "transferMechOptions ternary not found in GovernanceAssessment.tsx");
  const brackets = m![1].match(/\[[^\]]*\]/g);
  assert(brackets && brackets.length === 3,
    `expected 3 branch arrays in the transferMechOptions ternary, found ${brackets?.length ?? 0}`);
  return parseArrayLiteral(brackets![2]);
}

Deno.test("F12 current-UI fixture: every enum answer is a verbatim current-UI option", () => {
  const intake = CURRENT_UI!.intake as Record<string, unknown>;

  const singleChecks: Array<[string, string[], string]> = [
    ["sector", constArray("SECTORS"), intake.sector as string],
    ["org_size", constArray("SIZES"), intake.org_size as string],
    ["sc_core_activity", constArray("SC_CORE_ACTIVITY"), intake.sc_core_activity as string],
    ["sc_population_proportion", constArray("SC_POPULATION_PROPORTION"), intake.sc_population_proportion as string],
    ["sc_duration", constArray("SC_DURATION"), intake.sc_duration as string],
    ["sc_geographic_scope", constArray("SC_GEOGRAPHIC_SCOPE"), intake.sc_geographic_scope as string],
    ["eu_uk_data", radioOptions("euuk"), intake.eu_uk_data as string],
    ["special_category", radioOptions("spec"), intake.special_category as string],
    ["privacy_policy", radioOptions("pp"), intake.privacy_policy as string],
    ["privacy_notice_coverage", radioOptions("pncov"), intake.privacy_notice_coverage as string],
    ["dpo_status", radioOptions("dpo"), intake.dpo_status as string],
    ["dpia_status", radioOptions("dpia"), intake.dpia_status as string],
    ["dpia_ai_coverage", radioOptions("dpia_ai"), intake.dpia_ai_coverage as string],
    ["incident_response", radioOptions("ir"), intake.incident_response as string],
    ["training_status", radioOptions("train"), intake.training_status as string],
    ["training_ai_coverage", radioOptions("train_ai"), intake.training_ai_coverage as string],
    ["tool_instruction", radioOptions("ti"), intake.tool_instruction as string],
    ["technical_controls", radioOptions("tc"), intake.technical_controls as string],
    ["dsr_capability", radioOptions("dsr"), intake.dsr_capability as string],
    ["inventory_audit", radioOptions("inv"), intake.inventory_audit as string],
    ["retention_schedule_status", radioOptions("retention"), intake.retention_schedule_status as string],
    ["dpa_status", radioOptions("dpa"), intake.dpa_status as string],
    ["dpa_art28_verified", radioOptions("dpa28"), intake.dpa_art28_verified as string],
    ["transfer_status", radioOptions("xfer"), intake.transfer_status as string],
    ["measures_review_cadence", radioOptions("review_cadence"), intake.measures_review_cadence as string],
    ["remediation_default_priority", radioOptions("rem_priority"), intake.remediation_default_priority as string],
    ["remediation_default_validation_method", radioOptions("rem_validation"), intake.remediation_default_validation_method as string],
  ];
  for (const [key, options, value] of singleChecks) {
    assert(options.includes(value),
      `${key}: "${value}" is not a verbatim current-UI option. Page options: ${JSON.stringify(options)}`);
  }

  const multiChecks: Array<[string, string[], string[]]> = [
    ["jurisdictions", constArray("JURISDICTIONS"), intake.jurisdictions as string[]],
    ["tools", constArray("TOOLS"), intake.tools as string[]],
    ["data_categories", constArray("DATA_CATS"), intake.data_categories as string[]],
    ["special_categories_list", constArray("SPECIAL_CATS"), intake.special_categories_list as string[]],
    ["technical_controls_list", pillsOptionsForValue("technicalControlsList"), intake.technical_controls_list as string[]],
    ["dsr_rights_tested", pillsOptionsForValue("dsrRightsTested"), intake.dsr_rights_tested as string[]],
  ];
  for (const [key, options, values] of multiChecks) {
    for (const v of values) {
      assert(options.includes(v),
        `${key}: "${v}" is not a verbatim current-UI option. Page options: ${JSON.stringify(options)}`);
    }
  }

  // transfer_mechanism — specifically the MIXED EU+UK branch, since this
  // fixture carries both "EU (GDPR)" and "United Kingdom (UK GDPR)".
  const jurisdictions = intake.jurisdictions as string[];
  assert(
    jurisdictions.includes("EU (GDPR)") && jurisdictions.includes("United Kingdom (UK GDPR)"),
    "this fixture is expected to carry both EU and UK jurisdictions (that's the mixed branch F12 is about)",
  );
  const mixedOptions = mixedTransferMechOptions();
  assert(
    mixedOptions.includes(intake.transfer_mechanism as string),
    `transfer_mechanism "${intake.transfer_mechanism}" is not a verbatim mixed-branch option. ` +
      `Mixed-branch page options: ${JSON.stringify(mixedOptions)}`,
  );
  // And explicitly NOT the EU-only branch's label, which is the drift F12 found.
  assert(
    intake.transfer_mechanism !== "EU Standard Contractual Clauses (SCCs)",
    "transfer_mechanism must not be the EU-only-branch label once both EU and UK jurisdictions are selected",
  );
});

// ── stepValid double-check (belt-and-suspenders) ─────────────────────────
// Reimplements GovernanceAssessment.tsx's stepValid() (~L198-231) directly
// against the new fixture's buildIntake-shaped keys, so a future edit to
// either the fixture or the step gating logic that reintroduces a gap gets
// caught here rather than only downstream.
Deno.test("F12 current-UI fixture: satisfies stepValid for every step it can reach", () => {
  const intake = CURRENT_UI!.intake as Record<string, unknown>;
  const nonEmptyStr = (v: unknown) => typeof v === "string" && v.trim().length > 0;
  const nonEmptyArr = (v: unknown) => Array.isArray(v) && v.length > 0;

  const euUkData = intake.eu_uk_data as string;
  // showDpoQ = euUkData === "Yes" || orgSizeNum === "large"; euUkData alone
  // already satisfies it for this fixture.
  const showDpoQ = euUkData === "Yes";
  const showStep5 = euUkData === "Yes";

  // Step 1
  assert(nonEmptyStr(intake.organization_name), "Step 1: organization_name required");
  assert(
    nonEmptyStr(intake.sector) && nonEmptyStr(intake.org_size) && nonEmptyArr(intake.jurisdictions) &&
      nonEmptyStr(intake.eu_uk_data) && nonEmptyArr(intake.tools),
    "Step 1: sector/org_size/jurisdictions/eu_uk_data/tools all required",
  );

  // Step 2
  assert(nonEmptyArr(intake.data_categories) && nonEmptyStr(intake.special_category),
    "Step 2: data_categories/special_category required");
  if (intake.special_category === "Yes") {
    assert(nonEmptyArr(intake.special_categories_list), "Step 2: special_categories_list required when special_category=Yes");
    assert(
      nonEmptyStr(intake.sc_core_activity) && nonEmptyStr(intake.sc_population_proportion) &&
        nonEmptyStr(intake.sc_duration) && nonEmptyStr(intake.sc_geographic_scope),
      "Step 2: sc_core_activity/sc_population_proportion/sc_duration/sc_geographic_scope required when special_category=Yes",
    );
  }

  // Step 3
  assert(
    nonEmptyStr(intake.privacy_policy) && nonEmptyStr(intake.dpia_status) && nonEmptyStr(intake.incident_response),
    "Step 3: privacy_policy/dpia_status/incident_response required",
  );
  if (showDpoQ) assert(nonEmptyStr(intake.dpo_status), "Step 3: dpo_status required when showDpoQ");
  assert(nonEmptyStr(intake.dsr_capability), "Step 3: dsr_capability required");
  assert(nonEmptyStr(intake.inventory_audit), "Step 3: inventory_audit required");
  assert(nonEmptyStr(intake.retention_schedule_status), "Step 3: retention_schedule_status required (this is F12's fix)");
  if ((intake.dpia_status as string).startsWith("Yes")) {
    assert(nonEmptyStr(intake.dpia_ai_coverage), "Step 3: dpia_ai_coverage required when dpia_status starts with Yes");
  }
  if ((intake.privacy_policy as string).startsWith("Yes")) {
    assert(nonEmptyStr(intake.privacy_notice_coverage), "Step 3: privacy_notice_coverage required when privacy_policy starts with Yes");
  }

  // Step 4
  assert(nonEmptyStr(intake.training_status) && nonEmptyStr(intake.tool_instruction),
    "Step 4: training_status/tool_instruction required");
  assert(nonEmptyStr(intake.technical_controls), "Step 4: technical_controls required");
  if ((intake.training_status as string).startsWith("Yes")) {
    assert(nonEmptyStr(intake.training_ai_coverage), "Step 4: training_ai_coverage required when training_status starts with Yes");
  }

  // Step 5 (only reachable when showStep5)
  if (showStep5) {
    assert(nonEmptyStr(intake.dpa_status) && nonEmptyStr(intake.transfer_status),
      "Step 5: dpa_status/transfer_status required");
    if (intake.dpa_status === "Yes, all vendors" || intake.dpa_status === "Most vendors") {
      assert(nonEmptyStr(intake.dpa_art28_verified), "Step 5: dpa_art28_verified required for this dpa_status");
    }
    if (intake.transfer_status === "Yes, US-based tools" || intake.transfer_status === "Yes, other non-adequate countries") {
      assert(nonEmptyStr(intake.transfer_mechanism), "Step 5: transfer_mechanism required for this transfer_status");
    }
  }
});

// ── (5) historical fixture pinned against an embedded JSON snapshot ──────
// A byte-for-byte JSON.stringify comparison, independent of the source file,
// so neither a value change nor a silent key-order change goes unnoticed.
const HISTORICAL_SNAPSHOT = {
  id: "gov-occupational-health-eu-uk-perfect",
  tool: "governance",
  set: "tuning",
  intake: {
    organization_name: "Aldergate Occupational Health Services Ltd",
    sector: "Healthcare/Life Sciences",
    org_size: "251-1000",
    jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
    eu_uk_data: "Yes",
    tools: ["Google Workspace / Gemini", "Zoom + AI features", "HubSpot"],
    data_categories: [
      "Contact details",
      "Employee records",
      "Health or medical data",
      "Communications content",
    ],
    special_category: "Yes",
    special_categories_list: ["Health data"],
    sc_core_activity: "Yes — a primary activity, or inextricably part of delivering our principal products or services",
    sc_core_activity_explanation: "Occupational-health assessment is the only service Aldergate provides; every engagement produces and relies on clinical findings about the employee assessed.",
    sc_data_subjects_count: "74,000",
    sc_population_proportion: "No",
    sc_data_volume: "Full occupational-health clinical records — history, examination findings, fitness determinations and adjustment recommendations — for every employee assessed.",
    sc_duration: "Continuous or ongoing",
    sc_geographic_scope: "Several Member States or countries",
    privacy_policy: "Yes, current (reviewed in last 12 months)",
    privacy_notice_coverage: "Yes — notice covers all current activities, transfers, retention, and rights",
    dpo_status: "Yes, formal DPO",
    dpia_status: "Yes, multiple DPIAs completed",
    dpia_ai_coverage: "Yes — all AI/high-risk tools assessed",
    incident_response: "Yes, tested in last 12 months",
    training_status: "Yes, formal onboarding + annual refresh",
    training_ai_coverage: "Yes — explicitly covers AI tools",
    tool_instruction: "Yes, written policy with specific prohibitions",
    dpa_status: "Yes, all vendors",
    dpa_art28_verified: "Yes — verified",
    transfer_status: "Yes, US-based tools",
    transfer_mechanism: "EU Standard Contractual Clauses (SCCs)",
    technical_controls: "Yes — DLP/content filtering actively enforced",
    technical_controls_list: [
      "DLP rules",
      "Content filtering",
      "Endpoint upload restrictions",
      "Approval workflow",
    ],
    dsr_capability: "Yes — documented and tested across all vendors",
    dsr_rights_tested: ["Access", "Erasure", "Portability", "Rectification"],
    inventory_audit: "Yes — audited + formal approval process",
    measures_review_cadence: "Annually or more often",
    measures_last_review_date: "2026-02-09",
    processing_nature: "Aldergate runs pre-placement and periodic fitness-for-work assessments for employer clients. Clinical records are held in Medisyne OH (Medisyne Software BV, Utrecht — processor under a signed Art. 28 DPA dated 2025-09-04), appointment scheduling and client correspondence run in HubSpot (HubSpot Inc., Cambridge MA — processor under HubSpot's Art. 28 DPA with the 2021 EU SCCs and the UK Addendum, countersigned 2025-10-16), remote consultations run in Zoom with the AI companion summary feature restricted to Aldergate's clinician accounts (Zoom Communications Inc. — processor under an Art. 28 DPA dated 2025-07-22), and internal correspondence runs in Google Workspace with Gemini enabled for administrative staff only (Google Ireland Ltd — processor under the Google Workspace Data Processing Addendum, in force from 2025-04-01). No automated system issues a fitness determination; every determination is signed by a named occupational-health physician.",
    processing_scope: "Approximately 74,000 assessment records covering employees of 310 client employers across Ireland, the Netherlands and the United Kingdom, with roughly 2,100 new assessments each month. Clinical records are retained for 40 years from the date of the last assessment, the period set by the UK Control of Substances Hazardous to Health Regulations 2002 reg. 11 health-record duty for the surveillance cohort and applied as the single clinical retention rule; scheduling and billing records are retained for 7 years from the end of the accounting period, set by the Companies Act audit-trail requirement, and are deleted by a scheduled quarterly job owned by the Head of IT.",
    processing_context: "The people assessed are employees of Aldergate's client employers, not Aldergate's own customers, and attendance is a condition of their employment, so their ability to decline is limited and the imbalance is material. Clinical findings are never released to the employer: the employer receives only a fitness outcome and any recommended adjustments, and the underlying record stays with the Aldergate clinician. Expectations are set by the appointment notice issued by Aldergate at booking and by the employer's own staff privacy notice, which the contract requires the employer to keep aligned.",
    processing_purposes: "Determining fitness for a specific role, recommending workplace adjustments under equality legislation, carrying out statutory health surveillance for employees exposed to noise, vibration and respiratory sensitisers, and reporting anonymised aggregate attendance and outcome statistics to the commissioning employer. There is no secondary research use, no profiling, and no onward disclosure to insurers.",
    remediation_default_owner: "Priya Raghunathan, Data Protection Officer, reporting directly to the Chief Executive with a standing quarterly item at the Board Audit and Risk Committee",
    remediation_default_target_date: "2026-12-18",
    remediation_default_priority: "High — remediate this quarter",
    remediation_default_validation_method: "Internal audit sample",
    additional_context: "The Data Protection Officer holds no other role and does not own the information-security function, which sits with the Head of IT, so there is no Art. 38(6) conflict. The open governance question is the Zoom AI companion summary: it is enabled for clinician accounts, its output is written into the Medisyne consultation note, and the DPIA dated 2026-01-22 records the control as a mandatory clinician review of every generated summary before the note is signed. Aldergate has not yet evidenced that the review actually occurs on each note — the audit trail records the signature but not the edit history — and the Head of Clinical Governance is scheduled to report on that evidence gap by 2026-09-30.",
  },
  assertions: [
    { kind: "must_include", pattern: "Article 5\\(2\\)|Art\\. 5\\(2\\)", flags: "i", label: "accountability standard cited" },
    { kind: "must_include", pattern: "Article 24|Art\\. 24", flags: "i", label: "Art. 24(1) duty reached" },
    { kind: "must_include", pattern: "domain_element_findings", label: "ICO tracker element findings emitted" },
    { kind: "must_include", pattern: "remediation_plan", label: "remediation plan emitted" },
  ],
};

Deno.test("F12: historical fixture is byte-identical to the embedded snapshot (no silent drift)", () => {
  assertEquals(JSON.stringify(HISTORICAL), JSON.stringify(HISTORICAL_SNAPSHOT));
});
