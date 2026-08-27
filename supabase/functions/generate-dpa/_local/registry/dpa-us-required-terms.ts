// supabase/functions/generate-dpa/_local/registry/dpa-us-required-terms.ts
//
// S-D3 (doc 80, 2026-08-27) — the CCPA required-contract-terms checklist:
// Cal. Civ. Code § 1798.100(d)(1)-(5) (the statute's five mandatory
// agreement terms) and 11 CCR § 7051(a)(1)-(10) (the regulation's contract
// requirements for service providers and contractors). This typed list is
// the deterministic completeness standard the S-D1 clause library will be
// CI-checked against (every item -> a fixed clause); until S-D1 lands, the
// battery checks each item marked prompt-enforced against the live us-state
// prompt so prompt drift is caught.
//
// VERIFICATION (2026-08-27): § 1798.100(d)(1)-(5) verified against
// leginfo.legislature.ca.gov; § 7051(a) verified against the Cornell LII
// mirror of the California Code of Regulations. The anchors-registry
// precedent (S-D4) applies: registry-carried verified text with a
// verification date, re-verify before editing any row.
//
// CORPUS STATUS (verified live 2026-08-27, recorded in doc 79 §7):
//   - 11 CCR § 7051 is NOT in provision_texts (§ 7050 is) — the fleet's
//     one HIGH-priority chase item; ingest via the T2 approval process.
//   - provision_texts `ccpa-1798-100` exists but is a 149-char
//     RC-B.1 TEST EXCERPT ("not authoritative") — it must NOT be cited as
//     corpus backing; real ingestion rides the same chase item.

export interface DpaUsRequiredTerm {
  readonly id: string;
  readonly source: "Cal. Civ. Code § 1798.100(d)" | "11 CCR § 7051(a)";
  readonly pinpoint: string;
  /** The requirement, faithful to the verified text. */
  readonly requirement: string;
  /**
   * Regex the CURRENT us-state prompt must match when the term is already
   * prompt-enforced; null = enforced only at the S-D1 assembler (the CI
   * test asserts the disposition honestly either way).
   */
  readonly prompt_evidence: string | null;
}

export const DPA_US_REQUIRED_TERMS_VERIFIED = "2026-08-27";

