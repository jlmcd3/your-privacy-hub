// QB-P20 item 5 — Certification Gate v2 (REPORT-ONLY).
//
// Compute alongside the legacy score, per run:
//   (a) zero deterministic failures of severity critical/high,
//   (b) zero surviving (post-filter) LLM findings of severity critical,
//   (c) every dimension >= 90,
//   (d) pooled doc count across the tool's last consecutive runs >= 15.
//
// Persist as gate_v2_pass boolean + reasons in the digest. NO effect on
// the certification stop-rule yet; the campaign path continues to gate
// on the legacy metric until CEO approval flips this on.

export interface DimensionScores {
  accuracy: number; citation: number; hallucination: number;
  analysis: number; intelligence: number; formatting: number;
}
export interface GraderFinding {
  check_type?: "deterministic" | "llm";
  severity?: string | null;
  passed?: boolean;
}
export interface GateV2Input {
  dimensions: DimensionScores | null;
  findings: GraderFinding[];       // combined; must be POST-filter
  pooledDocs: number;              // pooled doc count across recent consecutive runs
}
export interface GateV2Result {
  pass: boolean;
  reasons: string[];
}

const CRIT_HIGH = new Set(["critical", "high"]);

export function evaluateGateV2(inp: GateV2Input): GateV2Result {
  const reasons: string[] = [];
  const detFails = inp.findings.filter(f =>
    (f.check_type ?? "deterministic") === "deterministic" &&
    !f.passed &&
    CRIT_HIGH.has(String(f.severity ?? "").toLowerCase()),
  );
  if (detFails.length) reasons.push(`${detFails.length} deterministic critical/high failure(s)`);

  const llmCrit = inp.findings.filter(f =>
    f.check_type === "llm" && !f.passed && String(f.severity ?? "").toLowerCase() === "critical",
  );
  if (llmCrit.length) reasons.push(`${llmCrit.length} surviving critical LLM finding(s)`);

  if (inp.dimensions) {
    const dims: [keyof DimensionScores, number][] = [
      ["accuracy", inp.dimensions.accuracy],
      ["citation", inp.dimensions.citation],
      ["hallucination", inp.dimensions.hallucination],
      ["analysis", inp.dimensions.analysis],
      ["intelligence", inp.dimensions.intelligence],
      ["formatting", inp.dimensions.formatting],
    ];
    for (const [k, v] of dims) {
      if (typeof v === "number" && v < 90) reasons.push(`${k} dim ${v.toFixed(1)} < 90`);
    }
  } else {
    reasons.push("no dimension scores available");
  }

  if (inp.pooledDocs < 15) reasons.push(`pooled docs ${inp.pooledDocs} < 15`);

  return { pass: reasons.length === 0, reasons };
}
