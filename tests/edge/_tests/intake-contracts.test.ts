// RC-REM-P1 — Intake-contract acceptance tests.
//
// Three test surfaces per covered tool:
//   (a) PARITY:   contract enum options === form .enums.ts exports.
//   (b) MIRROR:   FIELD_ENUM_MIRROR entries the contract owns match the
//                 contract options element-for-element.
//   (c) FIXTURE:  every registered fixture validates cleanly against its
//                 contract.
//
// The .enums.ts modules are imported by relative path — all five have zero
// imports, verified safe under Deno.

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import { validateIntake } from "../../../supabase/functions/_shared/intake-contracts/validate.ts";
import {
  cppaCybersecurityContract,
  CYBER_MATURITY_OPTIONS,
} from "../../../supabase/functions/_shared/intake-contracts/cppa-cybersecurity.ts";
import {
  cppaRiskContract,
  REVENUE_OPTS as RISK_REVENUE_OPTS,
  CONSUMER_OPTS as RISK_CONSUMER_OPTS,
  BOUGHT_SOLD_SHARED_OPTS as RISK_BSS_OPTS,
  SPI_VOLUME_OPTS as RISK_SPI_VOLUME_OPTS,
  SHARE_REVENUE_50PCT_OPTS as RISK_SHARE_50_OPTS,
  Q5_SELL_SHARE_OPTS as RISK_Q5_OPTS,
  Q15_SENSITIVE_PI_OPTS as RISK_Q15_OPTS,
  IMPACT_LIKELIHOOD_OPTS as RISK_IMPACT_LIKELIHOOD,
  IMPACT_SEVERITY_OPTS as RISK_IMPACT_SEVERITY,
  IMPACT_BENEFITS_OUTWEIGH_OPTS as RISK_IMPACT_BENEFITS,
  IMPACT_CYBER_GAPS_OPTS as RISK_IMPACT_CYBER,
  HARM_TYPES as RISK_HARM_TYPES,
  CPPA_RISK_INLINE_LISTS,
} from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts";
import {
  cppaAdmtContract,
  ADMT_VENDOR_STATUS_OPTS,
  ADMT_VENDOR_DOCS_OPTS,
  ADMT_YES_NO_OPTS,
  ADMT_YES_NO_UNSURE_OPTS,
  ADMT_HOSTING_OPTS,
  ADMT_MODEL_TYPE_OPTS,
  ADMT_DECISION_EFFECT_OPTS,
  ADMT_DECISION_CADENCE_OPTS,
  ADMT_SOLE_FACTOR_OPTS,
  ADMT_SOLELY_ADVERTISING_OPTS,
} from "../../../supabase/functions/_shared/intake-contracts/cppa-admt.ts";
import {
  liAssessmentStageAContract,
  liAssessmentStageBContract,
  DATA_CATEGORIES as LIA_DATA_CATEGORIES,
  RELATIONSHIPS as LIA_RELATIONSHIPS,
  JURISDICTIONS as LIA_JURISDICTIONS,
} from "../../../supabase/functions/_shared/intake-contracts/li-assessment.ts";
import {
  governanceContract,
  GOVERNANCE_INLINE_LISTS,
} from "../../../supabase/functions/_shared/intake-contracts/governance-assessment.ts";
import {
  dpiaFrameworkContract,
  DPIA_DATA_CATS as CONTRACT_DPIA_DATA_CATS,
  DPIA_JURISDICTIONS as CONTRACT_DPIA_JURS,
  DPIA_LEGAL_BASES as CONTRACT_DPIA_LEGAL,
  DPIA_ART9 as CONTRACT_DPIA_ART9,
  DPIA_REASONS as CONTRACT_DPIA_REASONS,
  DPIA_SAFEGUARDS as CONTRACT_DPIA_SAFEGUARDS,
  DPIA_TOOLS as CONTRACT_DPIA_TOOLS,
} from "../../../supabase/functions/_shared/intake-contracts/dpia-framework.ts";
import {
  dpaGeneratorContract,
  DPA_JURISDICTIONS,
  DPA_DATA_CATS,
  DPA_RETENTION_OPTIONS,
  DPA_AUDIT_RIGHTS_OPTIONS,
  DPA_TRANSFER_MECHANISM_OPTIONS,
} from "../../../supabase/functions/_shared/intake-contracts/dpa-generator.ts";
import {
  irPlaybookContract,
  IR_CAUSES,
  IR_DATA_TYPES,
  IR_JURISDICTIONS,
  IR_ORG_TYPES,
} from "../../../supabase/functions/_shared/intake-contracts/ir-playbook.ts";
import {
  biometricCheckerContract,
  BIO_TYPES,
  BIO_ORG,
  BIO_PURPOSE,
  BIO_JURS,
} from "../../../supabase/functions/run-quality-batch/_local/intake-contracts/biometric-checker.ts";
import { CYBER_CONTRACT_FIXTURES } from "../../../supabase/functions/_shared/cyber-contract-fixtures.ts";
import { CPPA_RISK_CONTRACT_FIXTURES } from "../../../supabase/functions/_shared/cppa-risk-contract-fixtures.ts";
import { ADMT_CONTRACT_FIXTURES } from "../../../supabase/functions/_shared/admt-contract-fixtures.ts";
import { GOVERNANCE_CONTRACT_FIXTURES } from "../../../supabase/functions/_shared/governance-contract-fixtures.ts";
import { FIELD_ENUM_MIRROR } from "../../../supabase/functions/_shared/field-enums.ts";

