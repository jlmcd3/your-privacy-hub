// ITEM SO-8 WIRE-IN — REGISTRATION ASSESSMENT: ASSEMBLY THROUGH THE
// BYTE-PINNED SKELETON.
//
// This module assembles the document the CUSTOMER actually receives: the PDF
// renderer and the result page both read `result_summary.skeleton_document`,
// which is what this file produces.
//
// THE DETERMINISTIC PRODUCT. There is no model call anywhere in this file.
// Every [DETERMINATION LEAD], [GENERATED] and [CONDITIONAL] block is composed
// from typed surfaces the registration pipeline already persists
// (`registration_deliverables.determinations`, `.schedules`,
// `.filing_readiness`, `.representative_determinations`, `.dpo_determination`,
// `.corpus_pending`, `.attestation`, plus `obligations_summary` and
// `authority_exhibit`), and every {slot} is filled from the live intake per
// `registration.slotmap.ts`. Typed surfaces are never mutated.
//
// COHERENCE LAW: a lead may not disagree with the typed determination it is
// bound to. Each lead is computed FROM the typed counts rather than asserted
// beside them, and `lead_coherence` re-checks the rendered leads against those
// counts; a disagreement is returned as a finding, never silently shipped.
//
// SO-3 DEFECT CLASSES GUARDED HERE:
//   1. proper nouns (organisation names, sector labels, state and authority
//      names, approver names) are never case-folded — `lowerEnumLabel` runs on
//      curated enum labels only;
//   2. sentence truncation is abbreviation-aware (`firstSentence`), so
//      "Art. 27(1)", "Tex. Bus. & Com. Code" and "740 ILCS 14/15" survive.

import {
  REGISTRATION_CORPUS_FRAMING_NOTE,
  REGISTRATION_SKELETON_SECTIONS,
  REGISTRATION_SKELETON_SUBTITLE,
  REGISTRATION_SKELETON_TITLE,
  REGISTRATION_SKELETON_VERSION,
  REGISTRATION_V3_BANNED_REGISTER,
} from "../prose/plans/registration.spine.ts";
import {
  REGISTRATION_DATA_TYPE_LABELS,
  REGISTRATION_JURISDICTION_LABELS,
  REGISTRATION_ORG_SIZE_MAP,
} from "../prose/plans/registration.slotmap.ts";
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

export const REGISTRATION_SKELETON_ASSEMBLER_STAMP =
  "registration-skeleton-assembler@so8-wire-in-2026-08-10";

type Bag = Record<string, unknown>;

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

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

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => s(x)).filter(Boolean) : s(v) ? [s(v)] : [];
}

