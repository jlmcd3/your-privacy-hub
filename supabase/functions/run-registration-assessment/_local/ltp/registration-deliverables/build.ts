/**
 * ITEM 316 — registration analytic deliverables (pure builder).
 *
 * SINGLE-WRITER: this module is the only producer of the registration
 * findings. It is a pure function of the intake record plus the verbatim duty
 * registry; it performs no I/O, reads no clock, and holds no module state.
 *
 * CHAPTER 4 (D) PROMPT LENS: the threshold, window, fee and filing-content
 * work is deterministic once the registry exists, so all of it is done here in
 * code. Model work is reserved for genuinely marginal cases, which this
 * builder surfaces as `conditional` with named open questions rather than
 * guessing.
 *
 * SCHEDULE-SURFACE LAW: no calendar arithmetic. `Date` does not appear in this
 * file and a pin test enforces that.
 */

import {
  dutyRow,
  REGISTRATION_DUTY_VERSION,
} from "../../registry/registration-verified-authorities.ts";
import type {
  AiActRegistrationDetermination,
  Attestation,
  BdsgDetermination,
  CorpusPendingFlag,
  DpoDetermination,
  FilingReadiness,
  Finding,
  RegistrationDeliverables,
  RegistrationDetermination,
  RegistrationNarrative,
  RepresentativeDetermination,
  ScheduleAndFee,
  ThresholdAnalysis,
  Verdict,
} from "./types.ts";

export const REGISTRATION_DELIVERABLES_VERSION =
  `registration-deliverables-reg1-2026-08-29 (${REGISTRATION_DUTY_VERSION})`;

// ── Intake surface actually read by this builder ─────────────────────────────

export interface RegistrationIntakeForDeliverables {
  organization_name?: string | null;
  organization_country?: string | null;
  markets_served?: string[] | null;
  is_public_authority?: boolean | null;
  role?: string | null;

  processes_special_categories?: boolean | null;
  processes_children_data?: boolean | null;
  large_scale_monitoring?: boolean | null;
  acts_as_data_broker?: boolean | null;
  sells_or_shares_personal_info?: boolean | null;
  has_eu_establishment?: boolean | null;
  has_uk_establishment?: boolean | null;
  uses_ai_systems?: boolean | null;
  ai_high_risk?: boolean | null;
  ai_general_purpose_provider?: boolean | null;

  // Item 316 intake extension — the counts each statute's threshold uses.
  brokered_data_individual_count?: number | null;
  brokered_data_revenue_share_pct?: number | null;
  collects_data_not_directly_from_individuals?: boolean | null;
  has_direct_relationship_with_data_subjects?: boolean | null;
  sells_or_licenses_brokered_data?: boolean | null;
  data_broker_exemption_claimed?: string | null;
  filing_contact_details_ready?: boolean | null;
  filing_opt_out_mechanism_documented?: boolean | null;
  filing_minors_data_practices_documented?: boolean | null;
  // Filing-readiness coverage fix (2026-08-04) — CA § 1798.99.82(b)(2)(B)
  // metrics and TX § 510.005(b)(2-a) rights-instructions link.
  filing_metrics_documented?: boolean | null;
  filing_rights_instructions_documented?: boolean | null;
  // DOC 163 R7 — Tex. Bus. & Com. Code § 510.005(b)(3), (4), (6).
  filing_tx_categories_documented?: boolean | null;
  filing_tx_credentialing_statement_documented?: boolean | null;
  filing_tx_breach_count_documented?: boolean | null;
  // DOC 163 R1/R3/R8 — facts the document now reads.
  ai_high_risk_role?: string | null;
  data_subjects_count?: number | null;
  employee_count?: number | null;
  eu_lead_member_state?: string | null;

  // Attestation intake (optional). No date is computed from these.
  approved_by_name?: string | null;
  approved_by_title?: string | null;
  approval_date?: string | null;
  next_review_due?: string | null;

  [k: string]: unknown;
}

type I = RegistrationIntakeForDeliverables;

// DOC 163 R5 (2026-09-03) — reader labels for a claimed statutory-exclusion
// family (the form's own words); the raw key never reaches the document.
const BROKER_EXEMPTION_LABELS: Record<string, string> = {
  fcra_consumer_reporting: "consumer-reporting (FCRA)",
  glba_financial: "financial-institution (GLBA)",
  hipaa_health: "health-data (HIPAA)",
  insurance: "insurance",
  service_provider_processor: "service-provider or processor",
  affiliate_or_subsidiary: "affiliate or subsidiary transfers",
  publicly_available_information: "publicly available information",
};
export function exemptionLabel(v: string): string {
  return BROKER_EXEMPTION_LABELS[v] ?? v.replace(/_/g, " ");
}

// DOC 163 R3/R4 — the one scale fact the form collects for "large scale": the
// engine's own > 100,000-data-subject proxy (QB-P24 addendum item 9(a)). The
// form tells the company the count "is what the 'large scale' test for a
// mandatory data protection officer turns on", so the document reads it.
export const LARGE_SCALE_SUBJECTS = 100_000;
export function recordedLargeScale(intake: I): boolean | null {
  const n = num(intake.data_subjects_count);
  return n === null ? null : n > LARGE_SCALE_SUBJECTS;
}
function subjectsProse(intake: I): string {
  const n = num(intake.data_subjects_count);
  return n === null ? "" : `${n.toLocaleString("en-US")} data subjects a year`;
}

const UNKNOWN = "The record does not state this.";

function tri(v: unknown): boolean | null {
  return v === true ? true : v === false ? false : null;
}
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
/**
 * ITEM 413 RG-3 — NO HOLLOW FACTS.
 *
 * The unknown branch used to render "The record does not state this.", which
 * names nothing: the reader cannot act on it because it never says what "this"
 * is. Every affirmative branch in this file is written as "The record states
 * <clause>.", so the unknown sentence is DERIVED from it — "The record does not
 * state whether <clause>." Nothing is invented and no call site can forget it.
 * An explicit `unknown` argument overrides the derivation where the affirmative
 * branch is not in that form.
 */
export function unknownFactFrom(yes: string): string {
  const m = /^The record states (?:that )?(.+?)\.?$/.exec(yes.trim());
  if (!m) return UNKNOWN;
  return `The record does not state whether ${m[1]}.`;
}
function yn(v: boolean | null, yes: string, no: string, unknown?: string): string {
  return v === true ? yes : v === false ? no : (unknown ?? unknownFactFrom(yes));
}
function orgName(intake: I): string {
  const n = (intake.organization_name || "").trim();
  return n || "The organisation";
}

/** In-scope test for a US state.
 *
 *  A state is in scope when the record names that state as a market or as the
 *  place of establishment, or when the record selects the United States as a
 *  whole AND indicates broker-type activity — a nationwide broker is exposed
 *  to every state regime, so silence about individual states is not a reason
 *  to omit them.
 *
 *  `organization_country` alone is deliberately NOT enough: being established
 *  in the US says nothing about which state regimes are engaged, and treating
 *  it as a trigger would pull all four states into every US record and
 *  reintroduce exactly the cross-state bleed this item exists to prevent. */
export function stateInScope(intake: I, code: string): boolean {
  const markets = Array.isArray(intake.markets_served) ? intake.markets_served : [];
  if (markets.includes(code)) return true;
  if ((intake.organization_country || "") === code) return true;
  const brokerish =
    intake.acts_as_data_broker === true ||
    intake.sells_or_licenses_brokered_data === true ||
    intake.collects_data_not_directly_from_individuals === true;
  return markets.includes("US") && brokerish;
}

// ── Op. 1 + Op. 2 — per-state threshold analysis and determination ──────────
//
// CROSS-STATE BLEED GUARD: each state's limbs are derived from that state's
// own definitional row and no other. The limb sets deliberately differ.

interface StateSpec {
  code: string;
  state_name: string;
  filing_body: string;
  definition_keys: string[];
  /** DOC 163 R5 — every registry row reproducing the state's exclusion text. */
  exclusion_keys: string[];
  /** Claimed-exclusion family → the state's own words for it. */
  exclusion_families: Record<string, string>;
  /** True when every subdivision of the state's exclusion list is reproduced. */
  exclusions_complete: boolean;
  /** Registry row whose text takes a governmental entity outside the chapter. */
  public_body_exclusion_key: string | null;
  requirement_key: string;
  window_key: string | null;
  fee_key: string | null;
  fee_stated_amount: string | null;
  filing_key: string;
  limbs: (intake: I) => ThresholdAnalysis["limbs"];
}

function caLimbs(intake: I): ThresholdAnalysis["limbs"] {
  const def = dutyRow("ca_data_broker_definition");
  const noRel = tri(intake.has_direct_relationship_with_data_subjects) === null
    ? null
    : intake.has_direct_relationship_with_data_subjects === false;
  const sells = tri(intake.sells_or_licenses_brokered_data) ?? tri(intake.sells_or_shares_personal_info);
  const collects = tri(intake.collects_data_not_directly_from_individuals);
  return [
    {
      limb: "Knowingly collects personal information of a consumer",
      citation: def.citation,
      standard: "knowingly collects",
      record_fact: yn(collects,
        "The record states the entity collects personal data it did not obtain directly from the individuals concerned.",
        "The record states the entity collects personal data directly from the individuals concerned."),
      met: collects,
      reasoning: collects === null
        ? "Cannot be evaluated: the record does not state whether collection is direct or indirect."
        : collects
        ? "Indirect collection of consumer personal information satisfies the collection limb."
        : "Direct-only collection does not, as the record stands, evidence the collection pattern the limb describes.",
    },
    {
      limb: "Sells that information to third parties",
      citation: def.citation,
      standard: "sells to third parties",
      record_fact: yn(sells,
        "The record states the entity sells or licenses personal data to third parties.",
        "The record states the entity does not sell or license personal data to third parties."),
      met: sells,
      reasoning: sells === null
        ? "Cannot be evaluated: the record does not state whether personal information is sold to third parties."
        : sells
        ? "Sale to third parties satisfies the sale limb of the California definition."
        : "Absent sale to third parties the California definition is not met, however much data is collected.",
    },
    {
      limb: "With a consumer with whom the business does NOT have a direct relationship",
      citation: def.citation,
      standard: "with whom the business does not have a direct relationship",
      record_fact: yn(tri(intake.has_direct_relationship_with_data_subjects),
        "The record states the entity has a direct relationship with the individuals concerned.",
        "The record states the entity has no direct relationship with the individuals concerned."),
      met: noRel,
      reasoning: noRel === null
        ? "Cannot be evaluated: the record does not state whether a direct relationship exists."
        : noRel
        ? "The absence of a direct relationship engages the California definition."
        : "A direct relationship with the consumers concerned takes the business outside the California definition, which reaches only consumers with whom there is no direct relationship.",
    },
  ];
}

