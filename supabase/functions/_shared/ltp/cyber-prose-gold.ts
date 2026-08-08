// ITEM 404 — CPPA CYBER PROSE GOLD (LEG A): REGISTER ENCODE + THE TYPED
// AGGREGATE RESTORATION.
//
// Pattern-parity with `_shared/ltp/governance-prose-gold.ts` (item400) and
// `_shared/ltp/admt-prose-gold.ts` (item392). Deterministic, no model calls,
// fail-open per sub-pass, idempotent over its own output.
//
// WHAT THE RENDER WALK ESTABLISHED (quality_run_documents
// 3dd35bf8-5be5-47ce-b6dc-f3f135c4afef, 88.45 and
// 52a79112-0916-4530-ac4d-a61cb1dc6985, 92.25):
//
//   (a) AGGREGATE CORRUPTION. "This readiness assessment rates <business>.
//       Mean of 81 across the 18 scored components (excluding 0
//       Insufficient-information components)." The § 7123(c) arithmetic had no
//       typed home, so the deterministic aggregate sentence was substituted
//       into the executive summary across an abbreviation-terminated clause
//       and spliced. CY-2 restores `control_status_counts` as a TYPED OBJECT
//       and CY-3 removes arithmetic from prose entirely.
//
//   (b) GARBLED COMPARATIVE CITATION. "…the NIST CSF 2.0 provides comparative
//       guidance on and Identify functions; the operative requirement is 11
//       CCR § 7123(c)(15)". Root cause is fixed at source in
//       run-cppa-cybersecurity/_w6_cyber_fix.ts (framework FUNCTION NAMES are
//       proper nouns and are masked before the operative-verb rewrite);
//       CY-4 here repairs the residual class on already-shaped strings.
//
// PROTECTED SURFACES — NEVER TOUCHED BY THIS MODULE:
//   · Any string carrying the § 7121(a) phase-in markers (corpus-pinned law).
//   · The standing disclaimer and framework disclaimer.
//   · Determination machinery: status/conclusion/citations/decision/rule_ids.
//   · Verbatim authority excerpts.

import {
  SCHEDULE_MARKER,
  RESOLVED_COHORT_MARKER,
} from "./cyber-audit-schedule.ts";
import { CYBER_PIPELINE_STAMP } from "../prose/plans/cyber.spine.ts";

export const CYBER_PROSE_GOLD_VERSION = "cyber-prose-gold-2026-08-07-item404";

// ─────────────────────────────────────────────────────────────────────────────
// CY-0 — PROTECTION
// ─────────────────────────────────────────────────────────────────────────────

/** Keys whose values are machinery or byte-pinned chrome. Never rewritten. */
export const CYBER_PROTECTED_KEYS: readonly string[] = [
  "_meta",
  "_staging",
  "decision",
  "rule_ids",
  "status",
  "conclusion",
  "citation",
  "citations",
  "disclaimer",
  "framework_disclaimer",
  "authority_verbatim",
  "verbatim_excerpt",
  "verbatim",
  "authority_exhibit",
  "audit_schedule",
  "build_stamp",
  "prompt_version",
  "schema_version",
];

const PROTECTED_MARKERS: readonly string[] = [
  SCHEDULE_MARKER,
  RESOLVED_COHORT_MARKER,
  "This document is not legal advice",
];

/** A string that carries byte-pinned law or chrome is never restyled. */
export function isProtectedCyberString(s: string): boolean {
  return PROTECTED_MARKERS.some((m) => s.includes(m));
}

// ─────────────────────────────────────────────────────────────────────────────
// CY-2 — THE TYPED AGGREGATE RESTORATION
// ─────────────────────────────────────────────────────────────────────────────
//
// The loop2-era top-10 cyber documents (2026-07-09→15) carried
// `control_status_counts` as a typed OBJECT plus a `methodology_note`; today's
// documents carry neither, so the mean narrated itself into the executive
// summary. This restores the typed home. The RENDERER formats it (stat strip /
// table); prose never recites it.

