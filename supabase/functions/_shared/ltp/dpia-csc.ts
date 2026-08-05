// ITEM 374 — DELIVERABLE 2: DETERMINISTIC CROSS-SURFACE CONSISTENCY CHECK.
//
// DPIA ONLY. Runs as a deterministic post-pass in `run-dpia-framework` AFTER
// every prose pass and BEFORE the universal disclaimer. Model-agnostic: it
// reads the assembled report and the intake, and asserts that what the
// document SAYS about the record agrees with what the record CONTAINS.
//
// Batch 646e3bf3 shipped four documents (both model arms) in which:
//   * an approved GAP frame described the assessment team as unnamed while the
//     deterministic builder had parsed a three-person roster (C2/C4);
//   * the determination named foundations the intake supplies (fixed upstream
//     in ask-categories.ts FIX 2; C2 keeps a check on the surface);
//   * risk rows asserted the record "describes secondary uses" against an
//     intake whose `secondary_uses` reads "None" (C3).
//
// LAWS
// ----
//   * DETERMINISTIC — pure function of (report, intake). No I/O, no clock, no
//     model. The same inputs always yield the same violations and repairs.
//   * FAIL-OPEN — any error leaves the report untouched and is reported.
//   * SINGLE-WRITER RESPECTING — a C2/C4 repair restores the DPIA attestation
//     builder's own output. This module never authors prose of its own.
//   * HONEST DEGRADATION — every check is predicated on the record SUPPLYING
//     the backing fact. On a genuinely incomplete record it does nothing.
//
// Telemetry rides `_meta.internal.dpia_csc`.

import {
  ABSENCE_SCAFFOLDS,
  CAP_POOL_SENTENCES,
  GENERIC_ABSENCE,
  INFO_NEEDED_LITERAL,
  NEUTRAL_DOWNGRADE_LITERAL,
} from "../prose/frame-substitution.ts";
import type { FrameSet } from "../prose/frames.ts";
import {
  buildDpiaAssessmentTeam,
  buildDpiaValidationApproval,
} from "./dpia-deliverables/attestation.ts";

export const DPIA_CSC_VERSION = "dpia-csc-2026-08-04-item374";

export type DpiaCscCheckId =
  | "c1_engagement_vs_metadata_vs_intake"
  | "c2_absence_claim_vs_record"
  | "c3_secondary_use_predicate"
  | "c4_structured_leaf_hygiene";

export interface DpiaCscViolation {
  check_id: DpiaCscCheckId;
  path: string;
  evidence: string;
  repaired: boolean;
}

export interface DpiaCscTelemetry {
  version: string;
  violations: DpiaCscViolation[];
  repairs: number;
  crashed: boolean;
  error?: string;
}

export interface DpiaCscOptions {
  /** The DPIA intake object the report was built from. */
  readonly intake: unknown;
  /**
   * The approved DPIA frame set, when the run loaded one. Its bodies supply the
   * needles used to recognise a gap-frame sentence that reached a surface.
   */
  readonly frameSet?: FrameSet | null;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function str(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(str).filter(Boolean).join(" | ");
  if (v && typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return "";
    }
  }
  return "";
}

function filled(intake: unknown, key: string): boolean {
  if (!intake || typeof intake !== "object") return false;
  const v = (intake as Record<string, unknown>)[key];
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return String(v).trim().length > 0;
}

function clip(s: string, n = 160): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/**
 * Literal sentences produced by the machinery: emit-gate fallbacks, the cap
 * pools, and the neutral absence scaffolds. Their presence on a surface whose
 * record is complete is, by construction, a false statement about the record.
 */
export const MACHINE_ABSENCE_SENTENCES: readonly string[] = [
  INFO_NEEDED_LITERAL,
  NEUTRAL_DOWNGRADE_LITERAL,
  ...CAP_POOL_SENTENCES,
  ...ABSENCE_SCAFFOLDS,
  ...GENERIC_ABSENCE,
];

