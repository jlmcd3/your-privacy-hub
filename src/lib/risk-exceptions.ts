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

// ---------------------------------------------------------------------------
// Doc 261-review (2026-09-15, LEGAL 03 / LEGAL 04 / EX 04) — FRONTEND MIRROR of
// the deterministic pinpoint registry in
// supabase/functions/_shared/report-contracts/risk-exceptions.ts. The intake
// page used to carry its own hand-typed citations for the eight business-
// purpose / exemption cards, and two of them had drifted from the engine
// ((e)(8) for internal research, (e)(1) for the consumer-requested card).
// The engine's table is the source of truth; the page reads this mirror and
// tests/edge/item426/exception-pin-mirror.test.ts pins the two byte-for-byte.
// ---------------------------------------------------------------------------

export const EXCEPTION_PIN: Readonly<Record<string, string>> = {
  fraud_detection:
    "Cal. Civ. Code § 1798.140(e)(2) (security-and-integrity business purpose; see § 1798.140(ac)); deletion requests: § 1798.105(d)(2)",
  security_integrity:
    "Cal. Civ. Code § 1798.140(e)(2) (security-and-integrity business purpose; see § 1798.140(ac)); deletion requests: § 1798.105(d)(2)",
  debugging: "Cal. Civ. Code § 1798.140(e)(3); deletion requests: § 1798.105(d)(3)",
  transient_use: "Cal. Civ. Code § 1798.140(e)(4)",
  internal_research:
    "Cal. Civ. Code § 1798.140(e)(7); deletion requests: § 1798.105(d)(6) (informed consent) or (d)(7)",
  legal_compliance:
    "Cal. Civ. Code § 1798.145(a)(1)(A)–(B); deletion requests: § 1798.105(d)(8)",
  consumer_request:
    "Cal. Civ. Code § 1798.105(d)(1) (complete the transaction / provide the requested good or service)",
  employment_context:
    "NO CURRENT STATUTORY EXEMPTION — § 1798.145(m) inoperative since 2023-01-01; flag for counsel review",
};

export const EXCEPTION_LABELS: Readonly<Record<string, string>> = {
  fraud_detection: "Fraud detection",
  security_integrity: "Security and integrity",
  debugging: "Debugging",
  transient_use: "Transient use",
  internal_research: "Internal research",
  legal_compliance: "Legal compliance",
  consumer_request: "Consumer-requested transaction",
  employment_context: "Employment context",
};

/**
 * The short, user-facing pinpoint for an intake card: the registry entry up
 * to its first "; " (the deletion-request cross-reference is report detail,
 * not a label). The employment-context entry is returned whole because its
 * whole point is the warning.
 */
export function exceptionPinpoint(key: string): string {
  const full = EXCEPTION_PIN[key] ?? "";
  if (key === "employment_context") return "No current statutory exemption (former § 1798.145(m) inoperative since January 1, 2023) — additional information required";
  const i = full.indexOf("; ");
  return i === -1 ? full : full.slice(0, i);
}

