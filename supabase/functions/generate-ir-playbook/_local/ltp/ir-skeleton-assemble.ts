// ITEM SO-7 WIRE-IN — IR PLAYBOOK: ASSEMBLY THROUGH THE BYTE-PINNED SKELETON.
//
// This module assembles the document the CUSTOMER actually receives: the PDF
// renderer and the result page both read `report_data.skeleton_document`,
// which is what this file produces. It is DETERMINISTIC — every
// [DETERMINATION LEAD], [GENERATED] and [CONDITIONAL] block is composed from
// typed surfaces the IR pipeline already persists (`standing_playbook`,
// `incident_worksheet`, `notification_duties`,
// `sa_notification_determination`, `data_subject_communication_determination`,
// `content_owner_mapping`, `authority_exhibit`), and every {slot} is filled
// from the live intake per `ir-playbook.slotmap.ts`. No model call, no
// invented prose, no mutation of the typed surfaces.
//
// TWO REGISTERS. Part One (durable) is composed from `standing_playbook`;
// Part Two (operational) from the recorded incident answers. A worksheet slot
// with no answer is BLANK BY DESIGN: the clause is dropped and nothing is
// padded in its place.
//
// SO-3 DEFECT CLASSES GUARDED HERE:
//   1. proper nouns (organisation names, sector labels, counsel and vendor
//      names, jurisdiction names) are never case-folded — `lowerEnumLabel`
//      runs on curated enum labels only;
//   2. sentence truncation is abbreviation-aware (`firstSentence`), so
//      "GDPR Art. 33(2)" and "NIST SP 800-61r3" survive.

import {
  IR_PROCESSOR_FIXED_FIRST_WORDS,
  IR_SKELETON_SECTIONS,
  IR_SKELETON_SUBTITLE,
  IR_SKELETON_TITLE,
  IR_SKELETON_VERSION,
  IR_TEMPLATE_FRAMING_NOTE,
  IR_V3_BANNED_REGISTER,
} from "../prose/plans/ir-playbook.spine.ts";
import {
  IR_AFFECTED_COUNT_MAP,
  IR_CONTAINMENT_STATE_MAP,
  IR_INCIDENT_TYPE_MAP,
} from "../prose/plans/ir-playbook.slotmap.ts";
import {
  renderSkeletonDocument,
  skeletonDocumentToText,
  verifySkeletonConformance,
  type ComposedBlocks,
  type RenderedSkeletonDocument,
  type SlotValues,
} from "../../../_shared/prose/skeleton-render.ts";
import { repairRegister } from "../../../_shared/ltp/risk-skeleton-assemble.ts";
import { firstSentence, firstSentences } from "../../../_shared/ltp/dpia-skeleton-assemble.ts";
import { buildIrPlaybookDeliverables, normalizeBreachNoticeContracts, normalizeResponseTeamRoster } from "./ir-playbook-deliverables/build.ts";
// IR-F tranche 2 — the verified per-state walk gates (CA/TX/NY this tranche).
import { STATE_WALK_GATES } from "./ir-playbook-deliverables/us-state-duties.ts";

export const IR_SKELETON_ASSEMBLER_STAMP = "ir-skeleton-assembler@so7-wire-in-2026-08-10";

type Bag = Record<string, unknown>;

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const arr = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.map((x) => (typeof x === "string" ? x.trim() : s((x as Bag)?.label ?? (x as Bag)?.text))).filter(Boolean)
    : s(v)
    ? [s(v)]
    : [];

function asArray(v: unknown): Bag[] {
  if (Array.isArray(v)) return v as Bag[];
  const t = s(v);
  if (t.startsWith("[")) {
    try {
      const parsed = JSON.parse(t);
      return Array.isArray(parsed) ? (parsed as Bag[]) : [];
    } catch { /* fall through */ }
  }
  return [];
}

