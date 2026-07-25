import { applyW23RiskTurnB } from "../run-cppa-risk-assessment/_w23_risk_turnb.ts";
const inputs = [
  "No sale or sharing of personal information; § 7150(b) is not engaged.",
  "No selling or sharing occurs, so § 7150(b) is not engaged.",
  "No sensitive personal information is processed, so § 7150(b) is not engaged.",
];
for (const s of inputs) {
  const { report, counters } = applyW23RiskTurnB({ scope_notes: s } as any);
  console.log(counters.pinpoints_added, "→", (report as any).scope_notes);
}
