/**
 * CPPA-RISK FACTOR REGISTRY (Legal Test v2.1, Phase-1 authoring)
 * ---------------------------------------------------------------
 * The § 7152(a)(4)-(6) weighing factor list — benefit stakeholders,
 * negative-impact categories, and safeguard considerations — authored
 * VERBATIM from the OAL-approved regulation text and each row bound
 * to a corpus pinpoint plus a guidance_refs[] set drawn from
 * cppa_fsor_commentary. Domain: cppa-ca ONLY (Q4(e) authority-domain).
 * v2.3 (CEO 2026-07-26): factor rows may also carry `us-federal` (binding)
 * on any U.S.-forum plan; sister-state tags are rejected at binding tier
 * by V8. All existing rows here remain cppa-ca; no data change.
 *
 * Verbatim text was sourced from provision_texts.cppa-7152 (approved
 * this turn, mirror of cppa_authorities '11 CCR § 7152' full_text).
 *
 * NO WIRING: this file is data. Phase 2 imports it into Pass-1
 * derivation and feeds Pass G candidate-set construction.
 */

import type { JurisdictionTag, StatutoryAnchor } from "../legal-test/cppa-risk-conclusions.ts";

export type FactorKind = "benefit" | "negative_impact" | "safeguard";

export interface GuidanceRef {
  /** Corpus table the guidance row lives in. */
  readonly source_table: "cppa_fsor_commentary" | "cppa_fsor_callouts";
  /** Statutory citation the guidance row is filed under. */
  readonly regulation_citation: string;
  /** Page reference (nullable for rows without a page_ref). */
  readonly page_ref: string | null;
  /** Short human anchor to the row's agency_position_summary. */
  readonly anchor_hint: string;
  /** v2.2 — factor-registry guidance_refs are BINDING-tier only (CA interpretive material). Registry lint rejects any other value. */
  readonly authority_weight: "binding";
}

export interface FactorRow {
  readonly id: string;
  readonly kind: FactorKind;
  readonly jurisdiction_tag: JurisdictionTag;
  /** Verbatim label (mirrors reg text as closely as a label allows). */
  readonly label: string;
  /** Verbatim excerpt from the regulation for pin-test binding. */
  readonly verbatim_excerpt: string;
  readonly anchor: StatutoryAnchor;
  /** FSOR commentary rows discussing this factor (may be empty → T5 feed). */
  readonly guidance_refs: readonly GuidanceRef[];
  /** Non-empty = author flagged an ingestion gap for T5 (see courier). */
  readonly empty_by_finding?: string;
}

export interface WeighingTest {
  readonly test_id: string;
  readonly jurisdiction_tag: JurisdictionTag;
  readonly anchor: StatutoryAnchor;
  readonly framing_excerpt: string;
  readonly factor_ids: readonly string[];
}

const CPPA: JurisdictionTag = "cppa-ca";

// ---------------------------------------------------------------------------
// § 7152(a)(4) — BENEFITS (stakeholder categories, no enumerated sub-list)
// ---------------------------------------------------------------------------

const BENEFIT_FRAMING =
  "Identify the benefits to the business, the consumer, other stakeholders, "
  + "and the public from the processing of the personal information, as applicable.";

// FSOR-INGESTION 2026-07-27: (a)(4) benefit rows filled from existing § 7152(a)(4)-tagged
// FSOR commentary (ac2d3934 = agency's "non-generic terms + as-applicable" ruling p. 35;
// 9c6cb558 = agency's "benefits may apply to different categories of stakeholders" ruling
// Appendix p. 139). Both are BINDING (CPPA FSOR). Shared across all four stakeholder rows
// because the agency's ruling is that benefit specificity + differential applicability
// apply to every stakeholder category uniformly.
const BENEFIT_GUIDANCE: readonly GuidanceRef[] = [
  {
    source_table: "cppa_fsor_commentary",
    regulation_citation: "11 CCR § 7152(a)(4)",
    page_ref: "p. 35",
    anchor_hint: "identify benefits in specific, non-generic terms; 'as applicable' allows differential stakeholder coverage",
    authority_weight: "binding",
  },
  {
    source_table: "cppa_fsor_commentary",
    regulation_citation: "11 CCR § 7152(a)(4)",
    page_ref: "Appendix, p. 139",
    anchor_hint: "benefits from data processing may apply to different categories of stakeholders rather than accruing universally",
    authority_weight: "binding",
  },
] as const;