/**
 * "not identified on the present record"-class prose. Authored absence
 * language, whatever produced it.
 */
export const ABSENCE_CLASS_RE =
  /(not identified on the present record|does not name who prepared|nobody is recorded as|no one has signed this|is not formally validated on the present record|has not said who drafted|the record does not name|the approval date is blank|has not stated what a sign-off)/i;

/**
 * Fixed fragments of the product's frame bodies, so a rendered gap atom is
 * recognisable after placeholder substitution. A fragment must be long enough
 * that it cannot collide with ordinary prose.
 */
export function frameBodyNeedles(frameSet: FrameSet | null | undefined): string[] {
  const out: string[] = [];
  for (const f of frameSet?.frames ?? []) {
    const body = typeof f?.body === "string" ? f.body : "";
    if (!body) continue;
    for (const piece of body.split(/\{\{[^}]*\}\}/g)) {
      const frag = piece.replace(/\s+/g, " ").trim();
      if (frag.length >= 40) out.push(frag);
    }
  }
  return out;
}

/** True when `text` carries a machine-absence sentence or a gap-frame body. */
export function carriesAbsenceLanguage(text: string, needles: readonly string[]): string | null {
  const t = text.replace(/\s+/g, " ");
  for (const s of MACHINE_ABSENCE_SENTENCES) {
    if (t.includes(s)) return s;
  }
  for (const n of needles) {
    if (t.includes(n)) return n;
  }
  const m = ABSENCE_CLASS_RE.exec(t);
  return m ? m[0] : null;
}

// ---------------------------------------------------------------------------
// C2 — surface → backing intake keys
// ---------------------------------------------------------------------------

export interface CscSurface {
  /** Dotted report path of the surface object. */
  readonly path: string;
  /** Intake keys that back it. `mode: "any"` → one filled key is enough. */
  readonly keys: readonly string[];
  readonly mode: "any" | "all";
}

export const CSC_SURFACES: readonly CscSurface[] = [
  {
    path: "section_0_overview.assessment_team",
    keys: ["dpia_prepared_by", "dpia_team"],
    mode: "any",
  },
  {
    path: "section_6_conclusion.validation_approval",
    keys: ["dpia_approved_by_name", "dpia_approved_by_title", "dpia_approval_date"],
    mode: "all",
  },
  // ITEM 380 §4 — TRANSPARENCY. "How individuals are told" is backed by the
  // rights-mechanism narrative and by the notice content the record carries in
  // nature_scope_context. When BOTH are supplied, absence language on the
  // rights-measures surface is a false statement about the record.
  {
    path: "section_2_analysis.measures_rights",
    keys: ["data_subject_rights_mechanisms", "nature_scope_context"],
    mode: "all",
  },
  // ITEM 380 §4 — ART. 35(9) VIEWS. A "partially discharged" / absence claim
  // on the views surface when the record supplies BOTH the sought-status and
  // the views themselves is a C2 violation, repaired from the builder below.
  {
    path: "section_5_interested_parties.data_subject_views",
    keys: ["data_subjects_views_sought", "data_subjects_views"],
    mode: "all",
  },
];

/**
 * ITEM 380 §4 — single-writer builder for the Art. 35(9) views surface. It
 * states ONLY what the record states; it never characterises the discharge.
 */
export function buildDpiaDataSubjectViews(intake: unknown): string {
  const rec = (intake && typeof intake === "object" ? intake : {}) as Record<string, unknown>;
  const sought = str(rec.data_subjects_views_sought);
  const views = str(rec.data_subjects_views);
  const parts: string[] = [];
  if (sought) parts.push(`The record states, on whether the views of data subjects were sought: ${sought.replace(/\.$/, "")}.`);
  if (views) parts.push(`The views recorded are: ${views.replace(/\.$/, "")}.`);
  parts.push(
    "The controller records these views under GDPR Art. 35(9); where they were not followed, the reasons are recorded with the decision in Section 6.",
  );
  return parts.join(" ");
}

