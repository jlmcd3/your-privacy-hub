/**
 * ITEM 369-IR (Master Spec §4.2) — ARTIFACT A: THE STANDING PLAYBOOK.
 *
 * A PRE-incident reference document. The section arc is the NIST SP 800-61r3 /
 * CISA federal-playbook arc, with the ICO breach-management toolkit's tracker
 * discipline applied to the tables. Those documents are TEMPLATE GUIDANCE: they
 * fix the section headings and the shape of each table. They are NEVER quoted,
 * never cited as authority, and no assertion in this module rests on them.
 *
 * SHAPE LAW
 *   * Checklists, rosters, contact lists and matrices are STRUCTURED TABLES.
 *     Never prose.
 *   * Genuinely analytic sections carry the shared finding shape
 *     (standard → record fact → application → verdict).
 *   * Anything the intake does not support is emitted with
 *     `status: "record_insufficient"` and a NAMED `information_needed`. Never
 *     omitted, never invented, never pre-filled with a plausible answer.
 *
 * PURITY: built from the intake record only. No network, no clock arithmetic —
 * Op. 1's awareness/deadline arithmetic is untouched and lives elsewhere.
 */
import type { DeliverableStatus } from "./types.ts";
import type { ContentOwnerMapping } from "./types.ts";
import { HIGH_RISK_DATA_TYPES, STANDING_TO_COMPLETE } from "./elements.ts";
import { normalizeBreachNoticeContracts, normalizeResponseTeamRoster, type RosterRow } from "./build.ts";
import { buildHipaaDuties } from "./hipaa-duties.ts";
import { buildSectoralDuties } from "./sectoral-duties.ts";

export const STANDING_PLAYBOOK_VERSION = "ir-standing-playbook-doc104-phase3d-2026-08-29";

// ── section shapes ───────────────────────────────────────────────────
export interface PlaybookSectionBase {
  readonly id: string;
  readonly heading: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

export interface PlaybookTableSection extends PlaybookSectionBase {
  readonly kind: "table";
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
  readonly note?: string;
}

export interface PlaybookNoteSection extends PlaybookSectionBase {
  readonly kind: "note";
  /** Present where the content is generic and must be read as generic. */
  readonly scope_note?: string;
  readonly body: readonly string[];
}

export interface PlaybookFindingSection extends PlaybookSectionBase {
  readonly kind: "finding";
  readonly standard: string;
  readonly standard_citation: string;
  readonly record_fact: string;
  readonly application: string;
  readonly verdict: string;
}

/** Points at the statutory determinations, which keep their own top-level keys. */
export interface PlaybookPointerSection extends PlaybookSectionBase {
  readonly kind: "pointer";
  readonly note: string;
  readonly report_keys: readonly string[];
}

export type PlaybookSection =
  | PlaybookTableSection
  | PlaybookNoteSection
  | PlaybookFindingSection
  | PlaybookPointerSection;

export interface StandingPlaybook {
  readonly version: string;
  readonly artifact: "standing_playbook";
  readonly title: string;
  readonly template_note: string;
  /** Section ids in render order. The order is part of the contract. */
  readonly section_order: readonly string[];
  readonly sections: readonly PlaybookSection[];
  readonly information_needed: readonly string[];
  /**
   * ITEM 414 (IR-1) — ONE ledger sentence naming the sections the record does
   * not yet complete. Absent entirely on a complete record.
   */
  readonly unrecorded_ledger?: string;
  readonly status: DeliverableStatus;
}

// ── record helpers ───────────────────────────────────────────────────
function get(root: unknown, path: string): unknown {
  let node: unknown = root;
  for (const seg of path.split(".")) {
    if (node === null || node === undefined || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[seg];
  }
  return node;
}
function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
}
function list(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => str(x)).filter(Boolean);
  const s = str(v);
  if (!s) return [];
  return s.split(/\r?\n|;/).map((x) => x.trim()).filter(Boolean);
}
function records(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v)
    ? v.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object")
    : [];
}

// ── template constants (headings and checklist items only) ───────────
const TEMPLATE_NOTE =
  "Section order and table shape follow NIST SP 800-61r3 (April 2025, CSF 2.0-aligned), the CISA federal incident-response playbooks and the ICO breach-management toolkit. Those documents are drafting templates for this organisation's own record. They are not authority and nothing in this playbook is asserted on their basis.";

/** First-hour items are CONFIRM/SELECT only — the intake never authors them. */
export const FIRST_HOUR_ITEMS: readonly { id: string; item: string; owner: string }[] = [
  { id: "fh_activate", item: "Declare the incident and activate the response team against the activation criteria.", owner: "Incident Lead" },
  { id: "fh_clock", item: "Record the discovery timestamp in UTC and the person who made the discovery.", owner: "Incident Lead" },
  { id: "fh_preserve", item: "Issue the preservation instruction: no deletion, rotation or reimaging of affected systems or logs.", owner: "Security / Forensics Lead" },
  { id: "fh_isolate", item: "Isolate affected systems under the standing isolation authority.", owner: "IT Operations" },
  { id: "fh_counsel", item: "Notify outside counsel and open the privilege protocol before substantive investigation notes are written.", owner: "Legal" },
  { id: "fh_dpo", item: "Notify the Data Protection Officer or nominated contact point.", owner: "Incident Lead" },
  { id: "fh_scope", item: "Open the incident log and the decision log; begin recording scope observations as facts, not conclusions.", owner: "Incident Lead" },
  { id: "fh_insurer", item: "Put the cyber insurer on notice in accordance with the policy's notification condition.", owner: "Legal" },
];