const BENEFITS: readonly FactorRow[] = [
  {
    id: "benefit.business",
    kind: "benefit",
    jurisdiction_tag: CPPA,
    label: "Benefits to the business",
    verbatim_excerpt: BENEFIT_FRAMING,
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(4)" },
    guidance_refs: BENEFIT_GUIDANCE,
  },
  {
    id: "benefit.consumer",
    kind: "benefit",
    jurisdiction_tag: CPPA,
    label: "Benefits to the consumer",
    verbatim_excerpt: BENEFIT_FRAMING,
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(4)" },
    guidance_refs: BENEFIT_GUIDANCE,
  },
  {
    id: "benefit.other_stakeholders",
    kind: "benefit",
    jurisdiction_tag: CPPA,
    label: "Benefits to other stakeholders",
    verbatim_excerpt: BENEFIT_FRAMING,
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(4)" },
    guidance_refs: BENEFIT_GUIDANCE,
  },
  {
    id: "benefit.public",
    kind: "benefit",
    jurisdiction_tag: CPPA,
    label: "Benefits to the public",
    verbatim_excerpt: BENEFIT_FRAMING,
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(4)" },
    guidance_refs: BENEFIT_GUIDANCE,
  },
] as const;

// ---------------------------------------------------------------------------
// § 7152(a)(5)(A)-(H) — NEGATIVE IMPACT CATEGORIES (verbatim)
// ---------------------------------------------------------------------------

