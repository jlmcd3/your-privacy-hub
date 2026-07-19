/**
 * Item 4 — Centralized presentation-label mapping for user-facing enum values.
 *
 * PURPOSE
 * Storage / API / analytics keep raw enum strings (e.g. "immediate",
 * "in_review", "cppa_risk_assessment"). User-facing surfaces should render
 * a friendly label WITHOUT mutating the underlying value.
 *
 * CONTRACT
 * - `enumLabel(namespace, value)` returns the mapped label if present.
 * - Unknown values fall back to a deterministic humanized form:
 *     "in_review"    → "In review"
 *     "cppa-risk"    → "Cppa Risk"          (kebab)
 *     "SNAKE_CASE"   → "Snake Case"
 *     "camelCase"    → "Camel Case"
 *     null/undefined → "" (empty string; callers decide fallback)
 * - Raw values in storage/APIs are NEVER rewritten by this helper.
 *
 * Add new namespaces below as surfaces adopt the helper. Do not inline
 * ad-hoc label maps in components — extend this file instead.
 */

export type EnumNamespace =
  | "urgency"
  | "legal_weight"
  | "run_status"
  | "tool_type"
  | "assessment_status"
  | "subscription_tier"
  | "severity";

type LabelMap = Readonly<Record<string, string>>;

const MAPS: Readonly<Record<EnumNamespace, LabelMap>> = {
  // AI-summary urgency (see src/lib/severity.ts).
  urgency: {
    immediate: "Immediate action",
    "this quarter": "This quarter",
    "this-quarter": "This quarter",
    monitor: "Monitor",
  },
  legal_weight: {
    binding: "Binding",
    enforcement: "Enforcement",
    guidance: "Guidance",
    commentary: "Commentary",
  },
  // function_runs / assessments status column.
  run_status: {
    pending: "Pending",
    in_progress: "In progress",
    running: "Running",
    completed: "Completed",
    complete: "Complete",
    succeeded: "Succeeded",
    failed: "Failed",
    error: "Error",
    cancelled: "Cancelled",
    canceled: "Cancelled",
    stalled: "Stalled",
    stuck: "Stuck",
    queued: "Queued",
    exported: "Exported",
    ready: "Ready",
  },
  // Internal tool_type identifiers → catalog display names.
  tool_type: {
    cppa_risk_assessment: "CPPA Risk Assessment",
    cppa_cybersecurity: "CPPA Cybersecurity Audit",
    cppa_admt: "ADMT Checker",
    cppa_suite: "CPPA Full Audit Suite",
    dpia_framework: "DPIA",
    li_assessment: "Legitimate Interest Assessment",
    governance: "Governance Assessment",
    biometric: "Biometric Privacy Check",
    ir_playbook: "Incident Response Playbook",
    ropa: "Record of Processing Activities",
    us_notice: "US Privacy Notice",
    eu_notice: "EU / Global Privacy Notice",
    dpa: "Custom DPA",
    registration: "Data Broker Registration",
  },
  assessment_status: {
    draft: "Draft",
    submitted: "Submitted",
    in_review: "In review",
    approved: "Approved",
    published: "Published",
    archived: "Archived",
    superseded: "Superseded",
  },
  subscription_tier: {
    free: "Free",
    intelligence_monthly: "Intelligence — Monthly",
    intelligence_annual: "Intelligence — Annual",
    professional_monthly: "Professional — Monthly",
    professional_annual: "Professional — Annual",
    monthly: "Monthly",
    annual: "Annual",
    pro_monthly: "Professional — Monthly",
    pro_annual: "Professional — Annual",
  },
  severity: {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
  },
};

/** Deterministic humanization for unmapped values. */
export function humanizeEnum(raw: string): string {
  if (!raw) return "";
  // camelCase → camel Case ; then normalize separators.
  const spaced = raw
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!spaced) return "";
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function enumLabel(
  namespace: EnumNamespace,
  value: string | null | undefined,
): string {
  if (value == null) return "";
  const v = String(value).trim();
  if (!v) return "";
  const map = MAPS[namespace];
  if (map) {
    // Case-insensitive lookup with original key preferred.
    if (Object.prototype.hasOwnProperty.call(map, v)) return map[v];
    const lower = v.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(map, lower)) return map[lower];
  }
  return humanizeEnum(v);
}

/** For tests / debug UIs. Returns the raw map for a namespace. */
export function _labelMapForTest(ns: EnumNamespace): LabelMap {
  return MAPS[ns];
}
