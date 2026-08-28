// ITEM SO-6 WIRE-IN — BIOMETRIC: ASSEMBLY THROUGH THE BYTE-PINNED SKELETON.
//
// This module assembles the document the CUSTOMER actually receives: the PDF
// renderer and the result page both read `report_data.skeleton_document`,
// which is what this file produces. It is DETERMINISTIC — every
// [DETERMINATION LEAD], [GENERATED] and [CONDITIONAL] block is composed from
// typed surfaces the biometric pipeline already persists (`duty_findings`,
// `entity_characterization`, `identifier_characterizations`,
// `divergence_analysis`, `consequence_determination`, `biometric_deliverables.
// attestation`, `authority_exhibit`), and every {slot} is filled from the live
// intake per `biometric.slotmap.ts`. No model call, no invented prose, no
// mutation of the typed surfaces.
//
// SO-3 DEFECT CLASSES GUARDED HERE:
//   1. proper nouns (organisation names, sector labels, approver names, state
//      names) are never case-folded — `lowerEnumLabel` runs on curated enum
//      labels only;
//   2. sentence truncation is abbreviation-aware (`firstSentence`), so
//      "740 ILCS 14/15(b)" and "Tex. Bus. & Com. Code § 503.001" survive.

import {
  BIOMETRIC_SKELETON_SECTIONS,
  BIOMETRIC_SKELETON_TITLE,
  BIOMETRIC_SKELETON_SUBTITLE,
  BIOMETRIC_SKELETON_VERSION,
  BIOMETRIC_V3_BANNED_REGISTER,
} from "../prose/plans/biometric.spine.ts";
import {
  BIOMETRIC_NOTICE_PHRASE_MAP,
  BIOMETRIC_PURPOSE_PHRASE_MAP,
  BIOMETRIC_RELEASE_PHRASE_MAP,
  BIOMETRIC_TX_DESTRUCTION_PHRASE_MAP,
} from "../prose/plans/biometric.slotmap.ts";
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

export const BIOMETRIC_SKELETON_ASSEMBLER_STAMP = "biometric-skeleton-assembler@so6-wire-in-2026-08-10";

type Bag = Record<string, unknown>;

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const arr = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.map((x) => (typeof x === "string" ? x.trim() : s((x as Bag)?.label ?? (x as Bag)?.text))).filter(Boolean)
    : s(v) ? [s(v)] : [];

