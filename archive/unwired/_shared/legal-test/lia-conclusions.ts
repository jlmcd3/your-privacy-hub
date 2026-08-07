/**
 * LIA CONCLUSION INVENTORY (Legal Test v2.3, Phase-1 authoring)
 * -------------------------------------------------------------
 * Every assertable conclusion the run-li-assessment generator can emit,
 * tagged R/W/J per docs/design/LEGAL-TEST.md and jurisdiction-scoped per
 * Q4(e) authority-domain matching (v2.3 federal-qualification carry-through).
 *
 * DOMAIN: GDPR product. jurisdiction_tag is either `gdpr-eu` or `gdpr-uk`;
 * per LEGAL-TEST v2.3 GDPR/UK plans admit NO U.S./CA material in any tier
 * (binding OR persuasive). UK sub-tag is used only for report units the
 * LI assessment explicitly distinguishes (UK controllers, UK-only DP Act
 * cross-refs); UK units currently render with a LIMITED-GUIDANCE
 * DISCLOSURE per item 136 (CEO deferred ICO ingestion).
 *
 * STRUCTURE mirrors cppa-risk-conclusions.ts. All types are re-imported
 * from the shared render-plan schema (product-agnostic).
 *
 * SOURCES refined against the actual report surfaces emitted by
 * run-li-assessment: purpose-legitimacy section, necessity section,
 * balancing section (the three-part-test core), safeguards/mitigations
 * summary, and closing determination. Type W is reserved for the
 * three-part-test balancing conclusion (regulation phrases it as
 * "not overridden by the interests or fundamental rights and freedoms").
 * Every other conclusion is a Type R rule or a Type J reserved judgment
 * (item 136 CEO ruling: final call always reserved to the customer and
 * their counsel; Type J language enforces this in Pass 2).
 *
 * v2.2 AUTHORITY-WEIGHT: all anchors here are BINDING-tier GDPR/EU
 * authority (GDPR articles + recitals — recitals are part of the
 * regulation's text, per the LTP-LIA-PHASE-1 dispatch's classification).
 * FSOR/CPPA/CA material is inadmissible in any tier for this file.
 *
 * v2.3 FEDERAL-QUALIFICATION (2026-07-26): does NOT apply here. GDPR
 * products remain wholly outside the U.S.-forum admissibility path;
 * us-federal binding-tier crossings are rejected by V8 on any plan
 * whose jurisdiction_tag begins with "gdpr-".
 *
 * NO WIRING: this file is data only. Phase 2 wires it into the Pass-1
 * derivation over run-li-assessment.
 */

import type {
  EpistemicType,
  JurisdictionTag,
  StatutoryAnchor,
} from "../../../../supabase/functions/_shared/render-plan/schema.ts";

export type { EpistemicType, JurisdictionTag, StatutoryAnchor };

export interface ConclusionSpec {
  readonly id: string;
  readonly epistemic_type: EpistemicType;
  readonly jurisdiction_tag: JurisdictionTag;
  readonly surface: string;
  readonly anchor: StatutoryAnchor;
  readonly supporting_anchors?: readonly StatutoryAnchor[];
  readonly description: string;
  /** For Type R: the deterministic gate that produces the conclusion. */
  readonly rule_gate?: string;
  /** For Type W: reference to the factor-registry test id (see lia-factors.ts). */
  readonly weighing_test_id?: string;
  /** For Type J: who holds the reserved judgment. Per item 136, final call is always the customer + their counsel. */
  readonly reserved_to?: "business" | "legal_counsel";
}

const GDPR_EU: JurisdictionTag = "gdpr-eu";

// ---------------------------------------------------------------------------
// Type R — Rule conclusions (deterministic, gate-driven)
// ---------------------------------------------------------------------------

