// ITEM 385 r2 DEFECT 2 — THE DOCUMENTATION-RECOMMENDATIONS PLAN REGISTER.
//
// THE DEFECT
// ----------
// `documentation_recommendations` is authored by the model (LIA stage 3). Its
// leaves pass through the emit gate and the T6 scrub like any other surface,
// and frame substitution then writes a GENERIC_ABSENCE scaffold — "The record
// is silent here, and the question is carried forward." — into every leaf that
// was marked degraded. On the first full-stack item385 run the perfect record
// answered every asked question, and the surface still shipped nine of those
// scaffolds across `review_triggers`, `balancing_record_elements` and the
// per-document `key_elements`.
//
// THE FIX (honest level)
// ----------------------
// The surface joins the L2 CSC map with its backing keys, and this module is
// its SINGLE WRITER for the repair. A repair never invents a recommendation:
//   * a leaf that is a PURE absence frame is removed;
//   * a leaf that MIXES a frame with substance keeps the substance only;
//   * an authority-class leaf (`basis`) carrying a frame is DROPPED, per the
//     item384 r4 verbatim_quote precedent;
//   * a list emptied by that removal is refilled from the CLASSIFIED OPEN
//     ITEMS of this very report (the G-6 ledger discipline) — what to write
//     down next is derived from what the assessment recorded as open, with an
//     owner and a done-when clause (watchlist W2);
//   * `review_triggers` refills from `buildLiaAttestation`, which is already
//     the register-approved single writer for that list.
// On a record that genuinely leaves the surface unbacked the CSC never calls
// this module at all, and the honest frames stand.
//
// DETERMINISTIC, pure, no I/O.

import { CONTROLLED_LITERALS, GENERIC_ABSENCE } from "../../prose/frame-substitution.ts";
import { buildLiaAttestation } from "./build-upgrade4.ts";

export const LIA_DOC_PLAN_VERSION = "lia-doc-plan-2026-08-06-item385r2";

/** Substance a repaired leaf must retain to stay in the document. */
export const DOC_PLAN_MIN_SUBSTANCE = 40;

/** Every controlled absence sentence, longest first. */
const ABSENCE_SENTENCES: readonly string[] = [...GENERIC_ABSENCE, ...CONTROLLED_LITERALS]
  .slice()
  .sort((a, b) => b.length - a.length);

/** Remove every controlled absence sentence from a string. */
export function stripAbsenceSentences(input: unknown): string {
  let out = typeof input === "string" ? input : "";
  for (const s of ABSENCE_SENTENCES) {
    if (out.includes(s)) out = out.split(s).join(" ");
  }
  return out.replace(/\s+/g, " ").trim();
}

/** True when the string is nothing but controlled absence prose. */
export function isPureAbsenceFrame(input: unknown): boolean {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return false;
  const stripped = stripAbsenceSentences(raw);
  return stripped !== raw && stripped.length < DOC_PLAN_MIN_SUBSTANCE;
}

