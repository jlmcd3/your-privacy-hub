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
import { HIGH_RISK_DATA_TYPES, TO_BE_COMPLETED } from "./elements.ts";

export const STANDING_PLAYBOOK_VERSION = "ir-standing-playbook-item369-2026-08-04";

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
    "Activation criteria — the standing triggers that put this playbook into force (intake field: activationCriteria).",
  );
}

function buildSeverityMatrix(intake: unknown): PlaybookTableSection {
  const structured = records(get(intake, "severityMatrix")).map((r) => [
    str(r.level) || TO_BE_COMPLETED,
    str(r.definition) || TO_BE_COMPLETED,
    str(r.escalation) || TO_BE_COMPLETED,
  ]);
  const flat = structured.length ? [] : list(get(intake, "severityThresholds")).map((t) => [t, "Threshold recorded by the organisation", TO_BE_COMPLETED]);
  return tableOrGap(
    "severity_matrix",
    "Severity matrix",
    ["Severity level", "Definition / threshold", "Escalation on reaching this level"],
    structured.length ? structured : flat,
    "Severity thresholds — the levels this organisation grades an incident against and what each level escalates to (intake fields: severityMatrix, severityThresholds).",
  );
}

function buildResponseTeam(intake: unknown): PlaybookTableSection {
  const rows = records(get(intake, "responseTeamRoster")).map((r) => [
    str(r.role) || TO_BE_COMPLETED,
    str(r.primary) || TO_BE_COMPLETED,
    str(r.alternate) || TO_BE_COMPLETED,
  ]);
  return tableOrGap(
    "response_team",
    "Response team and alternates",
    ["Role", "Primary", "Alternate"],
    rows,
    "Response-team roster — each role with a named primary and a named alternate (intake field: responseTeamRoster).",
    "A role with no named alternate is a single point of failure in an out-of-hours incident.",
  );
}

function buildKeyContacts(intake: unknown): PlaybookTableSection {
  const rows: string[][] = [];
  const counsel = str(get(intake, "outsideCounselName"));
  const counselContact = str(get(intake, "outsideCounselContact"));
  const privilege = get(intake, "privilegeProtocol");
  if (counsel || counselContact) {
    rows.push([
      "Outside counsel",
      counsel || TO_BE_COMPLETED,
      counselContact || TO_BE_COMPLETED,
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
    if (v) rows.push([label, v, TO_BE_COMPLETED, "Standing contact recorded before the incident."]);
  }
  return tableOrGap(
    "key_contacts",
    "Key contacts",
    ["Contact type", "Name / firm", "Contact detail", "Note"],
    rows,
    "Key contacts — outside counsel and the privilege protocol, the cyber insurer, the retained forensic vendor and the law-enforcement point of contact (intake fields: outsideCounselName, outsideCounselContact, privilegeProtocol, insurerContact, forensicVendorContact, lawEnforcementContact).",
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
    note: "Items are fixed. The intake confirms which are already standing arrangements; it does not author the list.",
  };
}

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
      `Notification content — ${el.citation}: ${el.requirement_verbatim ? "supply the element as the provision states it" : "supply the element"}.`,
      el.owner,
      first.has(el.element) ? "First tranche" : "Phased — deferred with a recorded reason",
    ]);
  }
  const isolation = str(get(intake, "itIsolationAuthority"));
  rows.push([
    "Confirm who may authorise isolation of a production system without further approval.",
    isolation || TO_BE_COMPLETED,
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
      : { information_needed: "IT isolation authority — the role that may isolate a production system without further approval (intake field: itIsolationAuthority)." }),
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
    "Key systems and log sources — the estate whose evidence must be preserved before it rotates (intake fields: keySystems, logSources).",
    "Preservation is instructed in the first hour because most log sources rotate faster than an investigation concludes.",
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
      rows.push([limb.limb, limb.definition, TO_BE_COMPLETED, TO_BE_COMPLETED]);
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
      : { information_needed: "Data categories the organisation holds — the classification framework maps the confidentiality / integrity / availability taxonomy onto them (intake field: dataTypes)." }),
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

