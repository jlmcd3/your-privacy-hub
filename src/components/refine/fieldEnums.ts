// Per-tool registry of enum option sets for leaves inside object/array intake
// fields on the refine surface. The StructuredFieldEditor consults this map
// via `getEnumOptions(toolType, keyPath)`; if a set is returned, the leaf
// renders as a <select> (single-string leaf) or checkbox multi-select (string[]
// leaf) using EXACTLY the options the first-run intake form uses.
//
// Content-anchoring: every registered set is imported directly from the intake
// page that owns it. Never retype the literal options here — if the intake
// changes, the refine surface follows automatically.
//
// Key paths:
//   - "objectField.leafKey" for a leaf inside an object
//   - "arrayField[].leafKey" for a leaf inside every item of an array-of-objects
//   - Nested paths compose the same way: "outer.inner[].leaf"

import {
  IMPACT_LIKELIHOOD_OPTS,
  IMPACT_SEVERITY_OPTS,
  IMPACT_BENEFITS_OUTWEIGH_OPTS,
  IMPACT_CYBER_GAPS_OPTS,
  HARM_TYPES,
  REVENUE_OPTS,
  CONSUMER_OPTS,
  BOUGHT_SOLD_SHARED_OPTS,
  SPI_VOLUME_OPTS,
  SHARE_REVENUE_50PCT_OPTS,
  Q5_SELL_SHARE_OPTS,
  Q15_SENSITIVE_PI_OPTS,
} from "@/pages/CPPARiskAssessment.enums";
import {
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
} from "@/pages/admt/ADMTChecker.enums";
// RC-C2 C2.2 / RC-FLIP-3 — DPIA intake enums anchored to the standalone
// .enums module (never the page) to keep shared components page-free.
import {
  DATA_CATS as DPIA_DATA_CATS,
  JURISDICTIONS as DPIA_JURISDICTIONS,
  LEGAL_BASES as DPIA_LEGAL_BASES,
  ARTICLE_9_CONDITIONS as DPIA_ARTICLE_9_CONDITIONS,
  REASONS_TO_CONDUCT as DPIA_REASONS_TO_CONDUCT,
  SAFEGUARDS as DPIA_SAFEGUARDS,
  TOOLS as DPIA_TOOLS,
} from "@/pages/DPIAFramework.enums";
// RC-C2 C2.5 / RC-FLIP-3 — LIA intake enums anchored to the standalone
// .enums module (never the page).
import {
  DATA_CATEGORIES as LIA_DATA_CATEGORIES,
  RELATIONSHIPS as LIA_RELATIONSHIPS,
  JURISDICTIONS as LIA_JURISDICTIONS,
} from "@/pages/LIAssessment.enums";
// RC-C3.CLOSE-1 / RC-FLIP-2 — anchor to the standalone enums module (not the
// page) to avoid a page↔shared-component circular import.
import { MATURITY as CYBER_MATURITY_OPTS } from "@/pages/CPPACybersecurity.enums";

// Q18 uses inline ["Yes","No","In evaluation"] in the intake JSX; mirror that
// literal here (content-anchored to CPPARiskAssessment.tsx line 924).
const Q18_ADMT_USE_OPTS = ["Yes", "No", "In evaluation"] as const;
// Q20 opt-out inline enum; mirror the intake radio literals (line 939).
const Q20_ADMT_OPT_OUT_OPTS = ["Yes, with documented opt-out", "Planned for implementation", "No"] as const;

type EnumRegistry = Record<string, Record<string, readonly string[]>>;

