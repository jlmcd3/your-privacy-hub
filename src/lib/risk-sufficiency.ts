/**
 * ITEM 425 — FRONTEND MIRROR of the canonical record-sufficiency record.
 *
 * Byte-equivalent logic to
 * supabase/functions/_shared/report-contracts/risk-sufficiency.ts.
 * Deno edge code cannot import from src/, so this module is the sanctioned
 * mirror; the ITEM 425 parity test pins both to identical verdicts and
 * identical formatter output.
 */

export const RISK_SUFFICIENCY_CONTRACT_VERSION = "risk-sufficiency@2026-08-09-item425";

export interface RiskSufficiencyElement {
  /** Customer-facing element label (registry label — never model-authored). */
  element: string;
  /** § 7152(a) pinpoint for that element (registry anchor — deterministic). */
  pinpoint: string;
  /** Closed status clause (RECORD_STATUS_CLAUSES / reserved-decision clause). */
  status: string;
  /** Optional supporting clause (weight_note class). */
  basis?: string;
}

export interface RiskSufficiencyRecord {
  complete: boolean;
  statement: string;
  elements: RiskSufficiencyElement[];
}

export type RiskSufficiencyShape =
  | "typed"
  | "legacy_object"
  | "string_list"
  | "string"
  | "absent";

export interface RiskSufficiencyView {
  shape: RiskSufficiencyShape;
  /** null when the shape carries no gate verdict (string/list shapes). */
  complete: boolean | null;
  statement: string;
  elements: RiskSufficiencyElement[];
  /** Legacy paragraph list — always populated, so text renderers never blank. */
  paragraphs: string[];
}

function isElement(v: unknown): v is RiskSufficiencyElement {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const e = v as Record<string, unknown>;
  return typeof e.element === "string" && e.element.trim().length > 0
    && typeof e.pinpoint === "string"
    && typeof e.status === "string";
}

/** Type guard — the ITEM 425 typed record (elements array present). */
export function isRiskSufficiencyRecord(v: unknown): v is RiskSufficiencyRecord {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const r = v as Record<string, unknown>;
  return Array.isArray(r.elements) && typeof r.statement === "string";
}

/** One rendered ledger line for an element (text fallback / PDF text path). */
export function formatSufficiencyElement(el: RiskSufficiencyElement): string {
  const basis = el.basis && el.basis.trim().length > 0 ? ` ${el.basis.trim()}` : "";
  const pin = el.pinpoint && el.pinpoint.trim().length > 0 ? ` (${el.pinpoint.trim()})` : "";
  return `${el.element}: ${el.status}${pin}.${basis}`.replace(/\.\./g, ".");
}

/** FOUR-SHAPE READER. Never throws; never drops content. */
export function coerceSufficiencyView(raw: unknown): RiskSufficiencyView {
  if (raw === null || raw === undefined) {
    return { shape: "absent", complete: null, statement: "", elements: [], paragraphs: [] };
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    return {
      shape: "string",
      complete: null,
      statement: s,
      elements: [],
      paragraphs: s ? [s] : [],
    };
  }
  if (Array.isArray(raw)) {
    const paragraphs = raw
      .map((x) => (typeof x === "string" ? x : isElement(x) ? formatSufficiencyElement(x) : ""))
      .filter((s) => s.trim().length > 0);
    const elements = raw.filter(isElement);
    return {
      shape: "string_list",
      complete: null,
      statement: paragraphs[0] ?? "",
      elements,
      paragraphs,
    };
  }
  if (typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const elements = Array.isArray(r.elements) ? r.elements.filter(isElement) : [];
    const statement = typeof r.statement === "string"
      ? r.statement
      : typeof r.prose === "string"
        ? r.prose
        : "";
    const complete = typeof r.complete === "boolean" ? r.complete : null;
    const paragraphs = [statement, ...elements.map(formatSufficiencyElement)]
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return {
      shape: isRiskSufficiencyRecord(raw) ? "typed" : "legacy_object",
      complete,
      statement: statement.trim(),
      elements,
      paragraphs,
    };
  }
  return { shape: "absent", complete: null, statement: "", elements: [], paragraphs: [] };
}

/** Legacy text projection — for renderers that only speak `string[]`. */
export function sufficiencyParagraphs(raw: unknown): string[] | undefined {
  const v = coerceSufficiencyView(raw);
  return v.paragraphs.length > 0 ? v.paragraphs : undefined;
}
