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
// DOC 163 (2026-09-03) — the reader label for a claimed exclusion family.
import { exemptionLabel } from "./registration-deliverables/build.ts";
import {
  renderSkeletonDocument,
  skeletonDocumentToText,
  verifySkeletonConformance,
  type ComposedBlocks,
  type RenderedSkeletonDocument,
  type RenderedTable,
  type SkeletonTables,
  type SlotValues,
} from "../../../_shared/prose/skeleton-render.ts";
import { repairRegister } from "../../../_shared/ltp/risk-skeleton-assemble.ts";
// A-TEAM S3 RULING I.23 (doc 115) — customer-facing dates in long form.
import { formatReportDateLong } from "../../../_shared/report-dates.ts";
// DOC 176 (2026-09-04) — Syllabus & Record (doc 151); Registration is the
// seventh product migrated onto the fleet presentation system.
import { dispositionTone, type SyllabusProjection } from "../../../_shared/prose/syllabus.ts";
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

// DOC 138 (2026-09-02) — three of the `attached_names` pushers embed their
// OWN leading "the" in the name string itself (icoFeeDutyName: "the United
// Kingdom ICO annual data-protection fee (…)"; the Art. 27 representative
// designation pusher: "the ${jurisdiction} representative designation"; the
// DPO pusher: "the designation of a data protection officer"). Every
// sentence template that names the sole/first attached duty by prepending a
// hardcoded article ("The "/"the ") to `asProse(attached_names)` doubles that
// article whenever the FIRST name in the (possibly multi-item) joined list is
// one of these self-prefixed strings — asProse only joins the names with
// commas/"and", it never inspects or rewrites their text, so the doubling
// shows up both when the self-prefixed name is the SOLE attached duty ("The
// the United Kingdom ICO annual data-protection fee (£3,763.00) duty…") and
// when it is merely the FIRST of several ("None of the the Germany
// representative designation and the designation of a data protection
// officer duties…"). Fix at the template level: inspect the START of the
// JOINED string (not each individual name) for an existing leading "the ",
// and reuse that word — recased to whatever the template needs — instead of
// prepending a second one.
function leadNames(names: readonly string[], capitalizeArticle: boolean): string {
  const joined = asProse(names);
  if (/^the\s+/i.test(joined)) {
    return capitalizeArticle ? joined.charAt(0).toUpperCase() + joined.slice(1) : joined;
  }
  return capitalizeArticle ? `The ${joined}` : `the ${joined}`;
}

const noStop = (t: string): string => t.replace(/\s*\.\s*$/, "");
const stop = (t: string): string => (t ? (/[.!?]$/.test(t) ? t : `${t}.`) : "");
// PANEL QUOTE-HYGIENE (2026-08-30) — statutory verbatim quotes often end with
// the subparagraph's own ";" or ","; rendering them via noStop (which strips
// only ".") produced the ";." artifact flagged across the fleet review.
// Quoted standards drop ANY trailing punctuation before the closing
// quote-period.
const quoteEnd = (t: string): string => t.replace(/\s*[;:,.]+\s*$/, "");
const isTrue = (v: unknown): boolean => v === true || s(v).toLowerCase() === "true";

// BATCH 18b (Wave C1, welded-blocks class): repairRegister collapses runs of
// whitespace, welding "\n"/"\n\n" seams INSIDE a block (heading chunks, quote
// chunks, item lines). Repair per line so paragraph and line structure
// survive (mirrors cyber/biometric/IR).
const repairPreserving = (t: string): string => t.split("\n").map((l) => repairRegister(l)).join("\n");

// DOC 163 — counts under ten as words in prose (doc 155 §5); table cells keep numerals.
const NUM_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const numWord = (n: number): string => NUM_WORDS[n] ?? String(n);
const count = (n: number, one: string, many: string): string =>
  n === 1 ? `one ${one}` : `${numWord(n)} ${many}`;

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

// D1D2B3B8-R1 (2026-08-28, flagged HIGH) — the recorded HEADCOUNT wins over a
// size-band label that contradicts it. The live batch rendered "medium
// (50–249 employees)" against employee_count 310: the band parenthetical is a
// reader aid, and an aid that contradicts the record's own number is a false
// business fact. Where the recorded count falls outside the recorded band,
// the slot carries the count (the primary fact); where they agree, or no
// count is recorded, the band label renders as before.
const ORG_SIZE_BOUNDS: Record<string, [number, number]> = {
  micro: [1, 9],
  small: [10, 49],
  medium: [50, 249],
  large: [250, 999],
  enterprise: [1000, Infinity],
};