// Form enums modules (zero imports; safe to load under Deno test).
import { MATURITY as FORM_MATURITY } from "../../../src/pages/CPPACybersecurity.enums.ts";
import * as RiskEnums from "../../../src/pages/CPPARiskAssessment.enums.ts";
import * as AdmtEnums from "../../../src/pages/admt/ADMTChecker.enums.ts";
import * as LiaEnums from "../../../src/pages/LIAssessment.enums.ts";
import * as DpiaEnums from "../../../src/pages/DPIAFramework.enums.ts";

Deno.test("intake-contracts / cyber PARITY — contract MATURITY === form MATURITY", () => {
  assertEquals(
    [...CYBER_MATURITY_OPTIONS],
    [...FORM_MATURITY],
    "cppa-cybersecurity contract MATURITY drifted from src/pages/CPPACybersecurity.enums.ts",
  );
});

Deno.test("intake-contracts / cyber MIRROR — FIELD_ENUM_MIRROR maturity === contract options", () => {
  const mirror = FIELD_ENUM_MIRROR["cppa_cybersecurity:maturity"];
  assert(Array.isArray(mirror), "cppa_cybersecurity:maturity missing from FIELD_ENUM_MIRROR");
  assertEquals([...mirror!], [...CYBER_MATURITY_OPTIONS]);
});

Deno.test("intake-contracts / cyber FIXTURES — every fixture validates cleanly", () => {
  for (const fx of CYBER_CONTRACT_FIXTURES) {
    const res = validateIntake(
      cppaCybersecurityContract,
      fx.intake as Record<string, unknown>,
    );
    assert(
      res.ok,
      `fixture ${fx.fixture_id} violates contract: ${JSON.stringify(res.violations)}`,
    );
  }
});

// Sanity checks on the validator itself so regressions are caught here
// rather than surfacing only through downstream fixture drift.
Deno.test("intake-contracts / validator — flags unknown top-level key", () => {
  const res = validateIntake(cppaCybersecurityContract, {
    profile: {
      entity_name: "X",
      industry: "Y",
      incidents_12mo: "None",
      framework: "SOC 2",
      last_audit: "Never",
    },
    controls: [],
    bogus_key: 1,
  } as Record<string, unknown>);
  assert(!res.ok);
  assert(res.violations.some((v) => v.key === "bogus_key"));
});

Deno.test("intake-contracts / validator — flags off-enum maturity", () => {
  const res = validateIntake(cppaCybersecurityContract, {
    profile: {
      entity_name: "X",
      industry: "Y",
      incidents_12mo: "None",
      framework: "SOC 2",
      last_audit: "Never",
    },
    controls: [{ key: "c1_auth", label: "Authentication", maturity: "Implemented", notes: "" }],
  } as Record<string, unknown>);
  assert(!res.ok);
  assert(res.violations.some((v) => v.key === "controls[].maturity"));
});

