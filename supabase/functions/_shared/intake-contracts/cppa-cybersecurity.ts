// RC-REM-P1 — CPPA Cybersecurity intake contract (pilot).
//
// Intake shape (verified against src/pages/CPPACybersecurity.tsx):
//   {
//     profile: { entity_name, industry, incidents_12mo, framework, last_audit,
//                in_scope_frameworks, audit_scope_rationale,
//                auditor_engagement_status, prior_audit_scope,
//                remediation_owner,
//                q1_revenue, q2_consumers, q5_sell_share,
//                q5c_share_revenue_50pct, q15_sensitive_pi, q15c_spi_volume,
//                password_auth_used },
//     controls: [ { key, label, maturity, notes, evidence } × 18 ]
//   }
//
// INTAKE-4b (2026-08-09): `profile.remediation_owner` added (optional);
// rendered in the profile section of src/pages/CPPACybersecurity.tsx
// immediately after `prior_audit_scope`. `profile.in_scope_frameworks` is
// PREFILLED from `profile.framework` and presented as a confirmation —
// prefill only, never merged; key, options and stored values unchanged.
//
// C1.2 (2026-08-25) — the § 7120(a)-(b) audit-applicability predicate
// inputs. Prior to this change the contract asked NO revenue or
// data-volume question at all (see the now-superseded "AUDIT-SCHEDULE
// TRUTH" note in _shared/golden/cppa-cyber.ts), so § 7120's A1/A2
// applicability test could never be computed — only stated as law. These
// six fields are the SAME fields, verbatim, that
// _shared/intake-contracts/cppa-risk-assessment.ts already asks
// (q1_revenue/q2_consumers/q5_sell_share/q5c_share_revenue_50pct/
// q15_sensitive_pi/q15c_spi_volume) — no new customer-facing text is
// authored; Risk's q5c and q15c labels already cite § 7120(b)(1) and
// § 7120(b)(2)(B) by name, confirming these are the intended predicate
// inputs. Classified `required: "optional", askEligible: true` — matching
// this contract's OWN convention for every other non-core-five field
// (auditor_engagement_status, prior_audit_scope, controls[].maturity),
// not Risk's stricter "always" classification for the identical fields;
// an unanswered field routes the applicability table to an explicit
// "insufficient information" cell rather than blocking checkout or
// failing a contract check against pre-existing fixtures that predate
// this landing. Deliberately NOT extended to the § 7121(a)
// deadline-tier / § 7121(b) cadence content: the CEO-ratified skeleton's
// OWN fixed prose (cppa-cyber.spine.ts, "audit_scope" section, the
// byte-pinned corpus block) states "No slot, no generation, no cohort
// computed" as the ITEM-204 design law for that specific surface —
// computing a tier there would contradict shipped, ratified prose and
// needs its own CEO ruling, not a Sonnet engineering call.
// CEO RULING (2026-08-25): ITEM-204 stands as-is. The § 7121(a)/(b)
// deadline-tier/cadence table is NOT to be built; the surface keeps
// stating the law neutrally, never computing a customer's cohort. This
// is now a SETTLED decision, not an open question awaiting a ruling —
// do not revisit without an explicit new CEO instruction.
//
// FC-L4 (2026-08-25, CEO-ordered) — `profile.password_auth_used`. The
// CAM row `cppa-cyber/c1/fcl-L4` pins an FSOR clarification that
// password/passphrase-specific requirements under § 7123(b)(2)(A)(ii)
// apply ONLY where the business actually uses passwords/passphrases as
// part of its authentication method — a conditional rule the
// deterministic path cannot apply without a yes/no predicate (the model
// path today infers it by reading `controls[].notes` free text, which
// the deterministic path must not do — see this repo's standing
// no-inference discipline). Simplest possible field: one Yes/No enum,
// optional (matching every other non-core-five field in this contract).
// Adding the field does NOT flip FC-L4's own `logic_disposition` to
// `implemented` — no composer consumes it yet; that disposition still
// names the CODE that would apply the rule, not just the field's
// existence. See the CAM row's own updated curation_note.
//
// IMPORT-VS-LITERAL DECISION: Supabase edge-function bundling only ships
// files under supabase/functions/, so this contract cannot import from
// src/pages/CPPACybersecurity.enums.ts at deploy time. The MATURITY option
// list is therefore copied verbatim below and parity with the form module
// is enforced mechanically in _tests/intake-contracts.test.ts (which runs
// under Deno with full workspace read access).
//
// Post-Prompt-7 state: controls[].maturity is optional (partial submission
// is permitted; missing maturity is handled by the insufficient-info
// guard). All five profile fields are always-required (form gates submit
// on `allComplete` — every profile leaf non-empty).