export function buildRegistrationSlotValues(intake: Bag): SlotValues {
  const size = s(intake.organization_size).toLowerCase();
  const jurisdictions = buildJurisdictionProse(intake);
  const dataTypes = buildDataTypesProse(intake);
  const headcount = typeof intake.employee_count === "number" && Number.isFinite(intake.employee_count)
    ? intake.employee_count as number
    : /^\d+$/.test(s(intake.employee_count))
    ? Number(s(intake.employee_count))
    : null;
  const bounds = ORG_SIZE_BOUNDS[size];
  const countOutOfBand = headcount !== null && bounds !== undefined &&
    (headcount < bounds[0] || headcount > bounds[1]);
  return {
    organizationName: s(intake.organization_name) || "the organisation",
    sector: s(intake.industry) || null, // reader label, never case-folded
    orgSize: countOutOfBand
      ? `${headcount} employees`
      : size
      ? (REGISTRATION_ORG_SIZE_MAP[size] ?? lowerEnumLabel(s(intake.organization_size)))
      : headcount !== null
      ? `${headcount} employees`
      : null,
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

// DOC 137 (2026-09-02) — the UK ICO annual data-protection fee is a fourth
// duty surface, distinct from the three `registration_deliverables` arrays
// (`determinations`, `representative_determinations`, `dpo_determination`)
// this file otherwise reads. `resolveIcoFeeTier` (index.ts) and Rule R4
// (_local/registration-engine.ts) compute and tag it on the TOP-LEVEL
// `report.jurisdictions[]` array — not on `registration_deliverables` — by
// pushing the obligation string "ico_fee" onto that jurisdiction's
// `obligations` array and setting `filing_fee_cents`/`notes`. computeDutyCounts()
// never read that surface, so a live UK record with a fully-resolved,
// mandatory £3,763 Tier-3 fee still rendered "No filing is required" (the
// exec lead and Section III lead below are driven purely off these counts).
// Read the "ico_fee" TAG rather than hardcoding jurisdiction code "UK" —
// Rule R4 only ever fires for UK today (the ICO is the UK's regulator, so
// R4 is intentionally UK-scoped, not a general "any jurisdiction with a
// fee" rule), but keying off the tag keeps this branch in lockstep with
// R4's own scope instead of duplicating it.
function icoFeeJurisdictions(report: Bag): Bag[] {
  const juris = Array.isArray(report.jurisdictions) ? (report.jurisdictions as Bag[]) : [];
  return juris.filter((j) => Array.isArray(j.obligations) && (j.obligations as unknown[]).includes("ico_fee"));
}

function icoFeeAmountLabel(j: Bag): string | null {
  const cents = j.filing_fee_cents;
  if (typeof cents !== "number" || !Number.isFinite(cents)) return null;
  return `£${(cents / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function icoFeeDutyName(j: Bag): string {
  const name = s(j.name) || s(j.code) || "the United Kingdom";
  // DOC 163 R12 — an unresolved tier names its range, never a single amount.
  const amount = icoFeeAmountLabel(j) ?? (s(j.fee_range_label) || null);
  return amount ? `the ${name} ICO annual data-protection fee (${amount})` : `the ${name} ICO annual data-protection fee`;
}

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
  /** 3E9AD759-R1 — the duty split behind the satisfied/unsatisfied claim.
   *  Satisfaction is only MEASURABLE for filing duties (the typed
   *  filing-readiness surface); a designation duty (Art. 27 representative,
   *  DPO) has no intake fact recording whether it is already met, so "none
   *  is presently satisfied" over-asserted for those (batch 3e9ad759,
   *  flagged HIGH as an unsupported business claim). */
  readonly filing_attached: number;
  readonly designation_attached: number;
  /** D1D2B3B8-R4 (2026-08-28, flagged HIGH) — duty questions the body flags
   *  but defers as not yet assessable (corpus pending, e.g. the EU AI Act
   *  registration duties). The live batch's lead said "one registration duty
   *  attaches" while its own body flagged a further duty as potentially
   *  applicable; the lead must carry that count or it understates the
   *  position. */
  readonly corpus_pending: number;
  /** DOC 137 (2026-09-02) — the count of UK ICO annual data-protection fee
   *  duties folded into `attached` above (see icoFeeJurisdictions). Always
   *  0 or 1 today because Rule R4 only ever tags the UK jurisdiction. */
  readonly ico_fee_attached: number;
  /** DOC 163 R10 — the EU AI Act Art. 49(1) registration, counted as attached
   *  where the Company states it provides the system. */
  readonly ai_act_attached: number;
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
  // A-TEAM DELTA (ChatGPT post-implementation review, 2026-08-31,
  // Registration P0-1) — S1.1 (doc 119) gave the German BDSG §38 conditional
  // its own row in the executive Duty-status table (deriveExecTable below,
  // gated on the same obligations_summary.dpo_condition signal), but this
  // counter never counted it: the GDPR/UK-GDPR global dpo_determination
  // above is a SEPARATE verdict from the per-jurisdiction BDSG question, so
  // a resolved GDPR DPO verdict (not_required) alongside an open BDSG
  // question produced reserved=1 while the table rendered two open rows
  // (live batch 6068cc0a: cover/exec/§3 all said "one determination," the
  // table and Authorities Cited section carried two).
  // DOC 163 R8 — the typed BDSG § 38(1) determination is counted like the
  // other surfaces; the engine-text regex survives only for records
  // persisted before the typed surface existed.
  const bdsgForCounts = (deliverables(report).bdsg_determination ?? null) as Bag | null;
  if (bdsgForCounts && s(bdsgForCounts.verdict)) {
    const v = s(bdsgForCounts.verdict);
    if (v === "engaged") {
      attached += 1;
      attachedNames.push("the designation of a data protection officer under BDSG § 38(1) (Germany)");
    } else if (v === "conditional" || v === "record_insufficient") reserved += 1;
  } else {
    const osumForCounts = (report.obligations_summary ?? {}) as Bag;
    if (/BDSG/i.test(s(osumForCounts.dpo_condition))) reserved += 1;
  }
  // DOC 163 R10 — the Art. 49 determination is counted: engaged attaches,
  // conditional reserves (it was never counted, so the lead understated).
  let aiActAttached = 0;
  const aiForCounts = (deliverables(report).ai_act_registration ?? null) as Bag | null;
  if (aiForCounts && s(aiForCounts.verdict) === "engaged") {
    attached += 1;
    aiActAttached += 1;
    attachedNames.push("the EU AI Act Article 49(1) registration of the high-risk system");
  } else if (aiForCounts && s(aiForCounts.verdict) === "conditional") reserved += 1;

  // DOC 137 (2026-09-02) — fourth branch: the ICO fee obligation (see
  // icoFeeJurisdictions above). Unconditional once Rule R4 tags it — the
  // engine records no "conditional"/"record_insufficient" state for this
  // duty, so it only ever attaches, never reserves.
  let icoFeeAttached = 0;
  for (const j of icoFeeJurisdictions(report)) {
    attached += 1;
    icoFeeAttached += 1;
    attachedNames.push(icoFeeDutyName(j));
  }

  // Satisfied is read from the typed filing-readiness surface only: a duty is
  // satisfied when the jurisdiction's own content list is ready on its face.
  let satisfied = 0;
  for (const f of readiness(report)) {
    if (f.ready_to_file === true) satisfied += 1;
  }
  if (satisfied > attached) satisfied = attached;
  const filingAttached = brokerStates.length;
  return {
    attached,
    satisfied,
    open: Math.max(attached - satisfied, 0),
    broker_states: brokerStates,
    reserved,
    attached_names: attachedNames,
    filing_attached: filingAttached,
    // DOC 163 — a fee and a database registration are neither filings nor
    // designations; each carries its own satisfaction clause in the lead.
    designation_attached: Math.max(attached - filingAttached - icoFeeAttached - aiActAttached, 0),
    corpus_pending: asArray(deliverables(report).corpus_pending).length,
    ico_fee_attached: icoFeeAttached,
    ai_act_attached: aiActAttached,
  };
}

// ── Tables (BATCH 18b, Wave C1 — doc 113 S2.12/S2.14/S2.16/S2.17) ──────────
// The tables this product exists for. NO-PADDING LAW: no rows, no table.

/** Reader name for a readiness/schedule jurisdiction code: the typed
 *  determination's own state_name first, then the slotmap label, then the
 *  code itself (doc 113 S2.17 — no "US-CA." customer-facing codes). */
function stateLabelFor(report: Bag, code: string): string {
  const det = determinations(report).find((d) => s(d.jurisdiction) === code);
  if (det && s(det.state_name)) return s(det.state_name);
  return REGISTRATION_JURISDICTION_LABELS[code] ?? code;
}

// Doc 109 §C Filing Calendar (lines 1499–1504) — the panel's own drafted
// deadline/cycle digests, ratified via doc 111; fixed per-registry constants.
// The verbatim statutory window still prints once, quoted, in the per-state
// analysis with its citation (doc 113 S2.13).
const REGISTRY_CYCLE_DIGEST: Record<string, string> = {
  "US-CA": "On or before Jan 31 following each qualifying year",
  "US-OR": "Before collecting or selling in-state; valid to Dec 31 of the approval year",
  "US-TX": "Before conducting business; the certificate expires on the first anniversary of issuance",
  "US-VT": "Annually, on or before Jan 31",
};

function deriveFilingCalendarTable(report: Bag): RenderedTable | null {
  const dets = determinations(report);
  if (!dets.length) return null;
  const scheduleFor = new Map<string, Bag>();
  for (const sch of schedules(report)) scheduleFor.set(s(sch.jurisdiction), sch);
  const readinessFor = new Map<string, Bag>();
  for (const f of readiness(report)) readinessFor.set(s(f.jurisdiction), f);

  const rows: string[][] = [];
  for (const d of dets) {
    const code = s(d.jurisdiction);
    const sch = scheduleFor.get(code);
    const requirement = (d.requirement ?? {}) as Bag;
    const citations = [s(requirement.citation), s(sch?.window_citation), s(sch?.fee_citation)]
      .filter(Boolean)
      .filter((c, i, all) => all.indexOf(c) === i)
      .join("; ");
    const fee = s(sch?.fee_stated_amount) ||
      (sch && s(sch.fee_standard) ? "Set by the administering body" : "—");
    const verdict = s(d.verdict);
    let status: string;
    if (verdict === "registrable") {
      const f = readinessFor.get(code);
      if (f && f.ready_to_file === true) status = "Ready on its face";
      else if (f) {
        // Cells carry numerals (data column, panel row style): "Open — 2
        // content elements outstanding".
        const open = asArray(f.items).filter((i) => i.ready !== true).length;
        status = open > 0 ? `Open — ${open} content ${open === 1 ? "element" : "elements"} outstanding` : "Open";
      } else status = "Open";
    } else if (verdict === "not_registrable") {
      status = "No duty on the company's answers";
    } else if (verdict === "conditional") {
      status = "Turns on the claimed exclusion";
    } else {
      status = "Additional information required";
    }
    const fileWith = s(d.filing_body).replace(/^the\s+/i, "");
    rows.push([
      stateName(d),
      fileWith ? fileWith.charAt(0).toUpperCase() + fileWith.slice(1) : "—",
      REGISTRY_CYCLE_DIGEST[code] ?? "As the statute provides",
      fee,
      citations || "—",
      status,
    ]);
  }
  if (!rows.length) return null;
  return {
    key: "",
    surface: "registration_deliverables.determinations+schedules+filing_readiness",
    title: "Filing calendar",
    columns: ["State", "File with", "Deadline / cycle", "Fee", "Authority", "Status"],
    rows,
    note: "Deadlines and fees are stated from the registry rows; the operative filing date for this organisation is fixed by counsel.",
  };
}

function deriveLimbWalkTable(report: Bag): RenderedTable | null {
  const rows: string[][] = [];
  for (const d of determinations(report)) {
    const threshold = (d.threshold ?? {}) as Bag;
    for (const l of asArray(threshold.limbs)) {
      const limb = s(l.limb);
      if (!limb) continue;
      const met = l.met === true ? "Met" : l.met === false ? "Not met" : "Not recorded";
      rows.push([stateName(d), limb, s(l.record_fact) || "—", met]);
    }
  }
  if (!rows.length) return null;
  return {
    key: "",
    surface: "registration_deliverables.determinations[].threshold.limbs",
    title: "Definitional limbs",
    columns: ["State", "Limb", "Record", "Met?"],
    rows,
    note: "Each state's limbs are its own statute's; the sets deliberately differ.",
  };
}

function deriveArt37BranchTable(report: Bag): RenderedTable | null {
  const dpo = (deliverables(report).dpo_determination ?? {}) as Bag;
  const rows: string[][] = [];
  for (const f of asArray(dpo.findings)) {
    const citation = s(f.citation);
    const application = s(f.application);
    if (!citation || !application) continue;
    rows.push([citation, stop(noStop(firstSentence(application)))]);
  }
  // One-row rule (doc 109 §1.4): a single branch stays in the prose.
  if (rows.length < 2) return null;
  return {
    key: "",
    surface: "registration_deliverables.dpo_determination.findings",
    title: "Article 37(1) branches",
    columns: ["Branch", "Position on the record"],
    rows,
  };
}

function deriveReadinessChecklistTable(report: Bag): RenderedTable | null {
  const rows: string[][] = [];
  for (const r of readiness(report)) {
    const label = stateLabelFor(report, s(r.jurisdiction));
    for (const i of asArray(r.items)) {
      const item = noStop(s(i.item));
      if (!item) continue;
      rows.push([label, item, i.ready === true ? "Yes" : "No — outstanding"]);
    }
  }
  if (!rows.length) return null;
  return {
    key: "",
    surface: "registration_deliverables.filing_readiness[].items",
    title: "Filing content checklist",
    columns: ["Jurisdiction", "Required element", "Recorded?"],
    rows,
  };
}

// BATCH 19a (Wave C3, doc 113 S3.3) — the Executive Summary duty-status
// table: Duty | Jurisdiction | Status | What closes it, one row per typed
// determination across all four surfaces. Status maps typed verdicts only.
// A-TEAM S4 RULING S2.17 (doc 119, 2026-08-31) — fleet status vocabulary:
// "Does not attach" and "Reserved" read as engine dialect; statuses now
// state the customer-facing conclusion.
function dutyStatusWord(verdict: string): string {
  switch (verdict) {
    case "registrable":
    case "engaged":
      return "Required on reported facts";
    case "not_registrable":
    case "not_engaged":
      return "Not required on reported facts";
    case "conditional":
      return "Turns on the claimed exclusion";
    case "record_insufficient":
      return "Additional information required";
    default:
      return "";
  }
}

// Presentation-only trim of the typed closing chapeau for a table cell.
function closesCell(text: string): string {
  const t = noStop(s(text));
  if (!t) return "—";
  const m = /^What (?:would complete the determination|closes the duty) is\s+(.+)$/i.exec(t);
  const out = m ? m[1] : t;
  return out.charAt(0).toUpperCase() + out.slice(1);
}

export function deriveDutyStatusTable(report: Bag): RenderedTable | null {
  const rows: string[][] = [];
  const readinessFor = new Map<string, Bag>();
  for (const f of readiness(report)) readinessFor.set(s(f.jurisdiction), f);

  for (const d of determinations(report)) {
    const verdict = s(d.verdict);
    const status = dutyStatusWord(verdict) || "Additional information required";
    let closes = "—";
    if (verdict === "registrable") {
      const f = readinessFor.get(s(d.jurisdiction));
      const open = f ? asArray(f.items).filter((i) => i.ready !== true).length : 0;
      closes = f && f.ready_to_file === true
        ? "Ready to file on its face"
        : open > 0
        // Batch b83ea3c4 (2026-09-05): the document numbers its sections
        // 1–3 (Filing Readiness is Section 3); "Section III" was a remnant.
        ? `${open} content ${open === 1 ? "element" : "elements"} — see Section 3`
        : "Filing content — see Section 3";
    } else if (verdict === "conditional") {
      closes = "Substantiate the claimed exclusion";
    } else if (verdict === "record_insufficient") {
      const openLimbs = asArray(((d.threshold ?? {}) as Bag).limbs).filter((l) => l.met === null).length;
      closes = openLimbs > 0
        ? `Evidence on ${openLimbs} definitional ${openLimbs === 1 ? "limb" : "limbs"}`
        : "Required information not provided";
    }
    rows.push(["Data-broker registration", stateName(d), status, closes]);
  }

  for (const r of representatives(report)) {
    const verdict = s(r.verdict);
    const word = dutyStatusWord(verdict === "conditional" ? "record_insufficient" : verdict);
    if (!word) continue;
    const jur = s(r.jurisdiction) === "UK" ? "United Kingdom" : "European Union";
    // A-TEAM S4 RULING S2.17a (doc 119) — an open determination names the
    // deciding fact in the Information-required cell, never a dash.
    const repFallback = s(r.jurisdiction) === "UK"
      ? "Whether the UK processing is \"occasional\" for the Art. 27(2)(a) exemption"
      : "The establishment and market facts the Art. 27 determination turns on";
    const closes = verdict === "engaged"
      ? "Written designation of the representative"
      : verdict === "not_engaged"
      ? "—"
      : closesCell(s(r.information_needed)) === "—"
      ? repFallback
      : closesCell(s(r.information_needed));
    rows.push([`Article 27 representative`, jur, word, closes]);
  }

  const dpo = (deliverables(report).dpo_determination ?? {}) as Bag;
  const dpoVerdict = s(dpo.verdict);
  if (dpoVerdict) {
    const word = dutyStatusWord(dpoVerdict === "conditional" ? "record_insufficient" : dpoVerdict);
    if (word) {
      rows.push([
        "Data protection officer",
        // QA batch 2026-09-05 — this cell hardcoded "GDPR / UK GDPR" for
        // every record, but buildDpo() gates the Art. 37(1) branch walk to
        // whichever ONE regime actually reaches the organisation
        // (dpoRegimeLabel) and the body only ever analyses that one regime's
        // Art. 37(1)(a)-(c) — a UK-only record's body carried nothing but
        // "UK GDPR Art. 37(1)" while this row still named both regimes.
        s(dpo.regime) || "GDPR / UK GDPR",
        word,
        dpoVerdict === "engaged"
          ? "Written designation and the Art. 37(7) steps"
          : dpoVerdict === "not_engaged"
          ? "—"
          : closesCell(s(dpo.closing_act) || s(dpo.information_needed)),
      ]);
    }
  }

  // A-TEAM S4 RULING S1.1 (doc 119) — when the record carries the German
  // BDSG §38 conditional (obligations_summary.dpo_condition), the open
  // national-law question gets its own row; previously it contradicted the
  // GDPR row silently.
  // DOC 163 R8 — the typed BDSG determination drives the row; the engine-text
  // regex survives for records persisted before the typed surface existed.
  const bdsgRow = (deliverables(report).bdsg_determination ?? null) as Bag | null;
  if (bdsgRow && s(bdsgRow.verdict)) {
    const v = s(bdsgRow.verdict);
    const word = dutyStatusWord(v === "conditional" ? "record_insufficient" : v);
    if (word) {
      rows.push([
        "Data protection officer — BDSG § 38(1) (Germany)",
        "Germany",
        word,
        v === "engaged"
          ? "Written designation of the officer"
          : v === "not_engaged"
          ? "—"
          : closesCell(s(bdsgRow.information_needed)),
      ]);
    }
  } else {
    const osum = (report.obligations_summary ?? {}) as Bag;
    if (/BDSG/i.test(s(osum.dpo_condition))) {
      rows.push([
        "Data protection officer — BDSG §38 (Germany)",
        "Germany",
        "Additional information required",
        "How many persons are constantly engaged in automated processing (the §38 threshold counts engaged persons, not total headcount)",
      ]);
    }
  }

  // DOC 137 (2026-09-02) — the ICO fee obligation earns its own Duty-status
  // row, same as the BDSG §38 row above: it is tagged on the top-level
  // `report.jurisdictions[]` surface (Rule R4), not on any of the three
  // `registration_deliverables` arrays this table otherwise reads, and had
  // no row at all before this fix.
  for (const j of icoFeeJurisdictions(report)) {
    // QA batch 2026-09-05 — a resolved-but-boundary tier (e.g. FX-estimated
    // turnover a few thousand pounds either side of a threshold) rendered
    // the SAME confident "£78.00 — confirm the tier" text as a record with
    // no boundary risk at all; the reader had no way to tell the two apart
    // from this cell. The full basis (what was converted, at what rate, and
    // why the tier is or isn't robust to that conversion) is in Section 3.
    const boundary = j.ico_fee_boundary === true;
    rows.push([
      "ICO annual data-protection fee",
      s(j.name) || s(j.code) || "United Kingdom",
      "Required on reported facts",
      icoFeeAmountLabel(j)
        ? `Payment of ${icoFeeAmountLabel(j)} to the ICO — confirm the tier via the ICO fee self-assessment before filing${boundary ? " (the recorded figures sit close to a tier threshold — see Section 3)" : ""}`
        : s(j.fee_tier_ask) || "Confirm the fee tier via the ICO fee self-assessment",
    ]);
  }

  const aiAct = (deliverables(report).ai_act_registration ?? {}) as Bag;
  const aiVerdict = s(aiAct.verdict);
  if (aiVerdict) {
    const word = aiVerdict === "conditional" ? "Additional information required" : dutyStatusWord(aiVerdict);
    if (word) {
      rows.push([
        "EU AI Act registration",
        "European Union",
        word,
        aiVerdict === "not_engaged" ? "—" : closesCell(s(aiAct.closing_act)),
      ]);
    }
  }

  if (!rows.length) return null;
  return {
    key: "",
    surface: "determinations+representative_determinations+dpo_determination+ai_act_registration",
    title: "Duty status",
    columns: ["Duty", "Jurisdiction", "Status", "Information required"],
    rows,
  };
}

// ── Composed blocks ─────────────────────────────────────────────────────────

/** Executive lead — duties attached vs satisfied, straight from the counts. */
function composeExecLead(counts: RegistrationDutyCounts, org: string): string {
  // D1D2B3B8-R4 — a lead that counts duties also counts the questions the
  // body defers: "one registration duty attaches" over a body that flags the
  // EU AI Act duties as potentially applicable understated the position.
  const pendingClause = counts.corpus_pending > 0
    ? `, and ${count(counts.corpus_pending, "further duty question is", "further duty questions are")} flagged below but not yet assessable against the authorities relied on in this assessment`
    : "";
  if (counts.attached === 0) {
    return counts.reserved > 0
      ? stop(
        `Based on the information supplied, no registration duty is established for ${org}, and ${count(counts.reserved, "determination remains", "determinations remain")} open because required information was not provided${pendingClause}`,
      )
      : stop(`Based on the information supplied, no registration duty attaches to ${org}, so there is nothing presently to file${pendingClause}`);
  }
  // FD703575-R1 — the count names what it counts, so a "2 duties" lead can
  // never leave the reader hunting the body for the second duty.
  // 3E9AD759-R1 — the satisfaction clause claims only what the intake can
  // show: filing duties are measured against the typed filing-readiness
  // surface; a designation duty has no intake fact recording whether it is
  // already met, so the lead says that rather than asserting "not satisfied".
  const orgAndNames = counts.attached_names.length
    ? `${org} — ${asProse(counts.attached_names)} —`
    : `${org},`;
  const satisfactionBits: string[] = [];
  if (counts.filing_attached > 0) {
    satisfactionBits.push(
      counts.satisfied === 0
        ? (counts.filing_attached === counts.attached
          ? "none is presently satisfied"
          : counts.filing_attached === 1
          ? "the filing duty is not presently satisfied"
          : `none of the ${count(counts.filing_attached, "filing duty", "filing duties")} is presently satisfied`)
        : counts.satisfied === counts.filing_attached
        ? (counts.filing_attached === 1 ? "the filing duty is presently satisfied" : `all ${numWord(counts.filing_attached)} filing duties are presently satisfied`)
        : `${numWord(counts.satisfied)} of the ${count(counts.filing_attached, "filing duty", "filing duties")} ${counts.satisfied === 1 ? "is" : "are"} presently satisfied`,
    );
  }
  // DOC 163 — the duties no intake fact can show as met, in one clause.
  const unknownBits: string[] = [];
  if (counts.designation_attached > 0) {
    unknownBits.push(`whether the ${counts.designation_attached === 1 ? "designation duty is" : "designation duties are"} already met`);
  }
  if (counts.ai_act_attached > 0) unknownBits.push("whether the EU database registration has been made");
  if (counts.ico_fee_attached > 0) unknownBits.push("whether the fee has been paid");
  if (unknownBits.length) {
    satisfactionBits.push(`${asProse(unknownBits)} ${unknownBits.length === 1 ? "is" : "are"} not recorded in the information supplied`);
  }
  const satisfaction = satisfactionBits.join(", and ");
  // "of which …" reads only off a measurable filing clause; a
  // designation-only lead takes a plain semicolon instead.
  const satisfactionClause = !satisfaction
    ? "as set out below"
    : counts.filing_attached > 0
    ? `of which ${satisfaction}`
    : `and ${satisfaction}`;
  return stop(
    `Based on the information supplied, ${count(counts.attached, "registration duty attaches", "registration duties attach")} to ${orgAndNames} ${satisfactionClause}${counts.reserved > 0 ? `, with ${count(counts.reserved, "further determination", "further determinations")} remaining open because required information was not provided` : ""}${pendingClause}`,
  );
}

/** Executive body — the filing posture in two to three attributed sentences. */
function composeExecPosture(report: Bag, counts: RegistrationDutyCounts, org: string): string {
  const parts: string[] = [];
  const dets = determinations(report);
  const registrable = dets.filter((d) => s(d.verdict) === "registrable").map(stateName);
  const conditional = dets.filter((d) => s(d.verdict) === "conditional").map(stateName);
  const insufficient = dets.filter((d) => s(d.verdict) === "record_insufficient").map(stateName);
  // E8973164 (2026-08-28, flagged MEDIUM/boilerplate) — `dets` is the US
  // state data-broker determination array only. A record with no US broker
  // exposure but a live EU/UK representative or DPO determination (which
  // `counts` already folds in) used to get the flat fallback "No
  // jurisdiction-level determination was produced ... so this assessment
  // asserts no filing posture" — directly contradicted by the body's own
  // supervisory_and_ai_act section. `dets.length === 0` now speaks only to
  // the US state-broker surface; the sentences below (driven by `counts`,
  // which spans all three determination surfaces) still carry the real
  // overall posture.
  if (dets.length === 0) {
    parts.push(
      stop(`${org} has not indicated any US state data-broker registration duty on its answers`),
    );
  } else if (registrable.length) {
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
    // A-TEAM DELTA (ChatGPT Dropbox Batch 1 review, 2026-08-31, Registration
    // P0) — "those duties" pronoun-referenced back to whichever duty the
    // PRECEDING sentence just named. When that preceding sentence was the
    // `dets.length === 0` no-US-data-broker-duty branch (data-broker and
    // designation are separate arrays — `counts.attached` spans both), the
    // combined text read as "no data-broker duty is established... None of
    // those [data-broker] duties is yet satisfied" — asserting the very duty
    // the record says doesn't exist is somehow unsatisfied. Naming the
    // actually-attached duty by `attached_names` removes the ambiguous
    // pronoun regardless of which sentence precedes it.
    parts.push(
      stop(
        counts.attached === 1
          // DOC 138 (2026-09-02) — was a hardcoded "The ${asProse(...)}",
          // which doubled the article when the sole attached name already
          // opened with its own "the" (icoFeeDutyName, the Art. 27
          // representative designation, the DPO designation). leadNames
          // inspects the joined string once and reuses its own "the" instead
          // of stacking a second one.
          ? `${leadNames(counts.attached_names, true)} duty is not yet satisfied on the content the company has recorded, and it is set out below with what closes it`
          // Same doubling risk applies positionally here: asProse can put a
          // self-prefixed name FIRST in a multi-item list ("the Germany
          // representative designation and the designation of a data
          // protection officer"), and the old "None of the ${asProse(...)}"
          // template would have stacked a second "the" in front of it.
          : `None of ${leadNames(counts.attached_names, false)} duties is yet satisfied on the content the company has recorded, and each is set out below with what closes it`,
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
  // DOC 163 R11 — the lead follows the typed determinations, not the
  // self-identification flag: a met definition attaches a duty whether or not
  // the company calls itself a broker (live: Texas attached beside a lead
  // that said no broker duty attaches).
  if (counts.broker_states.length) {
    return stop(
      isTrue(intake.acts_as_data_broker)
        ? `${org} has indicated broker activity, and a data-broker registration duty attaches in ${asProse(counts.broker_states)}`
        : `${org} has not described itself as a data broker, but on its answers the ${asProse(counts.broker_states)} data-broker ${counts.broker_states.length === 1 ? "definition is" : "definitions are"} met and a registration duty attaches there`,
    );
  }
  const open = determinations(report)
    .filter((d) => s(d.verdict) === "conditional" || s(d.verdict) === "record_insufficient")
    .map(stateName);
  if (isTrue(intake.acts_as_data_broker)) {
    return stop(
      `${org} has indicated broker activity, but on the facts stated no state's data-broker registration duty is established, and each position is set out below`,
    );
  }
  if (open.length) {
    return stop(
      `${org} has indicated that it does not act as a data broker; whether the ${asProse(open)} data-broker ${open.length === 1 ? "definition is" : "definitions are"} met on its answers is not settled, and each position is set out below`,
    );
  }
  return stop(
    `${org} has indicated that it does not act as a data broker, so no data-broker registration duty attaches on its answers`,
  );
}

