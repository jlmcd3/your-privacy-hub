// PANEL FIX 11 (2026-08-30) — /admin/all-products-test batch failures.
//
// The "Claude intake batch" behind /admin/all-products-test never actually
// calls Claude (nothing sets `use_claude`, so every fixture comes from the
// hand-typed buildDeterministicProfile/buildDeterministicGeo/buildAdmtFallback
// fallback). Those literals drifted from each product's real, independently
// -evolving `_shared/intake-contracts/*.ts` vocabulary — "Children & EdTech"
// spliced directly into governance.sector/cppaRisk.q3_sector/registration.industry,
// short ADMT codes ("service_eligibility") where the contract wants full
// sentences, cppaCyber emitted as flat top-level fields where the contract
// expects nested `profile.*` + an array `controls[]`, etc. The new
// INTAKE_CONTRACT_GATE (run-stress-job/_local/intake-gate.ts, added the same
// day) validates every fixture against those same contracts before a product
// runs, which is what turned this from a silent quality problem into a hard
// batch failure.
//
// generate-stress-fixtures/index.ts calls Deno.serve() at module scope, so
// it cannot be imported directly (the established convention for such files
// — see fleet-lint/c3-verdict-scoreboards.test.ts — is a source-text
// assertion). The fix itself was verified far more rigorously than this
// test can check: a script imported the file's exact functions (extracted
// minus the Deno.serve tail) and ran the REAL validateIntake() against the
// REAL contracts for 14 industries x 2 geos x 2 slots (448 combinations),
// zero blocking violations. This test is a narrower, permanent guard against
// the specific literals regressing.

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SRC_PATH = new URL("../../../supabase/functions/generate-stress-fixtures/index.ts", import.meta.url);

Deno.test("PANEL-11: the fixture generator imports real contract vocabularies, not hand-typed literals", async () => {
  const src = await Deno.readTextFile(SRC_PATH);
  for (const spec of [
    '"../_shared/intake-contracts/governance-assessment.ts"',
    '"../_shared/intake-contracts/dpa-generator.ts"',
    '"../_shared/intake-contracts/ir-playbook.ts"',
    '"../_shared/intake-contracts/biometric.ts"',
    '"../_shared/intake-contracts/registration-assessment.ts"',
    '"../_shared/intake-contracts/cppa-risk-assessment.ts"',
    '"../_shared/intake-contracts/cppa-admt.ts"',
    '"../_shared/intake-contracts/cppa-cybersecurity.ts"',
  ]) {
    assertStringIncludes(src, spec, `missing contract import ${spec}`);
  }
});

Deno.test("PANEL-11: the raw industry string never reaches an enum-constrained field verbatim", async () => {
  const src = await Deno.readTextFile(SRC_PATH);
  // The exact assignments the failure log named — a raw `industry` (or a
  // template built from it) landing directly on a closed-vocabulary field.
  // NOTE: `sector: industry,` legitimately still appears for lia/dpia/ropa
  // (no contract, or a differently-named non-enum field) — not checked here.
  for (const gone of [
    "q3_sector: industry,",
    'orgType: `${industry} organisation`',
    'organisationType: `${industry} operator`',
  ]) {
    assert(!src.includes(gone), `raw industry splice resurfaced: ${JSON.stringify(gone)}`);
  }
  // registration.industry used to be the bare shorthand `industry,`; it must
  // now be the bucket-mapped lookup.
  assertStringIncludes(src, "industry: REG_INDUSTRY_BY_BUCKET[bucket],");
  // The classifier + per-product lookup tables that replaced the splices.
  assertStringIncludes(src, "function classifyIndustry(industry: string): IndustryBucket");
  assertStringIncludes(src, "GOV_SECTOR_BY_BUCKET[bucket]");
  assertStringIncludes(src, "REG_INDUSTRY_BY_BUCKET[bucket]");
});

Deno.test("PANEL-11: ADMT decision_domains uses the real closed-vocabulary sentences, not short codes", async () => {
  const src = await Deno.readTextFile(SRC_PATH);
  assert(!src.includes('["financial_service' /* old "financial_services" short code */), "old ADMT short code resurfaced");
  assert(!src.includes('["service_eligibility"]'), "old ADMT short code resurfaced");
  assertStringIncludes(src, "Financial or lending services (credit decisions, loans, accounts)");
  assertStringIncludes(src, "Hiring or admission decisions");
  assertStringIncludes(src, "decision_domains: [decisionDomain]");
});

Deno.test("PANEL-11: cppaCyber is nested under profile.* with an array controls[], matching the real contract shape", async () => {
  const src = await Deno.readTextFile(SRC_PATH);
  // The old flat shape must be gone.
  assert(!src.includes("profile_industry: industry"), "old flat cppaCyber shape resurfaced");
  assert(!src.includes("industry_sector: industry"), "old flat cppaCyber shape resurfaced");
  // The new nested shape + array controls, keyed off the contract's own
  // CYBER_CONTROL_SLUGS rather than a hand-typed slug list.
  assertStringIncludes(src, "entity_name: c.companyName,");
  assertStringIncludes(src, "incidents_12mo: \"None\" as typeof INCIDENTS_12MO_OPTIONS[number],");
  assertStringIncludes(src, "controls: CYBER_CONTROL_SLUGS.map((slug) => ({");
});

Deno.test("PANEL-11: the q5_sell_share fallback in normalizeCppaRiskTriggers is a real contract option", async () => {
  const src = await Deno.readTextFile(SRC_PATH);
  assert(!src.includes('r.q5_sell_share = "Yes";'), "bare non-conformant fallback resurfaced");
  assertStringIncludes(src, 'r.q5_sell_share = "Yes — sell only";');
});
