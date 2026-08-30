// DOC-81 (2026-08-27) — the ratification-ledger review. Pins the governance
// fixes: the terminal period after a domain's regulatory basis (G-1), the
// executive-summary Medium/Low gate (G-2), the Compliant/Unresolved posture
// phrases in the crosswalk (G-3), the CEO's UNRESOLVED wording (G-4), the
// Low-training gap sentence (G-5), the citation/wording nits (G-6), the
// attributed-voice Art. 30 sentence (S-3), and the remediation punctuation
// (S-4). S-2 is a recorded CEO ruling (option a — accept and record), no
// code change; S-1 remains open pending further context.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildDomainFindingsTyped,
  composeExecutiveSummaryTyped,
} from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-domain-tables.ts";
import { assembleGovernanceSkeletonDocument } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-skeleton-assemble.ts";

const STRONG = {
  organization_name: "Acme GmbH",
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

Deno.test("G-1 — the rendered domain paragraph never runs the basis sentence into the action", () => {
  const f = buildDomainFindingsTyped({ ...STRONG, inventory_audit: "No formal inventory" });
  const sk = assembleGovernanceSkeletonDocument(
    { domain_findings: f, readiness_determination: {} },
    STRONG,
  );
  const text = JSON.stringify(sk.document);
  assertStringIncludes(text, "GDPR Arts. 5(2), 24(1), 30. Build the tool inventory");
  assert(!text.includes("GDPR Arts. 5(2), 24(1), 30 Build the tool inventory"));
});

Deno.test("G-2 — Medium/Low findings with a gap block the false all-clear sentence", () => {
  const f = buildDomainFindingsTyped({ ...STRONG, technical_controls: "Partial — some tools or categories" });
  const exec = composeExecutiveSummaryTyped(f);
  assert(!exec.includes("No domain requires immediate remediation"));
  assertStringIncludes(exec, "domain carries a recorded gap");
  assertStringIncludes(exec, "below the immediate-priority threshold");
});

Deno.test("G-2 — a genuinely clean record still gets the all-clear sentence and the \"of the ten\" count", () => {
  const f = buildDomainFindingsTyped(STRONG);
  const exec = composeExecutiveSummaryTyped(f);
  // Regulatory Exposure Summary is architecturally never "Compliant" (its
  // severity ladder is Unresolved/Medium/Low only) — 9, not 10, is correct.
  // RE-PIN PANEL GOV-5 (2026-08-30): the count is now scoped to "the ten
  // operational domains walked in the sections below" so it can no longer be
  // read against the ICO crosswalk's DIFFERENT ten categories (whose tally
  // is 8 on the published sample); the all-clear is scoped the same way.
  assertStringIncludes(exec, "Across the ten operational domains walked in the sections below");
  assertStringIncludes(exec, "leave 9 of the ten fully evidenced");
  assertStringIncludes(exec, "No operational domain requires immediate remediation on the company's answers");
});

Deno.test("G-3 — Compliant and Unresolved render as postures, not as \"severity compliant/unresolved\"", () => {
  const f = buildDomainFindingsTyped({ ...STRONG, privacy_policy: "" });
  const sk = assembleGovernanceSkeletonDocument({ domain_findings: f, readiness_determination: {} }, STRONG);
  const text = JSON.stringify(sk.document);
  // RE-PIN BATCH 20a (doc 113 S5.1/S5.2): the crosswalk lines and remediation-item fragments moved into table cells (cells initial-capped; label prefixes retired).
  assertStringIncludes(text, "Transparency");
  assertStringIncludes(text, "Unresolved on the information provided");
  assert(!text.includes("severity unresolved"));
  assert(!text.includes("severity compliant"));
});

Deno.test("G-4 — the CEO-worded UNRESOLVED gap sentence, verbatim", () => {
  const f = buildDomainFindingsTyped({ ...STRONG, dpia_status: "Unsure" });
  assertEquals(f["dpia_status"].gap_description, "The company's answers do not resolve this issue.");
});

Deno.test("G-5 — a Low-severity general-coverage training finding names its own gap", () => {
  const f = buildDomainFindingsTyped({ ...STRONG, training_ai_coverage: "Generally covers data handling" });
  assertEquals(f["training"].severity, "Low");
  assertStringIncludes(String(f["training"].gap_description), "not separately addressed");
});

Deno.test("G-6 — citation ordering and lowercase continuation nits", () => {
  const withSpecial = buildDomainFindingsTyped({ ...STRONG, special_category: "Yes", technical_controls: "Partial — some tools or categories" });
  assertEquals(withSpecial["data_submission"].regulatory_basis, "GDPR Arts. 9, 25(1), 32(1)");
  const noJuris = buildDomainFindingsTyped({ ...STRONG, jurisdictions: [] });
  assertEquals(noJuris["regulatory_exposure"].regulatory_basis, "the recorded jurisdictions' own frameworks");
});

Deno.test("S-3 — the Art. 30 elements sentence is in attributed voice, and the optional banned-list addition was deliberately skipped", async () => {
  const report = {
    domain_findings: buildDomainFindingsTyped(STRONG),
    readiness_determination: {},
    art30_element_findings: [
      { element: "a", verdict: "satisfied" },
      { element: "d", verdict: "not_satisfied" },
    ],
  };
  const sk = assembleGovernanceSkeletonDocument(report, STRONG);
  const text = JSON.stringify(sk.document);
  assertStringIncludes(text, "the company's answers do not support (d)");
  assert(!text.includes("the record does not support"));
  // Deliberately NOT added to the banned-register guard per the CEO's
  // "do not do the optional addition" instruction.
  const { GOVERNANCE_V3_BANNED_REGISTER } = await import(
    "../../../supabase/functions/run-governance-assessment/_local/prose/plans/governance.spine.ts"
  );
  assert(!GOVERNANCE_V3_BANNED_REGISTER.includes("the record does not support"));
});

Deno.test("S-1 — the operational-control lead is grammatical and uses the file's own \"evidenced\" idiom, not \"stands\"", () => {
  const satisfied = assembleGovernanceSkeletonDocument(
    { domain_findings: buildDomainFindingsTyped(STRONG), readiness_determination: {}, risk_calibration_finding: { verdict: "satisfied" } },
    STRONG,
  );
  const partial = assembleGovernanceSkeletonDocument(
    { domain_findings: buildDomainFindingsTyped(STRONG), readiness_determination: {}, risk_calibration_finding: { verdict: "partially_satisfied" } },
    STRONG,
  );
  const notSatisfied = assembleGovernanceSkeletonDocument(
    { domain_findings: buildDomainFindingsTyped(STRONG), readiness_determination: {}, risk_calibration_finding: { verdict: "not_satisfied" } },
    STRONG,
  );
  const t1 = JSON.stringify(satisfied.document);
  const t2 = JSON.stringify(partial.document);
  const t3 = JSON.stringify(notSatisfied.document);
  assertStringIncludes(t1, "The operational-control posture the company has described is evidenced on the company's answers.");
  assertStringIncludes(t2, "The operational-control posture the company has described is only partly evidenced on the company's answers.");
  assertStringIncludes(t3, "The operational-control posture the company has described is not evidenced on the company's answers.");
  for (const t of [t1, t2, t3]) {
    assert(!t.includes("stands"), t);
    assert(!t.includes("The operational controls the company has described —"), "no unpaired em-dash / plural subject");
  }
});

Deno.test("S-1 — the accountability-structure fallback also uses \"evidenced\", not \"stands\"", () => {
  const sk = assembleGovernanceSkeletonDocument(
    { domain_findings: buildDomainFindingsTyped(STRONG), readiness_determination: {}, accountability_determination: { verdict: "unknown_value" } },
    STRONG,
  );
  const text = JSON.stringify(sk.document);
  assertStringIncludes(text, "Whether the accountability structure is evidenced on the company's answers cannot be determined.");
  assert(!text.includes("structure stands"));
});

// RE-PIN BATCH 20a (doc 113 S5.1): the item fragments are Remediation
// Register cells now; a single item makes every meta column constant, so
// the four meta values ride the table note.
Deno.test("S-4 — the remediation meta values render in the register (note when constant)", () => {
  const report = {
    domain_findings: buildDomainFindingsTyped(STRONG),
    readiness_determination: {},
    remediation_plan: [
      { domain: "tool_inventory", priority: "High", accountable_owner: "IT owner", target_date: "2026-12-01", validation_method: "Audit" },
    ],
  };
  const sk = assembleGovernanceSkeletonDocument(report, STRONG);
  const text = JSON.stringify(sk.document);
  assertStringIncludes(text, "Remediation register");
  assertStringIncludes(text, "Accountable owner: IT owner");
  assertStringIncludes(text, "the intake's remediation defaults, applied to each item");
});
