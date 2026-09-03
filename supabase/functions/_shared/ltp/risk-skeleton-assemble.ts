// CPPA RISK: ASSEMBLY THROUGH THE SPINE v5.3 SKELETON (the Memorandum
// Redesign, CEO-ratified 2026-08-26, restructured by DOC 144 — the doc-143
// structure redesign, CEO-ratified 2026-09-02: appendix re-lettering,
// landing rhythm, the § 2.A customer-voice block, the page-2 dashboard
// operands, and the ENGINE_KEY_REMAP coordinate translation below).
//
// This module is DETERMINISTIC: it invents no prose. Every {slot} is filled
// from the live intake (Intake Contract v2.0 keys), every [CONDITIONAL]
// block is composed from the RISK52_FIXED constants the spine exports plus
// the facts its trigger names, and every generated block is composed by the
// factor engine (risk-factor-engine.ts — deterministic at runtime) through
// the ratified v5.2 Annex frames.
//
// The result is written to `report_data.skeleton_document`, and that
// document is what ships: `generate-report-pdf` renders the customer PDF
// from it, and the in-app document body renders from it.
//
// ATTRIBUTION RULE (v5.2): "on the information provided"; the banned
// register families are swept from every composed block by the renderer;
// fixed spine prose is byte-pinned law and is checked, not repaired.

import {
  RISK52_FIXED,
  RISK_PLAIN_MEANING,
  RISK_SKELETON_SUBTITLE,
  RISK_SKELETON_TITLE,
  RISK_SKELETON_VERSION,
  RISK_V3_BANNED_REGISTER,
  SKELETON_SECTIONS,
} from "../prose/plans/cppa-risk.spine.ts";
import {
  renderSkeletonDocument,
  skeletonDocumentToText,
  verifySkeletonConformance,
  type ComposedBlocks,
  type RenderedSkeletonDocument,
  type RenderedTable,
  type SkeletonTables,
  type SlotValues,
} from "../prose/skeleton-render.ts";
import {
  runRiskFactorEngine,
  buildRiskAndSafeguardRegisterTable,
  extractBenefits,
  riskApprovalCurrencyFloor,
  // DOC 154 — the one-state resolvers shared with the engine.
  resolveRecordedApprovalDate,
  admtEvaluationActiveFor,
  type RiskFactorEngineResult,
} from "./risk-factor-engine.ts";
import { firstSubstantiveSentence } from "./clause-bound.ts";
// A-TEAM S3 RULING I.23 (doc 115) — customer-facing date rows in long form.
import { formatReportDateLong } from "../report-dates.ts";
// Corpus program phase 2 (carried): Appendix B renders by pure attachment
// over the Risk CAM (the determinism law's generation-plane mechanism).
import { attachCorpusRows } from "../corpus/cam-attach.ts";
import { RISK_CORPUS_MAP } from "../corpus/maps/risk-corpus-map.ts";
import { ADVISORY_APPENDIX_PREAMBLE, advisoryMatchesTable, matchAdvisoryRows } from "../corpus/advisory-surfacing.ts";

export const RISK_SKELETON_ASSEMBLER_STAMP =
  "risk-skeleton-assembler@spine-v5.3-2026-09-02";

type Bag = Record<string, unknown>;

/**
 * DOC 144 (2026-09-02) — ENGINE→SPINE COORDINATE TRANSLATION.
 *
 * risk-factor-engine.ts continues to emit its blocks and tables in the
 * v5.2.1 index space (every `put("<section>:<i>", …)` and `tables[…]` key in
 * the engine is unchanged). The v5.3 spine moved indices in §§ 2, 3, 4 and 5
 * (landing lines, Governing-requirement restructures, the § 3.B fold-in, the
 * § 4 Appendix B pointer). This map is the SINGLE translation point: every
 * engine-emitted key is passed through it on the way into the renderer. A
 * key absent from the map passes through unchanged (executive_summary and
 * the v5.2.1-identical § 4 head indices).
 *
 * Keep in lockstep with the "Engine key" annotations in
 * prose/plans/cppa-risk.spine.ts. If the engine ever adopts v5.3-native
 * keys, delete the corresponding entries here in the same commit.
 */
export const ENGINE_KEY_REMAP: Readonly<Record<string, string>> = {
  // § 2 — The Information Provided.
  "ii_information:1": "ii_information:4",
  "ii_information:3": "ii_information:6",
  "ii_information:5": "ii_information:9",
  "ii_information:6": "ii_information:10",
  "ii_information:7": "ii_information:11",
  "ii_information:8": "ii_information:13",
  "ii_information:10": "ii_information:16",
  "ii_information:11": "ii_information:17",
  "ii_information:12": "ii_information:18",
  "ii_information:14": "ii_information:21",
  "ii_information:15": "ii_information:22",
  "ii_information:16": "ii_information:23",
  "ii_information:18": "ii_information:25",
  // § 3 — Analysis.
  "iii_analysis:2": "iii_analysis:4",
  "iii_analysis:3": "iii_analysis:5",
  "iii_analysis:4": "iii_analysis:6",
  "iii_analysis:5": "iii_analysis:7",
  "iii_analysis:6": "iii_analysis:8",
  "iii_analysis:8": "iii_analysis:11",
  "iii_analysis:9": "iii_analysis:12",
  "iii_analysis:10": "iii_analysis:13",
  "iii_analysis:12": "iii_analysis:15",
  "iii_analysis:13": "iii_analysis:16",
  "iii_analysis:14": "iii_analysis:17",
  "iii_analysis:15": "iii_analysis:18",
  "iii_analysis:16": "iii_analysis:19",
  "iii_analysis:17": "iii_analysis:20",
  "iii_analysis:18": "iii_analysis:21",
  "iii_analysis:20": "iii_analysis:23",
  "iii_analysis:21": "iii_analysis:24",
  // § 4 — indices 0–9 are v5.2.1-identical; only § 4.D shifts (the DOC 144
  // Appendix B pointer occupies the new index 10).
  "iv_determination:11": "iv_determination:12",
  "iv_determination:12": "iv_determination:13",
  "iv_determination:13": "iv_determination:14",
  "iv_determination:14": "iv_determination:15",
  // § 5 — Governance.
  "v_governance:1": "v_governance:2",
  "v_governance:6": "v_governance:9",
  "v_governance:9": "v_governance:14",
};

/** Apply ENGINE_KEY_REMAP to an engine-emitted keyed record (all-at-once,
 * from the original keys, so a key that is both a source and a target of
 * the translation cannot collide). */
function remapEngineKeys<T>(emitted: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(emitted)) {
    out[ENGINE_KEY_REMAP[k] ?? k] = v;
  }
  return out;
}

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => s(x)).filter(Boolean) : s(v) ? [s(v)] : [];
const rows = (v: unknown): Bag[] =>
  Array.isArray(v) ? v.filter((x) => x && typeof x === "object") as Bag[] : [];

