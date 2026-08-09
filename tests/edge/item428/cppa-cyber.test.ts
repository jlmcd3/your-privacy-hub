// ITEM 428 PIECE A — cppa-cyber structural-conformance battery.
//
// DEVIATION NOTE: cppa-cyber's narrative sections are LLM-authored at
// generation time and are not reproducible offline. Following the
// live-parity hand-built prose precedent in
// tests/edge/item405/cyber-perfect-and-gate.test.ts (output-neutrality doc),
// this battery hand-assembles a document carrying every plan section.
// `disclaimer` is RENDERER_SUPPLIED and intentionally omitted.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { checkStructureConformance } from "../../../supabase/functions/_shared/prose/structure-conformance.ts";

function perfectDoc(): Record<string, unknown> {
  return {
    readiness_determination: "Audit-ready",
    executive_summary: "The programme is audit-ready under 11 CCR §§ 7121-7124 on the record the business supplied.",
    programme_record: { summary: "Meridian SaaS Inc. runs an 18-component cybersecurity programme scoped to SOC 2, with distinct owners and cadences per control." },
    controls: [
      { key: "c1_auth", status: "Implemented", finding: "Phishing-resistant authentication is enforced org-wide." },
      { key: "c2_encryption", status: "Implemented", finding: "AES-256-GCM at rest via AWS KMS with annual key rotation." },
    ],
    control_status_counts: { implemented: 16, partial: 2, not_implemented: 0 },
    audit_schedule: "Under 11 CCR § 7121(a), the first cybersecurity audit report is due no later than the cohort deadline the business's revenue tier fixes.",
    top_risks: [{ risk: "Two Tier-2 vendors overdue for annual review.", remediation: "Complete the overdue reviews by 2026-09-30." }],
    next_steps: [{ action: "Confirm the auditor's engagement letter is countersigned." }],
  };
}

Deno.test("item428 cppa-cyber: perfect fixture is fully conformant", () => {
  const doc = perfectDoc();
  const res = checkStructureConformance("cppa-cyber", doc);
  assertEquals(res.missing_required, []);
  assertEquals(res.padded_empty, []);
  assert(res.ok, JSON.stringify(res));
  assertEquals(res.checked, 9);
});

Deno.test("item428 cppa-cyber: a padded-hollow section fails conformance", () => {
  const doc = perfectDoc();
  doc.top_risks = ["Not recorded."];
  const res = checkStructureConformance("cppa-cyber", doc);
  assertEquals(res.ok, false);
  assert(res.padded_empty.includes("gaps_and_remediation"), JSON.stringify(res.padded_empty));
});
