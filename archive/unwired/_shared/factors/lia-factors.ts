/**
 * LIA FACTOR REGISTRY (Legal Test v2.3, Phase-1 authoring)
 * --------------------------------------------------------
 * The three-part-test factor list for Art 6(1)(f) — purpose legitimacy,
 * necessity, and the balancing test — authored VERBATIM from
 * gdpr-art-6-1-f and Recital 47, with each row bound to a corpus
 * pinpoint plus a guidance_refs[] set drawn from EDPB Guidelines 1/2024
 * (the EDPB's dedicated legitimate-interests guidance, status=final in
 * corpus). Domain: GDPR-EU ONLY (Q4(e); UK guidance deferred per item
 * 136 — UK units carry a LIMITED-GUIDANCE DISCLOSURE at render time).
 *
 * AUTHORITY-WEIGHT DISCIPLINE (v2.2 + v2.3):
 *   - Every factor `anchor` is BINDING-tier GDPR (Art 6(1)(f) or Recital 47).
 *   - Every `guidance_refs` row is BINDING-tier EU guidance (EDPB — the
 *     EDPB is the GDPR's own consistency body; EDPB guidelines are the
 *     EU-domain binding-tier guidance track for GDPR products).
 *   - NO U.S./CA material in any tier — V3 (authority-domain) and V8
 *     (authority-weight) reject sister-track crossings on any plan whose
 *     jurisdiction_tag begins with "gdpr-".
 *   - Recital 47 is part of the regulation text (not regulator guidance)
 *     — classification recorded in the LTP-LIA-PHASE-1 courier and
 *     within the CEO's EDPB-only guidance ruling.
 *
 * EMPTY-BY-FINDING gaps are extensive here by design: EDPB Guidelines
 * 1/2024 exists (106 rows in edpb_guidelines with excerpt_text_norm),
 * but they are ingested unsectioned (section_heading IS NULL on all
 * rows), so per-sub-factor pinpointing is COARSE. Ingestion gaps are
 * logged to the T5 feed via the courier; Pass G at runtime will draw
 * from EDPB 1/2024 as the ONLY primary-tier guidance family until the
 * remaining EDPB families are re-cleaned with section headings.
 *
 * NO WIRING: this file is data. Phase 2 imports it into Pass-1
 * derivation and Pass G candidate-set construction.
 */

import type { JurisdictionTag, StatutoryAnchor } from "../../../../supabase/functions/_shared/render-plan/schema.ts";

export type FactorKind =
  | "purpose_legitimacy"
  | "necessity"
  | "reasonable_expectation"
  | "relationship_context"
  | "nature_of_data"
  | "impact"
  | "safeguard";

export interface GuidanceRef {
  readonly source_table: "edpb_guidelines";
  /** EDPB reference (mirrors edpb_guidelines.guideline_ref). */
  readonly regulation_citation: string;
  /** Section pinpoint (may be null while EDPB rows lack section_heading — logged to T5). */
  readonly page_ref: string | null;
  /** Short anchor into the excerpt_text_norm content. */
  readonly anchor_hint: string;
  /** Registry lint: LIA factor guidance_refs are BINDING-tier only (EDPB is the EU-domain binding guidance track). */
  readonly authority_weight: "binding";
}

export interface FactorRow {
  readonly id: string;
  readonly kind: FactorKind;
  readonly jurisdiction_tag: JurisdictionTag;
  readonly label: string;
  readonly verbatim_excerpt: string;
  readonly anchor: StatutoryAnchor;
  readonly guidance_refs: readonly GuidanceRef[];
  readonly empty_by_finding?: string;
}

export interface WeighingTest {
  readonly test_id: string;
  readonly jurisdiction_tag: JurisdictionTag;
  readonly anchor: StatutoryAnchor;
  readonly framing_excerpt: string;
  readonly factor_ids: readonly string[];
}

const GDPR_EU: JurisdictionTag = "gdpr-eu";

const ART_6_1_F: StatutoryAnchor = {
  corpus_key: "gdpr-art-6-1-f",
  pinpoint: "GDPR Art. 6(1)(f)",
};
const RECITAL_47: StatutoryAnchor = {
  corpus_key: "gdpr-recital-47",
  pinpoint: "GDPR Recital 47",
};

const EDPB_2024_BALANCING: GuidanceRef = {
  source_table: "edpb_guidelines",
  regulation_citation: "EDPB Guidelines 1/2024",
  page_ref: null,
  anchor_hint:
    "when performing a balancing exercise to assess whether a processing may be based on Article 6(1)(f) GDPR, special care must be taken",
  authority_weight: "binding",
};