const NEGATIVE_IMPACTS: readonly FactorRow[] = [
  {
    id: "neg.a.unauthorized_access",
    kind: "negative_impact",
    jurisdiction_tag: CPPA,
    label: "Unauthorized access, destruction, use, modification, or disclosure",
    verbatim_excerpt:
      "Unauthorized access, destruction, use, modification, or disclosure of personal information; and unauthorized "
      + "activity resulting in the loss of availability of personal information.",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(5)(A)" },
    guidance_refs: [
      {
        source_table: "cppa_fsor_commentary",
        regulation_citation: "11 CCR § 7152",
        page_ref: "Appendix, p. 134",
        anchor_hint: "balance privacy risks against broader benefits to various stakeholders",
        authority_weight: "binding",
      },
    ],
  },
  {
    id: "neg.b.discrimination",
    kind: "negative_impact",
    jurisdiction_tag: CPPA,
    label: "Discrimination on protected characteristics",
    verbatim_excerpt:
      "Discrimination upon the basis of protected characteristics that would violate federal or state law.",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(5)(B)" },
    guidance_refs: [
      {
        source_table: "cppa_fsor_commentary",
        regulation_citation: "11 CCR § 7152",
        page_ref: "Appendix, p. 130",
        anchor_hint: "transparency, accountability, and harm mitigation measures for ADMT",
        authority_weight: "binding",
      },
    ],
  },
  {
    id: "neg.c.impaired_control",
    kind: "negative_impact",
    jurisdiction_tag: CPPA,
    label: "Impairing consumers' control over their personal information",
    verbatim_excerpt:
      "Impairing consumers' control over their personal information, such as by providing insufficient information for "
      + "consumers to make an informed decision regarding the processing of their personal information, or by interfering "
      + "with consumers' ability to make choices consistent with their reasonable expectations.",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(5)(C)" },
    // FSOR-INGESTION 2026-07-27: b759265d (§ 7152(a)(5), p. 36) — Agency's own ruling that
    // failing to provide sufficient information for informed decision-making is "already
    // covered under subsection (a)(5)(C)'s prohibition on impairing consumers' control".
    // Directly on-point for neg.c; no cross-provision reach required.
    guidance_refs: [
      {
        source_table: "cppa_fsor_commentary",
        regulation_citation: "11 CCR § 7152(a)(5)",
        page_ref: "p. 36",
        anchor_hint: "insufficient disclosure for informed decision-making is covered under (a)(5)(C)'s impairing-control prohibition",
        authority_weight: "binding",
      },
    ],
  },
  {
    id: "neg.d.coercion_dark_patterns",
    kind: "negative_impact",
    jurisdiction_tag: CPPA,
    label: "Coercion or compulsion (including dark patterns)",
    verbatim_excerpt:
      "Coercing or compelling consumers into allowing the processing of their personal information, such as by "
      + "conditioning consumers' acquisition or use of an online service upon their disclosure of personal information "
      + "that is unnecessary to the expected functionality of the service, or requiring consumers to consent to "
      + "processing when such consent cannot be freely given (e.g., because it was obtained through the use of a dark pattern).",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(5)(D)" },
    // FSOR-INGESTION 2026-07-27: a434b098 (§ 7152(a)(5)(D), p. 36) — Agency's own ruling
    // that (a)(5)(D) was modified to add the dark-pattern example clarifying "freely given"
    // consent. Directly on-point § 7152-tagged row; cross-provision reach to § 7004 no
    // longer needed. 8838a330 (§ 7152(a)(5), p. 141) retains the coercion example.
    guidance_refs: [
      {
        source_table: "cppa_fsor_commentary",
        regulation_citation: "11 CCR § 7152(a)(5)(D)",
        page_ref: "p. 36",
        anchor_hint: "(a)(5)(D) modified to add dark-pattern example demonstrating consent that fails the 'freely given' standard",
        authority_weight: "binding",
      },
      {
        source_table: "cppa_fsor_commentary",
        regulation_citation: "11 CCR § 7152(a)(5)",
        page_ref: "Appendix, p. 141",
        anchor_hint: "coercion example retained as helpful guidance for identifying compelled-processing harms",
        authority_weight: "binding",
      },
    ],
  },
  {
    id: "neg.e.economic_harms",
    kind: "negative_impact",
    jurisdiction_tag: CPPA,
    label: "Economic harms",
    verbatim_excerpt:
      "Economic harms, including limiting or depriving consumers of economic opportunities, charging consumers higher "
      + "prices, or compensating consumers at lower rates based upon profiling; or imposing additional costs upon "
      + "consumers, including costs associated with the unauthorized access to consumers' personal information.",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(5)(E)" },
    // FSOR-INGESTION 2026-07-27: adeb9b63 (p. 36) is filed under the FSOR's pre-modification
    // (a)(5)(F) label but the Agency's ruling addresses economic-harm framing verbatim
    // ("based upon profiling" clarification for economic harms). Substance controls over
    // pre-mod pinpoint labeling; no re-tag performed (row's own citation preserved).
    guidance_refs: [
      {
        source_table: "cppa_fsor_commentary",
        regulation_citation: "11 CCR § 7152(a)(5)(F)",
        page_ref: "p. 36",
        anchor_hint: "'based upon profiling' added to clarify one pathway through which processing causes economic injury to consumers",
        authority_weight: "binding",
      },
    ],
  },
  {
    id: "neg.f.physical_harms",
    kind: "negative_impact",
    jurisdiction_tag: CPPA,
    label: "Physical harms",
    verbatim_excerpt:
      "Physical harms to consumers or to property, including processing that creates the opportunity for physical or "
      + "sexual violence.",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(5)(F)" },
    guidance_refs: [],
    // FSOR-SILENT 2026-07-27: exhaustive sweep of cppa_fsor_commentary (1,318 rows) for
    // "physical harm", "physical or sexual", "violence" surfaces no § 7152-tagged row that
    // isolates the physical-harm category. Adjacent § 7150(b) commentary discusses threshold
    // scope, not the (a)(5)(F) factor. Cross-provision analogy banned by Q4(e) v2.2 — silence
    // documented, never filled. Permanent empty-by-finding until agency issues future FSOR.
    empty_by_finding:
      "FSOR-SILENT (2026-07-27 sweep): no § 7152-tagged FSOR row addresses physical-harm framing. Silence documented; "
      + "cross-provision analogy prohibited by Q4(e). Registry lint accepts this row as permanently empty.",
  },
  {
    id: "neg.g.reputational_harms",
    kind: "negative_impact",
    jurisdiction_tag: CPPA,
    label: "Reputational harms",
    verbatim_excerpt:
      "Reputational harms, including stigmatization, that could negatively impact an average consumer, such as "
      + "stigmatization of a consumer as a result of a mobile dating application's disclosure of the consumer's sexual or "
      + "other preferences in a partner outside of the dating application.",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(5)(G)" },
    // FSOR-INGESTION 2026-07-27: ce5259bc (§ 7152(a)(5)(G), p. 141) directly retains the
    // reputational-harm examples as necessary business guidance; 93e75412 (§ 7152(a)(5)(H),
    // p. 36) records the "would→could" softening + expanded dating-app stigmatization example
    // — also on-point for (a)(5)(G) stigmatization framing per agency's own linkage.
    guidance_refs: [
      {
        source_table: "cppa_fsor_commentary",
        regulation_citation: "11 CCR § 7152(a)(5)(G)",
        page_ref: "Appendix, p. 141",
        anchor_hint: "reputational-harm examples retained as necessary business guidance for identifying stigmatization risks",
        authority_weight: "binding",
      },
      {
        source_table: "cppa_fsor_commentary",
        regulation_citation: "11 CCR § 7152",
        page_ref: null,
        anchor_hint: "'would' changed to 'could' in (G)/(H); stigmatization example expanded to show disclosure outside expected context",
        authority_weight: "binding",
      },
    ],
  },
  {
    id: "neg.h.psychological_harms",
    kind: "negative_impact",
    jurisdiction_tag: CPPA,
    label: "Psychological harms",
    verbatim_excerpt:
      "Psychological harms, including emotional distress, stress, anxiety, embarrassment, fear, frustration, shame, and "
      + "feelings of violation, that could negatively impact an average consumer. Examples of such harms include emotional "
      + "distress resulting from disclosure of nonconsensual intimate imagery or disclosure of a consumer's purchase of "
      + "pregnancy tests or emergency contraception for non-medical purposes.",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(5)(H)" },
    // FSOR-INGESTION 2026-07-27: 805bb0ff (§ 7152(a)(5), p. 142) — agency retains the
    // psychological-harm examples but clarifies the list is nonexhaustive and does not
    // require expert-level mental-health assessments. 9f93100b (§ 7152) records the
    // "would→could" softening + emotional-distress "disclosure" clarification for sensitive
    // health information. Both binding, directly on-point.
    guidance_refs: [
      {
        source_table: "cppa_fsor_commentary",
        regulation_citation: "11 CCR § 7152(a)(5)",
        page_ref: "Appendix, p. 142",
        anchor_hint: "psychological-harm list is nonexhaustive; businesses need not perform expert-level mental-health assessments",
        authority_weight: "binding",
      },
      {
        source_table: "cppa_fsor_commentary",
        regulation_citation: "11 CCR § 7152",
        page_ref: null,
        anchor_hint: "'would' changed to 'could' in (G)/(H); 'disclosure' added to emotional-distress example for sensitive health information",
        authority_weight: "binding",
      },
    ],
  },
] as const;