function orLimbs(intake: I): ThresholdAnalysis["limbs"] {
  const def = dutyRow("or_data_broker_definition");
  const collects = tri(intake.collects_data_not_directly_from_individuals) ??
    tri(intake.acts_as_data_broker);
  const sells = tri(intake.sells_or_licenses_brokered_data) ?? tri(intake.sells_or_shares_personal_info);
  return [
    {
      limb: "Is a business entity, or part of a business entity",
      citation: def.citation,
      standard: "means a business entity or part of a business entity",
      record_fact: intake.is_public_authority === true
        ? "The record states the entity is a public authority or body."
        : "The record identifies the respondent as a business entity.",
      met: intake.is_public_authority === true ? false : true,
      reasoning: intake.is_public_authority === true
        ? "A public authority is not a business entity for the purposes of this definition."
        : "The entity-status limb is met on the face of the record.",
    },
    {
      limb: "Collects brokered personal data",
      citation: def.citation,
      standard: "that collects",
      record_fact: yn(collects,
        "The record states the entity collects personal data about individuals.",
        "The record states the entity does not collect brokered personal data."),
      met: collects,
      reasoning: collects === null
        ? "Cannot be evaluated: the record does not state the entity's collection pattern."
        : collects
        ? "Collection of brokered personal data satisfies this limb."
        : "Without collection of brokered personal data the definition is not engaged.",
    },
    {
      limb: "Sells or licenses that data to another person",
      citation: def.citation,
      standard: "sells or licenses brokered personal data to another person",
      record_fact: yn(sells,
        "The record states the entity sells or licenses personal data to other parties.",
        "The record states the entity does not sell or license personal data."),
      met: sells,
      reasoning: sells === null
        ? "Cannot be evaluated: the record does not state whether data is sold or licensed onward."
        : sells
        ? "Onward sale or licensing satisfies this limb."
        : "Absent onward sale or licensing the Oregon definition is not met.",
    },
    {
      limb: "NOTE — Oregon imposes no 'direct relationship' carve-out",
      citation: def.citation,
      standard: "to another person.",
      record_fact: yn(tri(intake.has_direct_relationship_with_data_subjects),
        "The record states a direct relationship exists with the individuals concerned.",
        "The record states no direct relationship exists."),
      met: true,
      reasoning:
        "Unlike California and Vermont, the Oregon definition contains no exception for consumers with whom the business has a direct relationship. A direct relationship therefore does not defeat Oregon registration, and this limb is recorded so the difference is visible rather than silently imported from another state.",
    },
  ];
}

function txLimbs(intake: I): ThresholdAnalysis["limbs"] {
  const def = dutyRow("tx_data_broker_definition");
  const app = dutyRow("tx_applicability_threshold");
  const collects = tri(intake.collects_data_not_directly_from_individuals);
  const pct = num(intake.brokered_data_revenue_share_pct);
  const count = num(intake.brokered_data_individual_count);
  const revenueLimb = pct === null ? null : pct > 50;
  // DOC 163 R6 — limb (2) is REVENUE derived from the data of more than 50,000
  // individuals: the count alone establishes no revenue. A recorded 0 % share
  // defeats it; a blank share leaves it open; a count of 50,000 or fewer fails it.
  const volumeLimb = count === null ? null : count <= 50000 ? false : pct === null ? null : pct > 0;
  return [
    {
      limb: "Collects, processes, or transfers personal data not collected directly from the individual",
      citation: def.citation,
      standard: "collects, processes, or transfers personal data that the business entity did not collect directly from the individual",
      record_fact: yn(collects,
        "The record states the entity handles personal data it did not collect directly from the individuals concerned.",
        "The record states all personal data is collected directly from the individuals concerned."),
      met: collects,
      reasoning: collects === null
        ? "Cannot be evaluated: the record does not state whether data is obtained indirectly."
        : collects
        ? "Texas reaches collection, PROCESSING or TRANSFER of indirectly-obtained data; sale is not required, so this limb is met on a broader footing than California's."
        : "All-direct collection places the entity outside the Texas definition.",
    },
    {
      limb: "Applicability limb (1) — more than 50 percent of revenue from that data",
      citation: app.citation,
      standard: "more than 50 percent of the data broker's revenue directly from processing or transferring personal data not collected by the data broker directly from the individuals to whom the data pertains",
      record_fact: pct === null
        ? "The record does not state the share of revenue derived from processing or transferring indirectly-obtained personal data."
        : `The record states ${pct}% of revenue derives from processing or transferring indirectly-obtained personal data.`,
      met: revenueLimb,
      reasoning: pct === null
        ? "Cannot be evaluated: the record does not state the revenue share derived from indirectly-obtained personal data."
        : revenueLimb
        ? `${pct}% exceeds the statutory 50 percent, so this limb is met.`
        : `${pct}% does not exceed the statutory 50 percent, so this limb is not met on its own.`,
    },
    {
      limb: "Applicability limb (2) — revenue from data of more than 50,000 individuals",
      citation: app.citation,
      standard: "revenue directly from processing or transferring the personal data of more than 50,000 individuals not collected by the data broker directly from the individuals to whom the data pertains",
      record_fact: count === null
        ? "The record does not state the number of individuals whose personal data is handled without direct collection."
        : `The record states the personal data of ${count.toLocaleString("en-US")} individuals is handled without direct collection${pct === null ? ", and does not state the share of revenue derived from it" : `, and that ${pct}% of revenue derives from it`}.`,
      met: volumeLimb,
      reasoning: count === null
        ? "Cannot be evaluated: the record does not state the number of individuals whose data is handled indirectly."
        : count <= 50000
        ? `${count.toLocaleString("en-US")} does not exceed the statutory 50,000 threshold, so this limb is not met on its own.`
        : pct === null
        ? `${count.toLocaleString("en-US")} exceeds the statutory 50,000 threshold, but the limb turns on revenue derived from that data and the record does not state whether any revenue is derived from it.`
        : pct > 0
        ? `${count.toLocaleString("en-US")} exceeds the statutory 50,000 threshold and the record states revenue is derived from that data, so this limb is met.`
        : `${count.toLocaleString("en-US")} exceeds the statutory 50,000 threshold, but the record states no revenue derives from that data, so this limb is not met.`,
    },
  ];
}

function vtLimbs(intake: I): ThresholdAnalysis["limbs"] {
  const def = dutyRow("vt_data_broker_definition");
  const rel = dutyRow("vt_direct_relationship_examples");
  const noRel = tri(intake.has_direct_relationship_with_data_subjects) === null
    ? null
    : intake.has_direct_relationship_with_data_subjects === false;
  const sells = tri(intake.sells_or_licenses_brokered_data) ?? tri(intake.sells_or_shares_personal_info);
  const collects = tri(intake.collects_data_not_directly_from_individuals);
  return [
    {
      limb: "Knowingly collects brokered personal information",
      citation: def.citation,
      standard: "knowingly collects",
      record_fact: yn(collects,
        "The record states the entity collects personal data about individuals it did not obtain from them directly.",
        "The record states the entity collects personal data directly from the individuals concerned."),
      met: collects,
      reasoning: collects === null
        ? "Cannot be evaluated: the record does not state the collection pattern."
        : collects
        ? "Knowing collection of brokered personal information satisfies this limb."
        : "Direct-only collection does not evidence the collection pattern this limb describes.",
    },
    {
      limb: "Sells OR LICENSES to third parties",
      citation: def.citation,
      standard: "sells or licenses to third parties",
      record_fact: yn(sells,
        "The record states the entity sells or licenses personal data to third parties.",
        "The record states the entity neither sells nor licenses personal data to third parties."),
      met: sells,
      reasoning: sells === null
        ? "Cannot be evaluated: the record does not state whether data is sold or licensed onward."
        : sells
        ? "Vermont reaches LICENSING as well as sale, so a licensing-only arrangement engages this limb even where a sale-only formulation would not."
        : "Neither sale nor licensing is recorded, so this limb is not met.",
    },
    {
      limb: "Consumer with whom the business does NOT have a direct relationship",
      citation: rel.citation,
      standard: "with whom the business does not have a direct relationship",
      record_fact: yn(tri(intake.has_direct_relationship_with_data_subjects),
        "The record states a direct relationship exists with the individuals concerned (for example as customer, client, subscriber, user or registered user).",
        "The record states no direct relationship exists with the individuals concerned."),
      met: noRel,
      reasoning: noRel === null
        ? "Cannot be evaluated: the record does not state whether a direct relationship exists."
        : noRel
        ? "The absence of a direct relationship engages the Vermont definition."
        : "Vermont's statute illustrates a direct relationship by reference to past or present customers, clients, subscribers, users and registered users; the company has indicated that relationship exists and the definition is not engaged.",
    },
  ];
}

const STATE_SPECS: StateSpec[] = [
  {
    code: "US-CA",
    state_name: "California",
    filing_body: "the California Privacy Protection Agency",
    definition_keys: ["ca_data_broker_definition"],
    exclusion_keys: ["ca_data_broker_exclusions"],
    exclusion_families: {
      fcra_consumer_reporting: "an entity to the extent that it is covered by the federal Fair Credit Reporting Act (subdivision (c)(1))",
      glba_financial: "an entity to the extent that it is covered by the Gramm-Leach-Bliley Act (subdivision (c)(2))",
      insurance: "an entity to the extent that it is covered by the Insurance Information and Privacy Protection Act (subdivision (c)(3))",
      hipaa_health: "an entity, or a business associate of a covered entity, to the extent its processing is exempt under Section 1798.146 (subdivision (c)(4))",
    },
    exclusions_complete: true,
    public_body_exclusion_key: null,
    requirement_key: "ca_registration_requirement",
    window_key: "ca_registration_requirement",
    fee_key: "ca_registration_fee",
    fee_stated_amount: null,
    filing_key: "ca_filing_content",
    limbs: caLimbs,
  },
  {
    code: "US-OR",
    state_name: "Oregon",
    filing_body: "the Oregon Department of Consumer and Business Services",
    definition_keys: ["or_data_broker_definition"],
    exclusion_keys: [],
    exclusion_families: {},
    exclusions_complete: true,
    public_body_exclusion_key: null,
    requirement_key: "or_registration_requirement",
    window_key: "or_registration_term",
    fee_key: "or_registration_fee",
    fee_stated_amount: null,
    filing_key: "or_filing_content",
    limbs: orLimbs,
  },
  {
    code: "US-TX",
    state_name: "Texas",
    filing_body: "the Texas Secretary of State",
    definition_keys: ["tx_data_broker_definition", "tx_applicability_threshold"],
    exclusion_keys: ["tx_applicability_exclusions", "tx_applicability_exclusions_fcra", "tx_applicability_exclusions_glba"],
    exclusion_families: {
      service_provider_processor: "a service provider (subsection (b)(1))",
      affiliate_or_subsidiary: "a person or entity collecting personal data from a related person or entity under common ownership or corporate control, where a reasonable consumer would expect the sharing (subsection (b)(2))",
      fcra_consumer_reporting: "a consumer reporting agency or a person furnishing or obtaining consumer credit reports, to the extent regulated by the Fair Credit Reporting Act (subsection (b)(5))",
      glba_financial: "a financial institution subject to Title V of the Gramm-Leach-Bliley Act (subsection (b)(6))",
    },
    // The approved corpus row elides subsection (b)(4); a family absent from
    // the reproduced text is therefore unresolved, never "no footing".
    exclusions_complete: false,
    public_body_exclusion_key: "tx_applicability_exclusions",
    requirement_key: "tx_registration_requirement",
    window_key: "tx_registration_term",
    fee_key: "tx_registration_requirement",
    fee_stated_amount: "$300",
    filing_key: "tx_filing_content",
    limbs: txLimbs,
  },
  {
    code: "US-VT",
    state_name: "Vermont",
    filing_body: "the Vermont Secretary of State",
    definition_keys: ["vt_data_broker_definition"],
    exclusion_keys: ["vt_activity_exclusions"],
    exclusion_families: {
      publicly_available_information: "providing publicly available information related to a consumer's business or profession, or via real-time or near-real-time alert services for health or safety purposes (subdivision (4)(C)(iii)–(iv)) — narrower than publicly available information generally",
    },
    exclusions_complete: true,
    public_body_exclusion_key: null,
    requirement_key: "vt_registration_requirement",
    window_key: "vt_registration_requirement",
    fee_key: "vt_registration_requirement",
    fee_stated_amount: "$100.00",
    filing_key: "vt_filing_content",
    limbs: vtLimbs,
  },
];