export const CYBER_TOTAL_COMPONENTS = 18;
const INSUFFICIENT_RE = /^\s*insufficient\s+information\s*$/i;

export const CYBER_METHODOLOGY_NOTE =
  "Component scores are the mean over scored components only. A component recorded as Insufficient information carries no score and is excluded from the mean; it remains in the denominator of eighteen § 7123(c) components.";

export interface ControlStatusCounts {
  /** The regulation's own denominator: eighteen § 7123(c) components. */
  total_components: number;
  /** Components carrying a status and a finite score. */
  scored_count: number;
  /** Components recorded as Insufficient information. */
  insufficient_count: number;
  /** Mean over SCORED components only; null when nothing is scored. */
  mean_score: number | null;
  /** The denominator the mean was taken over. */
  mean_denominator: number;
  /** Count per status label, in the document's own vocabulary. */
  by_status: Record<string, number>;
  methodology_note: string;
}

export function computeControlStatusCounts(controls: unknown): ControlStatusCounts {
  const list = Array.isArray(controls) ? controls : [];
  const by_status: Record<string, number> = {};
  let sum = 0;
  let scored = 0;
  let insufficient = 0;
  for (const c of list) {
    const status = String((c as Record<string, unknown> | null)?.status ?? "").trim();
    if (status) by_status[status] = (by_status[status] ?? 0) + 1;
    if (INSUFFICIENT_RE.test(status)) { insufficient++; continue; }
    if (!status) continue;
    const score = Number((c as Record<string, unknown>)?.score);
    if (!Number.isFinite(score)) continue;
    sum += score;
    scored++;
  }
  return {
    total_components: CYBER_TOTAL_COMPONENTS,
    scored_count: scored,
    insufficient_count: insufficient,
    mean_score: scored > 0 ? Math.round(sum / scored) : null,
    mean_denominator: scored,
    by_status,
    methodology_note: CYBER_METHODOLOGY_NOTE,
  };
}

export interface AggregateRestorationResult {
  attached: boolean;
  scored_count: number;
  mean_score: number | null;
}

/** CY-2. Attaches the typed tally. Deterministic; never authored by a model. */
export function attachControlStatusCounts(report: unknown): AggregateRestorationResult {
  const r = report as Record<string, unknown> | null;
  if (!r || typeof r !== "object") return { attached: false, scored_count: 0, mean_score: null };
  const counts = computeControlStatusCounts(r.controls);
  r.control_status_counts = counts;
  return { attached: true, scored_count: counts.scored_count, mean_score: counts.mean_score };
}

// ─────────────────────────────────────────────────────────────────────────────
// CY-3 — ARITHMETIC LEAVES PROSE (the durable fix for defect (a))
// ─────────────────────────────────────────────────────────────────────────────

/** The deterministic aggregate sentence and its splice residue. */
const AGG_CANONICAL_RE =
  /\s*Mean of \d+(?:\.\d+)? across the \d+ scored components?[^.]*\.\s*/gi;
/** Loose authored arithmetic: "an aggregate score of 81", "mean score of 81". */
const AGG_LOOSE_RE =
  /\s*(?:,\s*)?(?:with|at|carrying)?\s*an?\s+(?:aggregate|mean|average)\s+score\s+of\s+\d+(?:\.\d+)?(?:\s*(?:out of|\/)\s*\d+)?\s*/gi;
/** A hanging verb clause left behind when the arithmetic sentence is removed. */
const HANGING_RATING_RE =
  /(?:^|(?<=[.!?]\s))[A-Z][^.!?]*?\b(?:rates|scores|assesses|places|puts)\s+[^.!?]*?\.\s*/g;

export const CYBER_TALLY_POINTER =
  "The component tally and its denominator are set out in the component table.";

export interface AggregateStripResult {
  out: string;
  removed: number;
}

/**
 * CY-3. Removes arithmetic from a prose string. Byte-pinned strings are
 * returned untouched. Idempotent: the pointer sentence contains no arithmetic,
 * so a second pass is a no-op.
 */
