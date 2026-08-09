/**
 * ITEM 427 — RISK `risk_assessment_by_activity` CANONICAL EMISSION (the writer).
 *
 * LAW 3 SINGLE WRITE SITE for the SHAPE of this surface: called once, from
 * `finalizeCppaRiskPayload` (supabase/functions/_shared/ltp/generate-cppa-risk.ts),
 * after serialization and BEFORE the CSC, so the CSC's `r1_benefits_vs_intake`
 * reads the typed shape (detection semantics unchanged — it still reads
 * `benefits_to_business` / `benefits_to_consumers` string leaves).
 *
 * DETERMINISTIC-PINPOINT LAW (items 422-B/C, 425, 426): `statutory_basis` and
 * every `section_7152_mapping[].pinpoint` come from
 * `_shared/registry/risk-verified-authorities.ts` — never model-authored. An
 * unresolvable element takes `ACTIVITY_DOWNGRADE_PINPOINT` and the record is
 * stamped `_basis_source: "registry_downgrade_unresolved"`.
 *
 * CONDITIONALITY (anti-padding): exactly ONE record per TRIGGERED activity,
 * sourced from the deterministic ITEM 305 `activity_analytics` envelope. With
 * no analytics the existing surface is LEFT UNTOUCHED (fail-open — never
 * destructive on a document this pass did not author).
 *
 * ITEM 384 r4 PLACEHOLDER RULE, restated for the typed array: a stray
 * verification fragment is NOT representable as a leaf value. Every leaf either
 * carries its own kind of content or the record's honest absence treatment
 * (`ACTIVITY_NOT_ON_RECORD`); a composed value that is only an emit-gate
 * placeholder is replaced by that treatment before emission.
 */

import {
  ACTIVITY_DOWNGRADE_PINPOINT,
  RISK_ACTIVITIES_CONTRACT_VERSION,
  coerceActivityView,
  type RiskActivityRecord,
  type RiskAdverseEffect,
  type RiskSectionMapping,
} from "../report-contracts/risk-activities.ts";
import { RISK_VERIFIED_AUTHORITIES } from "../registry/risk-verified-authorities.ts";
import { DEGRADED_OPENER_RES, MIN_SURFACE_SUBSTANCE, stripDegradedOpeners } from "./risk-prose-gold.ts";
import { buildActivityAnalytics } from "./analytic-deliverables/build.ts";

export { RISK_ACTIVITIES_CONTRACT_VERSION };

/** The honest absence treatment for any leaf the record does not supply. */
export const ACTIVITY_NOT_ON_RECORD =
  "Not stated on the record — listed under Items for your review.";

/**
 * THE § 7152(a) ELEMENT MAP. Element label → registry proposition key. The
 * pinpoint itself is read from the registry row's `subsection`, so the two can
 * never drift.
 */
export const SECTION_7152_ELEMENT_MAP: ReadonlyArray<{ element: string; key: string }> = [
  { element: "Purpose of the processing", key: "ra_content_purpose" },
  { element: "Categories of personal information and the minimum necessary", key: "ra_content_categories" },
  { element: "Operational elements of the processing", key: "ra_content_operational" },
  { element: "Benefits from the processing", key: "ra_content_benefits" },
  { element: "Negative impacts to consumers' privacy", key: "ra_content_negative_impacts" },
  { element: "Safeguards for the processing", key: "ra_content_safeguards" },
  { element: "Whether the processing will be initiated", key: "ra_content_initiate" },
];

/** Registry key for the per-activity statutory basis (the duty to assess). */
export const ACTIVITY_BASIS_KEY = "ra_when_required";

export function resolveRegistryPinpoint(key: string): { pinpoint: string; resolved: boolean } {
  const row = (RISK_VERIFIED_AUTHORITIES as Record<string, { subsection?: string } | undefined>)[key];
  const pin = typeof row?.subsection === "string" ? row.subsection.trim() : "";
  return pin ? { pinpoint: pin, resolved: true } : { pinpoint: ACTIVITY_DOWNGRADE_PINPOINT, resolved: false };
}

/** The § 7152(a) mapping for one activity — registry-sourced, in element order. */
export function buildSection7152Mapping(): {
  mapping: RiskSectionMapping[];
  unresolved: number;
} {
  const mapping: RiskSectionMapping[] = [];
  let unresolved = 0;
  for (const { element, key } of SECTION_7152_ELEMENT_MAP) {
    const r = resolveRegistryPinpoint(key);
    if (!r.resolved) unresolved++;
    mapping.push({ element, pinpoint: r.pinpoint });
  }
  return { mapping, unresolved };
}

// ---------------------------------------------------------------------------
// Leaf composition
// ---------------------------------------------------------------------------

