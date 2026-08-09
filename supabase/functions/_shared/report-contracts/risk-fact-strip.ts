/**
 * ITEM 428 (PIECE B) — THE RISK FACT STRIP.
 *
 * `assessment_summary` is no longer a prose surface. It is the TYPED fact
 * strip: nine leaves, every one of them lifted from a typed source (the
 * intake, the § 7152 activity emission, the exception emission and the gate
 * signals). Nothing here is model-composed, and no leaf restates the
 * executive summary's verdict in prose.
 *
 * READERS FIRST: `coerceFactStrip` is tolerant of every shape a stored
 * document can carry — canonical strip, the legacy narrative bag, a bare
 * string, an array, absent — and never throws.
 */

export const RISK_FACT_STRIP_TYPE = "risk-fact-strip@item428";
export const RISK_FACT_STRIP_CONTRACT_VERSION = "risk-fact-strip-contract@item428-2026-08-09";

export interface RiskFactStrip {
  readonly _typed: typeof RISK_FACT_STRIP_TYPE;
  readonly company_name: string;
  readonly sector: string;
  readonly assessment_date: string;
  readonly overall_risk_level: string;
  readonly triggered_activities: readonly string[];
  readonly exceptions_claimed: readonly string[];
  readonly exceptions_status: string;
  readonly admt_disclosure_required: boolean;
  readonly cybersecurity_audit_required: boolean;
}

export interface FactStripView {
  /** true when the surface carries something a reader should render. */
  readonly present: boolean;
  /** true only for the canonical item428 strip. */
  readonly typed: boolean;
  /** legacy prose carried on the surface (narrative bag / bare string). */
  readonly legacy_narrative?: string;
  readonly strip?: RiskFactStrip;
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : v === null || v === undefined ? "" : String(v).trim());
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => str(x)).filter((s) => s.length > 0) : [];

export function isRiskFactStrip(v: unknown): v is RiskFactStrip {
  return !!v && typeof v === "object" && !Array.isArray(v) &&
    (v as Record<string, unknown>)._typed === RISK_FACT_STRIP_TYPE;
}

/** Tolerant reader — five shapes, never throws. */
export function coerceFactStrip(v: unknown): FactStripView {
  if (v === null || v === undefined) return { present: false, typed: false };
  if (typeof v === "string") {
    const s = v.trim();
    return s ? { present: true, typed: false, legacy_narrative: s } : { present: false, typed: false };
  }
  if (Array.isArray(v)) {
    const s = v.map((x) => str(x)).filter((x) => x.length > 0).join("\n\n");
    return s ? { present: true, typed: false, legacy_narrative: s } : { present: false, typed: false };
  }
  if (typeof v !== "object") return { present: false, typed: false };
  const o = v as Record<string, unknown>;
  if (isRiskFactStrip(o)) {
    return { present: true, typed: true, strip: buildFactStrip(o) };
  }
  const narrative = str(o.narrative);
  const present = !!(narrative || str(o.company_name) || str(o.assessment_date) || str(o.overall_risk_level));
  return {
    present,
    typed: false,
    ...(narrative ? { legacy_narrative: narrative } : {}),
  };
}

/** Normalise any partial leaf bag into the canonical strip. Pure, never throws. */
export function buildFactStrip(src: Record<string, unknown>): RiskFactStrip {
  return {
    _typed: RISK_FACT_STRIP_TYPE,
    company_name: str(src.company_name),
    sector: str(src.sector),
    assessment_date: str(src.assessment_date),
    overall_risk_level: str(src.overall_risk_level),
    triggered_activities: list(src.triggered_activities),
    exceptions_claimed: list(src.exceptions_claimed),
    exceptions_status: str(src.exceptions_status),
    admt_disclosure_required: src.admt_disclosure_required === true,
    cybersecurity_audit_required: src.cybersecurity_audit_required === true,
  };
}

/** Plain-text projection, for viewers that render a single string. */
export function factStripText(view: FactStripView): string {
  if (!view.present) return "";
  if (!view.typed || !view.strip) return view.legacy_narrative ?? "";
  const s = view.strip;
  const rows: [string, string][] = [
    ["Company", s.company_name],
    ["Sector", s.sector],
    ["Assessment date", s.assessment_date],
    ["Overall risk level", s.overall_risk_level],
    ["Triggered activities", s.triggered_activities.join("; ")],
    ["Exceptions claimed", s.exceptions_claimed.join("; ")],
    ["Exceptions status", s.exceptions_status],
    ["ADMT disclosure required", s.admt_disclosure_required ? "Yes" : "No"],
    ["Cybersecurity audit required", s.cybersecurity_audit_required ? "Yes" : "No"],
  ];
  return rows.filter(([, v]) => v.trim().length > 0).map(([k, v]) => `${k}: ${v}`).join("\n");
}