/**
 * Section I conditional. Trigger: `acts_as_data_broker` (CEO binding of
 * 2026-08-10). Content is the live broker cluster, each fact attributed, set
 * beside each state's own verified definitional passage.
 */
function composeBrokerConditional(report: Bag, intake: Bag, org: string): string {
  // DOC 163 R11 — the trigger also fires where a state's definition is met or
  // conditional on the answers (widens the 2026-08-10 binding).
  const live = determinations(report).some((d) => s(d.verdict) === "registrable" || s(d.verdict) === "conditional");
  if (!isTrue(intake.acts_as_data_broker) && !live) {
    // D1D2B3B8-R5 — the outside-frameworks scope statement renders on the
    // non-broker path too; the live silent-on-AU record was a non-broker.
    const outside = composeOutsideFrameworks(intake);
    return [
      // QA batch 2026-09-05 — this sentence always read "has not recorded
      // broker activity" regardless of what the record actually says, so it
      // followed the lead sentence's "has indicated that it does not act as
      // a data broker" (an explicit `false` answer) with wording that implies
      // the opposite — that the question was simply never asked. The two
      // record states are distinguished: an explicit `false` reads as an
      // indication, and an unanswered field reads as unrecorded.
      stop(
        intake.acts_as_data_broker === false
          ? `${org} has indicated that it does not act as a data broker, and no data-broker registration duty attaches on its answers`
          : `${org} has not recorded broker activity, and no data-broker registration duty attaches on its answers`,
      ),
      ...(outside ? [repairRegister(outside)] : []),
    ].join("\n\n");
  }
  const facts: string[] = [];
  facts.push(isTrue(intake.acts_as_data_broker) ? "that it acts as a data broker" : "that it does not describe itself as a data broker");
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
  if (exemption === "unknown") {
    facts.push("that it is not sure whether a statutory exclusion applies");
  } else if (exemption && exemption.toLowerCase() !== "none") {
    facts.push(`that it claims the ${exemptionLabel(exemption)} exclusion`);
  }
  const blocks: string[] = [stop(`${org} has indicated ${asProse(facts)}`)];

  for (const d of determinations(report)) {
    const threshold = (d.threshold ?? {}) as Bag;
    const standard = s(threshold.standard);
    if (!standard) continue;
    // BATCH 18b (doc 113 S2.15/S2.16) — each state opens with an h3-shaped
    // heading chunk ("California — Cal. Civ. Code § 1798.99.82"); the
    // definition quote is its own chunk (statute-quote styling); the record
    // walk follows as its own paragraph. A multi-row standard (Texas) keeps
    // its internal break inside the one quote chunk.
    const headCite = s(threshold.citation).split(";")[0].trim();
    const heading = headCite ? `${stateName(d)} — ${headCite}` : `${stateName(d)}.`;
    const quote = `Its own definition provides: "${quoteEnd(standard).replace(/\n{2,}/g, "\n")}."`;
    const bits: string[] = [];
    const fact = s(threshold.record_fact);
    if (fact) bits.push(stop(noStop(firstSentences(fact, 2))));
    const application = s(threshold.application);
    if (application) bits.push(stop(noStop(firstSentences(application, 2))));
    const exclusion = s(threshold.exclusion_analysis);
    if (exclusion) bits.push(stop(noStop(firstSentence(exclusion))));
    blocks.push([heading, quote, bits.join(" ")].filter(Boolean).join("\n\n"));
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
      `The markets served also name ${asProse(unregistered)}. No data-broker registration statute for ${unregistered.length === 1 ? "that state" : "those states"} is among the four state registries covered by this assessment, so no registration duty is stated for ${unregistered.length === 1 ? "it" : "them"} here; the entry of any new state registry is a named review trigger in the approval block below`,
    ));
  }
  const outside = composeOutsideFrameworks(intake);
  if (outside) blocks.push(outside);
  // BATCH 17 (Wave C2, welded-blocks class): repairRegister collapses
  // runs of whitespace, welding the paragraph seams (the attestation
  // glued onto the preceding block); repair per block, then rejoin.
  return blocks.map(repairPreserving).join("\n\n");
}

