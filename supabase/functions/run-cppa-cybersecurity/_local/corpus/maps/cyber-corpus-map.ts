// CPPA Cyber — Curated Attachment Map (Wave C3, 2026-08-23, Fable 5).
// Authored per doc 54 (CMP B1) as AMENDED by doc 62 §9 (the Tier-1 recut:
// 33 → 20 S4 rows; 13 Tier-2 rows demoted to dark FC), with the ratified
// bytes of doc 63 §5 (S0 literal, frame constants, the 20+6 impact tags)
// and the doc 64 tables (PN-C1, ratified) as the S2 evidence. Every source
// row re-pulled live 2026-08-23 (Lovable MCP); snapshot:
// tests/edge/corpus/__snapshots__/fsor-snapshot-cyber.json.
//
// RENDER-READINESS NOTE (doc 48 §II.6, ratified 2026-08-23): Cyber is
// PRE-CONVERSION — nothing in the product consumes this map yet, so no
// render-eligible row here can reach a customer until the conversion's C1
// landing wires `attachCyberCorpus(cam, componentStates)` against the
// deterministic component-status table (doc 24 §3). The render_when tokens
// below name their binding states; those states are code-computed BY
// CONSTRUCTION at the conversion (the composer that consumes them IS the
// deterministic engine). Until then this map is banked curation — exactly
// the §II.6 disposition.
//
// render_when token semantics (bind at the conversion C1 landing):
//   "c{n}_component_rendered" — component n's finding section rendered in
//   the document. All 18 components always render in the spine's section 4
//   ("The eighteen components, one at a time"), so S4 commentary attaches
//   whenever its component row does — the same shape the model-era renderer
//   had (0–3 fsor_commentary entries per component), now deterministic.
//   This deliberately avoids the ADMT C1 near-miss (content gated on a
//   state its own target case never reaches): there is no narrower state to
//   mis-gate on.
//
// THE TWO-PACKAGE TRAP (doc 54 §2b): rows are allocated by CONTENT verified
// against the OAL-approved final text, never by regulation_citation label.
// Bridged rows (proposal-numbering internal citations) carry an F-BRIDGE
// note in curation_note; the composer renders CYBER_S4_FRAMES.F_BRIDGE for
// them. b968b04c's provisional c5 allocation was BRIDGE-VERIFIED this
// session: its content is allowlisting-as-protection-method (secure
// configuration); the "(c)(4)" label is proposal-era — final (c)(4) is
// inventory, which the row never discusses.
//
// S5 is DARK by ratified posture (doc 54 §3): no CPPA-native enforcement
// exists, and GDPR analogies fail the jurisdiction-fit law for a
// CCPA-specific audit-readiness document. c4 and c18 have zero usable
// rows in either numbering system (c18 is the true zero-row component —
// doc 54 §4 correction of doc 51); their components render
// CYBER_S4_FRAMES.F_GEN.
//
// Impact-tag normalization flag (for the implementation redline): doc 63
// §5.3's tag list was authored in shorthand ("FSOR (App. p. 81) — …");
// the tags below wrap that ratified content in the CF-FSOR-consistent form
// the shipped ADMT map already uses ("CPPA, FSOR (Appendix, p. 81) — … —
// interpretive"). Content unchanged; wrapper normalized; confirm at
// redline.
//
// Data-quality flags (T2/T3 lanes; log only, rows unusable or partially
// usable): doc 54 §2c's list (5096c9a2 truncated, e3c1d6a3 mis-summarized,
// null-summary 1c2f3d63/fe92504b/42a7f0e3/b2591357/c5e6516c) PLUS two NEW
// truncation findings this session — ae0c29c3 and 60369cb9 end mid-word in
// the live DB. Both are dark FC rows here with intact first sentences
// pinned.

import type { CorpusMap } from "../../../../_shared/corpus/cam-types.ts";

/** The three ratified S4 frame constants (doc 63 §5.2) — byte-identical to
 * the shipped prompt-law sentences (run-cppa-cybersecurity/index.ts:160,
 * :166). No new prose: already-ratified language carried forward. */
export const CYBER_S4_FRAMES = {
  /** c4/c18 (zero-row components): the exact :166 label. */
  F_GEN:
    "General § 7123 agency response; no subsection-specific interpretive commentary was identified in the FSOR corpus for this component.",
  /** Every bridged row: the exact :160 clause. */
  F_BRIDGE:
    "the FSOR discussion references the proposal's numbering; the final regulation locates this component at [the control's fsor_citation]",
  /** Every S4 row's intro: the exact :160 clause. */
  F_INTRO: "FSOR discussion under § [n] bearing on this control",
} as const;

/** The procedural half of the factor vocabulary (doc 54 §0). These labels
 * become the Determination appendix's procedural rows at the conversion's
 * C2 landing (vocabulary-first, the doc 62 §5 discipline) — the appendix
 * build must adopt them or re-key this map in the same landing. */
export const CYBER_PROCEDURAL_FACTORS = [
  "Applicability and thresholds",
  "Deadline tier and cadence",
  "Audit thoroughness and independence",
  "Audit-report content",
  "Leverage of existing work",
  "Submission and attestation",
] as const;