const FIRST_24H_BASE: readonly { id: string; item: string; owner: string }[] = [
  { id: "d1_forensics", item: "Engage the retained forensic vendor and agree the investigation scope and reporting cadence.", owner: "Security / Forensics Lead" },
  { id: "d1_categories", item: "Establish the categories and approximate number of data subjects and records concerned.", owner: "Security / Forensics Lead" },
  { id: "d1_classify", item: "Classify the incident against the confidentiality / integrity / availability taxonomy and the severity matrix.", owner: "Incident Lead" },
  { id: "d1_regimes", item: "Confirm every notification regime in scope and the deadline each one runs to.", owner: "Legal" },
  { id: "d1_contracts", item: "Review the contractual notice clauses that the incident engages and diary each deadline.", owner: "Legal" },
  { id: "d1_holding", item: "Approve the holding statement and route all external enquiries to the single named spokesperson.", owner: "Communications Lead" },
  { id: "d1_lawenf", item: "Decide whether to contact law enforcement, and record the decision and its rationale.", owner: "Incident Lead" },
];

const CIA_TAXONOMY: readonly { limb: string; definition: string }[] = [
  { limb: "Confidentiality breach", definition: "Unauthorised or accidental disclosure of, or access to, personal data." },
  { limb: "Integrity breach", definition: "Unauthorised or accidental alteration of personal data." },
  { limb: "Availability breach", definition: "Accidental or unauthorised loss of access to, or destruction of, personal data." },
];

const CONTAINMENT_BODY: readonly string[] = [
  "Containment: cut the attacker's access path before evidence is disturbed — disable compromised credentials, revoke sessions and tokens, and isolate affected hosts at the network layer rather than powering them down.",
  "Eradication: remove the mechanism of persistence, not only its symptom, and confirm removal on every host in the blast radius before any host is returned to service.",
  "Recovery: restore from a known-good point, monitor the restored estate at elevated sensitivity for a defined period, and record the criteria on which normal operations were declared resumed.",
  "Each step is logged in the decision log at the time it is taken, with the person who authorised it.",
];

const COMMS_BODY: readonly string[] = [
  "One named spokesperson speaks externally; every other enquiry is routed to them without comment.",
  "A holding statement is prepared before it is needed and says only what is established: that an incident has been identified, that it is being investigated, and when the next update will be issued.",
  "No statement characterises cause, attribution, volume or affected-population size before the forensic record supports it — a retracted number is itself a reportable event in the regulator's eyes.",
  "Internal communications are treated as disclosable and are written accordingly; substantive legal analysis travels through counsel under the privilege protocol.",
  "Data-subject communications, where they are required, are drafted separately against the statutory content requirements rather than adapted from the press statement.",
];

// ── section builders ─────────────────────────────────────────────────
function tableOrGap(
  id: string,
  heading: string,
  columns: readonly string[],
  rows: readonly (readonly string[])[],
  informationNeeded: string,
  note?: string,
): PlaybookTableSection {
  if (rows.length > 0) {
    return { kind: "table", id, heading, columns, rows, status: "analysed", ...(note ? { note } : {}) };
  }
  return {
    kind: "table",
    id,
    heading,
    columns,
    rows: [],
    status: "record_insufficient",
    information_needed: informationNeeded,
    ...(note ? { note } : {}),
  };
}

function buildActivationCriteria(intake: unknown): PlaybookTableSection {
  const rows = list(get(intake, "activationCriteria")).map((c) => [c, "Standing criterion recorded by the organisation", "Full response team"]);
  return tableOrGap(
    "activation_criteria",
    "Activation criteria",
    ["Trigger", "Source of the trigger", "Activates"],
    rows,
    "Record the standing triggers that put this playbook into force, the source of each trigger and what it activates; that completes this section.",
  );
}

function buildSeverityMatrix(intake: unknown): PlaybookTableSection {
  const structured = records(get(intake, "severityMatrix")).map((r) => [
    str(r.level) || STANDING_TO_COMPLETE,
    str(r.definition) || STANDING_TO_COMPLETE,
    str(r.escalation) || STANDING_TO_COMPLETE,
  ]);
  const flat = structured.length ? [] : list(get(intake, "severityThresholds")).map((t) => [t, "Threshold recorded by the organisation", STANDING_TO_COMPLETE]);
  return tableOrGap(
    "severity_matrix",
    "Severity matrix",
    ["Severity level", "Definition / threshold", "Escalation on reaching this level"],
    structured.length ? structured : flat,
    "Record the severity levels an incident is graded against, the threshold for each level and what reaching it escalates to; that completes this section.",
  );
}

