// RC-REM-P1 — validateIntake().
//
// Checks a submitted intake payload against an IntakeContract. Rules:
//   - Unknown top-level keys (excluding the well-known passthrough keys
//     enumerated in ALLOWED_TOPLEVEL_EXTRAS) → violation.
//   - enum values not verbatim-in-options → violation.
//   - multi-enum values with any element not in options → violation.
//   - required: "always" empty → violation.
//   - required: "conditional" is only mechanically checkable when
//     requiredWhen carries a supported predicate; otherwise it is left
//     unchecked here (documented predicate strings are advisory).
//
// "Empty" mirrors the isEmpty semantics used by insufficient-info-guard
// (""/null/undefined/[]/{}).

import type { IntakeContract, IntakeField } from "./types.ts";

const ALLOWED_TOPLEVEL_EXTRAS = new Set<string>([
  "assertions",
  "supplemental_responses",
  "supplemental_context",
  "client_id",
  "user_id",
  "created_at",
  "updated_at",
  "id",
  "run_id",
  "report_data",
  "meta",
  // LIA Stage-A mechanical row columns (li_assessments table). These are
  // persisted by src/pages/LIAssessment.tsx (~L158 .insert({...})) — not
  // by the Stage-B intake_data payload — but the sample-report fixture
  // for li_assessment lives at fixture.insert (the full row), so the row
  // columns coexist with the Stage-B intake fields when the row is
  // validated against liAssessmentStageBContract. Mechanical, not intake.
  "stage",           // LIAssessment.tsx L158: stage: "preview"; LIAssessmentIntake.tsx L310 sets intake_data.stage: "submitted"
  "status",          // LIAssessment.tsx L158: status: "pending"
  "preview_signal",  // LIAssessment.tsx L158: preview_signal: previewData (row column, populated by preview-li-assessment)
]);

export interface Violation {
  key: string;
  reason: string;
}

export interface ValidateResult {
  ok: boolean;
  violations: Violation[];
}

function isEmpty(v: unknown): boolean {
  if (v === "" || v === null || v === undefined) return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

/** Walk a dotted path with optional "[]" array segments. Returns the value
 *  (for a scalar leaf) or an array of values (when "[]" is encountered). */
function readPath(root: unknown, key: string): unknown[] {
  const parts = key.split(".");
  let frontier: unknown[] = [root];
  for (const raw of parts) {
    const isArray = raw.endsWith("[]");
    const seg = isArray ? raw.slice(0, -2) : raw;
    const next: unknown[] = [];
    for (const node of frontier) {
      if (node === null || node === undefined || typeof node !== "object") continue;
      const v = (node as Record<string, unknown>)[seg];
      if (isArray) {
        if (Array.isArray(v)) next.push(...v);
      } else {
        next.push(v);
      }
    }
    frontier = next;
  }
  return frontier;
}

/** Given a key like "controls[].maturity", split into (arrayPath, leafKey).
 *  Only handles a single terminal "[]" segment (all current contracts do
 *  that). If no "[]" appears, returns [key, null]. */
function splitArrayLeaf(key: string): [string, string | null] {
  const idx = key.indexOf("[].");
  if (idx === -1) return [key, null];
  return [key.slice(0, idx + 2), key.slice(idx + 3)];
}

function readTopLevelKey(key: string): string {
  return key.split(".")[0].replace(/\[\]$/, "");
}

function checkField(intake: Record<string, unknown>, f: IntakeField, out: Violation[]): void {
  const values = readPath(intake, f.key);

  // For enum/multi-enum, check every observed value against options.
  if (f.kind === "enum" && f.options) {
    for (const v of values) {
      if (v === undefined || v === "" || v === null) continue;
      if (typeof v !== "string" || !f.options.includes(v)) {
        out.push({ key: f.key, reason: `enum value ${JSON.stringify(v)} not in options` });
      }
    }
  } else if (f.kind === "multi-enum" && f.options) {
    for (const v of values) {
      if (v === undefined || v === null) continue;
      if (!Array.isArray(v)) {
        out.push({ key: f.key, reason: `multi-enum expected array; got ${typeof v}` });
        continue;
      }
      for (const el of v) {
        if (typeof el !== "string" || !f.options.includes(el)) {
          out.push({ key: f.key, reason: `multi-enum element ${JSON.stringify(el)} not in options` });
        }
      }
    }
  } else if (f.kind === "string-array") {
    // Flat array of non-empty strings. Elements are free text unless
    // options are provided; when options are present, elements must be
    // either verbatim-in-options or begin with "Other: " (matches the
    // form's fold-in convention: `Other: <free text>`).
    for (const v of values) {
      if (v === undefined || v === null) continue;
      if (!Array.isArray(v)) {
        out.push({ key: f.key, reason: `string-array key "${f.key}" expected a JSON array of strings; got ${typeof v}` });
        continue;
      }
      for (const el of v) {
        if (typeof el !== "string" || el.length === 0) {
          out.push({ key: f.key, reason: `string-array key "${f.key}" element ${JSON.stringify(el)} is not a non-empty string` });
          continue;
        }
        if (f.options && !f.options.includes(el) && !el.startsWith("Other: ")) {
          out.push({ key: f.key, reason: `string-array key "${f.key}" element ${JSON.stringify(el)} not in options and not an "Other: …" fold-in` });
        }
      }
    }
  }

  if (f.required === "always") {
    if (values.length === 0 || values.every(isEmpty)) {
      out.push({ key: f.key, reason: "required-always field is empty" });
    }
  }
  // "conditional" is not mechanically evaluated here without a parsed
  // predicate; requiredWhen documents the rule for reviewers/tests.
}

export function validateIntake(
  contract: IntakeContract,
  intake: Record<string, unknown>,
): ValidateResult {
  const violations: Violation[] = [];

  // Unknown top-level keys.
  const knownTop = new Set<string>();
  for (const f of contract.fields) knownTop.add(readTopLevelKey(f.key));
  for (const k of Object.keys(intake ?? {})) {
    if (knownTop.has(k)) continue;
    if (ALLOWED_TOPLEVEL_EXTRAS.has(k)) continue;
    violations.push({ key: k, reason: "unknown top-level key" });
  }

  for (const f of contract.fields) checkField(intake ?? {}, f, violations);

  return { ok: violations.length === 0, violations };
}

// Re-export helpers for tests.
export { splitArrayLeaf, readPath, isEmpty };
