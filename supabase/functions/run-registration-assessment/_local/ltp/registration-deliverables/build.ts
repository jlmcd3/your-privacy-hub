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
  Attestation,
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
} from "./types.ts";

export const REGISTRATION_DELIVERABLES_VERSION =
  `registration-deliverables-item316-2026-07-31 (${REGISTRATION_DUTY_VERSION})`;

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

  // Attestation intake (optional). No date is computed from these.
  approved_by_name?: string | null;
  approved_by_title?: string | null;
  approval_date?: string | null;
  next_review_due?: string | null;

  [k: string]: unknown;
}

type I = RegistrationIntakeForDeliverables;

const UNKNOWN = "The record does not state this.";

function tri(v: unknown): boolean | null {
  return v === true ? true : v === false ? false : null;
}
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function yn(v: boolean | null, yes: string, no: string): string {
  return v === true ? yes : v === false ? no : UNKNOWN;
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
  exclusion_key: string | null;
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
  const volumeLimb = count === null ? null : count > 50000;
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
        ? UNKNOWN
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
        ? UNKNOWN
        : `The record states the personal data of ${count.toLocaleString("en-US")} individuals is handled without direct collection.`,
      met: volumeLimb,
      reasoning: count === null
        ? "Cannot be evaluated: the record does not state the number of individuals whose data is handled indirectly."
        : volumeLimb
        ? `${count.toLocaleString("en-US")} exceeds the statutory 50,000 threshold, so this limb is met.`
        : `${count.toLocaleString("en-US")} does not exceed the statutory 50,000 threshold, so this limb is not met on its own.`,
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
        : "Vermont's statute illustrates a direct relationship by reference to past or present customers, clients, subscribers, users and registered users; the record shows that relationship exists and the definition is not engaged.",
    },
  ];
}

const STATE_SPECS: StateSpec[] = [
  {
    code: "US-CA",
    state_name: "California",
    filing_body: "the California Privacy Protection Agency",
    definition_keys: ["ca_data_broker_definition"],
    exclusion_key: "ca_data_broker_exclusions",
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
    exclusion_key: null,
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
    exclusion_key: "tx_applicability_exclusions",
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
    exclusion_key: "vt_activity_exclusions",
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
  const claimed = (intake.data_broker_exemption_claimed || "").trim();
  const hasClaim = claimed !== "" && claimed !== "none" && claimed !== "unknown";
  const exclusionRow = spec.exclusion_key ? dutyRow(spec.exclusion_key) : null;

  const exclusion_analysis = !exclusionRow
    ? `The ${spec.state_name} registration provision states no exclusion list in its operative text, so no exclusion is applied here.`
    : !hasClaim
    ? `The record claims no statutory exclusion. ${spec.state_name}'s exclusion text (${exclusionRow.citation}) is reproduced with this finding and is not applied absent a claimed and evidenced basis.`
    : `The record claims the "${claimed}" exclusion. Whether that claim succeeds turns on the entity's own facts measured against ${exclusionRow.citation}, which the record does not establish; the claim is recorded, not accepted.`;

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
    ...(met === null ? { information_needed: open.join("; ") } : {}),
  };
}

