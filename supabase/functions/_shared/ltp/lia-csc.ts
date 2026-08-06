// ITEM 385 LEG 2 — LIA CROSS-SURFACE CONSISTENCY (CSC).
//
// LIA ONLY. Deterministic post-pass in `run-li-assessment`, run AFTER every
// prose pass (frame substitution and the boilerplate cap included) and BEFORE
// the record-complete gate and the P2 serializer. It reads the assembled
// report and the persisted intake row, and asserts that what the document
// SAYS about the record agrees with what the record CONTAINS.
//
// LAWS (the dpia-csc / risk-csc idiom, unchanged)
// ----
//   * DETERMINISTIC — pure function of (report, intake). No I/O, no clock.
//   * FAIL-OPEN — any error yields `crashed:true` telemetry; report untouched.
//   * SINGLE-WRITER RESPECTING — a repair restores the LIA deliverable
//     builder's own output. This module authors no prose of its own.
//   * HONEST DEGRADATION — every check is predicated on the record SUPPLYING
//     the backing fact. On a genuinely silent record it does nothing.
//
// CHECKS
//   l1_engagement_vs_record   — an engagement-map limb recorded as not engaged
//                               while the record asserts its trigger (flag).
//   l2_absence_claim_vs_record— absence language on a surface the record backs
//                               (repaired from the surface's single writer).
//   l3_authority_field_hygiene— an authority field (authority_verbatim /
//                               supporting_verbatim / standard) carrying gap
//                               frame or absence prose instead of authority.
//                               Repaired by DELETING the field — an authority
//                               field carries authority or is absent (item384
//                               r4 verbatim_quote precedent).
//   l4_structured_leaf_hygiene— a structured leaf (verdict/status/citation …)
//                               carrying register or absence prose.
//
// Telemetry rides `_meta.internal.lia_csc`.

import {
  ABSENCE_CLASS_RE,
  carriesAbsenceLanguage,
  frameBodyNeedles,
  MACHINE_ABSENCE_SENTENCES,
  PARTIAL_DISCHARGE_RE,
} from "./dpia-csc.ts";
import type { FrameSet } from "../prose/frames.ts";
import { buildReasonableExpectations } from "./lia-deliverables/build.ts";
import {
  buildLiaAttestation,
  buildOptOutFeasibility,
  buildScaleFrequencyDuration,
} from "./lia-deliverables/build-upgrade4.ts";
import { repairDocumentationRecommendations } from "./lia-deliverables/doc-plan-register.ts";

export const LIA_CSC_VERSION = "lia-csc-2026-08-06-item385r2";


export type LiaCscCheckId =
  | "l1_engagement_vs_record"
  | "l2_absence_claim_vs_record"
  | "l3_authority_field_hygiene"
  | "l4_structured_leaf_hygiene";

export interface LiaCscViolation {
  check_id: LiaCscCheckId;
  path: string;
  evidence: string;
  repaired: boolean;
}

export interface LiaCscTelemetry {
  version: string;
  violations: LiaCscViolation[];
  repairs: number;
  crashed: boolean;
  error?: string;
}