// D1D2B3B8-R5 (2026-08-28) — the same honest-posture parity for a named
// NON-US market outside the frameworks this product assesses (US state
// broker registries, and the EU/UK wing handled in Section II). The live
// batch served AU and the document was silent on it — a reader relying on
// the assessment to cover the listed markets is owed a scoped-out statement,
// not silence. Rendered on EVERY posture (the live record was a non-broker,
// whose Section I takes the early-return path above).
// DOC 163 R13 — the EU/EEA Member States (the UK is its own wing).
const EEA_MEMBER_CODES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE", "IS", "LI", "NO",
]);

const GDPR_WING_CODES = new Set([
  "EU", "EEA", "UK", "GB",
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE", "IS", "LI", "NO",
]);

function composeOutsideFrameworks(intake: Bag): string {
  const outsideFrameworks = (Array.isArray(intake.markets_served) ? (intake.markets_served as unknown[]) : [])
    .map((m) => String(m).toUpperCase())
    .filter((m) => m && !/^US/.test(m) && !GDPR_WING_CODES.has(m))
    .map((m) => REGISTRATION_JURISDICTION_LABELS[m] ?? m);
  if (!outsideFrameworks.length) return "";
  return stop(
    `The markets served also name ${asProse(outsideFrameworks)}. No registration or notification regime for ${outsideFrameworks.length === 1 ? "that jurisdiction" : "those jurisdictions"} is among the statutes this assessment covers, so this assessment states no determination for ${outsideFrameworks.length === 1 ? "it" : "them"} — affirmative or negative — and ${outsideFrameworks.length === 1 ? "its" : "their"} registration position remains for separate advice`,
  );
}

