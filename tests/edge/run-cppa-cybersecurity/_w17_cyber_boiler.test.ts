// W17-CYBER-BOILERPLATE-GUARD colocated tests. Covers: exact-dup rewrite,
// near-dup rewrite (>0.9 Jaccard), intake-referencing preservation,
// first-occurrence kept, citations untouched, fail-open on malformed,
// telemetry placement, and customer-surface leak guard.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyCyberBoilerplateGuard, CYBER_BOILER_VERSION } from "../../../supabase/functions/run-cppa-cybersecurity/_w17_cyber_boiler.ts";
import { BUILD_STAMP } from "../../../supabase/functions/run-cppa-cybersecurity/index.ts";

const GENERIC_A =
  "Implement documented policies and procedures for this control aligned with the intake-elected framework; retain the supporting documentation per the § 7122(g) five-year audit-record retention rule and confirm coverage against § 7123(c). Assign an accountable owner and establish review cadence sufficient to evidence continuous operation over the audit period; escalate exceptions through the incident-management workflow.";
const GENERIC_A_NEAR =
  "Implement documented policies and procedures for this control aligned with the intake-elected framework; retain supporting documentation per the § 7122(g) five-year audit-record retention rule, confirm coverage against § 7123(c), assign an accountable owner, and establish a review cadence sufficient to evidence continuous operation over the audit period; escalate exceptions through the incident-management workflow.";
const INTAKE_REF =
  "Extend HITRUST-aligned MFA to the 168 administrative accounts identified in the authentication intake; retain the supporting documentation per the § 7122(g) five-year audit-record retention rule and evidence continuous operation across the audit period. Owner: security lead.";

function makeControls() {
  return [
    { component: "Authentication", remediation: GENERIC_A, citation: "11 CCR § 7123(c)(1)", verbatim_quote: "…" },
    { component: "Encryption of personal information", remediation: GENERIC_A, citation: "11 CCR § 7123(c)(2)", verbatim_quote: "…" },
    { component: "Account management and access controls", remediation: GENERIC_A_NEAR, citation: "11 CCR § 7123(c)(3)", verbatim_quote: "…" },
    { component: "Inventory and management of personal information and systems", remediation: INTAKE_REF, citation: "11 CCR § 7123(c)(4)", verbatim_quote: "…" },
  ];
}

Deno.test("W17-CYBER-BOILER: exact duplicate is rewritten (second occurrence)", () => {
  const report: any = { controls: makeControls() };
  const res = applyCyberBoilerplateGuard(report);
  assert(res.boiler_duplicates_rewritten >= 1);
  // First control preserved verbatim
  assertEquals(report.controls[0].remediation, GENERIC_A);
  // Second control (exact dup) rewritten — label is the duplicate's own name.
  assert(report.controls[1].remediation.startsWith("Remediation guidance for Encryption of personal information"));
  assertEquals(report.controls[1].information_needed, true);
});

Deno.test("W17-CYBER-BOILER: near-duplicate (>0.9 Jaccard) is rewritten", () => {
  const report: any = { controls: makeControls() };
  applyCyberBoilerplateGuard(report);
  const c3 = report.controls[2];
  assert(c3.remediation.startsWith("Remediation guidance for Account management and access controls"));
  assertEquals(c3.information_needed, true);
});

Deno.test("W17-CYBER-BOILER: intake-anchored remediation is preserved verbatim", () => {
  const report: any = { controls: makeControls() };
  applyCyberBoilerplateGuard(report);
  assertEquals(report.controls[3].remediation, INTAKE_REF);
  assert(report.controls[3].information_needed !== true);
});

Deno.test("W17-CYBER-BOILER: first occurrence is always kept", () => {
  const report: any = { controls: makeControls() };
  applyCyberBoilerplateGuard(report);
  assertEquals(report.controls[0].remediation, GENERIC_A);
});

Deno.test("W17-CYBER-BOILER: citations and verbatim_quote untouched", () => {
  const report: any = { controls: makeControls() };
  applyCyberBoilerplateGuard(report);
  for (let i = 0; i < report.controls.length; i++) {
    assertEquals(report.controls[i].citation, `11 CCR § 7123(c)(${i + 1})`);
    assertEquals(report.controls[i].verbatim_quote, "…");
  }
});

Deno.test("W17-CYBER-BOILER: fail-open on malformed report (no throw)", () => {
  const r1 = applyCyberBoilerplateGuard(null);
  assertEquals(r1.boiler_scanned, 0);
  const r2 = applyCyberBoilerplateGuard({ controls: "not-an-array" } as any);
  assertEquals(r2.boiler_scanned, 0);
  const r3 = applyCyberBoilerplateGuard({ controls: [{}, { remediation: 42 }] } as any);
  assertEquals(r3.boiler_scanned, 0);
});

Deno.test("W17-CYBER-BOILER: telemetry lands under _meta.internal.cyber_boiler only", () => {
  const report: any = { controls: makeControls() };
  applyCyberBoilerplateGuard(report);
  const meta = report._meta;
  assert(meta?.internal?.cyber_boiler);
  assertEquals(meta.internal.cyber_boiler.version, CYBER_BOILER_VERSION);
  assert(meta.internal.cyber_boiler.boiler_duplicates_rewritten >= 1);
  // Customer-surface leak guard: no top-level _w* or underscore-prefixed keys.
  const topLeaks = Object.keys(report).filter((k) => k !== "_meta" && k.startsWith("_"));
  assertEquals(topLeaks, []);
  const wLeaks = Object.keys(report).filter((k) => /^_w\d+_/.test(k));
  assertEquals(wLeaks, []);
});

Deno.test("W17-CYBER-BOILER: BUILD_STAMP restamped to w17-cyber-boiler", () => {
  assert(
    /^(w17-cyber-boiler|w16-cyber-flfix|w21-cyber-turnc)@\d{4}-\d{2}-\d{2}T/.test(BUILD_STAMP),
    `unexpected BUILD_STAMP: ${BUILD_STAMP}`,
  );
});

Deno.test("W17-CYBER-BOILER: short remediation (<120 chars) is not scanned", () => {
  const report: any = {
    controls: [
      { component: "A", remediation: "short one." },
      { component: "B", remediation: "short one." },
    ],
  };
  const res = applyCyberBoilerplateGuard(report);
  assertEquals(res.boiler_scanned, 0);
  assertEquals(res.boiler_duplicates_rewritten, 0);
});
