/**
 * ITEM 427 — RISK `risk_assessment_by_activity` CANONICAL CONTRACT.
 *
 * The surface is MULTI-SHAPED in the wild (verified live 2026-08-09):
 *   • absent            — no key (reserved-judgment / early documents)
 *   • empty array       — the padding state
 *   • string[]          — the shipped LTP prose list (bd76fc07-…, ae70c6f0-…,
 *                         55bc938d-…, and the item425 acceptance pilot)
 *   • legacy object[]   — the loop2 ELEVEN-leaf records (V4 PDF table)
 *   • canonical record  — the eleven loop2 leaves PLUS the two § 7152(a)(4)
 *                         beneficiary classes the quartet requires, restored
 *                         by this item
 *
 * Readers MUST tolerate all five states; `coerceActivityView` is the ONE
 * discriminator every reader consumes (edge + frontend mirror at
 * src/lib/risk-activities.ts).
 *
 * LAW (items 422-B/C, 425, 426): `statutory_basis` and every pinpoint inside
 * `section_7152_mapping` are DETERMINISTIC — registry-sourced from the
 * § 7152(a) element map, never model-authored. An unresolvable element takes
 * the honest downgrade.
 *
 * DIVISION OF LABOUR with `activity_analytics` (item 392 discipline):
 *   • THIS surface is CUSTOMER PROSE — leaves a reader reads end to end.
 *   • `activity_analytics` is MACHINE TELEMETRY with reader labels — enums,
 *     harm ids, verbatim catalogue text, citations, bands.
 * No fact is asserted twice in the same words: a typed leaf here never carries
 * a machine-keyed analytics value verbatim (`ANALYTICS_MACHINE_KEYS`).
 */

export const RISK_ACTIVITIES_CONTRACT_VERSION = "risk-activities@2026-08-09-item427";

/** Honest downgrade for an element the § 7152(a) registry cannot resolve. */
export const ACTIVITY_DOWNGRADE_PINPOINT =
  "Statutory pinpoint not resolved on this record — counsel review required";

/** Machine-keyed `activity_analytics` leaves that must never be copied here. */
export const ANALYTICS_MACHINE_KEYS: readonly string[] = [
  "harm_id",
  "harm_pinpoint",
  "harm_verbatim",
  "citation",
  "inherent_band",
  "residual_band",
  "residual_statement",
  "verdict",
  "sufficiency",
  "outweigh_determination",
  "asserted_status",
  "safeguard_status",
  "generic_benefit_flag",
  "offsetting_harm_ids",
  "harm_ids",
  "rule_ids",
  "decision",
  "status",
];

// ---------------------------------------------------------------------------
// The canonical record — ELEVEN loop2 leaves + TWO beneficiary classes.
// ---------------------------------------------------------------------------

export interface RiskAdverseEffect {
  harm_type: string;
  likelihood: string;
  severity: string;
  description: string;
}

export interface RiskSectionMapping {
  /** Plain-language element name (§ 7152(a) element map label). */
  element: string;
  /** DETERMINISTIC — registry-resolved pinpoint, never model-authored. */
  pinpoint: string;
}

export interface RiskActivityRecord {
  activity: string;
  purpose: string;
  /** DETERMINISTIC — registry-resolved, never model-authored. */
  statutory_basis: string;
  benefits_to_business: string;
  benefits_to_consumers: string;
  /** § 7152(a)(4) quartet — the two classes the loop2 shape omitted. */
  benefits_to_other_stakeholders: string;
  benefits_to_public: string;
  adverse_effects: RiskAdverseEffect[];
  current_safeguards: string;
  safeguard_gaps: string;
  section_7152_mapping: RiskSectionMapping[];
  benefits_outweigh_risks_conclusion: string;
  benefits_outweigh_risks_rationale: string;
  /** Provenance for audit; not part of the thirteen leaves. */
  _activity_key?: string;
  _basis_source?: "registry" | "registry_downgrade_unresolved";
}

export const RISK_ACTIVITY_LEAVES: readonly (keyof RiskActivityRecord)[] = [
  "activity",
  "purpose",
  "statutory_basis",
  "benefits_to_business",
  "benefits_to_consumers",
  "benefits_to_other_stakeholders",
  "benefits_to_public",
  "adverse_effects",
  "current_safeguards",
  "safeguard_gaps",
  "section_7152_mapping",
  "benefits_outweigh_risks_conclusion",
  "benefits_outweigh_risks_rationale",
];

export function isRiskActivityRecord(v: unknown): v is RiskActivityRecord {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.activity === "string" &&
    typeof o.purpose === "string" &&
    typeof o.statutory_basis === "string" &&
    typeof o.benefits_to_business === "string" &&
    typeof o.benefits_to_consumers === "string" &&
    typeof o.benefits_to_other_stakeholders === "string" &&
    typeof o.benefits_to_public === "string" &&
    Array.isArray(o.adverse_effects) &&
    typeof o.current_safeguards === "string" &&
    typeof o.safeguard_gaps === "string" &&
    Array.isArray(o.section_7152_mapping) &&
    typeof o.benefits_outweigh_risks_conclusion === "string" &&
    typeof o.benefits_outweigh_risks_rationale === "string"
  );
}