const NOT_STATED_RE = /^not stated on the record$/i;

const str = (v: unknown): string => {
  const s = typeof v === "string" ? v.trim() : "";
  return NOT_STATED_RE.test(s) ? "" : s;
};

/** ITEM 384 r4 — a composed leaf that is only an emit-gate placeholder. */
export function isPlaceholderLeaf(value: string): boolean {
  const s = value.trim();
  if (!s) return false;
  if (!DEGRADED_OPENER_RES.some((re) => re.test(s))) return false;
  return stripDegradedOpeners(s).length < MIN_SURFACE_SUBSTANCE;
}

/** Every leaf either carries content of its own kind, or the honest absence. */
function leaf(value: string): string {
  const s = value.trim();
  if (!s || isPlaceholderLeaf(s)) return ACTIVITY_NOT_ON_RECORD;
  return s;
}

const sentence = (s: string): string => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

function benefitLeaf(entry: unknown): string {
  const rec = (entry ?? {}) as Record<string, unknown>;
  const benefit = str(rec.benefit);
  if (!benefit) return ACTIVITY_NOT_ON_RECORD;
  const fact = str(rec.supporting_record_fact);
  return leaf(fact ? `${sentence(benefit)} The record supports this: ${sentence(fact)}` : sentence(benefit));
}

function benefitFor(analytics: Record<string, unknown>, cls: string): unknown {
  const rows = Array.isArray(analytics.benefits) ? analytics.benefits : [];
  return rows.find((b) => (b as Record<string, unknown>)?.beneficiary_class === cls);
}

function adverseEffects(analytics: Record<string, unknown>): RiskAdverseEffect[] {
  const rows = Array.isArray(analytics.harm_causation) ? analytics.harm_causation : [];
  const out: RiskAdverseEffect[] = [];
  for (const raw of rows) {
    const h = (raw ?? {}) as Record<string, unknown>;
    const label = str(h.harm_label);
    if (!label) continue;
    const parts = [
      str(h.data_involved) ? `Data involved: ${sentence(str(h.data_involved))}` : "",
      str(h.source) ? `Source: ${sentence(str(h.source))}` : "",
      str(h.cause) ? `Cause: ${sentence(str(h.cause))}` : "",
      str(h.pathway) ? `Pathway: ${sentence(str(h.pathway))}` : "",
    ].filter(Boolean).join(" ");
    out.push({
      harm_type: label,
      likelihood: str(h.likelihood) || "Not stated",
      severity: str(h.severity) || "Not stated",
      description: parts || ACTIVITY_NOT_ON_RECORD,
    });
  }
  return out;
}

const GAP_STATUSES = new Set(["Planned, not yet implemented", "None", "not stated on the record"]);

function safeguardLeaves(analytics: Record<string, unknown>): {
  current: string;
  gaps: string;
} {
  const rows = Array.isArray(analytics.safeguard_map) ? analytics.safeguard_map : [];
  const current: string[] = [];
  const gaps: string[] = [];
  for (const raw of rows) {
    const g = (raw ?? {}) as Record<string, unknown>;
    const name = str(g.safeguard);
    if (!name) continue;
    const status = typeof g.safeguard_status === "string" ? g.safeguard_status : "";
    if (GAP_STATUSES.has(status)) {
      gaps.push(
        status === "None"
          ? `${name}: the record records no implementation.`
          : status === "Planned, not yet implemented"
            ? `${name}: planned, and not yet in place.`
            : `${name}: implementation status is not on the record.`,
      );
    } else {
      current.push(
        status === "Implemented and tested"
          ? `${name}, implemented and tested.`
          : `${name}, implemented.`,
      );
    }
  }
  return {
    current: leaf(current.join(" ")),
    gaps: gaps.length
      ? leaf(gaps.join(" "))
      : current.length
        ? "The record names no safeguard that is planned-only or absent for this activity."
        : ACTIVITY_NOT_ON_RECORD,
  };
}

/**
 * ITEM 428-C (DEFECT 2) — the weighing outcome the analytics actually reached,
 * read off `weighing[].outweigh_determination`. Deterministic, no model.
 */
export function weighingOutcome(analytics: Record<string, unknown>): {
  rows: number;
  benefitsAll: boolean;
  impactsAll: boolean;
  impactsSome: string[];
  close: boolean;
  undetermined: boolean;
} {
  const rows = Array.isArray(analytics.weighing) ? analytics.weighing : [];
  const det = rows.map((r) => String((r as Record<string, unknown>)?.outweigh_determination ?? ""));
  const impactsSome = rows
    .filter((r) => String((r as Record<string, unknown>)?.outweigh_determination ?? "") === "impacts_outweigh")
    .map((r) => str((r as Record<string, unknown>)?.beneficiary_class))
    .filter(Boolean);
  return {
    rows: rows.length,
    benefitsAll: rows.length > 0 && det.every((d) => d === "benefits_outweigh"),
    impactsAll: rows.length > 0 && det.every((d) => d === "impacts_outweigh"),
    impactsSome,
    close: det.includes("close_balance"),
    undetermined: rows.length === 0 || det.includes("undetermined_on_the_record"),
  };
}

