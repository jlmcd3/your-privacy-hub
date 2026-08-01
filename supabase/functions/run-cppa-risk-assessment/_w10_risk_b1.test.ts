// W10-RISK-B1 tests — pin the two hallucination classes from batch 5e0558f3.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyW10RiskB1, W10_RISK_B1_STAMP } from "./_w10_risk_b1.ts";

Deno.test("W10-RISK-B1 stamp present", () => {
  assert(W10_RISK_B1_STAMP.startsWith("w10-risk-b1@"));
});

Deno.test("B1a: fcbcc203 mirror — flag attributes q5b value to sensitive_location_basis → re-keyed", () => {
  const intake = {
    q5b_profiling_observation: "Yes — systematic observation of workers/students/applicants",
    sensitive_location_basis: "Not applicable — no sensitive-location processing",
  };
  const report = {
    inconsistency_flags: [
      {
        intake_field_1: "sensitive_location_basis",
        description:
          "The record shows \"Yes — systematic observation of workers/students/applicants\" for the sensitive-location basis, which conflicts with the negated profiling answer.",
        source_fields: ["sensitive_location_basis"],
      },
    ],
  };
  const { counters } = applyW10RiskB1(report, intake);
  assertEquals(counters.flags_rekeyed, 1);
  assertEquals(counters.flags_dropped, 0);
  const flag = (report.inconsistency_flags as Array<Record<string, unknown>>)[0];
  const sf = flag.source_fields as string[];
  assert(sf.includes("q5b_profiling_observation"), "should extend source_fields with actual owning field");
});

Deno.test("B1a: quoted value nowhere in intake → flag DROPPED", () => {
  const intake = { q5b_profiling_observation: "No", sensitive_location_basis: "Not applicable" };
  const report = {
    inconsistency_flags: [
      {
        intake_field_1: "sensitive_location_basis",
        description: "The record shows \"invented phrase that appears in no intake field whatsoever\".",
        source_fields: ["sensitive_location_basis"],
      },
    ],
  };
  const { counters } = applyW10RiskB1(report, intake);
  assertEquals(counters.flags_dropped, 1);
  assertEquals((report.inconsistency_flags as unknown[]).length, 0);
});

Deno.test("B1a: quoted value actually matches the referenced field → flag kept unchanged", () => {
  const intake = { q3_sell_share: "Yes — sells personal information to third parties" };
  const report = {
    inconsistency_flags: [
      {
        intake_field_1: "q3_sell_share",
        description: "The record shows \"sells personal information to third parties\" and requires resolution.",
        source_fields: ["q3_sell_share"],
      },
    ],
  };
  const { counters } = applyW10RiskB1(report, intake);
  assertEquals(counters.flags_rekeyed, 0);
  assertEquals(counters.flags_dropped, 0);
});

Deno.test("B1b: 1b32c6a9 mirror — 'profiling/inference generation confirmed' unsupported by i1_processing_purpose → downgraded", () => {
  const intake = {
    i1_processing_purpose:
      "Fraud detection and account authentication for consumer transactions. Analytics on aggregate transaction volume.",
  };
  const report = {
    risk_register: {
      entries: [
        {
          id: "RR-001",
          activity: "Profiling analysis",
          harm_type:
            "Profiling/inference generation confirmed by i1_processing_purpose, creating material risk of scoring errors.",
        },
      ],
    },
  };
  const { counters } = applyW10RiskB1(report, intake);
  assertEquals(counters.claims_scanned >= 1, true);
  assertEquals(counters.claims_downgraded, 1);
  const harm = (report.risk_register.entries[0] as Record<string, unknown>).harm_type as string;
  assert(harm.includes("not confirmed"), "harm text should be downgraded to conditional phrasing");
});

Deno.test("B1b: supported claim (subject token present in named field) → kept", () => {
  const intake = {
    i1_processing_purpose: "Profiling of workers to determine promotion eligibility using ADMT.",
  };
  const report = {
    executive_summary:
      "Profiling of workers confirmed by i1_processing_purpose and requires assessment.",
  };
  const { counters } = applyW10RiskB1(report, intake);
  assertEquals(counters.claims_downgraded, 0);
});