/** Section I body — the per-jurisdiction analysis, with registry-only money. */
function composeBrokerAnalysis(report: Bag): string {
  const dets = determinations(report);
  if (dets.length === 0) return "";
  const scheduleFor = new Map<string, Bag>();
  for (const sch of schedules(report)) scheduleFor.set(s(sch.jurisdiction), sch);

  const blocks: string[] = [];
  for (const d of dets) {
    // BATCH 18b (doc 113 S2.15/S2.13) — h3-shaped heading chunk per state;
    // each verbatim provision prints ONCE per state block — where the
    // statute states duty, timing and fee in one sentence (VT, TX; CA's
    // window rides its requirement provision), it is quoted once and cited
    // for each role (kills the doc-109 Vermont ×3 / Texas ×2 / CA ×2 walls).
    const requirement = (d.requirement ?? {}) as Bag;
    const reqCite = s(requirement.citation);
    const heading = reqCite ? `${stateName(d)} — ${reqCite}` : `${stateName(d)}.`;
    const bits: string[] = [];
    const headline = s(d.headline);
    if (headline) bits.push(stop(noStop(headline)));
    const reasoning = s(d.reasoning);
    if (reasoning) bits.push(stop(noStop(firstSentences(reasoning, 3))));
    const quoted: string[] = [];
    const quoteBits: string[] = [];
    const reqStandard = s(requirement.standard);
    if (reqStandard) {
      quoteBits.push(`The filing duty is stated as: "${quoteEnd(reqStandard).replace(/\n{2,}/g, "\n")}."`);
      quoted.push(reqStandard);
    }
    const tailBits: string[] = [];
    const filingBody = s(d.filing_body);
    if (filingBody) tailBits.push(stop(`The filing is made to ${filingBody}`));

    // Fees and deadlines: registry rows only. No date is computed here.
    const sch = scheduleFor.get(s(d.jurisdiction));
    if (sch) {
      const window = s(sch.window_standard);
      const windowCite = s(sch.window_citation);
      if (window && quoted.includes(window)) {
        tailBits.push(stop(`The timing is fixed by the same provision${windowCite ? `, ${windowCite}` : ""}, quoted above`));
      } else if (window) {
        quoteBits.push(`On timing, ${windowCite ? `${windowCite} provides` : "the statute provides"}: "${quoteEnd(window).replace(/\n{2,}/g, "\n")}."`);
        quoted.push(window);
      }
      const fee = s(sch.fee_standard);
      const feeCite = s(sch.fee_citation);
      const feeAmount = s(sch.fee_stated_amount);
      if (fee && quoted.includes(fee)) {
        tailBits.push(stop(`The fee is fixed by the same provision${feeCite ? `, ${feeCite}` : ""}${feeAmount ? ` — ${feeAmount} on its face` : ""}`));
      } else if (fee) {
        quoteBits.push(`On the fee, ${feeCite ? `${feeCite} provides` : "the statute provides"}: "${quoteEnd(fee).replace(/\n{2,}/g, "\n")}."`);
        quoted.push(fee);
      }
    }
    const open = strList(d.open_questions);
    if (open.length) {
      // DOC 163 — the asks are lower-case clauses already; nothing case-folds
      // a state name here any more.
      tailBits.push(stop(`What would settle the remaining ${open.length === 1 ? "question" : "questions"} is ${asProse(open.map((q) => noStop(q)))}`));
    }
    blocks.push(
      [heading, bits.join(" "), ...quoteBits, tailBits.join(" ")]
        .filter(Boolean)
        .join("\n\n"),
    );
  }
  // BATCH 17 (Wave C2, welded-blocks class): repairRegister collapses
  // runs of whitespace, welding the paragraph seams (the attestation
  // glued onto the preceding block); repair per block, then rejoin.
  return blocks.map(repairPreserving).join("\n\n");
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
  // A-TEAM DELTA (ChatGPT post-implementation review, 2026-08-31, closes
  // Registration P1-3) — BDSG §38 is a determination separate from the GDPR
  // Art. 37(1) dpo.verdict above (a record can resolve the GDPR branches
  // while the BDSG conditional stays open, or vice versa); naming only
  // whichever was already reserved undercounted the open items this lead
  // sentence claims to summarise.
  // DOC 163 R8/R10 — the typed BDSG and Art. 49 determinations drive the
  // lead; the engine's Chapter III/V boolean never meant "registration".
  const bdsgLead = (deliverables(report).bdsg_determination ?? null) as Bag | null;
  if (bdsgLead && s(bdsgLead.verdict)) push("a data protection officer under BDSG § 38(1) (Germany)", s(bdsgLead.verdict));
  else if (/Conditional on BDSG §38/.test(s(ai.dpo_condition))) reserved.push("the German BDSG § 38 DPO threshold");
  const aiLead = (deliverables(report).ai_act_registration ?? {}) as Bag;
  push("the EU AI Act Article 49(1) registration", s(aiLead.verdict));

  if (engaged.length === 0 && reserved.length === 0) {
    return stop(`Based on the information supplied, ${org} carries no EU, UK or AI Act filing duty of this kind`);
  }
  if (engaged.length === 0) {
    return stop(
      `Based on the information supplied, ${org} carries no established EU, UK or AI Act filing duty of this kind, and the position on ${asProse(reserved)} remains open because required information was not provided`,
    );
  }
  return stop(
    `Based on the information supplied, ${org} requires ${asProse(engaged)}${reserved.length ? `, and the position on ${asProse(reserved)} remains open because required information was not provided` : ""}`,
  );
}

