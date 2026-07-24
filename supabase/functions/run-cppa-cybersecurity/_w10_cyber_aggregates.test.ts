// A1 + A2 (2026-07-24) — end-to-end pins for cppa-cyber pre-emit gates.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/testing/asserts.ts";
import { applyW6CyberFix } from "./_w6_cyber_fix.ts";
import { attachCyberAggregates, computeCyberAggregates, scrubAuthoredAggregates } from "./_w10_cyber_aggregates.ts";

// ── A1 (2026-07-24) — no "(N)" placeholder survives anywhere in the report ──
Deno.test("A1 — no unresolved (N) placeholder survives in any narrative field", () => {
  const report: any = {
    executive_summary: "Overall, the HIPAA Security Rule requires MFA for privileged users.",
    controls: [
      {
        control: "Authentication",
        finding: "The HIPAA Security Rule requires MFA on privileged accounts.",
        remediation: "NIST CSF 2.0 governs the credential lifecycle here.",
        regulatory_basis: "Assessed under 11 CCR § 7123(c)(1).",
      },
      {
        control: "Encryption of personal information",
        finding: "ISO/IEC 27001 mandates key management.",
        remediation: "SOC 2 governs the vendor oversight for KMS.",
        regulatory_basis: "Assessed under 11 CCR § 7123(c)(2).",
      },
      {
        // Label unknown to the citation registry — tail must be OMITTED.
        control: "unknown-control-label",
        finding: "HITRUST CSF requires log-retention controls here.",
        remediation: "SOC 2 requires vendor oversight.",
        regulatory_basis: "Assessed under 11 CCR § 7123(c)(15).",
      },
    ],
    top_risks: [
      "HIPAA governs breach notification for these systems.",
      { text: "NIST CSF 2.0 requires continuous monitoring." },
    ],
    next_steps: [
      "SOC 2 mandates a follow-up audit within 12 months.",
    ],
  };
  applyW6CyberFix(report, { profile: { framework: "HITRUST" } } as any);

  const blob = JSON.stringify(report);
  assert(!/\(N\)/.test(blob), `unresolved (N) survived: ${blob.match(/[^"]{0,60}\(N\)[^"]{0,60}/)?.[0]}`);
  assert(!/§\s*7123\(c\)\(N\)/.test(blob), `§ 7123(c)(N) survived: ${blob}`);

  // Auth control gets its specific citation stamped.
  assert(/operative requirement is 11 CCR § 7123\(c\)\(1\)/.test(report.controls[0].finding),
    report.controls[0].finding);
  // Encryption control gets (c)(2).
  assert(/operative requirement is 11 CCR § 7123\(c\)\(2\)/.test(report.controls[1].finding),
    report.controls[1].finding);
  // Unknown-label control gets NO operative tail.
  assert(!/operative requirement is/i.test(report.controls[2].finding),
    `unknown-label control leaked tail: ${report.controls[2].finding}`);
  // Exec summary + top_risks / next_steps get NO operative tail (no control context).
  assert(!/operative requirement is/i.test(report.executive_summary), report.executive_summary);
  assert(!/operative requirement is/i.test(String(report.top_risks[0])), String(report.top_risks[0]));
  assert(!/operative requirement is/i.test(String(report.next_steps[0])), String(report.next_steps[0]));
});

// ── A2 (2026-07-24) — deterministic aggregate injection & scrub ────────────
Deno.test("A2 — computeCyberAggregates excludes Insufficient information from the mean", () => {
  const controls = [
    { status: "Implemented", score: 80 },
    { status: "Implemented", score: 82 },
    { status: "Mature", score: 92 },
    { status: "Gap", score: 40 },
    { status: "Insufficient information", score: 0 },
    { status: "Insufficient information", score: 0 },
  ];
  const agg = computeCyberAggregates(controls);
  assertEquals(agg.scored_count, 4);
  assertEquals(agg.insufficient_count, 2);
  // (80+82+92+40)/4 = 73.5 → rounded 74
  assertEquals(agg.mean_score, 74);
  assert(agg.canonical_sentence.includes("74"), agg.canonical_sentence);
  assert(agg.canonical_sentence.includes("4 scored"), agg.canonical_sentence);
  assert(agg.canonical_sentence.includes("2 Insufficient-information"), agg.canonical_sentence);
});

Deno.test("A2 — model-authored 'mean score of 81' is replaced with deterministic sentence", () => {
  const report: any = {
    executive_summary:
      "The organisation demonstrates a mean score of 81 across the 18 audit components. Follow-up work is advisable.",
    controls: [
      { status: "Implemented", score: 60 },
      { status: "Implemented", score: 65 },
      { status: "Insufficient information", score: 0 },
    ],
  };
  const r = attachCyberAggregates(report);
  assert(r.authoredAggregatesReplaced >= 1);
  assert(!/mean score of 81/i.test(report.executive_summary), report.executive_summary);
  assert(/Mean of 63 across the 2 scored components/.test(report.executive_summary),
    report.executive_summary);
  assertEquals(report.aggregates.mean_score, 63);
  assertEquals(report.aggregates.scored_count, 2);
  assertEquals(report.aggregates.insufficient_count, 1);
});

Deno.test("A2 — no aggregate token → no-op; slot still injected", () => {
  const report: any = {
    executive_summary: "Overall the record is complete and no aggregate phrasing appears.",
    controls: [{ status: "Mature", score: 95 }],
  };
  const r = attachCyberAggregates(report);
  assertEquals(r.authoredAggregatesReplaced, 0);
  assert(r.slotsInjected.includes("aggregates"));
  assertEquals(report.aggregates.mean_score, 95);
});

Deno.test("A2 — scrub catches 'average score' and 'aggregate score' variants", () => {
  const agg = computeCyberAggregates([{ status: "Implemented", score: 70 }]);
  for (const sample of [
    "The average score of 88 masks Insufficient-information controls.",
    "Aggregate score 74 across the 18 components is not audit-ready.",
    "Reports a mean of 55 across all 18 audit components.",
  ]) {
    const { out, replaced } = scrubAuthoredAggregates(sample, agg);
    assert(replaced >= 1, `not replaced: ${sample}`);
    assert(!/\b(?:88|74|55)\b/.test(out), `stale figure survived: ${out}`);
  }
});