const EDPB_2024_THREE_STEP: GuidanceRef = {
  source_table: "edpb_guidelines",
  regulation_citation: "EDPB Guidelines 1/2024",
  page_ref: null,
  anchor_hint:
    "this assessment should follow the three-step process outlined below (interest / necessity / balancing)",
  authority_weight: "binding",
};

const EDPB_2024_NECESSITY: GuidanceRef = {
  source_table: "edpb_guidelines",
  regulation_citation: "EDPB Guidelines 1/2024",
  page_ref: null,
  anchor_hint:
    "assessing what is 'necessary' involves ascertaining whether in practice the legitimate interest could reasonably be achieved by less intrusive means",
  authority_weight: "binding",
};

const EDPB_2024_REASONABLE_EXP: GuidanceRef = {
  source_table: "edpb_guidelines",
  regulation_citation: "EDPB Guidelines 1/2024",
  page_ref: null,
  anchor_hint:
    "the reasonable expectations of data subjects should be considered in the balancing test",
  authority_weight: "binding",
};

const EDPB_2024_NATURE_OF_DATA: GuidanceRef = {
  source_table: "edpb_guidelines",
  regulation_citation: "EDPB Guidelines 1/2024",
  page_ref: null,
  anchor_hint:
    "the types of data that data subjects generally consider to be more private (e.g., financial data, location data, etc.)",
  authority_weight: "binding",
};

// ---------------------------------------------------------------------------
// PURPOSE LEGITIMACY (three-part test, step 1)
// ---------------------------------------------------------------------------

const PURPOSE_FACTORS: readonly FactorRow[] = [
  {
    id: "purpose.lawful",
    kind: "purpose_legitimacy",
    jurisdiction_tag: GDPR_EU,
    label: "Interest is lawful",
    verbatim_excerpt:
      "processing is necessary for the purposes of the legitimate interests pursued by the controller or by a third party",
    anchor: ART_6_1_F,
    guidance_refs: [EDPB_2024_THREE_STEP],
  },
  {
    id: "purpose.clearly_articulated",
    kind: "purpose_legitimacy",
    jurisdiction_tag: GDPR_EU,
    label: "Interest is clearly articulated (not vague)",
    verbatim_excerpt:
      "processing is necessary for the purposes of the legitimate interests pursued by the controller or by a third party",
    anchor: ART_6_1_F,
    guidance_refs: [EDPB_2024_THREE_STEP],
    empty_by_finding:
      "EDPB 1/2024 rows lack section_heading; no pinpoint isolates the 'clearly articulated' sub-factor. T5 ingestion candidate.",
  },
  {
    id: "purpose.real_and_present",
    kind: "purpose_legitimacy",
    jurisdiction_tag: GDPR_EU,
    label: "Interest is real and present (not speculative)",
    verbatim_excerpt:
      "At any rate the existence of a legitimate interest would need careful assessment",
    anchor: RECITAL_47,
    guidance_refs: [EDPB_2024_THREE_STEP],
    empty_by_finding:
      "EDPB 1/2024 rows lack section_heading; no pinpoint isolates the 'real and present' sub-factor. T5 ingestion candidate.",
  },
];

// ---------------------------------------------------------------------------
// NECESSITY (three-part test, step 2)
// ---------------------------------------------------------------------------

const NECESSITY_FACTORS: readonly FactorRow[] = [
  {
    id: "necessity.targeted",
    kind: "necessity",
    jurisdiction_tag: GDPR_EU,
    label: "Processing is targeted to the stated interest",
    verbatim_excerpt:
      "processing is necessary for the purposes of the legitimate interests pursued by the controller or by a third party",
    anchor: ART_6_1_F,
    guidance_refs: [EDPB_2024_NECESSITY],
  },
  {
    id: "necessity.least_intrusive_means",
    kind: "necessity",
    jurisdiction_tag: GDPR_EU,
    label: "No reasonably available less-intrusive means",
    verbatim_excerpt:
      "processing is necessary for the purposes of the legitimate interests pursued by the controller or by a third party",
    anchor: ART_6_1_F,
    guidance_refs: [EDPB_2024_NECESSITY],
  },
  {
    id: "necessity.proportionate_scope",
    kind: "necessity",
    jurisdiction_tag: GDPR_EU,
    label: "Data volume and scope are proportionate to the interest",
    verbatim_excerpt:
      "processing is necessary for the purposes of the legitimate interests pursued by the controller or by a third party",
    anchor: ART_6_1_F,
    guidance_refs: [EDPB_2024_NECESSITY],
    empty_by_finding:
      "EDPB 1/2024 rows lack section_heading; no pinpoint isolates proportionality-of-scope. T5 ingestion candidate.",
  },
];