/** Section II body — representatives, DPO and the AI Act determinations. */
function composeSupervisoryAnalysis(report: Bag, intake: Bag): string {
  const blocks: string[] = [];
  for (const r of representatives(report)) {
    // BATCH 18b (doc 113 S2.15/S2.16) — heading chunk / statute-quote chunk
    // / record+application paragraph / exemption+what-is-missing paragraph.
    // Sentence bytes unchanged; seams only. This is the split that retires
    // the 464-word §II wall (doc 109 Document 4, offense #1).
    const instrument = `${s(r.jurisdiction) === "UK" ? "United Kingdom" : "European Union"} representative`;
    const heading = s(r.citation) ? `${instrument} — ${s(r.citation)}` : `${instrument}.`;
    const standard = s(r.standard);
    const quote = standard
      ? `${s(r.citation) || "The governing article"} provides: "${quoteEnd(standard).replace(/\n{2,}/g, "\n")}."`
      : "";
    const walkBits: string[] = [];
    const fact = s(r.record_fact);
    if (fact) walkBits.push(stop(noStop(firstSentences(fact, 2))));
    const application = s(r.application);
    if (application) walkBits.push(stop(noStop(firstSentences(application, 2))));
    const closeBits: string[] = [];
    const exemption = s(r.exemption_analysis);
    if (exemption) closeBits.push(stop(noStop(firstSentences(exemption, 2))));
    const needed = s(r.information_needed);
    if (needed) closeBits.push(stop(`What is missing is ${noStop(lowerEnumLabel(needed))}`));
    blocks.push(
      [heading, quote, walkBits.join(" "), closeBits.join(" ")]
        .filter(Boolean)
        .join("\n\n"),
    );
  }

  const combined = s(deliverables(report).combined_representative_callout);
  if (deliverables(report).both_representatives_required === true && combined) {
    blocks.push(stop(noStop(firstSentences(combined, 2))));
  }

  const dpo = (deliverables(report).dpo_determination ?? {}) as Bag;
  if (s(dpo.headline) || asArray(dpo.findings).length) {
    // BATCH 18b (doc 113 S2.16) — heading chunk + determination paragraph;
    // the per-branch quote walk keeps one line per branch, and the branch
    // POSITIONS also render in the Article 37(1) branch table below.
    const dpoFindings = asArray(dpo.findings);
    const dpoCite = s((dpoFindings[0] ?? {}).citation);
    // A-TEAM S4 RULING S2.17d (doc 119) — the heading covers all three
    // branches; citing branch (a) alone misdescribed the analysis below.
    const heading = dpoCite ? `Data protection officer — ${dpoCite.replace(/Art\.\s*37\(1\)\([a-c]\)/, "Art. 37(1)")}` : "Data protection officer.";
    const bits: string[] = [];
    if (s(dpo.headline)) bits.push(stop(noStop(s(dpo.headline))));
    if (s(dpo.reasoning)) bits.push(stop(noStop(firstSentences(s(dpo.reasoning), 3))));
    // 3E9AD759-R2 — the closing act rides its own field; the reasoning
    // sentence budget above cannot truncate it.
    if (s(dpo.closing_act)) bits.push(stop(noStop(s(dpo.closing_act))));
    const branchLines: string[] = [];
    for (const f of dpoFindings) {
      const standard = s(f.standard);
      const application = s(f.application);
      if (!standard && !application) continue;
      branchLines.push(
        `${s(f.citation) || "The branch"}: ${standard ? `"${quoteEnd(standard)}." ` : ""}${application ? stop(noStop(firstSentence(application))) : ""}`.trim(),
      );
    }
    blocks.push(
      [heading, bits.join(" "), branchLines.join("\n")]
        .filter(Boolean)
        .join("\n\n"),
    );
  }

  // A-TEAM DELTA (ChatGPT post-implementation review, 2026-08-31, closes
  // Registration P0-2) — the BDSG §38 conditional already carries its own
  // reasoning in obligations_summary.dpo_condition (registration-engine.ts's
  // bdsgCondition) and already earns its own scorecard row above, but this
  // §II body never rendered it — a duty visible on page 1 had no detailed
  // analysis. bdsgCondition is always appended LAST when present (engine
  // concatenates GDPR text, then BDSG text), so it is extracted by its fixed
  // opening words rather than duplicating the whole (possibly GDPR-prefixed)
  // dpo_condition string.
  // DOC 163 R8 — the typed BDSG § 38(1) determination renders like the DPO
  // block; the engine-text regex survives for records persisted before it.
  const bdsg = (deliverables(report).bdsg_determination ?? null) as Bag | null;
  if (bdsg && (s(bdsg.headline) || asArray(bdsg.findings).length)) {
    const bits: string[] = [];
    if (s(bdsg.headline)) bits.push(stop(noStop(s(bdsg.headline))));
    if (s(bdsg.reasoning)) bits.push(stop(noStop(firstSentences(s(bdsg.reasoning), 3))));
    if (s(bdsg.closing_act)) bits.push(stop(noStop(s(bdsg.closing_act))));
    const limbLines: string[] = [];
    for (const f of asArray(bdsg.findings)) {
      const standard = s(f.standard);
      const application = s(f.application);
      if (!standard && !application) continue;
      limbLines.push(
        `${s(f.label) || s(f.citation) || "The limb"}: ${standard ? `"${quoteEnd(standard)}." ` : ""}${application ? stop(noStop(firstSentence(application))) : ""}`.trim(),
      );
    }
    blocks.push(
      ["Germany — data protection officer, BDSG § 38(1)", bits.join(" "), limbLines.join("\n")]
        .filter(Boolean)
        .join("\n\n"),
    );
  } else {
    const dpoConditionFull = s((report.obligations_summary as Bag | undefined)?.dpo_condition);
    const bdsgMatch = dpoConditionFull.match(/Conditional on BDSG §38[\s\S]*/);
    if (bdsgMatch) {
      blocks.push(
        ["Germany — data protection officer, BDSG § 38.", stop(noStop(bdsgMatch[0]))]
          .filter(Boolean)
          .join("\n\n"),
      );
    }
  }

  // REG-1 (doc 106, 2026-08-29) — the EU AI Act registration determination.
  // Same block pattern as the DPO determination above: headline → bounded
  // reasoning → closing_act in its own untruncatable slot (3E9AD759-R2) →
  // per-branch findings.
  const aiAct = (deliverables(report).ai_act_registration ?? {}) as Bag;
  if (s(aiAct.headline) || asArray(aiAct.findings).length) {
    // BATCH 18b (doc 113 S2.16) — same split as the DPO block.
    const aiFindings = asArray(aiAct.findings);
    const aiCite = s((aiFindings[0] ?? {}).citation);
    const heading = aiCite ? `EU AI Act registration — ${aiCite}` : "EU AI Act registration.";
    const bits: string[] = [];
    if (s(aiAct.headline)) bits.push(stop(noStop(s(aiAct.headline))));
    if (s(aiAct.reasoning)) bits.push(stop(noStop(firstSentences(s(aiAct.reasoning), 4))));
    if (s(aiAct.closing_act)) bits.push(stop(noStop(s(aiAct.closing_act))));
    const branchLines: string[] = [];
    for (const f of aiFindings) {
      const standard = s(f.standard);
      const application = s(f.application);
      if (!standard && !application) continue;
      branchLines.push(
        `${s(f.citation) || "The branch"}: ${standard ? `"${quoteEnd(standard)}." ` : ""}${application ? stop(noStop(firstSentence(application))) : ""}`.trim(),
      );
    }
    blocks.push(
      [heading, bits.join(" "), branchLines.join("\n")]
        .filter(Boolean)
        .join("\n\n"),
    );
  }

  // DOC 163 R13 — honest-posture parity for EU/EEA markets: no Member State
  // registration or notification statute is among the authorities relied on,
  // so none is stated (the D1D2B3B8-R5 rule, applied to the GDPR wing).
  const euMarkets = Array.from(new Set(
    [...(Array.isArray(intake.markets_served) ? (intake.markets_served as unknown[]) : []), intake.organization_country]
      .map((m) => String(m ?? "").toUpperCase())
      .filter((m) => EEA_MEMBER_CODES.has(m))
      .map((m) => REGISTRATION_JURISDICTION_LABELS[m] ?? m),
  ));
  if (euMarkets.length) {
    blocks.push(stop(
      `The markets served also name ${asProse(euMarkets)}. No Member State registration or notification statute is among the authorities relied on in this assessment, so no such duty is stated for ${euMarkets.length === 1 ? "it" : "them"} here; the Article 27 and Article 37 determinations above apply to ${euMarkets.length === 1 ? "that market" : "those markets"}, and any Member State filing remains for separate advice`,
    ));
  }
  for (const cp of asArray(deliverables(report).corpus_pending)) {
    const topic = s(cp.topic);
    const note = s(cp.note);
    if (!topic && !note) continue;
    blocks.push(
      stop(
        `${topic || "A further question"}: ${noStop(note) || "the provisions are named but are not among the statutes this assessment covers, so no determination is asserted"}`,
      ),
    );
  }
  // BATCH 17 (Wave C2, welded-blocks class): repairRegister collapses
  // runs of whitespace, welding the paragraph seams (the attestation
  // glued onto the preceding block); repair per block, then rejoin.
  return blocks.map(repairPreserving).join("\n\n");
}