/** "a, b and c" */
function asProse(items: readonly string[]): string {
  const xs = items.filter(Boolean);
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

/** Trimmed, with any trailing full stop removed so skeleton sentences do not double-stop. */
function clause(v: unknown): string {
  return s(v).replace(/\.\s*$/, "");
}

/** Booleans and Yes/No strings to a printable Yes/No; "" when unanswered. */
function yn(v: unknown): string {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return s(v);
}

function isYes(v: unknown): boolean {
  return v === true || /^yes\b/i.test(s(v));
}

/**
 * Deterministic register repair — attribution voice is law.
 * Canonical implementation lives in `./register-repair.ts`; re-exported here
 * so every existing import (the other product assemblers) is stable.
 */
export { repairRegister } from "./register-repair.ts";

// ── Canonical California PI / SPI taxonomy (single custody) ──────────────────

import { CA_PI_TAXONOMY } from "./ca-pi-taxonomy.ts";
// DOC 148 — the § 7150(b)(3) reconciliation classifier (single custody in
// _shared; see admt-significant-decision.ts).
import { classifyAdmtSignificantDecision, resolveAdmtSignificantDecision } from "./admt-significant-decision.ts";

// ── DERIVED builders (deterministic, no model) ───────────────────────────────

/** {{DERIVED.applicable_7150_triggers}} — from the live trigger classification.
 * DOC 148 (A-Team Batch-8 P0) — when `intake` is supplied, the § 7150(b)(3)
 * reconciliation the factor engine applies (doc-137 classifier: an
 * advertising-only or category-unresolved q19 description never renders the
 * b3 prong as engaged) is applied here too, so this slot can never list a
 * trigger the trigger table does not. */
export function deriveApplicable7150Triggers(report: Bag, intake?: Bag): string | null {
  const scope = arr((report.scope_and_triggers as Bag)?.narrative ?? report.scope_and_triggers);
  // DOC 157 — the shared resolver (categorical answer first, text fallback).
  const b3Suppressed = intake !== undefined &&
    s(intake.q18_admt_use) === "Yes" &&
    resolveAdmtSignificantDecision(intake).cls !== "significant";
  const engaged = scope
    .filter((x) => x.startsWith("Engaged — "))
    .filter((x) => !(b3Suppressed && /§\s*7150\(b\)\(3\)/.test(x)))
    .map((x) => x.replace(/^Engaged — /, "").replace(/:.*$/, "").trim())
    .filter(Boolean);
  // DOC 157 — § 7001(bbb)(4) elevation: a stored narrative without the b(2)
  // line still lists the prong (same synthesis as the engine's).
  const under16Elevated = intake !== undefined &&
    /^yes/i.test(s(intake.q15b_under16_knowledge)) && s(intake.q15_sensitive_pi) !== "Yes";
  if (under16Elevated && !engaged.some((x) => /7150\(b\)\(2\)/.test(x))) {
    engaged.push("11 CCR § 7150(b)(2) (processing sensitive personal information)");
  }
  return engaged.length ? asProse(engaged) : null;
}

/** {{DERIVED.activity_pi_inventory}} — q4 categories mapped to the canonical California taxonomy. */
export function deriveActivityPiInventory(intake: Bag): string | null {
  const cats = arr(intake.q4_pi_categories);
  if (cats.length === 0) return null;
  return cats
    .map((c) => {
      const row = CA_PI_TAXONOMY[c];
      return row ? `${c} (canonical California category: ${row.canonical})` : c;
    })
    .join("; ");
}

/** {{DERIVED.activity_spi_inventory}} — SPI-mapped q4 categories; fallback when q15 answers Yes with no mapped category. */
export function deriveActivitySpiInventory(intake: Bag): string | null {
  const spi = arr(intake.q4_pi_categories).filter((c) => CA_PI_TAXONOMY[c]?.spi);
  if (spi.length > 0) return asProse(spi);
  if (isYes(intake.q15_sensitive_pi)) {
    // PANEL RISK-P2 (2026-08-30): the old fallback ("the sensitive personal
    // information the Company has identified in its submission") was a
    // circular placeholder posing as data in three table cells. Where the
    // record confirms sensitive PI but names no mapped category, the cell
    // states that limitation honestly instead of describing itself.
    //
    // DOC 139 (2026-09-02) — external legal review on the doc 137/138
    // fixture (row us-ds2-mtjlerdl-tti856): the RISK-P2 wording above read as
    // a completed finding ("identified as processed... categories are not
    // named") when q15_sensitive_pi and the q4 category inventory are two
    // INDEPENDENT intake fields that were never designed to cross-validate
    // each other — q15 is a freestanding Yes/No, and the inventory is
    // filtered against the statutory taxonomy (CA_PI_TAXONOMY) above this
    // fallback only when it finds a true match. None of Contact identifiers,
    // Device identifiers, Internet/network activity, or General location are
    // sensitive PI under Cal. Civ. Code § 1798.140(ae)/11 CCR § 7001, so a
    // record with only those categories and q15 = Yes reaches this branch
    // with the qualifying category genuinely unresolved, not "not named" as
    // an incidental gap. This does not fabricate a category, does not flip
    // the trigger to "no SPI," and does not mark this dimension complete —
    // it states the open question and directs the reader to close it before
    // relying on the SPI-driven necessity/safeguard/risk analysis. The
    // matching runRiskFactorEngine follow-up (risk-factor-engine.ts, doc 139)
    // keeps this out of a false "no conditions" read of the report.
    return "The Company has indicated that sensitive personal information is processed, but the qualifying statutory category has not been identified. Identify the category before finalizing the sensitive-PI necessity, safeguard, and risk analysis.";
  }
  return null;
}

/** {{DERIVED.initial_assessment_deadline}} — § 7155 timing rules over the status/start facts.
 * DOC 148 (A-Team Batch-8 P0) — the deadline is fact-gated: which § 7155
 * deadline applies to processing already underway depends on WHEN it began.
 * "Before initiation" was previously the fall-through for an ongoing
 * activity with no recorded start date — a definitive deadline the record
 * cannot support. That case now states the pending determination and the
 * fork the start date resolves. Planned processing and dated starts are
 * unchanged. */
export function deriveInitialAssessmentDeadline(intake: Bag): string | null {
  const status = s(intake.processing_status);
  if (!status) return null;
  const start = s(intake.processing_start_date);
  const planned = s(intake.planned_start_date);
  if (/^planned/i.test(status)) {
    return `Initial-assessment deadline: before the processing is initiated${planned ? ` (planned start: ${planned})` : ""}.`;
  }
  if (start && start < "2026-01-01") {
    return "Initial-assessment deadline: December 31, 2027 (transition deadline for covered processing initiated before January 1, 2026 and continuing afterward).";
  }
  if (start) {
    return `Initial-assessment deadline: before initiation of the processing (processing initiated ${start}).`;
  }
  return "Initial-assessment deadline: determination pending — record when the covered processing began (before initiation applies to processing initiated on or after January 1, 2026; the December 31, 2027 transition deadline applies to covered processing already underway before that date and continuing afterward).";
}

/** {{DERIVED.next_review_date}} — assessment date + the three-year review rule. */
export function deriveNextReviewDate(assessmentDateIso: string): string {
  const d = new Date(`${assessmentDateIso}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + 3);
  return d.toISOString().slice(0, 10);
}

/** {{DERIVED.assessment_retention_end_date_or_rule}} — § 7155 later-of rule over the status facts. */
export function deriveAssessmentRetentionEnd(intake: Bag): string | null {
  const status = s(intake.processing_status);
  if (!status) return null;
  if (/^discontinued/i.test(status)) {
    return "Because the processing is recorded as discontinued, the assessment record must be retained for five years after completion of this assessment, or until the end of the processing if that is later";
  }
  return "Because the processing continues on the information provided, the retention end date is not yet determinable; the later-of rule above governs";
}

// BATCH 20b (Wave C4, doc 113 S6.3) — the § 5 Key Dates and Deadlines
// digest: the derived timing values this module already computes, plus the
// statutory windows the pinned § 5 prose itself states, as digest
// constants. A row whose value cannot be derived from the record skips.
// The § 5 prose is untouched.
export function deriveKeyDatesTable(intake: Bag, assessmentDateIso: string): RenderedTable | null {
  const rows: string[][] = [];
  const initial = deriveInitialAssessmentDeadline(intake);
  if (initial) {
    const value = initial.replace(/^Initial-assessment deadline:\s*/i, "").replace(/\.\s*$/, "");
    rows.push([
      "Initial risk assessment",
      "11 CCR § 7155(a)(1)–(b)",
      value.charAt(0).toUpperCase() + value.slice(1),
    ]);
  }
  rows.push(["Three-year review", "11 CCR § 7155(a)(2)", deriveNextReviewDate(assessmentDateIso)]);
  rows.push([
    "Update after a material change",
    "11 CCR § 7155(a)(3)",
    "As soon as feasible, and no later than 45 calendar days after the material change",
  ]);
  rows.push([
    "First § 7157 submission (2026–2027 assessments)",
    "11 CCR § 7157",
    "April 1, 2028",
  ]);
  rows.push([
    "Full report on Agency or Attorney General request",
    "11 CCR § 7157",
    "Within 30 calendar days of the request",
  ]);
  rows.push([
    "Retention of the assessment record",
    "11 CCR § 7155(c)",
    "As long as the processing continues, or five years after completion of the assessment, whichever is later",
  ]);
  return {
    key: "",
    surface: "key_dates",
    title: "Key dates and deadlines",
    columns: ["Obligation", "Authority", "Date / deadline"],
    rows,
  };
}

/**
 * {{DERIVED.cover_summary}} — the Assessment Profile panel (v5.2 cover): the
 * three identity facts, with the defined-term tags. The internal
 * spine-version string lives in the materials appendix (Appendix F since
 * DOC 144), not the cover.
 */
export function deriveCoverTable(values: SlotValues): RenderedTable {
  const v = (k: string): string => {
    const val = values[k];
    return typeof val === "string" && val.trim() ? val : "Not reported.";
  };
  // A-TEAM DELTA (ChatGPT Dropbox Batch 1 review, 2026-08-31, Risk P0) —
  // when no activity name is on the record, this row used to read
  // "Not reported. (the "Activity")" — tagging an admittedly-absent value
  // with the defined term the rest of the report then uses as though it
  // were known. Absent the name, the row states the gap plainly and drops
  // the defined-term tag; the report's use of "the Activity" elsewhere is
  // unaffected by this cover row alone.
  const activityName = values["activityName"];
  const activityCell = typeof activityName === "string" && activityName.trim()
    ? `${activityName.trim()} (the “Activity”)`
    : "Additional Information Required — no processing activity name is on the record.";
  return {
    key: "",
    surface: "cover_summary",
    title: "",
    columns: ["Field", "Value"],
    hideHeader: true,
    rows: [
      ["Prepared for", `${v("entityName")} (the “Company”)`],
      ["Processing activity", activityCell],
      ["Assessment date", formatReportDateLong(v("assessmentDate"))],
    ],
  };
}

/** The engine's own exec panel shape (typed operands, engine-owned). */
export type RiskExecPanelCore = RiskFactorEngineResult["exec_panel"];

/**
 * DOC 144 (2026-09-02) — the page-2 dashboard operands (doc 143 §D.1). All
 * four fields are PROJECTIONS of determinations the engine already made —
 * nothing here is recomputed or newly decided.
 */
export interface RiskExecDashboardExtras {
  /** Count of § 7150(b) triggers the live classification records as engaged
   * (the same "Engaged — " lines deriveApplicable7150Triggers reads). */
  readonly triggers_engaged_count: number;
  /** Row count of the § 4.A risk ledger the engine emitted (assessed +
   * named-but-unassessed risks). */
  readonly risks_identified_count: number;
  /** Benefit categories the engine's own weight resolution credits
   * (material or limited weight — extractBenefits, engine-owned). */
  readonly benefits_credited_count: number;
  /** The fixed "What this means" consequence sentence for the disposition
   * branch (RISK_PLAIN_MEANING — selected, never composed). */
  readonly plain_meaning: string;
}

export type RiskExecDashboardPanel = RiskExecPanelCore & RiskExecDashboardExtras;

/**
 * DOC 144 — build the dashboard panel from engine outputs already computed.
 * `report.scope_and_triggers` carries the live trigger classification; the
 * ledger row count comes from the engine's own emitted table; the benefit
 * count runs the engine's exported weight resolution over the same intake.
 */
export function buildRiskExecDashboard(
  engine: RiskFactorEngineResult,
  report: Bag,
  intake: Bag,
): RiskExecDashboardPanel {
  // DOC 148 (A-Team Batch-8 P0) — the engine's RECONCILED count is
  // authoritative (§ 7150(b)(3) reconciliation applied there); the raw
  // scope-line derivation remains only as the fallback for stored engine
  // payloads that predate the field (cross-surface parity: the panel count
  // must match the trigger table).
  const scope = arr((report.scope_and_triggers as Bag)?.narrative ?? report.scope_and_triggers);
  const engineCount = (engine.exec_panel as { triggers_engaged_count?: number }).triggers_engaged_count;
  const triggers_engaged_count = typeof engineCount === "number"
    ? engineCount
    : scope.filter((x) => x.startsWith("Engaged — ")).length;
  const ledger = engine.tables["iv_determination:1"];
  const risks_identified_count = ledger && Array.isArray(ledger.rows) ? ledger.rows.length : 0;
  const benefits_credited_count = extractBenefits(intake)
    .filter((b) => b.weight !== "no affirmative weight").length;
  return {
    ...engine.exec_panel,
    triggers_engaged_count,
    risks_identified_count,
    benefits_credited_count,
    plain_meaning: RISK_PLAIN_MEANING[engine.exec_panel.disposition] ?? "",
  };
}

/**
 * The cover's Assessment Result panel — a PROJECTION of the factor engine's
 * own typed determinations (trigger engagement, the two levels, the
 * balancing consequence) — never a new determination. DOC 144: accepts the
 * dashboard extras and renders the tally rows (no-padding: a zero tally is
 * not itself informative here, matching the doc-136 conditions-count rule)
 * plus the fixed "What this means" line.
 */
export function deriveExecStatusPanel(
  panel: RiskExecPanelCore & Partial<RiskExecDashboardExtras>,
): RenderedTable | null {
  if (
    !panel.assessment_required && !panel.inherent && !panel.residual &&
    !panel.has_unassessed
  ) return null;
  // DOC 127 PART I — a record whose only named risks are unassessed states
  // that, rather than implying no risk was recorded at all.
  const tier = (t: string | null): string =>
    t ?? (panel.has_unassessed
      ? "Not assessed — risk information incomplete."
      : "Not assessed — no risks recorded.");
  // DOC 127 PART I + the §21 casing ruling (2026-08-31): the badge surface
  // renders the engine's controlled title-case label (running prose stays
  // sentence case) — supersedes the PANEL RISK-P3 sentence-caser HERE ONLY.
  // The caser remains as the fallback for legacy panel shapes without a
  // label (older persisted engine output re-derived in tests).
  const disposition = panel.disposition_label ??
    panel.disposition.charAt(0).toUpperCase() + panel.disposition.slice(1);
  const rows: string[][] = [
    ["Assessment required", panel.assessment_required ? "Yes" : "No"],
    ["Inherent privacy risk", tier(panel.inherent)],
    ["Residual privacy risk", tier(panel.residual)],
    ["Assessment disposition", disposition],
  ];
  // DOC 144 (2026-09-02) — the dashboard tallies (doc 143 §D.1). Each row
  // states a count the engine or the live classification already produced;
  // a zero count is skipped (the body already states each absence honestly).
  if (typeof panel.triggers_engaged_count === "number" && panel.triggers_engaged_count > 0) {
    rows.push(["Triggers engaged", String(panel.triggers_engaged_count)]);
  }
  if (typeof panel.risks_identified_count === "number" && panel.risks_identified_count > 0) {
    rows.push(["Risks identified", String(panel.risks_identified_count)]);
  }
  if (typeof panel.benefits_credited_count === "number" && panel.benefits_credited_count > 0) {
    rows.push(["Benefits credited", String(panel.benefits_credited_count)]);
  }
  // DOC 135 FOLLOW-UP (deferred item, 2026-09-01) — A-Team-requested cover
  // field the panel didn't carry: how many §4.D conditions this
  // determination depends on. No-padding law: a zero count isn't itself
  // informative here (the body already states "No conditions to proceed"
  // when there are none), so the row only appears when there's something
  // to count.
  if (panel.conditions_count > 0) {
    rows.push(["Number of conditions", String(panel.conditions_count)]);
  }
  // DOC 127 PART I — the path/reason line beneath an adverse or
  // information-gated disposition: no "Do Not Proceed" is ever a dead end.
  if (panel.path_forward) rows.push(["Path forward", panel.path_forward]);
  // DOC 144 — the fixed consequence sentence for this disposition branch
  // (RISK_PLAIN_MEANING; selected, never composed).
  if (panel.plain_meaning) rows.push(["What this means", panel.plain_meaning]);
  return {
    key: "",
    surface: "exec_status_panel",
    title: "Assessment Result",
    columns: ["Determination", "Result"],
    hideHeader: true,
    rows,
  };
}

/**
 * {{DERIVED.review_approval_signatures}} — the blank-signature-line table.
 * Name/Title are drawn from the record when present; Signature and Date are
 * NEVER pre-filled.
 */
export function deriveReviewApprovalTable(intake: Bag, assessmentDateIso?: string): RenderedTable {
  const BLANK = "________________________";
  // DOC 152 (2026-09-03, Batch-9 P0, one-state rule) — the Date column
  // consumes the SAME recorded approval date as the § 5.A narrative and the
  // engine's sufficiency branch, under the same 365-day currency rule: a
  // CURRENT recorded date prints; a stale (prior-review) or absent date
  // leaves the fill-in blank, because a prior review's date must never
  // render as this assessment's execution date.
  // DOC 154 (item 21) — the same resolver the engine and § 5.A consume.
  const recordedDate = resolveRecordedApprovalDate(intake);
  const dateCurrent = recordedDate !== "" &&
    /^\d{4}-\d{2}-\d{2}/.test(recordedDate) &&
    assessmentDateIso !== undefined &&
    recordedDate >= riskApprovalCurrencyFloor(assessmentDateIso);
  const dateCell = dateCurrent ? recordedDate : BLANK;
  const named: Array<{ role: string; name: string; title: string }> = [];
  for (const r of rows(intake.assessment_reviewers_approvers)) {
    const name = s(r.name);
    const title = s(r.position);
    if (!name && !title) continue;
    const role = s(r.role);
    const label = role === "Reviewed" ? "Reviewed by"
      : role === "Approved" ? "Approved by"
      : "Reviewed and approved by";
    named.push({ role: label, name, title });
  }
  if (named.length === 0 && s(intake.a9_approver_name)) {
    named.push({
      role: "Approved by",
      name: s(intake.a9_approver_name),
      title: s(intake.a9_approver_position),
    });
  }
  if (named.length === 0) {
    named.push({ role: "Reviewed and approved by", name: "", title: "" });
  }
  return {
    key: "",
    surface: "review_approval_signatures",
    title: "",
    columns: ["Role", "Name", "Title", "Signature", "Date"],
    rows: named.map((r) => [r.role, r.name || BLANK, r.title || BLANK, BLANK, dateCell]),
  };
}

/**
 * {{DERIVED.agency_submission_checklist}} — the § 7157(b) one-page extract.
 * States facts already in the record only; performs no submission.
 */
export function deriveAgencySubmissionChecklistTable(
  intake: Bag,
  values: SlotValues,
): RenderedTable {
  const v = (k: string): string => {
    const val = values[k];
    return typeof val === "string" && val.trim() ? val : "Not reported.";
  };
  const contactName = s(intake.i8_certifying_exec_name);
  const contactTitle = clause(intake.i8_certifying_exec_title);
  // A-TEAM DELTA (ChatGPT batch review, 2026-08-31, P0-7) — this is a
  // genuinely separate intake question from the review/approval roster
  // (deriveReviewApprovalTable, above: assessment_reviewers_approvers /
  // a9_approver_name), asked for a different purpose (who certifies the
  // § 7157(b) submission vs. who reviewed/approved the assessment record).
  // When the SAME person's name was recorded on both, the two questions can
  // carry different titles for real reasons (a role held alongside another)
  // or from inconsistent data entry -- either way, showing only one here
  // silently drops a title the record equally supports. Where the names
  // match, both titles are shown together rather than one being picked.
  const approverEntries: Array<{ name: string; title: string }> = [
    ...rows(intake.assessment_reviewers_approvers).map((r) => ({ name: s(r.name), title: s(r.position) })),
    ...(s(intake.a9_approver_name) ? [{ name: s(intake.a9_approver_name), title: s(intake.a9_approver_position) }] : []),
  ];
  const matchingApproverTitle = contactName
    ? approverEntries.find((a) =>
      a.name.trim().toLowerCase() === contactName.trim().toLowerCase() && a.title && a.title !== contactTitle
    )?.title
    : undefined;
  const combinedTitle = matchingApproverTitle
    ? [contactTitle, matchingApproverTitle].filter(Boolean).join(" / ")
    : contactTitle;
  const contact = contactName
    ? `${contactName}${combinedTitle ? `, ${combinedTitle}` : ""}`
    : "Not reported.";
  return {
    key: "",
    surface: "agency_submission_checklist",
    title: "",
    columns: ["Field", "Value"],
    hideHeader: true,
    rows: [
      ["Business legal name", v("entityName")],
      ["Point of contact — § 7157(b)(1)", contact],
      ["Phone", v("certContactPhone")],
      ["Email", v("certContactEmail")],
      // DOC 148 (A-Team Batch-8 P2) — the old label ("covered by this
      // submission") read as though each assessment is itself routinely
      // submitted; the normal § 7157 filing is a business-level aggregate,
      // and this row identifies the activity THIS assessment record covers.
      ["Processing activity covered by this assessment record", v("activityName")],
      ["Categories of personal information involved", v("piCategories")],
      ["Categories of sensitive personal information involved", deriveActivitySpiInventory(intake) || "Not reported."],
    ],
  };
}

function methodLines(intake: Bag): Array<[string, string]> {
  const m = (intake.processing_methods ?? {}) as Bag;
  const pairs: Array<[string, string]> = [
    ["Collection", s(m.collection_method)],
    ["Use", s(m.use_method)],
    ["Disclosure", s(m.disclosure_method)],
    ["Retention", s(m.retention_method)],
    ["Other processing", s(m.other_processing_method)],
  ];
  return pairs.filter(([, v]) => v).map(([k, v]) => [`Processing method — ${k}`, v]);
}

/** {{DERIVED.processing_lifecycle_narrative}} — operational sequence for Appendix C. */
function lifecycleNarrative(intake: Bag): string | null {
  const m = (intake.processing_methods ?? {}) as Bag;
  // DOC 154 (item 20) — "N/A" stage values are not narrative.
  const notApplicable = (v: string): boolean => /^(n\/?a|not applicable|none)\.?$/i.test(v);
  const stages = [
    s(intake.processing_entry_point),
    s(m.collection_method),
    s(m.use_method),
    s(m.disclosure_method),
    s(m.retention_method),
    s(m.other_processing_method),
    s(intake.processing_result),
  ].filter((v) => v && !notApplicable(v));
  return stages.length >= 2 ? stages.join(" ") : null;
}

/** Appendix C — {{DERIVED.processing_and_data_inventory}}. */
export function deriveProcessingAndDataInventory(intake: Bag): RenderedTable | null {
  const rowsOut: string[][] = [];
  const push = (item: string, detail: string) => { if (detail) rowsOut.push([item, detail]); };

  const cats = arr(intake.q4_pi_categories);
  if (cats.length) push("Personal-information categories (this activity)", cats.join("; "));
  const pi = deriveActivityPiInventory(intake);
  if (pi) push("Canonical California mapping", pi);
  const spi = deriveActivitySpiInventory(intake);
  push("Sensitive personal information", spi ?? "none identified in the activity record");
  push("Sources", s(intake.i4b_sources));
  push("Processing entry point", s(intake.processing_entry_point));
  for (const [label, v] of methodLines(intake)) push(label, v);
  const lifecycle = lifecycleNarrative(intake);
  if (lifecycle) push("Processing lifecycle (operational sequence)", lifecycle);
  push("Processing result", s(intake.processing_result));
  const im = s(intake.consumer_interaction_method);
  const ip = s(intake.consumer_interaction_purpose);
  if (im || ip) push("Consumer interaction", [im, ip].filter(Boolean).join(" — "));
  push("Approximate California consumers", s(intake.approximate_ca_consumers));
  for (const d of rows(intake.activity_disclosures)) {
    const bits = [
      `method: ${clause(d.disclosure_method)}`,
      s(d.status) ? `status: ${s(d.status)}` : "",
      s(d.timing_or_location) ? `timing: ${clause(d.timing_or_location)}` : "",
    ].filter(Boolean);
    push("Disclosure", `${clause(d.disclosure_content)} (${bits.join("; ")})`);
  }
  for (const r of rows(intake.recipients)) {
    // DOC 154 (item 37) — no empty "()" when the type is unrecorded.
    push(
      "Recipient",
      `${s(r.recipient_name_or_category)}${s(r.recipient_type) ? ` (${s(r.recipient_type)})` : ""}: ${
        arr(r.pi_categories_made_available).join(", ")
      } — ${clause(r.disclosure_purpose)}`,
    );
  }
  for (const r of rows(intake.retention_by_pi_category)) {
    const rule = s(r.retention_period) || s(r.retention_criteria);
    if (s(r.pi_category) && rule) push("Retention", `${s(r.pi_category)}: ${rule}`);
  }
  const overall = [s(intake.i2_retention_period), s(intake.i2_retention_criteria)].filter(Boolean);
  if (overall.length) push("Overall retention", overall.join(" — "));
  push("Retention detail", s(intake.i2_retention_detail));

  if (rowsOut.length === 0) return null;
  return { key: "", surface: "processing_and_data_inventory", title: "", columns: ["Item", "Detail"], rows: rowsOut };
}

// DOC 144 (2026-09-02): deriveSubmissionSupportRecord (the retired Appendix
// G's per-assessment table) is REMOVED with the appendix — every row it
// printed already appears in Exec B, § 2.D, § 5.E or on the Agency
// Submission Checklist page (doc 143 §B row G). Its one unique element, the
// fixed reporting-period aggregation list below, moved onto the checklist
// page (agency_submission_checklist:2).

/**
 * DOC 144 — the § 2.A customer-voice block (doc 143 §C / §D.5): the
 * Company's recorded processing and purpose, quoted as given, under the
 * attribution line. Renders as a `customer_voice`-kind paragraph
 * (line-per-row); NO-PADDING LAW: absent both quoted values ⇒ null, and the
 * § 2.A intro sentence drops with it (its slot).
 */
export function buildCustomerVoiceBlock(intake: Bag): string | null {
  const processing = clause(intake.primary_activity_name);
  const purpose = clause(intake.primary_activity_purpose);
  if (!processing && !purpose) return null;
  const name = s(intake.entity_name);
  const attribution = name
    ? RISK52_FIXED.customer_voice_attribution.replace("{name}", name)
    : RISK52_FIXED.customer_voice_attribution_fallback;
  const lines = [attribution];
  if (processing) lines.push(`Processing. “${processing}”`);
  if (purpose) lines.push(`Purpose. “${purpose}”`);
  return lines.join("\n");
}

/** The fixed § 7157 reporting-period aggregation list — DOC 144: renders on
 * the Agency Submission Checklist page (formerly the retired Appendix G). */
export function deriveBusinessLevelOutstanding(): RenderedTable {
  return {
    key: "",
    surface: "business_level_submission_outstanding",
    title: "Business-level § 7157 submission items requiring reporting-period aggregation (these aggregate across all assessments in the reporting period and cannot be determined from this assessment alone)",
    columns: ["Reporting-period item"],
    rows: [
      ["Number of risk assessments conducted or updated during the reporting period."],
      ["Aggregate personal-information and sensitive-personal-information categories across all assessed activities."],
      ["The certifying executive's attestation at the time of submission."],
      ["Confirmation of the submission point of contact and submission method."],
    ],
  };
}

/** Appendix F (was H; DOC 144 re-letter) —
 * {{DERIVED.materials_considered_index}} + the engine-version line (moved
 * off the cover per the v5.2 cover note). */
export function deriveMaterialsConsideredIndex(intake: Bag): RenderedTable {
  const rowsOut: string[][] = [
    // A-TEAM S3 RULING VI.19 (doc 115, 2026-08-31) — "intake record" exposed
    // the form workflow; the material considered is the submitted record.
    ["The Company’s submitted CPPA risk-assessment record, including its structured processing, disclosure, recipient, retention, necessity, benefit, risk and safeguard records."],
  ];
  if (s(intake.public_privacy_policy_url)) {
    rowsOut.push([`The Company’s public privacy policy: ${s(intake.public_privacy_policy_url)}`]);
  }
  if (isYes(intake.i9_has_existing_dpia) && s(intake.i9_existing_dpia_summary)) {
    rowsOut.push(["The Company’s existing data protection impact assessment, as summarised in the submitted record."]);
  }
  // PANEL LEAK-1 (2026-08-30): generation metadata stays for reperformance.
  // A-TEAM S3 RULINGS I.3/VI.18 (doc 115): the raw engine identifier
  // ("assessment engine cppa-risk-v5.2.1-…") is internal vocabulary; the
  // provenance row now carries a neutral template-version form derived from
  // the same stamp, so traceability is preserved without the leak.
  rowsOut.push([`Report record — ${neutralTemplateVersion(RISK_SKELETON_VERSION)}.`]);
  return { key: "", surface: "materials_considered_index", title: "", columns: ["Material considered"], rows: rowsOut };
}

/** "cppa-risk-v5.2.1-2026-08-30" → "assessment framework version 2026.08".
 * A-TEAM DELTA (ChatGPT post-implementation review, 2026-08-31, Risk
 * P1-2) — the bare build number ("5.2.1") still read as an internal
 * version tag; a year.month framework label (the same shape as the cyber
 * assembler's fix) replaces it. Falls back to "report template <stamp>"
 * for a stamp that doesn't parse — never drops provenance. */
function neutralTemplateVersion(stamp: string): string {
  const m = /(\d{4})-(\d{2})-\d{2}/.exec(stamp);
  if (m) return `assessment framework version ${m[1]}.${m[2]}`;
  return `report template ${stamp}`;
}

/** DOC 149 — an evaluation-stage ADMT with at least one technical fact on
 * the record (the six appendix record areas). Shared predicate for the
 * appendix table + intro gates; mirrors the engine's admtEvaluationActive. */
function admtEvaluationWithFacts(intake: Bag): boolean {
  // DOC 154 (item 22) — the engine's predicate IS this gate (the two fact
  // sets used to differ, so § 3.E could point at an Appendix E that said
  // "no technical description", or the reverse).
  return admtEvaluationActiveFor(intake);
}

/** Appendix E (was F; DOC 144 re-letter) — {{DERIVED.admt_technical_facts}}
 * (the verbatim technical record that leaves § 3.E under v5.2). */
export function deriveAdmtTechnicalFacts(intake: Bag): RenderedTable | null {
  // DOC 149 (2026-09-03, batch 2c946597) — an "In evaluation" system whose
  // technical facts are on the record renders the appendix too (the § 3.E
  // evaluation-posture analysis points here); mirror of the engine's
  // admtEvaluationActive predicate.
  if (!isYes(intake.q18_admt_use) && !admtEvaluationWithFacts(intake)) return null;
  // DOC 153 (2026-09-03, batch 736df0ad, A-Team §4) — the system description
  // is the Company's own text and renders quoted as such; where it claims a
  // "significant decision" that the doc-137 classifier does not place in a
  // § 7001(ddd) category, EUP's determination sits beside it. The appendix
  // can never carry the Company's characterization as a legal conclusion the
  // body (§ 3.E) rejected.
  const description = s(intake.q19_admt_description);
  const claimsSignificant = /significant\s+decision/i.test(description);
  // DOC 157 — the Company's categorical § 7001(ddd) answer governs the
  // determination; the text classifier is the fallback (shared resolver).
  const claimClass = claimsSignificant ? resolveAdmtSignificantDecision(intake).cls : null;
  const eupDetermination = claimClass === "advertising_only"
    ? "The system description above is the Company’s own characterization. Under § 7001(ddd)(6), advertising to a consumer is excluded from the significant-decision categories; a qualifying § 7150(b)(3) significant-decision use is not established on the information provided (§ 3.E)."
    : claimClass === "unresolved"
    ? "The system description above is the Company’s own characterization. It does not identify a decision within the categories enumerated in § 7001(ddd); a qualifying § 7150(b)(3) significant-decision use is not established on the information provided (§ 3.E)."
    : claimClass === "not_significant"
    ? "The system description above is the Company’s own characterization. The Company’s categorical answer records the decision as outside every category enumerated in § 7001(ddd); a qualifying § 7150(b)(3) significant-decision use is not established on that answer, and the trigger analysis in § 3.A states the same determination."
    : claimClass === "housing_excluded"
    ? "The system description above is the Company’s own characterization. The Company records a housing decision based solely on the availability or vacancy of the housing or the successful receipt of payment; under § 7001(ddd)(2) that use is not making a significant decision, and the trigger analysis in § 3.A states the same determination."
    : "";
  const pairs: Array<[string, string]> = [
    ["System description", description ? `“${description}” (the Company’s description, quoted as given)` : ""],
    ["EUP determination", eupDetermination],
    ["Operational role", s(intake.admt_operational_role)],
    ["Logic", s(intake.i5_admt_logic)],
    ["Assumptions and limitations", s(intake.admt_assumptions_limitations)],
    ["Output", s(intake.admt_output)],
    ["Use of the output", s(intake.admt_output_use)],
    ["Consumer effect", s(intake.admt_consumer_effect)],
    ["Human review", s(intake.i5_admt_human_review)],
    // DOC 154 (item 22) — the structured ADMT answers (role type, logic
    // documentation status, human-review facts, testing facts) are part of
    // the technical record the appendix preserves; they printed nowhere in
    // it before, so an evaluation record carrying only structured answers
    // rendered § 3.E with an empty Appendix E behind it.
    ["Role type (as recorded)", s(intake.admt_role_type)],
    // DOC 157 — the categorical § 7001(ddd) answer and its housing basis.
    ["Decision category (as recorded)", arr(intake.q19a_decision_categories).join("; ")],
    ["Housing decision basis (as recorded)", s(intake.q19b_housing_basis)],
    ["Logic documentation (as recorded)", s(intake.admt_logic_documented)],
    ["Human review facts (as recorded)", arr(intake.human_review_facts).join("; ")],
    ["Testing facts (as recorded)", arr(intake.admt_testing_facts).join("; ")],
    ["Fairness testing", s(intake.i5_admt_fairness_testing)],
    ["Training-data source", s(intake.i5_admt_training_source)],
    ["§ 7153 — made available to another business", yn(intake.admt_made_available_to_other_business)],
    ["§ 7153 — trained using personal information", yn(intake.admt_provider_trained_using_pi)],
    ["§ 7153 — recipient uses it for a significant decision", yn(intake.recipient_business_uses_admt_for_significant_decision)],
  ];
  const rowsOut = pairs.filter(([, v]) => v).map(([k, v]) => [k, v]);
  if (rowsOut.length === 0) return null;
  return { key: "", surface: "admt_technical_facts", title: "", columns: ["Field", "Detail"], hideHeader: true, rows: rowsOut };
}

// ── Slot values ─────────────────────────────────────────────────────────────

export function buildRiskSlotValues(intake: Bag, report: Bag = {}): SlotValues {
  const assessmentDate = new Date().toISOString().slice(0, 10);

  const submissionContact = [
    s(intake.cppa_submission_contact_name),
    s(intake.cppa_submission_contact_phone),
    s(intake.cppa_submission_contact_email),
  ].filter(Boolean).join(" | ");

  return {
    // SYSTEM
    entityName: s(intake.entity_name) || "the company",
    assessmentDate,
    versionNumber: RISK_SKELETON_VERSION,

    // Executive summary
    activityName: clause(intake.primary_activity_name) || null,
    subjectAnchor: clause(intake.subject_anchor) || null,
    activityPurpose: clause(intake.primary_activity_purpose) || null,
    derivedTriggers: deriveApplicable7150Triggers(report, intake),
    piCategories: asProse(arr(intake.q4_pi_categories)) || null,

    // § 2.A — DOC 144: the customer-voice intro sentence rides a slot so it
    // drops exactly when the block cannot compose (no dangling "recorded
    // below"). Fixed bytes live in the spine (RISK52_FIXED).
    customerVoiceIntro: buildCustomerVoiceBlock(intake)
      ? RISK52_FIXED.customer_voice_intro
      : null,
    // § 2.D — DOC 144 (doc 143 §B row C): the canonical California category
    // mapping, the same derivation Appendix C tabulates. Null ⇒ the fixed
    // sentence drops.
    canonicalCaMapping: deriveActivityPiInventory(intake),

    // Section 5 (governance)
    processingStatus: s(intake.processing_status) || null,
    processingStartDate: s(intake.processing_start_date) || null,
    plannedStartDate: s(intake.planned_start_date) || null,
    materialChange: s(intake.material_change_since_prior) || null,
    nextReviewDate: deriveNextReviewDate(assessmentDate),
    retentionEndRule: deriveAssessmentRetentionEnd(intake),
    certExecName: s(intake.i8_certifying_exec_name) || null,
    certExecTitle: clause(intake.i8_certifying_exec_title) || null,
    certContactPhone: s(intake.i8_contact_phone) || null,
    certContactEmail: s(intake.i8_contact_email) || null,
    certifierIsExec: yn(intake.certifier_is_executive_management) || null,
    certifierResponsible: yn(intake.certifier_directly_responsible_for_ra_compliance) || null,
    certifierKnowledge: yn(intake.certifier_has_sufficient_knowledge) || null,
    certifierAuthorized: yn(intake.certifier_authorized_to_submit) || null,
    submissionContact: submissionContact || null,
  };
}

// ── Conditional composers (carried Section 5 compositions) ──────────────────

function composeVApproval(intake: Bag, assessmentDateIso?: string): string {
  const reviewerRows = rows(intake.assessment_reviewers_approvers)
    .map((r) => [s(r.name), s(r.position), s(r.role)].filter(Boolean).join(", "))
    .filter(Boolean)
    .join("; ");
  const migrated = s(intake.a9_approver_name)
    ? `${s(intake.a9_approver_name)}${s(intake.a9_approver_position) ? `, ${s(intake.a9_approver_position)}` : ""} (Approved)`
    : "";
  const reviewers = reviewerRows || migrated;
  // DOC 154 (item 21) — one approval-date resolver across every surface.
  const approvalDate = resolveRecordedApprovalDate(intake);
  const authority = yn(intake.approver_authority_confirmed);
  const basis = clause(intake.approver_authority_basis);
  if (!reviewers && !approvalDate && !authority) return "";

  const bits: string[] = [RISK52_FIXED.x_approval_head];
  if (reviewers) bits.push(`${RISK52_FIXED.x_approval_reviewers} ${reviewers}.`);
  if (approvalDate) {
    const apv = /^\d{4}-\d{2}-\d{2}/.exec(approvalDate)?.[0];
    const asm = assessmentDateIso ? /^\d{4}-\d{2}-\d{2}/.exec(assessmentDateIso)?.[0] : undefined;
    // DOC 152 (2026-09-03, Batch-9 P0) — the 365-day currency rule, one
    // state with the engine's v_governance branch: a date within the year
    // before the assessment records THIS assessment's review; an older date
    // is a PRIOR review record and is labeled as such (never implied to
    // finalize the current assessment).
    const stale = apv !== undefined && asm !== undefined &&
      apv < riskApprovalCurrencyFloor(asm);
    if (stale) {
      bits.push(
        `Prior review or approval date: ${approvalDate}. That date records an earlier internal review; the review and approval of this assessment, including its date, remains to be recorded (§ 7152(a)(9); Follow-Ups, § 4.D).`,
      );
    } else {
      bits.push(`${RISK52_FIXED.x_approval_date_label} ${approvalDate}.`);
      if (apv && asm && apv < asm) {
        bits.push(
          "The approval date precedes this report's date because it records the Company's internal review of the assessment record, which occurred before this report was generated.",
        );
      }
    }
  }
  // DOC 154 (item 13) — an answered "No" never follows the confirming label.
  if (authority) {
    bits.push(
      /^no\b/i.test(authority)
        ? RISK52_FIXED.x_approval_authority_no
        : `${RISK52_FIXED.x_approval_authority} ${authority}.`,
    );
  }
  if (basis) bits.push(`${RISK52_FIXED.x_approval_authority_basis} ${basis}.`);
  return bits.join(" ");
}

function composeVTiming(intake: Bag): string {
  const deadline = deriveInitialAssessmentDeadline(intake);
  if (!deadline) return "";
  const start = s(intake.processing_start_date);
  const rule = start && start < "2026-01-01"
    ? RISK52_FIXED.x_timing_pre2026
    : RISK52_FIXED.x_timing_post2026;
  return `${rule} ${deadline}`;
}

function composeMaterialChangeDetails(intake: Bag): string {
  if (!isYes(intake.material_change_since_prior)) return "";
  const bits: string[] = [];
  if (s(intake.material_change_date)) {
    bits.push(`${RISK52_FIXED.x_material_change_date_label} ${s(intake.material_change_date)}.`);
  }
  if (s(intake.material_change_description)) {
    bits.push(`${RISK52_FIXED.x_material_change_desc_label} ${clause(intake.material_change_description)}.`);
  }
  if (s(intake.prior_risk_assessment_date)) {
    bits.push(`${RISK52_FIXED.x_material_change_prior_label} ${s(intake.prior_risk_assessment_date)}.`);
  }
  return bits.join(" ");
}

// ── Appendix A — factor / determination / authority matrix ──────────────────
//
// v5.2: rows cite v5.2 section numbers; each Report Determination cell is the
// ONE determination sentence for the factor, read from the factor engine's
// own composed factors bag (the same values already printed in the body), so
// no row can say something the report itself does not. A row is suppressed
// (never printed as N/A) when the underlying factor did not compose
// (NO-PADDING LAW).

interface FactorMatrixRowSpec {
  readonly label: string;
  readonly authority: string;
  /** engine.factors id whose composed text supplies the Report Determination. */
  readonly factorId?: string;
  /** Overrides factorId for rows not sourced from the factors bag. */
  readonly reportDetermination?: (report: Bag, intake: Bag, engine: RiskFactorEngineResult) => string | null;
}

const FACTOR_MATRIX_ROWS: readonly FactorMatrixRowSpec[] = [
  { label: "Regulatory trigger and applicability", authority: "11 CCR § 7150(a)–(b)", factorId: "trigger_application" },
  { label: "Stakeholder involvement and information providers", authority: "11 CCR § 7151; § 7152(a)(8)", factorId: "record_providers" },
  { label: "Processing purpose specificity", authority: "11 CCR § 7152(a)(1)", factorId: "purpose_specificity_analysis" },
  { label: "Scope and out-of-scope processing", authority: "11 CCR § 7156(a)", factorId: "out_of_scope" },
  { label: "Prior DPIA or other assessment", authority: "11 CCR § 7156(b)", factorId: "prior_assessments" },
  { label: "Personal-information profile", authority: "11 CCR § 7152(a)(2)", factorId: "information_profile" },
  { label: "Necessity and minimization", authority: "11 CCR § 7152(a)(2)", factorId: "necessity_conclusion" },
  { label: "Processing methods and coherence", authority: "11 CCR § 7152(a)(3)(A)", factorId: "operational_sequence" },
  { label: "Sources of information", authority: "11 CCR § 7152(a)(3)(A)", factorId: "sources_analysis" },
  { label: "Retention", authority: "11 CCR § 7152(a)(3)(B)", factorId: "retention_basis" },
  { label: "Consumer interaction and scale", authority: "11 CCR § 7152(a)(3)(C)–(D)", factorId: "consumer_context" },
  { label: "Transparency and disclosures", authority: "11 CCR § 7152(a)(3)(E); § 7152(a)(5)(C)", factorId: "notice_application" },
  { label: "Recipients and disclosures", authority: "11 CCR § 7152(a)(3)(F)", factorId: "recipient_consequences" },
  { label: "ADMT role and decision effect", authority: "11 CCR § 7152(a)(3)(G)", factorId: "admt_role" },
  { label: "ADMT logic and limitations", authority: "11 CCR § 7152(a)(3)(G)(i)", factorId: "admt_logic_note" },
  { label: "Human review of ADMT", authority: "11 CCR § 7001(e); § 7150(b)(3)", factorId: "admt_human_review" },
  { label: "ADMT fairness and bias testing", authority: "11 CCR § 7152(a)(5)(B); § 7152(a)(6)(A)(iv)", factorId: "admt_testing_analysis" },
  { label: "ADMT training data", authority: "11 CCR § 7150(b)(6); § 7153", factorId: "admt_training_note" },
  { label: "ADMT made available to another business", authority: "11 CCR § 7153(a)–(b)", factorId: "admt_made_available" },
  { label: "Consumer benefit", authority: "11 CCR § 7152(a)(4)", factorId: "consumer_benefit_paragraph" },
  { label: "Business benefit", authority: "11 CCR § 7152(a)(4)", factorId: "business_benefit_paragraph" },
  { label: "Other-stakeholder benefit", authority: "11 CCR § 7152(a)(4)", factorId: "other_stakeholder_benefit_paragraph" },
  { label: "Public benefit", authority: "11 CCR § 7152(a)(4)", factorId: "public_benefit_paragraph" },
  { label: "Material privacy risks", authority: "11 CCR § 7152(a)(5)(A)–(H)", factorId: "risk_rollup" },
  { label: "Consumer expectations", authority: "11 CCR § 7152(a)(5)(C)", factorId: "expectation_application" },
  { label: "Practical consumer control", authority: "11 CCR § 7152(a)(5)(C)", factorId: "controls_application" },
  { label: "Coercion and choice architecture", authority: "11 CCR § 7152(a)(5)(D)", factorId: "choice_architecture" },
  { label: "Safeguards", authority: "11 CCR § 7152(a)(6)", factorId: "safeguard_posture_summary" },
  { label: "Residual risk", authority: "11 CCR § 7152(a)(5)–(6); § 7154", factorId: "remaining_risk_summary" },
  { label: "Benefits-risks balancing", authority: "11 CCR § 7152(a); § 7154", factorId: "determination_text" },
  { label: "Recommended processing outcome", authority: "11 CCR § 7152(a)(7); § 7154", factorId: "recommended_outcome" },
  {
    label: "Approval and authority",
    authority: "11 CCR § 7152(a)(9)",
    reportDetermination: (_report, _intake, engine) =>
      engine.factors["approval_sufficiency_conclusion"] ?? engine.factors["approval_follow_up"] ?? null,
  },
  { label: "Assessment timing and material changes", authority: "11 CCR § 7155(a)–(b)", factorId: "review_cadence" },
  {
    label: "Assessment retention",
    authority: "11 CCR § 7155(c)",
    reportDetermination: (_report, intake) => deriveAssessmentRetentionEnd(intake),
  },
  { label: "CPPA submission and certifying executive", authority: "11 CCR § 7157(a)–(e)", factorId: "certifying_executive_eligibility" },
];

/** Appendix A — {{DERIVED.factor_input_determination_authority_matrix}}.
 * Suppresses uncomposed factors (NO-PADDING LAW); never prints N/A.
 * `persuasiveTrail` (carried): the Factor-Bearing Law's S3 anchor — the
 * trigger row's authority cell carries the compact interpretive citation
 * trail exactly when Appendix B renders. WAVE C1 trail_impact tags carried
 * unchanged. */
/** DOC 148 (A-Team Batch-8 P2, appendix compression) — bound the embedded
 * “…” quotations inside an Appendix A determination cell. The matrix is a
 * cross-reference: the FULL verbatim quote already prints in the body, and
 * a cell repeating a 60-word quotation was the main driver of appendix
 * length. A quoted span longer than `maxWords` is clipped to its first
 * `maxWords` words plus a visible ellipsis INSIDE the quotation marks, so
 * the elision is explicit and the quote is never silently rewritten. Text
 * outside quotation marks is untouched. */
export function clipQuotedPassages(text: string, maxWords = 12): string {
  return text.replace(/“([^”]*)”/g, (_full, inner: string) => {
    const words = inner.trim().split(/\s+/);
    if (words.length <= maxWords + 3) return `“${inner}”`;
    return `“${words.slice(0, maxWords).join(" ")} …”`;
  });
}

export function buildFactorAuthorityMatrixTable(
  report: Bag,
  intake: Bag,
  engine: RiskFactorEngineResult,
  persuasiveTrail?: string | null,
): RenderedTable | null {
  const rowsOut: string[][] = [];
  for (const spec of FACTOR_MATRIX_ROWS) {
    const determination = spec.reportDetermination
      ? spec.reportDetermination(report, intake, engine)
      : (spec.factorId ? engine.factors[spec.factorId] ?? null : null);
    if (!determination) continue;
    let authority = spec.authority;
    const tagged = RISK_CORPUS_MAP.rows.find((r) => r.factor_id === spec.label && r.trail_impact);
    if (tagged?.trail_impact) authority = `${authority}; ${tagged.trail_impact}`;
    if (persuasiveTrail && spec.label === "Regulatory trigger and applicability") {
      authority = `${authority}; persuasive (Appendix B): analogous enforcement — ${persuasiveTrail}`;
    }
    // DOC 148 — determination cells clip long embedded quotes (see
    // clipQuotedPassages); the body keeps every quote in full.
    rowsOut.push([spec.label, clipQuotedPassages(firstSubstantiveSentence(determination)), authority]);
  }
  if (rowsOut.length === 0) return null;
  return {
    key: "",
    surface: "factor_authority_matrix",
    title: "",
    columns: ["Factor", "Report Determination", "Primary Authority"],
    rows: rowsOut,
  };
}

// ── Appendix B — Persuasive Authority (the S5 surface, carried) ─────────────

/** Appendix B lead — ratified fixed prose. Composed iff ≥1 precedent row attaches. */
export const RISK_APPENDIX_I_LEAD =
  "This appendix collects enforcement decisions issued under analogous data-protection law that bear on factors assessed in this report. These decisions were issued under the EU General Data Protection Regulation, not the CCPA or its regulations; they are persuasive context only, are not binding on the California Privacy Protection Agency or on any court applying California law, and are cited because the processing or the failure they address is analogous to a factor this assessment addresses. Each entry names the factor it bears on. The operative determination for every factor remains the analysis in the body of this report.";

/** The report's fired-state tokens for CAM attachment. Exported for tests. */
export function deriveRiskFiredStates(report: Bag, intake?: Bag): Set<string> {
  const states = new Set<string>();
  const scope = arr((report.scope_and_triggers as Bag)?.narrative ?? report.scope_and_triggers);
  // DOC 154 (item 23) — the same reconciliation the trigger table applies:
  // a prong the engine renders as not engaged / unresolved must not attach
  // persuasive authority (Appendix B) or the Appendix A trail.
  const suppressed = new Set<string>();
  if (intake) {
    // DOC 157 — the shared resolver (categorical answer first, text fallback).
    if (
      s(intake.q18_admt_use) !== "Yes" ||
      resolveAdmtSignificantDecision(intake).cls !== "significant"
    ) suppressed.add("3");
    // DOC 157 — § 7001(bbb)(4): an under-16 elevated record is engaged, never
    // unresolved, and a stored narrative without the b(2) line still fires.
    const under16Elevated = /^yes/i.test(s(intake.q15b_under16_knowledge)) && s(intake.q15_sensitive_pi) !== "Yes";
    if (s(intake.q15_sensitive_pi) === "Unsure" && !under16Elevated) suppressed.add("2");
    if (under16Elevated) {
      states.add("7150(b)(2)");
      states.add("trigger_engaged");
    }
  }
  for (const line of scope) {
    const m = /^Engaged — .*?7150\(b\)\((\d)\)/.exec(line);
    if (m && !suppressed.has(m[1])) {
      states.add(`7150(b)(${m[1]})`);
      states.add("trigger_engaged");
    }
  }
  const rc = report.record_complete as { value?: unknown } | null | undefined;
  if (rc?.value !== true) states.add("record_incomplete");
  return states;
}

export interface RiskPersuasiveAuthority {
  readonly table: RenderedTable | null;
  /** Compact S3 citation trail (Factor-Bearing Law), null when no row attached. */
  readonly trail: string | null;
  /** AOW ratified wording, null unless its bound adverse state fired AND the appendix renders. */
  readonly warning: string | null;
}

/** {{DERIVED.persuasive_authority_matrix}} — pure attachment over the Risk
 * CAM. NO-PADDING LAW: no attached row → null table → Appendix B drops. */
export function buildPersuasiveAuthority(report: Bag, intake?: Bag): RiskPersuasiveAuthority {
  const fired = deriveRiskFiredStates(report, intake);
  const ap = attachCorpusRows(RISK_CORPUS_MAP, "S5", fired).filter((r) => r.role === "AP");
  if (ap.length === 0) return { table: null, trail: null, warning: null };

  const rows = ap.map((r) => [
    r.display!.matter,
    r.display!.what_happened,
    r.display!.bearing,
    r.display!.authority_label,
  ]);
  const table: RenderedTable = {
    key: "",
    surface: "persuasive_authority_matrix",
    title: "",
    columns: ["Matter", "What happened", "Bearing on this assessment", "Authority"],
    rows,
  };
  const trail = ap.map((r) => r.display!.trail_cite).join("; ");
  const aow = attachCorpusRows(RISK_CORPUS_MAP, "S5", fired).find((r) => r.role === "AOW");
  return { table, trail, warning: aow?.warning_text ?? null };
}

// ── DOC 132 (Track A advisory surfacing, CEO-ratified 2026-09-01) ──────────

/** The Company's own free-text account, concatenated for term-matching.
 * Never parsed for meaning — only scanned for curated advisory_terms. */
function riskFreeText(intake: Bag): string[] {
  return [
    s(intake.primary_activity_purpose),
    s(intake.processing_entry_point),
    s(intake.processing_result),
    ...rows(intake.a5_harm_pathways).flatMap((p) => [s(p.data_involved), s(p.actor), s(p.source), s(p.cause)]),
    ...rows(intake.a2_necessity_set).map((r) => s(r.justification)),
  ];
}

/** Advisory table for the report's fired states — excludes any row already
 * attached above (buildPersuasiveAuthority's own `ap` list), so this
 * appendix surfaces ONLY topics the deterministic triggers did not reach. */
export function buildAdvisoryCorpusMatches(report: Bag, intake: Bag): RenderedTable | null {
  const fired = deriveRiskFiredStates(report, intake);
  const alreadyCited = new Set(
    attachCorpusRows(RISK_CORPUS_MAP, "S5", fired)
      .filter((r) => r.role === "AP")
      .map((r) => r.provenance.source_url)
      .filter((u): u is string => !!u),
  );
  const matches = matchAdvisoryRows(RISK_CORPUS_MAP, riskFreeText(intake), alreadyCited);
  const t = advisoryMatchesTable(matches);
  if (!t) return null;
  return { key: "", surface: "advisory_corpus_matches", title: "", columns: [...t.columns], rows: t.rows.map((r) => [...r]) };
}

// ── Assembly ────────────────────────────────────────────────────────────────

export interface RiskSkeletonResult {
  readonly document: RenderedSkeletonDocument;
  readonly conformance: ReturnType<typeof verifySkeletonConformance>;
  readonly register_findings: string[];
  /** The factor engine's output (provenance persisted for the Appendix A feed). */
  readonly factor_engine: RiskFactorEngineResult;
  /** DOC 144 — the page-2 dashboard panel: the engine's exec panel extended
   * with the tally and plain-meaning operands (buildRiskExecDashboard). */
  readonly exec_panel: RiskExecDashboardPanel;
}

export function assembleRiskSkeletonDocument(report: Bag, intake: Bag): RiskSkeletonResult {
  const values = buildRiskSlotValues(intake, report);
  const assessmentDate = String(values.assessmentDate);

  // The v5.2 factor engine composes every generated body block and owns the
  // in-body tables (exec ledger, recipients, retention, controls, risk
  // ledger, balance summary). DOC 144: it emits in the v5.2.1 coordinate
  // space; ENGINE_KEY_REMAP translates into the v5.3 spine layout.
  const engine = runRiskFactorEngine(intake, report, assessmentDate);
  const execDashboard = buildRiskExecDashboard(engine, report, intake);

  const composed: ComposedBlocks = {
    ...remapEngineKeys(engine.blocks),

    // § 2.A — DOC 144: the customer-voice block (kind `customer_voice`).
    "ii_information:2": buildCustomerVoiceBlock(intake),

    // Section 5 — carried compositions (v5.3 indices).
    "v_governance:1": composeVApproval(intake, assessmentDate),
    "v_governance:5": composeVTiming(intake),
    "v_governance:8": composeMaterialChangeDetails(intake),
  };

  // Appendix F — intro / not-applicable record + analytical note.
  // DOC 149 — evaluation-stage records with technical facts render the
  // appendix (mirrors deriveAdmtTechnicalFacts' gate).
  if (isYes(intake.q18_admt_use) || admtEvaluationWithFacts(intake)) {
    composed["appendix_d:0"] =
      "This appendix preserves the technical and analytical detail supporting § 3.E, including the technology’s role, logic, assumptions and limitations, output, human review, testing, training-data provenance, and facts relevant to § 7153. The full verbatim system, logic, assumptions, and training-data descriptions are preserved here; the body quotes them only as its analysis requires.";
    const techPresent = [
      clause(intake.q19_admt_description),
      clause(intake.i5_admt_logic),
      clause(intake.admt_output),
      clause(intake.i5_admt_human_review),
      clause(intake.i5_admt_fairness_testing),
      clause(intake.i5_admt_training_source),
    ].filter(Boolean).length;
    if (techPresent > 0) {
      // DOC 154 (item 33) — counts under ten render as words.
      const COUNT_WORDS = ["zero", "one", "two", "three", "four", "five", "six"];
      composed["appendix_d:2"] =
        `Analytical note. The record above preserves the Company’s own technical description across ${COUNT_WORDS[techPresent] ?? String(techPresent)} of the six record areas the appendix tracks (system description, logic, output and use, human review, testing, and training data). The body of the report evaluates those facts in § 3.E; this appendix preserves them so a reviewer can trace each conclusion to the description it rests on.`;
    }
  } else {
    // A-TEAM S3 RULING V.13 (doc 115, 2026-08-31) — the trailing "appendix
    // letter is retained…" sentence explained the template to the customer;
    // removed (the Not-applicable sentence already states the substance).
    // DOC 149 — the In-evaluation-no-facts case gets its own sentence; the
    // generic text would deny a technology the intake answer asserts exists.
    composed["appendix_d:0"] = s(intake.q18_admt_use) === "In evaluation"
      ? "The Company records automated decisionmaking technology as under evaluation but provides no technical description of it; there is no record for this appendix to preserve. Record the technology's description if the evaluation proceeds toward deployment."
      : "Not applicable. The Activity does not involve automated decisionmaking technology, so no ADMT technical and decision record is required.";
  }

  // Appendix B (Persuasive Authority): pure CAM attachment over the report's
  // fired trigger states. Computed BEFORE Appendix A so the trigger row's
  // authority cell can carry the S3 citation trail exactly when the appendix
  // renders (Factor-Bearing Law; no dangling pointer).
  const persuasive = buildPersuasiveAuthority(report, intake);
  composed["appendix_i:0"] = persuasive.table ? RISK_APPENDIX_I_LEAD : null;
  composed["appendix_i:2"] = persuasive.table ? persuasive.warning : null;

  // DOC 144 (doc 143 §B row B) — the one fixed § 4 cross-reference to the
  // Appendix B caution, composed iff the appendix renders (no dangling
  // pointer).
  composed["iv_determination:10"] = persuasive.table
    ? RISK52_FIXED.persuasive_pointer
    : null;

  // DOC 144 (doc 143 §B empty-register suppression) — the risk-register
  // appendix intro composes iff the register has rows; otherwise the whole
  // appendix drops and the § 4.A opener states the posture inline.
  const riskRegister = buildRiskAndSafeguardRegisterTable(intake);
  composed["appendix_c:0"] = riskRegister
    ? RISK52_FIXED.risk_register_appendix_intro
    : null;

  // DOC 132 (Track A advisory surfacing, CEO-ratified 2026-09-01).
  const advisoryMatches = buildAdvisoryCorpusMatches(report, intake);
  composed["appendix_i:3"] = advisoryMatches ? ADVISORY_APPENDIX_PREAMBLE : null;

  const matrixTable = buildFactorAuthorityMatrixTable(report, intake, engine, persuasive.trail);

  const tables: SkeletonTables = {
    // Engine-owned in-body tables (exec ledger, recipients, retention,
    // controls, the § 3.B necessity matrix, risk ledger, balance summary),
    // translated into the v5.3 spine layout.
    ...remapEngineKeys(engine.tables),

    "cover:0": deriveCoverTable(values),
    "cover:2": deriveExecStatusPanel(execDashboard),
    "review_and_approval:1": deriveReviewApprovalTable(intake, assessmentDate),
    // BATCH 20b (doc 113 S6.3) — v5.3 index.
    "v_governance:15": deriveKeyDatesTable(intake, assessmentDate),
    "agency_submission_checklist:1": deriveAgencySubmissionChecklistTable(intake, values),
    // DOC 144 — the reporting-period aggregation list, moved here from the
    // retired Appendix G.
    "agency_submission_checklist:2": deriveBusinessLevelOutstanding(),
    "table_of_authorities:1": matrixTable,
    "appendix_a:1": deriveProcessingAndDataInventory(intake),
    "appendix_c:1": riskRegister,
    "appendix_d:1": deriveAdmtTechnicalFacts(intake),
    "appendix_f:1": deriveMaterialsConsideredIndex(intake),
    "appendix_i:1": persuasive.table,
    "appendix_i:4": advisoryMatches,
  };

  const document = renderSkeletonDocument({
    sections: SKELETON_SECTIONS,
    title: RISK_SKELETON_TITLE,
    subtitle: RISK_SKELETON_SUBTITLE,
    spineVersion: RISK_SKELETON_VERSION,
    values,
    composed,
    tables,
  });

  const body = skeletonDocumentToText(document).toLowerCase();
  const register_findings = RISK_V3_BANNED_REGISTER.filter((b) => body.includes(b));

  return {
    document,
    conformance: verifySkeletonConformance(document, SKELETON_SECTIONS, values),
    register_findings,
    factor_engine: engine,
    exec_panel: execDashboard,
  };
}