export function stripAggregateArithmetic(text: string): AggregateStripResult {
  if (typeof text !== "string" || !text) return { out: text ?? "", removed: 0 };
  if (isProtectedCyberString(text)) return { out: text, removed: 0 };
  let removed = 0;
  let out = text;

  if (AGG_CANONICAL_RE.test(out)) {
    AGG_CANONICAL_RE.lastIndex = 0;
    out = out.replace(AGG_CANONICAL_RE, () => { removed++; return " "; });
    // The splice in defect (a) left a hanging "…rates <business>." clause in
    // front of the substituted sentence. A clause whose only object was the
    // removed arithmetic has nothing left to say, so it goes with it.
    out = out.replace(HANGING_RATING_RE, (m) =>
      /\b(?:at|as|with)\b/i.test(m) ? m : ""
    );
    out = `${out.trim()} ${CYBER_TALLY_POINTER}`.trim();
  }

  AGG_LOOSE_RE.lastIndex = 0;
  if (AGG_LOOSE_RE.test(out)) {
    AGG_LOOSE_RE.lastIndex = 0;
    out = out.replace(AGG_LOOSE_RE, () => { removed++; return " "; });
  }

  out = out.replace(/\s{2,}/g, " ").replace(/\s+([.,;])/g, "$1").trim();
  return { out, removed };
}

// ─────────────────────────────────────────────────────────────────────────────
// CY-4 — COMPARATIVE-FRAMEWORK CITATION REPAIR (residual class of defect (b))
// ─────────────────────────────────────────────────────────────────────────────

/** CSF 2.0 function names are proper nouns, never operative verbs. */
export const NIST_FUNCTION_NAMES: readonly string[] = [
  "Govern",
  "Identify",
  "Protect",
  "Detect",
  "Respond",
  "Recover",
];

export interface CitationRepairResult {
  out: string;
  repaired: number;
}

export function repairComparativeCitation(text: string): CitationRepairResult {
  if (typeof text !== "string" || !text) return { out: text ?? "", repaired: 0 };
  if (isProtectedCyberString(text)) return { out: text, repaired: 0 };
  let repaired = 0;
  let out = text;

  // "NIST CSF 2.0 provides comparative guidance on and Identify functions"
  out = out.replace(
    /(NIST\s+CSF(?:\s+2\.0)?)\s+provides comparative guidance on and\s+(Govern|Identify|Protect|Detect|Respond|Recover)\s+functions/gi,
    (_m, fw: string, fn: string) => {
      repaired++;
      return `${fw} Govern and ${fn} functions provide comparative guidance`;
    },
  );

  // Generic residue: a comparative verb phrase left with a dangling conjunction.
  out = out.replace(/provides comparative guidance on and\s+/gi, () => {
    repaired++;
    return "provides comparative guidance on ";
  });

  // "corresponding to the <clause> provides comparative guidance" — a fused
  // fragment: the frame supplied a preposition the clause already carries.
  out = out.replace(
    /\bcorresponding to the\s+(?=[A-Z]|NIST|ISO|SOC)/g,
    () => { repaired++; return "corresponding to "; },
  );

  out = out.replace(/\s{2,}/g, " ").replace(/\s+([.,;])/g, "$1").trim();
  return { out, repaired };
}

// ─────────────────────────────────────────────────────────────────────────────
// CY-1 — ONE VERDICT VOICE
// ─────────────────────────────────────────────────────────────────────────────

export const CYBER_VERDICT_LABELS: Record<string, string> = {
  record_insufficient: "Audit readiness not yet determinable on this record",
  not_ready: "Not yet audit-ready",
  partially_ready: "Partly audit-ready",
  substantially_ready: "Substantially audit-ready",
  ready: "Audit-ready",
};

export const CYBER_ABSENCE_STATUSES: readonly string[] = ["record_insufficient"];

export interface VerdictVoiceResult {
  readiness_line: string;
  opener_prepended: boolean;
  arithmetic_openers_removed: number;
}

/** The one line every cyber surface reads for readiness. */
export function cyberReadinessLine(determination: unknown): string {
  const d = determination as Record<string, unknown> | null;
  const status = String(d?.status ?? d?.conclusion ?? "").trim();
  if (!status) return "";
  return CYBER_VERDICT_LABELS[status] ?? "";
}