const RULE_CONCLUSIONS: readonly ConclusionSpec[] = [
  {
    id: "r.lawfulness.li_available",
    epistemic_type: "R",
    jurisdiction_tag: GDPR_EU,
    surface: "lawfulness",
    anchor: { corpus_key: "gdpr-art-6-1-f", pinpoint: "GDPR Art. 6(1)(f)" },
    description:
      "Art 6(1)(f) is available as a legal basis for the processing only where the controller (or a third party) "
      + "pursues a legitimate interest AND the processing is not covered by the public-authorities carve-out "
      + "(Art 6(1) closing paragraph; Recital 47).",
    supporting_anchors: [
      { corpus_key: "gdpr-recital-47", pinpoint: "GDPR Recital 47" },
    ],
    rule_gate: "G.lawfulness.li_available",
  },
  {
    id: "r.public_authority.exclusion",
    epistemic_type: "R",
    jurisdiction_tag: GDPR_EU,
    surface: "lawfulness",
    anchor: { corpus_key: "gdpr-recital-47", pinpoint: "GDPR Recital 47" },
    description:
      "The Art 6(1)(f) legal basis does not apply to processing carried out by public authorities in the performance "
      + "of their tasks. Deterministic exclusion — the render layer suppresses the LI conclusion.",
    supporting_anchors: [
      { corpus_key: "gdpr-art-6-1-f", pinpoint: "GDPR Art. 6(1)(f) (closing sentence)" },
    ],
    rule_gate: "G.public_authority.exclusion",
  },
  {
    id: "r.special_category.exclusion",
    epistemic_type: "R",
    jurisdiction_tag: GDPR_EU,
    surface: "lawfulness",
    anchor: { corpus_key: "gdpr-art-6-1-f", pinpoint: "GDPR Art. 6(1)(f)" },
    description:
      "Art 6(1)(f) alone cannot ground the processing of special categories of personal data (Art 9). An Art 9(2) "
      + "condition is additionally required; absent one, the LI conclusion must be suppressed for the special-category "
      + "slice of the processing.",
    rule_gate: "G.special_category.exclusion",
  },
  {
    id: "r.necessity.precedes_balancing",
    epistemic_type: "R",
    jurisdiction_tag: GDPR_EU,
    surface: "necessity",
    anchor: { corpus_key: "gdpr-art-6-1-f", pinpoint: "GDPR Art. 6(1)(f)" },
    description:
      "Necessity ('is necessary for the purposes of the legitimate interests') is a precondition of balancing. "
      + "Where a less-intrusive means is reasonably available, necessity fails and the balancing step is not "
      + "reached — Pass 2 must not render a balancing outcome.",
    rule_gate: "G.necessity.precedes_balancing",
  },
  {
    id: "r.purpose.presence",
    epistemic_type: "R",
    jurisdiction_tag: GDPR_EU,
    surface: "purpose",
    anchor: { corpus_key: "gdpr-art-6-1-f", pinpoint: "GDPR Art. 6(1)(f)" },
    description:
      "The report must identify a specific legitimate interest of the controller (or third party). Presence check only; "
      + "the legitimacy assessment is Type W (legality/clarity/genuineness) and any final call on adequacy is Type J.",
    rule_gate: "G.purpose.presence",
  },
  {
    id: "r.right_to_object.disclosure",
    epistemic_type: "R",
    jurisdiction_tag: GDPR_EU,
    surface: "safeguards",
    anchor: { corpus_key: "gdpr-art-6-1-f", pinpoint: "GDPR Art. 6(1)(f)" },
    description:
      "Where processing rests on Art 6(1)(f), the Art 21(1) right-to-object disclosure is a mandatory safeguard "
      + "the report must reference. Deterministic surface check.",
    rule_gate: "G.right_to_object.disclosure",
  },
];

// ---------------------------------------------------------------------------
// Type W — Weighing conclusions (three-part-test core)
// ---------------------------------------------------------------------------