Deno.test("intake-contracts / validator — accepts empty maturity (optional)", () => {
  const res = validateIntake(cppaCybersecurityContract, {
    profile: {
      entity_name: "X",
      industry: "Y",
      incidents_12mo: "None",
      framework: "SOC 2",
      last_audit: "Never",
    },
    controls: [{ key: "c1_auth", label: "Authentication", maturity: "", notes: "" }],
  } as Record<string, unknown>);
  assert(res.ok, JSON.stringify(res.violations));
});

// ═════════════════════════════════════════════════════════════════════
// CPPA Risk Assessment
// ═════════════════════════════════════════════════════════════════════

Deno.test("intake-contracts / risk PARITY — contract enums === form enums", () => {
  assertEquals([...RISK_REVENUE_OPTS], [...RiskEnums.REVENUE_OPTS]);
  assertEquals([...RISK_CONSUMER_OPTS], [...RiskEnums.CONSUMER_OPTS]);
  // T-C1 (2026-07-28) — § 1798.140(d)(1)(B) operand bands.
  assertEquals([...RISK_BSS_OPTS], [...RiskEnums.BOUGHT_SOLD_SHARED_OPTS]);
  assertEquals([...RISK_SPI_VOLUME_OPTS], [...RiskEnums.SPI_VOLUME_OPTS]);
  assertEquals([...RISK_SHARE_50_OPTS], [...RiskEnums.SHARE_REVENUE_50PCT_OPTS]);
  assertEquals([...RISK_Q5_OPTS], [...RiskEnums.Q5_SELL_SHARE_OPTS]);
  assertEquals([...RISK_Q15_OPTS], [...RiskEnums.Q15_SENSITIVE_PI_OPTS]);
  assertEquals([...RISK_IMPACT_LIKELIHOOD], [...RiskEnums.IMPACT_LIKELIHOOD_OPTS]);
  assertEquals([...RISK_IMPACT_SEVERITY], [...RiskEnums.IMPACT_SEVERITY_OPTS]);
  assertEquals([...RISK_IMPACT_BENEFITS], [...RiskEnums.IMPACT_BENEFITS_OUTWEIGH_OPTS]);
  assertEquals([...RISK_IMPACT_CYBER], [...RiskEnums.IMPACT_CYBER_GAPS_OPTS]);
  assertEquals([...RISK_HARM_TYPES], [...RiskEnums.HARM_TYPES]);
});

Deno.test("intake-contracts / risk PARITY — inline-list literals match page source", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../src/pages/CPPARiskAssessment.tsx", import.meta.url),
  );
  // For each inline list, every option string must appear verbatim in the
  // page source. Guards against silent drift in q4/q6/q3 option copies.
  for (const [listName, opts] of Object.entries(CPPA_RISK_INLINE_LISTS)) {
    for (const opt of opts as readonly string[]) {
      assert(
        src.includes(opt),
        `CPPA_RISK_INLINE_LISTS.${listName} option not found verbatim in page source: ${JSON.stringify(opt)}`,
      );
    }
  }
});

Deno.test("intake-contracts / risk MIRROR — FIELD_ENUM_MIRROR entries match contract", () => {
  const pairs: Array<[string, readonly string[]]> = [
    ["cppa_risk_assessment:q1_revenue", RISK_REVENUE_OPTS],
    ["cppa_risk_assessment:q2_consumers", RISK_CONSUMER_OPTS],
    ["cppa_risk_assessment:bought_sold_shared_count", RISK_BSS_OPTS],
    ["cppa_risk_assessment:q5_sell_share", RISK_Q5_OPTS],
    ["cppa_risk_assessment:q5c_share_revenue_50pct", RISK_SHARE_50_OPTS],
    ["cppa_risk_assessment:q15_sensitive_pi", RISK_Q15_OPTS],
    ["cppa_risk_assessment:q15c_spi_volume", RISK_SPI_VOLUME_OPTS],
    ["cppa_risk_assessment:impact_intake.likelihood", RISK_IMPACT_LIKELIHOOD],
    ["cppa_risk_assessment:impact_intake.severity", RISK_IMPACT_SEVERITY],
    ["cppa_risk_assessment:impact_intake.benefitsOutweigh", RISK_IMPACT_BENEFITS],
    ["cppa_risk_assessment:impact_intake.cyberGaps", RISK_IMPACT_CYBER],
    ["cppa_risk_assessment:impact_intake.harmTypes", RISK_HARM_TYPES],
  ];
  for (const [ref, opts] of pairs) {
    const mirror = FIELD_ENUM_MIRROR[ref];
    assert(Array.isArray(mirror), `${ref} missing from FIELD_ENUM_MIRROR`);
    assertEquals([...mirror!], [...opts], `${ref} drifted`);
  }
});