/** Some typed surfaces are persisted as JSON strings; read both shapes. */
function asArray(v: unknown): Bag[] {
  if (Array.isArray(v)) return v as Bag[];
  const t = s(v);
  if (t.startsWith("[")) {
    try {
      const parsed = JSON.parse(t);
      return Array.isArray(parsed) ? parsed as Bag[] : [];
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
// a person's name, a sector label or any free-text answer.
function lowerEnumLabel(v: string): string {
  if (!v) return v;
  if (/^[A-Z]{2,}/.test(v)) return v;
  return v.charAt(0).toLowerCase() + v.slice(1);
}

// ── Slot values ─────────────────────────────────────────────────────────────

/** The state labels the reader chose, as prose, with any named other states. */
export function buildStatesProse(intake: Bag): string {
  const chosen = arr(intake.jurisdictions).filter((j) => !/^Other US state$/i.test(j));
  const others = s(intake.other_state_names);
  const labels = [...chosen];
  if (arr(intake.jurisdictions).some((j) => /Other US state/i.test(j)) && others) {
    labels.push(noStop(others));
  }
  return asProse(labels);
}

export function buildBiometricSlotValues(intake: Bag): SlotValues {
  const types = arr(intake.biometricTypes).map(lowerEnumLabel);
  const purpose = s(intake.purpose);
  const notice = s(intake.notice_before_collection);
  const release = s(intake.consent_artifact_type);
  const txDestruction = s(intake.tx_destruction_within_one_year);
  const states = buildStatesProse(intake);

  return {
    // Proper nouns and reader labels — verbatim, never case-folded.
    organizationName: s(intake.orgName) || "The company",
    sector: s(intake.orgType) || null,

    biometricTypes: types.length ? asProse(types) : null,
    collectionPurpose: purpose ? (BIOMETRIC_PURPOSE_PHRASE_MAP[purpose] ?? lowerEnumLabel(purpose)) : null,
    collectionMethod: noStop(s(intake.data_source_description)) || null,
    states: states || null,

    HAS_NOTICE_PHRASE: notice ? (BIOMETRIC_NOTICE_PHRASE_MAP[notice] ?? `as ${lowerEnumLabel(notice)}`) : null,
    HAS_RELEASE_PHRASE: release ? (BIOMETRIC_RELEASE_PHRASE_MAP[release] ?? `as ${lowerEnumLabel(release)}`) : null,

    txDestruction: txDestruction ? (BIOMETRIC_TX_DESTRUCTION_PHRASE_MAP[txDestruction] ?? lowerEnumLabel(txDestruction)) : null,

    securityMeasures: noStop(s(intake.security_measures_description)) || null,
    retentionSchedule: noStop(s(intake.retention_schedule_text)) || null,
    destructionTrigger: noStop(s(intake.destruction_trigger)) || null,

    APPROVAL_SENTENCE: approvalSentence(intake),
  };
}

function approvalSentence(intake: Bag): string {
  const name = s(intake.approved_by_name);
  const title = s(intake.approved_by_title);
  const date = s(intake.approval_date);
  const review = s(intake.next_review_due);
  if (!name && !title && !date) {
    return "No approver, title or approval date has been recorded, so this assessment has not been approved within the company";
  }
  const who = name ? `${name}${title ? `, ${title},` : ""}` : `the approver recorded${title ? ` as ${title}` : ""}`;
  const when = date ? ` on ${date}` : ", with no approval date recorded";
  const next = review ? `, and the next review is recorded as due ${review}` : "";
  return `This assessment is recorded as approved by ${who}${when}${next}`;
}

// ── Typed-surface readers ───────────────────────────────────────────────────

const NOTICE_DUTY = /notice|written policy|release|consent|disclos/i;
const SECURITY_DUTY = /secur|storage|retention|destruc|protect/i;

function dutyRows(report: Bag): Bag[] {
  const direct = asArray(report.duty_findings);
  if (direct.length) return direct;
  return asArray(((report.biometric_deliverables ?? {}) as Bag).duty_findings);
}

function consequence(report: Bag): Bag {
  const direct = report.consequence_determination;
  if (direct && typeof direct === "object") return direct as Bag;
  return (((report.biometric_deliverables ?? {}) as Bag).consequence_determination ?? {}) as Bag;
}

function statuteGroups(rows: readonly Bag[]): Map<string, Bag[]> {
  const out = new Map<string, Bag[]>();
  for (const r of rows) {
    const key = s(r.statute_short) || s(r.statute_key) || "the statutes in scope";
    if (!out.has(key)) out.set(key, []);
    out.get(key)!.push(r);
  }
  return out;
}

/**
 * DESTRUCTION CLOCK REPAIR (fixed-prose directive, section I). The statutory
 * period runs from the individual's last interaction with the company, not
 * from collection. This states the clock; it never rewrites the company's own
 * recorded answer, which is quoted as given.
 */
export function destructionClockSentence(): string {
  return "Under the destruction duties in scope, the retention period runs from the date the initial purpose for collection has been satisfied or from the individual's last interaction with the company, whichever occurs first, and not from the date of collection.";
}

// ── Composed blocks ─────────────────────────────────────────────────────────

function verdictCounts(rows: readonly Bag[]): { met: number; unmet: number; open: number; na: number } {
  let met = 0, unmet = 0, open = 0, na = 0;
  for (const r of rows) {
    switch (s(r.verdict)) {
      case "satisfied": met++; break;
      case "not_satisfied": unmet++; break;
      case "not_applicable": na++; break;
      default: open++; break;
    }
  }
  return { met, unmet, open, na };
}

function composeExecutiveLead(report: Bag, org: string): string {
  const rows = dutyRows(report);
  const c = consequence(report);
  const unlawful = asArray(c.unlawful_now);
  const unresolved = asArray(c.unresolved_on_record);
  if (rows.length === 0) {
    return `No statutory duty has been analysed for ${org} on the answers given, so this assessment states no compliance conclusion.`;
  }
  if (unlawful.length > 0) {
    const statutes = asProse([...new Set(unlawful.map((u) => s(u.statute_short)).filter(Boolean))]);
    return `On the company's answers, the programme as ${org} describes it does not meet ${unlawful.length === 1 ? "one duty" : `${unlawful.length} duties`}${statutes ? ` under ${statutes}` : ""}, and those duties are named with their pinpoints below.`;
  }
  if (unresolved.length > 0) {
    return `On the company's answers, no duty in scope is unmet, but ${unresolved.length === 1 ? "one duty is" : `${unresolved.length} duties are`} left unresolved by what the company has answered, and each is named below with what would settle it.`;
  }
  return `On the company's answers, the programme as ${org} describes it meets each statutory duty in scope, subject to the measures being operated as described.`;
}

function composeExecutiveBody(report: Bag): string {
  const rows = dutyRows(report);
  const clauses: string[] = [];
  for (const [statute, group] of statuteGroups(rows)) {
    const { met, unmet, open } = verdictCounts(group);
    if (unmet > 0) {
      const first = group.find((r) => s(r.verdict) === "not_satisfied");
      clauses.push(
        `Under ${statute}, ${unmet === 1 ? "one duty is" : `${unmet} duties are`} not met on the company's answers${first ? `, beginning with ${noStop(s(first.label))} at ${s(first.citation)}` : ""}.`,
      );
    } else if (open > 0) {
      const first = group.find((r) => s(r.verdict) === "record_insufficient");
      const needed = first ? s(first.information_needed) : "";
      clauses.push(
        `Under ${statute}, ${open === 1 ? "one duty is" : `${open} duties are`} unresolved by the company's answers${needed ? `; what would settle the first of them is ${noStop(lowerEnumLabel(needed))}` : ""}.`,
      );
    } else if (met > 0) {
      clauses.push(`Under ${statute}, each duty analysed is met on the company's answers.`);
    }
  }
  if (clauses.length === 0) return "";
  return repairRegister(clauses.join(" "));
}

function composeNoticeLead(report: Bag): string {
  const rows = dutyRows(report).filter((r) => NOTICE_DUTY.test(`${s(r.key)} ${s(r.label)}`));
  if (rows.length === 0) {
    return "No notice-and-consent duty has been analysed on the answers given, so this section states no posture.";
  }
  const { unmet, open } = verdictCounts(rows);
  if (unmet > 0) {
    return `Across the statutes in scope, the notice-and-consent posture is deficient: ${unmet === 1 ? "one of the notice, release or disclosure duties is" : `${unmet} of the notice, release and disclosure duties are`} not met on the company's answers.`;
  }
  if (open > 0) {
    return `Across the statutes in scope, the notice-and-consent posture cannot be settled: ${open === 1 ? "one duty is" : `${open} duties are`} unresolved by the company's answers.`;
  }
  return "Across the statutes in scope, the notice-and-consent duties analysed are met on the company's answers.";
}

function composeDutyBlock(rows: readonly Bag[]): string {
  const blocks: string[] = [];
  // 3E9AD759-B1 — consecutive rows sharing one application (the WA gate rows
  // all carry the same not-applicable analysis) state it ONCE; each repeat
  // cross-references it instead of reprinting the identical paragraph. The
  // typed rows stay complete — this is presentation only.
  let prevApplication = "";
  for (const r of rows) {
    const label = noStop(s(r.label));
    const citation = s(r.citation);
    if (!label) continue;
    const bits: string[] = [];
    bits.push(`${label}${citation ? ` (${citation})` : ""}.`);
    const standard = s(r.standard);
    if (standard) bits.push(`The provision states: "${noStop(standard)}."`);
    const fact = s(r.record_fact);
    if (fact) bits.push(stop(`The company has answered that ${noStop(lowerEnumLabel(fact))}`));
    const application = s(r.application);
    if (application && application === prevApplication) {
      bits.push("The same predicate governs this duty, for the reason stated above.");
    } else if (application) {
      bits.push(stop(noStop(firstSentences(application, 3))));
    }
    prevApplication = application;
    const verdict = s(r.verdict);
    if (verdict === "record_insufficient") {
      const needed = s(r.information_needed);
      bits.push(needed
        ? stop(`This duty is not resolved by the company's answers; what would settle it is ${noStop(lowerEnumLabel(needed))}`)
        : "This duty is not resolved by the company's answers.");
    } else if (verdict === "not_satisfied") {
      bits.push("On the company's answers, this duty is not met.");
    } else if (verdict === "satisfied") {
      bits.push("On the company's answers, this duty is met.");
    } else if (verdict === "not_applicable") {
      bits.push("This duty does not apply to the company's programme as described.");
    }
    blocks.push(bits.join(" "));
  }
  return blocks.join("\n\n");
}

function composeNoticeBody(report: Bag): string {
  const rows = dutyRows(report).filter((r) => NOTICE_DUTY.test(`${s(r.key)} ${s(r.label)}`));
  const body = composeDutyBlock(rows);
  const parts = [body, destructionClockSentence()].filter(Boolean);
  return repairRegister(parts.join("\n\n"));
}

function inScope(intake: Bag, needle: RegExp): boolean {
  return arr(intake.jurisdictions).some((j) => needle.test(j));
}

function statuteRows(report: Bag, key: string): Bag[] {
  return dutyRows(report).filter((r) => s(r.statute_key) === key);
}

function composeIllinois(report: Bag, intake: Bag): string {
  if (!inScope(intake, /Illinois/i)) return "";
  const rows = statuteRows(report, "us_il_bipa");
  const parts: string[] = [
    "Illinois. The Biometric Information Privacy Act imposes the Section 15 duties set out below, each taken from its verified statutory passage.",
  ];
  const body = composeDutyBlock(rows);
  if (body) parts.push(body);
  else parts.push("No BIPA duty row has been analysed on the answers given.");
  parts.push(
    "On damages, 740 ILCS 14/20(b) and 20(c) as amended by Public Act 103-769 provide that a private entity that more than once collects or discloses the same biometric identifier from the same person by the same method has committed a single violation, for which the aggrieved person is entitled to, at most, one recovery.",
  );
  return repairRegister(parts.join("\n\n"));
}

function composeTexas(report: Bag, intake: Bag, values: SlotValues): string {
  if (!inScope(intake, /Texas/i)) return "";
  const rows = statuteRows(report, "us_tx_cubi");
  const parts: string[] = [
    "Texas. The Capture or Use of Biometric Identifier Act imposes the duties set out below, each taken from its verified statutory passage.",
  ];
  const body = composeDutyBlock(rows);
  if (body) parts.push(body);
  else parts.push("No CUBI duty row has been analysed on the answers given.");
  parts.push(values.txDestruction
    ? stop(`On destruction, the company has answered ${values.txDestruction}`)
    : "On destruction, the company has not recorded whether biometric identifiers are destroyed within one year of the date the purpose for collecting them expires.");
  return repairRegister(parts.join("\n\n"));
}

function composeWashington(report: Bag, intake: Bag): string {
  if (!inScope(intake, /Washington/i)) return "";
  const rows = statuteRows(report, "us_wa_19375");
  const mhmda = statuteRows(report, "us_wa_19373");
  const parts: string[] = [
    "Washington. RCW 19.375 imposes the enrolment duties set out below, each taken from its verified statutory passage.",
  ];
  const body = composeDutyBlock(rows);
  if (body) parts.push(body);
  else parts.push("No RCW 19.375 duty row has been analysed on the answers given.");
  if (mhmda.length > 0) {
    // FD703575-B1 (2026-08-27, live batch fd703575) — the lead fired on the
    // mere EXISTENCE of MHMDA rows, asserting "the company's answers
    // indicate that health data is collected or inferred" against a record
    // whose health-inference answer was "No" and whose every consumer-
    // health-data duty row said the data falls OUTSIDE the RCW 19.373.010(8)
    // definition (flagged HIGH as an unsupported claim). The lead now reads
    // the same answer the duty rows themselves are decided on.
    const healthAnswer = s((intake as Bag).wa_mhmda_health_inference).toLowerCase();
    const healthIndicated = healthAnswer.startsWith("yes");
    parts.push(healthIndicated
      ? "The My Health My Data Act applies in addition, because the company's answers indicate that health data is collected or inferred."
      : healthAnswer.startsWith("no")
      ? "The My Health My Data Act's duties are examined in addition. On the company's answers the data processed is not consumer health data as RCW 19.373.010(8) defines it; each duty below records the determination that follows."
      : "The My Health My Data Act's duties are examined in addition; whether the data processed is consumer health data as RCW 19.373.010(8) defines it is not answered on the information provided, and each duty below is bounded accordingly.");
    parts.push(composeDutyBlock(mhmda));
  }
  return repairRegister(parts.filter(Boolean).join("\n\n"));
}

function composeOtherStates(report: Bag, intake: Bag): string {
  if (!inScope(intake, /Other US state/i)) return "";
  const applied = (report.registry_applied ?? {}) as Bag;
  const named = arr(applied.named_but_unregistered);
  const readerNames = s(intake.other_state_names);
  if (named.length === 0 && !readerNames) return "";
  const list = named.length ? asProse(named) : noStop(readerNames);
  return repairRegister(
    `Other states. The company has named ${list}. The statutes of ${list} are not among the registered jurisdictions this assessment applies, so no duty is stated for them here; the company should evaluate the named biometric and health-data statutes of ${list} before extending the programme there.`,
  );
}

// S-B5 (doc 80, 2026-08-27) — HONEST-POSTURE PARITY. Every named enum
// jurisdiction WITHOUT a duty registry behind it (the intake offers nine
// beyond Illinois/Texas/Washington) previously produced silence in the
// document; the "Other US state" free-text path was the only selection that
// earned an explicit scope statement. A selected jurisdiction now always
// yields one: no statutory duty is stated for it here, and the EU/UK
// selections name the Article 9 route (the DPIA and Legitimate Interests
// Assessment products) rather than leaving the reader with nothing.
const UNREGISTERED_JURISDICTION_LABELS: Record<string, string> = {
  "EU / EEA (GDPR)": "the EU/EEA (GDPR)",
  "United Kingdom (UK GDPR)": "the United Kingdom (UK GDPR)",
  "California, USA (CCPA/CPRA)": "California (CCPA/CPRA)",
  "Colorado, USA (CPA)": "Colorado (CPA)",
  "New York, USA (SHIELD)": "New York (SHIELD Act)",
  "United States — Federal (FTC)": "US federal law (FTC Act Section 5)",
  "Canada (PIPEDA / provincial)": "Canada (PIPEDA and provincial law)",
  "Australia (Privacy Act)": "Australia (Privacy Act 1988)",
  "Singapore (PDPA)": "Singapore (PDPA)",
};

function composeUnregisteredJurisdictions(intake: Bag): string {
  const selected = arr(intake.jurisdictions)
    .filter((j) => Object.prototype.hasOwnProperty.call(UNREGISTERED_JURISDICTION_LABELS, j));
  if (selected.length === 0) return "";
  const labels = selected.map((j) => UNREGISTERED_JURISDICTION_LABELS[j]);
  const list = asProse(labels);
  const euUk = selected.some((j) => /GDPR/.test(j));
  const parts: string[] = [
    `Beyond the registered statutes. The company has also named ${list}. The duty tables of this assessment apply its registered jurisdictions only, so no statutory duty is stated here for ${list}.`,
  ];
  if (euUk) {
    parts.push(
      "For the EU/EEA and the United Kingdom, biometric data processed to uniquely identify a person is a special category under Article 9 GDPR and UK GDPR; that analysis belongs to a data protection impact assessment and, where legitimate interests is relied on, a legitimate interests assessment, each of which is its own assessment on this platform.",
    );
  }
  parts.push(
    "The company should evaluate the biometric and data-protection rules of each named jurisdiction before extending the programme there.",
  );
  return repairRegister(parts.join(" "));
}

function composeSecurityLead(report: Bag): string {
  const rows = dutyRows(report).filter((r) => SECURITY_DUTY.test(`${s(r.key)} ${s(r.label)}`));
  if (rows.length === 0) {
    return "No storage, retention or destruction duty has been analysed on the answers given, so this section states no conclusion.";
  }
  const { unmet, open } = verdictCounts(rows);
  if (unmet > 0) {
    return `Storage and destruction as described do not meet the strictest applicable standard: ${unmet === 1 ? "one duty is" : `${unmet} duties are`} not met on the company's answers.`;
  }
  if (open > 0) {
    return `Whether storage and destruction meet the strictest applicable standard cannot be settled, because ${open === 1 ? "one duty is" : `${open} duties are`} unresolved by the company's answers.`;
  }
  return "Storage and destruction as described meet the strictest standard applicable among the statutes in scope.";
}

function composeSecurityBody(report: Bag, values: SlotValues): string {
  const rows = dutyRows(report).filter((r) => SECURITY_DUTY.test(`${s(r.key)} ${s(r.label)}`));
  const parts: string[] = [];
  const body = composeDutyBlock(rows);
  if (body) parts.push(body);
  if (!values.securityMeasures) parts.push("The company has not recorded the controls applied to storage and transmission, so no protection-parity conclusion is drawn.");
  if (!values.retentionSchedule) parts.push("The company has not recorded a written retention schedule, and the destruction duties in scope require one.");
  if (parts.length === 0) return "";
  return repairRegister(parts.join("\n\n"));
}

function composeOperativeLead(report: Bag, intake: Bag): string {
  const c = consequence(report);
  const unlawful = asArray(c.unlawful_now);
  const unresolved = asArray(c.unresolved_on_record);
  if (unlawful.length > 0) {
    // SO-FT FIX 4 (2026-08-11): name EVERY not-met duty, not just unlawful[0].
    // FD703575-B5 (2026-08-27) — each act carries the requirement that closes
    // it (the first sentence of the duty's own `why`), so the reader is told
    // what remedying the duty consists of, not only its name and citation.
    // 3E9AD759-B2 (2026-08-27) — the acts are SEQUENCED by exposure: duties
    // under a statute whose own exposure surface records a private action
    // come first, then the rest in walk order, and the rule is stated. The
    // signal comes from the report's typed exposure surfaces, nothing new.
    const praStatutes = new Set(
      asArray(c.exposure_surfaces)
        .filter((e) => /private (?:right of )?action|private suit|person aggrieved/i.test(s(e.mechanism)))
        .map((e) => s(e.statute_short))
        .filter(Boolean),
    );
    const ordered = [...unlawful].sort((a, b) =>
      Number(praStatutes.has(s(b.statute_short))) - Number(praStatutes.has(s(a.statute_short))));
    const praFirst = praStatutes.size > 0 &&
      ordered.some((u) => praStatutes.has(s(u.statute_short))) &&
      ordered.some((u) => !praStatutes.has(s(u.statute_short)));
    const acts = ordered
      .map((u) => {
        const duty = noStop(s(u.duty));
        const cite = s(u.citation);
        if (!duty && !cite) return "";
        const whyText = s(u.why);
        const whyFirst = whyText ? (whyText.match(/^[\s\S]{1,240}?[.!?](?=\s|$)/)?.[0] ?? "").trim().replace(/[.!?]$/, "") : "";
        return `${duty || "the duty named above"}${cite ? ` at ${cite}` : ""}${whyFirst ? ` (${whyFirst})` : ""}`;
      })
      .filter(Boolean);
    if (acts.length === 0) acts.push("the duties named above");
    const clause = acts.length === 1
      ? `the single next act is to remedy ${acts[0]}`
      : `the next acts are to remedy ${asProse(acts)}`;
    const orderingRule = praFirst
      ? " The acts are ordered by exposure: duties under the statute whose enforcement surface records a private action come first."
      : "";
    return repairRegister(stop(
      `The operative conclusion is that the programme is out of compliance on the duties named above, and ${clause}${orderingRule ? `.${orderingRule.replace(/\.$/, "")}` : ""}`,
    ));
  }
  if (unresolved.length > 0) {
    const first = unresolved[0];
    const needed = noStop(s(first.information_needed));
    return repairRegister(stop(
      `The operative conclusion is that the programme cannot be cleared on the company's answers alone, and the single next act is to obtain ${needed ? lowerEnumLabel(needed) : "the answers named above"}`,
    ));
  }
  const approver = s(intake.approved_by_name);
  return approver
    ? `The operative conclusion is that the programme meets the duties in scope as described, and the single next act is for ${approver} to re-confirm that position at the next scheduled review.`
    : "The operative conclusion is that the programme meets the duties in scope as described, and the single next act is to record a named approver for this assessment.";
}

// ── Table of Authorities ────────────────────────────────────────────────────

function biometricToa(report: Bag, body: string): string {
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

export interface BiometricSkeletonResult {
  readonly document: RenderedSkeletonDocument;
  readonly conformance: ReturnType<typeof verifySkeletonConformance>;
  readonly register_findings: string[];
}

export function assembleBiometricSkeletonDocument(report: Bag, intakeInput: Bag): BiometricSkeletonResult {
  const intake = intakeInput ?? {};
  const values = buildBiometricSlotValues(intake);
  const org = s(intake.orgName) || "the company";

  const composed: ComposedBlocks = {
    "executive_summary:0": composeExecutiveLead(report, org),
    "executive_summary:2": composeExecutiveBody(report),

    "notice_consent:0": composeNoticeLead(report),
    "notice_consent:3": composeNoticeBody(report),

    "state_specific:0": composeIllinois(report, intake),
    "state_specific:1": composeTexas(report, intake, values),
    "state_specific:2": composeWashington(report, intake),
    "state_specific:3": composeOtherStates(report, intake),
    // S-B5 — honest-posture parity for named unregistered jurisdictions.
    "state_specific:4": composeUnregisteredJurisdictions(intake),

    "security_retention:0": composeSecurityLead(report),
    "security_retention:2": composeSecurityBody(report, values),

    "review_approval:1": composeOperativeLead(report, intake),
  };

  const draft = renderSkeletonDocument({
    sections: BIOMETRIC_SKELETON_SECTIONS,
    title: BIOMETRIC_SKELETON_TITLE,
    subtitle: BIOMETRIC_SKELETON_SUBTITLE,
    spineVersion: BIOMETRIC_SKELETON_VERSION,
    values,
    composed,
  });

  const toa = biometricToa(report, skeletonDocumentToText(draft));

  const document = renderSkeletonDocument({
    sections: BIOMETRIC_SKELETON_SECTIONS,
    title: BIOMETRIC_SKELETON_TITLE,
    subtitle: BIOMETRIC_SKELETON_SUBTITLE,
    spineVersion: BIOMETRIC_SKELETON_VERSION,
    values,
    composed: { ...composed, "table_of_authorities:0": toa },
  });

  const body = skeletonDocumentToText(document).toLowerCase();
  const register_findings = BIOMETRIC_V3_BANNED_REGISTER.filter((b) => body.includes(b));

  return {
    document,
    conformance: verifySkeletonConformance(document, BIOMETRIC_SKELETON_SECTIONS),
    register_findings,
  };
}

export { firstSentence, firstSentences };