/** Section 3 lead — what stands between the answers and complete filings. */
export function composeReadinessLead(report: Bag, counts: RegistrationDutyCounts, org: string): string {
  const rows = readiness(report);
  if (rows.length === 0) {
    // 3E9AD759-R2 — when no filing-content list applies but a designation
    // duty IS engaged, the section names the outstanding act instead of
    // reading as an all-clear beside an engaged duty.
    const nonFiling = counts.attached - counts.filing_attached;
    if (nonFiling > 0) {
      const lead = stop(
        `No filing-content list applies to ${org} on the current assessment record; the outstanding ${nonFiling === 1 ? "act recorded above is" : "acts recorded above are"} ${asProse(counts.attached_names.slice(counts.filing_attached))}`,
      );
      // QA batch 2026-09-05 — the ICO fee tier's resolution basis (which
      // intake fields decided it, whether a USD→GBP conversion was involved,
      // and the boundary confirm-note where the record sits near a
      // threshold) was computed by resolveIcoFeeTier and stored on the
      // jurisdiction's `notes`, but nothing in this document ever read that
      // field — the Duty-status table cell is deliberately terse and never
      // carried it either. Surfaced here, where the ICO fee's outstanding
      // act is already named.
      const icoNotes = icoFeeJurisdictions(report).map((j) => s(j.notes)).filter(Boolean);
      return icoNotes.length ? `${lead} ${icoNotes.join(" ")}` : lead;
    }
    // A-TEAM S4 RULING S2.17e (doc 119) — the all-clear names any duty
    // determination that remains open above, so it cannot read as settled.
    return stop(
      // A-TEAM DELTA (ChatGPT multi-instance review, 2026-08-31, P2-4) —
      // "N duty determinations remain open above and are not a filing
      // item" reads as an awkward compound predicate; two clauses instead,
      // with "neither"/"none" chosen by count rather than fixed at two.
      `No filing is required of ${org} on the current assessment record; accordingly, no filing-readiness items apply${counts.reserved > 0 ? `. ${counts.reserved === 1 ? "One duty determination remains" : `${numWord(counts.reserved).charAt(0).toUpperCase() + numWord(counts.reserved).slice(1)} duty determinations remain`} open above; ${counts.reserved === 1 ? "it is not" : counts.reserved === 2 ? "neither is" : "none is"} a filing item` : ""}`,
    );
  }
  const open = rows.filter((r) => r.ready_to_file !== true);
  if (open.length === 0) {
    return stop(
      `The information supplied supports complete filings for ${org}: every content item each jurisdiction requires is recorded`,
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
    // BATCH 18b (doc 113 S2.17) — the jurisdiction opens with its state name
    // (never a US-CA code) as an h3-shaped heading with its citation; the
    // per-element status lines move to the Filing content checklist table
    // below; the prose keeps the quote and the what-closes-it sentence
    // naming the responsible party (the 428-D named-actor law).
    const label = stateLabelFor(report, s(r.jurisdiction)) || "The jurisdiction";
    const heading = s(r.citation) ? `${label} — ${s(r.citation)}` : `${label}.`;
    const quote = s(r.standard)
      ? `${s(r.citation) ? `${s(r.citation)} requires` : "The filing must contain"}: "${quoteEnd(s(r.standard)).replace(/\n{2,}/g, "\n")}."`
      : "";
    const bits: string[] = [];
    const summary = s(r.summary);
    if (summary) bits.push(stop(noStop(firstSentences(summary, 2))));
    const open = asArray(r.items).filter((i) => i.ready !== true);
    if (open.length) {
      bits.push(
        stop(
          actor
            ? `What closes ${open.length === 1 ? "it" : "these"} is the outstanding content in the checklist below, which ${actor} is the party the company has named to supply`
            : `What closes ${open.length === 1 ? "it" : "these"} is the outstanding content in the checklist below; the company has not named the party responsible for supplying it`,
        ),
      );
    } else {
      const needed = s(r.information_needed);
      if (needed) bits.push(stop(`What is missing is ${noStop(lowerEnumLabel(needed))}`));
    }
    blocks.push([heading, quote, bits.join(" ")].filter(Boolean).join("\n\n"));
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
      // A-TEAM S3 RULING II.15 (doc 115, 2026-08-31) — the triggers used to
      // be prose-joined into one run-on sentence; each now renders on its
      // own "— " line (the renderer's dash-list segmentation turns the run
      // into a real bullet list).
      bits.push(
        "An earlier review is required on any of the following:\n" +
          triggers.map((t) => `— ${stop(noStop(t))}`).join("\n"),
      );
    }
    if (s(att.information_needed)) {
      // BATCH 18b (doc 113 S2.18, doc 109 §1.8 item 11) — the typed value is
      // a full drafted sentence ("To complete this block the record must
      // state …"); jamming it into the fragment wrapper shipped the garbled
      // seam "What the attestation still needs is to complete this block the
      // record must state…" in all three published samples. A sentence-
      // shaped value renders verbatim; the wrapper serves fragments only.
      const needText = s(att.information_needed);
      bits.push(
        /^To complete this block/i.test(needText)
          ? stop(noStop(needText))
          : stop(`What the attestation still needs is ${noStop(lowerEnumLabel(needText))}`),
      );
    }
    blocks.push(bits.join(" "));
  }
  // BATCH 17 (Wave C2, welded-blocks class): repairRegister collapses
  // runs of whitespace, welding the paragraph seams (the attestation
  // glued onto the preceding block); repair per block, then rejoin.
  return blocks.map(repairPreserving).join("\n\n");
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

// DOC 176 (2026-09-04) — THE DETERMINATION SYLLABUS (Syllabus & Record p.1).
// Every value below is a PROJECTION of a determination this assembler
// already made (doc 127 §28 law): the disposition is a three-bucket
// simplification of the SAME `duty_counts` the cover table's own "Overall
// status" row already composes from (reserved > 0 outranks attached, since
// an open determination is the dominant "needs attention" signal) — reusing
// existing fleet lexicon words rather than inventing new ones, since
// "duty attaches" is the same class of fact CPPA Risk's "Engaged" already
// names; the paragraph is `execLead`, verbatim — the SAME text composed
// into `executive_summary:0`'s `kind: "lead"` block; the conditions are the
// open (`conditional`/`record_insufficient`) `determinations` verbatim —
// Registration's genuine per-jurisdiction typed conditions surface, read
// from `open_questions`/`headline` exactly as recorded, never re-derived.
// Registration has no lettered appendices, so `record_map` is honestly
// empty, same precedent as LIA/Governance.
function registrationDispositionLabel(counts: RegistrationDutyCounts): string {
  if (counts.reserved > 0) return "Determination pending";
  if (counts.attached > 0) return "Engaged";
  return "Not engaged";
}

function buildRegistrationSyllabus(
  rendered: RenderedSkeletonDocument,
  report: Bag,
  counts: RegistrationDutyCounts,
  execLead: string,
  intake: Bag,
  entity: string,
): SyllabusProjection {
  const disposition = registrationDispositionLabel(counts);
  const juris = buildJurisdictionProse(intake);

  const rows: Array<readonly [string, string]> = [];
  if (juris) rows.push(["Jurisdictions assessed", juris]);
  rows.push([
    "Registration duties",
    counts.attached > 0
      ? `${count(counts.attached, "duty attaches", "duties attach")}${counts.attached_names.length ? ` — ${counts.attached_names.join("; ")}` : ""}`
      : "None attach on the information provided",
  ]);
  rows.push([
    "Open determinations",
    counts.reserved > 0
      ? `${count(counts.reserved, "determination remains", "determinations remain")} open because required information was not provided`
      : "None — every determination is resolved on the information provided",
  ]);

  const openDets = determinations(report).filter((d) => {
    const v = s(d.verdict);
    return v === "conditional" || v === "record_insufficient";
  });
  const conditions = openDets.map((d) => {
    const questions = strList(d.open_questions);
    return {
      name: s(d.state_name) || s(d.jurisdiction) || "Open determination",
      text: questions.length ? questions.join(" ") : s(d.headline),
    };
  });

  const key_dates: Array<readonly [string, string]> = [
    ["Assessment date", formatReportDateLong(new Date().toISOString().slice(0, 10))],
  ];

  const record_map: Array<readonly [string, string, string]> = [];
  for (const sec of rendered.sections) {
    const m = /^Appendix ([A-Z]) — (.+)$/.exec(sec.title ?? "");
    if (m) record_map.push([m[1], m[2], ""]);
  }

  return {
    _typed: "syllabus@sr-2026-09-04",
    instrument_line: "REGISTRATION ASSESSMENT",
    prepared_for: entity,
    activity: "Registration and Filing Duties",
    subtitle: "Registration and notification duties across the jurisdictions assessed",
    disposition_label: "OVERALL STATUS",
    disposition,
    disposition_tone: dispositionTone(disposition),
    paragraph: execLead,
    rows,
    conditions_heading: conditions.length ? "OPEN DETERMINATIONS — the assessment depends on these" : "",
    conditions,
    key_dates,
    record_map,
    running_head: `REGISTRATION ASSESSMENT · ${entity.toUpperCase()}`,
  };
}

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
  // DOC 163 R11 — the lead is bound to the typed determinations in both
  // directions: no state attached → no "attaches"; a state attached → the
  // lead must say so whether or not the company calls itself a broker.
  if (counts.broker_states.length === 0 && /duty attaches (in|there)/.test(brokerLead)) {
    findings.push("broker lead names states the typed determinations do not carry");
  }
  if (counts.broker_states.length > 0 && !/duty attaches (in|there)/.test(brokerLead)) {
    findings.push("broker lead omits a duty the typed determinations carry");
  }
  return findings;
}