Deno.test("intake-contracts / risk FIXTURES — every fixture validates cleanly", () => {
  for (const fx of CPPA_RISK_CONTRACT_FIXTURES) {
    const res = validateIntake(cppaRiskContract, fx.intake as Record<string, unknown>);
    assert(res.ok, `fixture ${fx.fixture_id} violates contract: ${JSON.stringify(res.violations)}`);
  }
});

// ═════════════════════════════════════════════════════════════════════
// CPPA ADMT
// ═════════════════════════════════════════════════════════════════════

Deno.test("intake-contracts / admt PARITY — contract enums === form enums", () => {
  assertEquals([...ADMT_VENDOR_STATUS_OPTS], [...AdmtEnums.ADMT_VENDOR_STATUS_OPTS]);
  assertEquals([...ADMT_VENDOR_DOCS_OPTS], [...AdmtEnums.ADMT_VENDOR_DOCS_OPTS]);
  assertEquals([...ADMT_YES_NO_OPTS], [...AdmtEnums.ADMT_YES_NO_OPTS]);
  assertEquals([...ADMT_YES_NO_UNSURE_OPTS], [...AdmtEnums.ADMT_YES_NO_UNSURE_OPTS]);
  assertEquals([...ADMT_HOSTING_OPTS], [...AdmtEnums.ADMT_HOSTING_OPTS]);
  assertEquals([...ADMT_MODEL_TYPE_OPTS], [...AdmtEnums.ADMT_MODEL_TYPE_OPTS]);
  assertEquals([...ADMT_DECISION_EFFECT_OPTS], [...AdmtEnums.ADMT_DECISION_EFFECT_OPTS]);
  assertEquals([...ADMT_DECISION_CADENCE_OPTS], [...AdmtEnums.ADMT_DECISION_CADENCE_OPTS]);
  assertEquals([...ADMT_SOLE_FACTOR_OPTS], [...AdmtEnums.ADMT_SOLE_FACTOR_OPTS]);
  assertEquals([...ADMT_SOLELY_ADVERTISING_OPTS], [...AdmtEnums.ADMT_SOLELY_ADVERTISING_OPTS]);
});

Deno.test("intake-contracts / admt MIRROR — admt_detail enum leaves match FIELD_ENUM_MIRROR", () => {
  const pairs: Array<[string, readonly string[]]> = [
    ["cppa_admt:admt_detail.vendor_status", ADMT_VENDOR_STATUS_OPTS],
    ["cppa_admt:admt_detail.vendor_docs", ADMT_VENDOR_DOCS_OPTS],
    ["cppa_admt:admt_detail.v_audit", ADMT_YES_NO_OPTS],
    ["cppa_admt:admt_detail.vendor_makes_available", ADMT_YES_NO_UNSURE_OPTS],
    ["cppa_admt:admt_detail.hosting", ADMT_HOSTING_OPTS],
    ["cppa_admt:admt_detail.model_types", ADMT_MODEL_TYPE_OPTS],
    ["cppa_admt:admt_detail.decision_effects", ADMT_DECISION_EFFECT_OPTS],
    ["cppa_admt:admt_detail.decision_cadence", ADMT_DECISION_CADENCE_OPTS],
    ["cppa_admt:admt_detail.sole_factor", ADMT_SOLE_FACTOR_OPTS],
    ["cppa_admt:admt_detail.feeds_future_decisions", ADMT_YES_NO_UNSURE_OPTS],
    ["cppa_admt:admt_detail.solely_advertising", ADMT_SOLELY_ADVERTISING_OPTS],
  ];
  for (const [ref, opts] of pairs) {
    const mirror = FIELD_ENUM_MIRROR[ref];
    assert(Array.isArray(mirror), `${ref} missing from FIELD_ENUM_MIRROR`);
    assertEquals([...mirror!], [...opts], `${ref} drifted`);
  }
});