// ── IR-B (2026-08-29, doc 101 §3, CEO-approved) — DATA-SENSITIVITY TIER
// AXIS. Maps the intake's own DATA_TYPES lexicon onto three tiers by
// regulatory consequence — not four: the lexicon carries no "already public"
// option, and an empty fourth tier would be exactly the invented category
// the degradation law bars. Deliberately does not redefine which categories
// are "high risk" — it reuses the same categorisation the Art. 34(1)
// high-risk computation elsewhere in this product already applies (see
// HIGH_RISK_DATA_TYPES / SEVERITY_RAISING_DATA_TYPES in elements.ts), so
// this table can never disagree with that determination.
const SENSITIVITY_TIERS: readonly { tier: string; categories: readonly string[]; consequence: string }[] = [
  {
    tier: "Highest",
    categories: ["Special category data", "Children's data", "Health / medical records", "Biometric data"],
    consequence: "Engages GDPR Art. 9 special-category protections and/or heightened regulatory scrutiny; treated as elevated severity regardless of volume.",
  },
  {
    tier: "High",
    categories: ["Government IDs / SSN", "Financial / payment data", "Passwords / credentials"],
    consequence: "Raises the Art. 34(1) high-risk threshold and most US state breach-notice \"sensitive PI\" thresholds regardless of volume.",
  },
  {
    tier: "Moderate",
    categories: ["Names and contact details", "Location data"],
    consequence: "Severity assessed on the incident's other facts (volume, cause, containment) rather than on the data category alone.",
  },
];

function buildDataSensitivityTiers(intake: unknown): PlaybookTableSection {
  const recorded = list(get(intake, "dataTypes"));
  if (recorded.length === 0) {
    return tableOrGap(
      "data_sensitivity_tiers",
      "Data-sensitivity tiers",
      ["Tier", "Data category", "Regulatory consequence"],
      [],
      "Record the categories of personal data this incident involved; that completes this section.",
    );
  }
  const rows: string[][] = [];
  for (const t of SENSITIVITY_TIERS) {
    for (const cat of t.categories) {
      if (recorded.includes(cat)) rows.push([t.tier, cat, t.consequence]);
    }
  }
  return {
    kind: "table",
    id: "data_sensitivity_tiers",
    heading: "Data-sensitivity tiers",
    columns: ["Tier", "Data category", "Regulatory consequence"],
    rows,
    status: "analysed",
  };
}

function buildResponseTeam(intake: unknown): PlaybookTableSection {
  // E8973164 follow-up (2026-08-28) — the roster arrives as an array OR an
  // object keyed by camelCase role slugs; the array-only `records()` read
  // carried this whole section as unrecorded against a record naming every
  // role. The shared normalizer (build.ts) handles both shapes.
  const rows = normalizeResponseTeamRoster(intake).map((r) => [
    r.roleLabel || STANDING_TO_COMPLETE,
    [r.name, r.email, r.phone, r.contact].filter(Boolean).join(", ") || STANDING_TO_COMPLETE,
    r.alternate || STANDING_TO_COMPLETE,
  ]);
  return tableOrGap(
    "response_team",
    "Response team and alternates",
    ["Role", "Primary", "Alternate"],
    rows,
    "Record each response role with a named primary and a named alternate; that completes this section.",
    "A role with no named alternate is a single point of failure in an out-of-hours incident.",
  );
}

// ── IR-A (2026-08-29, doc 101 §2, CEO-approved) — ESCALATION SLA TABLE.
// House policy defaults, presented as editable — doc 101 §7 ruling — for the
// standard incident-response functions. The "Assigned" column fuzzy-matches
// the response-team roster the same way the E8973164 fix already
// established for this product (any roster key or title naming the role in
// ordinary English is found regardless of exact spelling), so it degrades to
// STANDING_TO_COMPLETE rather than inventing a name the roster doesn't
// carry.
const ESCALATION_SLA_ROWS: readonly { fn: string; trigger: string; sla: string; keywords: RegExp }[] = [
  { fn: "Incident Lead", trigger: "Declaration of the incident", sla: "Activate the response team and open the incident log immediately on declaration", keywords: /incident.?(lead|response.?lead|manager)|breach.?lead/i },
  { fn: "Data Protection Officer / privacy contact", trigger: "Confirmation that personal data is involved", sla: "Engage within 1 hour of that confirmation", keywords: /data protection officer|\bdpo\b|privacy (officer|contact|lead)/i },
  { fn: "Legal (in-house or outside counsel)", trigger: "Declaration of the incident", sla: "Engage within 2–4 hours of declaration", keywords: /legal|counsel|attorney|lawyer/i },
  { fn: "Communications Lead", trigger: "Before any external or regulatory notice is issued", sla: "Brief and prepare the holding statement within 12–24 hours of declaration", keywords: /comms?|communication|spokesperson|public relations|\bpr\b/i },
  { fn: "Customer support / help desk", trigger: "Before any notice to affected individuals is sent", sla: "Brief with an approved script before the notice goes out", keywords: /support|help ?desk|customer service/i },
];

function findAssigned(roster: readonly RosterRow[], keywords: RegExp): string {
  const hit = roster.find((r) => keywords.test(r.searchable) || keywords.test(r.roleLabel));
  return (hit?.name || "").trim() || STANDING_TO_COMPLETE;
}