/**
 * CY-1. The readiness line comes from `readiness_determination` and the
 * executive summary opens on it. The determination record itself is NEVER
 * edited. When the determination claims absence but names no unassessable
 * component, no absence opener is written — a hollow absence is not a verdict
 * (see CY-5).
 */
export function applyCyberVerdictVoice(report: unknown): VerdictVoiceResult {
  const out: VerdictVoiceResult = {
    readiness_line: "",
    opener_prepended: false,
    arithmetic_openers_removed: 0,
  };
  const r = report as Record<string, unknown> | null;
  if (!r || typeof r !== "object") return out;

  const det = r.readiness_determination as Record<string, unknown> | undefined;
  const line = cyberReadinessLine(det);
  if (!line) return out;
  out.readiness_line = line;
  r.cyber_readiness_line = line;

  const status = String(det?.status ?? det?.conclusion ?? "").trim();
  const namesAbsence =
    (Array.isArray(det?.unassessable_components) && (det!.unassessable_components as unknown[]).length > 0) ||
    (Array.isArray(det?.blocking_components) && (det!.blocking_components as unknown[]).length > 0);
  if (CYBER_ABSENCE_STATUSES.includes(status) && !namesAbsence) return out;

  const summary = r.executive_summary;
  if (typeof summary !== "string" || !summary.trim()) return out;
  if (isProtectedCyberString(summary)) return out;

  const opener = `${line}.`;
  if (summary.trim().startsWith(line)) return out;
  r.executive_summary = `${opener} ${summary.trim()}`;
  out.opener_prepended = true;
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// CY-5 — HOLLOW FIELDS ARE OMITTED, NEVER SHIPPED
// ─────────────────────────────────────────────────────────────────────────────

export function isHollowCyberValue(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (Array.isArray(v)) return v.length === 0 || v.every((x) => isHollowCyberValue(x));
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  const s = String(v).trim();
  return s === "" || s === "—" || s === "-" || s === "–" || s.toLowerCase() === "n/a";
}

/** Reader-facing leaves the walk found shipping hollow or dangling. */
export const CYBER_READER_LEAF_KEYS: readonly string[] = [
  "finding",
  "remediation",
  "evidence",
  "differentiator",
  "regulatory_basis",
  "reasoning",
  "headline",
  "rationale",
  "narrative",
  "summary",
  "action",
  "note",
  "information_needed",
  "executive_summary",
  "enforcement_context",
];

/** A list-introducing clause whose list is empty: "The following are …:." */
const DANGLING_LIST_RE = /\s*[A-Z][^.!?]*?\bfollowing\b[^.!?]*?:\s*\.\s*/g;

export interface HollowOmissionResult {
  omitted: string[];
  dangling_clauses_removed: number;
}

/** CY-5. Hollow reader leaves are deleted; dangling list stubs are removed. */
export function applyCyberHollowOmission(report: unknown): HollowOmissionResult {
  const out: HollowOmissionResult = { omitted: [], dangling_clauses_removed: 0 };
  const readers = new Set(CYBER_READER_LEAF_KEYS);
  const protectedKeys = new Set(CYBER_PROTECTED_KEYS);

  const walk = (node: unknown, path: string): void => {
    if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`)); return; }
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      if (protectedKeys.has(k)) continue;
      const p = path ? `${path}.${k}` : k;
      if (typeof v === "string") {
        if (!readers.has(k)) continue;
        if (isHollowCyberValue(v)) { delete obj[k]; out.omitted.push(p); continue; }
        if (isProtectedCyberString(v)) continue;
        DANGLING_LIST_RE.lastIndex = 0;
        if (DANGLING_LIST_RE.test(v)) {
          DANGLING_LIST_RE.lastIndex = 0;
          const cleaned = v.replace(DANGLING_LIST_RE, " ").replace(/\s{2,}/g, " ").trim();
          out.dangling_clauses_removed += 1;
          if (isHollowCyberValue(cleaned)) { delete obj[k]; out.omitted.push(p); }
          else obj[k] = cleaned;
        }
      } else if (readers.has(k) && isHollowCyberValue(v)) {
        delete obj[k];
        out.omitted.push(p);
      } else {
        walk(v, p);
      }
    }
  };

  walk(report, "");
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// CY-6 — INTERNAL VOCABULARY OFF READER SURFACES
// ─────────────────────────────────────────────────────────────────────────────
//
// MACHINE-KEYED BY DESIGN, LEFT ALONE (renderers depend on them):
//   · controls[].status      — CybersecurityReportBody maps it to a band pill
//                              via controlStatusColor / CYBER_BANDS.
//   · readiness_level        — the header pill, mapped by readinessColor.
//   · readiness_determination.status / .conclusion, independence_determination
//     .status — determination machinery; outcome logic is out of scope.
//   · control_status_counts.by_status keys — the tally's own axis labels.

const CYBER_ENUM_RE =
  /\b(record_insufficient|insufficient_basis|resolved_met|resolved_not_met|RESOLVED_MET|RESOLVED_NOT_MET|INDETERMINATE|CANDIDATE)\b/g;

const CYBER_ENUM_LABELS: Record<string, string> = {
  record_insufficient: "the record does not yet carry what a readiness conclusion requires",
  insufficient_basis: "the record does not yet carry a basis for this conclusion",
  resolved_met: "met on this record",
  resolved_not_met: "not met on this record",
  RESOLVED_MET: "met on this record",
  RESOLVED_NOT_MET: "not met on this record",
  INDETERMINATE: "not determinable on this record",
  CANDIDATE: "not yet resolved on this record",
};

export interface CustomerRegisterResult {
  rewrites: number;
  paths: string[];
}

/** CY-6. Rewrites machine enum tokens inside reader prose leaves only. */
export function applyCyberCustomerRegister(report: unknown): CustomerRegisterResult {
  const out: CustomerRegisterResult = { rewrites: 0, paths: [] };
  const readers = new Set(CYBER_READER_LEAF_KEYS);
  const protectedKeys = new Set(CYBER_PROTECTED_KEYS);

  const walk = (node: unknown, path: string): void => {
    if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`)); return; }
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      if (protectedKeys.has(k)) continue;
      const p = path ? `${path}.${k}` : k;
      if (typeof v === "string") {
        if (!readers.has(k)) continue;
        if (isProtectedCyberString(v)) continue;
        CYBER_ENUM_RE.lastIndex = 0;
        if (!CYBER_ENUM_RE.test(v)) continue;
        CYBER_ENUM_RE.lastIndex = 0;
        obj[k] = v.replace(CYBER_ENUM_RE, (m) => CYBER_ENUM_LABELS[m] ?? m);
        out.rewrites += 1;
        out.paths.push(p);
      } else {
        walk(v, p);
      }
    }
  };

  walk(report, "");
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// CY-7 — FLEET SHAPE: enforcement_context AS AN OBJECT
// ─────────────────────────────────────────────────────────────────────────────
//
// ADMT and governance carry an OBJECT; cyber carried a STRING. Readers were
// made tolerant of BOTH shapes first (see `enforcementContextNarrative`), and
// only then is the writer normalised. A legacy string document therefore
// renders byte-identically through the customer path.

