/**
 * ITEM 426 — FRONTEND MIRROR of the risk `exception_analysis` contract.
 *
 * Deno edge code cannot import from src/, so this is the sanctioned mirror of
 * supabase/functions/_shared/report-contracts/risk-exceptions.ts. Both trees
 * MUST discriminate on `coerceExceptionView` and nothing else; the parity test
 * pins the two implementations to the same verdicts.
 */

export const RISK_EXCEPTIONS_CONTRACT_VERSION = "risk-exceptions@2026-08-09-item426";

export interface RiskException {
  exception_name: string;
  claimed: boolean;
  statutory_basis: string;
  scope_described: string;
  safeguards_described: string;
  documentation_status: string;
  missing_elements: string[];
  validity_assessment: string;
  flags: string[];
  _exception_key?: string;
  _basis_source?: string;
}

export function isRiskException(v: unknown): v is RiskException {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.exception_name === "string" &&
    typeof o.claimed === "boolean" &&
    typeof o.statutory_basis === "string" &&
    typeof o.documentation_status === "string" &&
    Array.isArray(o.missing_elements) &&
    typeof o.validity_assessment === "string" &&
    Array.isArray(o.flags)
  );
}

export type ExceptionShape = "absent" | "empty" | "strings" | "legacy_objects" | "typed";

export interface ExceptionView {
  shape: ExceptionShape;
  present: boolean;
  texts: string[];
  rows: Record<string, unknown>[];
  typed: RiskException[];
}

const EMPTY_VIEW: ExceptionView = {
  shape: "absent",
  present: false,
  texts: [],
  rows: [],
  typed: [],
};

export function coerceExceptionView(value: unknown): ExceptionView {
  if (value === undefined || value === null) return { ...EMPTY_VIEW, shape: "absent" };

  if (typeof value === "string") {
    const t = value.trim();
    return t
      ? { shape: "strings", present: true, texts: [value], rows: [], typed: [] }
      : { ...EMPTY_VIEW, shape: "empty" };
  }

  if (!Array.isArray(value) && typeof value === "object") {
    const row = value as Record<string, unknown>;
    return {
      shape: isRiskException(row) ? "typed" : "legacy_objects",
      present: true,
      texts: [],
      rows: [row],
      typed: isRiskException(row) ? [row] : [],
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
  const typed = rows.filter(isRiskException) as unknown as RiskException[];
  return {
    shape: typed.length === rows.length ? "typed" : "legacy_objects",
    present: true,
    texts,
    rows,
    typed,
  };
}

export function exceptionViewText(view: ExceptionView): string[] {
  if (view.shape === "strings") return view.texts.slice();
  const out = view.texts.slice();
  for (const r of view.rows) {
    const name = typeof r.exception_name === "string" && r.exception_name.trim()
      ? r.exception_name.trim()
      : "Exception";
    const basis = typeof r.statutory_basis === "string" ? r.statutory_basis.trim() : "";
    const claimed = r.claimed === true ? "Claimed" : r.claimed === false ? "Not claimed" : "";
    const body = [
      typeof r.facts_supporting === "string" ? r.facts_supporting.trim() : "",
      typeof r.scope_described === "string" ? r.scope_described.trim() : "",
      typeof r.safeguards_described === "string" ? r.safeguards_described.trim() : "",
      typeof r.documentation_status === "string" ? r.documentation_status.trim() : "",
      typeof r.validity_assessment === "string" ? r.validity_assessment.trim() : "",
      typeof r.argument_strength_rationale === "string" ? r.argument_strength_rationale.trim() : "",
    ].filter(Boolean).join(" ");
    const head = [name, claimed, basis].filter(Boolean).join(" — ");
    out.push(body ? `${head}. ${body}` : `${head}.`);
  }
  return out;
}