import type { IntakeContract } from "./types.ts";

// LITERAL COPY of src/pages/CPPACybersecurity.enums.ts MATURITY (5 items,
// verbatim). Parity is asserted in _tests/intake-contracts.test.ts.
export const CYBER_MATURITY_OPTIONS = [
  "Not implemented",
  "Ad hoc / informal",
  "Documented, partially implemented",
  "Implemented across organization",
  "Implemented with continuous monitoring",
] as const;

// LITERAL COPY of the inline <option> lists in CPPACybersecurity.tsx.
export const INCIDENTS_12MO_OPTIONS = [
  "None",
  "1",
  "2–5",
  "More than 5",
] as const;

export const FRAMEWORK_OPTIONS = [
  "NIST CSF",
  "ISO 27001",
  "SOC 2",
  "HITRUST",
  "PCI DSS",
  "None / informal",
  "Other",
] as const;

export const LAST_AUDIT_OPTIONS = [
  "Within 12 months",
  "12–24 months ago",
  "Over 24 months ago",
  "Never",
] as const;

// QB-P5 Item 1 — canonical 18 control slugs verified against
// src/pages/CPPACybersecurity.tsx (form emits these keys position-for-
// position). Contract now pins controls[].key to this enum so fixture
// intakes cannot invent alternative slugs (e.g. asset_inventory, mfa).
export const CYBER_CONTROL_SLUGS = [
  "c1_auth",
  "c2_encryption",
  "c3_account_access",
  "c4_inventory",
  "c5_secure_config",
  "c6_vuln_mgmt",
  "c7_audit_logs",
  "c8_network_mon",
  "c9_anti_malware",
  "c10_segmentation",
  "c11_port_protocol",
  "c12_awareness",
  "c13_training",
  "c14_secure_dev",
  "c15_third_party",
  "c16_retention",
  "c17_incident",
  "c18_continuity",
] as const;

// TURN 3 — per-component evidence-availability checklist (ISO 19011 evidence
// typing surface). LITERAL COPY of CPPACybersecurity.enums.ts
// CYBER_EVIDENCE_OPTS. Parity is asserted in cppaCyberTurn3Parity.test.ts.
export const CYBER_EVIDENCE_OPTS = [
  "Policy / procedure document",
  "Runbook / SOP",
  "Screenshot / config export",
  "Sample log / report",
  "SOC 2 or auditor letter",
  "Third-party pen test / scan report",
  "Training completion record",
  "None on file",
] as const;

// TURN 3 — in_scope_frameworks: multi-enum drawn from FRAMEWORK_OPTIONS so
// callers cannot invent alternative framework names.
export const CYBER_IN_SCOPE_FRAMEWORKS = FRAMEWORK_OPTIONS;

