// ITEM 400 — governance prose-gold pins (GV-1 … GV-3) + plan-spine fidelity.
//
// These assert the ruled states, not the implementation shape: one verdict
// voice sourced from the accountability determination, hollow fields omitted
// rather than shipped, internal enums off reader prose, and determination
// outcomes never edited.

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  applyGovernanceProseGold,
  applyVerdictVoice,
  applyHollowFieldOmission,
  applyCustomerRegister,
  readinessLineFromDetermination,
  isHollow,
} from "../../../supabase/functions/_shared/ltp/governance-prose-gold.ts";
import {
  GOVERNANCE_PIPELINE_STAMP,
  GOVERNANCE_SECTION_SPECS,
  GOVERNANCE_THESIS,
  GOVERNANCE_PLAN_ROW_ID,
  GOVERNANCE_PLAN_VERSION_LABEL,
} from "../../../supabase/functions/_shared/prose/plans/governance.spine.ts";

Deno.test("ITEM400 spine: stamp, thesis and nine-section arc", () => {
  assertEquals(GOVERNANCE_PIPELINE_STAMP, "governance-pipeline@item403-2026-08-07");
  assertEquals(GOVERNANCE_PLAN_ROW_ID, "7f168ddb-d419-4f06-8cdc-1cf1fa03be7f");
  assertEquals(GOVERNANCE_PLAN_VERSION_LABEL, "prose-plans-2026-08-07-item400");
  assertEquals(GOVERNANCE_SECTION_SPECS.length, 9);
  assertEquals(GOVERNANCE_SECTION_SPECS[0].id, "readiness_determination");
  assertEquals(GOVERNANCE_SECTION_SPECS[8].id, "close");
  // The thesis names the two operative articles and the one-verdict rule.
  assertEquals(GOVERNANCE_THESIS.includes("5(2)"), true);
  assertEquals(GOVERNANCE_THESIS.includes("24(1)"), true);
  assertEquals(GOVERNANCE_THESIS.includes("second verdict"), true);
});

Deno.test("GV-1: readiness line comes from the determination, not the demoted tier", () => {
  const report: Record<string, unknown> = {
    overall_readiness_rating: undefined,
    maturity_tier_readability_aid: { tier: "Managed", superseded_by: "accountability_determination" },
    accountability_determination: {
      verdict: "record_insufficient",
      citation: "GDPR Art. 5(2); GDPR Art. 24(1)",
    },
    executive_summary:
      "The organisation presents a materially strong compliance posture under GDPR and UK GDPR.",
  };
  const t = applyVerdictVoice(report);
  assertEquals(t.readiness_line, "Accountability not yet determinable");
  assertEquals(report.governance_readiness_line, "Accountability not yet determinable");
  // The contradicting posture claim does not stand beside a non-affirmative verdict.
  assertEquals(String(report.executive_summary).includes("materially strong compliance posture"), false);
  assertEquals(t.posture_claims_deasserted, 1);
  // Verdict-first.
  assertEquals(
    String(report.executive_summary).startsWith(
      "The record does not yet carry what a determination under these duties requires (GDPR Art. 5(2); GDPR Art. 24(1)).",
    ),
    true,
  );
  // Determination outcome untouched.
  assertEquals((report.accountability_determination as Record<string, unknown>).verdict, "record_insufficient");
});

Deno.test("GV-1: an affirmative verdict keeps affirmative prose", () => {
  const report: Record<string, unknown> = {
    accountability_determination: { verdict: "satisfied", citation: "GDPR Art. 5(2)" },
    executive_summary: "The organisation presents a materially strong compliance posture.",
  };
  const t = applyVerdictVoice(report);
  assertEquals(t.posture_claims_deasserted, 0);
  assertEquals(String(report.executive_summary).includes("materially strong compliance posture"), true);
  assertEquals(t.readiness_line, "Accountability evidenced");
});

Deno.test("GV-1: no determination means no second voice is invented", () => {
  const report: Record<string, unknown> = { executive_summary: "Some text." };
  const t = applyVerdictVoice(report);
  assertEquals(t.readiness_line, "");
  assertEquals(report.governance_readiness_line, undefined);
  assertEquals(report.executive_summary, "Some text.");
  assertEquals(readinessLineFromDetermination(undefined), "");
});

Deno.test("GV-2: hollow fields are omitted, populated fields survive verbatim", () => {
  assertEquals(isHollow("—"), true);
  assertEquals(isHollow([]), true);
  assertEquals(isHollow("Media/advertising"), false);
  const report: Record<string, unknown> = {
    organisation_profile: { organization_name: "Cordelia Analytics Ltd", sector: "  ", jurisdictions: [] },
  };
  const t = applyHollowFieldOmission(report, {});
  assertEquals(t.omitted.sort(), ["jurisdictions", "sector"]);
  assertEquals(report.governance_header_fields, { organization_name: "Cordelia Analytics Ltd" });

  const full: Record<string, unknown> = { organisation_profile: {} };
  applyHollowFieldOmission(full, {
    organization_name: "Cordelia Analytics Ltd",
    sector: "Media/advertising",
    jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
  });
  assertEquals(full.governance_header_fields, {
    organization_name: "Cordelia Analytics Ltd",
    sector: "Media/advertising",
    jurisdictions: "EU (GDPR), United Kingdom (UK GDPR)",
  });
});

Deno.test("GV-3: enums leave reader prose and stay on machine-keyed fields", () => {
  const report: Record<string, unknown> = {
    accountability_determination: {
      verdict: "record_insufficient",
      reasoning: "The domain is record_insufficient on the evidence supplied.",
    },
    domain_element_findings: [
      { conclusion: "partially_satisfied", explanation: "Marked partially_satisfied by the walk." },
    ],
  };
  const t = applyCustomerRegister(report);
  assertEquals(t.rewrites, 2);
  // Machine-keyed values untouched.
  assertEquals((report.accountability_determination as Record<string, unknown>).verdict, "record_insufficient");
  assertEquals((report.domain_element_findings as Record<string, unknown>[])[0].conclusion, "partially_satisfied");
  // Reader prose reworded.
  assertEquals(
    (report.accountability_determination as Record<string, unknown>).reasoning,
    "The domain is the record does not yet carry what a determination requires on the evidence supplied.",
  );
  assertEquals(
    (report.domain_element_findings as Record<string, unknown>[])[0].explanation,
    "Marked the record evidences this duty in part by the walk.",
  );
});

Deno.test("ITEM400 entry point is fail-open and stamps telemetry", () => {
  const t = applyGovernanceProseGold(null, null);
  assertEquals(t.errors.length, 0);
  assertEquals(t.stamp, GOVERNANCE_PIPELINE_STAMP);
  assertEquals(t.verdict_voice.readiness_line, "");
});