export const CYBER_CORPUS_MAP: CorpusMap = {
  product: "cppa-cyber",
  map_version: "cppa-cyber-cam-v1-2026-08-23",
  snapshot_file: "tests/edge/corpus/__snapshots__/fsor-snapshot-cyber.json",
  // The fleet's FIRST-designed s4_ratification (doc 54 §2b) — stamped per
  // PN-CMP-B1 as cleared 2026-08-23 (doc 63 §0.1: "B1 Cyber 20 S4 rows +
  // 3 frames + S0"), governed by doc 62 §9's Tier-1 recut.
  s4_ratification: {
    ratified_by: "CEO",
    ratified_on: "2026-08-23",
    ledger_ref: "PN-CMP-B1",
  },
  // C1.2 (2026-08-25) — the AQ/S2 analog: doc 64 already ratified the
  // applicability table's content byte-for-byte (2026-08-23); this stamp
  // records that a renderer now exists and the P1 applicability AQ row is
  // live. Governs the P1 row only — the two P2 (deadline/cadence) AQ rows
  // stay dark regardless of this stamp, per their own curation_notes.
  s2_ratification: {
    ratified_by: "CEO",
    ratified_on: "2026-08-23",
    ledger_ref: "doc-64-PN-C1",
  },
  rows: [
    // ── S0 — intake callouts ────────────────────────────────────────────
    {
      id: "cppa-cyber/c1/s0-01",
      factor_id: "Authentication",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "3bb6fc9f-3e48-404b-99d4-a5d4eaa52561",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether cybersecurity audits under section 7123(c) should specify clearer trigger points for multi-factor authentication requirements and mandate phishing-resistant authentication regardless of the number of factors used. The Agency rejected the commenter's request for additional specificity, finding the regulation reasonably clear as written, but revised section 7123(c) to clarify that auditors must assess cybersecurity program components applicable to the business's information systems. The Agency confirmed that section 7123(c)(1)(A) already permits auditors to assess phishing-resistant authentication broadly beyond the listed multi-factor authentication requirement, maintaining flexibility while ensuring audit thoroughness consistent with CCPA standards.",
      render_eligible: true,
      render_surface: "S0",
      purpose_class: "misreading",
      s0_field: "c1_auth",
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 81", verified_on: "2026-08-23" },
      curation_note:
        "Folds the interim intake fix (doc 63 §5.1, commit f9caf39c9 — CPPACyberFsorCallouts.ts, callout key \"11 CCR § 7123(c)\", the row's TRUE citation) into the CAM as its first S0 row. Bytes already ratified and shipped; the implementation session upgrades the pin test to the three-way Risk parity pattern and retires the interim snapshot.",
    },
    {
      id: "cppa-cyber/P2/s0-01",
      factor_id: "Deadline tier and cadence",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "171c1746-7b0c-42f5-a29b-3bd0a3633dce",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Section 7121(a) establishes phased compliance deadlines for cybersecurity audit requirements based on a business's annual gross revenue.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "p. 19", verified_on: "2026-08-23" },
      curation_note:
        "DARK, DECISION QUEUED (PN-C6): the OPTIONAL deadline-tier intake callout doc 54 §2a proposed and doc 63 §0.4 deferred to C3. Flipping it to S0 (s0_field: the revenue/size intake field) renders this row's summary as a customer byte the doc 63 packet did NOT ratify — the CEO decides at the implementation redline; do not flip without that ruling.",
    },

    // ── S4 — the per-component regulator-commentary map (20 rows, the
    // doc 62 §9 Tier-1 recut; requires the map's s4_ratification stamp).
    // Pins are the FULL summaries — they ARE the render bytes (doc 63
    // §5.3), confirmed at the implementation redline with the map. ──────
    {
      id: "cppa-cyber/c1/s4-01",
      factor_id: "Authentication",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "3bb6fc9f-3e48-404b-99d4-a5d4eaa52561",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether cybersecurity audits under section 7123(c) should specify clearer trigger points for multi-factor authentication requirements and mandate phishing-resistant authentication regardless of the number of factors used. The Agency rejected the commenter's request for additional specificity, finding the regulation reasonably clear as written, but revised section 7123(c) to clarify that auditors must assess cybersecurity program components applicable to the business's information systems. The Agency confirmed that section 7123(c)(1)(A) already permits auditors to assess phishing-resistant authentication broadly beyond the listed multi-factor authentication requirement, maintaining flexibility while ensuring audit thoroughness consistent with CCPA standards.",
      render_eligible: true,
      render_surface: "S4",
      purpose_class: "misreading",
      render_when: ["c1_component_rendered"],
      trail_impact:
        "CPPA, FSOR (Appendix, p. 81) — MFA triggers left flexible; phishing-resistant authentication assessable under (c)(1)(A) — interpretive",
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 81", verified_on: "2026-08-23" },
      curation_note:
        "MFA flexibility ≠ MFA pass: the Agency declined harder MFA triggers but kept phishing-resistant authentication assessable — corrects the predictable reading that flexible triggers mean a lighter c1 bar. Same source as the c1 S0 callout (one curation, two surfaces — doc 48 III.2). Frame: F_INTRO.",
    },
    {
      id: "cppa-cyber/c1/s4-02",
      factor_id: "Authentication",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "dd6adf32-a670-4849-974e-60170a3f493c",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue concerns the scope of requirements under 11 CCR § 7123(b)(2)(A)(ii) regarding authentication methods for businesses. The Agency modified the regulation to clarify that this subsection applies only when a business actually uses passwords or passphrases, thereby limiting the requirement's applicability to businesses that employ this specific authentication method. This modification was made to provide clear guidance to businesses and their auditors about when this subsection's requirements take effect.",
      render_eligible: true,
      render_surface: "S4",
      purpose_class: "misreading",
      render_when: ["c1_component_rendered"],
      trail_impact:
        "CPPA, FSOR (p. 24) — password requirements apply only where passwords are used — interpretive",
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "p. 24", verified_on: "2026-08-23" },
      curation_note:
        "The password-use conditional — corrects over-reading password/passphrase requirements onto passwordless businesses. F-BRIDGE applies (internal citation (b)(2)(A)(ii), proposal numbering). Its logic half is fcl-L4 (the C0.5 predicate work item).",
    },
    {
      id: "cppa-cyber/c2/s4-01",
      factor_id: "Encryption of personal information",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "ded1d6bf-0922-4bfc-ae36-d722186271da",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The California Privacy Protection Agency declined to specify particular encryption standards for information at rest and in transit under 11 CCR § 7123(b)(2). The Agency retained the existing regulatory language without referencing external standards like NIST, determining that prescriptive standards would be inappropriate given the need for the regulations to apply flexibly across diverse industries and information systems.",
      render_eligible: true,
      render_surface: "S4",
      purpose_class: "misreading",
      render_when: ["c2_component_rendered"],
      trail_impact:
        "CPPA, FSOR (Appendix, p. 82) — no prescriptive encryption standard imposed — interpretive",
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 82", verified_on: "2026-08-23" },
      curation_note:
        "No external encryption standard is mandated — corrects the predictable reading that c2 requires NIST-specified algorithms. F-BRIDGE applies (internal (b)(2) numbering).",
    },
    {
      id: "cppa-cyber/c2/s4-02",
      factor_id: "Encryption of personal information",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "d384dc3a-d42c-4360-9549-2f7d7a36feb7",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Regulation 11 CCR § 7123(c)(2) requires encryption of personal information maintained by businesses. The Agency rejected the commenter's recommendation to expand the encryption requirement to explicitly cover sensitive information, determining that the existing requirement to encrypt \"personal information\" under § 7123(c)(2) already encompasses the protections sought.",
      render_eligible: true,
      render_surface: "S4",
      purpose_class: "misreading",
      render_when: ["c2_component_rendered"],
      trail_impact:
        "CPPA, FSOR (Appendix, p. 84) — \"personal information\" encryption already encompasses sensitive data — interpretive",
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 84", verified_on: "2026-08-23" },
      curation_note:
        "Sensitive PI is not a separate encryption category — \"personal information\" already covers it. Corrects the reading that sensitive data needs a distinct c2 showing. Final (c)(2) numbering; no bridge.",
    },
    {
      id: "cppa-cyber/c3/s4-01",
      factor_id: "Account management and access controls",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "b32b8b4e-09e4-4ce8-b441-64351e94e29c",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "California's CPPA clarified that access control and privilege requirements under 11 CCR § 7123(b)(2)(D)(i) apply not only to individual employees but also to system accounts, service accounts, and applications. The Agency added the terms \"account\" and \"application\" to the regulation to ensure businesses and auditors understand that access controls must extend to all entities that can be granted system privileges, not just people.",
      render_eligible: true,
      render_surface: "S4",
      purpose_class: "misreading",
      render_when: ["c3_component_rendered"],
      trail_impact:
        "CPPA, FSOR (p. 25) — access privileges reach system/service accounts and applications — interpretive",
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "p. 25", verified_on: "2026-08-23" },
      curation_note:
        "Access controls are not personnel-only — system/service accounts and applications are in scope. Corrects the narrow people-only reading. F-BRIDGE applies ((b)(2)(D)(i)). Its frame-constraint half is fcl-L6 (C2 frames).",
    },
    {
      id: "cppa-cyber/c5/s4-01",
      factor_id: "Secure configuration of hardware and software",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "b968b04c-d807-486a-8fde-66412041fa4e",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The regulatory issue is whether allowlisting requirements under Section 7123(c)(4) are overly burdensome or inapplicable to typical businesses outside high-security environments. The Agency retained the allowlisting requirement, clarifying that the cybersecurity regulations do not mandate specific protection methods but rather require businesses to conduct thorough assessments of how to meet the regulatory standards, meaning allowlisting is one potential approach among others that organizations may use to satisfy their obligations. Businesses must evaluate their specific circumstances to determine appropriate cybersecurity measures rather than viewing the regulation as prescribing a single mandatory technique.",
      render_eligible: true,
      render_surface: "S4",
      purpose_class: "action",
      render_when: ["c5_component_rendered"],
      trail_impact:
        "CPPA, FSOR (Appendix, p. 84) — allowlisting: methods not mandated; documentation required — interpretive",
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 84", verified_on: "2026-08-23" },
      curation_note:
        "BRIDGE-VERIFIED this session (the doc 54 §2b provisional): content is allowlisting-as-protection-method — a secure-configuration practice; the row's \"(c)(4)\" label is proposal-era numbering (final (c)(4) is inventory, never discussed here). F-BRIDGE applies. Allowlisting is one acceptable approach, not a mandate — what the customer documents is the assessment.",
    },
    {
      id: "cppa-cyber/c6/s4-01",
      factor_id: "Vulnerability scanning and penetration testing",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "3227cc9f-55a3-4eb3-a643-b2883e0d3552",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether vulnerability disclosure and reporting requirements should be limited to patched and exploitable vulnerabilities, and whether examples of bug bounty and ethical hacking programs should be included in the regulation. The Agency rejected the commenter's proposal and retained the examples of bug bounty and ethical hacking programs in 11 CCR § 7123(b)(2), finding that these examples provide necessary clarity and guidance for businesses and auditors while maintaining consistency with established cybersecurity frameworks. The Agency also declined to limit the scope to only patched and exploited vulnerabilities, instead maintaining broader coverage that aligns with the CCPA's requirement for thorough audits with flexibility for businesses.",
      render_eligible: true,
      render_surface: "S4",
      purpose_class: "action",
      render_when: ["c6_component_rendered"],
      trail_impact:
        "CPPA, FSOR (Appendix, p. 86) — bug-bounty and ethical-hacking programs retained as acceptable examples — interpretive",
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 86", verified_on: "2026-08-23" },
      curation_note:
        "Bug-bounty/ethical-hacking programs are named acceptable practice — evidence a customer running one can retain for c6; vulnerability scope is NOT limited to patched/exploited findings. F-BRIDGE applies (internal (b)(2)).",
    },
    {
      id: "cppa-cyber/c7/s4-01",
      factor_id: "Audit-log management",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "20877da0-4193-415e-8178-e2ed22c18c25",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether the audit-log management provision in section 7123(b)(2)(H) should be simplified by shortening its title or description. The Agency rejected this recommendation and retained the phrase \"including the centralized storage, retention, and monitoring of logs\" in the final regulation to maintain clear and specific requirements for how businesses must manage audit logs under the California Privacy Protection Act.",
      render_eligible: true,
      render_surface: "S4",
      purpose_class: "action",
      render_when: ["c7_component_rendered"],
      trail_impact:
        "CPPA, FSOR (Appendix, p. 86) — centralized storage, retention and monitoring of logs is the stated scope — interpretive",
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 86", verified_on: "2026-08-23" },
      curation_note:
        "The centralized-log phrase survived simplification attempts — centralized storage, retention AND monitoring are each part of what the customer evidences for c7. Row label is final (c)(7); internal (b)(2)(H) reference — F-BRIDGE applies to the internal citation.",
    },
    {
      id: "cppa-cyber/c8/s4-01",
      factor_id: "Network monitoring and defenses",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "e1d61e16-b5cc-4077-aa76-9df58b060129",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue concerns whether bot-detection requirements in the regulations are sufficiently specific and appropriately tailored to their purpose. The Agency agreed in part with the comment and revised section 7123(c)(8)(A) to clarify that businesses may use technologies such as bot-detection and intrusion-detection as security measures, providing greater specificity than the prior language.",
      render_eligible: true,
      render_surface: "S4",
      purpose_class: "misreading",
      render_when: ["c8_component_rendered"],
      trail_impact:
        "CPPA, FSOR (Appendix, p. 86) — bot/intrusion detection are examples, not mandates — interpretive",
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 86", verified_on: "2026-08-23" },
      curation_note:
        "Bot/intrusion-detection are examples businesses MAY use, not mandated technologies — corrects the reading that c8 requires specific tooling. Final (c)(8)(A) numbering; no bridge.",
    },
    {
      id: "cppa-cyber/c8/s4-02",
      factor_id: "Network monitoring and defenses",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "a55c8fd4-fe71-42a3-955f-a78df09819f6",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether endpoint detection and response mechanisms should be specifically mandated as part of cybersecurity audit requirements under California's CPRA audit rules. The California Privacy Protection Agency confirmed that the audit components listed in section 7123(c) already address endpoint protection and response mechanisms and are consistent with established cybersecurity frameworks, allowing the Agency to maintain flexibility for businesses while meeting the CPPA's requirement for thorough audits.",
      render_eligible: true,
      render_surface: "S4",
      purpose_class: "misreading",
      render_when: ["c8_component_rendered"],
      trail_impact:
        "CPPA, FSOR (Appendix, p. 87) — endpoint protection addressed through the listed components — interpretive",
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 87", verified_on: "2026-08-23" },
      curation_note:
        "Endpoint detection/response has no standalone component — it is assessed through the listed components. Corrects the customer looking for (and not finding) a dedicated EDR row. Final (c) numbering; no bridge.",
    },
    {
      id: "cppa-cyber/c9/s4-01",
      factor_id: "Antivirus and anti-malware protections",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "a99195b0-d929-4bb4-892a-2f19cada832c",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The regulation addresses what cybersecurity audits must evaluate regarding antivirus and anti-malware protections. The Agency rejected the commenter's recommendation to modify section 7123(b)(2)(J), maintaining that audits need not focus specifically on antivirus and anti-malware protections as distinct requirements.",
      render_eligible: true,
      render_surface: "S4",
      purpose_class: "misreading",
      render_when: ["c9_component_rendered"],
      trail_impact:
        "CPPA, FSOR (Appendix, p. 87, proposal numbering) — audits need not treat antivirus as a distinct focus — interpretive",
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 87", verified_on: "2026-08-23" },
      curation_note:
        "The bridge row that RESOLVES doc 51's \"c9 zero-row\" finding (doc 54 §4): c9 commentary exists under proposal numbering (b)(2)(J). Audits need not give antivirus a distinct focus — corrects over-weighting c9 evidence expectations. F-BRIDGE applies.",
    },
    {
      id: "cppa-cyber/c10/s4-01",
      factor_id: "Segmentation of an information system",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "2bdc1b14-07da-47b1-9191-b5ef092c5806",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether cybersecurity assessment standards should include explicit \"zero trust architecture\" requirements under section 7123(b)(2)(C). The Agency deleted the zero trust architecture provision from the final regulation to reduce implementation complexity by narrowing the specific cybersecurity components that businesses must evaluate when assessing their data security practices.",
      render_eligible: true,
      render_surface: "S4",
      purpose_class: "misreading",
      render_when: ["c10_component_rendered"],
      trail_impact:
        "CPPA, FSOR (p. 25) — zero-trust deleted as a standalone component; segmentation independently evidenced — interpretive",
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "p. 25", verified_on: "2026-08-23" },
      curation_note:
        "The zero-trust deletion — the canonical-sentence source (QL2-FIX-1's \"in addition to, not instead of\" rule): zero-trust is not a component and not a segmentation substitute; c10 must be independently evidenced. F-BRIDGE applies ((b)(2)(C)). Its logic half is fcl-L2.",
    },
    {
      id: "cppa-cyber/c10/s4-02",
      factor_id: "Segmentation of an information system",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "d29e0f00-fe27-4059-b8ca-b005acc3cc16",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Section 7123(b)(2) addresses how businesses must implement reasonable security practices to protect personal information, including network protections. The Agency retained specific provisions on network segmentation as a distinct safeguard rather than consolidating it under general network monitoring, finding that explicit segmentation examples provide necessary clarity and guidance for businesses and auditors implementing cybersecurity practices consistent with established frameworks and CCPA audit requirements.",
      render_eligible: true,
      render_surface: "S4",
      purpose_class: "misreading",
      render_when: ["c10_component_rendered"],
      trail_impact:
        "CPPA, FSOR (Appendix, p. 87) — segmentation is distinct from network monitoring — interpretive",
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 87", verified_on: "2026-08-23" },
      curation_note:
        "Segmentation ≠ network monitoring — the Agency kept them distinct; a monitoring showing does not satisfy c10. F-BRIDGE applies (internal (b)(2)).",
    },
    {
      id: "cppa-cyber/c12/s4-01",
      factor_id: "Cybersecurity awareness",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "e43c94ee-5b62-42dd-98e6-102825fa3dea",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether maintaining current knowledge of changing cybersecurity threats and countermeasures constitutes part of cybersecurity awareness or cybersecurity education and training requirements. The Agency clarified that this obligation pertains to cybersecurity awareness and moved the requirement to subsection (c)(12) to separate it from the cybersecurity education and training provisions in subsection (b)(2)(M), thereby providing clearer regulatory guidance to businesses and auditors on these distinct obligations.",
      render_eligible: true,
      render_surface: "S4",
      purpose_class: "misreading",
      render_when: ["c12_component_rendered"],
      trail_impact:
        "CPPA, FSOR (p. 25) — threat-landscape knowledge belongs to awareness (c)(12) — interpretive",
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "p. 25", verified_on: "2026-08-23" },
      curation_note:
        "The awareness half of the c12/c13 split: threat-landscape knowledge is an AWARENESS obligation, not training — corrects filing threat-briefing evidence under the training component. F-BRIDGE applies ((b)(2)(M)). Its logic half is fcl-L3.",
    },
    {
      id: "cppa-cyber/c13/s4-01",
      factor_id: "Cybersecurity education and training",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "4dcde1e3-0746-4684-8aeb-d3191558acda",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether requirements for maintaining knowledge of evolving cybersecurity threats belong in the cybersecurity training subsection of section 7123(b)(2). The Agency rejected the commenter's request to delete these provisions, retaining subsections (i) and (ii) and the word \"including\" in the regulation because these descriptions provide necessary clarity to businesses and auditors about how organizations should maintain awareness of changing threats and implement corresponding education and training programs.",
      render_eligible: true,
      render_surface: "S4",
      purpose_class: "misreading",
      render_when: ["c13_component_rendered"],
      trail_impact:
        "CPPA, FSOR (Appendix, p. 87) — structured training retained as a separate component from awareness — interpretive",
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 87", verified_on: "2026-08-23" },
      curation_note:
        "The training half of the c12/c13 split: structured education/training is its own component with its own evidence — a single undifferentiated entry satisfies neither half automatically. F-BRIDGE applies (internal (b)(2)).",
    },
    {
      id: "cppa-cyber/c14/s4-01",
      factor_id: "Secure development and coding practices",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "928d1260-ae7a-428f-bf75-877cc18c7d59",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether cybersecurity audit requirements under the California Privacy Protection Agency's regulations specify how businesses should address secure development and coding practices, particularly for AI system developers. In response, the Agency modified § 7123(c) to clarify that cybersecurity audits must assess the listed components of a cybersecurity program \"that the auditor deems applicable to the business's information system,\" with secure development and coding explicitly included among those components. The Agency determined that no additional clarification beyond this modification was necessary at this time.",
      render_eligible: true,
      render_surface: "S4",
      purpose_class: "misreading",
      render_when: ["c14_component_rendered"],
      trail_impact:
        "CPPA, FSOR (Appendix, p. 88) — secure development assessed for AI system developers as for all software — interpretive",
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 88", verified_on: "2026-08-23" },
      curation_note:
        "Secure development covers AI system developers the same as all software development — corrects the \"AI development is a different regime\" reading. Final (c) numbering; no bridge.",
    },
    {
      id: "cppa-cyber/c15/s4-01",
      factor_id: "Oversight of service providers, contractors, and third parties",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "aaeefa5a-bd9c-402a-8e32-72352ba40aab",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue was whether oversight of service providers, contractors, and third parties should be included as part of cybersecurity requirements under California's privacy law. The California Privacy Protection Agency agreed with commenters and retained language in 11 CCR § 7123(b)(2) requiring businesses to implement oversight of service providers, contractors, and third parties as an essential component of their cybersecurity program, consistent with established cybersecurity frameworks. This requirement ensures that a business's security obligations extend beyond its own operations to include management and monitoring of external parties that access or handle consumer data.",
      render_eligible: true,
      render_surface: "S4",
      purpose_class: "authority",
      render_when: ["c15_component_rendered"],
      trail_impact:
        "CPPA, FSOR (Appendix, p. 88) — service-provider oversight retained on consumer-protection grounds — interpretive",
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 88", verified_on: "2026-08-23" },
      curation_note:
        "WHY vendor oversight is a component — the Agency's own consumer-protection rationale, grounding the c15 determination against the \"my vendors are their own problem\" pushback. F-BRIDGE applies (internal (b)(2)).",
    },
    {
      id: "cppa-cyber/c16/s4-01",
      factor_id: "Retention schedules and proper disposal of personal information",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "f578fa27-4fca-4a18-b4dc-46d6df8cd473",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether § 7123 cybersecurity audits should explicitly require assessment of data minimization practices and retention schedules. The Agency agreed that data minimization is important but found that § 7123(c)(16) already requires audits to assess the business's retention schedules and proper disposal practices, and § 7123(d) permits auditors to evaluate additional cybersecurity program components beyond those listed, so no new explicit requirement was needed.",
      render_eligible: true,
      render_surface: "S4",
      purpose_class: "misreading",
      render_when: ["c16_component_rendered"],
      trail_impact:
        "CPPA, FSOR (Appendix, p. 76) — minimization and retention are covered through (c)(16) and (d) — interpretive",
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 76", verified_on: "2026-08-23" },
      curation_note:
        "Minimization has no standalone component — it is assessed through (c)(16) retention/disposal plus (d)'s additional-components path. Corrects the customer looking for a separate minimization row. Final numbering; no bridge.",
    },
    {
      id: "cppa-cyber/c17/s4-01",
      factor_id: "Security-incident response management",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "d29ba188-cd66-4ab2-a500-f03e7b2f911e",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The Agency addressed the definition of \"security incident\" in California's consumer privacy regulations by modifying the definition to replace \"potentially\" with \"imminently\" and adding \"personal\" to clarify the regulation focuses on personal information. This modification to 11 CCR § 7123(b)(2)(Q)(i) aligns the state's definition with National Institute of Standards and Technology standards and provides clearer guidance for businesses and their auditors to implement the requirement consistently.",
      render_eligible: true,
      render_surface: "S4",
      purpose_class: "misreading",
      render_when: ["c17_component_rendered"],
      trail_impact:
        "CPPA, FSOR (p. 25) — a security incident \"actually or imminently\" jeopardizes; NIST-aligned — interpretive",
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "p. 25", verified_on: "2026-08-23" },
      curation_note:
        "The \"imminently\" definition (NIST-aligned): an incident actually or imminently jeopardizes personal information — corrects both over-reading (\"potentially\" would sweep in speculation) and under-reading (actual breach only). F-BRIDGE applies ((b)(2)(Q)(i)). Its frame-constraint half is fcl-L5 (C2 frames).",
    },
    {
      id: "cppa-cyber/c17/s4-02",
      factor_id: "Security-incident response management",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "d8118706-1705-47cd-a8de-1b1a2c4e7f5a",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The regulatory issue is whether cybersecurity audits under 11 CCR § 7123(b)(2) should be limited to reviewing a business's documented incident response procedures. The Agency rejected this limitation and clarified that cybersecurity audits must assess not only the business's documentation of incident response management but also include testing and evaluation of how the business actually implements and executes its incident-response capabilities in practice.",
      render_eligible: true,
      render_surface: "S4",
      purpose_class: "action",
      render_when: ["c17_component_rendered"],
      trail_impact:
        "CPPA, FSOR (Appendix, p. 89) — audits assess incident-response testing, not only documentation — interpretive",
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 89", verified_on: "2026-08-23" },
      curation_note:
        "Testing, not just documentation: the audit reaches actual execution of incident-response capability — the customer retains testing/exercise evidence, not only the written plan. F-BRIDGE applies (internal (b)(2)).",
    },

    // ── S2 — quoted-law rows (the doc 64 tables). ───────────────────────
    // C1.2 (2026-08-25): the P1 applicability row FLIPS live — the
    // § 7120(a)-(b) applicability table it pins is built and shipping
    // behind CYBER_DETERMINISTIC_ENABLED (cyber-applicability.ts). The two
    // P2 deadline/cadence rows STAY DARK: their content is the § 7121(a)/
    // (b) deadline schedule, and that surface's own shipped, CEO-ratified
    // fixed prose (cppa-cyber.spine.ts) states "No slot, no generation, no
    // cohort computed" as the ITEM-204 design law — computing and
    // rendering a cohort table there would contradict already-ratified
    // bytes, so these two rows wait on a CEO ruling to lift ITEM-204 for
    // this surface specifically, not on a renderer being built (one now
    // exists; it was deliberately not pointed at these two rows).
    {
      id: "cppa-cyber/P1/s2-01",
      factor_id: "Applicability and thresholds",
      role: "AQ",
      source_table: "provision_texts",
      source_row_id: "cppa-7120",
      excerpt_field: "verbatim_excerpt",
      pinned_excerpt:
        "The business meets the threshold set forth in Civil Code section 1798.140,",
      render_eligible: true,
      render_surface: "S2",
      purpose_class: "authority",
      trail_impact:
        "CPPA, FSOR (Appendix, pp. 64–66) — thresholds retained as statutory — interpretive",
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note:
        "The doc 64 §1 applicability table (A1/A2 triggers, § 7120(b), preceding-calendar-year caveat verbatim), built and rendered by buildCyberApplicabilityTable() (cyber-applicability.ts) behind CYBER_DETERMINISTIC_ENABLED, spliced into the skeleton document at audit_scope:0 (cyber-skeleton-assemble.ts, C1.2, 2026-08-25). The table's own A1/A2 statutory descriptions and its § 7123(b)(2)/(c) applicability caveat (doc 64 §4.2) are authored independently in code, ratified via doc 64 itself, not composed from this row at render time — this row is the corpus-side verification pin proving the table's statutory description traces to real, verified provision text (checked live against the fsor-snapshot-cyber.json snapshot at this landing: contains=true). FSOR conformance evidence: cc96acc3, 67ddb51a, 8537edab, 8109b58a (this map's P1 FC rows).",
    },
    {
      id: "cppa-cyber/P2/s2-01",
      factor_id: "Deadline tier and cadence",
      role: "AQ",
      source_table: "provision_texts",
      source_row_id: "cppa-7121",
      excerpt_field: "verbatim_excerpt",
      pinned_excerpt:
        "April 1, 2028, if the business's annual gross revenue for 2026 was more",
      render_eligible: false,
      trail_impact:
        "CPPA, FSOR (p. 19) — phased first-audit schedule; see the deadline table — interpretive",
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note:
        "The doc 64 §2 first-audit deadline table (T1/T2/T3 by revenue YEAR with the statute's own as-of dates — doc 64 §4.4: a simplified \"current revenue\" rendering is WRONG and prohibited). Carries the ITEM-204 § 7121(a) phase-in quote forward byte-for-byte alongside (already ratified, doc 64 §5). STAYS DARK at the C1.2 landing (2026-08-25): the shipped § 7121(a) skeleton block (cppa-cyber.spine.ts, audit_scope section) is CEO-ratified fixed prose stating \"No slot, no generation, no cohort computed\" as the ITEM-204 design law; a computed deadline table would contradict it and needs its own CEO ruling to supersede ITEM-204 for this surface, not a renderer (see doc 64 §2 vs the spine's own corpus block). FSOR conformance evidence: 171c1746, 56d825a9, 8bf9c38c, 30096b68, 0aa22547 (P2 rows).",
    },
    {
      id: "cppa-cyber/P2/s2-02",
      factor_id: "Deadline tier and cadence",
      role: "AQ",
      source_table: "provision_texts",
      source_row_id: "cppa-7121",
      excerpt_field: "verbatim_excerpt",
      pinned_excerpt:
        "After April 1, 2030, if on January 1 of one year, a business meets the criteria of",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note:
        "The doc 64 §3 steady-state cadence (§ 7121(b), with the provision's own 2035/2036 worked example). STAYS DARK with s2-01 at the C1.2 landing (2026-08-25) for the same ITEM-204 reason recorded on that row.",
    },
    // FC-L11 (2026-08-25) — the § 7124 certification-of-completion AQ pin.
    // FLIPPED LIVE (2026-08-25, v3.3): CEO instruction "add the Submission
    // and attestation section in the similar manner that we added a
    // signature section to CPPA Risk" resolved the placement decision this
    // row was waiting on. The composer is now spliced into
    // cppa-cyber.spine.ts's new "submission_and_attestation" section and
    // wired unconditionally in cyber-skeleton-assemble.ts's composedBase.
    {
      id: "cppa-cyber/P6/s2-01",
      factor_id: "Submission and attestation",
      role: "AQ",
      source_table: "provision_texts",
      source_row_id: "cppa-7124",
      excerpt_field: "verbatim_excerpt",
      pinned_excerpt:
        "The business must submit the certification no later than April 1 following any year that the business is required to complete a cybersecurity audit.",
      render_eligible: true,
      render_surface: "S2",
      purpose_class: "authority",
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-25" },
      curation_note:
        "The § 7124 certification-of-completion fixed-fact block (annual obligation, April 1 deadline, executive-signer qualifications, required certification content, and the § 7124(d)(4) attestation statement quoted in full), spliced into the skeleton document at submission_and_attestation:0 (cyber-skeleton-assemble.ts, v3.3, 2026-08-25). See CYBER_7124_REQUIREMENTS/CYBER_7124_ATTESTATION_STATEMENT (cppa-cyber-deliverables/components.ts) and buildCyberSubmissionAttestationBlock() (cyber-submission-attestation.ts). Text CEO-supplied in-session 2026-08-25, cross-verified as an exact byte match against the pre-existing approved § 7124(b) pin in cppa-cyber-corpus-pin.test.ts, itself sourced from the OAL-approved PDF per docs/courier/ITEM298-CYBER-INGEST-2026-07-31.md (SHA-256 7a34306cebf12ae9050490568b1d7ed532cfd38dc6ed8c7c3dc40afb23328650, CEO-approved 2026-07-31). Runs unconditionally (both CYBER_DETERMINISTIC_ENABLED states) — pure law, no intake dependency, same as the § 7121(a) ITEM-204 block.",
    },

    // ── The FC-L register (doc 54 §1, L1–L12) — dark, logic-bearing; one
    // row per register item pinned to its PRIMARY evidence row, siblings
    // named in curation_note. "implemented" branch_refs point at the live
    // prompt laws that carry each position TODAY (Cyber is pre-conversion);
    // each converts to its named table/composer mechanism at C1/C2 per the
    // disposition note. ────────────────────────────────────────────────
    {
      id: "cppa-cyber/P3/fcl-L1",
      factor_id: "Audit thoroughness and independence",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "69e2d23c-d383-456f-8e30-f2a308c8db04",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether cybersecurity audits under 11 CCR § 7123(b)(2) must assess every listed cybersecurity program component or only those applicable to a business's information system.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref:
          "supabase/functions/run-cppa-cybersecurity/index.ts:APPLICABILITY CAVEAT FOR 0-SCORED CONTROLS",
      },
      provenance: { page_ref: "p. 24", verified_on: "2026-08-23" },
      curation_note:
        "L1: auditor assesses ONLY applicable components; a 0-scored Insufficient-information entry is an applicability placeholder, never a deficiency; means compute over scored controls only. Lives today in the :141 prompt-law family + RC-P7; becomes the component-status table's tri-state machine at C1 — carry the state VERBATIM into the C0.5 D2 predicate enumeration. Siblings: bdcd68c2, 45171020, f5a35460.",
    },
    {
      id: "cppa-cyber/c10/fcl-L2",
      factor_id: "Segmentation of an information system",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "2bdc1b14-07da-47b1-9191-b5ef092c5806",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether cybersecurity assessment standards should include explicit \"zero trust architecture\" requirements under section 7123(b)(2)(C).",
      render_eligible: false,
      direction: "limits",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref:
          "supabase/functions/run-cppa-cybersecurity/index.ts:ZERO-TRUST IS NOT A REGULATORY CRITERION",
      },
      provenance: { page_ref: "p. 25", verified_on: "2026-08-23" },
      curation_note:
        "L2: zero-trust deleted as a standalone component; segmentation independently evidenced (\"in addition to, not instead of\" — the CEO-ratified QL2-FIX-1 canonical sentence). Becomes a ratified template keyed to the zero-trust intake state at C1. Same source as c10/s4-01 (render half). Siblings: 64ec4734, 716991e9, 58dddd9f.",
    },
    {
      id: "cppa-cyber/c12/fcl-L3",
      factor_id: "Cybersecurity awareness",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "d06ffc1e-7d07-4579-b6e2-38870ef0caf0",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The regulation addresses how businesses must document cybersecurity awareness, security incident definitions, and audit report requirements under 11 CCR § 7123.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref:
          "supabase/functions/run-cppa-cybersecurity/index.ts:AWARENESS AND TRAINING ARE SEPARATE COMPONENTS",
      },
      provenance: { verified_on: "2026-08-23" },
      curation_note:
        "L3: awareness (c12) and education/training (c13) are SEPARATE components; a single undifferentiated intake entry satisfies neither automatically. At C1 the intake→component mapping table keeps two rows with an explicit shared-evidence flag state. Siblings: e43c94ee (the c12 S4 row), 03e13782.",
    },
    {
      id: "cppa-cyber/c1/fcl-L4",
      factor_id: "Authentication",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "dd6adf32-a670-4849-974e-60170a3f493c",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue concerns the scope of requirements under 11 CCR § 7123(b)(2)(A)(ii) regarding authentication methods for businesses.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: true,
      logic_disposition: {
        kind: "extension_filed",
        queue_ref:
          "Cyber conversion C1 authentication-finding composer (doc 24 §3; doc 54 §1 L4 — the predicate field now exists (profile.password_auth_used, CEO-ordered 2026-08-25) but no composer reads it yet; this disposition names the code that would APPLY the rule, not the field's existence)",
      },
      provenance: { page_ref: "p. 24", verified_on: "2026-08-23" },
      curation_note:
        "L4: password/passphrase requirements apply ONLY where the business uses them. The model path absorbs this today by reading controls[].notes free text; the deterministic path must not infer it the same way (no-inference discipline), so a dedicated predicate field was added instead (profile.password_auth_used — the simplest possible shape: one Yes/No enum, optional, CEO-ordered 2026-08-25). Field exists; the c1_auth finding/remediation composer that would actually CONDITION on it is not yet built — that composer is the remaining C1 work item, not the field. Same source as c1/s4-02 (render half). Siblings: cef94309, 58dddd9f.",
    },
    {
      id: "cppa-cyber/c17/fcl-L5",
      factor_id: "Security-incident response management",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "d29ba188-cd66-4ab2-a500-f03e7b2f911e",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The Agency addressed the definition of \"security incident\" in California's consumer privacy regulations by modifying the definition to replace \"potentially\" with \"imminently\" and adding \"personal\" to clarify the regulation focuses on personal information.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: true,
      logic_disposition: {
        kind: "extension_filed",
        queue_ref:
          "Cyber conversion C2 frame extraction (doc 24 §3; doc 54 §1 L5 — ratified c17 frames must use the final \"imminently\" definition)",
      },
      provenance: { page_ref: "p. 25", verified_on: "2026-08-23" },
      curation_note:
        "L5: sentence-semantics constraint — c17 finding frames use the final NIST-aligned definition (actually or imminently jeopardizes personal information), never the proposal's \"potentially\". Lands as a C2 frame-extraction constraint. Same source as c17/s4-01 (render half). Siblings: e5569eee, 11f17838.",
    },
    {
      id: "cppa-cyber/c3/fcl-L6",
      factor_id: "Account management and access controls",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "b32b8b4e-09e4-4ce8-b441-64351e94e29c",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "California's CPPA clarified that access control and privilege requirements under 11 CCR § 7123(b)(2)(D)(i) apply not only to individual employees but also to system accounts, service accounts, and applications.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: true,
      logic_disposition: {
        kind: "extension_filed",
        queue_ref:
          "Cyber conversion C2 frame extraction (doc 24 §3; doc 54 §1 L6 — c3 frames cover system/service accounts and applications, not personnel only)",
      },
      provenance: { page_ref: "p. 25", verified_on: "2026-08-23" },
      curation_note:
        "L6: c3 finding scope reaches accounts and applications — a frame constraint on the ratified c3 sentences at C2. Same source as c3/s4-01 (render half). Sibling: be80ca90.",
    },
    {
      id: "cppa-cyber/P4/fcl-L7",
      factor_id: "Audit-report content",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "830b0beb-defe-4aac-aa77-6d55ed949e62",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Section 7123(c)(1) requires cybersecurity audit reports to identify and describe gaps or weaknesses in a business's cybersecurity program.",
      render_eligible: false,
      trail_impact:
        "CPPA, FSOR (p. 26) — gap reporting narrowed to risk-increasing gaps — interpretive",
      direction: "limits",
      logic_bearing: true,
      logic_disposition: {
        kind: "extension_filed",
        queue_ref:
          "Cyber conversion C2 frame extraction (doc 24 §3; doc 54 §1 L7 — gap-section lead sentences claim only auditor-deemed RISK-INCREASING gaps)",
      },
      provenance: { page_ref: "p. 26", verified_on: "2026-08-23" },
      curation_note:
        "L7: gap documentation narrowed to risk-increasing gaps — constrains what the deliverable's gap sections may claim; a C2 frame constraint. NOTE: this is the old-numbering \"(c)(1)\"-labeled row (final § 7123(e) family) whose citation-key collision caused the intake mis-attribution the interim fix closed — the canonical two-package-trap exemplar. Siblings: 0b5a4c69, c20dfc43.",
    },
    {
      id: "cppa-cyber/P3/fcl-L8",
      factor_id: "Audit thoroughness and independence",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "382351ca-637b-4b1f-b443-7add911c3638",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether businesses must retain cybersecurity audit documents for five years and what security protections apply to auditors handling this data.",
      render_eligible: false,
      trail_impact:
        "CPPA, FSOR (pp. 20–22) — independence standards; evidence over attestation; executive-management reporting — interpretive",
      direction: "supports",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref:
          "supabase/functions/run-cppa-cybersecurity/index.ts:R-TURN-2 § 7122(g) SCOPE NOTE",
      },
      provenance: { page_ref: "Appendix, p. 74", verified_on: "2026-08-23" },
      curation_note:
        "L8: business-side retention anchors at § 7122(g) (five years, business AND auditor); § 7123(e) is the AUDITOR's report-content duty — never anchor business retention to (e). Lives today in the :121/:152 citation-anchor prompt laws; becomes a CONTROL_CITATIONS discipline test at C1. Carries P3's aggregate impact tag (the one-representative-row convention). Siblings: 3ea315eb, f31d41c2.",
    },
    {
      id: "cppa-cyber/P2/fcl-L9",
      factor_id: "Deadline tier and cadence",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "8fe08152-6abc-4dc9-aa85-335a2d271fe3",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether businesses can conduct cybersecurity audits on a three-year cycle with annual risk-based assessments instead of annual audits.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: true,
      logic_disposition: {
        kind: "extension_filed",
        queue_ref:
          "Cyber conversion C1 date-table landing (doc 24 §3; doc 64 §3 — annual cadence, 12-month audit period, April-1 report: ratified fixed facts in the date table)",
      },
      provenance: { page_ref: "Appendix, p. 75", verified_on: "2026-08-23" },
      curation_note:
        "L9: annual audits, no risk-based/multi-year cadence; 12-month audit period; report by April 1. The facts are ratified (doc 64); the code home is the C1 date table. Siblings: eb1af5f9, 5a8ab64b, e810dd63.",
    },
    {
      id: "cppa-cyber/P2/fcl-L10",
      factor_id: "Deadline tier and cadence",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "171c1746-7b0c-42f5-a29b-3bd0a3633dce",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Section 7121(a) establishes phased compliance deadlines for cybersecurity audit requirements based on a business's annual gross revenue.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: true,
      logic_disposition: {
        kind: "extension_filed",
        queue_ref:
          "Cyber conversion C1 date-table landing (doc 24 §3; PN-C1 RESOLVED via doc 64 — tier boundaries and dates ratified byte-for-byte; renders at C1 with verification stamps)",
      },
      provenance: { page_ref: "p. 19", verified_on: "2026-08-23" },
      curation_note:
        "L10: THE deadline determination — first-audit deadline phased by revenue tier (§ 7121(a)). The primary evidence row behind the doc 64 §2 table; the wrong-deadline-for-tier error class dies when the C1 table derives deadlines from the revenue enum. Siblings: 176286b6, 30096b68, 0aa22547, 56d825a9, 59ddcdd2.",
    },
    {
      id: "cppa-cyber/P6/fcl-L11",
      factor_id: "Submission and attestation",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "c5c140af-9d1c-49e0-b2e2-bdcdd4436b2f",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Section 7124(c) requires businesses to submit only a certification of completion to the California Privacy Protection Agency, not the full cybersecurity audit report itself.",
      render_eligible: false,
      trail_impact:
        "CPPA, FSOR (p. 28) — certification-only submission; executive signer; April 1 — interpretive",
      direction: "limits",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref:
          'supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-skeleton-assemble.ts:"submission_and_attestation:0": buildCyberSubmissionAttestationBlock()',
      },
      provenance: { page_ref: "Appendix, p. 96", verified_on: "2026-08-25" },
      curation_note:
        "L11: the submission-summary section's entire fact set — certification only (never the report), executive signer (not board), April 1, per-required-year, perjury, no-influence, no substitutes. FULL VERBATIM § 7124 TEXT LOCAL AND SPLICED (2026-08-25, CEO instruction: \"add the Submission and attestation section in the similar manner that we added a signature section to CPPA Risk\") — see the AQ row cppa-cyber/P6/s2-01 above and CYBER_7124_REQUIREMENTS in components.ts. Corrects this row's OWN earlier premise (and my own earlier same-day assessment) that the text was unavailable; it was already ingested and CEO-approved 2026-07-31 per docs/courier/ITEM298-CYBER-INGEST-2026-07-31.md, this map simply hadn't been updated to reflect it. Carries P6's aggregate impact tag. Siblings: c4623e97, 71774ef5, 4518ac21, 2931daf7, 78630695, 50649925, d073ab32, 545698d4, feb77e05, 40ae8c3b (this map's P6 FC rows).",
    },
    {
      id: "cppa-cyber/P1/fcl-L12",
      factor_id: "Applicability and thresholds",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "98d7499c-bc86-4a13-9696-15723aeacb7d",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether California's cybersecurity program requirements should mirror the federal GLBA Safeguards Rule and whether encryption requirements should explicitly cover external networks.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref:
          "supabase/functions/run-cppa-cybersecurity/index.ts:GLBA CONDITIONAL APPEARS AT MOST ONCE",
      },
      provenance: { page_ref: "Appendix, p. 83", verified_on: "2026-08-23" },
      curation_note:
        "L12: the GLBA conditional appears at most once, in the scope/applicability section (the W3-T5(c) law; the Agency itself rejected GLBA alignment). A structural composer rule at C1. Same source as c2/fc-01 (its distinct encryption-scope hat).",
    },

    // ── Tier-2 dark FC (the 13 rows doc 62 §1 demoted from S4: drafting-
    // history support that fails prong (a) for the reader but keeps its
    // audit value on the build plane; R2 — never prints). ───────────────
    {
      id: "cppa-cyber/c1/fc-01",
      factor_id: "Authentication",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "51dad925-25a3-4e66-8da7-6cbec11d609d",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Section 7123(c) requires businesses to conduct thorough and independent cybersecurity audits but does not mandate implementation of specific security protections like multi-factor authentication or email security controls.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 34", verified_on: "2026-08-23" },
      curation_note:
        "No mandated MFA/email specifics — §§ 7123(c)(8)/(c)(13)/(d) already cover the ground. Tier-2 demotion (doc 62 §1): restates c1/s4-01's flexibility point without adding reader value.",
    },
    {
      id: "cppa-cyber/c2/fc-01",
      factor_id: "Encryption of personal information",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "98d7499c-bc86-4a13-9696-15723aeacb7d",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether California's cybersecurity program requirements should mirror the federal GLBA Safeguards Rule and whether encryption requirements should explicitly cover external networks.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 83", verified_on: "2026-08-23" },
      curation_note:
        "The encryption hat of the GLBA row (its structural hat is fcl-L12): \"over external networks\" language rejected as unnecessary — the revised information-system definition already encompasses external networks. Tier-2 demotion.",
    },
    {
      id: "cppa-cyber/c3/fc-01",
      factor_id: "Account management and access controls",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "be80ca90-bfd7-4487-a73e-b7fa1ec6ae82",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue concerned whether access control requirements should clarify the scope of employee access privileges or restrictions in data security practices.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 84", verified_on: "2026-08-23" },
      curation_note:
        "The (c)(3)(A) \"account's, or application's\" wording clarification — drafting history behind the b32b8b4e scope point. Tier-2 demotion.",
    },
    {
      id: "cppa-cyber/c3/fc-02",
      factor_id: "Account management and access controls",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "acd8c477-db4d-4b38-93b3-d2afda50dba2",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The regulatory issue concerns whether access control requirements in section 7123(c)(3) should specify dynamic adjustment mechanisms and clarify terminology for non-human accounts.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 84", verified_on: "2026-08-23" },
      curation_note:
        "Broad (c)(3) language already permits dynamic-adjustment audits — no regulation change. Tier-2 demotion.",
    },
    {
      id: "cppa-cyber/c6/fc-01",
      factor_id: "Vulnerability scanning and penetration testing",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "a4b358e0-72ac-452a-b262-8735074bca41",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue concerns the vulnerability scanning requirements for internal and external security assessments.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 86", verified_on: "2026-08-23" },
      curation_note:
        "(c)(6) vulnerability-scan language retained as written. Tier-2 demotion (provision-retained trivia).",
    },
    {
      id: "cppa-cyber/c7/fc-01",
      factor_id: "Audit-log management",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "512dbc4f-80d0-4fde-8f73-cd9301391c8f",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The regulatory issue concerns how businesses must implement audit-log management practices under the CPRA.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 86", verified_on: "2026-08-23" },
      curation_note:
        "(c)(7) (ex-(b)(2)(H)) audit-log clarity retention — drafting history behind the 20877da0 centralized-log point. Tier-2 demotion.",
    },
    {
      id: "cppa-cyber/c8/fc-01",
      factor_id: "Network monitoring and defenses",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "5268669c-726c-46f0-9f75-0b003e14a7d5",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether certain cybersecurity technologies qualify as examples of methods for detecting and preventing unauthorized access to personal information under the security requirements of 11 CCR § 7123(b)(2)(I)(i).",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "p. 25", verified_on: "2026-08-23" },
      curation_note:
        "Bot/IDS/IPS listed as example technologies ((b)(2)(I)(i), proposal numbering) — support behind the e1d61e16 examples-not-mandates point. Tier-2 demotion.",
    },
    {
      id: "cppa-cyber/c10/fc-01",
      factor_id: "Segmentation of an information system",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "7bde9a4e-c648-4a64-b680-7da10f15a295",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue concerns whether segmentation of information should be retained as a component of reasonable security under the CPRA security requirements.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 87", verified_on: "2026-08-23" },
      curation_note:
        "Segmentation retained against a removal request (ex-(b)(2)(K)) — provision-retained support behind the two c10 S4 rows. Tier-2 demotion.",
    },
    {
      id: "cppa-cyber/c11/fc-01",
      factor_id: "Port and protocol management and protection",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "45026762-15a1-4f66-9175-3cd1906360e9",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The California Privacy Protection Agency considered whether to remove language requiring businesses to limit and control ports, services, and protocols as part of their cybersecurity obligations under 11 CCR § 7123(c)(11).",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 87", verified_on: "2026-08-23" },
      curation_note:
        "Port/service/protocol limitation retained — c11's only corpus row, and it is provision-retained trivia; c11 renders no S4 commentary. Tier-2 demotion.",
    },
    {
      id: "cppa-cyber/c12/fc-01",
      factor_id: "Cybersecurity awareness",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "03e13782-ead3-4641-a871-398634ae2312",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The California Privacy Protection Agency addressed concerns that the cybersecurity threat monitoring requirement in section 7123(c)(12) was unclear and difficult to follow.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 87", verified_on: "2026-08-23" },
      curation_note:
        "(c)(12)/(13) readability revision — drafting history behind the c12/c13 split (fcl-L3). Tier-2 demotion.",
    },
    {
      id: "cppa-cyber/c15/fc-01",
      factor_id: "Oversight of service providers, contractors, and third parties",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "702ef0bb-1926-4395-bb4d-29f3cede667f",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Regulation 11 CCR § 7123(c)(15) addresses oversight requirements for service providers handling consumer personal information.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 88", verified_on: "2026-08-23" },
      curation_note:
        "(c)(15) oversight retained against a deletion request — provision-retained support behind the aaeefa5a rationale row. Tier-2 demotion.",
    },
    {
      id: "cppa-cyber/c16/fc-01",
      factor_id: "Retention schedules and proper disposal of personal information",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "3771a7b4-6b7c-470e-8c42-383d44ec2208",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether the CPPA should eliminate regulatory requirements describing how businesses must properly dispose of personal information.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 88", verified_on: "2026-08-23" },
      curation_note:
        "(c)(16) disposal procedures retained — provision-retained trivia. Tier-2 demotion.",
    },
    {
      id: "cppa-cyber/c17/fc-01",
      factor_id: "Security-incident response management",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "06ee81d5-937e-428c-8688-da2f42fa7589",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue concerns whether cybersecurity audit provisions should use \"i.e.\" (that is) or \"e.g.\" (for example) to define scope.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 89", verified_on: "2026-08-23" },
      curation_note:
        "The \"i.e.\" exhaustive-definition retention in (c)(17) — i.e.-vs-e.g. drafting trivia (doc 62 §1's named example of a Tier-2 row). Demoted.",
    },

    // ── Procedural FC-J (dark; doc 54 §2c — build-time provenance for the
    // conversion's decision tables; R2: never prints; register rows L1/L7/
    // L8/L9/L10/L11/L12 above already carry their factors' primaries). ──
    // P1 — Applicability and thresholds (§ 7120)
    {
      id: "cppa-cyber/P1/fc-01",
      factor_id: "Applicability and thresholds",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "8537edab-a403-41af-a8e2-36bc79c16848",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether the cybersecurity audit thresholds in section 7120(b) are appropriately calibrated to identify businesses presenting significant risk to consumer security.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 64", verified_on: "2026-08-23" },
      curation_note:
        "The 250,000-consumer / 50,000-sensitive-PI thresholds retained against narrowing — doc 64 §1 A2 conformance evidence.",
    },
    {
      id: "cppa-cyber/P1/fc-02",
      factor_id: "Applicability and thresholds",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "67ddb51a-aac6-417d-8265-4e184a9de832",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether the cybersecurity audit triggers in § 7120(b) are authorized by the CCPA and appropriately tailored to business size and risk.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 66", verified_on: "2026-08-23" },
      curation_note:
        "§ 7120(b) triggers lawful and tailored — doc 64 §1 A1 conformance evidence.",
    },
    {
      id: "cppa-cyber/P1/fc-03",
      factor_id: "Applicability and thresholds",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "cc96acc3-ef06-46df-a881-9c9973280c51",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Section 7120 establishes the gross revenue threshold to determine which businesses must conduct cybersecurity audits under the California Privacy Protection Agency's regulations.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 66", verified_on: "2026-08-23" },
      curation_note:
        "Gross-revenue threshold taken from the statute — doc 64 §1 A1 conformance evidence.",
    },
    {
      id: "cppa-cyber/P1/fc-04",
      factor_id: "Applicability and thresholds",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "8109b58a-d385-4a85-93af-02fe6692ef04",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The CPPA was asked whether cybersecurity audit obligations under section 7120 should be limited to only those significant-risk activities defined in section 7150.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 65", verified_on: "2026-08-23" },
      curation_note:
        "Audit scope NOT limited to § 7150 significant-risk activities — the audit trigger stands on § 7120(b)'s own thresholds. Doc 64 §1 A2 conformance evidence.",
    },
    {
      id: "cppa-cyber/P1/fc-05",
      factor_id: "Applicability and thresholds",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "ebd4ab30-ebdf-40c0-8aed-8a89b3303a3e",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The regulatory issue is which entities bear responsibility for identifying and documenting their obligations under California privacy law.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 88", verified_on: "2026-08-23" },
      curation_note:
        "MIS-SHELVED ROW, allocated by content (the two-package trap): labeled \"(c)(14)\" but its substance is § 7120(b) threshold responsibility — any business meeting either threshold identifies and documents its own obligations. Doc 54 §2c's bridge-note allocation to P1, not c14.",
    },
    // P2 — Deadline tier and cadence (§ 7121); the doc 64 conformance set
    {
      id: "cppa-cyber/P2/fc-01",
      factor_id: "Deadline tier and cadence",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "e810dd63-d8e4-4639-bb77-171f52f86a75",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The Agency addressed the timing and deadlines for completing mandatory cybersecurity audits under 11 CCR § 7121.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note:
        "12-month audit period ending January 1; report by April 1; deadlines aligned with §§ 7124(b)/7157(a) — doc 64 §3 conformance evidence.",
    },
    {
      id: "cppa-cyber/P2/fc-02",
      factor_id: "Deadline tier and cadence",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "59ddcdd2-2cf3-4065-a39d-3ac27150cc56",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "California's privacy regulator clarified the timing requirements for cybersecurity audit periods and report completion deadlines that take effect after April 1, 2030, under 11 CCR § 7121(b).",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "p. 20", verified_on: "2026-08-23" },
      curation_note: "Post-2030 steady-state timing — doc 64 §3 conformance evidence.",
    },
    {
      id: "cppa-cyber/P2/fc-03",
      factor_id: "Deadline tier and cadence",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "56d825a9-36fc-4212-a60c-1dc03d62d08a",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether cybersecurity audit requirements should be limited to activities occurring only within 24 months after the regulations take effect.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 68", verified_on: "2026-08-23" },
      curation_note:
        "The phased approach adopted OVER the 24-month proposal — doc 64 §2 T1 conformance evidence.",
    },
    {
      id: "cppa-cyber/P2/fc-04",
      factor_id: "Deadline tier and cadence",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "30096b68-b8f7-4e04-8a3d-9fc49d329d08",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Section 7121 establishes timing requirements for when businesses must complete annual cybersecurity audits and their corresponding audit reports.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note:
        "Three-year revenue-based phase-in with clarified audit periods — doc 64 §2 conformance evidence.",
    },
    {
      id: "cppa-cyber/P2/fc-05",
      factor_id: "Deadline tier and cadence",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "0aa22547-8272-4eaf-b59e-85bc37959004",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The regulatory issue is whether cybersecurity audit requirements under section 7121 should include a phased implementation timeline and separate requirements for post-implementation periods.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note:
        "The Jan-1-2027→Apr-1-2030 phase-in schedule and the post-2030 (b) split — doc 64 §§2–3 conformance evidence.",
    },
    {
      id: "cppa-cyber/P2/fc-06",
      factor_id: "Deadline tier and cadence",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "8bf9c38c-e2d3-477e-8c3b-754e774d02bf",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether businesses need adequate time to establish cybersecurity audit processes and whether the regulation should specify when the first audit must be conducted.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 68", verified_on: "2026-08-23" },
      curation_note: "First-audit lead-time rationale — doc 64 §2 T3 conformance evidence.",
    },
    {
      id: "cppa-cyber/P2/fc-07",
      factor_id: "Deadline tier and cadence",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "eb1af5f9-ffb3-4ecb-8f82-d180a0afbb1f",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether California should allow incident-based cybersecurity audits instead of requiring annual audits to align with other states' approaches.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 68", verified_on: "2026-08-23" },
      curation_note:
        "Annual cadence retained against incident-based alternatives (statutory mandate) — doc 64 §3 conformance evidence; support behind fcl-L9.",
    },
    // P3 — Audit thoroughness and independence (§ 7122)
    {
      id: "cppa-cyber/P3/fc-01",
      factor_id: "Audit thoroughness and independence",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "891ed495-a5be-41ef-b9b3-9e11b1a0efcc",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The California Privacy Protection Agency clarified the qualifications required for auditors conducting independent cybersecurity audits under CPRA requirements.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "p. 21", verified_on: "2026-08-23" },
      curation_note:
        "Auditor qualifications: cybersecurity knowledge + audit expertise, a flexible performance standard (§ 7122(a)(1)).",
    },
    {
      id: "cppa-cyber/P3/fc-02",
      factor_id: "Audit thoroughness and independence",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "50dbb1dc-8039-400e-ba0f-c0a327c25717",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The California Privacy Protection Agency clarified whether auditors can make recommendations to businesses without compromising their independence under 11 CCR § 7122(a)(1).",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "p. 21", verified_on: "2026-08-23" },
      curation_note:
        "Recommendations do not compromise independence; \"or appear to\" deleted from the standard (§ 7122(a)(1)).",
    },
    {
      id: "cppa-cyber/P3/fc-03",
      factor_id: "Audit thoroughness and independence",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "9865ab0b-1d10-4f31-b322-841b1c906ceb",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Section 7122(a) addresses independence requirements for auditors conducting California privacy audits.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 71", verified_on: "2026-08-23" },
      curation_note:
        "Internal auditors permitted; executive-management oversight; performance evaluations optional (§ 7122(a)).",
    },
    {
      id: "cppa-cyber/P3/fc-04",
      factor_id: "Audit thoroughness and independence",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "d495f427-889e-47a4-ba09-1c5e518ef720",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Section 7122(a)(2) addresses the reporting structure and oversight of internal auditors to ensure their independence from the cybersecurity program.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "p. 21", verified_on: "2026-08-23" },
      curation_note:
        "Highest-ranking-internal-auditor reporting; board model replaced with a no-cyber-responsibility executive (§ 7122(a)(2)).",
    },
    {
      id: "cppa-cyber/P3/fc-05",
      factor_id: "Audit thoroughness and independence",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "21954be0-8086-4226-bbf4-2b62e091c527",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The regulatory issue is how to structure internal auditor independence and reporting requirements for California businesses' cybersecurity programs.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note:
        "The § 7122(a)(3) companion of fc-04: highest-ranking-auditor scope, discretionary evaluations (\"if any\").",
    },
    {
      id: "cppa-cyber/P3/fc-06",
      factor_id: "Audit thoroughness and independence",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "3f719302-3318-4ef8-834e-fc8d53ffae1e",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The regulatory issue is whether auditors should be required to make decisions about the audit scope and conduct independent of business influence.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 72", verified_on: "2026-08-23" },
      curation_note:
        "Scope-decision independence retained — \"decisions and\" language kept in § 7122(a)(2).",
    },
    {
      id: "cppa-cyber/P3/fc-07",
      factor_id: "Audit thoroughness and independence",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "125b0777-ebcd-4cff-86cd-28d6c36a4378",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether cybersecurity audit findings should be based on specific evidence rather than business management attestations.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 72", verified_on: "2026-08-23" },
      curation_note:
        "Evidence over management attestation (§ 7122(d)) — the product's own rate-on-evidence discipline has the Agency's rationale behind it.",
    },
    {
      id: "cppa-cyber/P3/fc-08",
      factor_id: "Audit thoroughness and independence",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "e4c29259-99aa-44b1-9997-c52bf5a42f7e",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether auditors conducting CPRA compliance audits must receive disclosure of attorney-client privileged or other legally protected information.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 72", verified_on: "2026-08-23" },
      curation_note:
        "No affirmative duty to disclose privileged materials to auditors (§ 7122(b)).",
    },
    {
      id: "cppa-cyber/P3/fc-09",
      factor_id: "Audit thoroughness and independence",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "9153e06c-c5df-4aeb-b67b-a6bb58dfab40",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether cybersecurity audit reporting requirements should mandate board or governing body involvement to preserve auditor independence.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 32", verified_on: "2026-08-23" },
      curation_note:
        "Board reporting replaced by executive-management reporting (§ 7122(f)); voluntary board involvement preserved.",
    },
    {
      id: "cppa-cyber/P3/fc-10",
      factor_id: "Audit thoroughness and independence",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "e6a7272c-3cd2-4bfe-ad64-c6e3dff69251",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The regulatory issue is whether cybersecurity audit reports must be reported to a business's board of directors or governing body, or alternatively to senior management responsible for cybersecurity.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "p. 22", verified_on: "2026-08-23" },
      curation_note:
        "The § 7122(h) report recipient: an executive-management member WITH direct cybersecurity responsibility (distinct from the (a)(2)/(f) no-responsibility oversight roles — keep the two straight in C1 fixed blocks).",
    },
    // P4 — Audit-report content (§ 7123(d)/(e))
    {
      id: "cppa-cyber/P4/fc-01",
      factor_id: "Audit-report content",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "0655df15-77bd-46dd-aef1-65fa4a6dc857",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue was whether businesses must list all individuals responsible for their cybersecurity audit program or whether some flexibility could be provided when multiple employees share these responsibilities.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "p. 27", verified_on: "2026-08-23" },
      curation_note:
        "≤3 titles of responsible individuals (old-numbering \"(c)(4)\" label; final § 7123(e)(6) family — two-package trap, content-allocated to P4).",
    },
    {
      id: "cppa-cyber/P4/fc-02",
      factor_id: "Audit-report content",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "d053c7ba-73d8-463c-9966-b3a218e81ffe",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether businesses must disclose the names of senior cybersecurity personnel responsible for their audit programs, or whether titles alone would suffice.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 91", verified_on: "2026-08-23" },
      curation_note: "(e)(6): titles, not names — up to three.",
    },
    {
      id: "cppa-cyber/P4/fc-03",
      factor_id: "Audit-report content",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "4ec4ae25-9ddf-482d-8f2c-be8633db2575",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether auditor certification of independence and auditor identification information should be mandatory or optional requirements.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 91", verified_on: "2026-08-23" },
      curation_note:
        "(e)(8): independence certification mandatory; highest-ranking auditor signs.",
    },
    {
      id: "cppa-cyber/P4/fc-04",
      factor_id: "Audit-report content",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "60369cb9-d54d-42d5-8b57-ebd5e673089a",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether cybersecurity audit requirements under section 7123(e)(9) improperly duplicate existing breach notification laws, violate federal banking authority, or create security risks.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 91", verified_on: "2026-08-23" },
      curation_note:
        "(e)(9): breach-notification reporting retained in audit scope. DATA-QUALITY: this row's stored summary is truncated mid-word (new T2 finding this session); first sentence intact and pinned.",
    },
    {
      id: "cppa-cyber/P4/fc-05",
      factor_id: "Audit-report content",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "ae0c29c3-47b9-410c-9523-f19aef3c835c",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether cybersecurity audit requirements under § 7123(e)(10) should be limited to breaches affecting California consumers and whether detailed disclosures could expose corporate vulnerabilities.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 92", verified_on: "2026-08-23" },
      curation_note:
        "(e)(10): scope not CA-limited; out-of-state agency-notification references removed. DATA-QUALITY: stored summary truncated mid-word (new T2 finding this session); first sentence intact and pinned.",
    },
    {
      id: "cppa-cyber/P4/fc-06",
      factor_id: "Audit-report content",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "ee3244a1-6d2a-4282-98cc-78a302208cfc",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether audit management action plans must describe the resources allocated to resolve identified deficiencies.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 90", verified_on: "2026-08-23" },
      curation_note: "(e)(4): resource-allocation description removed.",
    },
    {
      id: "cppa-cyber/P4/fc-07",
      factor_id: "Audit-report content",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "8a7b44b1-998a-4a29-8368-ad5a7ab6e831",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The regulatory issue concerns what cybersecurity audit documentation businesses must prepare regarding resource allocation for addressing identified security gaps and weaknesses.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "p. 26", verified_on: "2026-08-23" },
      curation_note: "The (e)(4) removal's final-package record — companion of fc-06.",
    },
    {
      id: "cppa-cyber/P4/fc-08",
      factor_id: "Audit-report content",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "e51012d6-4bb6-4540-915e-4962ccb51b6a",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Section 7123(d) requires cybersecurity audits to include identification of gaps and weaknesses in a business's security program, which the Agency determined is necessary to fulfill the CCPA's mandate for thorough audits.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 90", verified_on: "2026-08-23" },
      curation_note:
        "(d): gap identification necessary; the not-applicable equivalent-security documentation requirement deleted from (c).",
    },
    // P5 — Leverage of existing work (§ 7123(f)–(g))
    {
      id: "cppa-cyber/P5/fc-01",
      factor_id: "Leverage of existing work",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "6d771bcf-436b-4a30-96b1-7a4336d7341a",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether businesses can satisfy CPRA audit requirements by using existing cybersecurity frameworks and assessments.",
      render_eligible: false,
      trail_impact:
        "CPPA, FSOR (p. 27) — completed work usable only if it meets all Article 9 requirements — interpretive",
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "p. 27", verified_on: "2026-08-23" },
      curation_note:
        "May leverage completed work IFF all Article 9 thoroughness/independence requirements are met (alone or supplemented). Carries P5's ratified tag (doc 63 §5.3); its trail admission at conversion rides R2 via the P5 factor's render posture — P5 has no FC-L row, so this representative row stores the bytes.",
    },
    {
      id: "cppa-cyber/P5/fc-02",
      factor_id: "Leverage of existing work",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "a218d4dd-c55c-4336-8182-47044609980c",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether businesses can automatically satisfy Article 9 audit requirements by using established cybersecurity frameworks like NIST CSF.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note: "No automatic framework compliance (NIST CSF included).",
    },
    {
      id: "cppa-cyber/P5/fc-03",
      factor_id: "Leverage of existing work",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "6647ac8e-6f01-4d3a-8f3e-1d6ee2265ad8",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether businesses may satisfy the cybersecurity audit requirements in Article 9 of California Consumer Privacy Act (CCPA) regulations by relying on established security frameworks like NIST CSF, ISO 27001, or SOC 2.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 35", verified_on: "2026-08-23" },
      curation_note: "No substitute frameworks — NIST CSF/ISO 27001/SOC 2 named and rejected as substitutes.",
    },
    {
      id: "cppa-cyber/P5/fc-04",
      factor_id: "Leverage of existing work",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "053d2425-78e6-4e8f-b6ef-b511ec820495",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Section 7123(f) addresses whether businesses can satisfy cybersecurity audit requirements using existing federal or globally recognized frameworks instead of conducting independent audits.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 93", verified_on: "2026-08-23" },
      curation_note: "The no-substitute-frameworks record's second instance (Appendix package).",
    },
    {
      id: "cppa-cyber/P5/fc-05",
      factor_id: "Leverage of existing work",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "ece8235b-fa4a-4e8a-b96c-5e53808ddb89",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Regulation 11 CCR § 7123(f) addresses the cybersecurity standards that businesses must follow to maintain reasonable security of personal information.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 36", verified_on: "2026-08-23" },
      curation_note:
        "NIST CSF retained as an acceptable REFERENCE framework (not a substitute) — the W6-CYBER-FIX optional-crosswalk rule's corpus grounding.",
    },
    {
      id: "cppa-cyber/P5/fc-06",
      factor_id: "Leverage of existing work",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "6dd7166f-e763-4b69-93eb-78123dddcc55",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether all auditors or only the highest-ranking auditor must sign the independence certification statement for cybersecurity audits.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "p. 27", verified_on: "2026-08-23" },
      curation_note: "(g): highest-ranking auditor signs the independence certification.",
    },
    // P6 — Submission and attestation (§ 7124); fcl-L11 carries the primary
    {
      id: "cppa-cyber/P6/fc-01",
      factor_id: "Submission and attestation",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "c4623e97-a988-4e63-877b-a418978386e8",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The Agency addressed who must certify a business's compliance with cybersecurity audit requirements under section 7124(c).",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 96", verified_on: "2026-08-23" },
      curation_note: "Executive signer, not board (§ 7124(c)) — Appendix-package record.",
    },
    {
      id: "cppa-cyber/P6/fc-02",
      factor_id: "Submission and attestation",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "71774ef5-aaae-4080-9608-32ae14cfbef9",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue was who must sign and submit a cybersecurity audit certification on behalf of a business.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "p. 28", verified_on: "2026-08-23" },
      curation_note: "Signer qualifications: direct responsibility, sufficient knowledge, submission authority (§ 7124(c)).",
    },
    {
      id: "cppa-cyber/P6/fc-03",
      factor_id: "Submission and attestation",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "4518ac21-d985-44f1-801e-1321430a164f",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is who must sign and submit a cybersecurity audit certification to the California Privacy Protection Agency.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note: "The § 7124(c) signer record's third instance.",
    },
    {
      id: "cppa-cyber/P6/fc-04",
      factor_id: "Submission and attestation",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "2931daf7-bd52-46ee-8031-6e83248eaf09",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue addressed whether businesses must submit separate cybersecurity audit certifications for each calendar year they are subject to audit requirements.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "p. 28", verified_on: "2026-08-23" },
      curation_note: "Per-required-year certification (§ 7124(a)).",
    },
    {
      id: "cppa-cyber/P6/fc-05",
      factor_id: "Submission and attestation",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "78630695-0dc4-4a55-8868-c431e59b970f",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is when businesses must submit their cybersecurity audit completion certification to the Agency.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "p. 28", verified_on: "2026-08-23" },
      curation_note: "April 1 certification deadline, aligned with § 7121 (§ 7124(b)).",
    },
    {
      id: "cppa-cyber/P6/fc-06",
      factor_id: "Submission and attestation",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "50649925-18ea-423a-b149-3b1555eb6530",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The regulatory issue concerns whether business submissions to the Agency must include certification under penalty of perjury and what identifying information must accompany such certification.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note: "Penalty of perjury + name/title/date (§ 7124(d)(5)).",
    },
    {
      id: "cppa-cyber/P6/fc-07",
      factor_id: "Submission and attestation",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "d073ab32-302d-41f4-8a62-f89d2aa7725e",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether businesses must obtain board-level signed certification of cybersecurity audit independence.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note: "No-influence attestation by the certifier; no separate board signature (§ 7124(d)(4)).",
    },
    {
      id: "cppa-cyber/P6/fc-08",
      factor_id: "Submission and attestation",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "545698d4-8573-439f-8067-dc9b78c7d262",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The regulatory issue is whether cybersecurity audit certifications should require the auditor to attest to their independence and confirm the business did not attempt to influence the audit.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note: "The (d)(4) attestation content: independence, truth under perjury, no influence.",
    },
    {
      id: "cppa-cyber/P6/fc-09",
      factor_id: "Submission and attestation",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "feb77e05-0c2e-4f82-9f8d-516e5cae3423",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether businesses may submit alternate cybersecurity audit documentation instead of annual certificates of completion under California's privacy law requirements.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 95", verified_on: "2026-08-23" },
      curation_note: "No substitute documentation for the certification (§ 7124).",
    },
    {
      id: "cppa-cyber/P6/fc-10",
      factor_id: "Submission and attestation",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "40ae8c3b-6656-495a-b171-5fec59f1d1fe",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether Section 7124 should include substitute documentation provisions, an affirmative defense for good-faith compliance, alignment with industry frameworks, and whether the audit thresholds and annual cadence are appropriate.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 36 (cont.)", verified_on: "2026-08-23" },
      curation_note:
        "Substitute documentation, affirmative defenses, and framework alignment all rejected for § 7124; annual cadence reaffirmed.",
    },
  ],
};