/** True when the string carries a controlled absence sentence at all. */
export function carriesAbsenceFrame(input: unknown): boolean {
  const raw = typeof input === "string" ? input : "";
  return !!raw && stripAbsenceSentences(raw) !== raw.replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// the classified open items (G-6 ledger discipline)
// ---------------------------------------------------------------------------

const ASK_TEXT_KEYS = ["question", "ask", "note", "detail", "field", "text", "item"];

function askText(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (!v || typeof v !== "object") return "";
  const o = v as Record<string, unknown>;
  return ASK_TEXT_KEYS.map((k) => (typeof o[k] === "string" ? String(o[k]) : ""))
    .filter(Boolean)
    .join(" — ")
    .trim();
}

/**
 * The open items this report itself classified: the report-level asks, the
 * determination's own information_needed, and the attestation's.
 */
export function classifiedOpenItems(report: unknown): string[] {
  const out: string[] = [];
  const push = (s: string) => {
    const t = stripAbsenceSentences(s);
    if (t.length >= 12 && !out.includes(t)) out.push(t);
  };
  const r = (report && typeof report === "object" ? report : {}) as Record<string, unknown>;
  if (Array.isArray(r.information_needed)) for (const a of r.information_needed) push(askText(a));
  const det = (r.lia_determination ?? {}) as Record<string, unknown>;
  if (typeof det.information_needed === "string") {
    for (const part of det.information_needed.split(/(?<=\.)\s+(?=[A-Za-z_])/)) push(part);
  }
  const att = (r.attestation_block ?? {}) as Record<string, unknown>;
  if (typeof att.information_needed === "string") push(att.information_needed);
  return out.slice(0, 8);
}

/**
 * The plan register: one line per classified open item, each with the owner
 * and the point at which it is done (watchlist W2).
 */
export function planRegisterElements(report: unknown): string[] {
  return classifiedOpenItems(report).map((item) => {
    const body = /[.!?]$/.test(item) ? item : `${item}.`;
    return `${body} Owner: the person who signs the attestation for this assessment. Done when: the entry appears in the balancing record, before this assessment is next relied on.`;
  });
}

// ---------------------------------------------------------------------------
// the repair
// ---------------------------------------------------------------------------

export interface DocPlanRepair {
  value: unknown;
  changed: boolean;
  removed_leaves: number;
  refilled_lists: string[];
  dropped_entries: number;
}

/** Prose fields whose whole content may legitimately be a sentence. */
const PROSE_KEYS = ["purpose", "recommended_approach", "document"];
/** Authority-class field: carries authority or is absent. */
const AUTHORITY_KEYS = ["basis"];

function cleanList(list: unknown[], state: DocPlanRepair): string[] {
  const out: string[] = [];
  for (const v of list) {
    if (typeof v !== "string") continue;
    if (isPureAbsenceFrame(v)) {
      state.removed_leaves += 1;
      state.changed = true;
      continue;
    }
    const cleaned = stripAbsenceSentences(v);
    if (cleaned !== v.replace(/\s+/g, " ").trim()) {
      state.changed = true;
      state.removed_leaves += 1;
    }
    if (cleaned) out.push(cleaned);
  }
  return out;
}

function cleanStrings(obj: Record<string, unknown>, path: string, state: DocPlanRepair): void {
  for (const k of [...PROSE_KEYS, ...AUTHORITY_KEYS]) {
    const v = obj[k];
    if (typeof v !== "string") continue;
    if (isPureAbsenceFrame(v)) {
      delete obj[k];
      state.removed_leaves += 1;
      state.changed = true;
      continue;
    }
    const cleaned = stripAbsenceSentences(v);
    if (cleaned !== v.replace(/\s+/g, " ").trim()) {
      state.removed_leaves += 1;
      state.changed = true;
      if (cleaned.length < DOC_PLAN_MIN_SUBSTANCE) delete obj[k];
      else obj[k] = cleaned;
    }
  }
  void path;
}

/**
 * Repair `documentation_recommendations` in place-safe fashion (a deep copy is
 * returned; the caller writes it back).
 */
export function repairDocumentationRecommendations(
  node: unknown,
  intake: unknown,
  report: unknown,
): DocPlanRepair {
  const state: DocPlanRepair = {
    value: node,
    changed: false,
    removed_leaves: 0,
    refilled_lists: [],
    dropped_entries: 0,
  };
  if (!node || typeof node !== "object" || Array.isArray(node)) return state;

  const doc = JSON.parse(JSON.stringify(node)) as Record<string, unknown>;
  const register = planRegisterElements(report);

  const refill = (obj: Record<string, unknown>, key: string, path: string, fallback: string[]) => {
    const list = obj[key];
    if (!Array.isArray(list)) return;
    const cleaned = cleanList(list, state);
    if (cleaned.length === 0) {
      if (fallback.length > 0) {
        obj[key] = [...fallback];
        state.refilled_lists.push(path);
        state.changed = true;
      } else {
        delete obj[key];
        state.changed = true;
      }
      return;
    }
    obj[key] = cleaned;
  };

  // review_triggers — the attestation builder is the approved single writer.
  const attestationTriggers = (() => {
    try {
      const t = buildLiaAttestation(intake)?.review_triggers;
      return Array.isArray(t) ? t.map(String) : [];
    } catch {
      return [];
    }
  })();
  refill(doc, "review_triggers", "review_triggers", attestationTriggers);
  refill(doc, "balancing_record_elements", "balancing_record_elements", register);

  if (doc.opt_out_mechanism && typeof doc.opt_out_mechanism === "object") {
    cleanStrings(doc.opt_out_mechanism as Record<string, unknown>, "opt_out_mechanism", state);
  }

  if (Array.isArray(doc.recommended_documentation)) {
    const kept: unknown[] = [];
    (doc.recommended_documentation as unknown[]).forEach((raw, i) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
      const entry = raw as Record<string, unknown>;
      cleanStrings(entry, `recommended_documentation[${i}]`, state);
      refill(entry, "key_elements", `recommended_documentation[${i}].key_elements`, register);
      const hasBody = typeof entry.document === "string" && entry.document.trim().length > 0;
      if (!hasBody) {
        state.dropped_entries += 1;
        state.changed = true;
        return;
      }
      kept.push(entry);
    });
    doc.recommended_documentation = kept;
  }

  state.value = doc;
  return state;
}
