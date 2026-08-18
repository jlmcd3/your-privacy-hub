// RK3-A2 GROUP 4 — PN-RK7 SPI employment-exception facts
// (Intake Contract v2.0 §6, doc 31 §2c). Pins the single-field landing
// end to end:
//   contract  — spi_employment_exception_facts (narrative, optional at
//               the data layer).
//   form      — intake memo emits the key; field present in step 3
//               conditional on q15=Yes and q17=Employment contract.
//   rail      — spi_employment_exception entry.
//   draft     — applyRestore covers the new state var.

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

Deno.test("RK3-A2 g4 — contract carries spi_employment_exception_facts, optional at the data layer", () => {
  const f = field("spi_employment_exception_facts");
  assert(f, "spi_employment_exception_facts missing from cppaRiskContract");
  assertEquals(f!.required, "optional", "spi_employment_exception_facts must be optional at the data layer");
  assertEquals(f!.kind, "narrative", "spi_employment_exception_facts must be kind=narrative");
});

// ── FORM ──────────────────────────────────────────────────────────────────────

Deno.test("RK3-A2 g4 — form emits spi_employment_exception_facts in the intake memo", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  assert(
    src.includes("spi_employment_exception_facts: spiEmploymentExceptionFacts"),
    "intake memo must emit spi_employment_exception_facts",
  );
});

Deno.test("RK3-A2 g4 — form employment-exception block is conditional on employment basis", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  assert(
    src.includes('q17 === "Employment contract"') && src.includes("spiEmploymentExceptionFacts"),
    "employment-exception textarea must be gated on q17 === 'Employment contract'",
  );
  assert(
    src.includes('data-rail-key="spi_employment_exception"'),
    "form must include the spi_employment_exception rail block",
  );
});

// ── DRAFT ROUND-TRIP ──────────────────────────────────────────────────────────

Deno.test("RK3-A2 g4 — applyRestore hydrates spiEmploymentExceptionFacts", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  assert(
    src.includes('if (typeof d.spiEmploymentExceptionFacts === "string") setSpiEmploymentExceptionFacts(d.spiEmploymentExceptionFacts)'),
    "applyRestore must hydrate spiEmploymentExceptionFacts",
  );
});

Deno.test("RK3-A2 g4 — INITIAL_DRAFT_JSON includes spiEmploymentExceptionFacts", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  assert(src.includes('spiEmploymentExceptionFacts: ""'), "INITIAL_DRAFT_JSON must include spiEmploymentExceptionFacts");
});

// ── RAIL ──────────────────────────────────────────────────────────────────────

Deno.test("RK3-A2 g4 — statute rail carries the spi_employment_exception entry", async () => {
  const src = await Deno.readTextFile(RAIL_PATH);
  assert(src.includes("spi_employment_exception: {"), "rail must define spi_employment_exception");
  assert(src.includes("1798.145"), "rail entry must reference § 1798.145(m) expiry");
  assert(
    src.includes("employment exemption expired"),
    "rail plainSummary must note the § 1798.145(m) expiry",
  );
});