// ITEM 315 — § 7122 auditor-engagement status. LITERAL COPY of
// src/pages/CPPACybersecurity.enums.ts CYBER_AUDITOR_ENGAGEMENT. Parity with
// the form module and with the deliverables builder is asserted in
// src/registry/__tests__/cppa-cyber-deliverables.test.ts.
export const CYBER_AUDITOR_ENGAGEMENT_OPTIONS = [
  "No auditor engaged yet",
  "Internal auditor identified, reporting line not yet settled",
  "Internal auditor engaged, reports to an executive without cybersecurity-program responsibility",
  "Internal auditor engaged, reports to the executive responsible for the cybersecurity program",
  "External auditor engaged",
  "External auditor engaged, independence confirmed in writing",
] as const;

// C1.2 — LITERAL COPY of src/pages/CPPACybersecurity.enums.ts
// CYBER_REVENUE_OPTS/CYBER_CONSUMER_OPTS/CYBER_SELL_SHARE_OPTS/
// CYBER_SHARE_REVENUE_50PCT_OPTS/CYBER_SENSITIVE_PI_OPTS/
// CYBER_SPI_VOLUME_OPTS, which are themselves verbatim reuses of Risk's
// already-ratified REVENUE_OPTS/CONSUMER_OPTS/Q5_SELL_SHARE_OPTS/
// SHARE_REVENUE_50PCT_OPTS/Q15_SENSITIVE_PI_OPTS/SPI_VOLUME_OPTS.
export const CYBER_APPLICABILITY_REVENUE_OPTIONS = [
  "Under $25M", "$25M to under $50M", "$50M to $100M", "Over $100M",
] as const;
export const CYBER_APPLICABILITY_CONSUMER_OPTIONS = [
  "Under 100,000", "100,000 to under 250,000", "250,000 to under 1,000,000", "1,000,000 or more",
] as const;
export const CYBER_APPLICABILITY_SELL_SHARE_OPTIONS = [
  "Yes — sell only", "Yes — share for advertising only", "Both", "No",
] as const;
export const CYBER_APPLICABILITY_SHARE_REVENUE_50PCT_OPTIONS = ["Yes", "No", "Unsure"] as const;
export const CYBER_APPLICABILITY_SENSITIVE_PI_OPTIONS = ["Yes", "No", "Unsure"] as const;
export const CYBER_APPLICABILITY_SPI_VOLUME_OPTIONS = ["Fewer than 50,000", "50,000 or more", "Unsure"] as const;

// FC-L4 — LITERAL COPY of src/pages/CPPACybersecurity.enums.ts
// CYBER_PASSWORD_AUTH_OPTIONS.
export const CYBER_PASSWORD_AUTH_OPTIONS = ["Yes", "No"] as const;