// ---------------------------------------------------------------------------
// BALANCING FACTORS (three-part test, step 3)
// ---------------------------------------------------------------------------

const REASONABLE_EXPECTATION: readonly FactorRow[] = [
  {
    id: "reasonable_expectation.at_collection",
    kind: "reasonable_expectation",
    jurisdiction_tag: GDPR_EU,
    label: "Data subject could reasonably expect this processing at collection",
    verbatim_excerpt:
      "whether a data subject can reasonably expect at the time and in the context of the collection of the personal data that processing for that purpose may take place",
    anchor: RECITAL_47,
    guidance_refs: [EDPB_2024_REASONABLE_EXP],
  },
  {
    id: "reasonable_expectation.further_processing",
    kind: "reasonable_expectation",
    jurisdiction_tag: GDPR_EU,
    label: "Data subject would not be surprised by any further processing",
    verbatim_excerpt:
      "The interests and fundamental rights of the data subject could in particular override the interest of the data controller where personal data are processed in circumstances where data subjects do not reasonably expect further processing.",
    anchor: RECITAL_47,
    guidance_refs: [EDPB_2024_REASONABLE_EXP],
  },
];

const RELATIONSHIP_CONTEXT: readonly FactorRow[] = [
  {
    id: "relationship.relevant_appropriate",
    kind: "relationship_context",
    jurisdiction_tag: GDPR_EU,
    label: "Relevant and appropriate relationship between subject and controller",
    verbatim_excerpt:
      "Such legitimate interest could exist for example where there is a relevant and appropriate relationship between the data subject and the controller in situations such as where the data subject is a client or in the service of the controller.",
    anchor: RECITAL_47,
    guidance_refs: [EDPB_2024_BALANCING],
  },
  {
    id: "relationship.power_asymmetry",
    kind: "relationship_context",
    jurisdiction_tag: GDPR_EU,
    label: "Absence of a power asymmetry that undermines free choice",
    verbatim_excerpt:
      "The interests and fundamental rights of the data subject could in particular override the interest of the data controller where personal data are processed in circumstances where data subjects do not reasonably expect further processing.",
    anchor: RECITAL_47,
    guidance_refs: [EDPB_2024_BALANCING],
    empty_by_finding:
      "EDPB 1/2024 discusses power asymmetries but coarse-indexed rows do not isolate the sub-factor. T5 ingestion candidate.",
  },
];

const NATURE_OF_DATA: readonly FactorRow[] = [
  {
    id: "nature_of_data.private_sensitivity",
    kind: "nature_of_data",
    jurisdiction_tag: GDPR_EU,
    label: "Sensitivity/privacy of the data types involved",
    verbatim_excerpt:
      "in particular where the data subject is a child",
    anchor: ART_6_1_F,
    guidance_refs: [EDPB_2024_NATURE_OF_DATA],
  },
  {
    id: "nature_of_data.child_data",
    kind: "nature_of_data",
    jurisdiction_tag: GDPR_EU,
    label: "Special weight where the data subject is a child",
    verbatim_excerpt:
      "in particular where the data subject is a child",
    anchor: ART_6_1_F,
    guidance_refs: [EDPB_2024_BALANCING],
  },
];

const IMPACT_FACTORS: readonly FactorRow[] = [
  {
    id: "impact.severity",
    kind: "impact",
    jurisdiction_tag: GDPR_EU,
    label: "Severity of the impact on the data subject",
    verbatim_excerpt:
      "except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject which require protection of personal data",
    anchor: ART_6_1_F,
    guidance_refs: [EDPB_2024_BALANCING],
  },
  {
    id: "impact.breadth",
    kind: "impact",
    jurisdiction_tag: GDPR_EU,
    label: "Breadth of the impact across the data-subject population",
    verbatim_excerpt:
      "except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject which require protection of personal data",
    anchor: ART_6_1_F,
    guidance_refs: [EDPB_2024_BALANCING],
    empty_by_finding:
      "EDPB 1/2024 discusses breadth via CJEU cite chains; sub-factor not isolated in coarse-indexed rows. T5 ingestion candidate.",
  },
  {
    id: "impact.fundamental_rights",
    kind: "impact",
    jurisdiction_tag: GDPR_EU,
    label: "Impact on fundamental rights (privacy, data protection, non-discrimination, etc.)",
    verbatim_excerpt:
      "except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject which require protection of personal data",
    anchor: ART_6_1_F,
    guidance_refs: [EDPB_2024_BALANCING],
  },
];