function buildDetermination(intake: I, spec: StateSpec): RegistrationDetermination {
  const threshold = buildThreshold(intake, spec);
  const reqRow = dutyRow(spec.requirement_key);
  const met = threshold.verdict;
  const conditional = threshold.exclusion_claimed !== null && met === "satisfied";

  const verdict: RegistrationDetermination["verdict"] =
    met === "record_insufficient"
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
      met === "satisfied"
        ? `Because the definition is met, the registration duty in ${reqRow.citation} attaches and must be discharged with ${spec.filing_body}.`
        : met === "not_satisfied"
        ? `The duty in ${reqRow.citation} is predicated on meeting the definition. It does not attach as matters stand; it would attach in any year in which the definition is met.`
        : `The duty in ${reqRow.citation} cannot be resolved until the definitional limbs above are evidenced.`,
    verdict: met === "satisfied" ? "engaged" : met === "not_satisfied" ? "not_engaged" : "record_insufficient",
    status: met === "record_insufficient" ? "record_insufficient" : "analysed",
    ...(met === "record_insufficient"
      ? { information_needed: threshold.information_needed || "Definitional limbs unevidenced." }
      : {}),
  };

  const headline =
    verdict === "registrable"
      ? `${orgName(intake)} is required to register as a data broker in ${spec.state_name} with ${spec.filing_body}.`
      : verdict === "not_registrable"
      ? `${orgName(intake)} is not required to register as a data broker in ${spec.state_name} as the record stands.`
      : verdict === "conditional"
      ? `${orgName(intake)} meets the ${spec.state_name} data-broker definition, but has claimed a statutory exclusion that the record does not establish; registration turns on that claim.`
      : `Whether ${orgName(intake)} must register in ${spec.state_name} cannot be determined from the facts recorded.`;

  const open_questions: string[] = [];
  for (const l of threshold.limbs) {
    if (l.met === null) open_questions.push(`${spec.state_name}: evidence needed on — ${l.limb}.`);
  }
  if (verdict === "conditional") {
    open_questions.push(
      `${spec.state_name}: substantiate the claimed "${threshold.exclusion_claimed}" exclusion against ${
        spec.exclusion_key ? dutyRow(spec.exclusion_key).citation : reqRow.citation
      }.`,
    );
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

const FILING_ITEM_MAP: Record<string, Array<{ item: string; intake_key: string | null }>> = {
  "US-CA": [
    { item: "Name and primary physical, email and website addresses of the data broker", intake_key: "filing_contact_details_ready" },
    { item: "How a consumer may exercise deletion and opt-out rights", intake_key: "filing_opt_out_mechanism_documented" },
    { item: "Whether the data broker collects the personal information of minors", intake_key: "filing_minors_data_practices_documented" },
    // COVERAGE FIX (2026-08-04): § 1798.99.82(b)(2)(B) requires the metrics
    // compiled under § 1798.99.85(a)(1)-(2). The list previously omitted it.
    { item: "The metrics compiled pursuant to paragraphs (1) and (2) of subdivision (a) of Section 1798.99.85", intake_key: "filing_metrics_documented" },
  ],
  "US-OR": [
    { item: "Name, street address, telephone number, primary website and electronic mail address", intake_key: "filing_contact_details_ready" },
  ],
  "US-TX": [
    { item: "Legal name, contact person, physical address, e-mail, telephone and website", intake_key: "filing_contact_details_ready" },
    // COVERAGE FIX (2026-08-04): § 510.005(b)(2-a) requires a link to a page
    // giving consumers prominently displayed instructions on exercising their
    // rights under § 541.051. The list previously omitted it.
    { item: "Link to a page providing consumers with prominently displayed instructions on exercising their rights under Section 541.051", intake_key: "filing_rights_instructions_documented" },
  ],
  "US-VT": [
    { item: "Name and primary physical, e-mail and Internet addresses of the data broker", intake_key: "filing_contact_details_ready" },
    { item: "Opt-out arrangements, if any are offered", intake_key: "filing_opt_out_mechanism_documented" },
    { item: "Statement concerning the collection of the personal information of minors", intake_key: "filing_minors_data_practices_documented" },
  ],
};

function buildFilingReadiness(intake: I, spec: StateSpec): FilingReadiness {
  const row = dutyRow(spec.filing_key);
  const defs = FILING_ITEM_MAP[spec.code] || [];
  const items = defs.map((d) => {
    const v = d.intake_key ? tri(intake[d.intake_key]) : null;
    return {
      item: d.item,
      intake_key: d.intake_key,
      ready: v,
      record_fact: yn(v,
        "The record states this element is documented and available to file.",
        "The record states this element is not yet documented."),
    };
  });
  const unknown = items.filter((i) => i.ready === null);
  const missing = items.filter((i) => i.ready === false);
  const ready_to_file = unknown.length ? null : missing.length === 0;
  const status: FilingReadiness["status"] = ready_to_file === null ? "record_insufficient" : "analysed";

  const summary =
    ready_to_file === true
      ? `Every element ${row.citation} requires the filing to contain is documented, so the filing is ready on its face. Readiness on its face is not a substitute for review of the filing itself.`
      : ready_to_file === false
      ? `The record shows ${missing.length} element(s) ${row.citation} requires are not yet documented: ${missing.map((m) => m.item).join("; ")}. The filing is not ready.`
      : `Readiness cannot be assessed: the record is silent on ${unknown.length} element(s) ${row.citation} requires.`;

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
  const exemptionRow = dutyRow("eu_representative_exemption");
  const publicRow = dutyRow("eu_representative_public_authority");
  const occasional =
    intake.large_scale_monitoring !== true &&
    intake.processes_special_categories !== true &&
    intake.acts_as_data_broker !== true;

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
    application = `The designation duty does not apply to ${publicRow.verbatim_quote.replace(/\.$/, "")}, and the record states ${orgName(intake)} is a public authority or body (${publicRow.citation}).`;
  } else if (occasional) {
    verdict = "conditional";
    application = `Article 3(2) is engaged, so Art. 27(1) prima facie requires a written designation. The record does not show large-scale special-category processing, large-scale monitoring or broker activity, so the ${exemptionRow.citation} exemption for occasional low-risk processing is live but not established: the record does not evidence that the processing is occasional, and "occasional" is the limb the exemption turns on.`;
  } else {
    verdict = "engaged";
    application = `Article 3(2) is engaged and the ${exemptionRow.citation} exemption is unavailable: the record shows processing that is not occasional and that involves large-scale monitoring, special categories or brokered data. A representative in ${territory} must be designated in writing.`;
  }

  return {
    key: which === "EU" ? "eu_representative" : "uk_representative",
    jurisdiction: which,
    label: `${which} representative (Art. 27)`,
    citation: reqRow.citation,
    standard: reqRow.verbatim_quote,
    record_fact: `Establishment in ${territory}: ${yn(established, "yes", "no")} Markets served include ${territory}: ${offers ? "yes." : "not stated."} Public authority: ${yn(tri(intake.is_public_authority), "yes", "no")}`,
    application,
    verdict,
    status,
    exemption_analysis: `${exemptionRow.citation} disapplies the duty for ${exemptionRow.verbatim_quote}. ${publicRow.citation} additionally disapplies it for ${publicRow.verbatim_quote}`,
    ...(status === "record_insufficient"
      ? { information_needed: `Whether ${orgName(intake)} is established in ${territory}.` }
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
function regimeCite(citation: string, regime: "GDPR" | "UK GDPR"): string {
  if (regime === "GDPR") return citation;
  return citation.replace(/\bUK GDPR\b/g, "GDPR").replace(/\bGDPR\b/g, "UK GDPR");
}

function buildDpo(intake: I): DpoDetermination {
  const regime = dpoRegimeLabel(intake);
  const art = `${regime} Art. 37(1)`;
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
      met: tri(intake.processes_special_categories),
      fact: yn(tri(intake.processes_special_categories),
        "The record states the organisation processes special categories of personal data.",
        "The record states the organisation does not process special categories of personal data."),
      why: (m) => m === null
        ? "Cannot be evaluated: the record does not state whether special categories of data are processed."
        : m
        ? "Branch (c) is engaged where such processing is a CORE ACTIVITY on a LARGE SCALE. The record evidences special-category processing; whether it is core and large-scale is a matter for the controller's own record, and the branch is treated as engaged for the purpose of this determination."
        : "Branch (c) is not engaged by the facts recorded.",
    },
  ];

  const findings: Finding[] = branches.map((b) => {
    const row = dutyRow(b.key);
    return {
      key: b.key,
      label: b.label,
      citation: regimeCite(row.citation, regime),
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

  const verdict: DpoDetermination["verdict"] = engaged.length
    ? "engaged"
    : unknown.length
    ? "record_insufficient"
    : "not_engaged";

  return {
    verdict,
    headline: engaged.length
      ? `A data protection officer must be designated: ${engaged.length} of the three ${art} branches is engaged by the facts recorded.`
      : unknown.length
      ? `Whether a data protection officer must be designated cannot be determined from the facts recorded.`
      : `No ${art} branch is engaged by the facts recorded, so designation is not mandatory.`,
    reasoning: engaged.length
      ? `${art} is disjunctive: one branch suffices. Engaged: ${engaged.map((f) => f.citation).join(", ")}. The remaining branches are recorded above and do not need to be reached.`
      : unknown.length
      ? `No branch is affirmatively engaged, but ${unknown.map((f) => f.citation).join(", ")} cannot be evaluated from the facts recorded, so a negative conclusion would be unsafe.`
      : "Each of the three branches was evaluated against the record and none is engaged. Voluntary designation remains available and is often prudent.",
    findings,
    engaged_branches: engaged.map((f) => f.citation),
    citations: findings.map((f) => f.citation),
    status: verdict === "record_insufficient" ? "record_insufficient" : "analysed",
  };
}

// ── CORPUS-PENDING — EU AI Act ──────────────────────────────────────────────

function buildCorpusPending(intake: I): CorpusPendingFlag[] {
  const touchesAi =
    intake.uses_ai_systems === true ||
    intake.ai_high_risk === true ||
    intake.ai_general_purpose_provider === true;
  if (!touchesAi) return [];
  return [
    {
      topic: "EU AI Act provider / deployer registration duties",
      named_provisions: [
        "Regulation (EU) 2024/1689, Art. 16",
        "Regulation (EU) 2024/1689, Art. 26",
        "Regulation (EU) 2024/1689, Art. 49",
        "Regulation (EU) 2024/1689, Art. 71",
      ],
      status: "record_insufficient",
      note:
        "The record indicates AI systems are in use, which raises the question whether the EU database registration duties apply. This assessment does not answer it: the operative text of Reg. (EU) 2024/1689 is not yet in this product's verified corpus, and stating a conclusion without the provision in front of it would be assertion rather than analysis. Not yet assessable — corpus pending.",
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
): RegistrationNarrative {
  const name = orgName(intake);
  const assessed = determinations.map((d) => d.state_name);
  const registrable = determinations.filter((d) => d.verdict === "registrable");
  const conditional = determinations.filter((d) => d.verdict === "conditional");
  const insufficient = determinations.filter((d) => d.verdict === "record_insufficient");
  const clear = determinations.filter((d) => d.verdict === "not_registrable");

  const overview = [
    `This assessment examines whether ${name} carries a registration or designation obligation under the statutes in this product's verified corpus.`,
    assessed.length
      ? `Four US state data-broker registration regimes were considered and ${assessed.length} was in scope here: ${assessed.join(", ")}. Each state's own definitional threshold was applied; the definitions differ materially and are not treated as interchangeable — California and Vermont turn on the absence of a direct relationship with the consumer, Oregon contains no such carve-out, and Texas reaches processing and transfer rather than sale and adds a separate revenue-or-volume applicability test.`
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
  parts.push(`Data protection officer: ${dpo.headline} ${dpo.reasoning}`);
  for (const p of pending) {
    // CORPUS-PENDING REGISTER (ITEM 364 D3): name the topic, say why it cannot
    // be answered, and say what follows meanwhile. Never talked around, never
    // apologised for, and never compressed into one over-loaded sentence.
    parts.push(
      `${p.topic} is recorded here and left open. ${p.note} The provisions that would settle it are listed with this flag. Until their text is in corpus the question stays live; nothing above should be read as a finding that no duty arises.`,
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
  const amendment = engaged.length
    ? `Amendment of any data-broker registration statute named in this assessment (${engaged.join("; ")}).`
    : "Amendment of any registration or designation statute in force in the jurisdictions assessed here. No US state data-broker statute was in scope here, so none is named.";
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

  const statement = missing.length === 0
    ? `${name}, ${title}, approved this registration assessment on ${date}. It is next due for review on ${review}, or earlier on any of the triggers below.`
    : `This registration assessment has not been recorded as approved: the record does not state ${missing.join(", ")}. The assessment stands as analysis only until an accountable person is named and the approval recorded.`;

  return {
    heading: "Approval and review",
    approved_by_name: name,
    approved_by_title: title,
    approval_date: date,
    next_review_due: review,
    review_triggers: registrationReviewTriggers(intake),
    statement,
    status: missing.length === 0 ? "analysed" : "record_insufficient",
    ...(missing.length ? { information_needed: missing.join("; ") } : {}),
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
    corpus_pending,
    narrative: buildNarrative(
      intake,
      determinations,
      representative_determinations,
      dpo_determination,
      corpus_pending,
      combined_representative_callout,
    ),
    attestation: buildRegistrationAttestation(intake),
  };
}