function asProse(items: readonly string[]): string {
  const xs = items.filter(Boolean);
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`;
}

const noStop = (t: string): string => t.replace(/\s*\.\s*$/, "");
const stop = (t: string): string => (t ? (/[.!?]$/.test(t) ? t : `${t}.`) : "");
const isTrue = (v: unknown): boolean => v === true || s(v).toLowerCase() === "true";

const count = (n: number, one: string, many: string): string =>
  n === 1 ? `one ${one}` : `${n} ${many}`;

// SO-3 DEFECT CLASS 1 — curated enum labels only. Never an organisation name,
// a person's name, a state name, an authority or any free-text answer.
function lowerEnumLabel(v: string): string {
  if (!v) return v;
  if (/^[A-Z]{2,}/.test(v)) return v;
  return v.charAt(0).toLowerCase() + v.slice(1);
}

// ── Slot values ─────────────────────────────────────────────────────────────

/** Reader names for the recorded home country plus the markets served. */
export function buildJurisdictionProse(intake: Bag): string {
  const codes: string[] = [];
  const home = s(intake.organization_country);
  if (home) codes.push(home);
  for (const c of strList(intake.markets_served)) codes.push(c);
  // SO-FT FIX 5 (2026-08-11): dedupe on the RESOLVED LABEL, not the raw code.
  // "UK" and "GB" are different codes that both resolve to "United Kingdom",
  // so code-level dedup rendered "United Kingdom and United Kingdom".
  const seen = new Set<string>();
  const names: string[] = [];
  for (const c of codes) {
    const key = c.toUpperCase();
    const label = REGISTRATION_JURISDICTION_LABELS[key] ?? c;
    const labelKey = label.trim().toLowerCase();
    if (!labelKey || seen.has(labelKey)) continue;
    seen.add(labelKey);
    names.push(label);
  }
  return asProse(names);
}

/**
 * The derived data-category label set (CEO binding of 2026-08-10). Base label
 * plus each specific category the record marks present; no "including" clause
 * where no specific category is recorded.
 */
export function buildDataTypesProse(intake: Bag): string {
  if (!isTrue(intake.processes_personal_data)) return "";
  const extras: string[] = [];
  if (isTrue(intake.processes_special_categories)) extras.push(REGISTRATION_DATA_TYPE_LABELS.special);
  if (isTrue(intake.processes_children_data)) extras.push(REGISTRATION_DATA_TYPE_LABELS.children);
  if (isTrue(intake.processes_biometrics_for_id)) extras.push(REGISTRATION_DATA_TYPE_LABELS.biometric);
  if (extras.length === 0) return REGISTRATION_DATA_TYPE_LABELS.base;
  return `${REGISTRATION_DATA_TYPE_LABELS.base}, including ${asProse(extras)}`;
}

export function buildRegistrationSlotValues(intake: Bag): SlotValues {
  const size = s(intake.organization_size).toLowerCase();
  const jurisdictions = buildJurisdictionProse(intake);
  const dataTypes = buildDataTypesProse(intake);
  return {
    organizationName: s(intake.organization_name) || "the organisation",
    sector: s(intake.industry) || null, // reader label, never case-folded
    orgSize: size ? (REGISTRATION_ORG_SIZE_MAP[size] ?? lowerEnumLabel(s(intake.organization_size))) : null,
    jurisdictions: jurisdictions || null,
    dataTypes: dataTypes || null,
  };
}

// ── Typed-surface readers ───────────────────────────────────────────────────

function deliverables(report: Bag): Bag {
  return (report.registration_deliverables ?? {}) as Bag;
}

function determinations(report: Bag): Bag[] {
  return asArray(deliverables(report).determinations);
}

function schedules(report: Bag): Bag[] {
  return asArray(deliverables(report).schedules);
}

function readiness(report: Bag): Bag[] {
  return asArray(deliverables(report).filing_readiness);
}

function representatives(report: Bag): Bag[] {
  return asArray(deliverables(report).representative_determinations);
}

const stateName = (d: Bag): string => s(d.state_name) || s(d.jurisdiction) || "the jurisdiction";

/** The typed duty counts every lead in this document is bound to. */
export interface RegistrationDutyCounts {
  readonly attached: number;
  readonly satisfied: number;
  readonly open: number;
  readonly broker_states: string[];
  readonly reserved: number;
  /** FD703575-R1 — the attached duties BY NAME, in count order, so every
   *  lead that states a count can name what it counted (the live batch said
   *  "2 registration duties attach" while the body identified only one
   *  concrete filing, leaving the reader to reconcile the arithmetic). */
  readonly attached_names: string[];
}

export function computeDutyCounts(report: Bag): RegistrationDutyCounts {
  const dets = determinations(report);
  const brokerStates: string[] = [];
  const attachedNames: string[] = [];
  let attached = 0;
  let reserved = 0;
  for (const d of dets) {
    const verdict = s(d.verdict);
    if (verdict === "registrable") {
      attached += 1;
      brokerStates.push(stateName(d));
      attachedNames.push(`data-broker registration in ${stateName(d)}`);
    } else if (verdict === "conditional" || verdict === "record_insufficient") {
      reserved += 1;
    }
  }
  for (const r of representatives(report)) {
    const v = s(r.verdict);
    if (v === "engaged") {
      attached += 1;
      attachedNames.push(`the ${s(r.jurisdiction) || "Art. 27"} representative designation`);
    } else if (v === "conditional" || v === "record_insufficient") reserved += 1;
  }
  const dpo = (deliverables(report).dpo_determination ?? {}) as Bag;
  const dpoVerdict = s(dpo.verdict);
  if (dpoVerdict === "engaged") {
    attached += 1;
    attachedNames.push("the designation of a data protection officer");
  } else if (dpoVerdict === "conditional" || dpoVerdict === "record_insufficient") reserved += 1;

  // Satisfied is read from the typed filing-readiness surface only: a duty is
  // satisfied when the jurisdiction's own content list is ready on its face.
  let satisfied = 0;
  for (const f of readiness(report)) {
    if (f.ready_to_file === true) satisfied += 1;
  }
  if (satisfied > attached) satisfied = attached;
  return {
    attached,
    satisfied,
    open: Math.max(attached - satisfied, 0),
    broker_states: brokerStates,
    reserved,
    attached_names: attachedNames,
  };
}

// ── Composed blocks ─────────────────────────────────────────────────────────

/** Executive lead — duties attached vs satisfied, straight from the counts. */
function composeExecLead(counts: RegistrationDutyCounts, org: string): string {
  if (counts.attached === 0) {
    return counts.reserved > 0
      ? stop(
        `On its answers, no registration duty is established for ${org} and ${count(counts.reserved, "determination is", "determinations are")} reserved for want of a fact the intake does not settle`,
      )
      : stop(`On its answers, no registration duty attaches to ${org}, so there is nothing presently to file`);
  }
  // FD703575-R1 — the count names what it counts, so a "2 duties" lead can
  // never leave the reader hunting the body for the second duty.
  const orgAndNames = counts.attached_names.length
    ? `${org} — ${asProse(counts.attached_names)} —`
    : `${org},`;
  return stop(
    `On its answers, ${count(counts.attached, "registration duty attaches", "registration duties attach")} to ${orgAndNames} of which ${counts.satisfied === 0 ? "none is presently satisfied" : `${counts.satisfied} ${counts.satisfied === 1 ? "is" : "are"} presently satisfied`}${counts.reserved > 0 ? `, with ${count(counts.reserved, "further determination", "further determinations")} reserved for want of a fact the intake does not settle` : ""}`,
  );
}

/** Executive body — the filing posture in two to three attributed sentences. */
function composeExecPosture(report: Bag, counts: RegistrationDutyCounts, org: string): string {
  const parts: string[] = [];
  const dets = determinations(report);
  if (dets.length === 0) {
    parts.push(
      stop(`No jurisdiction-level determination was produced for ${org}, so this assessment asserts no filing posture`),
    );
    return repairRegister(parts.join(" "));
  }
  const registrable = dets.filter((d) => s(d.verdict) === "registrable").map(stateName);
  const conditional = dets.filter((d) => s(d.verdict) === "conditional").map(stateName);
  const insufficient = dets.filter((d) => s(d.verdict) === "record_insufficient").map(stateName);
  if (registrable.length) {
    parts.push(stop(`${org} has indicated facts that engage a filing duty in ${asProse(registrable)}`));
  } else {
    parts.push(
      stop(
        `${org} has not indicated facts that engage a filing duty in any of the jurisdictions assessed${insufficient.length || conditional.length ? "" : ""}`,
      ),
    );
  }
  if (counts.satisfied > 0) {
    parts.push(
      stop(
        `${counts.satisfied === 1 ? "One filing" : `${counts.satisfied} filings`} ${counts.satisfied === 1 ? "is" : "are"} ready on the content the company has recorded, and ${counts.open === 0 ? "none remains open" : `${count(counts.open, "remains open", "remain open")}`}`,
      ),
    );
  } else if (counts.attached > 0) {
    parts.push(
      stop(
        `None of those duties is yet satisfied on the content the company has recorded, and each is set out below with what closes it`,
      ),
    );
  }
  if (conditional.length || insufficient.length) {
    const both = [...conditional, ...insufficient];
    parts.push(
      stop(
        `The position in ${asProse(both)} turns on a fact the company has not stated, so ${both.length === 1 ? "that determination is" : "those determinations are"} reserved rather than assumed`,
      ),
    );
  }
  return repairRegister(parts.join(" "));
}

/** Section I lead — broker duties and the states they attach in. */
function composeBrokerLead(report: Bag, intake: Bag, counts: RegistrationDutyCounts, org: string): string {
  if (!isTrue(intake.acts_as_data_broker)) {
    return stop(
      `${org} has indicated that it does not act as a data broker, so no data-broker registration duty attaches on its answers`,
    );
  }
  if (counts.broker_states.length === 0) {
    return stop(
      `${org} has indicated broker activity, but on the facts stated no state's data-broker registration duty is established, and each position is set out below`,
    );
  }
  return stop(
    `${org} has indicated broker activity, and a data-broker registration duty attaches in ${asProse(counts.broker_states)}`,
  );
}