function buildContractualNotifications(intake: unknown): PlaybookSection[] {
  const contracts = records(get(intake, "breachNoticeContracts"));
  const rows = contracts.map((c) => [
    str(c.counterparty) || TO_BE_COMPLETED,
    str(c.deadline) || TO_BE_COMPLETED,
    str(c.clause) || TO_BE_COMPLETED,
  ]);
  const tighter = contracts.filter((c) => /\b(?:2[0-3]|1?\d)\s*hours?\b/i.test(str(c.deadline)));
  const finding: PlaybookFindingSection = {
    kind: "finding",
    id: "contractual_notification_finding",
    heading: "Contractual notification obligations — determination",
    standard:
      "A contractual notice period runs from the counterparty's own trigger and is enforceable independently of any statutory notification duty. Where it is shorter than the statutory period, the contractual period governs the operational clock.",
    standard_citation: "Contract — as recorded in the organisation's own agreements",
    record_fact: contracts.length
      ? `${contracts.length} agreement(s) with a breach-notice clause recorded${tighter.length ? `, of which ${tighter.length} run(s) to a period shorter than 24 hours` : ""}.`
      : "No agreement with a breach-notice clause is recorded on this intake.",
    application: contracts.length
      ? tighter.length
        ? "At least one recorded clause runs to a period shorter than the statutory notification window, so the operational clock for this playbook is the contractual one and the statutory filing is prepared inside it."
        : "The recorded clauses run alongside the statutory duties; each deadline is diarised separately because neither discharges the other."
      : "The determination cannot be made: whether any counterparty must be notified, and by when, is not answerable on this record.",
    verdict: contracts.length
      ? tighter.length
        ? "contractual_clock_governs"
        : "contractual_duties_run_in_parallel"
      : "undetermined_on_the_record",
    status: contracts.length ? "analysed" : "record_insufficient",
    ...(contracts.length
      ? {}
      : { information_needed: "Key contracts carrying a breach-notice clause, each with its counterparty, notice deadline and clause reference (intake field: breachNoticeContracts)." }),
  };
  const table = tableOrGap(
    "contractual_notifications",
    "Contractual notification obligations",
    ["Contract / counterparty", "Notice deadline", "Clause reference"],
    rows,
    "Key contracts carrying a breach-notice clause, each with its counterparty, notice deadline and clause reference (intake field: breachNoticeContracts).",
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
      : { information_needed: "Next planned tabletop exercise date, if one is scheduled (intake field: nextTabletopDate)." }),
  };
}

// ── composite ────────────────────────────────────────────────────────
/** The contractual section order. Asserted by the deliverables tests. */
export const STANDING_SECTION_ORDER: readonly string[] = [
  "activation_criteria",
  "severity_matrix",
  "response_team",
  "key_contacts",
  "first_hour_checklist",
  "first_24_hours_checklist",
  "evidence_preservation",
  "containment_eradication_recovery",
  "breach_classification",
  "statutory_notification_determinations",
  "contractual_notification_finding",
  "contractual_notifications",
  "communications",
  "testing_training",
];

export function buildStandingPlaybook(
  intake: unknown,
  mapping?: ContentOwnerMapping,
): StandingPlaybook {
  const org = str(get(intake, "organizationName")) || str(get(intake, "organization_name"));
  const sections: PlaybookSection[] = [
    buildActivationCriteria(intake),
    buildSeverityMatrix(intake),
    buildResponseTeam(intake),
    buildKeyContacts(intake),
    buildFirstHour(intake),
    buildFirst24Hours(intake, mapping),
    buildEvidencePreservation(intake),
    buildContainment(),
    buildClassification(intake),
    buildStatutoryPointer(),
    ...buildContractualNotifications(intake),
    buildCommunications(),
    buildTestingTraining(intake),
  ];
  const information_needed = sections
    .map((s) => s.information_needed)
    .filter((x): x is string => Boolean(x));
  return {
    version: STANDING_PLAYBOOK_VERSION,
    artifact: "standing_playbook",
    title: org ? `Incident Response Playbook — ${org}` : "Incident Response Playbook",
    template_note: TEMPLATE_NOTE,
    section_order: STANDING_SECTION_ORDER,
    sections,
    information_needed,
    status: information_needed.length ? "record_insufficient" : "analysed",
  };
}