Deno.test("intake-contracts / admt FIXTURES — every fixture validates cleanly", () => {
  for (const fx of ADMT_CONTRACT_FIXTURES) {
    const res = validateIntake(cppaAdmtContract, fx.intake as Record<string, unknown>);
    assert(res.ok, `fixture ${fx.fixture_id} violates contract: ${JSON.stringify(res.violations)}`);
  }
});

// ═════════════════════════════════════════════════════════════════════
// LI Assessment (Stage A + Stage B)
// ═════════════════════════════════════════════════════════════════════

Deno.test("intake-contracts / lia PARITY — contract enums === form enums", () => {
  assertEquals([...LIA_DATA_CATEGORIES], [...LiaEnums.DATA_CATEGORIES]);
  assertEquals([...LIA_RELATIONSHIPS], [...LiaEnums.RELATIONSHIPS]);
  assertEquals([...LIA_JURISDICTIONS], [...LiaEnums.JURISDICTIONS]);
});

Deno.test("intake-contracts / lia MIRROR — FIELD_ENUM_MIRROR matches contract enums", () => {
  const pairs: Array<[string, readonly string[]]> = [
    ["li_assessment:data_categories", LIA_DATA_CATEGORIES],
    ["li_assessment:relationship_type", LIA_RELATIONSHIPS],
    ["li_assessment:jurisdictions", LIA_JURISDICTIONS],
  ];
  for (const [ref, opts] of pairs) {
    const mirror = FIELD_ENUM_MIRROR[ref];
    assert(Array.isArray(mirror), `${ref} missing from FIELD_ENUM_MIRROR`);
    assertEquals([...mirror!], [...opts], `${ref} drifted`);
  }
});

Deno.test("intake-contracts / lia FIXTURES — synthesised Stage-A + Stage-B validate cleanly", () => {
  // No persisted fixture module for LIA today; validate a form-shaped
  // exemplar so the contract wiring is exercised end-to-end.
  const stageA = {
    organization_name: "Acme Ltd",
    subject_anchor: "Customer churn analytics",
    processing_description: "Analyse purchase patterns to predict churn and target retention offers.",
    data_categories: ["Contact data", "Purchase/transaction history"],
    relationship_type: "Existing customer",
    jurisdictions: ["EU (GDPR)"],
  };
  const rA = validateIntake(liAssessmentStageAContract, stageA);
  assert(rA.ok, `Stage A violates: ${JSON.stringify(rA.violations)}`);

  const stageB = {
    ...stageA,
    stated_purpose: "Reduce customer churn by identifying at-risk accounts and offering targeted retention.",
    alternatives_considered: "Considered consent-based marketing; rejected because response rates too low.",
    purpose_details: {
      interest_holder: "Data controller",
      interest_type: "Commercial",
      interest_statement: "Retention of existing customer relationships.",
    },
    necessity_details: {
      alternatives: "Considered generic offers to all customers; rejected as wasteful and less relevant.",
      why_consent_not_used: "Consent friction would depress response and defeat the retention objective.",
      data_minimised: "Only purchase history and engagement metrics — no special categories.",
      pseudonymisation_options: null,
    },
    balancing_details: {
      reasonable_expectation: "Yes",
      potential_harm: "Minor",
      safeguards: ["Access controls", "Retention limits"],
      opt_out_mechanism: "In-account preference toggle; unsubscribe link on every message.",
      statutory_restrictions: null,
      employment_safeguards: null,
    },
    stage: "submitted",
    preview_assessment_id: "abc-123",
  };
  const rB = validateIntake(liAssessmentStageBContract, stageB);
  assert(rB.ok, `Stage B violates: ${JSON.stringify(rB.violations)}`);
});

// ═════════════════════════════════════════════════════════════════════
// P1-C — Governance / DPIA / DPA / IR / Biometric
// ═════════════════════════════════════════════════════════════════════

Deno.test("intake-contracts / governance PARITY — inline-list literals match page source", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../src/pages/GovernanceAssessment.tsx", import.meta.url),
  );
  for (const [listName, opts] of Object.entries(GOVERNANCE_INLINE_LISTS)) {
    for (const opt of opts as readonly string[]) {
      assert(
        src.includes(opt),
        `GOVERNANCE_INLINE_LISTS.${listName} option not found verbatim in page source: ${JSON.stringify(opt)}`,
      );
    }
  }
});