/**
 * Section I conditional. Trigger: `acts_as_data_broker` (CEO binding of
 * 2026-08-10). Content is the live broker cluster, each fact attributed, set
 * beside each state's own verified definitional passage.
 */
function composeBrokerConditional(report: Bag, intake: Bag, org: string): string {
  if (!isTrue(intake.acts_as_data_broker)) {
    return stop(
      `${org} has not recorded broker activity, and no data-broker registration duty attaches on its answers`,
    );
  }
  const facts: string[] = [];
  facts.push(`${org} has indicated that it acts as a data broker`);
  if (isTrue(intake.sells_or_licenses_brokered_data)) {
    facts.push("that it sells or licenses the data it brokers");
  }
  if (isTrue(intake.collects_data_not_directly_from_individuals)) {
    facts.push("that it collects data other than directly from the individuals concerned");
  }
  if (intake.has_direct_relationship_with_data_subjects === false) {
    facts.push("that it has no direct relationship with those individuals");
  }
  const individuals = intake.brokered_data_individual_count;
  if (typeof individuals === "number" && Number.isFinite(individuals)) {
    facts.push(`that the brokered data concerns approximately ${individuals.toLocaleString("en-US")} individuals`);
  }
  const pct = intake.brokered_data_revenue_share_pct;
  if (typeof pct === "number" && Number.isFinite(pct)) {
    facts.push(`that brokered data accounts for approximately ${pct}% of its revenue`);
  }
  const exemption = s(intake.data_broker_exemption_claimed);
  if (exemption && exemption.toLowerCase() !== "none") {
    facts.push(`and that it claims the ${exemption} exclusion`);
  }
  const blocks: string[] = [stop(asProse(facts))];

  for (const d of determinations(report)) {
    const threshold = (d.threshold ?? {}) as Bag;
    const standard = s(threshold.standard);
    if (!standard) continue;
    const bits: string[] = [`${stateName(d)}.`];
    bits.push(`Its own definition provides: "${noStop(standard)}."`);
    const fact = s(threshold.record_fact);
    if (fact) bits.push(stop(noStop(firstSentences(fact, 2))));
    const application = s(threshold.application);
    if (application) bits.push(stop(noStop(firstSentences(application, 2))));
    const exclusion = s(threshold.exclusion_analysis);
    if (exclusion) bits.push(stop(noStop(firstSentence(exclusion))));
    blocks.push(bits.join(" "));
  }

  // FD703575-R2 (2026-08-27, live batch fd703575) — HONEST-POSTURE PARITY
  // for named US-state markets outside the four registered broker registries
  // (the biometric S-B5 pattern). The batch record served Colorado and
  // Virginia; the document addressed only California and was silent on
  // whether the other named states were assessed at all. A named US-state
  // market with no registry in this product's verified corpus now earns an
  // explicit corpus-bounded scope statement instead of silence.
  const REGISTRY_CODES = new Set(["US-CA", "US-OR", "US-TX", "US-VT"]);
  const unregistered = (Array.isArray(intake.markets_served) ? (intake.markets_served as unknown[]) : [])
    .map((m) => String(m))
    .filter((m) => /^US-/.test(m) && !REGISTRY_CODES.has(m))
    .map((m) => REGISTRATION_JURISDICTION_LABELS[m] ?? m);
  if (unregistered.length) {
    blocks.push(stop(
      `The markets served also name ${asProse(unregistered)}. No data-broker registration statute for ${unregistered.length === 1 ? "that state" : "those states"} is among the four state registries in this product's verified corpus, so no registration duty is stated for ${unregistered.length === 1 ? "it" : "them"} here; the entry of any new state registry is a named review trigger in the approval block below`,
    ));
  }
  return repairRegister(blocks.join("\n\n"));
}

