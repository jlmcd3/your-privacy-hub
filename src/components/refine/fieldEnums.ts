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
} from "@/pages/admt/ADMTChecker";

type EnumRegistry = Record<string, Record<string, readonly string[]>>;

// tool_type → keyPath → options
const REGISTRY: EnumRegistry = {
  // CPPA Risk (§ 7152 impact assessment scales)
  cppa_risk_assessment: {
    "impact_intake.likelihood": IMPACT_LIKELIHOOD_OPTS,
    "impact_intake.severity": IMPACT_SEVERITY_OPTS,
    "impact_intake.benefitsOutweigh": IMPACT_BENEFITS_OUTWEIGH_OPTS,
    "impact_intake.cyberGaps": IMPACT_CYBER_GAPS_OPTS,
    "impact_intake.harmTypes": HARM_TYPES,
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