/** Texas is the only state whose statute splits definition from a separate
 *  applicability test: both must hold, and the applicability test is an OR of
 *  its two limbs. Every other state's limbs are conjunctive. */
function combineLimbs(code: string, limbs: ThresholdAnalysis["limbs"]): boolean | null {
  if (code === "US-TX") {
    const [definitional, revenue, volume] = limbs;
    if (definitional.met === false) return false;
    const appMet =
      revenue.met === true || volume.met === true
        ? true
        : revenue.met === false && volume.met === false
        ? false
        : null;
    if (appMet === false) return false;
    if (definitional.met === null || appMet === null) return null;
    return true;
  }
  if (limbs.some((l) => l.met === false)) return false;
  if (limbs.some((l) => l.met === null)) return null;
  return true;
}

function buildThreshold(intake: I, spec: StateSpec): ThresholdAnalysis {
  const limbs = spec.limbs(intake);
  const met = combineLimbs(spec.code, limbs);
  const defRows = spec.definition_keys.map(dutyRow);
  // DOC 163 R5 — a claimed exclusion is measured against the state's OWN
  // reproduced exclusion text. "unknown" ("Not sure" on the form) is a
  // question, not a claim, and is never read as "claims no exclusion".
  const claimed = (intake.data_broker_exemption_claimed || "").trim();
  const unsure = claimed === "unknown";
  const hasClaim = claimed !== "" && claimed !== "none" && !unsure;
  const exclusionRows = spec.exclusion_keys.map(dutyRow);
  const exclusionCites = Array.from(new Set(exclusionRows.map((r) => r.citation))).join("; ");
  const family = hasClaim ? spec.exclusion_families[claimed] : undefined;
  const label = hasClaim ? exemptionLabel(claimed) : "";
  const exclusion_effect: ThresholdAnalysis["exclusion_effect"] = unsure
    ? "unsure"
    : !hasClaim
    ? "none"
    : family
    ? "conditional"
    : spec.exclusions_complete
    ? "no_footing"
    : "unresolved";

  const exclusion_analysis = exclusionRows.length === 0
    ? (exclusion_effect === "no_footing"
      ? `The company's claimed ${label} exclusion has no footing in the ${spec.state_name} provisions this assessment relies on, which state no exclusion list, so the claim is recorded without effect and the duty turns on the definition alone.`
      : exclusion_effect === "unsure"
      ? `The company is not sure whether a statutory exclusion applies. The ${spec.state_name} provisions this assessment relies on state no exclusion list, so none is applied.`
      : `The ${spec.state_name} registration provision states no exclusion list in its operative text, so no exclusion is applied here.`)
    : exclusion_effect === "none"
    ? `The company claims no statutory exclusion. ${spec.state_name}'s exclusion text (${exclusionCites}) is reproduced with this finding and is not applied absent a claimed and evidenced basis.`
    : exclusion_effect === "unsure"
    ? `The company is not sure whether a statutory exclusion applies. ${spec.state_name}'s exclusion text (${exclusionCites}) is reproduced with this finding; no exclusion is applied, and the question is named below so it can be settled.`
    : exclusion_effect === "conditional"
    ? `The company's claimed ${label} exclusion is one ${spec.state_name}'s text provides, for ${family}, and whether it succeeds turns on the entity's own facts measured against ${exclusionCites}, which the record does not establish, so the claim is recorded, not accepted.`
    : exclusion_effect === "no_footing"
    ? `The company's claimed ${label} exclusion has no footing in ${spec.state_name}'s exclusion text (${exclusionCites}), reproduced in full here, which provides no exclusion of that kind, so the duty turns on the definition alone.`
    : `The company's claimed ${label} exclusion is not among the ${spec.state_name} exclusions reproduced here (${exclusionCites}), but the reproduction omits one subdivision, so the claim is recorded and left for counsel against the full text.`;

  const failed = limbs.filter((l) => l.met === false).map((l) => l.limb);
  const open = limbs.filter((l) => l.met === null).map((l) => l.limb);

  return {
    key: `threshold_${spec.code.toLowerCase().replace("-", "_")}`,
    label: `${spec.state_name} data-broker definitional threshold`,
    jurisdiction: spec.code,
    citation: defRows.map((r) => r.citation).join("; "),
    standard: defRows.map((r) => r.verbatim_quote).join("\n\n"),
    record_fact: limbs.map((l) => `${l.limb}: ${l.record_fact}`).join(" "),
    application:
      met === true
        ? `Every limb of the ${spec.state_name} definition is satisfied by the facts recorded.`
        : met === false
        ? `The ${spec.state_name} definition is not satisfied because the following limb(s) fail against the facts recorded: ${failed.join("; ")}.`
        : `The ${spec.state_name} definition cannot be resolved because the following limb(s) are unevidenced by the facts recorded: ${open.join("; ")}.`,
    verdict: met === true ? "satisfied" : met === false ? "not_satisfied" : "record_insufficient",
    status: met === null ? "record_insufficient" : "analysed",
    limbs,
    exclusion_claimed: hasClaim ? claimed : null,
    exclusion_analysis,
    exclusion_effect,
    ...(met === null ? { information_needed: open.join("; ") } : {}),
  };
}

function buildDetermination(intake: I, spec: StateSpec): RegistrationDetermination {
  const threshold = buildThreshold(intake, spec);
  const reqRow = dutyRow(spec.requirement_key);
  const met = threshold.verdict;
  // DOC 163 R5 — the verdict is conditional only where the claimed exclusion
  // has footing (or cannot be excluded) in the state's reproduced text.
  const conditional = met === "satisfied" &&
    (threshold.exclusion_effect === "conditional" || threshold.exclusion_effect === "unresolved");
  // DOC 163 R5 — Tex. § 510.003(b)(3): the chapter does not apply to a
  // governmental entity; a recorded public-authority answer resolves Texas.
  const publicBodyRow = spec.public_body_exclusion_key ? dutyRow(spec.public_body_exclusion_key) : null;
  const publicBody = publicBodyRow !== null && intake.is_public_authority === true;

  const verdict: RegistrationDetermination["verdict"] =
    publicBody
      ? "not_registrable"
      : met === "record_insufficient"
      ? "record_insufficient"
      : met === "not_satisfied"
      ? "not_registrable"
      : conditional
      ? "conditional"
      : "registrable";

  const requirement: Finding = {
    key: `requirement_${spec.code.toLowerCase().replace("-", "_")}`,
    label: `${spec.state_name} registration requirement`,
    citation: reqRow.citation,
    standard: reqRow.verbatim_quote,
    record_fact:
      met === "satisfied"
        ? `${orgName(intake)} meets the ${spec.state_name} data-broker definition as the record stands.`
        : met === "not_satisfied"
        ? `${orgName(intake)} does not meet the ${spec.state_name} data-broker definition as the record stands.`
        : `Whether ${orgName(intake)} meets the ${spec.state_name} definition is not resolvable from the facts recorded.`,
    application:
      publicBody
        ? `${publicBodyRow!.citation} provides that the chapter does not apply to a federal, state, tribal, territorial, or local governmental entity, and the record states ${orgName(intake)} is a public authority or body, so the duty in ${reqRow.citation} does not attach.`
        : met === "satisfied"
        ? `Because the definition is met, the registration duty in ${reqRow.citation} attaches and must be discharged with ${spec.filing_body}.`
        : met === "not_satisfied"
        ? `The duty in ${reqRow.citation} is predicated on meeting the definition. It does not attach as matters stand; it would attach in any year in which the definition is met.`
        : `The duty in ${reqRow.citation} cannot be resolved until the definitional limbs above are evidenced.`,
    verdict: publicBody ? "not_engaged" : met === "satisfied" ? "engaged" : met === "not_satisfied" ? "not_engaged" : "record_insufficient",
    status: !publicBody && met === "record_insufficient" ? "record_insufficient" : "analysed",
    ...(met === "record_insufficient"
      ? { information_needed: threshold.information_needed || "Definitional limbs unevidenced." }
      : {}),
  };

  const headline =
    publicBody
      ? `${orgName(intake)} is a governmental entity on its answers, which ${publicBodyRow!.citation} places outside the Texas data-broker chapter, so no Texas registration duty attaches.`
      : verdict === "registrable"
      ? `${orgName(intake)} is required to register as a data broker in ${spec.state_name} with ${spec.filing_body}.`
      : verdict === "not_registrable"
      ? `${orgName(intake)} is not required to register as a data broker in ${spec.state_name} as the record stands.`
      : verdict === "conditional"
      ? `${orgName(intake)} meets the ${spec.state_name} data-broker definition, but has claimed a statutory exclusion that the record does not establish; registration turns on that claim.`
      : `Whether ${orgName(intake)} must register in ${spec.state_name} cannot be determined from the facts recorded.`;

  // DOC 163 — asks are named only where the determination is open; a
  // not-registrable determination has no remaining question. Each ask is a
  // lower-case clause (no leading state label, so nothing case-folds a
  // proper noun downstream).
  const open_questions: string[] = [];
  if (verdict === "record_insufficient") {
    for (const l of threshold.limbs) {
      if (l.met === null) open_questions.push(`evidence for ${spec.state_name} on the limb "${l.limb}"`);
    }
  }
  if (verdict === "conditional") {
    const cites = Array.from(new Set(spec.exclusion_keys.map((k) => dutyRow(k).citation))).join("; ") || reqRow.citation;
    open_questions.push(
      `substantiation of the claimed ${exemptionLabel(threshold.exclusion_claimed ?? "")} exclusion for ${spec.state_name} against ${cites}`,
    );
  }
  if ((verdict === "registrable" || verdict === "conditional") && threshold.exclusion_effect === "unsure") {
    open_questions.push(`whether any statutory exclusion applies in ${spec.state_name}; the company is not sure`);
  }

  return {
    jurisdiction: spec.code,
    state_name: spec.state_name,
    filing_body: spec.filing_body,
    verdict,
    headline,
    reasoning: `${threshold.application} ${requirement.application} ${threshold.exclusion_analysis}`,
    citations: Array.from(new Set([...threshold.citation.split("; "), reqRow.citation])),
    threshold,
    requirement,
    open_questions,
    status: verdict === "record_insufficient" ? "record_insufficient" : "analysed",
  };
}

// ── Op. 3 — schedule and fee, stated never computed ─────────────────────────