/** Section I body — the per-jurisdiction analysis, with registry-only money. */
function composeBrokerAnalysis(report: Bag): string {
  const dets = determinations(report);
  if (dets.length === 0) return "";
  const scheduleFor = new Map<string, Bag>();
  for (const sch of schedules(report)) scheduleFor.set(s(sch.jurisdiction), sch);

  const blocks: string[] = [];
  for (const d of dets) {
    const bits: string[] = [`${stateName(d)}.`];
    const headline = s(d.headline);
    if (headline) bits.push(stop(noStop(headline)));
    const reasoning = s(d.reasoning);
    if (reasoning) bits.push(stop(noStop(firstSentences(reasoning, 3))));
    const requirement = (d.requirement ?? {}) as Bag;
    const reqStandard = s(requirement.standard);
    if (reqStandard) bits.push(`The filing duty is stated as: "${noStop(reqStandard)}."`);
    const filingBody = s(d.filing_body);
    if (filingBody) bits.push(stop(`The filing is made to ${filingBody}`));

    // Fees and deadlines: registry rows only. No date is computed here.
    const sch = scheduleFor.get(s(d.jurisdiction));
    if (sch) {
      const window = s(sch.window_standard);
      const windowCite = s(sch.window_citation);
      if (window) {
        bits.push(`On timing, ${windowCite ? `${windowCite} provides` : "the statute provides"}: "${noStop(window)}."`);
      }
      const fee = s(sch.fee_standard);
      const feeCite = s(sch.fee_citation);
      if (fee) {
        bits.push(`On the fee, ${feeCite ? `${feeCite} provides` : "the statute provides"}: "${noStop(fee)}."`);
      }
    }
    const open = strList(d.open_questions);
    if (open.length) {
      bits.push(stop(`What would settle the remaining question is ${asProse(open.map((q) => noStop(lowerEnumLabel(q))))}`));
    }
    blocks.push(bits.join(" "));
  }
  return repairRegister(blocks.join("\n\n"));
}