/** ITEM 380 §4 — absence/partial-discharge language specific to the views and
 * transparency surfaces. */
export const PARTIAL_DISCHARGE_RE =
  /(partially discharged|partly discharged|only partially|not (?:been )?(?:fully )?discharged|no views (?:were )?(?:sought|recorded)|views were not sought|were not consulted|the record does not (?:record|state) (?:the )?views|not (?:been )?told|individuals are not informed)/i;


function surfaceBacked(surface: CscSurface, intake: unknown): boolean {
  return surface.mode === "all"
    ? surface.keys.every((k) => filled(intake, k))
    : surface.keys.some((k) => filled(intake, k));
}

function getPath(root: unknown, path: string): unknown {
  let cur: unknown = root;
  for (const seg of path.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

function setPath(root: Record<string, unknown>, path: string, value: unknown): void {
  const segs = path.split(".");
  let cur: Record<string, unknown> = root;
  for (const seg of segs.slice(0, -1)) {
    const next = cur[seg];
    if (!next || typeof next !== "object" || Array.isArray(next)) cur[seg] = {};
    cur = cur[seg] as Record<string, unknown>;
  }
  cur[segs[segs.length - 1]] = value;
}

/** Rebuild a C2 surface from the intake, via its single writer. */
function rebuildSurface(path: string, intake: unknown): unknown {
  if (path.endsWith("assessment_team")) return buildDpiaAssessmentTeam(intake);
  if (path.endsWith("validation_approval")) return buildDpiaValidationApproval(intake);
  // ITEM 380 §4 — the views surface has a single writer of its own.
  if (path.endsWith("data_subject_views")) return buildDpiaDataSubjectViews(intake);
  return undefined;
}


// ---------------------------------------------------------------------------
// C1 — Article 35(3) limbs
// ---------------------------------------------------------------------------

interface Limb {
  readonly limb: "a" | "b" | "c";
  readonly rule_id: string;
  readonly triggerRe: RegExp;
  readonly reasonRe: RegExp;
}

const LIMBS: readonly Limb[] = [
  {
    limb: "a",
    rule_id: "R_ART_35_3_A_AUTOMATED_DECISIONS",
    triggerRe: /35\s*\(\s*3\s*\)\s*\(\s*a\s*\)/i,
    reasonRe: /Art\.\s*35\(3\)\(a\)/i,
  },
  {
    limb: "b",
    rule_id: "R_ART_35_3_B_LARGE_SCALE_SPECIAL_CATEGORIES",
    triggerRe: /35\s*\(\s*3\s*\)\s*\(\s*b\s*\)/i,
    reasonRe: /Art\.\s*35\(3\)\(b\)/i,
  },
  {
    limb: "c",
    rule_id: "R_ART_35_3_C_PUBLIC_MONITORING",
    triggerRe: /35\s*\(\s*3\s*\)\s*\(\s*c\s*\)/i,
    reasonRe: /Art\.\s*35\(3\)\(c\)/i,
  },
];

/** The trigger asserts a limb only when it is not disclaiming it. */
function triggerAsserts(trigger: string, limb: Limb): boolean {
  if (!limb.triggerRe.test(trigger)) return false;
  // A trigger that enumerates the OPTIONS (the intake's own help text) is not
  // an assertion; nor is an explicit negation.
  if (/precautionary/i.test(trigger) && /options:/i.test(trigger)) return false;
  if (new RegExp(`(?:not|does not)\\s+(?:engage|apply)[^.]{0,80}${limb.limb === "a" ? "\\(a\\)" : limb.limb === "b" ? "\\(b\\)" : "\\(c\\)"}`, "i").test(trigger)) {
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// C3 — secondary-use predicate
// ---------------------------------------------------------------------------

export const SECONDARY_USE_ASSERTION_RE =
  /(secondary use|secondary purpose|further processing|re-?use of the data|repurpos)/i;

function secondaryUsesAreNone(intake: unknown): boolean {
  const v = str((intake as Record<string, unknown> | null)?.secondary_uses);
  return /^none\b/i.test(v.trim());
}

// ---------------------------------------------------------------------------
// C4 — structured-leaf hygiene
// ---------------------------------------------------------------------------

/** Leaf keys that hold structured values, never prose. */
export const STRUCTURED_LEAF_KEYS: readonly string[] = [
  "name",
  "role",
  "approved_by_name",
  "approved_by_title",
  "approval_date",
  "status",
  "citation",
  "template_ref",
  "risk_id",
  "likelihood",
  "severity",
  "inherent_band",
  "residual_band",
  "rule_id",
];

// ---------------------------------------------------------------------------
// the pass
// ---------------------------------------------------------------------------

export function runDpiaCsc(
  report: Record<string, unknown> | null | undefined,
  opts: DpiaCscOptions,
): DpiaCscTelemetry {
  const t: DpiaCscTelemetry = {
    version: DPIA_CSC_VERSION,
    violations: [],
    repairs: 0,
    crashed: false,
  };
  try {
    if (!report || typeof report !== "object") return t;
    const intake = opts?.intake ?? {};
    const needles = frameBodyNeedles(opts?.frameSet);

    const log = (v: DpiaCscViolation) => {
      t.violations.push(v);
      if (v.repaired) t.repairs += 1;
    };

    // ── C1 ────────────────────────────────────────────────────────────────
    const trigger = str(getPath(report, "dpia_metadata.article_35_3_trigger"));
    const reasons = str((intake as Record<string, unknown>)?.reasons_to_conduct);
    const map = report.engagement_map as { entries?: Array<Record<string, unknown>> } | undefined;
    const entries = Array.isArray(map?.entries) ? map!.entries! : [];
    for (const limb of LIMBS) {
      const idx = entries.findIndex((e) => str(e?.rule_id) === limb.rule_id);
      if (idx === -1) continue;
      const entry = entries[idx];
      if (str(entry.status) !== "not_engaged") continue;
      const byIntake = limb.reasonRe.test(reasons);
      const byTrigger = triggerAsserts(trigger, limb);
      if (!byIntake && !byTrigger) continue;
      const path = `engagement_map.entries[${idx}].status`;
      if (byIntake) {
        // Deterministic case: the controller SELECTED the limb at intake.
        entry.status = "engaged";
        entry.rationale =
          `The record selects Art. 35(3)(${limb.limb}) as a reason for conducting this assessment; the limb is engaged. ` +
          `(Cross-surface consistency repair: the engagement map had recorded this limb as not engaged.)`;
        log({
          check_id: "c1_engagement_vs_metadata_vs_intake",
          path,
          evidence: `intake.reasons_to_conduct selects Art. 35(3)(${limb.limb})`,
          repaired: true,
        });
      } else {
        log({
          check_id: "c1_engagement_vs_metadata_vs_intake",
          path,
          evidence:
            `dpia_metadata.article_35_3_trigger asserts Art. 35(3)(${limb.limb}) while the engagement map records "not_engaged": ${clip(trigger)}`,
          repaired: false,
        });
      }
    }

    // ── C2 ────────────────────────────────────────────────────────────────
    for (const surface of CSC_SURFACES) {
      if (!surfaceBacked(surface, intake)) continue; // honest degradation
      const node = getPath(report, surface.path);
      if (node === undefined || node === null) continue;
      // C2 reads the surface's PROSE leaves only. Structured leaves
      // (members[].role and friends) are C4's subject, so a defect in one is
      // never silently absorbed by the other check's repair.
      const prose = typeof node === "string"
        ? node
        // ITEM 380 §4 — an array surface (measures_rights and friends) is read
        // whole; its rows are prose, not structured leaves.
        : Array.isArray(node)
        ? str(node)
        : `${str((node as Record<string, unknown>).text)} ${
          str((node as Record<string, unknown>).information_needed)
        }`;
      const partial = PARTIAL_DISCHARGE_RE.exec(prose);
      const hit = carriesAbsenceLanguage(prose, needles) ?? (partial ? partial[0] : null);
      if (!hit) continue;

      const rebuilt = rebuildSurface(surface.path, intake);
      if (rebuilt !== undefined) {
        setPath(report, surface.path, rebuilt);
        log({
          check_id: "c2_absence_claim_vs_record",
          path: surface.path,
          evidence: `absence language on a surface backed by ${surface.keys.join("/")}: ${clip(hit)}`,
          repaired: true,
        });
      } else {
        log({
          check_id: "c2_absence_claim_vs_record",
          path: surface.path,
          evidence: `absence language on a backed surface: ${clip(hit)}`,
          repaired: false,
        });
      }
    }

    // ── C3 ────────────────────────────────────────────────────────────────
    if (secondaryUsesAreNone(intake)) {
      const register = report.risk_register;
      if (Array.isArray(register)) {
        const kept: unknown[] = [];
        for (let i = 0; i < register.length; i++) {
          const row = register[i] as Record<string, unknown> | null;
          const predicate = `${str(row?.source)} ${str(row?.rationale)}`;
          if (row && SECONDARY_USE_ASSERTION_RE.test(predicate)) {
            log({
              check_id: "c3_secondary_use_predicate",
              path: `risk_register[${i}] (${str(row.risk_id) || "unnumbered"})`,
              evidence:
                `row predicated on secondary uses the record denies (intake.secondary_uses begins "None"): ${clip(predicate)}`,
              repaired: true,
            });
            continue; // REMOVED. Remaining risk ids are NOT renumbered.
          }
          kept.push(register[i]);
        }
        if (kept.length !== register.length) report.risk_register = kept;
      }
    }

    // ── C4 ────────────────────────────────────────────────────────────────
    const dirtySurfaces = new Set<string>();
    const walk = (node: unknown, path: string): void => {
      if (node === null || node === undefined) return;
      if (Array.isArray(node)) {
        node.forEach((v, i) => walk(v, `${path}[${i}]`));
        return;
      }
      if (typeof node !== "object") return;
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        const p = path ? `${path}.${k}` : k;
        if (k === "_meta" || k === "_staging") continue;
        if (typeof v === "string") {
          if (!STRUCTURED_LEAF_KEYS.includes(k)) continue;
          const hit = carriesAbsenceLanguage(v, needles);
          if (!hit) continue;
          log({
            check_id: "c4_structured_leaf_hygiene",
            path: p,
            evidence: `structured leaf carries register/absence prose: ${clip(hit)}`,
            repaired: false,
          });
          for (const s of CSC_SURFACES) {
            if (p.startsWith(`${s.path}.`)) dirtySurfaces.add(s.path);
          }
          continue;
        }
        walk(v, p);
      }
    };
    walk(report, "");

    for (const path of dirtySurfaces) {
      const rebuilt = rebuildSurface(path, intake);
      if (rebuilt === undefined) continue;
      setPath(report, path, rebuilt);
      // Mark the C4 violations on this surface as repaired.
      for (const v of t.violations) {
        if (v.check_id === "c4_structured_leaf_hygiene" && v.path.startsWith(`${path}.`) && !v.repaired) {
          v.repaired = true;
          t.repairs += 1;
        }
      }
    }
  } catch (e) {
    t.crashed = true;
    t.error = (e as Error)?.message ?? String(e);
    console.warn("[dpia-csc] failed (non-fatal):", t.error);
  }
  return t;
}

/** Run the pass and attach its telemetry at `_meta.internal.dpia_csc`. */
export function attachDpiaCsc(
  report: Record<string, unknown>,
  opts: DpiaCscOptions,
): DpiaCscTelemetry {
  const t = runDpiaCsc(report, opts);
  try {
    const meta = (report._meta ??= {}) as Record<string, unknown>;
    const internal = (meta.internal ??= {}) as Record<string, unknown>;
    internal.dpia_csc = t;
  } catch { /* non-fatal */ }
  return t;
}