function buildSchedule(spec: StateSpec): ScheduleAndFee {
  const windowRow = spec.window_key ? dutyRow(spec.window_key) : null;
  const feeRow = spec.fee_key ? dutyRow(spec.fee_key) : null;
  return {
    jurisdiction: spec.code,
    window_standard: windowRow ? windowRow.verbatim_quote : null,
    window_citation: windowRow ? windowRow.citation : null,
    window_note: windowRow
      ? `The statutory window is stated above as ${windowRow.citation} states it. This assessment deliberately does not convert that window into a specific filing date for this organisation: the operative date depends on facts and on a compliance calendar this assessment does not hold, and counsel should fix the date.`
      : `${spec.state_name} states no registration window in the operative text reproduced here.`,
    fee_standard: feeRow ? feeRow.verbatim_quote : null,
    fee_citation: feeRow ? feeRow.citation : null,
    fee_stated_amount: spec.fee_stated_amount,
    fee_note: spec.fee_stated_amount
      ? `${feeRow?.citation} states the fee on its face as ${spec.fee_stated_amount}.`
      : feeRow
      ? `${feeRow.citation} does not state a fixed amount in its operative text; the amount is set by the administering body, so no figure is asserted here.`
      : `No fee provision is reproduced for ${spec.state_name}.`,
    status: "analysed",
  };
}

// ── Op. 5 — filing-content readiness ────────────────────────────────────────

// DOC 163 R7 (2026-09-03) — each list is the statute's own list AS REPRODUCED
// in the approved corpus row, element for element: CA § 1798.99.82(b)(2)(A)–(C);
// OR 646A.593(3)(a)(A)–(C); TX § 510.005(b)(1), (2), (2-a), (3), (4), (5), (6);
// VT § 2446(a)(3)(A)–(B). Items the reproduced text does not carry (a CA
// opt-out element, a VT minors statement) are gone; the summary claims
// completeness only against the reproduced text.
const FILING_ITEM_MAP: Record<string, Array<{ item: string; intake_key: string | null; required_when?: (intake: I) => boolean | null }>> = {
  "US-CA": [
    { item: "Name and primary physical, email and website addresses of the data broker", intake_key: "filing_contact_details_ready" },
    { item: "The metrics compiled pursuant to paragraphs (1) and (2) of subdivision (a) of Section 1798.99.85", intake_key: "filing_metrics_documented" },
    { item: "Whether the data broker collects the personal information of minors", intake_key: "filing_minors_data_practices_documented" },
  ],
  "US-OR": [
    { item: "Name, street address, telephone number, primary website and electronic mail address", intake_key: "filing_contact_details_ready" },
  ],
  "US-TX": [
    { item: "Legal name, contact person, physical address, e-mail, telephone and website", intake_key: "filing_contact_details_ready" },
    { item: "Link to a page providing consumers with prominently displayed instructions on exercising their rights under Section 541.051", intake_key: "filing_rights_instructions_documented" },
    { item: "Description of the categories of data the data broker processes and transfers", intake_key: "filing_tx_categories_documented" },
    { item: "Statement of whether the data broker implements a purchaser credentialing process", intake_key: "filing_tx_credentialing_statement_documented" },
    // (5) applies only where the data broker has actual knowledge that it
    // possesses personal data of a known child; the children's-data answer
    // is the record's statement on that.
    { item: "Statements on the collection practices, databases, sales activities, opt-out policies and legal compliance applicable to the personal data of a known child", intake_key: "filing_minors_data_practices_documented", required_when: (i) => tri(i.processes_children_data) },
    { item: "Number of security breaches in the preceding year and, if known, the consumers affected by each", intake_key: "filing_tx_breach_count_documented" },
  ],
  "US-VT": [
    { item: "Name and primary physical, e-mail and Internet addresses of the data broker", intake_key: "filing_contact_details_ready" },
    { item: "Opt-out method, scope and third-party authorisation, where an opt-out is permitted", intake_key: "filing_opt_out_mechanism_documented" },
  ],
};

function buildFilingReadiness(intake: I, spec: StateSpec): FilingReadiness {
  const row = dutyRow(spec.filing_key);
  const defs = FILING_ITEM_MAP[spec.code] || [];
  const items = defs.map((d) => {
    const requiredState = d.required_when ? d.required_when(intake) : true;
    const required = requiredState !== false;
    const v = d.intake_key ? tri(intake[d.intake_key]) : null;
    return {
      item: d.item,
      intake_key: d.intake_key,
      ready: required ? v : true,
      required,
      record_fact: !required
        ? "The company has not indicated that it processes children's data, so this element is not required on its answers."
        : yn(v,
          "The record states this element is documented and available to file.",
          "The record states this element is not yet documented.",
          // RG-3 — name the element, not "this".
          `The record does not state whether "${d.item}" is documented and available to file.`),
    };
  });
  const live = items.filter((i) => i.required);
  const unknown = live.filter((i) => i.ready === null);
  const missing = live.filter((i) => i.ready === false);
  const ready_to_file = unknown.length ? null : missing.length === 0;
  const status: FilingReadiness["status"] = ready_to_file === null ? "record_insufficient" : "analysed";

  const summary =
    ready_to_file === true
      ? `Every element ${row.citation} requires the filing to contain, as reproduced here, is documented, so the filing is ready on its face. Readiness on its face is not a substitute for review of the filing itself.`
      : ready_to_file === false
      ? `The company has not documented ${missing.length === 1 ? "one element" : `${missing.length} elements`} ${row.citation} requires: ${missing.map((m) => m.item).join("; ")}. The filing is not ready.`
      : `Readiness cannot be assessed: the record is silent on ${unknown.length === 1 ? "one element" : `${unknown.length} elements`} ${row.citation} requires.`;

  return {
    jurisdiction: spec.code,
    citation: row.citation,
    standard: row.verbatim_quote,
    items,
    ready_to_file,
    status,
    summary,
    ...(ready_to_file === null ? { information_needed: unknown.map((u) => u.item).join("; ") } : {}),
  };
}

// ── Op. 6 — EU/UK representative and DPO ────────────────────────────────────

const EU_MARKET_CODES = new Set([
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
  "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","NO","IS","LI",
]);

function buildRepresentative(intake: I, which: "EU" | "UK"): RepresentativeDetermination {
  const reqRow = dutyRow(which === "EU" ? "eu_representative_requirement" : "uk_representative_requirement");
  const established = tri(which === "EU" ? intake.has_eu_establishment : intake.has_uk_establishment);
  const markets = Array.isArray(intake.markets_served) ? intake.markets_served : [];
  const offers = which === "EU" ? markets.some((m) => EU_MARKET_CODES.has(m)) : markets.includes("UK");
  const territory = which === "EU" ? "the Union" : "the United Kingdom";

  const isPublic = intake.is_public_authority === true;
  // DOC 163 R9 — the UK determination quotes the UK instrument's own rows
  // (gdpr_articles 'uk' 27), not the EU rows relabelled.
  const exemptionRow = dutyRow(which === "EU" ? "eu_representative_exemption" : "uk_representative_exemption");
  const publicRow = dutyRow(which === "EU" ? "eu_representative_public_authority" : "uk_representative_public_authority");
  const exemptionCite = exemptionRow.citation;
  const publicCite = publicRow.citation;
  // DOC 163 R4 — Art. 27(2)(a) is defeated by special categories only "on a
  // large scale"; a bare special-categories answer leaves the exemption live.
  const specialAtScale = intake.processes_special_categories === true && recordedLargeScale(intake) === true;
  const specialUnscaled = intake.processes_special_categories === true && !specialAtScale;
  const occasional =
    intake.large_scale_monitoring !== true &&
    !specialAtScale &&
    intake.acts_as_data_broker !== true;
  // E8973164 (2026-08-28, flagged HIGH) — the "occasional" exemption is
  // defeated when ANY ONE of three conditions is true, but the sentence
  // below used to recite all three disjunctively regardless of which
  // actually held. On a record where only large_scale_monitoring was true
  // and the other two were affirmatively false, the sentence still read
  // "... involves large-scale monitoring, special categories or brokered
  // data", which a reader reasonably takes as asserting all three are live
  // possibilities rather than naming the one the record actually shows.
  // Name only the ground(s) the record actually establishes.
  const engagedGrounds = [
    specialAtScale ? `large-scale special-category processing (${subjectsProse(intake)})` : null,
    intake.large_scale_monitoring === true ? "large-scale monitoring" : null,
    intake.acts_as_data_broker === true ? "broker activity" : null,
  ].filter((g): g is string => g !== null);
  const engagedGroundsText = engagedGrounds.length === 1
    ? engagedGrounds[0]
    : engagedGrounds.length === 2
    ? `${engagedGrounds[0]} and ${engagedGrounds[1]}`
    : `${engagedGrounds.slice(0, -1).join(", ")} and ${engagedGrounds[engagedGrounds.length - 1]}`;

  let verdict: RepresentativeDetermination["verdict"];
  let application: string;
  let status: RepresentativeDetermination["status"] = "analysed";

  if (established === true) {
    verdict = "not_applicable";
    application = `Art. 27(1) applies only where Article 3(2) applies, that is where the controller or processor is NOT established in ${territory}. The record states ${orgName(intake)} is established there, so the designation duty does not arise; the establishment is itself the point of contact.`;
  } else if (established === null) {
    verdict = "record_insufficient";
    status = "record_insufficient";
    application = `Whether Art. 27(1) is engaged turns on establishment in ${territory}, which the record does not state.`;
  } else if (!offers) {
    verdict = "not_engaged";
    application = `${orgName(intake)} is not established in ${territory} and the record does not show goods or services offered to, or behaviour monitored of, data subjects there. Article 3(2) is therefore not engaged, so the Art. 27(1) designation duty does not attach.`;
  } else if (isPublic) {
    verdict = "not_engaged";
    application = `The designation duty does not apply to ${publicRow.verbatim_quote.replace(/\.$/, "")}, and the record states ${orgName(intake)} is a public authority or body (${publicCite}).`;
  } else if (occasional) {
    verdict = "conditional";
    application = specialUnscaled
      ? `Article 3(2) is engaged, so Art. 27(1) prima facie requires a written designation. The record states special-category processing but not its scale, and does not state whether the processing is occasional or unlikely to result in a risk, so the ${exemptionCite} exemption is live but not established: it is defeated by special categories only on a large scale, and "occasional" and "unlikely to result in a risk" are limbs the record does not answer.`
      : `Article 3(2) is engaged, so Art. 27(1) prima facie requires a written designation. The record does not show large-scale special-category processing, large-scale monitoring or broker activity, so the ${exemptionCite} exemption for occasional low-risk processing is live but not established: the record does not evidence that the processing is occasional, and "occasional" is the limb the exemption turns on.`;
  } else {
    verdict = "engaged";
    application = `Article 3(2) is engaged and the ${exemptionCite} exemption is unavailable: the record states ${engagedGroundsText}, so the processing is not occasional. A representative in ${territory} must be designated in writing.`;
  }

  return {
    key: which === "EU" ? "eu_representative" : "uk_representative",
    jurisdiction: which,
    label: `${which} representative (Art. 27)`,
    citation: reqRow.citation,
    standard: reqRow.verbatim_quote,
    // ITEM 413 RG-2 — the record fact is a sentence, not a form. The previous
    // rendering was "Establishment in EU: yes Markets served include EU: not
    // stated. Public authority: no" — three field labels, three colons and a
    // missing stop. Every value it carried is preserved below.
    record_fact: [
      established === true
        ? `The record states ${orgName(intake)} is established in ${territory}.`
        : established === false
        ? `The record states ${orgName(intake)} is not established in ${territory}.`
        : `The record does not state whether ${orgName(intake)} is established in ${territory}.`,
      offers
        ? `The markets served include ${territory}.`
        : `The record does not state that the markets served include ${territory}.`,
      yn(tri(intake.is_public_authority),
        "The record states the organisation is a public authority or body.",
        "The record states the organisation is not a public authority or body."),
    ].join(" "),
    application,
    verdict,
    status,
    // D1D2B3B8-R3 (2026-08-28, flagged HIGH in two documents) — the Art.
    // 27(2) exemption recital renders ONLY where the duty question is live
    // (verdict "conditional" or "engaged"). Where the duty never arises —
    // the organisation IS established, or Article 3(2) is not engaged — the
    // exemptions to a duty that does not attach are not part of the
    // operative analysis, and reciting them framed the conclusion as if the
    // duty would otherwise attach.
    exemption_analysis: verdict === "conditional" || verdict === "engaged"
      ? `${exemptionCite} disapplies the duty for ${exemptionRow.verbatim_quote}. ${publicCite} additionally disapplies it for ${publicRow.verbatim_quote}`
      : "",
    ...(status === "record_insufficient"
      ? { information_needed: `Whether ${orgName(intake)} is established in ${territory}.` }
      : verdict === "conditional"
      ? { information_needed: `whether the processing is occasional, whether special-category data is processed on a large scale${specialUnscaled ? " (special categories are recorded without a scale)" : ""}, and whether the processing is unlikely to result in a risk to the rights and freedoms of natural persons` }
      : {}),
  };
}