// ---------------------------------------------------------------------------
// § 7152(a)(6)(A)(i)-(iv) — SAFEGUARD CATEGORIES (verbatim)
// ---------------------------------------------------------------------------

const SAFEGUARDS: readonly FactorRow[] = [
  {
    id: "safe.i.technical_controls",
    kind: "safeguard",
    jurisdiction_tag: CPPA,
    label: "Technical / architectural controls",
    verbatim_excerpt:
      "Encryption, segmentation of information systems, physical and logical access controls, change management, "
      + "network monitoring and defenses, and data and integrity monitoring.",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(6)(A)(i)" },
    guidance_refs: [
      {
        source_table: "cppa_fsor_commentary",
        regulation_citation: "11 CCR § 7152",
        page_ref: null,
        anchor_hint: "clarified risk assessment documentation requirements under 11 CCR § 7152(a) to streamline safeguards",
        authority_weight: "binding",
      },
    ],
  },
  {
    id: "safe.ii.privacy_enhancing_technologies",
    kind: "safeguard",
    jurisdiction_tag: CPPA,
    label: "Privacy-enhancing technologies",
    verbatim_excerpt:
      "Use of privacy-enhancing technologies, such as trusted execution environments, federated learning, homomorphic "
      + "encryption, and differential privacy.",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(6)(A)(ii)" },
    guidance_refs: [],
    empty_by_finding: "No § 7152-tagged FSOR row specifically on PETs. T5 candidate.",
  },
  {
    id: "safe.iii.external_consultation",
    kind: "safeguard",
    jurisdiction_tag: CPPA,
    label: "External consultation / knowledge of emergent risks",
    verbatim_excerpt:
      "Consulting external parties, such as those described in section 7151, subsection (b), to ensure that the business "
      + "maintains current knowledge of emergent privacy risks and countermeasures; and using that knowledge to identify, "
      + "assess, and mitigate risks to consumers' privacy.",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(6)(A)(iii)" },
    guidance_refs: [],
  },
  {
    id: "safe.iv.admt_governance",
    kind: "safeguard",
    jurisdiction_tag: CPPA,
    label: "ADMT governance policies and training",
    verbatim_excerpt:
      "Implementing policies, procedures, and training to ensure that the business's ADMT works for the business's "
      + "purpose and does not unlawfully discriminate based upon protected characteristics.",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(6)(A)(iv)" },
    guidance_refs: [
      {
        source_table: "cppa_fsor_commentary",
        regulation_citation: "11 CCR § 7152",
        page_ref: "p. 37",
        anchor_hint: "businesses using ADMT in risk assessments must identify specific evaluations, policies, procedures, and training",
        authority_weight: "binding",
      },
    ],
  },
] as const;