const SAFEGUARDS: readonly FactorRow[] = [
  {
    id: "safeguards.transparency",
    kind: "safeguard",
    jurisdiction_tag: GDPR_EU,
    label: "Transparency measures that mitigate 'surprise' impact",
    verbatim_excerpt:
      "taking into consideration the reasonable expectations of data subjects based on their relationship with the controller",
    anchor: RECITAL_47,
    guidance_refs: [EDPB_2024_BALANCING],
    empty_by_finding:
      "EDPB 1/2024 safeguard/mitigation catalogue not surfaced at sub-factor pinpoint level. T5 ingestion candidate.",
  },
  {
    id: "safeguards.data_minimisation",
    kind: "safeguard",
    jurisdiction_tag: GDPR_EU,
    label: "Data minimisation and retention limits",
    verbatim_excerpt:
      "except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject which require protection of personal data",
    anchor: ART_6_1_F,
    guidance_refs: [EDPB_2024_BALANCING],
    empty_by_finding:
      "Coarse-indexed; T5 ingestion candidate for a sub-factor pinpoint.",
  },
  {
    id: "safeguards.pseudonymisation_encryption",
    kind: "safeguard",
    jurisdiction_tag: GDPR_EU,
    label: "Pseudonymisation / encryption / access controls",
    verbatim_excerpt:
      "except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject which require protection of personal data",
    anchor: ART_6_1_F,
    guidance_refs: [EDPB_2024_BALANCING],
    empty_by_finding:
      "EDPB 1/2024 addresses information-security mitigations but rows are coarse-indexed. T5 ingestion candidate.",
  },
  {
    id: "safeguards.opt_out_and_object",
    kind: "safeguard",
    jurisdiction_tag: GDPR_EU,
    label: "Effective opt-out / Art 21 right to object",
    verbatim_excerpt:
      "except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject which require protection of personal data",
    anchor: ART_6_1_F,
    guidance_refs: [EDPB_2024_BALANCING],
  },
];

// ---------------------------------------------------------------------------
// Weighing tests (three: purpose-legitimacy, necessity, balancing)
// ---------------------------------------------------------------------------

export const LIA_WEIGHING_TESTS: readonly WeighingTest[] = [
  {
    test_id: "test.gdpr-6-1-f.purpose_legitimacy",
    jurisdiction_tag: GDPR_EU,
    anchor: ART_6_1_F,
    framing_excerpt:
      "processing is necessary for the purposes of the legitimate interests pursued by the controller or by a third party",
    factor_ids: PURPOSE_FACTORS.map((f) => f.id),
  },
  {
    test_id: "test.gdpr-6-1-f.necessity",
    jurisdiction_tag: GDPR_EU,
    anchor: ART_6_1_F,
    framing_excerpt:
      "processing is necessary for the purposes of the legitimate interests",
    factor_ids: NECESSITY_FACTORS.map((f) => f.id),
  },
  {
    test_id: "test.gdpr-6-1-f.balance",
    jurisdiction_tag: GDPR_EU,
    anchor: ART_6_1_F,
    framing_excerpt:
      "except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject which require protection of personal data, in particular where the data subject is a child",
    factor_ids: [
      ...REASONABLE_EXPECTATION.map((f) => f.id),
      ...RELATIONSHIP_CONTEXT.map((f) => f.id),
      ...NATURE_OF_DATA.map((f) => f.id),
      ...IMPACT_FACTORS.map((f) => f.id),
      ...SAFEGUARDS.map((f) => f.id),
    ],
  },
];

// ---------------------------------------------------------------------------
// Public registry
// ---------------------------------------------------------------------------

export const LIA_FACTORS: readonly FactorRow[] = [
  ...PURPOSE_FACTORS,
  ...NECESSITY_FACTORS,
  ...REASONABLE_EXPECTATION,
  ...RELATIONSHIP_CONTEXT,
  ...NATURE_OF_DATA,
  ...IMPACT_FACTORS,
  ...SAFEGUARDS,
];

export const LIA_FACTOR_INDEX: Readonly<Record<string, FactorRow>> =
  Object.freeze(Object.fromEntries(LIA_FACTORS.map((f) => [f.id, f])));

export function liaFactorsByKind(kind: FactorKind): readonly FactorRow[] {
  return LIA_FACTORS.filter((f) => f.kind === kind);
}

export function liaEmptyByFindingGaps(): readonly FactorRow[] {
  return LIA_FACTORS.filter((f) => Boolean(f.empty_by_finding));
}