// ITEM 369 DEFECT 3(a) — JURISDICTION-SCOPED DPO CITATION LABEL.
// The corpus carries both regimes. A UK-only organisation was being told its
// DPO duty arises under "GDPR Art. 37(1)" — the wrong instrument. The label is
// now driven by the regime the determination actually applied: UK GDPR where
// the record places the organisation in the United Kingdom and NOT in the
// Union; GDPR otherwise. Deterministic, no new facts.
// EU/EEA member-state ISO codes. A market recorded as a single Member State
// (e.g. "DE") places the organisation in the Union just as "EU" does, so the
// label must not fall to UK GDPR on a UK + Member State record.
const EEA_CODES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES",
  "SE", "IS", "LI", "NO",
]);

export function dpoRegimeLabel(intake: I): "GDPR" | "UK GDPR" {
  const markets = (Array.isArray(intake.markets_served) ? intake.markets_served : [])
    .map((m) => String(m).toUpperCase());
  const codeOf = (m: string) => m.replace(/^(EU|EEA)-/, "").trim();
  const uk = intake.has_uk_establishment === true ||
    (intake.organization_country || "") === "UK" ||
    (intake.organization_country || "") === "GB" ||
    markets.some((m) => ["UK", "GB"].includes(codeOf(m)));
  const eu = intake.has_eu_establishment === true ||
    EEA_CODES.has(String(intake.organization_country || "").toUpperCase()) ||
    markets.some((m) => m === "EU" || m === "EEA" || EEA_CODES.has(codeOf(m)));
  return uk && !eu ? "UK GDPR" : "GDPR";
}


/** Re-label a corpus citation string for the regime actually applied. */
export function regimeCite(citation: string, regime: "GDPR" | "UK GDPR"): string {
  if (regime === "GDPR") return citation;
  return citation.replace(/\bUK GDPR\b/g, "GDPR").replace(/\bGDPR\b/g, "UK GDPR");
}

// DOC 142 (2026-09-02) — external review (Batch 7): where the Art. 37(1)
// branch walk leaves the determination open, the Duty-status table's
// Information-required cell rendered an em-dash, because the open-branch
// return below carried no top-level `information_needed` (only the
// per-branch findings did, and deriveDutyStatusTable reads the top level).
// Same rule the Art. 27 rows already follow (A-TEAM S4 RULING S2.17a,
// doc 119): an open determination names the deciding fact, never a dash.
// The entries name the concrete missing fact WITHOUT resolving it — the
// doc-138 discipline (state what is needed; never auto-answer it).
const DPO_BRANCH_MISSING_FACT: Record<string, string> = {
  dpo_trigger_public_authority:
    "whether the organisation is a public authority or body",
  dpo_trigger_regular_systematic_monitoring:
    "whether the organisation's core activities involve regular and systematic monitoring of data subjects on a large scale",
  dpo_trigger_special_categories:
    "whether the special-category processing is a core activity carried out on a large scale (the number of data subjects a year, and whether that processing is central to what the organisation does)",
};

function buildDpo(intake: I): DpoDetermination {
  const regime = dpoRegimeLabel(intake);
  const art = `${regime} Art. 37(1)`;

  // PANEL-BLOCKER REG-1 (2026-08-30) — Art. 37(1) attaches only where the
  // GDPR (or UK GDPR) itself applies. This walk previously ran the three
  // branches for EVERY record, so a US-only organisation with large-scale
  // monitoring recorded was told "A data protection officer must be
  // designated" by a regulation that does not reach it — in the same
  // document whose Art. 27 walk correctly found Article 3(2) not engaged.
  // The gate below reads the SAME establishment/market facts the Art. 27
  // walk reads (buildRepresentative): the instruments reach the organisation
  // where it is established in the Union or the United Kingdom, or where
  // the recorded markets served include either territory (the Art. 3(2)
  // offering signal). Where neither instrument reaches it, the branch walk
  // is not performed — walking the branches of an inapplicable law is what
  // produced the contradiction. Where establishment is unrecorded and no
  // market signal exists, the determination degrades to record_insufficient
  // rather than asserting either way.
  const gateMarkets = Array.isArray(intake.markets_served) ? intake.markets_served : [];
  const euEstablished = tri(intake.has_eu_establishment);
  const ukEstablished = tri(intake.has_uk_establishment);
  const euReach = euEstablished === true ||
    EEA_CODES.has(String(intake.organization_country || "").toUpperCase()) ||
    gateMarkets.some((m) => {
      const code = String(m).toUpperCase().replace(/^(EU|EEA)-/, "").trim();
      return code === "EU" || code === "EEA" || EEA_CODES.has(code);
    });
  const ukReach = ukEstablished === true ||
    ["UK", "GB"].includes(String(intake.organization_country || "").toUpperCase()) ||
    gateMarkets.some((m) => ["UK", "GB"].includes(String(m).toUpperCase().trim()));
  if (!euReach && !ukReach) {
    if (euEstablished === false && ukEstablished === false) {
      return {
        verdict: "not_engaged",
        regime,
        headline:
          `A data protection officer is not required under the GDPR or UK GDPR: neither instrument reaches ${orgName(intake)} on the facts recorded.`,
        reasoning:
          `The Art. 37(1) designation duty attaches only where the GDPR or UK GDPR itself applies. ${orgName(intake)} is not established in the Union or the United Kingdom, and the record does not show goods or services offered to, or behaviour monitored of, data subjects there, so neither instrument reaches the organisation and the branch analysis is not reached. Voluntary designation remains available and is often prudent.`,
        findings: [],
        engaged_branches: [],
        citations: [],
        status: "analysed",
      };
    }
    return {
      verdict: "record_insufficient",
      regime,
      headline:
        `Whether a data protection officer must be designated cannot be determined: whether the GDPR or UK GDPR applies to ${orgName(intake)} turns on establishment and markets the record does not state.`,
      reasoning:
        `The Art. 37(1) designation duty attaches only where the GDPR or UK GDPR itself applies. The record does not state whether ${orgName(intake)} is established in the Union or the United Kingdom, and the recorded markets do not include either territory, so the applicability question — and with it the branch analysis — cannot be resolved from the facts recorded.`,
      findings: [],
      engaged_branches: [],
      citations: [],
      status: "record_insufficient",
      information_needed: `Whether ${orgName(intake)} is established in the Union or the United Kingdom.`,
    };
  }
  // ITEM 369 DEFECT 3(c) — shape-only. Where the record states an industry,
  // the information-needed ask may say why the answer matters in that
  // context. It asserts nothing about the organisation and reaches no
  // conclusion; it only frames the question already being asked.
  const industry = typeof intake.industry === "string" && intake.industry.trim()
    ? intake.industry.trim()
    : null;
  const contextFor = (branch: string): string =>
    industry
      ? ` The record states the organisation operates in ${industry}; ${branch} is assessed against that activity, so the answer determines whether the branch is reached at all.`
      : "";

  // DOC 163 R3 — branch (c) reads the one scale fact the form collects. It is
  // engaged outright where special categories are recorded at more than
  // 100,000 data subjects a year; otherwise it is OPEN, naming the two facts
  // the branch turns on. This replaces the D1D2B3B8-R2 "treated as engaged on
  // a conservative basis" verdict, which printed "Required on reported facts".
  const special = tri(intake.processes_special_categories);
  const scale = recordedLargeScale(intake);
  const specialMet: boolean | null = special === false ? false : special === null ? null : scale === true ? true : null;
  const subjects = subjectsProse(intake);
  const branches: Array<{
    key: string;
    label: string;
    met: boolean | null;
    fact: string;
    why: (m: boolean | null) => string;
  }> = [
    {
      key: "dpo_trigger_public_authority",
      label: `${art}(a) — public authority or body`,
      met: tri(intake.is_public_authority),
      fact: yn(tri(intake.is_public_authority),
        "The record states the organisation is a public authority or body.",
        "The record states the organisation is not a public authority or body."),
      why: (m) => m === null
        ? "Cannot be evaluated: the record does not state the organisation's public-authority status."
        : m
        ? "Processing carried out by a public authority engages branch (a) irrespective of scale, subject only to the carve-out for courts acting in their judicial capacity."
        : "The organisation is not a public authority, so branch (a) is not engaged.",
    },
    {
      key: "dpo_trigger_regular_systematic_monitoring",
      label: `${art}(b) — regular and systematic monitoring on a large scale`,
      met: tri(intake.large_scale_monitoring),
      fact: yn(tri(intake.large_scale_monitoring),
        "The record states the organisation carries out large-scale monitoring of data subjects.",
        "The record states the organisation does not carry out large-scale monitoring."),
      why: (m) => m === null
        ? "Cannot be evaluated: the record does not state whether large-scale monitoring is carried out."
        : m
        ? "Branch (b) is engaged: the record describes regular and systematic monitoring of data subjects on a large scale as a core activity."
        : "Branch (b) is not engaged by the facts recorded.",
    },
    {
      key: "dpo_trigger_special_categories",
      label: `${art}(c) — large-scale special-category or criminal-offence data`,
      met: specialMet,
      fact: special === true
        ? `The record states the organisation processes special categories of personal data${subjects ? `, and records ${subjects}` : ", and records no data-subject count"}.`
        : yn(special,
          "The record states the organisation processes special categories of personal data.",
          "The record states the organisation does not process special categories of personal data."),
      // D1D2B3B8-R2 (2026-08-28, flagged HIGH in two documents) — ONE
      // sentence, conclusion-with-basis first: the old first sentence was a
      // bare recital of the branch test ("Branch (c) is engaged where such
      // processing is a CORE ACTIVITY on a LARGE SCALE.") and downstream
      // first-sentence budgets shipped it alone, so the document stated the
      // test without ever applying it. The record never answers the
      // core-activity question (the intake does not ask it), so the branch
      // is treated as engaged on a stated conservative basis, not asserted
      // as established.
      why: (m) => m === null
        ? (special === null
          ? "Cannot be evaluated: the record does not state whether special categories of data are processed."
          : `The record evidences special-category processing but does not establish that it is a core activity carried out on a large scale, the two qualifiers branch (c) requires${subjects ? ` (the recorded ${subjects} do not by themselves establish large scale)` : " (no data-subject count is recorded)"}; the branch is open, not engaged.`)
        : m
        ? `Branch (c) is engaged: the record evidences special-category processing at ${subjects}, which this assessment treats as large scale; the record does not separately state that the processing is a core activity, and the company's answer is read as a statement about its own activities.`
        : "Branch (c) is not engaged by the facts recorded.",
    },
  ];

  // DOC 163 R9 — the UK regime quotes its own rows (uk_ prefix).
  const findings: Finding[] = branches.map((b) => {
    const row = dutyRow(regime === "UK GDPR" ? `uk_${b.key}` : b.key);
    return {
      key: b.key,
      label: b.label,
      citation: row.citation,
      standard: row.verbatim_quote,
      record_fact: b.fact,
      application: b.why(b.met),
      verdict: b.met === true ? "engaged" : b.met === false ? "not_engaged" : "record_insufficient",
      status: b.met === null ? "record_insufficient" : "analysed",
      ...(b.met === null ? { information_needed: `${b.label}${contextFor(b.label)}` } : {}),
    };
  });

  const engaged = findings.filter((f) => f.verdict === "engaged");
  const unknown = findings.filter((f) => f.verdict === "record_insufficient");
  const pubRow = dutyRow(regime === "UK GDPR" ? "uk_dpo_publication" : "dpo_publication");

  const verdict: DpoDetermination["verdict"] = engaged.length
    ? "engaged"
    : unknown.length
    ? "record_insufficient"
    : "not_engaged";

  return {
    verdict,
    regime,
    headline: engaged.length
      ? `A data protection officer must be designated: ${engaged.length === 1 ? "one" : engaged.length === 2 ? "two" : "all three"} of the three ${art} branches ${engaged.length === 1 ? "is" : "are"} engaged by the facts recorded.`
      : unknown.length
      ? `Whether a data protection officer must be designated cannot be determined from the facts recorded.`
      : `No ${art} branch is engaged by the facts recorded, so designation is not mandatory.`,
    reasoning: engaged.length
      ? `The provision is disjunctive, so one branch suffices. Engaged: ${engaged.map((f) => f.citation).join(", ")}.${unknown.length ? ` ${unknown.map((f) => f.citation).join(", ")} ${unknown.length === 1 ? "remains" : "remain"} open on the facts recorded but need not be reached.` : " The remaining branches are recorded above and do not need to be reached."}`
      : unknown.length
      ? `No branch is affirmatively engaged, but ${unknown.map((f) => f.citation).join(", ")} cannot be evaluated from the facts recorded, so a negative conclusion would be unsafe.`
      : "Each of the three branches was evaluated against the record and none is engaged. Voluntary designation remains available and is often prudent.",
    // FD703575-R1 / 3E9AD759-R2 — the closing act rides its own field.
    // DOC 163 R9 — Art. 37(7) is quoted from the registry, not named as
    // un-ingested.
    ...(engaged.length
      ? {
        closing_act:
          `What closes the duty is a written designation the company records so it can be evidenced, followed by the ${pubRow.citation} step: "${pubRow.verbatim_quote}".`,
      }
      : {}),
    findings,
    engaged_branches: engaged.map((f) => f.citation),
    citations: [...findings.map((f) => f.citation), ...(engaged.length ? [pubRow.citation] : [])],
    status: verdict === "record_insufficient" ? "record_insufficient" : "analysed",
    // DOC 142 — an open determination names the deciding fact(s) at the top
    // level so the Duty-status table never renders a dash for a pending row.
    ...(verdict === "record_insufficient" && unknown.length
      ? {
        information_needed: unknown
          .map((f) => `${f.key === "dpo_trigger_special_categories" && special === null
            ? "whether the organisation processes special categories of personal data or criminal-offence data"
            : DPO_BRANCH_MISSING_FACT[f.key] ?? f.label} — the fact ${f.citation} turns on`)
          .join("; "),
      }
      : {}),
  };
}