// ---------------------------------------------------------------------------
// The one Type-W weighing test
// ---------------------------------------------------------------------------

export const WEIGHING_TESTS: readonly WeighingTest[] = [
  {
    test_id: "test.cppa-7152.balance",
    jurisdiction_tag: CPPA,
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)" },
    framing_excerpt:
      "A business must conduct a risk assessment to determine whether the risks to consumers' privacy from the "
      + "processing of personal information outweigh the benefits to the consumer, the business, other stakeholders, and "
      + "the public from that same processing.",
    factor_ids: [
      ...BENEFITS.map((f) => f.id),
      ...NEGATIVE_IMPACTS.map((f) => f.id),
      ...SAFEGUARDS.map((f) => f.id),
    ],
  },
];

// ---------------------------------------------------------------------------
// Public registry
// ---------------------------------------------------------------------------

export const CPPA_RISK_FACTORS: readonly FactorRow[] = [
  ...BENEFITS,
  ...NEGATIVE_IMPACTS,
  ...SAFEGUARDS,
];

export const CPPA_RISK_FACTOR_INDEX: Readonly<Record<string, FactorRow>> =
  Object.freeze(Object.fromEntries(CPPA_RISK_FACTORS.map((f) => [f.id, f])));

export function factorsByKind(kind: FactorKind): readonly FactorRow[] {
  return CPPA_RISK_FACTORS.filter((f) => f.kind === kind);
}

export function emptyByFindingGaps(): readonly FactorRow[] {
  return CPPA_RISK_FACTORS.filter((f) => Boolean(f.empty_by_finding));
}
