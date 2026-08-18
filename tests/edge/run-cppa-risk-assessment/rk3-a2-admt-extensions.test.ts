// RK3-A2 GROUP 2 — § 7152(a)(3)(G)(i)/(ii) ADMT branch extensions
// (Intake Contract v2.0 §6, doc 31 §2c). Pins the five-field landing
// end to end:
//   contract  — admt_operational_role / admt_assumptions_limitations /
//               admt_output / admt_output_use / admt_consumer_effect,
//               all optional at the data layer.
//   form      — intake memo emits all five; ADMT panel extended with
//               the "Extended ADMT record" sub-section; fields conditional
//               on admtTriggered.
//   rail      — admt_extensions entry citing 11 CCR § 7152(a)(3)(G).
//   draft     — applyRestore covers all five new state vars.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { cppaRiskContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts";

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

Deno.test("RK3-A2 g2 — contract carries all five ADMT extension fields, optional at the data layer", () => {
  const keys = [
    "admt_operational_role",
    "admt_assumptions_limitations",
    "admt_output",
    "admt_output_use",
    "admt_consumer_effect",
  ];
  for (const key of keys) {
    const f = field(key);
    assert(f, `${key} missing from cppaRiskContract`);
    assertEquals(f!.required, "optional", `${key} must be optional at the data layer`);
    assertEquals(f!.kind, "narrative", `${key} must be kind=narrative`);
  }
});

// ── FORM ──────────────────────────────────────────────────────────────────────

Deno.test("RK3-A2 g2 — form emits all five ADMT extension fields in the intake memo", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  assert(src.includes("admt_operational_role: admtOperationalRole"), "intake memo must emit admt_operational_role");
  assert(src.includes("admt_assumptions_limitations: admtAssumptionsLimitations"), "intake memo must emit admt_assumptions_limitations");
  assert(src.includes("admt_output: admtOutput"), "intake memo must emit admt_output");
  assert(src.includes("admt_output_use: admtOutputUse"), "intake memo must emit admt_output_use");
  assert(src.includes("admt_consumer_effect: admtConsumerEffect"), "intake memo must emit admt_consumer_effect");
});

Deno.test("RK3-A2 g2 — form ADMT panel includes the extended ADMT record sub-section", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  assert(src.includes("admtOperationalRole"), "form must reference admtOperationalRole state");
  assert(src.includes("admtAssumptionsLimitations"), "form must reference admtAssumptionsLimitations state");
  assert(src.includes("admtOutput"), "form must reference admtOutput state");
  assert(src.includes("admtOutputUse"), "form must reference admtOutputUse state");
  assert(src.includes("admtConsumerEffect"), "form must reference admtConsumerEffect state");
  assert(src.includes("Extended ADMT record"), "form must label the extended ADMT sub-section");
});

// ── DRAFT ROUND-TRIP ──────────────────────────────────────────────────────────

Deno.test("RK3-A2 g2 — applyRestore hydrates all five ADMT extension state vars", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  for (const [varName, setter] of [
    ["admtOperationalRole", "setAdmtOperationalRole"],
    ["admtAssumptionsLimitations", "setAdmtAssumptionsLimitations"],
    ["admtOutput", "setAdmtOutput"],
    ["admtOutputUse", "setAdmtOutputUse"],
    ["admtConsumerEffect", "setAdmtConsumerEffect"],
  ] as const) {
    assert(
      src.includes(`if (typeof d.${varName} === "string") ${setter}(d.${varName})`),
      `applyRestore must hydrate ${varName}`,
    );
  }
});

Deno.test("RK3-A2 g2 — INITIAL_DRAFT_JSON includes all five new keys", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  for (const key of [
    "admtOperationalRole",
    "admtAssumptionsLimitations",
    "admtOutput",
    "admtOutputUse",
    "admtConsumerEffect",
  ]) {
    assert(src.includes(`${key}: ""`), `INITIAL_DRAFT_JSON must include ${key}: ""`);
  }
});

// ── RAIL ──────────────────────────────────────────────────────────────────────

Deno.test("RK3-A2 g2 — statute rail carries the admt_extensions entry citing § 7152(a)(3)(G)", async () => {
  const src = await Deno.readTextFile(RAIL_PATH);
  assert(src.includes("admt_extensions: {"), "rail must define admt_extensions");
  // The regulationText carries the verbatim (G)(i)/(ii) quote in ASCII.
  assert(
    src.includes("description of the automated decisionmaking technology"),
    "rail entry must carry the § 7152(a)(3)(G)(i) verbatim quote",
  );
  assert(src.includes("7152(a)(3)(G)"), "rail entry must reference § 7152(a)(3)(G)");
});
