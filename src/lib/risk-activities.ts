/**
 * ITEM 427 — FRONTEND MIRROR of the risk `risk_assessment_by_activity` contract.
 *
 * Deno edge code cannot import from src/, so this is the sanctioned mirror of
 * supabase/functions/_shared/report-contracts/risk-activities.ts. Both trees
 * MUST discriminate on `coerceActivityView` and nothing else; the parity test
 * pins the two implementations to the same verdicts.
 */

export const RISK_ACTIVITIES_CONTRACT_VERSION = "risk-activities@2026-08-09-item427";

export interface RiskAdverseEffect {
  harm_type: string;
  likelihood: string;
  severity: string;
  description: string;
}

export interface RiskSectionMapping {
  element: string;
  pinpoint: string;
}

export interface RiskActivityRecord {
  activity: string;
  purpose: string;
  statutory_basis: string;
  benefits_to_business: string;
  benefits_to_consumers: string;
  benefits_to_other_stakeholders: string;
  benefits_to_public: string;
  adverse_effects: RiskAdverseEffect[];
  current_safeguards: string;
  safeguard_gaps: string;
  section_7152_mapping: RiskSectionMapping[];
  benefits_outweigh_risks_conclusion: string;
  benefits_outweigh_risks_rationale: string;
  _activity_key?: string;
  _basis_source?: string;
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

export type ActivityShape = "absent" | "empty" | "strings" | "legacy_objects" | "typed";

export interface ActivityView {
  shape: ActivityShape;
  present: boolean;
  texts: string[];
  rows: Record<string, unknown>[];
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