// ---------------------------------------------------------------------------
// THE reader — five states.
// ---------------------------------------------------------------------------

export type ActivityShape = "absent" | "empty" | "strings" | "legacy_objects" | "typed";

export interface ActivityView {
  shape: ActivityShape;
  /** true when there is renderable content (strings or object rows). */
  present: boolean;
  /** Prose elements — populated on the `strings` shape only. */
  texts: string[];
  /** Object rows — legacy objects and canonical records alike. */
  rows: Record<string, unknown>[];
  /** Rows that satisfy the canonical thirteen-leaf contract. */
  typed: RiskActivityRecord[];
}

const EMPTY_VIEW: ActivityView = Object.freeze({
  shape: "absent",
  present: false,
  texts: [],
  rows: [],
  typed: [],
}) as ActivityView;

export function coerceActivityView(value: unknown): ActivityView {
  if (value === undefined || value === null) return { ...EMPTY_VIEW, shape: "absent" };

  if (typeof value === "string") {
    const t = value.trim();
    return t
      ? { shape: "strings", present: true, texts: [value], rows: [], typed: [] }
      : { ...EMPTY_VIEW, shape: "empty" };
  }

  if (!Array.isArray(value) && typeof value === "object") {
    const row = value as Record<string, unknown>;
    const typed = isRiskActivityRecord(row);
    return {
      shape: typed ? "typed" : "legacy_objects",
      present: true,
      texts: [],
      rows: [row],
      typed: typed ? [row] : [],
    };
  }

  if (!Array.isArray(value)) return { ...EMPTY_VIEW, shape: "absent" };
  if (value.length === 0) return { ...EMPTY_VIEW, shape: "empty" };

  const texts: string[] = [];
  const rows: Record<string, unknown>[] = [];
  for (const el of value) {
    if (typeof el === "string") {
      if (el.trim()) texts.push(el);
    } else if (el && typeof el === "object" && !Array.isArray(el)) {
      rows.push(el as Record<string, unknown>);
    }
  }
  if (rows.length === 0 && texts.length === 0) return { ...EMPTY_VIEW, shape: "empty" };
  if (rows.length === 0) return { shape: "strings", present: true, texts, rows: [], typed: [] };
  const typed = rows.filter(isRiskActivityRecord) as unknown as RiskActivityRecord[];
  return {
    shape: typed.length === rows.length ? "typed" : "legacy_objects",
    present: true,
    texts,
    rows,
    typed,
  };
}

// ---------------------------------------------------------------------------
// Prose projection — every list-shaped reader renders without dropping a row.
// ---------------------------------------------------------------------------

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function activityViewText(view: ActivityView): string[] {
  if (view.shape === "strings") return view.texts.slice();
  const out = view.texts.slice();
  for (const r of view.rows) {
    const head = s(r.activity) || s(r.activity_name) || "Assessed activity";
    const body = [
      s(r.purpose),
      s(r.benefits_to_business),
      s(r.benefits_to_consumers),
      s(r.benefits_to_other_stakeholders),
      s(r.benefits_to_public),
      s(r.current_safeguards),
      s(r.safeguard_gaps),
      s(r.benefits_outweigh_risks_conclusion),
      s(r.benefits_outweigh_risks_rationale),
    ].filter(Boolean).join(" ");
    const basis = s(r.statutory_basis);
    const title = basis ? `${head} — ${basis}` : head;
    out.push(body ? `${title}. ${body}` : `${title}.`);
  }
  return out;
}

/**
 * R2/R7 at the architectural level: a typed leaf must not carry a machine-keyed
 * `activity_analytics` value verbatim. Returns the offending paths (empty ⇒ ok).
 */
export function analyticsDuplicationPaths(
  records: readonly RiskActivityRecord[],
  analytics: unknown,
): string[] {
  const machine = new Set<string>();
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (!v || typeof v !== "object") return;
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (ANALYTICS_MACHINE_KEYS.includes(k) && typeof val === "string" && val.trim()) {
        machine.add(val.trim());
      }
      walk(val);
    }
  };
  walk(analytics);
  const hits: string[] = [];
  records.forEach((rec, i) => {
    for (const leaf of RISK_ACTIVITY_LEAVES) {
      const val = (rec as Record<string, unknown>)[leaf as string];
      if (typeof val === "string" && val.trim() && machine.has(val.trim())) {
        hits.push(`risk_assessment_by_activity[${i}].${String(leaf)}`);
      }
    }
  });
  return hits;
}