// ── DOC 163 R8 (2026-09-03) — BDSG § 38(1), typed ───────────────────────────
//
// Germany is in scope where it is the home country, the lead authority or a
// market (BDSG § 1(4) reaches a non-established controller under Art. 3(2)).
// First sentence: 20 persons constantly engaged in automated processing — the
// S1.1 conditional channel is kept (total headcount never flips it), and a
// total below 20 cannot meet it. Second sentence: a DPO regardless of
// headcount for commercial processing for the purpose of transfer — engaged on
// broker activity or a sale, licence or share of personal data. The second
// sentence's Article 35 limb is named as not assessed: the intake does not ask.

export function germanyInScope(intake: I): boolean {
  const markets = (Array.isArray(intake.markets_served) ? intake.markets_served : []).map((m) => String(m).toUpperCase());
  return String(intake.organization_country || "").toUpperCase() === "DE" ||
    String(intake.eu_lead_member_state || "").toUpperCase() === "DE" ||
    markets.includes("DE");
}

export function buildBdsg(intake: I): BdsgDetermination | null {
  if (!germanyInScope(intake)) return null;
  const s1 = dutyRow("dpo_trigger_bdsg_de");
  const s2 = dutyRow("dpo_trigger_bdsg_de_regardless");
  const headcount = num(intake.employee_count);
  const transfer = intake.acts_as_data_broker === true ||
    intake.sells_or_licenses_brokered_data === true ||
    intake.sells_or_shares_personal_info === true;
  const org = orgName(intake);

  const headcountVerdict: Verdict = headcount === null
    ? "record_insufficient"
    : headcount < 20
    ? "not_engaged"
    : "conditional";
  const headcountFinding: Finding = {
    key: "bdsg_38_1_headcount",
    label: "BDSG § 38(1), first sentence — 20 persons constantly engaged in automated processing",
    citation: s1.citation,
    standard: s1.verbatim_quote,
    record_fact: headcount === null
      ? "The record does not state the organisation's headcount."
      : `The record states ${headcount.toLocaleString("en-US")} employees in total.`,
    application: headcount === null
      ? "Cannot be evaluated: the threshold counts persons constantly engaged in automated processing, and the record states no headcount at all."
      : headcount < 20
      ? `With ${headcount} employees in total, fewer than 20 persons can be constantly engaged in automated processing, so this limb is not met.`
      : `The threshold counts persons constantly engaged in the automated processing of personal data, a narrower group than the ${headcount.toLocaleString("en-US")} employees the record states; the record does not state that number, so this limb is open.`,
    verdict: headcountVerdict,
    status: headcountVerdict === "record_insufficient" ? "record_insufficient" : "analysed",
    ...(headcountVerdict === "conditional"
      ? { information_needed: "how many persons are constantly engaged in the automated processing of personal data (the § 38(1) threshold counts engaged persons, not total headcount)" }
      : headcountVerdict === "record_insufficient"
      ? { information_needed: "the organisation's headcount, and how many persons are constantly engaged in the automated processing of personal data" }
      : {}),
  };
  const transferFinding: Finding = {
    key: "bdsg_38_1_transfer",
    label: "BDSG § 38(1), second sentence — commercial processing for the purpose of transfer",
    citation: s2.citation,
    standard: s2.verbatim_quote,
    record_fact: transfer
      ? "The record states the organisation acts as a data broker, or sells, licenses or shares personal data."
      : "The record does not state that the organisation acts as a data broker or sells, licenses or shares personal data.",
    application: transfer
      ? "Commercial processing of personal data for the purpose of transfer engages the second sentence, which requires a data protection officer regardless of the number of persons employed in processing."
      : "The commercial-transfer limb is not engaged by the facts recorded.",
    verdict: transfer ? "engaged" : "not_engaged",
    status: "analysed",
  };

  const verdict: Verdict = transfer ? "engaged" : headcountVerdict;
  return {
    verdict,
    headline: transfer
      ? `${org} must designate a data protection officer as a matter of German law: BDSG § 38(1), second sentence, is engaged by its commercial processing of personal data for the purpose of transfer, regardless of headcount.`
      : verdict === "conditional"
      ? `Whether ${org} must designate a data protection officer under BDSG § 38(1) turns on how many persons are constantly engaged in automated processing, which the record does not state.`
      : verdict === "record_insufficient"
      ? `Whether ${org} must designate a data protection officer under BDSG § 38(1) cannot be determined: the record states no headcount.`
      : `No BDSG § 38(1) limb this assessment can evaluate is engaged for ${org}: fewer than 20 persons can be constantly engaged in automated processing, and no commercial processing for transfer is recorded.`,
    reasoning:
      "The provision adds two German triggers to Article 37(1)(b) and (c) of the GDPR: the first sentence at 20 persons constantly engaged in the automated processing of personal data, and the second sentence, regardless of headcount, for processing subject to a data protection impact assessment or for commercial processing for the purpose of transfer, anonymised transfer, or market or opinion research. The Article 35 limb of the second sentence is not assessed here: the record does not state whether the processing is subject to a data protection impact assessment.",
    ...(transfer
      ? { closing_act: "What closes the duty is a written designation the company records so it can be evidenced." }
      : {}),
    findings: [headcountFinding, transferFinding],
    citations: [s1.citation, s2.citation],
    status: verdict === "record_insufficient" ? "record_insufficient" : "analysed",
    ...((verdict === "conditional" || verdict === "record_insufficient") && headcountFinding.information_needed
      ? { information_needed: headcountFinding.information_needed }
      : {}),
  };
}

// ── REG-1 (doc 106, 2026-08-29) — EU AI Act Art. 49 registration ────────────
//
// Replaces the former blanket corpus-pending flag for the Art. 49 question:
// the corpus has carried approved rows for AI Act Art. 49, Art. 71 and
// Annex VIII since 2026-08-10 (the old flag's "not yet in this product's
// verified corpus" note had gone stale), so the registration question is now
// determined rather than deferred. No new intake field is read anywhere —
// the branches turn on ai_high_risk / is_public_authority /
// ai_general_purpose_provider / uses_ai_systems plus the same EU-exposure
// signals the Art. 27 representative determination already reads. The
// corpus-pending flag survives ONLY for the general-purpose-AI duty family
// (see buildCorpusPending below), whose operative text is still not in
// corpus.

function euExposureClause(intake: I): string {
  const established = tri(intake.has_eu_establishment);
  const markets = Array.isArray(intake.markets_served) ? intake.markets_served : [];
  const offers = markets.some((m) => EU_MARKET_CODES.has(m));
  if (established === true || offers) return "";
  return " These duties are stated as the Regulation allocates them; whether they reach the company turns on the Regulation's territorial scope, which the record's stated markets and establishments do not resolve.";
}

function aiActFinding(
  rowKey: string,
  label: string,
  record_fact: string,
  application: string,
  verdict: Verdict,
  information_needed?: string,
): Finding {
  const row = dutyRow(rowKey);
  return {
    key: rowKey,
    label,
    citation: row.citation,
    standard: row.verbatim_quote,
    record_fact,
    application,
    verdict,
    status: verdict === "record_insufficient" ? "record_insufficient" : "analysed",
    ...(information_needed ? { information_needed } : {}),
  };
}

