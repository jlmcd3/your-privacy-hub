// D1D2B3B8 (quality batch, 2026-08-27) — Cyber fixes.
//   CY1 [MEDIUM ×2 docs] the §VI action lines never named the recorded
//       remediation owner and carried no cross-family sequencing signal;
//       each line now carries its rank prefix and the intake's own
//       remediation_owner.
//   CY2 [MEDIUM] two gap-scan false-positive classes, verified against the
//       shipped sentences: incident-history narration ("Two P2 incidents
//       occurred … not exfiltrated") rendered as "Remaining work", and a
//       restrictive "allowing only ALB-originated inbound traffic" strength
//       matched the gap sense of "only".
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { recommendationGap } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-recommendations.ts";

Deno.test("CY2 — incident-history narration is never the remaining work", () => {
  const notes =
    "The incident response plan is documented and tested annually. Two P2 incidents occurred in the prior 12 months: a credential stuffing attack on the LendScore API in November 2025 (contained in 4 hours) and an unauthorized S3 bucket access event in March 2026 (contained in 11 hours; consumer data confirmed not exfiltrated).";
  assertEquals(recommendationGap(notes), "");
});

Deno.test("CY2 — a genuine gap sentence after incident history still surfaces", () => {
  const notes =
    "Two P2 incidents occurred in the prior 12 months: a credential stuffing attack on the LendScore API (contained in 4 hours). However, corrective actions from the March 2026 event remain incomplete and no executive tabletop exercise has been run.";
  assertStringIncludes(recommendationGap(notes), "corrective actions from the March 2026 event remain incomplete");
});

Deno.test("CY2 — a restrictive 'allowing only' strength is not a gap", () => {
  const notes =
    "Production and corporate networks are segmented by VLAN. The LendScore API production environment is further isolated in a dedicated VPC with Security Groups allowing only ALB-originated inbound traffic.";
  assertEquals(recommendationGap(notes), "");
});

Deno.test("CY2 — the gap sense of 'only' still matches", () => {
  const notes =
    "Okta enforces MFA for all cloud access. The legacy Sacramento batch cluster still authenticates via username/password only.";
  assertStringIncludes(recommendationGap(notes), "username/password only");
});

Deno.test("CY1 — an action line carries its rank prefix and the recorded remediation owner", async () => {
  const { buildReadinessActions } = await import(
    "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-factors.ts"
  );
  const { buildCyberComponentRecommendations } = await import(
    "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-recommendations.ts"
  );
  const { buildCyberDeliverables } = await import(
    "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts"
  );
  const intake = {
    profile: {
      entity_name: "LendScore Financial",
      industry: "FinTech",
      framework: "NIST CSF",
      remediation_owner: "Denise Kwan, CISO",
    },
    controls: [
      {
        control: "c1_auth",
        maturity: "Partially implemented",
        notes:
          "Okta enforces MFA for all cloud access. The legacy Sacramento batch cluster still authenticates via username/password only.",
        evidence: ["Policy documents"],
      },
    ],
  } as Record<string, unknown>;
  const d = buildCyberDeliverables(intake as never) as unknown as Record<string, unknown>;
  const recs = buildCyberComponentRecommendations(
    d.component_coverage as never,
    d.evidence_sufficiency as never,
  );
  const actions = buildReadinessActions(intake as never, recs);
  const all = [
    ...actions.priority_actions,
    ...actions.evidence_package_actions,
    ...actions.implementation_actions,
    ...actions.record_completion_actions,
  ];
  assert(all.length > 0, "at least one action must render on this fixture");
  const withOwner = all.filter((a: string) => a.includes("Recorded remediation owner: Denise Kwan, CISO"));
  assertEquals(withOwner.length, all.length, "every action line names the recorded owner");
  assert(all.every((a: string) => /^Rank \d+ — /.test(a)), "every action line carries its rank prefix");
});