// tool_type → keyPath → options
const REGISTRY: EnumRegistry = {
  // CPPA Risk (§ 7152 impact assessment scales).
  // Two intake shapes coexist:
  //   - Form shape (impact_intake.*): produced by CPPARiskAssessment.tsx's
  //     radio/pill controls. All option literals verified to match.
  //   - Persisted/generator shape (impact.*): produced by the WS6 intake
  //     generator + normalisation layer.
  cppa_risk_assessment: {
    "impact_intake.likelihood": IMPACT_LIKELIHOOD_OPTS,
    "impact_intake.severity": IMPACT_SEVERITY_OPTS,
    "impact_intake.benefitsOutweigh": IMPACT_BENEFITS_OUTWEIGH_OPTS,
    "impact_intake.cyberGaps": IMPACT_CYBER_GAPS_OPTS,
    "impact_intake.harmTypes": HARM_TYPES,
    "impact.severity_of_harm": IMPACT_SEVERITY_OPTS,
    "impact.likelihood_of_harm": IMPACT_LIKELIHOOD_OPTS,
    "impact.benefits_outweigh_risks": IMPACT_BENEFITS_OUTWEIGH_OPTS,
    "impact.cybersecurity_gaps_identified": IMPACT_CYBER_GAPS_OPTS,
    // RC-C1 C1.1 — T-class banded fields registered so open_items with
    // input_spec.kind = "re-select" render the correct enum in the refine
    // surface.
    q1_revenue: REVENUE_OPTS,
    q2_consumers: CONSUMER_OPTS,
    // T-C1 (2026-07-28) — § 1798.140(d)(1)(B) operand register.
    bought_sold_shared_count: BOUGHT_SOLD_SHARED_OPTS,
    i3_ca_consumer_band: CONSUMER_OPTS,
    annual_consumer_volume: CONSUMER_OPTS,
    q5_sell_share: Q5_SELL_SHARE_OPTS,
    q5c_share_revenue_50pct: SHARE_REVENUE_50PCT_OPTS,
    q15_sensitive_pi: Q15_SENSITIVE_PI_OPTS,
    q15c_spi_volume: SPI_VOLUME_OPTS,
    q18_admt_use: Q18_ADMT_USE_OPTS,
    q20_admt_opt_out: Q20_ADMT_OPT_OUT_OPTS,
    "triggers.q1_revenue": REVENUE_OPTS,
    "triggers.q2_consumers": CONSUMER_OPTS,
    "triggers.q5_sell_share": Q5_SELL_SHARE_OPTS,
    "triggers.q15_sensitive_pi": Q15_SENSITIVE_PI_OPTS,
    "triggers.q18_admt_use": Q18_ADMT_USE_OPTS,
  },
  // ADMT Checker (admt_detail = `adv` in the intake)
  cppa_admt: {
    "admt_detail.vendor_status": ADMT_VENDOR_STATUS_OPTS,
    "admt_detail.vendor_docs": ADMT_VENDOR_DOCS_OPTS,
    "admt_detail.v_audit": ADMT_YES_NO_OPTS,
    "admt_detail.v_assist": ADMT_YES_NO_OPTS,
    "admt_detail.v_optout": ADMT_YES_NO_OPTS,
    "admt_detail.v_appeal": ADMT_YES_NO_OPTS,
    "admt_detail.v_incident": ADMT_YES_NO_OPTS,
    "admt_detail.vendor_makes_available": ADMT_YES_NO_UNSURE_OPTS,
    "admt_detail.hosting": ADMT_HOSTING_OPTS,
    "admt_detail.model_types": ADMT_MODEL_TYPE_OPTS,
    "admt_detail.decision_effects": ADMT_DECISION_EFFECT_OPTS,
    "admt_detail.decision_cadence": ADMT_DECISION_CADENCE_OPTS,
    "admt_detail.sole_factor": ADMT_SOLE_FACTOR_OPTS,
    "admt_detail.feeds_future_decisions": ADMT_YES_NO_UNSURE_OPTS,
    "admt_detail.solely_advertising": ADMT_SOLELY_ADVERTISING_OPTS,
  },
  // RC-C2 C2.2 — DPIA T-class enumerated intake leaves.
  dpia_framework: {
    data_categories: DPIA_DATA_CATS,
    jurisdictions: DPIA_JURISDICTIONS,
    legal_basis_proposed: DPIA_LEGAL_BASES,
    article_9_condition: DPIA_ARTICLE_9_CONDITIONS,
    reasons_to_conduct: DPIA_REASONS_TO_CONDUCT,
    existing_safeguards: DPIA_SAFEGUARDS,
    processors: DPIA_TOOLS,
  },
  // RC-C2 C2.5 — LIA T-class enumerated intake leaves.
  li_assessment: {
    data_categories: LIA_DATA_CATEGORIES,
    relationship_type: LIA_RELATIONSHIPS,
    jurisdictions: LIA_JURISDICTIONS,
  },
  // RC-C3.CLOSE-1 — CPPA Cybersecurity. All 18 controls.<slug> paths share
  // the intake page's MATURITY option list; the enum_ref emitted on frozen
  // open_items is "cppa_cybersecurity:maturity" (resolved server-side via
  // FIELD_ENUM_MIRROR). Registering per-slug here keeps client-side
  // getEnumOptions(toolType, keyPath) working without an enum_ref lookup.
  cppa_cybersecurity: {
    "controls.c1_auth": CYBER_MATURITY_OPTS,
    "controls.c2_encryption": CYBER_MATURITY_OPTS,
    "controls.c3_account_access": CYBER_MATURITY_OPTS,
    "controls.c4_inventory": CYBER_MATURITY_OPTS,
    "controls.c5_secure_config": CYBER_MATURITY_OPTS,
    "controls.c6_vuln_mgmt": CYBER_MATURITY_OPTS,
    "controls.c7_audit_logs": CYBER_MATURITY_OPTS,
    "controls.c8_network_mon": CYBER_MATURITY_OPTS,
    "controls.c9_anti_malware": CYBER_MATURITY_OPTS,
    "controls.c10_segmentation": CYBER_MATURITY_OPTS,
    "controls.c11_port_protocol": CYBER_MATURITY_OPTS,
    "controls.c12_awareness": CYBER_MATURITY_OPTS,
    "controls.c13_training": CYBER_MATURITY_OPTS,
    "controls.c14_secure_dev": CYBER_MATURITY_OPTS,
    "controls.c15_third_party": CYBER_MATURITY_OPTS,
    "controls.c16_retention": CYBER_MATURITY_OPTS,
    "controls.c17_incident": CYBER_MATURITY_OPTS,
    "controls.c18_continuity": CYBER_MATURITY_OPTS,
  },
  // Audit note (2026-07-12, UX-1): the remaining tools' object/array
  // intake fields carry only free-text leaves. Register enum leaves here as
  // each per-tool courier lands.
};

// Normalise an array-index segment ("foo.0.bar" → "foo[].bar") so array
// items share a single registry entry.
function normaliseKeyPath(keyPath: string): string {
  return keyPath.replace(/\.\d+(?=\.|$)/g, "[]");
}

export function getEnumOptions(
  toolType: string,
  keyPath: string,
): readonly string[] | null {
  const tool = REGISTRY[toolType];
  if (!tool) return null;
  return tool[normaliseKeyPath(keyPath)] ?? null;
}