Deno.test("intake-contracts / governance FIXTURES — every fixture validates cleanly", () => {
  for (const fx of GOVERNANCE_CONTRACT_FIXTURES) {
    const res = validateIntake(governanceContract, fx.intake as Record<string, unknown>);
    assert(res.ok, `fixture ${fx.fixture_id} violates contract: ${JSON.stringify(res.violations)}`);
  }
});

Deno.test("intake-contracts / dpia PARITY — contract enums === form enums", () => {
  assertEquals([...CONTRACT_DPIA_DATA_CATS], [...DpiaEnums.DATA_CATS]);
  assertEquals([...CONTRACT_DPIA_JURS], [...DpiaEnums.JURISDICTIONS]);
  assertEquals([...CONTRACT_DPIA_LEGAL], [...DpiaEnums.LEGAL_BASES]);
  assertEquals([...CONTRACT_DPIA_ART9], [...DpiaEnums.ARTICLE_9_CONDITIONS]);
  assertEquals([...CONTRACT_DPIA_REASONS], [...DpiaEnums.REASONS_TO_CONDUCT]);
  assertEquals([...CONTRACT_DPIA_SAFEGUARDS], [...DpiaEnums.SAFEGUARDS]);
  assertEquals([...CONTRACT_DPIA_TOOLS], [...DpiaEnums.TOOLS]);
});

Deno.test("intake-contracts / dpia MIRROR — FIELD_ENUM_MIRROR entries match contract enums", () => {
  const pairs: Array<[string, readonly string[]]> = [
    ["dpia_framework:data_categories", CONTRACT_DPIA_DATA_CATS],
    ["dpia_framework:jurisdictions", CONTRACT_DPIA_JURS],
    ["dpia_framework:legal_basis_proposed", CONTRACT_DPIA_LEGAL],
    ["dpia_framework:article_9_condition", CONTRACT_DPIA_ART9],
    ["dpia_framework:reasons_to_conduct", CONTRACT_DPIA_REASONS],
    ["dpia_framework:existing_safeguards", CONTRACT_DPIA_SAFEGUARDS],
  ];
  for (const [ref, opts] of pairs) {
    const mirror = FIELD_ENUM_MIRROR[ref];
    assert(Array.isArray(mirror), `${ref} missing from FIELD_ENUM_MIRROR`);
    assertEquals([...mirror!], [...opts], `${ref} drifted`);
  }
});

Deno.test("intake-contracts / dpa PARITY — jurisdiction + data-cat + retention + audit + transfer options appear verbatim in page source", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../src/pages/DPAGenerator.tsx", import.meta.url),
  );
  for (const opt of DPA_DATA_CATS) {
    assert(src.includes(opt), `DPA data-cat not found verbatim in page source: ${JSON.stringify(opt)}`);
  }
  for (const opt of DPA_RETENTION_OPTIONS) {
    assert(src.includes(opt), `DPA retention option not found verbatim: ${JSON.stringify(opt)}`);
  }
  for (const opt of DPA_AUDIT_RIGHTS_OPTIONS) {
    assert(src.includes(opt), `DPA audit-rights option not found verbatim: ${JSON.stringify(opt)}`);
  }
  for (const opt of DPA_TRANSFER_MECHANISM_OPTIONS) {
    assert(src.includes(opt), `DPA transfer-mechanism option not found verbatim: ${JSON.stringify(opt)}`);
  }
  // DPA_JURISDICTIONS come from @/lib/dpaDocumentType — assert against
  // that module.
  const libSrc = await Deno.readTextFile(
    new URL("../../../src/lib/dpaDocumentType.ts", import.meta.url),
  );
  for (const opt of DPA_JURISDICTIONS) {
    assert(libSrc.includes(opt), `DPA jurisdiction not found verbatim: ${JSON.stringify(opt)}`);
  }
});

Deno.test("intake-contracts / ir PARITY — inline-list options appear verbatim in page source", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../src/pages/IRPlaybook.tsx", import.meta.url),
  );
  for (const opt of IR_CAUSES) assert(src.includes(opt), `IR_CAUSES ${JSON.stringify(opt)} missing`);
  for (const opt of IR_DATA_TYPES) assert(src.includes(opt), `IR_DATA_TYPES ${JSON.stringify(opt)} missing`);
  for (const opt of IR_JURISDICTIONS) assert(src.includes(opt), `IR_JURISDICTIONS ${JSON.stringify(opt)} missing`);
  for (const opt of IR_ORG_TYPES) assert(src.includes(opt), `IR_ORG_TYPES ${JSON.stringify(opt)} missing`);
});

