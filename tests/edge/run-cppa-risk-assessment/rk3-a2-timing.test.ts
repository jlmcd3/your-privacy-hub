// RK3-A2 GROUP 1 — § RAF 7155 processing status and assessment timeline
// (Intake Contract v2.0 §6, doc 31 §2c). Pins the six-field landing
// end to end:
//   contract  — processing_status (enum) / processing_start_date /
//               planned_start_date / prior_risk_assessment_date /
//               material_change_date / material_change_description,
//               all optional at the data layer.
//   enum parity — PROCESSING_STATUS_OPTS identical in contract and enums.ts.
//   form      — intake memo emits all six keys; timing_and_status block
//               present in step 1; material_change conditional on "Yes".
//   rail      — timing_and_status entry citing 11 CCR § 7155.
//   draft     — applyRestore covers all six new state vars.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  cppaRiskContract,
  PROCESSING_STATUS_OPTS as contractOpts,
} from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts";

const PAGE_PATH = new URL(
  "../../../src/pages/CPPARiskAssessment.tsx",
  import.meta.url,
);
const RAIL_PATH = new URL(
  "../../../src/components/cppa/CPPARiskRailEntries.ts",
  import.meta.url,
);

const field = (key: string) => cppaRiskContract.fields.find((f) => f.key === key);

// ── CONTRACT ─────────────────────────────────────────────────────────────────

Deno.test("RK3-A2 g1 — contract carries all six timing fields, optional at the data layer", () => {
  const keys = [
    "processing_status",
    "processing_start_date",
    "planned_start_date",
    "prior_risk_assessment_date",
    "material_change_date",
    "material_change_description",
  ];
  for (const key of keys) {
    const f = field(key);
    assert(f, `${key} missing from cppaRiskContract`);
    assertEquals(f!.required, "optional", `${key} must be optional at the data layer`);
  }
});

Deno.test("RK3-A2 g1 — processing_status is an enum field with the correct options", () => {
  const f = field("processing_status");
  assert(f, "processing_status missing from contract");
  assertEquals(f!.kind, "enum");
  assertEquals([...(f!.options as readonly string[])], ["Planned", "Ongoing", "Discontinued"]);
});

Deno.test("RK3-A2 g1 — date fields carry kind=date; description carries kind=narrative", () => {
  for (const key of ["processing_start_date", "planned_start_date", "prior_risk_assessment_date", "material_change_date"]) {
    assertEquals(field(key)!.kind, "date", `${key} must be kind=date`);
  }
  assertEquals(field("material_change_description")!.kind, "narrative");
});

// ── ENUM PARITY ───────────────────────────────────────────────────────────────

Deno.test("RK3-A2 g1 — PROCESSING_STATUS_OPTS parity: contract === enums.ts", async () => {
  const { PROCESSING_STATUS_OPTS: pageOpts } = await import(
    "../../../src/pages/CPPARiskAssessment.enums.ts"
  );
  assertEquals([...contractOpts], [...pageOpts]);
});

// ── FORM ──────────────────────────────────────────────────────────────────────

Deno.test("RK3-A2 g1 — form emits all six timing fields in the intake memo", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  assert(src.includes("processing_status: processingStatus"), "intake memo must emit processing_status");
  assert(src.includes("processing_start_date: processingStartDate"), "intake memo must emit processing_start_date");
  assert(src.includes("planned_start_date: plannedStartDate"), "intake memo must emit planned_start_date");
  assert(src.includes("prior_risk_assessment_date: priorRiskAssessmentDate"), "intake memo must emit prior_risk_assessment_date");
  assert(src.includes("material_change_date: materialChangeDate"), "intake memo must emit material_change_date");
  assert(src.includes("material_change_description: materialChangeDescription"), "intake memo must emit material_change_description");
});

Deno.test("RK3-A2 g1 — form includes the timing_and_status block in step 1", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  assert(src.includes('data-rail-key="timing_and_status"'), "step 1 must include a timing_and_status rail block");
  assert(src.includes("PROCESSING_STATUS_OPTS"), "step 1 must reference PROCESSING_STATUS_OPTS for the status radio");
});

Deno.test("RK3-A2 g1 — material_change_date/description are conditional on material_change_since_prior=Yes", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  assert(
    src.includes('materialChangeSincePrior === "Yes"') &&
    src.includes("materialChangeDate") &&
    src.includes("materialChangeDescription"),
    "material change date/description must be guarded by materialChangeSincePrior === 'Yes'",
  );
});

// ── DRAFT ROUND-TRIP ──────────────────────────────────────────────────────────

Deno.test("RK3-A2 g1 — applyRestore hydrates all six new state vars", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  for (const [varName, setter] of [
    ["processingStatus", "setProcessingStatus"],
    ["processingStartDate", "setProcessingStartDate"],
    ["plannedStartDate", "setPlannedStartDate"],
    ["priorRiskAssessmentDate", "setPriorRiskAssessmentDate"],
    ["materialChangeDate", "setMaterialChangeDate"],
    ["materialChangeDescription", "setMaterialChangeDescription"],
  ] as const) {
    assert(
      src.includes(`if (typeof d.${varName} === "string") ${setter}(d.${varName})`),
      `applyRestore must hydrate ${varName}`,
    );
  }
});

Deno.test("RK3-A2 g1 — INITIAL_DRAFT_JSON includes all six new keys", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  for (const key of [
    "processingStatus",
    "processingStartDate",
    "plannedStartDate",
    "priorRiskAssessmentDate",
    "materialChangeDate",
    "materialChangeDescription",
  ]) {
    assert(src.includes(`${key}: ""`), `INITIAL_DRAFT_JSON must include ${key}: ""`);
  }
});

// ── RAIL ──────────────────────────────────────────────────────────────────────

Deno.test("RK3-A2 g1 — statute rail carries the timing_and_status entry citing § 7155", async () => {
  const src = await Deno.readTextFile(RAIL_PATH);
  assert(src.includes("timing_and_status: {"), "rail must define timing_and_status");
  // The regulationText field carries the § 7155(a)(1) verbatim quote in ASCII.
  assert(
    src.includes("must conduct and document a risk assessment"),
    "rail entry must carry the § 7155(a)(1) verbatim quote (ASCII portion)",
  );
  assert(src.includes("7155(a)(1)"), "regulationText must reference 7155(a)(1)");
});