function buildEscalationSla(intake: unknown): PlaybookTableSection {
  const roster = normalizeResponseTeamRoster(intake);
  const rows = ESCALATION_SLA_ROWS.map((r) => [r.fn, r.trigger, r.sla, findAssigned(roster, r.keywords)]);
  return {
    kind: "table",
    id: "escalation_sla",
    heading: "Escalation SLA",
    columns: ["Function", "Trigger", "Recommended-default SLA", "Assigned"],
    rows,
    status: "analysed",
    note: "These are recommended-default response times, not a legal requirement; the organisation may set its own. Where a function has no name in the Assigned column, the response team above does not name anyone in that role.",
  };
}

function buildKeyContacts(intake: unknown): PlaybookTableSection {
  const rows: string[][] = [];
  const counsel = str(get(intake, "outsideCounselName"));
  const counselContact = str(get(intake, "outsideCounselContact"));
  const privilege = get(intake, "privilegeProtocol");
  if (counsel || counselContact) {
    rows.push([
      "Outside counsel",
      counsel || STANDING_TO_COMPLETE,
      counselContact || STANDING_TO_COMPLETE,
      privilege === true
        ? "Privilege protocol in force: investigation is instructed through counsel and substantive analysis is directed to counsel."
        : privilege === false
        ? "No privilege protocol recorded — investigative material is being produced outside any privilege framework."
        : "Privilege protocol not recorded.",
    ]);
  }
  for (const [label, key] of [
    ["Cyber insurer", "insurerContact"],
    ["Forensic vendor", "forensicVendorContact"],
    ["Law enforcement", "lawEnforcementContact"],
  ] as const) {
    const v = str(get(intake, key));
    if (v) rows.push([label, v, STANDING_TO_COMPLETE, "Standing contact recorded before the incident."]);
  }
  return tableOrGap(
    "key_contacts",
    "Key contacts",
    ["Contact type", "Name / firm", "Contact detail", "Note"],
    rows,
    "Record outside counsel and whether a privilege protocol is in force, the cyber insurer, the retained forensic vendor and the law-enforcement point of contact; that completes this section.",
  );
}

function buildFirstHour(intake: unknown): PlaybookTableSection {
  const confirmed = new Set(list(get(intake, "firstHourConfirmations")));
  const rows = FIRST_HOUR_ITEMS.map((i) => [
    i.item,
    i.owner,
    confirmed.has(i.id) || confirmed.has(i.item) ? "Confirmed in place" : "Not confirmed",
  ]);
  return {
    kind: "table",
    id: "first_hour_checklist",
    heading: "First-hour checklist",
    columns: ["Action", "Owner", "Standing confirmation"],
    rows,
    status: "analysed",
    // IR-C (2026-08-29, doc 101 §2) — cross-references the Escalation SLA
    // table rather than duplicating per-function timing data in two places,
    // which risks the two ever disagreeing.
    note: "Items are fixed. The intake confirms which are already standing arrangements; it does not author the list. Per-function response times are set out in the Escalation SLA table above.",
  };
}

/**
 * ITEM 414 (IR-6) — one action per Article 33(3) sub-point, named. The shipped
 * defect was four consecutive rows built from a single mould, which is a
 * litany (R7) and tells the reader nothing about what each element requires.
 * These phrasings PARAPHRASE the sub-points; the verbatim provision text stays
 * in `content_owner_mapping.elements[].requirement_verbatim`, which is corpus
 * material and is never rewritten here.
 */
const ELEMENT_ACTIONS: Readonly<Record<string, string>> = {
  a_nature:
    "Establish the nature of the breach and the categories and approximate numbers of data subjects and records concerned",
  b_dpo_contact:
    "Give the name and contact details of the data protection officer or other contact point",
  c_likely_consequences: "Describe the likely consequences of the breach",
  d_measures:
    "Describe the measures taken or proposed to address the breach, including any measures to mitigate its adverse effects",
};

/**
 * GENERALISATION of the Art. 33(3) content/owner mapping's phasing logic: the
 * first-24-hours arc is the same "what can be established now, what is
 * deferred, and who owns each" question, asked of the whole response rather
 * than of the notification form alone.
 */
function buildFirst24Hours(intake: unknown, mapping?: ContentOwnerMapping): PlaybookTableSection {
  const rows: string[][] = FIRST_24H_BASE.map((i) => [i.item, i.owner, "First 24 hours"]);
  const first = new Set(mapping?.phasing?.first_tranche ?? []);
  for (const el of mapping?.elements ?? []) {
    rows.push([
      `${ELEMENT_ACTIONS[el.element] ?? "Supply the notification element the provision requires"}, for ${el.citation}.`,
      el.owner,
      first.has(el.element) ? "First tranche" : "Phased — deferred with a recorded reason",
    ]);
  }
  const isolation = str(get(intake, "itIsolationAuthority"));
  rows.push([
    "Confirm who may authorise isolation of a production system without further approval.",
    isolation || STANDING_TO_COMPLETE,
    "First 24 hours",
  ]);
  return {
    kind: "table",
    id: "first_24_hours_checklist",
    heading: "First-24-hours checklist",
    columns: ["Action", "Owner", "Phase"],
    rows,
    status: isolation ? "analysed" : "record_insufficient",
    ...(isolation
      ? {}
      : { information_needed: "Record which role may isolate a production system without further approval; that completes this section." }),
    note: "The phasing column generalises the Article 33(4) phasing plan: an item that cannot be established in the first tranche is deferred with a recorded reason, not dropped.",
  };
}