Deno.test("intake-contracts / biometric PARITY — inline-list options appear verbatim in page source", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../src/pages/BiometricChecker.tsx", import.meta.url),
  );
  for (const opt of BIO_TYPES) assert(src.includes(opt), `BIO_TYPES ${JSON.stringify(opt)} missing`);
  for (const opt of BIO_ORG) assert(src.includes(opt), `BIO_ORG ${JSON.stringify(opt)} missing`);
  for (const opt of BIO_PURPOSE) assert(src.includes(opt), `BIO_PURPOSE ${JSON.stringify(opt)} missing`);
  for (const opt of BIO_JURS) assert(src.includes(opt), `BIO_JURS ${JSON.stringify(opt)} missing`);
});

Deno.test("intake-contracts / dpa FIXTURES — synthesised form payload validates", () => {
  const payload = {
    entityName: "Acme Retail",
    controllerName: "Acme Corp",
    controllerJurisdiction: "Germany",
    processorName: "CloudOps",
    processorJurisdiction: "Germany",
    services: "Hosting and support",
    dataCategories: ["General personal data"],
    retention: "As directed by the Controller's documented instructions",
    hasSubProcessors: false,
    subProcessorList: "",
    auditRights: "Documentation review — Processor provides audit reports/certifications on request",
    transferMechanism: "",
  };
  const res = validateIntake(dpaGeneratorContract, payload);
  assert(res.ok, JSON.stringify(res.violations));
});

Deno.test("intake-contracts / ir FIXTURES — synthesised form payload validates", () => {
  const payload = {
    organizationName: "Acme Retail Ltd",
    discoveryDateTime: "2026-07-14T09:00",
    cause: "Ransomware or malware",
    dataTypes: ["Names and contact details", "Financial / payment data"],
    affectedCount: "1,000–10,000",
    jurisdictions: ["Germany", "United Kingdom"],
    processorInvolved: false,
    processorName: "",
    contained: "Yes",
    organisationType: "Company",
  };
  const res = validateIntake(irPlaybookContract, payload);
  assert(res.ok, JSON.stringify(res.violations));
});

Deno.test("intake-contracts / biometric FIXTURES — synthesised form payload validates", () => {
  const payload = {
    orgName: "Acme Retail",
    biometricTypes: ["Fingerprint / palm print"],
    orgType: "Employer (employee biometrics)",
    purpose: "Time & attendance / workforce management",
    jurisdictions: ["Illinois, USA (BIPA)"],
    other_state_names: "",
  };
  const res = validateIntake(biometricCheckerContract, payload);
  assert(res.ok, JSON.stringify(res.violations));
});

Deno.test("intake-contracts / biometric W3-T3 — other_state_names accepted when Other US state selected", () => {
  const payload = {
    orgName: "Front Range Employer Co.",
    biometricTypes: ["Fingerprint / palm print"],
    orgType: "Employer (employee biometrics)",
    purpose: "Time & attendance / workforce management",
    jurisdictions: ["Other US state"],
    other_state_names: "Colorado",
  };
  const res = validateIntake(biometricCheckerContract, payload);
  assert(res.ok, JSON.stringify(res.violations));
});


Deno.test("intake-contracts / dpia FIXTURES — synthesised form payload validates", () => {
  const payload = {
    organization_name: "Acme Ltd",
    processing_activity_name: "Employee retention analytics",
    description: "x".repeat(120),
    purpose: "Predict attrition risk and target retention interventions.",
    data_categories: ["Employee records"],
    data_subjects: "Employees in EU offices",
    volume_frequency: "~500 records, weekly refresh",
    third_party_processors: ["Microsoft 365 / Copilot"],
    existing_safeguards: ["Encryption at rest", "Access controls"],
    jurisdictions: ["EU (GDPR)"],
    legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))",
    article_9_condition: "",
    necessity_proportionality: "Alternatives considered; least-intrusive design chosen.",
    retention_period: "24 months after employee exit",
  };
  const res = validateIntake(dpiaFrameworkContract, payload);
  assert(res.ok, JSON.stringify(res.violations));
});
