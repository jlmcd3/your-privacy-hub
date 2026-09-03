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
  // DOC 141 (2026-09-02): the map body grew a per-slug notes/maturity block,
  // so the arrow now opens a statement body — the pin still asserts controls
  // are keyed off the contract's own CYBER_CONTROL_SLUGS.
  assertStringIncludes(src, "controls: CYBER_CONTROL_SLUGS.map((slug) => {");
});

Deno.test("PANEL-11: the q5_sell_share fallback in normalizeCppaRiskTriggers is a real contract option", async () => {
  const src = await Deno.readTextFile(SRC_PATH);
  assert(!src.includes('r.q5_sell_share = "Yes";'), "bare non-conformant fallback resurfaced");
  assertStringIncludes(src, 'r.q5_sell_share = "Yes — sell only";');
});

// ── PANEL FIX 11 FOLLOW-ON (2026-08-31) — the lia + dpia blocks the first
// pass missed (batch 55ae5688's lia/dpia rejections; batch b8c21317 then
// re-proved the class against the still-deployed pre-fix build). ──

Deno.test("PANEL-11b: lia's required enums carry contract options; the prose moved to the *_detail companions", async () => {
  const src = await Deno.readTextFile(SRC_PATH);
  // Old blocking values must be gone from the lia block…
  assert(!src.includes('reasonable_expectation: "Users expect'), "lia free-text reasonable_expectation resurfaced");
  assert(!src.includes('potential_harm: "Unexpected profiling'), "lia free-text potential_harm resurfaced");
  assert(!src.includes('jurisdictions: ["EU", "UK"]'), "lia short-code jurisdictions resurfaced");
  // …and the verbatim-option + detail-companion shape must be present.
  // DOC 161 (2026-09-03) — the fallback speaks the intake form's own option
  // strings (contract options since doc 161); the detail companions remain.
  assertStringIncludes(src, 'reasonable_expectation: "Probably — disclosed in privacy notice and consistent with the relationship" as typeof LIA_REASONABLE_EXPECTATION_OPTS[number]');
  assertStringIncludes(src, 'reasonable_expectation_detail: "Security screening is standard for an online service');
  assertStringIncludes(src, 'potential_harm: "Limited — minor inconvenience or unwanted contact" as typeof LIA_POTENTIAL_HARM_OPTS[number]');
  assertStringIncludes(src, 'potential_harm_detail: "A false positive holds a session');
  assertStringIncludes(src, '["EU (GDPR)", "United Kingdom (UK GDPR)"] as (typeof LIA_JURISDICTIONS[number])[]');
});

Deno.test("PANEL-11b: dpia's legal_basis_proposed is a closed radio option in every sector block, never legal prose", async () => {
  const src = await Deno.readTextFile(SRC_PATH);
  // The old multi-basis prose shapes must all be gone.
  for (const gone of [
    'legal_basis_proposed: "Consent (ePrivacy)',
    'legal_basis_proposed: "Article 9(2)(h)',
    'legal_basis_proposed: "Legal basis to be determined',
    'legal_basis_proposed: "Article 6(1)(b) (contract with school',
    'legal_basis_proposed: "Article 9(2)(j)',
    'legal_basis_proposed: "Article 6(1)(b) employment contract',
    'legal_basis_proposed: "Article 6(1)(e) public task',
    'legal_basis_proposed: "Legitimate interests or consent',
    'legal_basis_proposed: "Legitimate interests"',
  ]) {
    assert(!src.includes(gone), `dpia legal-basis prose resurfaced: ${JSON.stringify(gone)}`);
  }
  // The type anchor forces every value into DPIA_LEGAL_BASES at compile time.
  assertStringIncludes(src, "legal_basis_proposed: typeof DPIA_LEGAL_BASES[number];");
  assertStringIncludes(src, "article_9_condition?: typeof DPIA_ART9[number];");
  // And the assembled dpia block uses the contract's real key names.
  // DOC 142 (2026-09-02): the value must be a REAL retention statement, never
  // a recorded free-text TBD (which rendered as a to-be-confirmed retention
  // beside an "Assessed" status in the DPIA table).
  assertStringIncludes(src, 'retention_period: "Customer and account records: 6 years after the end of the relationship');
  assert(!src.includes('retention_period: "To be confirmed'), "dpia retention TBD placeholder resurfaced");
  assertStringIncludes(src, "controller_sector: industry,");
});