function buildEvidencePreservation(intake: unknown): PlaybookTableSection {
  const systems = list(get(intake, "keySystems"));
  const sources = list(get(intake, "logSources"));
  const rows: string[][] = [];
  for (const s of systems) rows.push([s, "Key system", "Suspend rotation, snapshot state, preserve in place", "Security / Forensics Lead"]);
  for (const s of sources) rows.push([s, "Log source", "Extend retention, export to preservation store, hash the export", "Security / Forensics Lead"]);
  return tableOrGap(
    "evidence_preservation",
    "Evidence preservation",
    ["System or log source", "Type", "Preservation action", "Owner"],
    rows,
    "Record the key systems and log sources whose evidence must be preserved before it rotates; that completes this section.",
    // IR-H 4b (2026-08-29, doc 101 §4) — chain-of-custody addendum.
    "Preservation is instructed in the first hour because most log sources rotate faster than an investigation concludes. Each preserved item's chain of custody is recorded separately: who collected it, when, its cryptographic hash at collection, and every subsequent transfer — a preservation action with no recorded custodian is not defensible evidence.",
  );
}

function buildContainment(): PlaybookNoteSection {
  return {
    kind: "note",
    id: "containment_eradication_recovery",
    heading: "Containment, eradication and recovery",
    scope_note:
      "GENERIC PROCEDURE. These steps are not tuned to this organisation's estate and are not a technical runbook. They set the order of operations only; the estate-specific procedure belongs in the organisation's own technical documentation.",
    body: CONTAINMENT_BODY,
    status: "analysed",
  };
}

function buildClassification(intake: unknown): PlaybookTableSection {
  const categories = list(get(intake, "dataTypes"));
  const rows: string[][] = [];
  for (const limb of CIA_TAXONOMY) {
    if (categories.length === 0) {
      rows.push([limb.limb, limb.definition, STANDING_TO_COMPLETE, STANDING_TO_COMPLETE]);
      continue;
    }
    for (const cat of categories) {
      rows.push([
        limb.limb,
        limb.definition,
        cat,
        HIGH_RISK_DATA_TYPES.includes(cat)
          ? "Category carries elevated severity in its own right"
          : "Severity assessed on the incident facts",
      ]);
    }
  }
  return {
    kind: "table",
    id: "breach_classification",
    heading: "Breach classification framework",
    columns: ["Breach type", "Definition", "Data category held", "Severity note"],
    rows,
    status: categories.length ? "analysed" : "record_insufficient",
    ...(categories.length
      ? {}
      : { information_needed: "Record the categories of personal data the organisation holds, which this classification framework is mapped onto; that completes this section." }),
  };
}

function buildStatutoryPointer(): PlaybookPointerSection {
  return {
    kind: "pointer",
    id: "statutory_notification_determinations",
    heading: "Statutory notification determinations",
    note:
      "The Article 33 and Article 34 determinations, the Article 34(3) exemption analysis, the Article 33(3) content and owner mapping and the regulator portal list are produced as their own report sections and are reproduced here by reference rather than restated.",
    report_keys: [
      "notification_duties",
      "sa_notification_determination",
      "data_subject_communication_determination",
      "art34_exemption_analysis",
      "content_owner_mapping",
      "portals",
    ],
    status: "analysed",
  };
}

// ── IR-E Phase 3a (2026-08-29, doc 102 §4, CEO-approved VERBATIM) — HIPAA
// ASSUMPTION NOTE. States the healthcare-provider proxy assumption once,
// per this product's own "condition stated once" convention, alongside the
// HIPAA duty rows this section does not restate (those render generically
// through state_notification_duties — see hipaa-duties.ts). Always renders
// — the codebase's established convention for a declared standing section
// (regulator_final_report set the precedent this session) — with a
// not-engaged default when the healthcare signal isn't recorded, never
// omitted and never a silent placeholder.
function buildHipaaAssumptionNote(intake: unknown): PlaybookNoteSection {
  const orgType = str(get(intake, "organisationType"));
  const jurisdictions = list(get(intake, "jurisdictions"));
  const processorInvolved = get(intake, "processorInvolved") === true;
  const processorName = str(get(intake, "processorName"));
  const affectedCount = str(get(intake, "affectedCount"));
  const hipaa = buildHipaaDuties(orgType, jurisdictions, affectedCount, processorInvolved, processorName);
  const body = hipaa.duties.length > 0
    ? [hipaa.assumption_note]
    : [
      "HIPAA's breach-notification duties are not engaged on this record: the recorded organisation type is not \"Healthcare provider\" and no recorded jurisdiction names HIPAA.",
    ];
  return {
    kind: "note",
    id: "hipaa_assumption",
    heading: "HIPAA breach-notification duties",
    body,
    status: "analysed",
  };
}