function buildAiActRegistration(intake: I): AiActRegistrationDetermination | null {
  const highRisk = intake.ai_high_risk === true;
  const gpai = intake.ai_general_purpose_provider === true;
  const usesAi = intake.uses_ai_systems === true;
  if (!highRisk && !gpai && !usesAi) return null;

  const isPublic = intake.is_public_authority === true;
  const scope = euExposureClause(intake);

  if (highRisk && isPublic) {
    // Branch A — the Art. 49(3) public-authority deployer rail.
    const deployer = aiActFinding(
      "aiact_registration_public_deployer",
      "AI Act Art. 49(3) — public-authority deployer registration",
      "The record states the organisation is a public authority and that a high-risk AI system is in use.",
      "A public-authority deployer of an Annex III high-risk system registers itself, selects the system and registers its use in the EU database before putting it into service or using it.",
      "conditional",
      "the Annex III point under which the system in use is classified",
    );
    const national = aiActFinding(
      "aiact_registration_national_level",
      "AI Act Art. 49(5) — the critical-infrastructure exception",
      "The record does not identify which Annex III listing covers the system in use.",
      "Systems under Annex III point 2 are registered at national level rather than in the EU database, so the registration venue turns on the system's Annex III classification.",
      "conditional",
    );
    return {
      verdict: "conditional",
      headline:
        "The company has indicated that it is a public authority using a high-risk AI system, which engages the EU-database registration duty for public-authority deployers on a conservative basis.",
      reasoning:
        `Article 49(3) of Regulation (EU) 2024/1689 requires deployers that are public authorities, Union institutions, bodies, offices or agencies, or persons acting on their behalf, to register themselves, select the system and register its use in the EU database established under Article 71 before putting the system into service or using it. The exception is a high-risk system listed in point 2 of Annex III (critical infrastructure), which Article 49(5) sends to national-level registration instead. The record does not identify which Annex III listing covers the system in use, so this assessment records the duty as engaged on a conservative basis and does not resolve the point-2 exception.${scope}`,
      closing_act:
        "What would complete the determination is the Annex III point under which the system in use is classified.",
      findings: [deployer, national],
      citations: [deployer.citation, national.citation],
      status: "analysed",
    };
  }

  // DOC 163 R1 — the company's role for the high-risk system, where answered.
  const role = (str(intake.ai_high_risk_role) ?? "").toLowerCase();
  if (highRisk && (role === "provider" || role === "both")) {
    const provider = aiActFinding(
      "aiact_registration_provider",
      "AI Act Art. 49(1) — provider registration",
      `The record states the company ${role === "both" ? "provides and uses" : "provides"} a high-risk AI system: it developed the system or places it on the market under its own name or trademark.`,
      "The provider, or its authorised representative, registers itself and the system in the EU database before placing it on the market or putting it into service, with the information listed in Annex VIII, Section A.",
      "engaged",
    );
    const deployer = aiActFinding(
      "aiact_registration_public_deployer",
      "AI Act Art. 49(3) — deployer registration reaches public authorities only",
      "The record states the organisation is not a public authority, or does not state that it is one.",
      "A deployer registers only where it is a public authority, a Union institution, body, office or agency, or a person acting on behalf of one; no deployer-side registration duty arises for the company from this record.",
      "not_engaged",
    );
    return {
      verdict: "engaged",
      headline:
        `The company has indicated that it ${role === "both" ? "provides and uses" : "provides"} a high-risk AI system, so the EU-database registration duty of Article 49(1) is the company's own.`,
      reasoning:
        `Article 49(1) of Regulation (EU) 2024/1689 requires the provider of an Annex III high-risk system, or its authorised representative, to register itself and the system in the EU database established under Article 71 before placing the system on the market or putting it into service, with the information listed in Annex VIII, Section A. The company has indicated that it holds the provider role, so the duty is the company's.${role === "both" ? " As deployer it registers only if it is a public authority (Article 49(3)), which the record does not state." : ""}${scope}`,
      closing_act:
        "What closes the duty is the registration itself in the EU database referred to in Article 71, with the Annex VIII, Section A information, before the system is placed on the market or put into service; whether the system falls within point 2 of Annex III, which Article 49(5) sends to national registration instead, is not asked by this assessment.",
      findings: [provider, deployer],
      citations: [provider.citation, deployer.citation],
      status: "analysed",
    };
  }
  if (highRisk && role === "deployer") {
    const deployer = aiActFinding(
      "aiact_registration_public_deployer",
      "AI Act Art. 49(3) — deployer registration reaches public authorities only",
      "The record states the company uses a third party's high-risk AI system as its deployer, and does not state that it is a public authority.",
      "A deployer registers only where it is a public authority, a Union institution, body, office or agency, or a person acting on behalf of one; no deployer-side registration duty arises for the company from this record.",
      "not_engaged",
    );
    const provider = aiActFinding(
      "aiact_registration_provider",
      "AI Act Art. 49(1) — provider registration",
      "The record states the company does not provide the system.",
      "The EU-database registration duty for the system rests on its provider or the provider's authorised representative, not on the company.",
      "not_engaged",
    );
    return {
      verdict: "not_engaged",
      headline:
        "The company has indicated that it uses a third party's high-risk AI system as its deployer; the EU-database registration duty for that system rests on its provider under Article 49(1), and a deployer registers only where it is a public authority, which the record does not state.",
      reasoning:
        `Under Regulation (EU) 2024/1689, registration of an Annex III high-risk system in the EU database is the provider's duty (Article 49(1)); a deployer registers only where it is a public authority or acts on behalf of one (Article 49(3)). The company has indicated the deployer role and has not indicated public-authority status, so no EU-database registration duty arises for it on its answers. Its Chapter III deployer duties are outside this registration determination.${scope}`,
      findings: [deployer, provider],
      citations: [deployer.citation, provider.citation],
      status: "analysed",
    };
  }

  if (highRisk) {
    // Branch B — the provider-vs-deployer allocation.
    const provider = aiActFinding(
      "aiact_registration_provider",
      "AI Act Art. 49(1) — provider registration",
      "The record states a high-risk AI system is in use, and does not state whether the company supplies it as its provider or uses a third party's system.",
      "The EU-database registration duty for an Annex III high-risk system rests on the provider or its authorised representative, before placing the system on the market or putting it into service, with the information listed in Annex VIII, Section A.",
      "conditional",
      "whether the company developed the system or places it on the market under its own name or trademark",
    );
    const deployer = aiActFinding(
      "aiact_registration_public_deployer",
      "AI Act Art. 49(3) — deployer registration reaches public authorities only",
      "The record states the organisation is not a public authority, or does not state that it is one.",
      "A deployer registers only where it is a public authority, a Union institution, body, office or agency, or a person acting on behalf of one; no deployer-side registration duty arises for the company from this record.",
      "not_engaged",
    );
    return {
      verdict: "conditional",
      headline:
        "The company has indicated that a high-risk AI system is in use; the EU-database registration duty for such a system rests on its provider, and the company's answers do not state whether it holds that role.",
      reasoning:
        `Under Regulation (EU) 2024/1689, registration of an Annex III high-risk system in the EU database is the provider's duty — Article 49(1), discharged before placing the system on the market or putting it into service, with the Annex VIII Section A information. A deployer registers only where it is a public authority or acts on behalf of one (Article 49(3)). The record does not state whether the company supplies the system as its provider or uses a third party's system, so this assessment states the duty as the Regulation allocates it and does not attribute it.${scope}`,
      closing_act:
        "What would complete the determination is whether the company developed the system or places it on the market under its own name or trademark.",
      findings: [provider, deployer],
      citations: [provider.citation, deployer.citation],
      status: "analysed",
    };
  }

  if (gpai) {
    // Branch C — scope negative, grounded on the ingested Art. 49 text.
    const scopeFinding = aiActFinding(
      "aiact_registration_provider",
      "AI Act Art. 49 — registration scope",
      "The record states the company provides a general-purpose AI model, and does not indicate any high-risk AI system.",
      "Article 49's EU-database registration duties reach high-risk AI systems and systems a provider has assessed under Article 6(3); the general-purpose-model provider role does not, by itself, engage them.",
      "not_engaged",
    );
    return {
      verdict: "not_engaged",
      headline:
        "The company has indicated that it provides a general-purpose AI model; that role does not, by itself, engage the EU-database registration duties of Article 49.",
      reasoning:
        `Article 49's registration duties reach high-risk AI systems — the provider's registration under Article 49(1) and the public-authority deployer's registration under Article 49(3) — and systems a provider has assessed as not high-risk under Article 6(3), which Article 49(2) still sends to the EU database. The general-purpose-model provider role engages none of these on the information provided, so this assessment records no EU-database registration duty from that role alone.${scope}`,
      findings: [scopeFinding],
      citations: [scopeFinding.citation],
      status: "analysed",
    };
  }

  // Branch D — uses_ai_systems only.
  const notHighRisk = aiActFinding(
    "aiact_registration_not_high_risk",
    "AI Act Art. 49(2) — registration of an Article 6(3) not-high-risk conclusion",
    "The record states AI systems are in use and does not indicate any is high-risk.",
    "Where a provider has concluded under Article 6(3) that a system is not high-risk, Article 49(2) still requires registering that provider and system in the EU database; the record does not address whether the company has made such an assessment for a system it provides.",
    "conditional",
    "whether the company has itself made an Article 6(3) assessment for a system it provides",
  );
  return {
    verdict: "not_engaged",
    headline:
      "The company has indicated that AI systems are in use but has not indicated any is high-risk; on the information provided, no EU-database registration duty is established.",
    reasoning:
      `Article 49's duties attach to high-risk AI systems and to systems a provider has assessed under Article 6(3) as not high-risk. Neither is indicated on the information provided, so no registration duty is established.${scope}`,
    closing_act:
      "If the company has itself made an Article 6(3) assessment for a system it provides, Article 49(2) requires that assessment's registration — a fact the record does not address.",
    findings: [notHighRisk],
    citations: [notHighRisk.citation],
    status: "analysed",
  };
}

// ── CORPUS-PENDING — narrowed to the GPAI duty family (REG-1) ───────────────

function buildCorpusPending(intake: I): CorpusPendingFlag[] {
  if (intake.ai_general_purpose_provider !== true) return [];
  return [
    {
      topic: "EU AI Act general-purpose AI model duties",
      named_provisions: [
        "Regulation (EU) 2024/1689, Chapter V (general-purpose AI models)",
      ],
      status: "record_insufficient",
      note:
        "The company's general-purpose-model provider role also raises duties under the Regulation's general-purpose-AI chapter, including notification duties for models with systemic risk. Their operative text is not yet among the authorities relied on in this assessment, and those duties are not yet assessable here.",
    },
  ];
}

// ── Op. 7 — narrative ───────────────────────────────────────────────────────

