// S-G3 (doc 80, 2026-08-27) — the governance determinization: determination
// tables over the intake's enums replace the ten per-domain model calls, a
// composed posture sentence replaces the synthesis splice, all dark behind
// GOVERNANCE_DETERMINISTIC_ENABLED (default false).

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildDomainFindingsTyped,
  composeExecutiveSummaryTyped,
} from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-domain-tables.ts";

const STRONG = {
  jurisdictions: ["EU (GDPR)"],
  special_category: "No",
  inventory_audit: "Yes — audited + formal approval process",
  technical_controls: "Yes — DLP/content filtering actively enforced",
  dpa_status: "Yes, all vendors",
  dpa_art28_verified: "Yes — verified",
  tool_instruction: "Yes, written policy with specific prohibitions",
  training_status: "Yes, formal onboarding + annual refresh",
  training_ai_coverage: "Yes — explicitly covers AI tools",
  incident_response: "Yes, tested in last 12 months",
  dpia_status: "Yes, multiple DPIAs completed",
  dpia_ai_coverage: "Yes — all AI/high-risk tools assessed",
  dsr_capability: "Yes — documented and tested across all vendors",
  privacy_policy: "Yes, current (reviewed in last 12 months)",
  privacy_notice_coverage: "Yes — notice covers all current activities, transfers, retention, and rights",
};

Deno.test("S-G3 — all ten domains build deterministically with the model fan-out's shape", () => {
  const f = buildDomainFindingsTyped(STRONG);
  assertEquals(Object.keys(f).length, 10);
  for (const d of Object.values(f)) {
    assert(d.domain_id >= 1 && d.domain_id <= 10);
    assert(d.domain_name.length > 5);
    assert(d.current_state.length > 10);
    assert(d.regulatory_basis.length > 3);
    assert(d.recommended_action.length > 10);
  }
  // Byte-determinism.
  assertEquals(JSON.stringify(buildDomainFindingsTyped(STRONG)), JSON.stringify(f));
});

Deno.test("S-G3 — a strong record is Compliant across the board; the posture sentence says so", () => {
  const f = buildDomainFindingsTyped(STRONG);
  const adverse = Object.values(f).filter((d) => d.severity === "High" || d.severity === "Critical");
  assertEquals(adverse.map((d) => d.domain_name), []);
  const exec = composeExecutiveSummaryTyped(f);
  // RE-PIN PANEL GOV-5 (2026-08-30): the all-clear is now scoped to the
  // OPERATIONAL domains and points at the headline determination, because
  // the accountability determination can be unresolved (with a High register
  // row) while every operational domain is clean — the unscoped sentence
  // read as contradicting both on the published sample.
  assertStringIncludes(exec, "No operational domain requires immediate remediation on the company's answers");
  assertStringIncludes(exec, "The headline accountability determination is carried separately above");
});

Deno.test("S-G3 — adverse answers produce graded severities from the enum, never a blended guess", () => {
  const f = buildDomainFindingsTyped({
    ...STRONG,
    dpa_status: "No",
    incident_response: "No",
    technical_controls: "No — policy and training only",
    special_category: "Yes",
  });
  assertEquals(f["vendor_terms"].severity, "Critical");
  assertEquals(f["incident_response"].severity, "High");
  assertEquals(f["data_submission"].severity, "High");
  assertStringIncludes(f["vendor_terms"].recommended_action, "Art. 28(3)");
  const exec = composeExecutiveSummaryTyped(f);
  assertStringIncludes(exec, "Vendor Data Terms Compliance");
  assertStringIncludes(exec, "Incident Response and Breach Readiness");
});

Deno.test("S-G3 — Unsure/absent answers degrade honestly, never asserting either way", () => {
  const f = buildDomainFindingsTyped({ ...STRONG, dpia_status: "Unsure", dsr_capability: "" });
  assertEquals(f["dpia_status"].severity, "Unresolved");
  assertStringIncludes(f["dpia_status"].current_state, "on the information provided");
  assertEquals(f["subject_rights"].severity, "Unresolved");
  const exec = composeExecutiveSummaryTyped(f);
  assertStringIncludes(exec, "unresolved on the information provided");
});

Deno.test("S-G3 — the coupled sub-enums qualify but never rescue (verified DPAs, AI training coverage)", () => {
  const partialVerify = buildDomainFindingsTyped({ ...STRONG, dpa_art28_verified: "Not verified" });
  assertEquals(partialVerify["vendor_terms"].severity, "Low");
  assertStringIncludes(partialVerify["vendor_terms"].current_state, "not verified");
  const noAiTraining = buildDomainFindingsTyped({ ...STRONG, training_ai_coverage: "No — not AI-specific" });
  assertStringIncludes(String(noAiTraining["training"].gap_description), "outside the training's coverage");
});

Deno.test("S-G3 — the flag defaults false and both branch points exist in index", () => {
  const src = Deno.readTextFileSync(
    new URL("../../../supabase/functions/run-governance-assessment/index.ts", import.meta.url),
  );
  assertStringIncludes(src, 'Deno.env.get("GOVERNANCE_DETERMINISTIC_ENABLED") ?? "false"');
  assert(/GOVERNANCE_DETERMINISTIC_ENABLED\s*\?\s*\(\(\) => \{/.test(src), "fan-out branch missing");
  assertStringIncludes(src, "composeExecutiveSummaryTyped(domainResults as never)");
});

Deno.test("S-G3 — the counsel-referral discipline holds: no counsel-ownership language in any cell", () => {
  const f = buildDomainFindingsTyped({ ...STRONG, dpa_status: "No", incident_response: "No" });
  const blob = JSON.stringify(f).toLowerCase();
  for (const banned of ["legal counsel must", "outside counsel", "consult counsel", "qualified counsel"]) {
    assert(!blob.includes(banned), `banned phrase present: ${banned}`);
  }
});
