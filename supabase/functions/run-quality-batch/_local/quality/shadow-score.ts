// QB-P20 item 6 — Shadow score (REPORT-ONLY). Computes a score that
// SUBTRACTS points for surviving LLM findings using the SAME severity
// table deterministic checks use (critical=25, high=12, medium=6, low=2).
// Persisted in the digest as shadow_score; NO effect on the recorded
// score yet.

export interface ShadowFinding {
  check_type?: "deterministic" | "llm";
  severity?: string | null;
  passed?: boolean;
}

const SEV_PENALTY: Record<string, number> = {
  critical: 25, high: 12, medium: 6, low: 2,
};

export function shadowScore(baseline: number, findings: ShadowFinding[]): number {
  const surviving = findings.filter(f => f.check_type === "llm" && !f.passed);
  const penalty = surviving.reduce((acc, f) => {
    const p = SEV_PENALTY[String(f.severity ?? "").toLowerCase()] ?? 0;
    return acc + p;
  }, 0);
  return Math.max(0, Number((baseline - penalty).toFixed(2)));
}