export interface CyberEnforcementContext {
  narrative: string;
  penalty_statutory_basis?: string;
  aggregate_exposure_note?: string;
}

/** Tolerant reader: accepts a string, the fleet object, or nothing. */
export function enforcementContextNarrative(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    for (const k of ["narrative", "summary", "text", "aggregate_exposure_note"]) {
      const v = o[k];
      if (typeof v === "string" && v.trim()) return v;
    }
  }
  return "";
}

export interface EnforcementShapeResult {
  normalised: boolean;
  already_object: boolean;
}

export function normalizeCyberEnforcementContext(report: unknown): EnforcementShapeResult {
  const out: EnforcementShapeResult = { normalised: false, already_object: false };
  const r = report as Record<string, unknown> | null;
  if (!r || typeof r !== "object") return out;
  const ec = r.enforcement_context;
  if (ec && typeof ec === "object" && !Array.isArray(ec)) { out.already_object = true; return out; }
  if (typeof ec !== "string") return out;
  const narrative = ec.trim();
  if (!narrative) { delete r.enforcement_context; return out; }
  const shaped: CyberEnforcementContext = { narrative };
  r.enforcement_context = shaped;
  out.normalised = true;
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROSE SWEEP (CY-3 + CY-4 over every reader surface)
// ─────────────────────────────────────────────────────────────────────────────

export interface ProseSweepResult {
  arithmetic_removed: number;
  citations_repaired: number;
  paths: string[];
}

export function applyCyberProseSweep(report: unknown): ProseSweepResult {
  const out: ProseSweepResult = { arithmetic_removed: 0, citations_repaired: 0, paths: [] };
  const readers = new Set(CYBER_READER_LEAF_KEYS);
  const protectedKeys = new Set(CYBER_PROTECTED_KEYS);

  const walk = (node: unknown, path: string): void => {
    if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`)); return; }
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      if (protectedKeys.has(k)) continue;
      const p = path ? `${path}.${k}` : k;
      if (typeof v === "string") {
        if (!readers.has(k)) continue;
        const a = stripAggregateArithmetic(v);
        const b = repairComparativeCitation(a.out);
        if (a.removed || b.repaired) {
          obj[k] = b.out;
          out.arithmetic_removed += a.removed;
          out.citations_repaired += b.repaired;
          out.paths.push(p);
        }
      } else {
        walk(v, p);
      }
    }
  };

  walk(report, "");
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

export interface CyberProseGoldTelemetry {
  version: string;
  stamp: string;
  aggregate: AggregateRestorationResult;
  prose_sweep: ProseSweepResult;
  verdict_voice: VerdictVoiceResult;
  hollow_fields: HollowOmissionResult;
  customer_register: CustomerRegisterResult;
  enforcement_shape: EnforcementShapeResult;
  errors: string[];
}

/**
 * The single cyber prose-gold pass. Fail-open per sub-pass: a throwing pass is
 * recorded and the document continues unchanged. Order matters — the typed
 * tally is attached BEFORE arithmetic is removed from prose, so the figures
 * always have a home before they leave the sentence.
 */
export function applyCyberProseGold(report: unknown): CyberProseGoldTelemetry {
  const t: CyberProseGoldTelemetry = {
    version: CYBER_PROSE_GOLD_VERSION,
    stamp: CYBER_PIPELINE_STAMP,
    aggregate: { attached: false, scored_count: 0, mean_score: null },
    prose_sweep: { arithmetic_removed: 0, citations_repaired: 0, paths: [] },
    verdict_voice: { readiness_line: "", opener_prepended: false, arithmetic_openers_removed: 0 },
    hollow_fields: { omitted: [], dangling_clauses_removed: 0 },
    customer_register: { rewrites: 0, paths: [] },
    enforcement_shape: { normalised: false, already_object: false },
    errors: [],
  };
  try { t.aggregate = attachControlStatusCounts(report); } catch (e) { t.errors.push(`aggregate:${(e as Error)?.message}`); }
  try { t.prose_sweep = applyCyberProseSweep(report); } catch (e) { t.errors.push(`prose_sweep:${(e as Error)?.message}`); }
  try { t.verdict_voice = applyCyberVerdictVoice(report); } catch (e) { t.errors.push(`verdict_voice:${(e as Error)?.message}`); }
  try { t.hollow_fields = applyCyberHollowOmission(report); } catch (e) { t.errors.push(`hollow_fields:${(e as Error)?.message}`); }
  try { t.customer_register = applyCyberCustomerRegister(report); } catch (e) { t.errors.push(`customer_register:${(e as Error)?.message}`); }
  try { t.enforcement_shape = normalizeCyberEnforcementContext(report); } catch (e) { t.errors.push(`enforcement_shape:${(e as Error)?.message}`); }
  return t;
}
