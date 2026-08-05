// ITEM 381 — INTAKE COMPLETENESS COACH, LAYER 1. Parity mirror of the gate.
//
// PARITY GUARD. The review step must NEVER fork from the item380r5 truth gate.
// This module is a line-for-line mirror of the asked/empty semantics in
// supabase/functions/_shared/ltp/record-complete.ts:
//   * SYSTEM_KEYS          — contract entries no form control presents.
//   * emptyIsAnswer        — the form presents the control unconditionally and
//                            the empty state IS a substantive answer.
//   * conditional triggers — a conditional whose trigger the record does not
//                            show was never asked.
// It is kept as a separate browser-side module (the gate module pulls in the
// Deno-side prose machinery), and tests/edge/item381/coach-parity.test.ts
// asserts field-by-field equality of the two implementations on the shared
// perfect + degraded goldens.
//
// LAWS: pure, deterministic, zero model/API calls.

/** Structural mirror of IntakeField (supabase/functions/_shared/intake-contracts/types.ts). */
export interface CoachField {
  key: string;
  required: "always" | "conditional" | "optional";
  trigger?: { key: string; equals: readonly string[] };
  emptyIsAnswer?: true;
}

export interface CoachContract {
  tool_type: string;
  fields: readonly CoachField[];
}

/** Mirrors record-complete.ts SYSTEM_KEYS. */
export const COACH_SYSTEM_KEYS: ReadonlySet<string> = new Set<string>([
  "source_assessment_id",
]);

/** Mirrors record-complete.ts isEmptyValue. */
export function isEmptyValue(v: unknown): boolean {
  if (v === "" || v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

/** Mirrors record-complete.ts readPath — `a.b[].c`, array segments fan out. */
export function readPath(root: unknown, key: string): unknown[] {
  let frontier: unknown[] = [root];
  for (const raw of key.split(".")) {
    const isArr = raw.endsWith("[]");
    const seg = isArr ? raw.slice(0, -2) : raw;
    const next: unknown[] = [];
    for (const node of frontier) {
      if (!node || typeof node !== "object") continue;
      const v = (node as Record<string, unknown>)[seg];
      if (isArr) {
        if (Array.isArray(v)) next.push(...v);
      } else next.push(v);
    }
    frontier = next;
  }
  return frontier;
}

/** Mirrors record-complete.ts conditionalTriggered. */
function conditionalTriggered(intake: Record<string, unknown>, f: CoachField): boolean {
  if (f.trigger) {
    const vals = readPath(intake, f.trigger.key);
    return vals.some((v) => typeof v === "string" && f.trigger!.equals.includes(v));
  }
  if (!f.key.includes("[]")) return false;
  const parent = f.key.slice(0, f.key.indexOf("[]") + 2);
  return readPath(intake, parent).length > 0;
}

/** True when the intake ACTUALLY ASKED this question of this record. */
export function fieldWasAsked(contract: CoachContract, key: string, intake: unknown): boolean {
  const f = contract.fields.find((x) => x.key === key);
  if (!f) return false;
  if (COACH_SYSTEM_KEYS.has(f.key)) return false;
  if (f.emptyIsAnswer === true) return false;
  if (f.required === "conditional" && !conditionalTriggered(asRecord(intake), f)) return false;
  return true;
}

function asRecord(intake: unknown): Record<string, unknown> {
  return (intake && typeof intake === "object" ? intake : {}) as Record<string, unknown>;
}

/** Mirrors record-complete.ts emptyAskedKeys exactly. */
export function coachEmptyAskedKeys(contract: CoachContract, intake: unknown): string[] {
  const rec = asRecord(intake);
  const out: string[] = [];
  for (const f of contract.fields) {
    if (COACH_SYSTEM_KEYS.has(f.key)) continue;
    if (f.emptyIsAnswer === true) continue;
    if (f.required === "conditional" && !conditionalTriggered(rec, f)) continue;
    const values = readPath(rec, f.key);
    if (values.length === 0 || values.every(isEmptyValue)) out.push(f.key);
  }
  return out;
}

/** Every contract key the intake asked of this record (answered or not). */
export function askedKeys(contract: CoachContract, intake: unknown): string[] {
  const rec = asRecord(intake);
  const out: string[] = [];
  for (const f of contract.fields) {
    if (COACH_SYSTEM_KEYS.has(f.key)) continue;
    if (f.emptyIsAnswer === true) continue;
    if (f.required === "conditional" && !conditionalTriggered(rec, f)) continue;
    out.push(f.key);
  }
  return out;
}
