// RK3-A3 GROUP 2 — §2d Org-profile contract (doc 31 §2d — NEW-O fields)
// Pins the organization-level contract end to end:
//   contract  — cppa_risk_org_profile carries 7 fields:
//               3 submission-contact + 4 certifier-eligibility booleans.
//   labels    — FIELD_LABELS covers all 7 org-profile keys.
//
// These fields are NOT in the assessment intake form; they belong to the
// organization profile (sourced at the business level, not per assessment).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { cppaRiskOrgProfileContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment-org-profile.ts";
import { FIELD_LABELS } from "../../../supabase/functions/_shared/customer-messages.ts";

const field = (key: string) => cppaRiskOrgProfileContract.fields.find((f) => f.key === key);

// ── CONTRACT ─────────────────────────────────────────────────────────────────

Deno.test("RK3-A3 g2 — org-profile contract id and version are stable", () => {
  assertEquals(cppaRiskOrgProfileContract.id, "cppa_risk_org_profile");
  assertEquals(cppaRiskOrgProfileContract.version, "2.0.0");
});

Deno.test("RK3-A3 g2 — submission contact fields are in the org-profile contract", () => {
  for (const key of [
    "cppa_submission_contact_name",
    "cppa_submission_contact_phone",
    "cppa_submission_contact_email",
  ]) {
    const f = field(key);
    assert(f, `${key} missing from cppaRiskOrgProfileContract`);
    assertEquals(f!.kind, "text", `${key} must be kind=text`);
  }
  // contact name and email are always required; phone is optional
  assertEquals(field("cppa_submission_contact_name")!.required, "always");
  assertEquals(field("cppa_submission_contact_email")!.required, "always");
  assertEquals(field("cppa_submission_contact_phone")!.required, "optional");
});

Deno.test("RK3-A3 g2 — certifier eligibility fields are always-required Yes/No enums", () => {
  const certifierKeys = [
    "certifier_is_executive_management",
    "certifier_directly_responsible_for_ra_compliance",
    "certifier_has_sufficient_knowledge",
    "certifier_authorized_to_submit",
  ];
  for (const key of certifierKeys) {
    const f = field(key);
    assert(f, `${key} missing from cppaRiskOrgProfileContract`);
    assertEquals(f!.required, "always", `${key} must be always required`);
    assertEquals(f!.kind, "enum", `${key} must be kind=enum`);
    assertEquals([...(f!.options as readonly string[])], ["Yes", "No"], `${key} must have Yes/No options`);
  }
});

Deno.test("RK3-A3 g2 — org-profile contract has exactly 7 fields", () => {
  assertEquals(cppaRiskOrgProfileContract.fields.length, 7);
});

// ── FIELD_LABELS ──────────────────────────────────────────────────────────────

Deno.test("RK3-A3 g2 — FIELD_LABELS covers all 7 org-profile keys", () => {
  const orgProfileKeys = [
    "cppa_submission_contact_name",
    "cppa_submission_contact_phone",
    "cppa_submission_contact_email",
    "certifier_is_executive_management",
    "certifier_directly_responsible_for_ra_compliance",
    "certifier_has_sufficient_knowledge",
    "certifier_authorized_to_submit",
  ];
  for (const key of orgProfileKeys) {
    assert(key in FIELD_LABELS, `FIELD_LABELS missing entry for ${key}`);
    assert(
      typeof FIELD_LABELS[key] === "string" && FIELD_LABELS[key].length > 0,
      `FIELD_LABELS[${key}] must be a non-empty string`,
    );
  }
});