// ── IR-E Phase 3d (2026-08-29, doc 104 §3, CEO-approved VERBATIM) —
// SECTORAL PROXY ASSUMPTION NOTE. Same pattern as buildHipaaAssumptionNote
// immediately above: NYDFS and DORA are gated on organisationType ===
// "Financial institution" (plus a jurisdiction), a proxy for each regime's
// own narrower "covered entity"/"financial entity" test — stated once,
// always renders, not-engaged default when neither proxy fires. SEC 8-K
// needs no such note: its trigger is a direct jurisdiction selection, not a
// proxy.
function buildSectoralAssumptionNote(intake: unknown): PlaybookNoteSection {
  const orgType = str(get(intake, "organisationType"));
  const jurisdictions = list(get(intake, "jurisdictions"));
  const sectoral = buildSectoralDuties(jurisdictions, orgType);
  const body = sectoral.proxy_assumption_note
    ? [sectoral.proxy_assumption_note]
    : [
      "NYDFS's and DORA's incident-reporting duties are not engaged on this record: the recorded organisation type is not \"Financial institution\", or no recorded jurisdiction puts New York or an EU/EEA country in scope.",
    ];
  return {
    kind: "note",
    id: "sectoral_proxy_assumption",
    heading: "NYDFS and DORA incident-reporting duties",
    body,
    status: "analysed",
  };
}

// ── IR-I 5b (2026-08-29, doc 101 §5, CEO-approved) — REGULATOR FINAL-REPORT
// REMINDER. A phased Art. 33(4) filing is not closed until the deferred
// elements are supplied, and that follow-up duty is otherwise easy to lose
// once the initial notification ships. Like every other standing section,
// this always renders — a state naming that phasing is not presently
// engaged, never a vanished section — matching the codebase's own
// convention (STANDING_SECTION_ORDER is a fixed contract; ITEM369's own
// test asserts every declared section is emitted for a populated record).
function buildRegulatorFinalReportNote(mapping?: ContentOwnerMapping): PlaybookNoteSection {
  const phased = mapping?.phasing?.phased ?? [];
  const body = phased.length > 0
    ? [
      "Where notification was phased, Article 33(4) requires the remaining information to be provided to the supervisory authority in phases without undue further delay — a phased filing is not closed until every deferred element has been supplied.",
    ]
    : [
      "No element of the Article 33(3) notification content is recorded as phased on this incident, so this duty is not presently engaged. Where a future notification is phased, Article 33(4) requires the remaining information to be provided to the supervisory authority in phases without undue further delay — a phased filing is not closed until every deferred element has been supplied.",
    ];
  return {
    kind: "note",
    id: "regulator_final_report",
    heading: "Regulator final-report duty",
    body,
    status: "analysed",
  };
}

// ── IR-G (2026-08-29, doc 101 §6, CEO-approved VERBATIM) — the two missing
// ready-to-use templates. Both are placeholder-slotted fixed text — this
// product's one deliberate exception to the SHAPE LAW's table-only rule: a
// notification letter and an executive briefing are documents by nature,
// not data. Slots are filled where the record already supports them
// (organisation name, recorded data categories); every other slot is a
// bracketed instruction to the implementer in plain language, never nested
// machine-style directives. The regulator-notification leg is already
// covered by the EDPB Art. 33 template field mapping rendered inside the
// statutory_notification_determinations section (edpb-art33-template.ts) —
// these two cover the individual notice and the internal briefing, the two
// legs doc 100/101 confirmed were genuinely missing.
function buildIndividualNoticeTemplate(intake: unknown): PlaybookNoteSection {
  const org = str(get(intake, "organizationName")) || str(get(intake, "organization_name"));
  const categories = list(get(intake, "dataTypes"));
  const categoriesLine = categories.length
    ? `[LIST ONLY THESE RECORDED CATEGORIES, OR NARROW FURTHER IF THIS NOTICE COVERS FEWER: ${categories.join(", ")}.]`
    : "[LIST ONLY THE CATEGORIES OF YOUR PERSONAL INFORMATION THIS INCIDENT ACTUALLY INVOLVED.]";
  return {
    kind: "note",
    id: "individual_notice_template",
    heading: "Individual notice template",
    scope_note:
      "This template is a starting draft only. Complete every bracketed field from the confirmed facts of this incident, remove any section that does not apply, and have the completed notice reviewed by counsel before it is sent — the content requirements and permitted framing vary by notification regime, and the determinations elsewhere in this report identify which regimes apply to this incident.",
    body: [
      "Notice of a Data Security Incident",
      "[DATE]",
      "Dear [CONSUMER NAME / Valued Customer],",
      "What happened. [DESCRIBE, IN PLAIN LANGUAGE, WHAT OCCURRED AND WHEN IT WAS DISCOVERED — e.g., \"On [DATE], we discovered that [BRIEF, FACTUAL DESCRIPTION OF THE INCIDENT].\"]",
      `What information was involved. ${categoriesLine}`,
      "What we are doing. [DESCRIBE THE STEPS TAKEN TO CONTAIN THE INCIDENT, INVESTIGATE ITS SCOPE, AND PREVENT RECURRENCE. WHERE OFFERING CREDIT MONITORING OR IDENTITY-PROTECTION SERVICES, DESCRIBE THE OFFER AND HOW TO ENROLL HERE.]",
      "What you can do. [LIST RECOMMENDED PROTECTIVE STEPS TAILORED TO THE CATEGORIES OF DATA ACTUALLY INVOLVED — e.g., monitoring account statements, placing a fraud alert or credit freeze, changing passwords.]",
      "For more information, or if you have questions, please contact us at [CONTACT METHOD], [DAYS/HOURS OF AVAILABILITY].",
      "[WHERE THE APPLICABLE NOTIFICATION REGIME REQUIRES IT: a statement of the individual's right to complain to a supervisory authority, and that authority's contact details.]",
      "Sincerely,",
      "[NAME / TITLE OF SIGNATORY]",
      org || "[ORGANIZATION NAME]",
    ],
    status: "analysed",
  };
}