/** Section II lead — the EU, UK and AI Act posture in one sentence. */
function composeSupervisoryLead(report: Bag, org: string): string {
  const reps = representatives(report);
  const eu = reps.find((r) => s(r.jurisdiction) === "EU");
  const uk = reps.find((r) => s(r.jurisdiction) === "UK");
  const dpo = (deliverables(report).dpo_determination ?? {}) as Bag;
  const ai = (report.obligations_summary ?? {}) as Bag;

  const engaged: string[] = [];
  const reserved: string[] = [];
  const push = (label: string, verdict: string) => {
    if (verdict === "engaged") engaged.push(label);
    else if (verdict === "conditional" || verdict === "record_insufficient") reserved.push(label);
  };
  push("an EU Article 27 representative", s(eu?.verdict));
  push("a UK Article 27 representative", s(uk?.verdict));
  push("a data protection officer", s(dpo.verdict));
  if (ai.ai_act_obligations_engaged === true) engaged.push("EU AI Act registration duties");

  if (engaged.length === 0 && reserved.length === 0) {
    return stop(`On its answers, ${org} carries no EU, UK or AI Act filing duty of this kind`);
  }
  if (engaged.length === 0) {
    return stop(
      `On its answers, ${org} carries no established EU, UK or AI Act filing duty of this kind, and the position on ${asProse(reserved)} is reserved for want of a fact the intake does not settle`,
    );
  }
  return stop(
    `On its answers, ${org} requires ${asProse(engaged)}${reserved.length ? `, and the position on ${asProse(reserved)} is reserved for want of a fact the intake does not settle` : ""}`,
  );
}

