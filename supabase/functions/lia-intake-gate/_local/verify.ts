// DOC 217 §3 — code verification of the model's gate payload.

import { isGateReasonCode, isLiaFreeTextField, type GateReasonCode } from "./codes.ts";

export interface GateResult {
  field_id: string;
  verdict: "conforms" | "non_conforming";
  reason_codes: GateReasonCode[];
  other_limb_field: string | null;
  evidence_span: string | null;
  checks: { codes_ok: boolean; span_ok: boolean; other_limb_ok: boolean };
}

/** A byte-substring check on the UTF-8 encoding of both strings. */
export function isByteSubstring(span: string, answer: string): boolean {
  const enc = new TextEncoder();
  const s = enc.encode(span);
  const a = enc.encode(answer);
  if (s.length === 0 || s.length > a.length) return false;
  outer: for (let i = 0; i + s.length <= a.length; i++) {
    for (let j = 0; j < s.length; j++) if (a[i + j] !== s[j]) continue outer;
    return true;
  }
  return false;
}

export function verifyGateItem(item: unknown, answer: string): GateResult | null {
  const o = (item ?? {}) as Record<string, unknown>;
  const field_id = typeof o.field_id === "string" ? o.field_id : "";
  if (!field_id) return null;

  const rawCodes = Array.isArray(o.reason_codes) ? o.reason_codes : [];
  const codes = [...new Set(rawCodes.filter(isGateReasonCode))] as GateReasonCode[];
  const codes_ok = codes.length === rawCodes.length;

  let span = typeof o.evidence_span === "string" && o.evidence_span.length > 0
    ? o.evidence_span
    : null;
  const span_ok = span === null || isByteSubstring(span, answer);
  if (!span_ok) span = null;

  let other = typeof o.other_limb_field === "string" && o.other_limb_field.length > 0
    ? o.other_limb_field
    : null;
  // The column is only meaningful with the matching code, and only for a known field id.
  const other_limb_ok = other === null ||
    (isLiaFreeTextField(other) && codes.includes("fact_belongs_to_other_limb"));
  if (!other_limb_ok) other = null;

  let verdict: "conforms" | "non_conforming" =
    o.verdict === "non_conforming" ? "non_conforming" : "conforms";
  // A verdict is only non-conforming if a surviving code supports it.
  if (verdict === "non_conforming" && codes.length === 0) verdict = "conforms";
  if (verdict === "conforms" && codes.length > 0) verdict = "non_conforming";

  return {
    field_id,
    verdict,
    reason_codes: verdict === "conforms" ? [] : codes,
    other_limb_field: other,
    evidence_span: span,
    checks: { codes_ok, span_ok, other_limb_ok },
  };
}
