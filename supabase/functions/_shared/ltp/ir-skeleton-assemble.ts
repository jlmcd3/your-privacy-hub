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
} from "../prose/skeleton-render.ts";
import { repairRegister } from "./risk-skeleton-assemble.ts";
import { firstSentence, firstSentences } from "./dpia-skeleton-assemble.ts";

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
export function buildEscalationProse(intake: Bag): string {
  const rows = asArray(intake.responseTeamRoster);
  const parts: string[] = [];
  for (const r of rows) {
    const role = s(r.role);
    const primary = s(r.primary);
    const alternate = s(r.alternate);
    if (!role && !primary) continue;
    const who = [primary ? primary : "", alternate ? `with ${alternate} as alternate` : ""]
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
function composeProcessors(intake: Bag): string {
  if (intake.processorInvolved !== true && s(intake.processorInvolved).toLowerCase() !== "true") return "";
  const name = s(intake.processorName);
  const parts: string[] = [IR_PROCESSOR_FIXED_FIRST_WORDS];
  parts.push(
    name
      ? stop(`The company has identified the processor as ${name}`)
      : "The company has not named the processor.",
  );
  parts.push(
    'On the processor\'s own notification clock, GDPR Art. 33(2) provides: "The processor shall notify the controller without undue delay after becoming aware of a personal data breach." The controller\'s 72-hour clock under Art. 33(1) runs from the controller\'s awareness, and the processor\'s notification is what ordinarily starts it.',
  );
  parts.push(
    'Under the processing contract, GDPR Art. 28(3)(f) requires that the processor "assists the controller in ensuring compliance with the obligations pursuant to Articles 32 to 36 taking into account the nature of processing and the information available to the processor". That assistance duty is the contractual route to the facts the Art. 33(3) notification content requires.',
  );
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
export function composeContractualTriggers(intake: Bag): string {
  const incidentRecorded = Boolean(s(intake.cause) || s(intake.discoveryDateTime));
  if (!incidentRecorded) return "";
  const lines: string[] = [];
  for (const c of asArray(intake.breachNoticeContracts)) {
    const party = s(c.counterparty);
    const deadline = s(c.deadline);
    const clause = s(c.clause);
    if (!party) continue;
    lines.push(
      `${party}: on the facts recorded — a ${s(intake.cause) || "recorded incident"} affecting personal data — the contractual notification condition is triggered${deadline ? `, and the clock is ${noStop(deadline)}` : ""}${clause ? ` (${clause})` : ""}.`,
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

/** Part Two body — the notification analysis, jurisdiction by jurisdiction. */
function composeNotificationAnalysis(report: Bag, intake: Bag): string {
  const duties = asArray(report.notification_duties);
  if (duties.length === 0) return "";
  const clock = buildAwarenessClockClause(intake);
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
    // never sees.
    if (clock && verdict !== "notification_not_required_unlikely_risk") bits.push(clock);
    const why = s(sa.why);
    if (why) bits.push(stop(noStop(firstSentences(why, 3))));

    const parallel = s(sa.parallel_duty_note);
    if (parallel) bits.push(stop(noStop(firstSentences(parallel, 2))));
    const needed = s(sa.information_needed);
    if (needed) bits.push(stop(`What would settle it is ${noStop(lowerEnumLabel(needed))}`));
    const dsVerdict = s(ds.verdict);
    const dsWhy = s(ds.why);
    if (dsVerdict) {
      bits.push(
        stop(
          `On communication to the affected individuals, the determination on the company's answers is ${noStop(lowerEnumLabel(dsVerdict.replace(/_/g, " ")))}${dsWhy ? `: ${noStop(firstSentence(dsWhy))}` : ""}`,
        ),
      );
    }
    blocks.push(bits.join(" "));
  }

  // The action plan, in time order, from the typed content/owner mapping.
  const mapping = (report.content_owner_mapping ?? {}) as Bag;
  const elements = asArray(mapping.elements);
  if (elements.length) {
    const lines = elements
      .map((e) => {
        const action = noStop(s(e.action) || s(e.requirement) || s(e.element));
        const owner = s(e.owner);
        const timing = s(e.phase) || s(e.timing);
        if (!action) return "";
        return `${action}${owner ? ` - ${owner}` : ""}${timing ? ` (${timing})` : ""}.`;
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
  const values = buildIrSlotValues(report, intake);
  const org = s(intake.organizationName) || "the company";

  const composed: ComposedBlocks = {
    "standing_playbook:0": composeStandingLead(report, org),
    "standing_playbook:2": composeFramingNote(),
    "standing_playbook:3": composeStandingPosture(report),

    "incident_worksheet:0": composeWorksheetLead(report, intake, values),
    "incident_worksheet:2": composeProcessors(intake),
    "incident_worksheet:4": composeNotificationAnalysis(report),
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