/** The § 7152(a)(7) initiation reservation, in the deterministic register. */
const INITIATION_RESERVED_CLAUSE =
  "the decision whether to initiate the processing rests with the business under 11 CCR § 7152(a)(7)";

/**
 * The § 7152(a)(7) conclusion, in CUSTOMER words. The machine `decision` enum
 * stays in `activity_analytics` (item 392 discipline) and is never copied here.
 *
 * ITEM 428-C (DEFECT 2): `reserved_insufficient_record` — the C0/C1 enum the
 * consequence rules emit when § 7152(a)(8)-(9) review-and-approval information
 * is absent, or a required analytic element is not supported — used to fall to
 * the DEFAULT branch ("The record does not yet support a balance
 * determination"), which contradicted a document whose weighing classes all
 * concluded benefits-outweigh. The enum is CORRECT (the initiation decision is
 * reserved by law on that record; it is not a weighing failure), so the
 * conclusion now states the weighing outcome the analytics reached and notes
 * the reservation. `prohibit` / `restrict` / `initiate_with_modifications` are
 * mapped for the same reason — they are the emitted vocabulary of the same
 * switch. The default branch remains for genuinely unresolved records.
 */
export function outweighConclusion(decision: unknown, analyticsRaw?: unknown): string {
  const a = (analyticsRaw ?? {}) as Record<string, unknown>;
  const w = weighingOutcome(a);
  switch (String(decision ?? "")) {
    case "initiate":
    case "benefits_outweigh":
      return "Yes — on this record the benefits of the processing outweigh the negative impacts to consumers' privacy.";
    case "do_not_initiate":
    case "prohibit":
    case "impacts_outweigh":
      return "No — on this record the negative impacts to consumers' privacy outweigh the benefits of the processing.";
    case "restrict":
      return `On this record the negative impacts to consumers' privacy are not outweighed by the stated benefit for ${
        w.impactsSome.length ? w.impactsSome.join(", ") : "at least one beneficiary class"
      }, and the processing may proceed only as restricted to the uses that do weigh out; ${INITIATION_RESERVED_CLAUSE}.`;
    case "initiate_with_modifications":
      return `On this record the benefits of the processing outweigh the negative impacts to consumers' privacy once the recorded modifications are made; ${INITIATION_RESERVED_CLAUSE}.`;
    case "close_balance":
      return `The benefits and the negative impacts are closely balanced on this record; ${INITIATION_RESERVED_CLAUSE}.`;
    case "reserved":
    case "reserved_insufficient_record":
      if (w.benefitsAll) {
        return `On this record the benefits of the processing outweigh the negative impacts to consumers' privacy for every beneficiary class 11 CCR § 7152(a)(4) enumerates; ${INITIATION_RESERVED_CLAUSE}.`;
      }
      if (w.impactsAll) {
        return `On this record the negative impacts to consumers' privacy outweigh the benefits of the processing for every beneficiary class 11 CCR § 7152(a)(4) enumerates; ${INITIATION_RESERVED_CLAUSE}.`;
      }
      if (w.impactsSome.length > 0) {
        return `On this record the negative impacts to consumers' privacy are not outweighed by the stated benefit for ${w.impactsSome.join(", ")}; ${INITIATION_RESERVED_CLAUSE}.`;
      }
      if (w.close && !w.undetermined) {
        return `The benefits and the negative impacts are closely balanced on this record; ${INITIATION_RESERVED_CLAUSE}.`;
      }
      return "The record does not yet support a balance determination for this activity.";
    default:
      return "The record does not yet support a balance determination for this activity.";
  }
}


function outweighRationale(analytics: Record<string, unknown>): string {
  const weighing = Array.isArray(analytics.weighing) ? analytics.weighing : [];
  const parts: string[] = [];
  for (const raw of weighing) {
    const w = (raw ?? {}) as Record<string, unknown>;
    const cls = str(w.beneficiary_class);
    const reason = str(w.reasoning) || str(w.case_for);
    if (cls && reason) parts.push(`For ${cls}: ${sentence(reason)}`);
  }
  return leaf(parts.join(" "));
}

// ---------------------------------------------------------------------------
// Record + surface emission
// ---------------------------------------------------------------------------

