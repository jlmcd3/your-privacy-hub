// ITEM 378 — RISK CROSS-SURFACE CONSISTENCY (Deliverable 3), R1–R4.
//
// Deterministic; no models. Includes the honest-degradation guard: on an
// existing DEGRADED golden intake the pass must make ZERO repairs.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  RISK_CSC_VERSION,
  runRiskCsc,
  attachRiskCsc,
  assessBenefitClaim,
  intakeAnchorText,
} from "../../../supabase/functions/_shared/ltp/risk-csc.ts";
import { CPPA_RISK_PERFECT } from "../../../supabase/functions/_shared/golden/cppa-risk.ts";
import { CPPA_RISK_GOLDEN } from "../../../supabase/functions/_shared/golden/cppa-risk.ts";

const PERFECT_INTAKE = CPPA_RISK_PERFECT[0].intake as Record<string, unknown>;

Deno.test("R1 — a benefit anchored in the record passes clean", () => {
  const anchor = intakeAnchorText(PERFECT_INTAKE);
  const v = assessBenefitClaim(
    "Fraud losses down 41% since the model launched, benefiting Sierra Outfitters.",
    anchor,
  );
  assertEquals(v.unanchored, []);
  assertEquals(v.pureInvention, false);
});

Deno.test("R1 — a benefit naming facts absent from the record is flagged, not rewritten", () => {
  const report: Record<string, unknown> = {
    activity_analytics: [{
      activity_name: "Store-financing eligibility screening",
      benefits: [{
        benefit: "Partnership with Acme Analytics lifted approvals by 88%.",
        supporting_record_fact: "Median decision time 3.2 minutes.",
      }],
    }],
  };
  const t = runRiskCsc(report, { intake: PERFECT_INTAKE });
  const r1 = t.violations.filter((v) => v.check_id === "r1_benefits_vs_intake");
  assertEquals(r1.length, 1);
  assertEquals(r1[0].repaired, false);
  // the row survives — only pure invention is routed away
  assertEquals((report.activity_analytics as any[])[0].benefits.length, 1);
});

Deno.test("R1 — a pure-invention benefit row is routed to information_needed", () => {
  const report: Record<string, unknown> = {
    activity_analytics: [{
      activity_name: "Store-financing eligibility screening",
      benefits: [
        { benefit: "Quantum telemetry beacons improve orbital docking throughput." },
        { benefit: "Fraud losses down 41% since the model launched." },
      ],
    }],
  };
  const t = runRiskCsc(report, { intake: PERFECT_INTAKE });
  assert(t.repairs >= 1);
  const benefits = (report.activity_analytics as any[])[0].benefits;
  assertEquals(benefits.length, 1);
  assertEquals(benefits[0].benefit, "Fraud losses down 41% since the model launched.");
  const asks = report.information_needed as any[];
  assertEquals(asks.length, 1);
  assertEquals(asks[0].topic, "benefits_7152_a_4");
  assert(String(asks[0].information_needed).includes("§ 7152(a)(4)"));
  assert(String(asks[0].id).length > 0);
});

Deno.test("R2 — a claimed exception against an empty exceptions_intake is repaired to not-claimed", () => {
  const report: Record<string, unknown> = {
    exception_analysis: [
      { id: "e1", status: "claimed", text: "The business claims the security exception." },
      { id: "e2", status: "not_claimed", text: "No exception is claimed." },
    ],
  };
  const t = runRiskCsc(report, { intake: PERFECT_INTAKE });
  const r2 = t.violations.filter((v) => v.check_id === "r2_exception_vs_record");
  assertEquals(r2.length, 1);
  assertEquals(r2[0].repaired, true);
  assertEquals((report.exception_analysis as any[])[0].status, "not_claimed");
  assertEquals((report.exception_analysis as any[])[1].status, "not_claimed");
});

Deno.test("R2 — an exception the record DOES claim is left alone", () => {
  const report: Record<string, unknown> = {
    exception_analysis: [{ id: "e1", status: "claimed", text: "The business claims the security exception." }],
  };
  const t = runRiskCsc(report, {
    intake: { ...PERFECT_INTAKE, exceptions_intake: { security: { claimed: true } } },
  });
  assertEquals(t.violations.filter((v) => v.check_id === "r2_exception_vs_record").length, 0);
  assertEquals((report.exception_analysis as any[])[0].status, "claimed");
});