function buildNarrative(
  intake: I,
  determinations: RegistrationDetermination[],
  reps: RepresentativeDetermination[],
  dpo: DpoDetermination,
  pending: CorpusPendingFlag[],
  combinedCallout: string | null,
  bdsg: BdsgDetermination | null = null,
): RegistrationNarrative {
  const name = orgName(intake);
  const assessed = determinations.map((d) => d.state_name);
  const registrable = determinations.filter((d) => d.verdict === "registrable");
  const conditional = determinations.filter((d) => d.verdict === "conditional");
  const insufficient = determinations.filter((d) => d.verdict === "record_insufficient");
  const clear = determinations.filter((d) => d.verdict === "not_registrable");

  // ITEM 413 RG-4 (G-2 class) — THE OVERVIEW OPENS WITH THE VERDICT.
  // It previously opened "This assessment examines whether …": the method
  // before the answer. The opener below is composed only from determinations
  // already reached above; it asserts nothing new.
  const engagedReps = reps.filter((r) => r.verdict === "engaged").map((r) => r.jurisdiction);
  const repClause = engagedReps.length
    ? `${engagedReps.join(" and ")} Art. 27 representative ${engagedReps.length > 1 ? "designations are" : "designation is"} required`
    : reps.some((r) => r.verdict === "conditional")
    ? "the Art. 27 representative position is conditional on facts the record does not settle"
    : "no Art. 27 representative designation is required";
  const dpoClause = dpo.verdict === "engaged"
    ? "a data protection officer must be designated"
    : dpo.verdict === "record_insufficient"
    // ITEM 413-B: A6 register — "on this record" is a banned phrase.
    ? "the data protection officer question cannot be settled by the facts recorded"
    : "no data protection officer designation is required";
  const verdictOpener = registrable.length
    ? `${name} is registrable in ${registrable.map((d) => d.state_name).join(", ")}; ${repClause}; ${dpoClause}.`
    : conditional.length
    ? `${name}'s registration position is conditional in ${conditional.map((d) => d.state_name).join(", ")}; ${repClause}; ${dpoClause}.`
    : insufficient.length
    ? `${name}'s registration position cannot be settled as the record stands in ${insufficient.map((d) => d.state_name).join(", ")}; ${repClause}; ${dpoClause}.`
    : `${name} is not registrable under any US state data-broker regime covered by this assessment; ${repClause}; ${dpoClause}.`;

  const overview = [
    verdictOpener,
    `The determinations rest on the legal authorities listed in Authorities Cited and on nothing else.`,
    assessed.length
      ? `Four US state data-broker registration regimes were considered and ${assessed.length === 1 ? "one was" : `${["", "one", "two", "three", "four"][assessed.length] ?? String(assessed.length)} were`} in scope here: ${assessed.join(", ")}. Each state's own definitional threshold was applied; the definitions differ materially and are not treated as interchangeable — California and Vermont turn on the absence of a direct relationship with the consumer, Oregon contains no such carve-out, and Texas reaches processing and transfer rather than sale and adds a separate revenue-or-volume applicability test.`
      : "No US state data-broker registration regime in the corpus was in scope on the markets and activities this record describes.",
    "The GDPR and UK GDPR Art. 27 representative duties and the Art. 37(1) data protection officer triggers were each assessed against the record rather than inferred from organisation size.",
    "Every conclusion below states the provision it rests on, reproduces that provision's operative text, records the fact from the intake it was measured against, and gives the reasoning. Where the record does not support a conclusion, none is given.",
  ].join(" ");

  const parts: string[] = [];
  if (registrable.length) {
    parts.push(
      `${name} is required to register in ${registrable.map((d) => d.state_name).join(", ")}. ${registrable
        .map((d) => `${d.state_name}: ${d.reasoning}`)
        .join(" ")}`,
    );
  }
  if (conditional.length) {
    parts.push(
      `In ${conditional
        .map((d) => d.state_name)
        .join(", ")} the definition is met but a statutory exclusion has been claimed that the record does not establish. The registration duty turns on that claim and should be resolved before any decision not to file.`,
    );
  }
  if (clear.length) {
    parts.push(
      `No registration duty arises in ${clear.map((d) => d.state_name).join(", ")} as the record stands. ${clear
        .map((d) => `${d.state_name}: ${d.threshold.application}`)
        .join(" ")} This is a conclusion about the record as it stands; a change in collection or sale practice would require the question to be asked again.`,
    );
  }
  if (insufficient.length) {
    parts.push(
      `For ${insufficient
        .map((d) => d.state_name)
        .join(", ")} the record is insufficient to reach a conclusion. The specific facts needed are listed with each determination and are not guessed at here.`,
    );
  }
  if (combinedCallout) parts.push(combinedCallout);
  for (const r of reps) parts.push(`${r.label}: ${r.application}`);
  parts.push(`Data protection officer: ${dpo.headline} ${dpo.reasoning}${dpo.closing_act ? ` ${dpo.closing_act}` : ""}`);
  if (bdsg) parts.push(`Germany: ${bdsg.headline}`);
  for (const p of pending) {
    // CORPUS-PENDING REGISTER (ITEM 364 D3): name the topic, say why it cannot
    // be answered, and say what follows meanwhile. Never talked around, never
    // apologised for, and never compressed into one over-loaded sentence.
    parts.push(
      `The question of ${p.topic.charAt(0).toLowerCase() + p.topic.slice(1)} is recorded here and left open. ${p.note} The provisions that would settle it are listed with this flag. Until their text is in corpus the question stays live; nothing above should be read as a finding that no duty arises.`,
    );
  }

  parts.push(
    `Statutory windows and fees are stated as the statutes state them. This assessment does not compute a filing date for ${name}; the operative dates should be fixed by counsel against the organisation's own compliance calendar.`,
  );

  return { overview, determination: parts.join("\n\n") };
}

// ── Attestation ─────────────────────────────────────────────────────────────
//
// Registration status is not stable over time: it changes when a statute is
// amended, when an applicability threshold moves, or when the organisation
// begins serving a new jurisdiction. Those are the review triggers named here.
// SCHEDULE-SURFACE LAW holds: no date is computed, including the review date.

function str(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > 0 ? s : null;
}

// ITEM 369 DEFECT 3(b) — TRIGGERS SCOPED TO THE STATUTES ACTUALLY ENGAGED.
// The list previously named all four US data-broker statutes even where the
// assessment concluded no US regime applied. The amendment trigger now names
// only the statutes this assessment reached; where none were reached it reads
// as a general statute-amendment trigger for the jurisdictions assessed and
// names no statute.
const STATE_BROKER_STATUTE: Record<string, string> = {
  "US-CA": "Cal. Civ. Code §§ 1798.99.80–.86",
  "US-VT": "9 V.S.A. §§ 2430, 2446",
  "US-TX": "Tex. Bus. & Com. Code §§ 510.001–.005",
  "US-OR": "ORS 646A.593",
};

export function registrationReviewTriggers(intake: I): string[] {
  const engaged = STATE_SPECS
    .filter((s) => stateInScope(intake, s.code))
    .map((s) => STATE_BROKER_STATUTE[s.code])
    .filter((x): x is string => Boolean(x));
  // QA batch 2026-09-05 — the non-engaged branch used to append "No US state
  // data-broker statute was in scope here, so none is named." to this
  // sentence. It read as a stray aside glued onto an unrelated general
  // amendment-trigger clause, breaking the parallel one-sentence-per-bullet
  // structure the other three triggers keep, and it told the reader nothing
  // they needed: the sentence never claims to name a statute in the first
  // place, so there is nothing to explain the absence of.
  const amendment = engaged.length
    ? `Amendment of any data-broker registration statute named in this assessment (${engaged.join("; ")}).`
    : "Amendment of any registration or designation statute in force in the jurisdictions assessed here.";
  return [
    amendment,
    "A change in the organisation's own facts that moves it across a statutory applicability threshold, in either direction.",
    "Entry into, or exit from, any jurisdiction not assessed here — including any new state data-broker registry.",
    "Any change to the organisation's establishment position in the Union or the United Kingdom bearing on the Art. 27 representative determinations.",
  ];
}


export function buildRegistrationAttestation(intake: I): Attestation {
  const name = str(intake.approved_by_name);
  const title = str(intake.approved_by_title);
  const date = str(intake.approval_date);
  const review = str(intake.next_review_due);

  const missing: string[] = [];
  if (!name) missing.push("the name of the person approving this assessment");
  if (!title) missing.push("that person's role or title");
  if (!date) missing.push("the date of approval");
  if (!review) missing.push("the date this assessment is next due for review");

  // QA batch 2026-09-05 (REG 02, "report repeats … approval paragraphs") —
  // the pending statement listed the missing facts AND information_needed
  // listed the same facts again one line below. The statement now states the
  // status and the completion condition; the list lives in information_needed
  // alone.
  const statement = missing.length === 0
    ? `${name}, ${title}, approved this registration assessment on ${date}. It is next due for review on ${review}, or earlier on any of the triggers below.`
    : "Approval status: pending. Approval is complete when an accountable person is named and the approval and next review dates are recorded.";

  return {
    heading: "Approval and review",
    approved_by_name: name,
    approved_by_title: title,
    approval_date: date,
    next_review_due: review,
    review_triggers: registrationReviewTriggers(intake),
    statement,
    status: missing.length === 0 ? "analysed" : "record_insufficient",
    // ITEM 413 (G-4 class) — ATTESTATION REGISTER-CLEAN. The ask was a
    // semicolon litany that restated the statement's own words. It is now a
    // sentence naming what must be recorded, in the register of the surface it
    // sits on.
    ...(missing.length
      ? {
        information_needed: `To complete this block the record must state ${
          missing.length === 1
            ? missing[0]
            : `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`
        }.`,
      }
      : {}),
  };
}

// ── Entry point ─────────────────────────────────────────────────────────────

export function buildRegistrationDeliverables(
  intake: RegistrationIntakeForDeliverables,
): RegistrationDeliverables {
  const specs = STATE_SPECS.filter((s) => stateInScope(intake, s.code));

  const determinations = specs.map((s) => buildDetermination(intake, s));
  const schedules = specs
    .filter((_, i) => determinations[i].verdict !== "not_registrable")
    .map((s) => buildSchedule(s));
  const filing_readiness = specs
    .filter(
      (_, i) =>
        determinations[i].verdict === "registrable" || determinations[i].verdict === "conditional",
    )
    .map((s) => buildFilingReadiness(intake, s));

  const representative_determinations = [
    buildRepresentative(intake, "EU"),
    buildRepresentative(intake, "UK"),
  ];
  const both_representatives_required = representative_determinations.every(
    (r) => r.verdict === "engaged",
  );
  const combined_representative_callout = both_representatives_required
    ? `Both representative duties are engaged. This processing requires appointing TWO separate representatives: one established in a Member State where the relevant data subjects are (GDPR Art. 27(1), (3)), and one established in the United Kingdom (UK GDPR Art. 27(1), (3)). Neither designation satisfies the other — the two regimes have applied independently since the United Kingdom left the Union, and a single person or entity may only serve both roles if it is separately established in each territory and separately designated in writing for each.`
    : null;
  const dpo_determination = buildDpo(intake);
  const bdsg_determination = buildBdsg(intake);
  const ai_act_registration = buildAiActRegistration(intake);
  const corpus_pending = buildCorpusPending(intake);

  return {
    determinations,
    schedules,
    filing_readiness,
    representative_determinations,
    both_representatives_required,
    ...(combined_representative_callout
      ? { combined_representative_callout }
      : {}),
    dpo_determination,
    bdsg_determination,
    ...(ai_act_registration ? { ai_act_registration } : {}),
    corpus_pending,
    narrative: buildNarrative(
      intake,
      determinations,
      representative_determinations,
      dpo_determination,
      corpus_pending,
      combined_representative_callout,
      bdsg_determination,
    ),
    attestation: buildRegistrationAttestation(intake),
  };
}