export function buildActivityRecord(analyticsRaw: unknown): RiskActivityRecord {
  const a = (analyticsRaw ?? {}) as Record<string, unknown>;
  const basis = resolveRegistryPinpoint(ACTIVITY_BASIS_KEY);
  const { mapping, unresolved } = buildSection7152Mapping();
  const safeguards = safeguardLeaves(a);
  const consequence = (a.consequence ?? {}) as Record<string, unknown>;
  return {
    activity: leaf(str(a.activity_name)),
    purpose: leaf(str(a.activity_purpose)),
    statutory_basis: basis.pinpoint,
    benefits_to_business: benefitLeaf(benefitFor(a, "the business")),
    benefits_to_consumers: benefitLeaf(benefitFor(a, "the consumer")),
    benefits_to_other_stakeholders: benefitLeaf(benefitFor(a, "other stakeholders")),
    benefits_to_public: benefitLeaf(benefitFor(a, "the public")),
    adverse_effects: adverseEffects(a),
    current_safeguards: safeguards.current,
    safeguard_gaps: safeguards.gaps,
    section_7152_mapping: mapping,
    benefits_outweigh_risks_conclusion: outweighConclusion(consequence.decision),
    benefits_outweigh_risks_rationale: outweighRationale(a),
    _activity_key: str(a.activity_id) || undefined,
    _basis_source: basis.resolved && unresolved === 0
      ? "registry"
      : "registry_downgrade_unresolved",
  };
}

/**
 * A TRIGGERED activity: the record names the activity AND supplies at least one
 * substantive § 7152(a) input for it. Scaffold rows fail both halves.
 */
export function isTriggeredAnalyticsRow(raw: unknown): boolean {
  const a = (raw ?? {}) as Record<string, unknown>;
  if (!str(a.activity_name)) return false;
  const benefits = Array.isArray(a.benefits) ? a.benefits : [];
  const hasBenefit = benefits.some((b) => str((b as Record<string, unknown>)?.benefit));
  const harms = Array.isArray(a.harm_causation) ? a.harm_causation : [];
  const hasHarm = harms.some((h) => str((h as Record<string, unknown>)?.harm_label));
  const guards = Array.isArray(a.safeguard_map) ? a.safeguard_map : [];
  const hasGuard = guards.some((g) => str((g as Record<string, unknown>)?.safeguard));
  return Boolean(str(a.activity_purpose) || hasBenefit || hasHarm || hasGuard);
}

export interface ActivityNormalizeSummary {
  action: "typed" | "left_legacy" | "omitted";
  emitted: number;
  downgraded: number;
  padding_removed: boolean;
  prior_shape: string;
}

/**
 * SINGLE WRITE SITE for the SHAPE of `risk_assessment_by_activity`.
 *
 * • triggered activities on the record ⇒ one canonical thirteen-leaf record each
 * • no analytics and no prior content  ⇒ the empty-array padding is DELETED
 * • no analytics with prior content    ⇒ LEFT UNTOUCHED (fail-open)
 */
export function normalizeRiskActivities(
  report: Record<string, unknown>,
  intake: unknown,
  analyticsOverride?: readonly unknown[],
): ActivityNormalizeSummary {
  const view = coerceActivityView(report.risk_assessment_by_activity);
  const hadKey = "risk_assessment_by_activity" in report;

  let analytics: unknown[] = Array.isArray(analyticsOverride) ? [...analyticsOverride] : [];
  if (analytics.length === 0) {
    const onReport = report.activity_analytics;
    if (Array.isArray(onReport) && onReport.length > 0) analytics = [...onReport];
  }
  if (analytics.length === 0) {
    try {
      analytics = buildActivityAnalytics(
        (intake && typeof intake === "object" ? intake : {}) as Record<string, unknown>,
      ) as unknown[];
    } catch {
      analytics = [];
    }
  }

  // THE ANTI-PADDING RULE. `buildActivityAnalytics` returns a scaffold row even
  // for a record that names no activity; a scaffold row is NOT a triggered
  // activity and must never become a thirteen-leaf record of absences.
  analytics = analytics.filter(isTriggeredAnalyticsRow);

  if (analytics.length === 0) {
    if (hadKey && !view.present) {
      delete report.risk_assessment_by_activity;
      return { action: "omitted", emitted: 0, downgraded: 0, padding_removed: true, prior_shape: view.shape };
    }
    return { action: "left_legacy", emitted: view.rows.length + view.texts.length, downgraded: 0, padding_removed: false, prior_shape: view.shape };
  }

  const records = analytics.map(buildActivityRecord);
  const downgraded = records.filter((r) => r._basis_source === "registry_downgrade_unresolved").length;
  const padding = hadKey && !view.present;
  report.risk_assessment_by_activity = records;
  return { action: "typed", emitted: records.length, downgraded, padding_removed: padding, prior_shape: view.shape };
}
