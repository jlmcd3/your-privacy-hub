// ITEM 428 (PIECE B) — frontend twin of
// supabase/functions/_shared/report-contracts/risk-fact-strip.ts.
//
// `assessment_summary` is the TYPED fact strip: every value comes from a typed
// source and renders as a table, never prose. Legacy shapes are untouched.

export const RISK_FACT_STRIP_TYPE = "risk-fact-strip@item428";

const str = (v: unknown): string =>
  typeof v === "string" ? v.trim() : v === null || v === undefined ? "" : String(v).trim();

const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => str(x)).filter((s) => s.length > 0) : [];

const flag = (v: unknown): string => (v === true ? "Yes" : v === false ? "No" : "");

/** Label/value rows for the fact strip, empty values dropped. */
export function factStripRows(strip: Record<string, any>): [string, string][] {
  const rows: [string, string][] = [
    ["Company", str(strip.company_name)],
    ["Sector", str(strip.sector)],
    ["Assessment date", str(strip.assessment_date)],
    ["Overall risk level", str(strip.overall_risk_level)],
    ["Triggered activities", list(strip.triggered_activities).join("; ")],
    ["Exceptions claimed", list(strip.exceptions_claimed).join("; ")],
    ["Exceptions status", str(strip.exceptions_status)],
    ["ADMT disclosure required", flag(strip.admt_disclosure_required)],
    ["Cybersecurity audit required", flag(strip.cybersecurity_audit_required)],
  ];
  return rows.filter(([, v]) => v.length > 0);
}