function buildExecutiveBriefingTemplate(intake: unknown): PlaybookNoteSection {
  const org = str(get(intake, "organizationName")) || str(get(intake, "organization_name"));
  return {
    kind: "note",
    id: "executive_briefing_template",
    heading: "Internal executive briefing template",
    scope_note:
      "Complete each bracketed field from the incident record as it stands at the time of this briefing; leave a field marked NOT YET ESTABLISHED rather than guessing, and update this briefing at each scheduled cadence rather than drafting a new one from scratch.",
    body: [
      `Incident Executive Briefing — ${org || "[ORGANIZATION NAME]"}`,
      "Summary. [ONE-PARAGRAPH SUMMARY: what happened, when discovered, current containment status.]",
      "Current severity and status. [SEVERITY LEVEL PER THE STANDING SEVERITY MATRIX] / [CONTAINMENT STATE].",
      "Regulatory exposure. [LIST EACH NOTIFICATION DUTY IN PLAY, ITS DEADLINE, AND DAYS REMAINING — drawn from the notification determinations elsewhere in this report.]",
      "Decisions needed from leadership. [LIST OPEN DECISIONS REQUIRING EXECUTIVE INPUT — e.g., law-enforcement contact, public-statement timing, service-disruption tradeoffs.]",
      "Next update. [DATE/TIME OF THE NEXT SCHEDULED UPDATE TO THIS GROUP.]",
      "This briefing is prepared for internal leadership review only; it is not for external distribution, and any substantive legal analysis it references is directed to counsel under the privilege protocol.",
    ],
    status: "analysed",
  };
}

function buildContractualNotifications(intake: unknown): PlaybookSection[] {
  // E8973164 follow-up (2026-08-28) — contracts arrive as a flat array OR an
  // object whose `obligations` array carries the rows, with varying field
  // names (deadline/noticePeriod, clause/clauseRef/contractRef/
  // contractReference). The array-only `records()` read carried this whole
  // section as unrecorded against a record naming three counterparties. The
  // shared normalizer (build.ts) handles every observed shape.
  const contracts = normalizeBreachNoticeContracts(intake);
  const rows = contracts.map((c) => [
    c.party || STANDING_TO_COMPLETE,
    c.deadline || STANDING_TO_COMPLETE,
    c.clause || STANDING_TO_COMPLETE,
  ]);
  const tighter = contracts.filter((c) => /\b(?:2[0-3]|1?\d)\s*hours?\b/i.test(c.deadline));
  const finding: PlaybookFindingSection = {
    kind: "finding",
    id: "contractual_notification_finding",
    heading: "Contractual notification obligations — determination",
    standard:
      "A contractual notice period runs from the counterparty's own trigger and is enforceable independently of any statutory notification duty. Where it is shorter than the statutory period, the contractual period governs the operational clock.",
    standard_citation: "Contract — as recorded in the organisation's own agreements",
    record_fact: contracts.length
      ? `${contracts.length} agreement(s) with a breach-notice clause recorded${tighter.length ? `, of which ${tighter.length} run(s) to a period shorter than 24 hours` : ""}.`
      : "The organisation has recorded no agreement carrying a breach-notice clause.",
    application: contracts.length
      ? tighter.length
        ? "At least one recorded clause runs to a period shorter than the statutory notification window, so the operational clock for this playbook is the contractual one and the statutory filing is prepared inside it."
        : "The recorded clauses run alongside the statutory duties; each deadline is diarised separately because neither discharges the other."
      : "The determination cannot be made: whether any counterparty must be notified, and by when, is not answerable from what the organisation has recorded.",
    verdict: contracts.length
      ? tighter.length
        ? "contractual_clock_governs"
        : "contractual_duties_run_in_parallel"
      : "undetermined_on_the_record",
    status: contracts.length ? "analysed" : "record_insufficient",
    ...(contracts.length
      ? {}
      : { information_needed: "Record each agreement carrying a breach-notice clause, with its counterparty, notice deadline and clause reference; that completes this section." }),
  };
  const table = tableOrGap(
    "contractual_notifications",
    "Contractual notification obligations",
    ["Contract / counterparty", "Notice deadline", "Clause reference"],
    rows,
    "Record each agreement carrying a breach-notice clause, with its counterparty, notice deadline and clause reference; that completes this section.",
  );
  return [finding, table];
}

function buildCommunications(): PlaybookNoteSection {
  return {
    kind: "note",
    id: "communications",
    heading: "Communications and holding statements",
    body: COMMS_BODY,
    status: "analysed",
  };
}