export interface LiaCscOptions {
  /** The persisted LIA intake row the report was built from. */
  readonly intake: unknown;
  /** The approved LIA frame set, when the run loaded one. */
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

function clip(s: string, n = 160): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/** Read a dotted path off the intake row (LIA keys are nested). */
export function readIntakePath(intake: unknown, path: string): unknown {
  let cur: unknown = intake;
  for (const seg of String(path).split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

export function intakeFilled(intake: unknown, path: string): boolean {
  const v = readIntakePath(intake, path);
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return String(v).trim().length > 0;
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

// ---------------------------------------------------------------------------
// L2 — surface → backing intake keys
// ---------------------------------------------------------------------------

export interface LiaCscSurface {
  /** Dotted report path of the surface. */
  readonly path: string;
  /** Dotted intake paths that back it. */
  readonly keys: readonly string[];
  readonly mode: "any" | "all";
  /** Single writer, when the surface has one. */
  readonly rebuild?: (intake: unknown) => unknown;
  /**
   * ITEM 385 r2 — a surface whose repair needs the ASSEMBLED REPORT as well as
   * the record (the plan register derives from this report's own classified
   * open items). Takes precedence over `rebuild` when present.
   */
  readonly repair?: (node: unknown, intake: unknown, report: unknown) => unknown;
}


export const LIA_CSC_SURFACES: readonly LiaCscSurface[] = [
  // The VIEWS / CONSULTATION surface. LIA's analogue of the DPIA Art. 35(9)
  // surface is the Recital 47 expectation factor: it runs on what the data
  // subjects were told and in what setting the data were collected.
  {
    path: "reasonable_expectations",
    keys: [
      "balancing_details.reasonable_expectation",
      "balancing_details.collection_context",
    ],
    mode: "all",
    rebuild: (intake) => buildReasonableExpectations(intake),
  },
  // The DPO-ADVICE surface.
  {
    path: "attestation_block",
    keys: [
      "attestation.dpo_reviewed",
      "attestation.dpo_reviewer",
      "attestation.dpo_review_date",
    ],
    mode: "any",
    rebuild: (intake) => buildLiaAttestation(intake),
  },
  // The OPT-OUT surface.
  {
    path: "opt_out_feasibility",
    keys: [
      "balancing_details.opt_out_mechanism",
      "balancing_details.opt_out_available",
    ],
    mode: "any",
    rebuild: (intake) => buildOptOutFeasibility(intake),
  },
  // The SCALE / FREQUENCY / DURATION surface.
  {
    path: "scale_frequency_duration",
    keys: [
      "balancing_details.scale_approx",
      "balancing_details.frequency",
      "balancing_details.duration",
    ],
    mode: "any",
    rebuild: (intake) => buildScaleFrequencyDuration(intake),
  },
  // The SAFEGUARDS surface. The balancing narrative has NO deterministic
  // single writer, so a violation here is flagged and left standing: the
  // record-complete gate reads unrepaired l2 violations and stays shut.
  {
    path: "three_part_test.balancing_test",
    keys: [
      "balancing_details.safeguards",
      "balancing_details.safeguards_other",
      "balancing_details.additional_mitigations",
    ],
    mode: "any",
  },
  // ITEM 385 r2 DEFECT 2 — the DOCUMENTATION-PLAN surface. Backed whenever the
  // record supplies the facts the plan is written from; repaired by the plan
  // register (doc-plan-register.ts), which derives what to write down next
  // from THIS report's classified open items (G-6 ledger discipline).
  {
    path: "documentation_recommendations",
    keys: [
      "balancing_details.safeguards",
      "balancing_details.opt_out_mechanism",
      "balancing_details.reasonable_expectation",
      "processing_description",
      "attestation.dpo_reviewed",
    ],
    mode: "any",
    repair: (node, intake, report) => {
      const r = repairDocumentationRecommendations(node, intake, report);
      return r.changed ? r.value : undefined;
    },
  },
];

function surfaceBacked(s: LiaCscSurface, intake: unknown): boolean {
  return s.mode === "all"
    ? s.keys.every((k) => intakeFilled(intake, k))
    : s.keys.some((k) => intakeFilled(intake, k));
}


/** The prose a surface node exposes to L2, whatever its shape. */
export function surfaceProse(node: unknown): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(surfaceProse).join(" ");
  if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    return [
      "text",
      "application",
      "record_fact",
      "feasibility",
      "mechanism",
      "reasoning",
      "information_needed",
      "cumulative_note",
    ]
      .map((k) => str(o[k]))
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

// ---------------------------------------------------------------------------
// L1 — engagement map vs record
// ---------------------------------------------------------------------------

interface LiaLimb {
  readonly id: string;
  readonly labelRe: RegExp;
  /** True when the record asserts the trigger. */
  readonly asserted: (intake: unknown) => boolean;
  readonly why: string;
}

const YES_RE = /^yes\b/i;

export const LIA_LIMBS: readonly LiaLimb[] = [
  {
    id: "children",
    labelRe: /child/i,
    asserted: (i) => YES_RE.test(str(readIntakePath(i, "balancing_details.children_data_subjects"))),
    why: "the record answers that the data subjects include children",
  },
  {
    id: "public_authority",
    labelRe: /public[ _-]?authority/i,
    asserted: (i) =>
      YES_RE.test(str(readIntakePath(i, "purpose_details.controller_is_public_authority"))) &&
      YES_RE.test(str(readIntakePath(i, "purpose_details.public_task_processing"))),
    why: "the record identifies a public authority acting in the performance of its tasks",
  },
  {
    id: "special_category",
    labelRe: /(special[ _-]?categor|article\s*9|art\.?\s*9)/i,
    asserted: (i) => readIntakePath(i, "balancing_details.special_category_data") === true,
    why: "the record answers that special-category data are in scope",
  },
];

// ---------------------------------------------------------------------------
// L3 — authority fields
// ---------------------------------------------------------------------------

/** Fields that carry AUTHORITY (statutory or guidance text), never prose about the record. */
export const AUTHORITY_FIELD_KEYS: readonly string[] = [
  "authority_verbatim",
  "supporting_verbatim",
  "verbatim_quote",
  "standard",
];

/** Absence/gap prose that must never occupy an authority field. */
export function looksLikeAbsenceProse(text: string, needles: readonly string[]): string | null {
  const t = String(text ?? "").replace(/\s+/g, " ");
  if (!t.trim()) return null;
  const hit = carriesAbsenceLanguage(t, needles);
  if (hit) return hit;
  if (PARTIAL_DISCHARGE_RE.test(t)) return PARTIAL_DISCHARGE_RE.exec(t)![0];
  const m = /(the record is silent|carried forward|we could not verify this item|listed under information needed)/i
    .exec(t);
  return m ? m[0] : null;
}

// ---------------------------------------------------------------------------
// L4 — structured leaves
// ---------------------------------------------------------------------------

export const LIA_STRUCTURED_LEAF_KEYS: readonly string[] = [
  "verdict",
  "status",
  "citation",
  "standard_citation",
  "supporting_citation",
  "outcome",
  "category",
  "category_label",
  "severity",
  "feasibility",
  "approval_date",
  "dpo_review",
  "id",
  "label",
];

// ---------------------------------------------------------------------------
// the pass
// ---------------------------------------------------------------------------

export function runLiaCsc(
  report: Record<string, unknown> | null | undefined,
  opts: LiaCscOptions,
): LiaCscTelemetry {
  const t: LiaCscTelemetry = {
    version: LIA_CSC_VERSION,
    violations: [],
    repairs: 0,
    crashed: false,
  };
  try {
    if (!report || typeof report !== "object") return t;
    const intake = opts?.intake ?? {};
    const needles = frameBodyNeedles(opts?.frameSet);

    const log = (v: LiaCscViolation) => {
      t.violations.push(v);
      if (v.repaired) t.repairs += 1;
    };

    // ── L1 ────────────────────────────────────────────────────────────────
    const map = report.engagement_map as { entries?: Array<Record<string, unknown>> } | undefined;
    const entries = Array.isArray(map?.entries) ? map!.entries! : [];
    entries.forEach((e, i) => {
      if (str(e?.status) !== "not_engaged") return;
      const label = `${str(e?.rule_id)} ${str(e?.name)}`;
      for (const limb of LIA_LIMBS) {
        if (!limb.labelRe.test(label)) continue;
        if (!limb.asserted(intake)) continue;
        log({
          check_id: "l1_engagement_vs_record",
          path: `engagement_map.entries[${i}].status`,
          evidence: `the map records "not_engaged" although ${limb.why}: ${clip(label)}`,
          repaired: false,
        });
      }
    });

    // ── L2 ────────────────────────────────────────────────────────────────
    for (const surface of LIA_CSC_SURFACES) {
      if (!surfaceBacked(surface, intake)) continue; // honest degradation
      const node = getPath(report, surface.path);
      if (node === undefined || node === null) continue;
      // A surface with a report-aware repair is read DEEPLY: its frames sit in
      // nested lists (key_elements, review_triggers) the shallow extractor
      // never reaches. Shallow extraction stays the default so no existing
      // surface changes behaviour.
      const prose = surface.repair ? deepProse(node) : surfaceProse(node);
      if (!prose.trim()) continue;
      const partial = PARTIAL_DISCHARGE_RE.exec(prose);
      const hit = carriesAbsenceLanguage(prose, needles) ?? (partial ? partial[0] : null);
      if (!hit) continue;

      const rebuilt = surface.repair
        ? surface.repair(node, intake, report)
        : surface.rebuild
        ? surface.rebuild(intake)
        : undefined;
      const usable = rebuilt !== undefined && rebuilt !== null &&
        (typeof rebuilt === "object" ? true : str(rebuilt) !== "");
      if (usable) {

        // Never change a surface's SHAPE.
        setPath(
          report,
          surface.path,
          Array.isArray(node) && !Array.isArray(rebuilt) ? [rebuilt] : rebuilt,
        );
        log({
          check_id: "l2_absence_claim_vs_record",
          path: surface.path,
          evidence: `absence language on a surface backed by ${surface.keys.join("/")}: ${clip(hit)}`,
          repaired: true,
        });
      } else {
        log({
          check_id: "l2_absence_claim_vs_record",
          path: surface.path,
          evidence: `absence language on a backed surface: ${clip(hit)}`,
          repaired: false,
        });
      }
    }

    // ── L3 + L4 ───────────────────────────────────────────────────────────
    const dirtySurfaces = new Set<string>();
    const walk = (node: unknown, path: string): void => {
      if (node === null || node === undefined) return;
      if (Array.isArray(node)) {
        node.forEach((v, i) => walk(v, `${path}[${i}]`));
        return;
      }
      if (typeof node !== "object") return;
      const obj = node as Record<string, unknown>;
      for (const [k, v] of Object.entries(obj)) {
        const p = path ? `${path}.${k}` : k;
        if (k === "_meta" || k === "_staging" || k === "_revision") continue;
        if (typeof v === "string") {
          if (AUTHORITY_FIELD_KEYS.includes(k)) {
            const hit = looksLikeAbsenceProse(v, needles);
            if (!hit) continue;
            // An authority field carries authority or is absent.
            delete obj[k];
            log({
              check_id: "l3_authority_field_hygiene",
              path: p,
              evidence: `authority field carried absence prose and was dropped: ${clip(hit)}`,
              repaired: true,
            });
            continue;
          }
          if (!LIA_STRUCTURED_LEAF_KEYS.includes(k)) continue;
          const hit = carriesAbsenceLanguage(v, needles);
          if (!hit) continue;
          log({
            check_id: "l4_structured_leaf_hygiene",
            path: p,
            evidence: `structured leaf carries register/absence prose: ${clip(hit)}`,
            repaired: false,
          });
          for (const s of LIA_CSC_SURFACES) {
            if (p === s.path || p.startsWith(`${s.path}.`)) dirtySurfaces.add(s.path);
          }
          continue;
        }
        walk(v, p);
      }
    };
    walk(report, "");

    for (const path of dirtySurfaces) {
      const surface = LIA_CSC_SURFACES.find((s) => s.path === path);
      if (!surface?.rebuild) continue;
      if (!surfaceBacked(surface, intake)) continue;
      const rebuilt = surface.rebuild(intake);
      if (rebuilt === undefined || rebuilt === null) continue;
      setPath(report, path, rebuilt);
      for (const v of t.violations) {
        if (
          v.check_id === "l4_structured_leaf_hygiene" &&
          (v.path === path || v.path.startsWith(`${path}.`)) && !v.repaired
        ) {
          v.repaired = true;
          t.repairs += 1;
        }
      }
    }
  } catch (e) {
    t.crashed = true;
    t.error = (e as Error)?.message ?? String(e);
    console.warn("[lia-csc] failed (non-fatal):", t.error);
  }
  return t;
}

/** Run the pass and attach its telemetry at `_meta.internal.lia_csc`. */
export function attachLiaCsc(
  report: Record<string, unknown>,
  opts: LiaCscOptions,
): LiaCscTelemetry {
  const t = runLiaCsc(report, opts);
  try {
    const meta = (report._meta ??= {}) as Record<string, unknown>;
    const internal = (meta.internal ??= {}) as Record<string, unknown>;
    internal.lia_csc = t;
  } catch { /* non-fatal */ }
  return t;
}

/** Re-export so callers need only this module. */
export { ABSENCE_CLASS_RE, MACHINE_ABSENCE_SENTENCES };