export const cppaCybersecurityContract: IntakeContract = {
  tool_type: "cppa_cybersecurity",
  table: "cppa_cybersecurity_runs",
  fields: [
    // profile.*
    { key: "profile.entity_name",    kind: "text", required: "always" },
    { key: "profile.industry",       kind: "text", required: "always" },
    { key: "profile.incidents_12mo", kind: "enum", required: "always",
      options: INCIDENTS_12MO_OPTIONS },
    { key: "profile.framework",      kind: "enum", required: "always",
      options: FRAMEWORK_OPTIONS },
    { key: "profile.last_audit",     kind: "enum", required: "always",
      options: LAST_AUDIT_OPTIONS },
    // TURN 3 — scope framing fields (optional; feed C-C scope justification).
    { key: "profile.in_scope_frameworks", kind: "multi-enum", required: "optional",
      options: CYBER_IN_SCOPE_FRAMEWORKS, askEligible: true },
    { key: "profile.audit_scope_rationale", kind: "narrative", required: "optional",
      askEligible: true },
    // ITEM 315 — § 7122 independence inputs (optional; feed the
    // independence determination and the § 7122(g) retention finding).
    { key: "profile.auditor_engagement_status", kind: "enum", required: "optional",
      options: CYBER_AUDITOR_ENGAGEMENT_OPTIONS, askEligible: true },
    { key: "profile.prior_audit_scope", kind: "narrative", required: "optional",
      askEligible: true },
    // INTAKE-4b — CEO-approved addition 2026-08-09. "Who owns remediation of
    // findings from this audit?" Rendered at
    // src/pages/CPPACybersecurity.tsx (profile section, after
    // prior_audit_scope). Optional at the data layer so pre-change drafts and
    // stored rows validate unchanged.
    { key: "profile.remediation_owner", kind: "text", required: "optional",
      askEligible: true },
    // C1.2 — § 7120(a)-(b) audit-applicability predicate inputs. See the
    // header comment for the full rationale (verbatim reuse of Risk's own
    // q1/q2/q5/q5c/q15/q15c fields, deliberately NOT extended to the
    // § 7121 deadline surface).
    // Classified `required: "optional"` (revised during this landing from an
    // initial "always" — reverted after `contract-surface-audit.test.ts`
    // and `intake-contracts.test.ts` showed multiple existing sample-report
    // and contract-scenario fixtures across the fleet predate these fields
    // and don't carry them; "always" would make every one of those a
    // contract violation). This matches Cyber's OWN established convention
    // for every other non-core-five field (`auditor_engagement_status`,
    // `prior_audit_scope`, `controls[].maturity` are all `required:
    // "optional", askEligible: true`) rather than Risk's stricter
    // classification for the identical fields — the runtime predicate
    // (cyber-applicability.ts) already treats an empty answer as
    // indeterminate regardless of this classification, so nothing about
    // the applicability table's correctness depends on it.
    { key: "profile.q1_revenue", kind: "enum", required: "optional",
      options: CYBER_APPLICABILITY_REVENUE_OPTIONS, askEligible: true },
    { key: "profile.q2_consumers", kind: "enum", required: "optional",
      options: CYBER_APPLICABILITY_CONSUMER_OPTIONS, askEligible: true },
    { key: "profile.q5_sell_share", kind: "enum", required: "optional",
      options: CYBER_APPLICABILITY_SELL_SHARE_OPTIONS, askEligible: true },
    // Conditional, mirroring Risk's own gate: only asked once q5_sell_share
    // indicates any selling/sharing at all.
    { key: "profile.q5c_share_revenue_50pct", kind: "enum", required: "conditional",
      requiredWhen: 'q5_sell_share !== "No"', hiddenValue: "",
      trigger: { key: "profile.q5_sell_share", equals: ["Yes — sell only", "Yes — share for advertising only", "Both"] },
      options: CYBER_APPLICABILITY_SHARE_REVENUE_50PCT_OPTIONS },
    { key: "profile.q15_sensitive_pi", kind: "enum", required: "optional",
      options: CYBER_APPLICABILITY_SENSITIVE_PI_OPTIONS, askEligible: true },
    { key: "profile.q15c_spi_volume", kind: "enum", required: "conditional",
      requiredWhen: 'q15_sensitive_pi === "Yes"', hiddenValue: "",
      trigger: { key: "profile.q15_sensitive_pi", equals: ["Yes"] },
      options: CYBER_APPLICABILITY_SPI_VOLUME_OPTIONS },
    // FC-L4 — does the business use passwords/passphrases as part of its
    // authentication method at all? See the header comment.
    { key: "profile.password_auth_used", kind: "enum", required: "optional",
      options: CYBER_PASSWORD_AUTH_OPTIONS, askEligible: true },
    // controls[]
    { key: "controls[].key",     kind: "enum",      required: "always",
      options: CYBER_CONTROL_SLUGS },
    { key: "controls[].label",   kind: "text",      required: "always" },
    { key: "controls[].maturity", kind: "enum",     required: "optional",
      options: CYBER_MATURITY_OPTIONS, askEligible: true },
    { key: "controls[].notes",   kind: "narrative", required: "optional" },
    // TURN 3 — per-component evidence-availability checklist.
    { key: "controls[].evidence", kind: "multi-enum", required: "optional",
      options: CYBER_EVIDENCE_OPTS, askEligible: true },
  ],
};