/** Section II body — representatives, DPO and the AI Act determinations. */
function composeSupervisoryAnalysis(report: Bag): string {
  const blocks: string[] = [];
  for (const r of representatives(report)) {
    const bits: string[] = [`${s(r.jurisdiction) === "UK" ? "United Kingdom" : "European Union"} representative.`];
    const standard = s(r.standard);
    if (standard) bits.push(`${s(r.citation) || "The governing article"} provides: "${noStop(standard)}."`);
    const fact = s(r.record_fact);
    if (fact) bits.push(stop(noStop(firstSentences(fact, 2))));
    const application = s(r.application);
    if (application) bits.push(stop(noStop(firstSentences(application, 2))));
    const exemption = s(r.exemption_analysis);
    if (exemption) bits.push(stop(noStop(firstSentences(exemption, 2))));
    const needed = s(r.information_needed);
    if (needed) bits.push(stop(`What is missing is ${noStop(lowerEnumLabel(needed))}`));
    blocks.push(bits.join(" "));
  }

  const combined = s(deliverables(report).combined_representative_callout);
  if (deliverables(report).both_representatives_required === true && combined) {
    blocks.push(stop(noStop(firstSentences(combined, 2))));
  }

  const dpo = (deliverables(report).dpo_determination ?? {}) as Bag;
  if (s(dpo.headline) || asArray(dpo.findings).length) {
    const bits: string[] = ["Data protection officer."];
    if (s(dpo.headline)) bits.push(stop(noStop(s(dpo.headline))));
    if (s(dpo.reasoning)) bits.push(stop(noStop(firstSentences(s(dpo.reasoning), 3))));
    for (const f of asArray(dpo.findings)) {
      const standard = s(f.standard);
      const application = s(f.application);
      if (!standard && !application) continue;
      bits.push(
        `${s(f.citation) || "The branch"}: ${standard ? `"${noStop(standard)}." ` : ""}${application ? stop(noStop(firstSentence(application))) : ""}`.trim(),
      );
    }
    blocks.push(bits.join(" "));
  }

  for (const cp of asArray(deliverables(report).corpus_pending)) {
    const topic = s(cp.topic);
    const note = s(cp.note);
    if (!topic && !note) continue;
    blocks.push(
      stop(
        `${topic || "A further question"}: ${noStop(note) || "the provisions are named but are not in this product's verified corpus, so no determination is asserted"}`,
      ),
    );
  }
  return repairRegister(blocks.join("\n\n"));
}

/** Section III lead — what stands between the answers and complete filings. */
function composeReadinessLead(report: Bag, counts: RegistrationDutyCounts, org: string): string {
  const rows = readiness(report);
  if (rows.length === 0) {
    return stop(
      `No filing-content list applies to ${org} on its answers, so nothing stands between the company and a filing it is not required to make`,
    );
  }
  const open = rows.filter((r) => r.ready_to_file !== true);
  if (open.length === 0) {
    return stop(
      `Nothing on the company's answers stands between ${org} and complete filings: every content item each jurisdiction requires is recorded`,
    );
  }
  const missing = new Set<string>();
  for (const r of open) {
    for (const item of asArray(r.items)) {
      if (item.ready !== true) missing.add(noStop(lowerEnumLabel(s(item.item))));
    }
  }
  const list = [...missing].filter(Boolean).slice(0, 4);
  return stop(
    `What stands between ${org} and complete filings is ${count(open.length, "jurisdiction whose", "jurisdictions whose")} content list is not yet fully recorded${list.length ? `, principally ${asProse(list)}` : ""}`,
  );
}

