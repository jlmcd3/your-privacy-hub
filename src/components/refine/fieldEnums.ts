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
} from "@/pages/CPPARiskAssessment.enums";
import {
  REVENUE_OPTS,
  CONSUMER_OPTS,
  SPI_VOLUME_OPTS,
  SHARE_REVENUE_50PCT_OPTS,
  Q5_SELL_SHARE_OPTS,
  Q15_SENSITIVE_PI_OPTS,
} from "@/pages/CPPARiskAssessment";
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

// Q18 uses inline ["Yes","No","In evaluation"] in the intake JSX; mirror that
// literal here (content-anchored to CPPARiskAssessment.tsx line 924).
const Q18_ADMT_USE_OPTS = ["Yes", "No", "In evaluation"] as const;
// Q20 opt-out inline enum; mirror the intake radio literals.
const Q20_ADMT_OPT_OUT_OPTS = ["Yes", "No", "In progress"] as const;

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
  // Audit note (2026-07-12, UX-1): the remaining seven tools' object/array
  // intake fields carry only free-text leaves (LIA purpose/necessity/balancing
  // details, DPIA/DPA/IR/Biometric/CPPACybersecurity/Governance nested blocks).
  // If the intake for any of them adds an enumerated leaf, register it here
  // and import the option set from the owning intake page.
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
