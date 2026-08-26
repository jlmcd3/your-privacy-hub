// LIA use-case classifier — SHARED, deterministic, no model call.
//
// Doc 73 §4 (R2, CEO-ratified 2026-08-25/26): the precedent-class posture
// table keys off this classifier, not off Stage 1's Haiku classification
// call. Reusing the SAME deterministic function `preview-li-assessment`
// already used for the free-preview signal means the whole R2 pipeline is
// code-computed end to end and satisfies the Render-Readiness Law (doc 48
// §II.6) without waiting on PN-L4's `classify_typed` decision table — a
// model's self-reported use-case label is never the gate for what this
// module renders.
//
// EXTRACTED FROM (single-source-of-truth fix, doc 73 §4 R4): this was
// previously duplicated inline in
// supabase/functions/preview-li-assessment/index.ts. That module now
// imports from here; do not re-inline it there.
//
// Matches Stage 1's `use_case_category` enum
// (run-li-assessment/index.ts ~L828) with one addition ("product_improvement",
// carried from the preview module's own pre-existing set) — the two enums
// are allowed to diverge only if a future landing reconciles them
// deliberately; this module is the one to extend either way.

export const USE_CASE_KEYWORDS: Record<string, string[]> = {
  direct_marketing: ["marketing", "promotional", "newsletter", "campaign", "outreach", "email"],
  fraud_prevention: ["fraud", "abuse", "risk scor", "anti-money", "aml", "kyc"],
  employee_monitoring: ["employee", "worker", "workplace", "staff", "monitor"],
  behavioral_advertising: ["behavioural", "behavioral", "advertis", "targeting", "tracking", "profiling for ads"],
  research_analytics: ["research", "analytics", "statistics", "insights", "measurement"],
  it_security: ["security", "intrusion", "logging", "audit", "network", "cyber"],
  contractual_administration: ["account", "billing", "service delivery", "support", "customer"],
  product_improvement: ["improve", "develop", "feature", "personalis", "personaliz", "recommend"],
};

export const USE_CASE_LABELS: Record<string, string> = {
  direct_marketing: "Direct marketing",
  fraud_prevention: "Fraud prevention",
  employee_monitoring: "Employee monitoring",
  behavioral_advertising: "Behavioural advertising",
  research_analytics: "Research & analytics",
  it_security: "IT security",
  contractual_administration: "Contractual administration",
  product_improvement: "Product improvement",
  other: "General processing",
};

export type LiaUseCaseClass = keyof typeof USE_CASE_KEYWORDS | "other";

/** Deterministic keyword classification of a processing_description. Pure,
 * no I/O. The same function backs the free preview and the paid report's
 * precedent-class posture finding — one classifier, both surfaces. */
export function classifyLiaUseCase(description: string): LiaUseCaseClass {
  const text = (description ?? "").toLowerCase();
  let best: LiaUseCaseClass = "other";
  let bestScore = 0;
  for (const [code, keywords] of Object.entries(USE_CASE_KEYWORDS)) {
    const score = keywords.reduce((n, kw) => n + (text.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = code as LiaUseCaseClass;
    }
  }
  return best;
}