function asProse(items: readonly string[]): string {
  const xs = items.filter(Boolean);
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

const noStop = (t: string): string => t.replace(/\s*\.\s*$/, "");
const stop = (t: string): string => (t ? (/[.!?]$/.test(t) ? t : `${t}.`) : "");

// SO-3 DEFECT CLASS 1 — curated enum labels only. Never an organisation name,
// a person's name, a firm, a sector label or any free-text answer.
function lowerEnumLabel(v: string): string {
  if (!v) return v;
  if (/^[A-Z]{2,}/.test(v)) return v;
  return v.charAt(0).toLowerCase() + v.slice(1);
}

/** Reader-facing date: the recorded discovery timestamp, day precision. */
export function readerDate(v: unknown): string {
  const raw = s(v);
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toISOString().slice(0, 10);
}

const TO_COMPLETE = /^to be completed$/i;
const isRecorded = (v: string): boolean => Boolean(v) && !TO_COMPLETE.test(v);

// ── Slot values ─────────────────────────────────────────────────────────────

/** The recorded escalation structure, as prose. Roles are the reader's own. */
// E8973164 follow-up (2026-08-28) — the roster arrives as an array OR an
// object keyed by camelCase role slugs; the array-only read dropped the
// escalation-path sentence entirely on the object shape. The shared
// normalizer (ir-playbook-deliverables/build.ts) handles both shapes.
export function buildEscalationProse(intake: Bag): string {
  const parts: string[] = [];
  for (const r of normalizeResponseTeamRoster(intake)) {
    const role = r.roleLabel;
    const primary = r.name;
    if (!role && !primary) continue;
    const who = [primary ? primary : "", r.alternate ? `with ${r.alternate} as alternate` : ""]
      .filter(Boolean)
      .join(", ");
    parts.push(role ? (who ? `${role} - ${who}` : `${role} - no named holder`) : who);
  }
  return parts.join("; ");
}

/** The external support the company has named, as prose. Names never folded. */
export function buildExternalSupportProse(intake: Bag): string {
  const bits: string[] = [];
  const counsel = s(intake.outsideCounselName);
  const counselContact = s(intake.outsideCounselContact);
  if (isRecorded(counsel)) {
    bits.push(`outside counsel ${counsel}${isRecorded(counselContact) ? ` (${counselContact})` : ""}`);
  }
  const forensic = s(intake.forensicVendorContact);
  if (isRecorded(forensic)) bits.push(`the retained forensic vendor ${forensic}`);
  const insurer = s(intake.insurerContact);
  if (isRecorded(insurer)) bits.push(`the cyber insurer ${insurer}`);
  const le = s(intake.lawEnforcementContact);
  if (isRecorded(le)) bits.push(`the law-enforcement contact ${le}`);
  return asProse(bits);
}

/** The notification clocks, each named with its statutory basis. */
export function buildDeadlinesProse(report: Bag): string {
  const duties = asArray(report.notification_duties);
  const clauses: string[] = [];
  for (const d of duties) {
    const label = s(d.regime_label);
    const authority = s(d.supervisory_authority);
    const sa = (d.sa_notification_determination ?? {}) as Bag;
    const citation = s(sa.standard_citation) || (s(sa.regime) === "uk" ? "UK GDPR Art. 33(1)" : "GDPR Art. 33(1)");
    if (!label) continue;
    clauses.push(
      `under ${label}, notification to ${authority || "the competent supervisory authority"} without undue delay and, where feasible, not later than 72 hours after awareness (${citation})`,
    );
  }
  // SO-FT FIX 3 (2026-08-11): the recorded US-state clocks are stated here in
  // their OWN statutory terms. They ran silent before this fix, which left the
  // 72-hour GDPR figure standing as if it were the whole timeline.
  for (const d of asArray(report.state_notification_duties)) {
    const state = s(d.state_label);
    const citation = s(d.citation);
    const individual = s(d.individual_deadline);
    const regulator = s(d.regulator_deadline);
    if (!state || !individual) continue;
    clauses.push(
      `under the law of ${state}, ${individual}${regulator ? `, together with ${regulator}` : ""}${citation ? ` (${citation})` : ""}`,
    );
  }
  return asProse(clauses);
}


export function buildIrSlotValues(report: Bag, intake: Bag): SlotValues {
  const escalation = buildEscalationProse(intake);
  const external = buildExternalSupportProse(intake);
  const deadlines = buildDeadlinesProse(report);
  const cause = s(intake.cause);
  const count = s(intake.affectedCount);
  const contained = s(intake.contained);
  const categories = arr(intake.dataTypes).map(lowerEnumLabel);
  const discovery = readerDate(intake.discoveryDateTime);

  return {
    // Part One — durable register.
    organizationName: s(intake.organizationName) || null,
    sector: s(intake.organisationType) || null, // reader label, never case-folded
    escalationContacts: escalation || null,
    externalSupport: external || null,
    notificationDeadlines: deadlines || null,

    // Part Two — operational register. Absent => BLANK BY DESIGN.
    incidentType: cause ? (IR_INCIDENT_TYPE_MAP[cause] ?? lowerEnumLabel(cause)) : null,
    discoveryDate: discovery || null,
    dataCategories: categories.length ? asProse(categories) : null,
    affectedCount: count ? (IR_AFFECTED_COUNT_MAP[count] ?? lowerEnumLabel(count)) : null,
    containmentState: contained ? (IR_CONTAINMENT_STATE_MAP[contained] ?? lowerEnumLabel(contained)) : null,
  };
}

// ── Typed-surface readers ───────────────────────────────────────────────────

function standing(report: Bag): Bag {
  return (report.standing_playbook ?? {}) as Bag;
}

function standingSections(report: Bag): Bag[] {
  return asArray(standing(report).sections);
}

// ── Composed blocks ─────────────────────────────────────────────────────────

/** Part One lead — bound to the standing playbook's own typed status. */
function composeStandingLead(report: Bag, org: string): string {
  const sp = standing(report);
  const sections = standingSections(report);
  if (sections.length === 0) {
    return `No standing arrangement has been analysed for ${org} on the answers given, so this playbook states no preparedness conclusion.`;
  }
  const open = sections.filter((x) => s(x.status) === "record_insufficient");
  if (s(sp.status) === "record_insufficient" || open.length > 0) {
    return `On the company's answers, ${org}'s standing preparedness would not carry it through a notifiable incident unaided: ${open.length === 1 ? "one standing section is" : `${open.length} standing sections are`} not settled by what the company has recorded, and each is named below with what would complete it.`;
  }
  return `On the company's answers, ${org}'s standing preparedness would carry it through a notifiable incident, subject to the arrangements being operated as recorded.`;
}

/** The BYTE-PINNED authority-framing note, printed verbatim, marker removed. */
function composeFramingNote(): string {
  return IR_TEMPLATE_FRAMING_NOTE;
}

/** Part One body — programme posture plus the single unrecorded-section ledger. */
function composeStandingPosture(report: Bag): string {
  const sections = standingSections(report);
  if (sections.length === 0) return "";
  const recorded: string[] = [];
  const openLines: string[] = [];
  for (const sec of sections) {
    const heading = noStop(s(sec.heading));
    if (!heading) continue;
    if (s(sec.status) === "record_insufficient") {
      const needed = s(sec.information_needed);
      openLines.push(needed ? `${heading}: ${noStop(lowerEnumLabel(needed))}.` : `${heading}: not recorded.`);
    } else {
      recorded.push(heading);
    }
  }
  const parts: string[] = [];
  if (recorded.length) {
    parts.push(
      stop(
        `The company has recorded the arrangements behind ${asProse(recorded.map(lowerEnumLabel))}, and each is set out in the standing sections below as the company gave it`,
      ),
    );
  }
  if (openLines.length) {
    // ONE ledger sentence, then each unrecorded section stating what fills it.
    parts.push(
      stop(
        `${openLines.length === 1 ? "One standing section is" : `${openLines.length} standing sections are`} carried on the ledger as unrecorded, and each states what would fill it`,
      ),
    );
    parts.push(openLines.join("\n"));
  }
  return repairRegister(parts.filter(Boolean).join("\n\n"));
}

/** Part Two lead — incident-specific, or the blank-by-design sentence. */
function composeWorksheetLead(report: Bag, intake: Bag, values: SlotValues): string {
  const hasIncident = Boolean(values.incidentType || values.discoveryDate || values.dataCategories);
  if (!hasIncident) {
    return "No incident has been recorded, so the worksheet below ships blank by design: its fields are completed at the time of an incident, and their blankness is the correct state of this document today.";
  }
  const sa = (report.sa_notification_determination ?? {}) as Bag;
  const verdict = s(sa.verdict);
  const label = s(sa.regime_label) || "the regime in scope";
  const classification = values.incidentType ? `${values.incidentType}` : "an incident it has not yet classified";
  // D1D2B3B8-I1 — a record with no GDPR-family jurisdiction is told which
  // clocks ARE operative, never that a GDPR clock is engaged.
  if (verdict === "framework_not_engaged") {
    const stateDuties = asArray(report.state_notification_duties);
    const stateNames = stateDuties.map((d) => s(d.state_label)).filter(Boolean);
    return stop(
      `The company has classified the matter as ${classification}. No EU or UK jurisdiction is recorded, so no GDPR-family supervisory-authority clock is engaged; the operative clocks are ${stateNames.length ? `the recorded jurisdictions' own duties (${asProse(stateNames)}, set out in the standing sections)` : "the recorded jurisdictions' own duties set out in the standing sections"} and the recorded contractual clocks below, and the immediate posture is to work to the earliest of them`,
    );
  }
  if (verdict === "notification_required") {
    return stop(
      `The company has classified the matter as ${classification}, and on its answers the ${label} supervisory-authority notification duty is engaged, so the immediate posture is to work to that clock`,
    );
  }
  if (verdict === "notification_not_required_unlikely_risk") {
    return stop(
      `The company has classified the matter as ${classification}, and on its answers the ${label} supervisory-authority notification duty is not engaged, so the immediate posture is to record the basis for that position`,
    );
  }
  return stop(
    `The company has classified the matter as ${classification}, and on its answers the ${label} supervisory-authority notification duty cannot yet be determined, so the immediate posture is to establish the facts that would settle it`,
  );
}

/**
 * PROCESSORS conditional. Fires on the live `processorInvolved` answer and
 * opens with the fixed first words the skeleton pins. The Art. 28(3)(f) and
 * Art. 33(2) passages are corpus-verified quotations.
 */
function composeProcessors(intake: Bag, gdprEngaged: boolean): string {
  if (intake.processorInvolved !== true && s(intake.processorInvolved).toLowerCase() !== "true") return "";
  const name = s(intake.processorName);
  const parts: string[] = [IR_PROCESSOR_FIXED_FIRST_WORDS];
  parts.push(
    name
      ? stop(`The company has identified the processor as ${name}`)
      : "The company has not named the processor.",
  );
  // D1D2B3B8-I1 — the Art. 33(2)/28(3)(f) paragraphs state GDPR duties and
  // render only where a GDPR-family jurisdiction is recorded. On other
  // records (live batch: US-only HIPAA/CA/TX/FL with a named processor) the
  // processor's clocks are contractual and framework-specific, and the
  // paragraph says so instead of quoting the wrong instrument.
  if (gdprEngaged) {
    parts.push(
      'On the processor\'s own notification clock, GDPR Art. 33(2) provides: "The processor shall notify the controller without undue delay after becoming aware of a personal data breach." The controller\'s 72-hour clock under Art. 33(1) runs from the controller\'s awareness, and the processor\'s notification is what ordinarily starts it.',
    );
    parts.push(
      'Under the processing contract, GDPR Art. 28(3)(f) requires that the processor "assists the controller in ensuring compliance with the obligations pursuant to Articles 32 to 36 taking into account the nature of processing and the information available to the processor". That assistance duty is the contractual route to the facts the Art. 33(3) notification content requires.',
    );
  } else {
    parts.push(
      "No EU or UK jurisdiction is recorded, so the GDPR's processor-notification clock is not the operative one here. The processor's notification and assistance duties on this record are those the processing contract itself sets — the recorded contractual clocks below carry them — together with any service-provider duties the recorded jurisdictions' own statutes impose.",
    );
  }
  return repairRegister(parts.join(" "));
}

/**
 * SO-FT2 FIX 3 — the awareness moment and the computed 72-hour outer limit,
 * stated as reader-visible text. Pure arithmetic over the recorded discovery
 * timestamp; no wall clock is read.
 */
export function buildAwarenessClockClause(intake: Bag): string {
  const raw = s(intake.discoveryDateTime);
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const fmt = (x: Date) => `${x.toISOString().slice(0, 10)} at ${x.toISOString().slice(11, 16)} UTC`;
  const deadline = new Date(d.getTime() + 72 * 60 * 60 * 1000);
  const awareness = s(intake.awarenessConfirmed);
  const basis = /assumed/i.test(awareness)
    ? "awareness is recorded as ASSUMED against that timestamp pending confirmation"
    : /confirmed/i.test(awareness)
    ? "awareness is recorded as CONFIRMED against that timestamp"
    : "the record does not state whether awareness is confirmed or assumed against that timestamp";
  return stop(
    `The company records discovery at ${fmt(d)}, and ${basis}, so the 72-hour outer limit runs to ${fmt(deadline)}`,
  );
}

/**
 * SO-FT2 FIX 4 — every named contractual counterparty carrying a notification
 * or response clock is checked against this incident's recorded facts, the
 * same treatment the processor already receives.
 */
/** D1D2B3B8-I3 — breachNoticeContracts arrives in two shapes: a flat array
 *  of rows, or an object whose `obligations` array carries the rows; the
 *  deadline may be `deadline` free text or a `noticeWindowDays` number. One
 *  normalizer serves every consumer. */
// E8973164 (2026-08-28, flagged MEDIUM/boilerplate) — a fixture whose rows
// carry `noticePeriod` (a free-text sentence stating BOTH the deadline and
// the clause's own scope qualifier) and `contractReference` produced an
// empty deadline and clause reference for every row, so all three
// counterparties rendered the identical bare sentence. The normalization now
// lives in ir-playbook-deliverables/build.ts (normalizeBreachNoticeContracts)
// and is shared with standing-playbook.ts's contracts table, which had the
// same array-only/field-name blindness.
function contractRows(intake: Bag): { party: string; deadline: string; clause: string }[] {
  return normalizeBreachNoticeContracts(intake).map((r) => ({ ...r }));
}

export function composeContractualTriggers(intake: Bag): string {
  const incidentRecorded = Boolean(s(intake.cause) || s(intake.discoveryDateTime));
  if (!incidentRecorded) return "";
  const lines: string[] = [];
  for (const c of contractRows(intake)) {
    lines.push(
      `${c.party}: on the facts recorded — a ${s(intake.cause) || "recorded incident"} affecting personal data — the contractual notification condition is triggered${c.deadline ? `, and the clock is ${noStop(c.deadline)}` : ""}${c.clause ? ` (${c.clause})` : ""}.`,
    );
  }
  const insurer = s(intake.insurerContact);
  if (isRecorded(insurer)) {
    lines.push(
      `Cyber insurer (${insurer}): the policy notification condition is triggered by this incident and is a condition of cover, so the notification is made on the policy's own clock and is not deferred to the statutory clocks above.`,
    );
  }
  const forensic = s(intake.forensicVendorContact);
  if (isRecorded(forensic)) {
    lines.push(
      `Forensic vendor (${forensic}): the engagement's response clock is triggered — the recorded cause requires forensic scoping to establish what was accessed, which is the same fact set the Art. 33(3) notification content needs.`,
    );
  }
  const counsel = s(intake.outsideCounselName);
  if (isRecorded(counsel)) {
    lines.push(
      `Outside counsel (${counsel}): the engagement trigger is met${intake.privilegeProtocol === true ? ", and the recorded privilege protocol applies to the investigation work product from the point of instruction" : ""}.`,
    );
  }
  if (!lines.length) return "";
  return [
    "The named contractual clocks, checked against this incident's facts:",
    ...lines,
  ].join("\n");
}

/**
 * SO-FT2 FIX 5 — the standing containment / eradication / recovery
 * arrangements applied to the recorded facts, rather than a single
 * containment-state sentence.
 */
export function composeContainmentPlan(intake: Bag): string {
  const contained = s(intake.contained);
  if (!contained) return "";
  const authority = s(intake.itIsolationAuthority);
  const systems = arr(intake.keySystems);
  const logs = arr(intake.logSources);
  const parts: string[] = [];
  if (contained === "Yes") {
    parts.push(
      stop(
        `Containment is recorded as achieved, so the standing arrangements move to eradication: confirm the access route recorded as the cause is closed on ${systems.length ? asProse(systems.slice(0, 3)) : "the affected systems"}, and rotate the credentials and keys that route reached`,
      ),
    );
  } else {
    parts.push(
      stop(
        `Containment is recorded as ${IR_CONTAINMENT_STATE_MAP[contained] ?? lowerEnumLabel(contained)}, so the next containment step under the standing arrangements is the isolation decision${authority ? `, which the company has reserved to ${authority}` : ""}, taken over ${systems.length ? asProse(systems.slice(0, 3)) : "the affected systems"} before any rebuild begins`,
      ),
    );
    parts.push(
      stop(
        "Evidence preservation runs ahead of that step and not after it: the first-hour arrangements require the relevant logs and images to be preserved before systems are isolated, rebuilt or re-imaged, because isolation can destroy the evidence the notification content depends on",
      ),
    );
    parts.push(
      stop(
        `The eradication step the standing arrangements call for is removal of the access route recorded as the cause and rotation of every credential and key it reached, verified against ${logs.length ? asProse(logs.slice(0, 3)) : "the recorded log sources"}`,
      ),
    );
  }
  parts.push(
    stop(
      `Recovery is validated, not assumed: restore service only on evidence that the route is closed, and monitor ${logs.length ? asProse(logs.slice(0, 3)) : "the recorded log sources"} for recurrence across the first 24 hours after restoration before the incident is closed`,
    ),
  );
  return repairRegister(parts.join(" "));
}

/** D1D2B3B8-I1 — the action plan for records the GDPR does not govern: the
 *  recorded jurisdictions' own notice duties (typed state rows) and the
 *  recorded contractual clocks, in place of the Art. 33(3) content plan. */
// IR-F tranche 1 (2026-08-29, doc 100 recommendation; advance-ratification
// ledger) — the notification decision walk. The state/sectoral duty rows
// above state each regime's clock; this block states the FOUR GATES every
// such duty is walked through and resolves the record's own posture on each
// from facts the intake already carries (cause; dataTypes; encryptionStatus;
// encryptionKeyStatus). Per-state gate CONTENT (each statute's covered-PI
// definition, risk-of-harm carve-out, safe-harbour formulation) is
// deliberately NOT asserted here — that is the sourced, per-tranche registry
// work IR-F's remaining tranches carry under the verified-citation
// discipline. Zero new intake fields; renders only when state/sectoral duty
// rows exist to walk.
function composeNotificationWalk(report: Bag, intake: Bag): string {
  if (asArray(report.state_notification_duties).length === 0) return "";

  const cause = s(intake.cause);
  const dataTypes = asArray(intake.dataTypes).map((d) => s(d)).filter(Boolean);
  const enc = s(intake.encryptionStatus);
  const keys = s(intake.encryptionKeyStatus);

  // Plain-English rewrite (2026-08-29, CEO redline) — the four review points
  // are unchanged in substance; only the register changed, from "gate"
  // terminology to a description of what is actually being checked and why.
  const gate1 = cause && cause !== "Unknown / still investigating"
    ? `First, whether it counts as a breach: the incident was caused by ${noStop(cause).toLowerCase()} — each state has its own definition of what counts as a reportable breach, and some require the data to have been taken while others only require that someone accessed it without permission.`
    : "First, whether it counts as a breach: the cause of the incident hasn't been recorded yet, so this part of the review can't be completed until it is.";

  // Enum labels keep their case — lowercasing mangles the acronyms
  // ("Government IDs / SSN"), caught on the render pass.
  const gate2 = dataTypes.length
    ? `Second, whether the right kind of data was involved: the incident affected ${dataTypes.join("; ")} — each state has its own list of what counts as protected personal information, so not every state necessarily treats this the same way.`
    : "Second, whether the right kind of data was involved: no data types have been recorded yet, so this part of the review can't be completed until they are.";

  const gate3 =
    "Third, whether the harm is serious enough to matter: some states only require notification if the incident is likely to actually harm the people affected — your response team makes that call for this incident; this playbook does not decide it in advance.";

  const keysCompromised = /compromised or possibly compromised/i.test(keys);
  const posture = keysCompromised
    ? "the encryption keys for this incident are recorded as compromised, so encryption does not excuse notification here"
    : /^All affected data encrypted/i.test(enc) && /^Keys not compromised/i.test(keys)
    ? "the data is recorded as fully encrypted and the keys were not compromised — this can qualify for an exception to notification under the states that allow one, as long as the encryption meets that state's specific standard"
    : /^Some affected data encrypted/i.test(enc)
    ? "only part of the affected data is recorded as encrypted, so any exception could only apply to that part"
    : /^No affected data encrypted/i.test(enc)
    ? "the data is recorded as not encrypted, so no encryption-based exception applies"
    : "the encryption status hasn't been recorded, so this can't be resolved either way";

  const gate4 = `Fourth, whether encryption changes the outcome: ${posture}.`;

  const paragraphs: string[] = [[
    "To determine whether this incident triggers a state's notification law, four things are reviewed.",
    gate1,
    gate2,
    gate3,
    gate4,
  ].join(" ")];

  // IR-F TRANCHE 2 (2026-08-29) — per-state resolution for the gated states
  // (STATE_WALK_GATES: California, Texas, New York this tranche; each gate
  // formulation condensed from the statute's own text, fetched fresh from
  // the state's official publisher — see the registry comment). A duty row
  // for a state without gates keeps the generic walk above.
  const namesRecorded = dataTypes.includes("Names and contact details");
  const keysSafe = /^Keys not compromised/i.test(keys);
  const fullyEncrypted = /^All affected data encrypted/i.test(enc);
  for (const d of asArray(report.state_notification_duties)) {
    const gates = STATE_WALK_GATES[s(d.jurisdiction)];
    if (!gates) continue;
    const label = s(d.state_label);
    const bits: string[] = [];
    // Sentence-case the breach-definition formulation at the seam (a
    // formulation may begin lowercase; a quoted term keeps its own casing).
    // Opener reworded 2026-08-29 (CEO redline) — "walked" read as jargon;
    // this introduces the review without asserting its conclusion, since the
    // sentences that follow are what actually resolve it.
    const bd = noStop(gates.breach_definition);
    bits.push(stop(`Here is how ${label}'s law applies to this incident. ${bd.charAt(0).toUpperCase()}${bd.slice(1)}`));

    // Data-element gate, resolved per limb against the recorded types.
    const engagedNamed: string[] = [];
    const engagedConditional: string[] = [];
    const matchedTypes = new Set<string>();
    for (const limb of gates.element_limbs) {
      const hits = limb.intake_types.filter((t) => dataTypes.includes(t));
      if (!hits.length) continue;
      for (const h of hits) matchedTypes.add(h);
      if (limb.requires_name && !namesRecorded) {
        engagedConditional.push(`${hits.join(" and ")} — ${limb.limb}`);
      } else {
        engagedNamed.push(`${hits.join(" and ")} — ${limb.limb}`);
      }
    }
    if (engagedNamed.length) {
      bits.push(stop(
        `On the recorded data types, the following fall within the statute's covered elements: ${engagedNamed.join("; ")}`,
      ));
    }
    if (engagedConditional.length) {
      bits.push(stop(
        `The following reach the covered elements only in combination with the individual's name, which the recorded data types do not list, so each turns on whether names accompany them: ${engagedConditional.join("; ")}`,
      ));
    }
    const unmatched = dataTypes.filter((t) => !matchedTypes.has(t) && t !== "Names and contact details");
    if (unmatched.length && gates.uncovered_note) {
      bits.push(stop(
        `Of the remaining recorded types (${unmatched.join("; ")}): ${noStop(gates.uncovered_note)}`,
      ));
    }
    if (!engagedNamed.length && !engagedConditional.length) {
      bits.push(
        "None of the recorded data types falls within this statute's covered elements on its own terms, so no notification duty is established under it on this record.",
      );
    }

    // Encryption formulation, applied to the recorded posture.
    const encApplied = keysCompromised
      ? "on the recorded key compromise, the encrypted state does not avoid the duty under this formulation"
      : fullyEncrypted && keysSafe
      ? "the recorded posture — all affected data encrypted, keys not compromised — supports the position that the duty is not triggered under this formulation, subject to the encryption meeting the statute's own standard"
      : "the recorded posture does not establish an encryption state that would resolve this formulation either way";
    bits.push(stop(`On encryption, ${noStop(gates.encryption_formulation)}; ${encApplied}`));

    if (gates.harm_carveout) {
      bits.push(stop(
        `The statute also carries a harm-threshold carve-out, which the response team assesses and documents rather than this playbook: ${noStop(gates.harm_carveout)}`,
      ));
    }
    paragraphs.push(bits.join(" "));
  }

  return paragraphs.join("\n\n");
}

function composeJurisdictionActionPlan(report: Bag, intake: Bag): string {
  const lines: string[] = [];
  for (const d of asArray(report.state_notification_duties)) {
    const state = s(d.state_label);
    const individual = s(d.individual_deadline);
    const regulator = s(d.regulator_deadline);
    const citation = s(d.citation);
    if (!state || !individual) continue;
    lines.push(`Notify under the law of ${state} — ${individual}${regulator ? `; ${regulator}` : ""}${citation ? ` (${citation})` : ""}.`);
  }
  for (const c of contractRows(intake)) {
    lines.push(`Notify ${c.party}${c.deadline ? ` — ${c.deadline}` : ""}${c.clause ? ` (${c.clause})` : ""}.`);
  }
  if (!lines.length) return "";
  return ["The action plan, in the order the clocks run:", ...lines].join("\n");
}

/** Part Two body — the notification analysis, jurisdiction by jurisdiction. */
function composeNotificationAnalysis(report: Bag, intake: Bag): string {
  const duties = asArray(report.notification_duties);
  // D1D2B3B8-I1 — a record with no GDPR-family duty set gets the analysis of
  // the duties it ACTUALLY engages: the recorded jurisdictions' own statutory
  // clocks (typed, registry-sourced state duty rows). The old behaviour
  // composed nothing here and let the EU-default duty set speak instead.
  // IR-E Phase 3a (2026-08-29, doc 102) — HIPAA's duties now ride the same
  // state_notification_duties rows (hipaa-duties.ts), so they render via the
  // loop below like any other jurisdiction; no separate HIPAA carve-out.
  if (duties.length === 0) {
    const blocks: string[] = [];
    blocks.push(
      "No EU or UK jurisdiction is recorded, so no Article 33 or Article 34 duty is engaged on this record and no 72-hour clock runs. The operative notification duties are those of the recorded jurisdictions, stated below in their own statutory terms.",
    );
    for (const d of asArray(report.state_notification_duties)) {
      const state = s(d.state_label);
      const individual = s(d.individual_deadline);
      const regulator = s(d.regulator_deadline);
      const citation = s(d.citation);
      if (!state || !individual) continue;
      blocks.push(
        stop(`${state}: ${individual}${regulator ? `, together with ${regulator}` : ""}${citation ? ` (${citation})` : ""}`),
      );
    }
    // IR-E Phase 3a (2026-08-29, doc 102) — REMOVED the "HIPAA's operative
    // text is not in this product's verified corpus" placeholder that used
    // to render here whenever `jurisdictions` named HIPAA. It is now false:
    // hipaa-duties.ts carries the verified 45 C.F.R. §§ 164.404/406/408/410
    // text, and buildHipaaDuties() is gated on the SAME jurisdictions signal
    // this block used to test (plus organisationType) — so whenever that
    // condition holds, the state_notification_duties loop directly above
    // already rendered the HIPAA rows. Leaving both blocks would have
    // printed the duties AND, immediately after, a sentence claiming they
    // couldn't be quoted — a self-contradiction this fix closes rather than
    // papers over.
    // IR-F tranche 1 — the four-gate walk, resolved against this record.
    const walk0 = composeNotificationWalk(report, intake);
    if (walk0) blocks.push(walk0);
    blocks.push(
      "The recorded contractual clocks are set out below and run alongside the statutory duties above; the earliest recorded clock governs the immediate posture.",
    );
    const contractual0 = composeContractualTriggers(intake);
    if (contractual0) blocks.push(contractual0);
    const plan0 = composeContainmentPlan(intake);
    if (plan0) blocks.push(plan0);
    const actionPlan0 = composeJurisdictionActionPlan(report, intake);
    if (actionPlan0) blocks.push(actionPlan0);
    return repairRegister(blocks.join("\n\n"));
  }
  const clock = buildAwarenessClockClause(intake);
  let clockStated = false;
  const blocks: string[] = [];


  for (const d of duties) {
    const label = s(d.regime_label) || "the regime in scope";
    const authority = s(d.supervisory_authority);
    const sa = (d.sa_notification_determination ?? {}) as Bag;
    const ds = (d.data_subject_communication_determination ?? {}) as Bag;
    const bits: string[] = [];
    bits.push(`${label}.`);
    const citation = s(sa.standard_citation);
    const verdict = s(sa.verdict);
    if (verdict === "notification_required") {
      bits.push(
        stop(
          `On the company's answers, notification to ${authority || "the competent supervisory authority"} is required${citation ? ` under ${citation}` : ""}, without undue delay and, where feasible, not later than 72 hours after the company became aware of the breach`,
        ),
      );
    } else if (verdict === "notification_not_required_unlikely_risk") {
      bits.push(
        stop(
          `On the company's answers, the Art. 33(1) negative condition is met and notification to ${authority || "the competent supervisory authority"} is not required${citation ? ` under ${citation}` : ""}; the basis for that position is recorded below`,
        ),
      );
    } else {
      bits.push(
        stop(
          `On the company's answers, whether notification to ${authority || "the competent supervisory authority"} is required${citation ? ` under ${citation}` : ""} is not determined, and that determination is reserved`,
        ),
      );
    }
    // SO-FT2 FIX 3 — the actual awareness moment and the computed deadline,
    // stated next to the duty rather than deferred to an analysis the reader
    // never sees. Stated ONCE, on the first duty that runs to a clock.
    if (clock && !clockStated && verdict !== "notification_not_required_unlikely_risk") {
      bits.push(clock);
      clockStated = true;
    }

    const why = s(sa.why);
    if (why) bits.push(stop(noStop(firstSentences(why, 3))));

    const parallel = s(sa.parallel_duty_note);
    if (parallel) bits.push(stop(noStop(firstSentences(parallel, 2))));
    const needed = s(sa.information_needed);
    if (needed) bits.push(stop(`What would settle it is ${noStop(lowerEnumLabel(needed))}`));
    const dsVerdict = s(ds.verdict);
    const dsWhy = s(ds.why);
    if (dsVerdict) {
      // PANEL LEAK-CLASS (2026-08-30) — the verdict used to be spliced as the
      // raw enum with underscores swapped for spaces ("communication not
      // required no high risk"), a machine register in customer prose. Each
      // verdict now maps to a drafted phrase; unknown values keep the legacy
      // splice rather than dropping the determination.
      const DS_VERDICT_PHRASE: Record<string, string> = {
        communication_required: "that communication to the affected individuals is required",
        communication_not_required_no_high_risk:
          "that no communication is required, because the Article 34(1) high-risk threshold is not reached",
        communication_excused_by_exemption:
          "that communication is excused by an Article 34(3) exemption",
        undetermined_on_the_record: "reserved: it cannot be resolved on the facts recorded",
      };
      const dsPhrase = DS_VERDICT_PHRASE[dsVerdict] ?? noStop(lowerEnumLabel(dsVerdict.replace(/_/g, " ")));
      bits.push(
        stop(
          `On communication to the affected individuals, the determination on the company's answers is ${dsPhrase}${dsWhy ? `: ${noStop(firstSentence(dsWhy))}` : ""}`,
        ),
      );
      // E8973164 (2026-08-28, flagged HIGH) — `ds.why` is a deliberately bald
      // one-line verdict ("Communication to the affected data subjects is
      // required."); the Art. 34(1) high-risk reasoning and the Art. 34(3)
      // exemption analysis (including why an unconfirmed/compromised key
      // status defeats the encryption exemption) live in `ds.application`
      // and were computed but never rendered anywhere in this document — the
      // reader saw only the bald conclusion. That reasoning is surfaced here.
      // 4 sentences (not 3) — the `communication_required` branch's 4th
      // sentence is the exemption clause explaining why an
      // unconfirmed/compromised key status defeats the Art. 34(3)(a)
      // exemption; truncating at 3 would drop exactly the reasoning this
      // fix exists to surface.
      const dsApplication = s(ds.application);
      if (dsApplication) bits.push(stop(noStop(firstSentences(dsApplication, 4))));
    }
    blocks.push(bits.join(" "));
  }

  // IR-F tranche 1 — where recorded state/sectoral duties run in parallel
  // with the GDPR-family duties above, the four-gate walk renders here too;
  // a pure EU/UK record has no state rows and gets no walk block.
  const walk = composeNotificationWalk(report, intake);
  if (walk) blocks.push(walk);

  // SO-FT2 FIX 4 — contractual clocks applied to this incident's facts.
  const contractual = composeContractualTriggers(intake);
  if (contractual) blocks.push(contractual);

  // SO-FT2 FIX 5 — containment / eradication / recovery, applied.
  const plan = composeContainmentPlan(intake);
  if (plan) blocks.push(plan);

  // The action plan, in time order, from the typed content/owner mapping.
  //
  // 3E9AD759-I1 (2026-08-27, live batch 3e9ad759) — the old line read
  // `s(e.action) || s(e.requirement) || s(e.element)`: the first two keys do
  // not exist on ContentElementMapping (the field is requirement_verbatim),
  // so every line fell through to the RAW ELEMENT KEY and the customer
  // document printed "a_nature - Security / Forensics Lead." four times over.
  // Each line now names the Art. 33(3) content element in words, maps the
  // owning role to the named person on the recorded roster where one
  // matches, and states what is on the record or what is outstanding.
  const mapping = (report.content_owner_mapping ?? {}) as Bag;
  const elements = asArray(mapping.elements);
  if (elements.length) {
    const ELEMENT_LABELS: Record<string, string> = {
      a_nature: "describe the nature of the breach — the categories and approximate numbers of data subjects and records concerned",
      b_dpo_contact: "supply the name and contact details of the data protection officer or other contact point",
      c_likely_consequences: "describe the likely consequences of the breach",
      d_measures: "describe the measures taken or proposed, and the measures mitigating possible adverse effects",
    };
    // E8973164 (2026-08-28) — broadened c_likely_consequences and d_measures:
    // an object-shaped roster's key/title text reads "incident response
    // lead", not the literal "incident lead"/"incident commander" this
    // regex required, and no fixture title ever literally says "it
    // operations" for the measures/remediation owner — both patterns
    // matched nothing on a real record that did name these roles.
    const ROSTER_MATCHERS: Record<string, RegExp> = {
      a_nature: /forensic|security/i,
      b_dpo_contact: /\bdpo\b|data protection/i,
      c_likely_consequences: /incident\s+(?:lead|commander|response)|breach/i,
      d_measures: /remediat|recovery|it\s*operations|forensic|cyber|security/i,
    };
    // E8973164 — `responseTeamRoster` is contract kind "structured" and the
    // generator has been observed producing an array-of-rows shape AND an
    // object keyed by arbitrary camelCase role slugs; `asArray` on the
    // object shape returned nothing, so every action-plan line fell back to
    // "assign on the recorded roster" even though the record named every
    // role. `normalizeResponseTeamRoster` (ir-playbook-deliverables/build.ts)
    // handles both shapes; see its comment for the full history.
    const roster = normalizeResponseTeamRoster(intake);
    const namedFor = (key: string): string => {
      const re = ROSTER_MATCHERS[key];
      if (!re) return "";
      const row = roster.find((r) => re.test(r.searchable));
      return row && row.name ? `${row.name} (${row.roleLabel})` : "";
    };
    const lines = elements
      .map((e) => {
        const key = s(e.element);
        const label = ELEMENT_LABELS[key] || noStop(s(e.requirement_verbatim)) || key;
        const owner = s(e.owner);
        const person = namedFor(key);
        const value = s(e.record_value);
        const needed = s(e.information_needed);
        // D1D2B3B8-I2 — an apparatus literal is never presented as record
        // content, even if a post-attach sweep re-introduced one.
        const valueIsApparatus = /could not verify this item/i.test(value);
        const statusClause = needed
          ? `Outstanding: ${noStop(needed)}.`
          : isRecorded(value) && !value.includes("[TO BE COMPLETED]") && !valueIsApparatus
          ? `On the record: ${noStop(value)}.`
          : "";
        const citation = s(e.citation);
        // D1D2B3B8-I2 — a role with no matching roster entry is an
        // ASSIGNMENT to make, not a person the record names.
        const ownerClause = owner
          ? ` (${owner}${person ? `: ${person} on the recorded roster` : " — assign on the recorded roster"})`
          : "";
        return [
          `${citation ? `${citation} — ` : ""}${label}${ownerClause}.`,
          statusClause,
        ].filter(Boolean).join(" ");
      })
      .filter(Boolean);
    if (lines.length) {
      blocks.push(
        ["The action plan, in the order the clocks run:", ...lines].join("\n"),
      );
    }
  }
  return repairRegister(blocks.join("\n\n"));
}

// ── Table of Authorities ────────────────────────────────────────────────────

function irToa(report: Bag, body: string): string {
  const exhibit = (report.authority_exhibit ?? {}) as Bag;
  const entries = Array.isArray(exhibit.entries) ? (exhibit.entries as Bag[]) : [];
  const groups: Record<string, string[]> = {
    "Regulations": [],
    "Statutes": [],
    "Guidance and Persuasive Authority": [],
  };
  const seen = new Set<string>();
  for (const e of entries) {
    const citation = s(e.citation);
    if (!citation || seen.has(citation)) continue;
    if (!body.includes(citation)) continue; // iff-cited
    seen.add(citation);
    const cls = s(e.authority_class);
    const group = cls === "regulation" || /GDPR/i.test(citation)
      ? "Regulations"
      : cls === "statute" || /ILCS|RCW|Code §|U\.S\.C\./i.test(citation)
      ? "Statutes"
      : "Guidance and Persuasive Authority";
    groups[group].push(citation);
  }
  const lines: string[] = [];
  for (const group of Object.keys(groups)) {
    const inGroup = groups[group].sort();
    if (!inGroup.length) continue;
    lines.push(group === "Guidance and Persuasive Authority" ? `${group} (persuasive)` : group);
    for (const c of inGroup) lines.push(`    ${c}`);
  }
  return lines.join("\n");
}

// ── Assembly ────────────────────────────────────────────────────────────────

export interface IrSkeletonResult {
  readonly document: RenderedSkeletonDocument;
  readonly conformance: ReturnType<typeof verifySkeletonConformance>;
  readonly register_findings: string[];
}

export function assembleIRSkeletonDocument(report: Bag, intakeInput: Bag): IrSkeletonResult {
  const intake = intakeInput ?? {};
  // D1D2B3B8-I1/I2 (2026-08-28) — COMPOSE FROM THE PURE BUILDER. The typed
  // notification surfaces on the attached report pass through post-attach
  // sweeps before this assembler runs; live batch d1d2b3b8 showed
  // state-duty and content-plan values replaced with the apparatus literal
  // ("We could not verify this item…") by the time they rendered, and the
  // retired EU-default duty set applying GDPR to a US-only record.
  // buildIrPlaybookDeliverables is pure and the single writer of these
  // surfaces, so rebuilding them from intake at compose time renders the
  // same regime-gated content the builder actually determined (the cyber
  // FD703575-CY1 pattern). Fail-open: on any error the attached report
  // composes as before.
  let composeReport: Bag = report;
  try {
    const fresh = buildIrPlaybookDeliverables(intake);
    composeReport = {
      ...report,
      notification_duties: fresh.notification_duties,
      state_notification_duties: fresh.state_notification_duties,
      sa_notification_determination: fresh.sa_notification_determination,
      data_subject_communication_determination: fresh.data_subject_communication_determination,
      art34_exemption_analysis: fresh.art34_exemption_analysis,
      content_owner_mapping: fresh.content_owner_mapping,
    };
  } catch { /* fail-open */ }
  const gdprEngaged = asArray(composeReport.notification_duties).length > 0;
  const values = buildIrSlotValues(composeReport, intake);
  const org = s(intake.organizationName) || "the company";

  const composed: ComposedBlocks = {
    "standing_playbook:0": composeStandingLead(report, org),
    "standing_playbook:2": composeFramingNote(),
    "standing_playbook:3": composeStandingPosture(report),

    "incident_worksheet:0": composeWorksheetLead(composeReport, intake, values),
    "incident_worksheet:2": composeProcessors(intake, gdprEngaged),
    "incident_worksheet:4": composeNotificationAnalysis(composeReport, intake),
  };

  const draft = renderSkeletonDocument({
    sections: IR_SKELETON_SECTIONS,
    title: IR_SKELETON_TITLE,
    subtitle: IR_SKELETON_SUBTITLE,
    spineVersion: IR_SKELETON_VERSION,
    values,
    composed,
  });

  const toa = irToa(report, skeletonDocumentToText(draft));

  const document = renderSkeletonDocument({
    sections: IR_SKELETON_SECTIONS,
    title: IR_SKELETON_TITLE,
    subtitle: IR_SKELETON_SUBTITLE,
    spineVersion: IR_SKELETON_VERSION,
    values,
    composed: { ...composed, "table_of_authorities:0": toa },
  });

  const body = skeletonDocumentToText(document).toLowerCase();
  const register_findings = IR_V3_BANNED_REGISTER.filter((b) => body.includes(b));

  return {
    document,
    conformance: verifySkeletonConformance(document, IR_SKELETON_SECTIONS),
    register_findings,
  };
}