const WEIGHING_CONCLUSIONS: readonly ConclusionSpec[] = [
  {
    id: "w.purpose.legitimacy",
    epistemic_type: "W",
    jurisdiction_tag: GDPR_EU,
    surface: "purpose",
    anchor: { corpus_key: "gdpr-art-6-1-f", pinpoint: "GDPR Art. 6(1)(f)" },
    description:
      "Whether the identified interest is legitimate — i.e. lawful, sufficiently clearly articulated, and "
      + "real/present (not speculative). Weighed on the factor registry's purpose-legitimacy sub-factors "
      + "(gdpr-art-6-1-f + Recital 47).",
    weighing_test_id: "test.gdpr-6-1-f.purpose_legitimacy",
  },
  {
    id: "w.necessity.least_intrusive",
    epistemic_type: "W",
    jurisdiction_tag: GDPR_EU,
    surface: "necessity",
    anchor: { corpus_key: "gdpr-art-6-1-f", pinpoint: "GDPR Art. 6(1)(f)" },
    description:
      "Whether the processing is necessary — i.e. targeted, proportionate, and not achievable by a reasonably "
      + "available less-intrusive means. Weighed as a bounded W conclusion; a firm negative feeds "
      + "r.necessity.precedes_balancing and the balancing step is suppressed.",
    weighing_test_id: "test.gdpr-6-1-f.necessity",
  },
  {
    id: "w.balance.rights_not_overridden",
    epistemic_type: "W",
    jurisdiction_tag: GDPR_EU,
    surface: "balancing",
    anchor: { corpus_key: "gdpr-art-6-1-f", pinpoint: "GDPR Art. 6(1)(f)" },
    supporting_anchors: [
      { corpus_key: "gdpr-recital-47", pinpoint: "GDPR Recital 47" },
    ],
    description:
      "Whether the interests or fundamental rights and freedoms of the data subject are overridden by the "
      + "controller's legitimate interest, taking into account the reasonable expectations of data subjects based "
      + "on their relationship with the controller. This is the core Type-W balance of the LIA.",
    weighing_test_id: "test.gdpr-6-1-f.balance",
  },
];

// ---------------------------------------------------------------------------
// Type J — Reserved judgment (final decision + close-call adequacy)
// ---------------------------------------------------------------------------
// Item 136 CEO ruling: final decisions on any LIA are reserved to the
// CUSTOMER and their counsel. Rendering language MUST frame these
// conclusions in that form ("we recommend / this analysis supports / the
// final validity determination is reserved to you and your counsel").

const RESERVED_CONCLUSIONS: readonly ConclusionSpec[] = [
  {
    id: "j.validity_determination",
    epistemic_type: "J",
    jurisdiction_tag: GDPR_EU,
    surface: "closing",
    anchor: { corpus_key: "gdpr-art-6-1-f", pinpoint: "GDPR Art. 6(1)(f)" },
    description:
      "The overall validity of the Art 6(1)(f) reliance on the facts presented. The regulation delegates this "
      + "call to the accountable controller and its advisers; the report analyses and recommends but the final "
      + "call is reserved to the customer and their counsel.",
    reserved_to: "legal_counsel",
  },
  {
    id: "j.purpose_adequacy",
    epistemic_type: "J",
    jurisdiction_tag: GDPR_EU,
    surface: "purpose",
    anchor: { corpus_key: "gdpr-art-6-1-f", pinpoint: "GDPR Art. 6(1)(f)" },
    description:
      "Whether a given legitimate-interest statement is adequately specific and defensible for the controller's "
      + "circumstances. Presence + non-generic phrasing is checked deterministically; substantive adequacy is "
      + "reserved to counsel.",
    reserved_to: "legal_counsel",
  },
  {
    id: "j.safeguard_sufficiency",
    epistemic_type: "J",
    jurisdiction_tag: GDPR_EU,
    surface: "safeguards",
    anchor: { corpus_key: "gdpr-art-6-1-f", pinpoint: "GDPR Art. 6(1)(f)" },
    description:
      "Whether the safeguards the controller plans to implement are sufficient to tip a close balance in favour "
      + "of the controller. The report inventories the safeguards claimed; sufficiency is reserved to counsel.",
    reserved_to: "legal_counsel",
  },
];

// ---------------------------------------------------------------------------
// Public inventory
// ---------------------------------------------------------------------------

export const LIA_CONCLUSIONS: readonly ConclusionSpec[] = [
  ...RULE_CONCLUSIONS,
  ...WEIGHING_CONCLUSIONS,
  ...RESERVED_CONCLUSIONS,
];

export const LIA_CONCLUSION_INDEX: Readonly<
  Record<string, ConclusionSpec>
> = Object.freeze(
  Object.fromEntries(LIA_CONCLUSIONS.map((c) => [c.id, c])),
);

export function liaConclusionsBySurface(surface: string): readonly ConclusionSpec[] {
  return LIA_CONCLUSIONS.filter((c) => c.surface === surface);
}

export function liaConclusionsByEpistemicType(
  t: EpistemicType,
): readonly ConclusionSpec[] {
  return LIA_CONCLUSIONS.filter((c) => c.epistemic_type === t);
}