function buildTestingTraining(intake: unknown): PlaybookNoteSection {
  const next = str(get(intake, "nextTabletopDate"));
  const body = [
    "Recommended cadence: a tabletop exercise at least annually, and a further exercise after any material change to the estate, the response team or the notification map.",
    "Each exercise runs against this playbook as written, and every step the exercise could not complete becomes a remediation item on the tracker rather than a note in a debrief.",
    "New joiners in a named role on the roster are walked through the first-hour checklist before they are listed as a primary.",
    // IR-I 5c (2026-08-29, doc 101 §5, CEO-approved default) — the
    // lessons-learned window is a house default, same "customer owns the
    // number" framing as the Escalation SLA table.
    "A lessons-learned review is scheduled within 30 days of incident closure by default (editable), and any resulting playbook change is version-controlled and dated.",
  ];
  if (next) body.push(`Next planned tabletop exercise: ${next}.`);
  return {
    kind: "note",
    id: "testing_training",
    heading: "Testing and training",
    body,
    status: next ? "analysed" : "record_insufficient",
    ...(next
      ? {}
      : { information_needed: "Record the date of the next planned tabletop exercise; that completes this section." }),
  };
}

// ── composite ────────────────────────────────────────────────────────
/** The contractual section order. Asserted by the deliverables tests. */
export const STANDING_SECTION_ORDER: readonly string[] = [
  "activation_criteria",
  "severity_matrix",
  "data_sensitivity_tiers",
  "response_team",
  "escalation_sla",
  "key_contacts",
  "first_hour_checklist",
  "first_24_hours_checklist",
  "evidence_preservation",
  "containment_eradication_recovery",
  "breach_classification",
  "statutory_notification_determinations",
  "hipaa_assumption",
  "sectoral_proxy_assumption",
  "regulator_final_report",
  "individual_notice_template",
  "executive_briefing_template",
  "contractual_notification_finding",
  "contractual_notifications",
  "communications",
  "testing_training",
];

/**
 * ITEM 414 (IR-1) — THE LEDGER. One sentence, naming the incomplete sections
 * by their headings, and pointing at the per-section sentence that says what
 * would fill each. Nothing is asserted here that the sections do not already
 * say; the change is register, not honesty. Emitted only where something is
 * incomplete.
 */
function unrecordedLedger(incomplete: readonly PlaybookSection[]): string {
  const names = incomplete.map((s) => s.heading.replace(/ — determination$/, "").toLowerCase());
  const unique = [...new Set(names)];
  const list = unique.length === 1
    ? unique[0]
    : `${unique.slice(0, -1).join(", ")} and ${unique[unique.length - 1]}`;
  const noun = unique.length === 1 ? "One section" : `${WORD_COUNT[unique.length] ?? unique.length} sections`;
  const verb = unique.length === 1 ? "is" : "are";
  return `${noun} of this playbook ${verb} incomplete because the organisation has not yet recorded what ${unique.length === 1 ? "it requires" : "they require"}: ${list}. Each of those sections states what to record to complete it.`;
}

const WORD_COUNT: Readonly<Record<number, string>> = {
  2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six", 7: "Seven",
  8: "Eight", 9: "Nine", 10: "Ten", 11: "Eleven", 12: "Twelve",
};

export function buildStandingPlaybook(
  intake: unknown,
  mapping?: ContentOwnerMapping,
): StandingPlaybook {
  const org = str(get(intake, "organizationName")) || str(get(intake, "organization_name"));
  const sections: PlaybookSection[] = [
    buildActivationCriteria(intake),
    buildSeverityMatrix(intake),
    buildDataSensitivityTiers(intake),
    buildResponseTeam(intake),
    buildEscalationSla(intake),
    buildKeyContacts(intake),
    buildFirstHour(intake),
    buildFirst24Hours(intake, mapping),
    buildEvidencePreservation(intake),
    buildContainment(),
    buildClassification(intake),
    buildStatutoryPointer(),
    buildHipaaAssumptionNote(intake),
    buildSectoralAssumptionNote(intake),
    buildRegulatorFinalReportNote(mapping),
    buildIndividualNoticeTemplate(intake),
    buildExecutiveBriefingTemplate(intake),
    ...buildContractualNotifications(intake),
    buildCommunications(),
    buildTestingTraining(intake),
  ];
  // ITEM 414 (IR-1) — deduplicate: two sections that need the same thing say
  // it once. The shipped defect carried the breach-notice-contract ask twice,
  // byte-identical (R8).
  const information_needed = [
    ...new Set(
      sections
        .map((s) => s.information_needed)
        .filter((x): x is string => Boolean(x)),
    ),
  ];
  const incomplete = sections.filter((s) => Boolean(s.information_needed));
  return {
    version: STANDING_PLAYBOOK_VERSION,
    artifact: "standing_playbook",
    title: org ? `Incident Response Playbook — ${org}` : "Incident Response Playbook",
    template_note: TEMPLATE_NOTE,
    section_order: STANDING_SECTION_ORDER,
    sections,
    information_needed,
    ...(incomplete.length ? { unrecorded_ledger: unrecordedLedger(incomplete) } : {}),
    status: information_needed.length ? "record_insufficient" : "analysed",
  };
}