// A-TEAM S3 RULING II.5 (doc 115, 2026-08-31) — the fleet-standard
// label/value Assessment Profile cover table (hideHeader, matching ADMT/
// Risk/Cyber). Every value is read from the intake or the typed duty
// counts; nothing is invented.
function deriveRegistrationProfileTable(
  intake: Bag,
  counts: RegistrationDutyCounts,
  org: string,
): RenderedTable {
  const juris = buildJurisdictionProse(intake);
  const status = counts.attached === 0
    ? (counts.reserved > 0
      ? `No registration duty established; ${count(counts.reserved, "determination remains", "determinations remain")} open`
      : "No registration duty attaches")
    : `${count(counts.attached, "registration duty attaches", "registration duties attach")}${counts.reserved > 0 ? `; ${count(counts.reserved, "determination remains", "determinations remain")} open` : ""}`;
  const rows: string[][] = [
    ["Organization", org],
    ...(juris ? [["Jurisdictions assessed", juris]] : []),
    ["Assessment date", formatReportDateLong(new Date().toISOString().slice(0, 10))],
    ["Overall status", status.charAt(0).toUpperCase() + status.slice(1)],
  ];
  return {
    key: "",
    surface: "registration_profile",
    title: "",
    columns: ["Field", "Value"],
    hideHeader: true,
    rows,
  };
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

  // BATCH 18b (doc 113 S2.11) — §I's pinned blocks re-indexed around the
  // inserted table blocks (lead / calendar / conditional / limbs / analysis);
  // §II and §III append their tables after the existing blocks. Keys track
  // registration.spine.ts block positions.
  const composed: ComposedBlocks = {
    "executive_summary:0": execLead,
    // BYTE-PINNED corpus-only framing sentence, printed verbatim, marker removed.
    "executive_summary:2": REGISTRATION_CORPUS_FRAMING_NOTE,
    "executive_summary:3": composeExecPosture(report, counts, org),

    "data_broker_registration:0": brokerLead,
    "data_broker_registration:2": composeBrokerConditional(report, intake, org),
    "data_broker_registration:4": composeBrokerAnalysis(report),

    "supervisory_and_ai_act:0": composeSupervisoryLead(report, org),
    "supervisory_and_ai_act:1": composeSupervisoryAnalysis(report, intake),

    "filing_readiness:0": composeReadinessLead(report, counts, org),
    "filing_readiness:1": composeReadinessBody(report, intake),
  };

  // BATCH 18b (doc 113 S2.12/S2.14/S2.16/S2.17) — the tables, keyed to
  // their spine blocks. Each is honestly absent (null) when its rows are.
  const tables: SkeletonTables = {
    // A-TEAM S3 RULING II.5 (doc 115) — the Assessment Profile cover table.
    "cover:0": deriveRegistrationProfileTable(intake, counts, org),
    "executive_summary:4": deriveDutyStatusTable(report),
    "data_broker_registration:1": deriveFilingCalendarTable(report),
    "data_broker_registration:3": deriveLimbWalkTable(report),
    "supervisory_and_ai_act:2": deriveArt37BranchTable(report),
    "filing_readiness:2": deriveReadinessChecklistTable(report),
  };

  const draft = renderSkeletonDocument({
    sections: REGISTRATION_SKELETON_SECTIONS,
    title: REGISTRATION_SKELETON_TITLE,
    subtitle: REGISTRATION_SKELETON_SUBTITLE,
    spineVersion: REGISTRATION_SKELETON_VERSION,
    values,
    composed,
    tables,
  });

  const toa = registrationToa(report, skeletonDocumentToText(draft));

  const renderedDoc = renderSkeletonDocument({
    sections: REGISTRATION_SKELETON_SECTIONS,
    title: REGISTRATION_SKELETON_TITLE,
    subtitle: REGISTRATION_SKELETON_SUBTITLE,
    spineVersion: REGISTRATION_SKELETON_VERSION,
    values,
    composed: { ...composed, "table_of_authorities:0": toa },
    tables,
  });
  // DOC 176 (2026-09-04) — the Determination Syllabus (page 1 of the
  // Syllabus & Record presentation) attached as a projection of the
  // determinations above. Additive: sections, hash and conformance are
  // untouched; a renderer that does not know the field ignores it.
  const document: RenderedSkeletonDocument = {
    ...renderedDoc,
    syllabus: buildRegistrationSyllabus(renderedDoc, report, counts, execLead, intake, org),
  };

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