export const DPA_US_REQUIRED_TERMS: readonly DpaUsRequiredTerm[] = [
  // ── Cal. Civ. Code § 1798.100(d) — the statutory five ────────────────
  { id: "100d1_limited_purposes", source: "Cal. Civ. Code § 1798.100(d)", pinpoint: "§ 1798.100(d)(1)",
    requirement: "The agreement specifies that the personal information is sold or disclosed only for limited and specified purposes.",
    prompt_evidence: "limited and specified purposes|business purpose" },
  { id: "100d2_same_protection", source: "Cal. Civ. Code § 1798.100(d)", pinpoint: "§ 1798.100(d)(2)",
    requirement: "The recipient is obligated to comply with the title and to provide the same level of privacy protection it requires.",
    prompt_evidence: "same level of privacy protection" },
  { id: "100d3_oversight_rights", source: "Cal. Civ. Code § 1798.100(d)", pinpoint: "§ 1798.100(d)(3)",
    requirement: "The business is granted rights to take reasonable and appropriate steps to help ensure consistent use of the personal information.",
    prompt_evidence: "reasonable and appropriate steps" },
  { id: "100d4_notify_cannot_comply", source: "Cal. Civ. Code § 1798.100(d)", pinpoint: "§ 1798.100(d)(4)",
    requirement: "The recipient must notify the business if it determines it can no longer meet its obligations under the title.",
    prompt_evidence: "no longer meet its obligations" },
  { id: "100d5_stop_remediate", source: "Cal. Civ. Code § 1798.100(d)", pinpoint: "§ 1798.100(d)(5)",
    requirement: "The business is granted the right, upon notice, to take reasonable and appropriate steps to stop and remediate unauthorized use.",
    prompt_evidence: "stop and remediate" },

  // ── 11 CCR § 7051(a) — the regulation's ten ──────────────────────────
  { id: "7051a1_no_sell_share", source: "11 CCR § 7051(a)", pinpoint: "§ 7051(a)(1)",
    requirement: "Prohibits the service provider or contractor from selling or sharing the personal information.",
    prompt_evidence: "shall not sell.*shall not share|prohibited from selling or sharing" },
  { id: "7051a2_specific_purposes", source: "11 CCR § 7051(a)", pinpoint: "§ 7051(a)(2)",
    requirement: "Identifies the specific business purpose(s) for the processing; generic descriptions do not suffice.",
    prompt_evidence: "specific business purposes|not \"as necessary to perform the services\"|business purpose" },
  { id: "7051a3_no_other_purpose", source: "11 CCR § 7051(a)", pinpoint: "§ 7051(a)(3)",
    requirement: "Prohibits retaining, using, or disclosing the personal information for any purpose other than the specified business purpose(s).",
    prompt_evidence: "Retention Beyond Purpose|other than the business purpose" },
  { id: "7051a4_no_commercial_purpose", source: "11 CCR § 7051(a)", pinpoint: "§ 7051(a)(4)",
    requirement: "Prohibits use for any commercial purpose other than the specified business purpose(s), except as permitted by the regulations.",
    prompt_evidence: "commercial purpose other than" },
  { id: "7051a5_direct_relationship", source: "11 CCR § 7051(a)", pinpoint: "§ 7051(a)(5)",
    requirement: "Prohibits use outside the direct business relationship, including combining the personal information with data from other sources except as permitted.",
    prompt_evidence: "Cross-Context Combination|outside the direct business relationship" },
  { id: "7051a6_compliance_security", source: "11 CCR § 7051(a)", pinpoint: "§ 7051(a)(6)",
    requirement: "Requires CCPA compliance, the same level of privacy protection, and reasonable security procedures and practices.",
    prompt_evidence: "same level of privacy protection" },
  { id: "7051a7_audit_rights", source: "11 CCR § 7051(a)", pinpoint: "§ 7051(a)(7)",
    requirement: "Grants the business the right to take reasonable and appropriate steps to ensure consistent use, such as ongoing manual reviews and automated scans, and regular internal or third-party audits at least once every 12 months.",
    prompt_evidence: "at least once every 12 months" },
  { id: "7051a8_notify_cannot_comply", source: "11 CCR § 7051(a)", pinpoint: "§ 7051(a)(8)",
    requirement: "Requires notification to the business when the service provider or contractor can no longer meet its obligations.",
    prompt_evidence: "no longer meet its obligations" },
  { id: "7051a9_stop_remediate_delete", source: "11 CCR § 7051(a)", pinpoint: "§ 7051(a)(9)",
    requirement: "Grants the business the right to stop and remediate unauthorized use, and requires documentation verifying deletion where applicable.",
    prompt_evidence: "stop and remediate" },
  { id: "7051a10_consumer_requests", source: "11 CCR § 7051(a)", pinpoint: "§ 7051(a)(10)",
    requirement: "Requires the service provider or contractor to enable the business to comply with consumer requests, or to provide the information necessary for compliance.",
    prompt_evidence: "Consumer Rights Assistance|consumer rights request" },
] as const;

/** Items already enforced by the live us-state prompt (regex-evidenced). */
export function promptEnforcedTerms(): readonly DpaUsRequiredTerm[] {
  return DPA_US_REQUIRED_TERMS.filter((t) => t.prompt_evidence !== null);
}

/** Items whose enforcement waits on the S-D1 deterministic assembler. */
export function assemblerOnlyTerms(): readonly DpaUsRequiredTerm[] {
  return DPA_US_REQUIRED_TERMS.filter((t) => t.prompt_evidence === null);
}

/**
 * The checklist rendered as a prompt requirement block for the LIVE
 * us-state / dual modes: the model is bound to every verified term NOW,
 * from the same single-source list the S-D1 assembler will be CI-checked
 * against. Pre-S-D3 the prompt cited § 1798.100(d)(1)-(5) by number and
 * enumerated only some terms' substance; the checklist closes that gap.
 */
export function renderUsRequiredTermsBlock(): string {
  const lines = DPA_US_REQUIRED_TERMS.map((t) => `  - ${t.pinpoint}: ${t.requirement}`);
  return [
    "REQUIRED-TERMS COMPLETENESS (verified against the official sources " +
    DPA_US_REQUIRED_TERMS_VERIFIED +
    "): where California is among the engaged states, the agreement MUST contain, in operative text, EACH of the following terms — every one, not a selection:",
    ...lines,
    "  A missing term from this list is a completeness defect. Terms already covered by a named section above are satisfied by that section; do not duplicate them.",
  ].join("\n");
}