/**
 * Section III body — each open duty with what closes it, naming the specific
 * responsible party the record supplies (the 428-D named-actor law), then the
 * attestation from the typed block.
 */
function composeReadinessBody(report: Bag, intake: Bag): string {
  const blocks: string[] = [];
  const actor = s(intake.approved_by_name)
    ? `${s(intake.approved_by_name)}${s(intake.approved_by_title) ? `, ${s(intake.approved_by_title)}` : ""}`
    : "";

  for (const r of readiness(report)) {
    const bits: string[] = [`${s(r.jurisdiction) || "The jurisdiction"}.`];
    const standard = s(r.standard);
    if (standard) bits.push(`${s(r.citation) ? `${s(r.citation)} requires` : "The filing must contain"}: "${noStop(standard)}."`);
    const summary = s(r.summary);
    if (summary) bits.push(stop(noStop(firstSentences(summary, 2))));
    const open = asArray(r.items).filter((i) => i.ready !== true);
    if (open.length) {
      const lines = open
        .map((i) => {
          const item = noStop(s(i.item));
          const fact = noStop(s(i.record_fact));
          if (!item) return "";
          return `${item}${fact ? ` - ${lowerEnumLabel(fact)}` : ""}.`;
        })
        .filter(Boolean);
      bits.push(
        stop(
          actor
            ? `What closes ${open.length === 1 ? "it" : "these"} is the content below, which ${actor} is the party the company has named to supply`
            : `What closes ${open.length === 1 ? "it" : "these"} is the content below; the company has not named the party responsible for supplying it`,
        ),
      );
      blocks.push([bits.join(" "), ...lines].join("\n"));
      continue;
    }
    const needed = s(r.information_needed);
    if (needed) bits.push(stop(`What is missing is ${noStop(lowerEnumLabel(needed))}`));
    blocks.push(bits.join(" "));
  }

  const att = (deliverables(report).attestation ?? {}) as Bag;
  if (s(att.statement) || s(att.approved_by_name)) {
    const bits: string[] = [`${s(att.heading) || "Attestation"}.`];
    if (s(att.statement)) bits.push(stop(noStop(s(att.statement))));
    const who = s(att.approved_by_name);
    if (who) {
      bits.push(
        stop(
          `Approved by ${who}${s(att.approved_by_title) ? `, ${s(att.approved_by_title)}` : ""}${s(att.approval_date) ? `, on ${s(att.approval_date)}` : ""}`,
        ),
      );
    }
    if (s(att.next_review_due)) bits.push(stop(`The next review is recorded as due on ${s(att.next_review_due)}`));
    const triggers = strList(att.review_triggers);
    if (triggers.length) {
      bits.push(stop(`An earlier review is required on ${asProse(triggers.map((t) => noStop(lowerEnumLabel(t))))}`));
    }
    if (s(att.information_needed)) {
      bits.push(stop(`What the attestation still needs is ${noStop(lowerEnumLabel(s(att.information_needed)))}`));
    }
    blocks.push(bits.join(" "));
  }
  return repairRegister(blocks.join("\n\n"));
}

// ── Table of Authorities ────────────────────────────────────────────────────