Deno.test("R3 — secondary-use rows are removed when the record denies secondary uses", () => {
  const report: Record<string, unknown> = {
    risk_register: [
      { risk_id: "R1", description: "Risk arising from secondary use of application data." },
      { risk_id: "R2", description: "Risk of credential compromise." },
    ],
    executive_summary: "The record describes further processing for marketing.",
  };
  const t = runRiskCsc(report, { intake: PERFECT_INTAKE });
  const r3 = t.violations.filter((v) => v.check_id === "r3_secondary_use_predicate");
  assertEquals(r3.length, 2);
  assertEquals((report.risk_register as any[]).length, 1);
  assertEquals((report.risk_register as any[])[0].risk_id, "R2");
  // prose surface is flagged, not rewritten
  assertEquals(r3.filter((v) => v.path === "executive_summary")[0].repaired, false);
});

Deno.test("R3 — no check when the record reports secondary uses", () => {
  const report: Record<string, unknown> = {
    risk_register: [{ risk_id: "R1", description: "Risk arising from secondary use of application data." }],
  };
  const t = runRiskCsc(report, {
    intake: { ...PERFECT_INTAKE, has_secondary_uses: "Yes — there are other uses", secondary_activities: [{ name: "Marketing" }] },
  });
  assertEquals(t.violations.filter((v) => v.check_id === "r3_secondary_use_predicate").length, 0);
  assertEquals((report.risk_register as any[]).length, 1);
});

Deno.test("R4 — structured leaves carrying absence prose are flagged", () => {
  const report: Record<string, unknown> = {
    attestation_block: {
      approvers: [{ name: "L. Whitcomb", position: "the record does not name a position" }],
      text: "Certified by L. Whitcomb.",
    },
    priority_actions: [{ rank: 1, likelihood: "[TO BE COMPLETED — likelihood]" }],
  };
  const t = runRiskCsc(report, { intake: PERFECT_INTAKE });
  const r4 = t.violations.filter((v) => v.check_id === "r4_structured_leaf_hygiene");
  assert(r4.length >= 2);
  assert(r4.every((v) => v.repaired === false));
  assert(r4.some((v) => v.path.endsWith("position")));
  assert(r4.some((v) => v.path.endsWith("likelihood")));
});

Deno.test("R4 — honest degradation: an absence claim on an UNBACKED surface is not flagged", () => {
  const report: Record<string, unknown> = {
    attestation_block: { text: "The record does not name a certifying executive." },
  };
  const bare = { ...PERFECT_INTAKE } as Record<string, unknown>;
  delete bare.i8_certifying_exec_name;
  delete bare.i8_certifying_exec_title;
  const t = runRiskCsc(report, { intake: bare });
  assertEquals(t.violations.filter((v) => v.path === "attestation_block.text").length, 0);
});

Deno.test("HONEST-DEGRADATION GUARD — a degraded golden intake yields ZERO repairs", () => {
  const degraded = CPPA_RISK_GOLDEN[0].intake as Record<string, unknown>;
  const report: Record<string, unknown> = {
    executive_summary: "The record does not supply a benefits statement for this activity.",
    activity_analytics: [{
      activity_name: "Free-tier account analytics",
      benefits: [{ benefit: "[TO BE COMPLETED — benefit to the business]" }],
    }],
    exception_analysis: [{ id: "e1", status: "not_claimed", text: "No exception is claimed on this record." }],
    attestation_block: { text: "[TO BE COMPLETED — certifying executive]" },
    information_needed: [],
  };
  const t = runRiskCsc(report, { intake: degraded });
  assertEquals(t.repairs, 0);
  assertEquals(t.crashed, false);
});

Deno.test("telemetry attaches at _meta.internal.risk_csc and fails open", () => {
  const report: Record<string, unknown> = {};
  const t = attachRiskCsc(report, { intake: PERFECT_INTAKE });
  assertEquals(t.version, RISK_CSC_VERSION);
  assertEquals((report as any)._meta.internal.risk_csc.version, RISK_CSC_VERSION);
  // null-safe
  assertEquals(runRiskCsc(null, { intake: null }).violations.length, 0);
});