function registrationToa(report: Bag, body: string): string {
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
    const group = cls === "regulation" || /GDPR|Reg\. \(EU\)/i.test(citation)
      ? "Regulations"
      : cls === "statute" || /ILCS|RCW|Code §|U\.S\.C\.|Stat\.|Civ\. Code/i.test(citation)
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

export interface RegistrationSkeletonResult {
  readonly document: RenderedSkeletonDocument;
  readonly conformance: ReturnType<typeof verifySkeletonConformance>;
  readonly register_findings: string[];
  readonly lead_coherence: string[];
  readonly duty_counts: RegistrationDutyCounts;
}

/**
 * COHERENCE ASSERT — a lead may not disagree with its typed determination.
 * The executive lead must state the attached count the typed surfaces carry;
 * the broker lead must not claim a duty the determinations do not support.
 */
function checkLeadCoherence(
  execLead: string,
  brokerLead: string,
  counts: RegistrationDutyCounts,
  intake: Bag,
): string[] {
  const findings: string[] = [];
  if (counts.attached === 0 && /\bduty attaches\b|\bduties attach\b/.test(execLead) && !/no registration duty/.test(execLead)) {
    findings.push("executive lead asserts attachment where the typed determinations carry none");
  }
  if (counts.attached > 0 && /no registration duty attaches/.test(execLead)) {
    findings.push("executive lead denies attachment where the typed determinations carry one");
  }
  if (!isTrue(intake.acts_as_data_broker) && /duty attaches in /.test(brokerLead)) {
    findings.push("broker lead asserts a broker duty where no broker activity is recorded");
  }
  if (counts.broker_states.length === 0 && /duty attaches in /.test(brokerLead)) {
    findings.push("broker lead names states the typed determinations do not carry");
  }
  return findings;
}

export function assembleRegistrationSkeletonDocument(
  report: Bag,
  intakeInput: Bag,
): RegistrationSkeletonResult {
  const intake = intakeInput ?? {};
  const values = buildRegistrationSlotValues(intake);
  const org = s(intake.organization_name) || "the organisation";
  const counts = computeDutyCounts(report);

  const execLead = composeExecLead(counts, org);
  const brokerLead = composeBrokerLead(report, intake, counts, org);

  const composed: ComposedBlocks = {
    "executive_summary:0": execLead,
    // BYTE-PINNED corpus-only framing sentence, printed verbatim, marker removed.
    "executive_summary:2": REGISTRATION_CORPUS_FRAMING_NOTE,
    "executive_summary:3": composeExecPosture(report, counts, org),

    "data_broker_registration:0": brokerLead,
    "data_broker_registration:1": composeBrokerConditional(report, intake, org),
    "data_broker_registration:2": composeBrokerAnalysis(report),

    "supervisory_and_ai_act:0": composeSupervisoryLead(report, org),
    "supervisory_and_ai_act:1": composeSupervisoryAnalysis(report),

    "filing_readiness:0": composeReadinessLead(report, counts, org),
    "filing_readiness:1": composeReadinessBody(report, intake),
  };

  const draft = renderSkeletonDocument({
    sections: REGISTRATION_SKELETON_SECTIONS,
    title: REGISTRATION_SKELETON_TITLE,
    subtitle: REGISTRATION_SKELETON_SUBTITLE,
    spineVersion: REGISTRATION_SKELETON_VERSION,
    values,
    composed,
  });

  const toa = registrationToa(report, skeletonDocumentToText(draft));

  const document = renderSkeletonDocument({
    sections: REGISTRATION_SKELETON_SECTIONS,
    title: REGISTRATION_SKELETON_TITLE,
    subtitle: REGISTRATION_SKELETON_SUBTITLE,
    spineVersion: REGISTRATION_SKELETON_VERSION,
    values,
    composed: { ...composed, "table_of_authorities:0": toa },
  });

  const body = skeletonDocumentToText(document).toLowerCase();
  const register_findings = REGISTRATION_V3_BANNED_REGISTER.filter((b) => body.includes(b));

  return {
    document,
    conformance: verifySkeletonConformance(document, REGISTRATION_SKELETON_SECTIONS),
    register_findings,
    lead_coherence: checkLeadCoherence(execLead, brokerLead, counts, intake),
    duty_counts: counts,
  };
}
