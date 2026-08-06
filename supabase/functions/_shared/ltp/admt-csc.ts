// ITEM 394 LEG C — ADMT CROSS-SURFACE CONSISTENCY (CSC).
//
// ADMT ONLY. Deterministic post-pass in `run-admt-checker`, run AFTER the
// item-392 prose-gold pass and BEFORE the coverage matrix, the record-complete
// gate and the P2 serializer. It reads the assembled report and the FULL
// persisted intake record (`assessment.intake_data`) and asserts that what the
// document SAYS about the record agrees with what the record CONTAINS.
//
// LAWS (the dpia-csc / lia-csc idiom, unchanged)
//   * DETERMINISTIC — pure function of (report, intake). No I/O, no clock.
//   * FAIL-OPEN — any error yields `crashed:true`; the report is untouched.
//   * SINGLE-WRITER RESPECTING — a repair restores the surface's own writer
//     (`admt-deliverables/record-register.ts`). This module authors no prose.
//   * HONEST DEGRADATION — every check is predicated on the record SUPPLYING
//     the backing fact. On a genuinely silent record it does nothing.
//
// CHECKS
//   a1_element_conclusion_vs_record — an adequacy element concluded
//                                     "insufficient_basis" while the record
//                                     supplies every fact that element runs on
//                                     (flag).
//   a2_absence_claim_vs_record      — absence language on a surface the record
//                                     backs (repaired from the single writer
//                                     where one exists). This is the id the
//                                     record-complete gate reads.
//   a3_authority_field_hygiene      — an authority field carrying absence prose
//                                     instead of authority (repaired by
//                                     deletion — item384 r4 precedent).
//   a4_structured_leaf_hygiene      — a structured leaf (verdict/status/
//                                     citation …) carrying register or absence
//                                     prose (flag).
//
// Telemetry rides `_meta.internal.admt_csc`.

import {
  ABSENCE_CLASS_RE,
  carriesAbsenceLanguage,
  frameBodyNeedles,
  MACHINE_ABSENCE_SENTENCES,
  PARTIAL_DISCHARGE_RE,
} from "./dpia-csc.ts";
import {
  buildHumanInvolvementRecord,
  buildHumanReviewReasoning,
  buildLogicDisclosureRecord,
} from "./admt-deliverables/record-register.ts";
import {
  ADMT_RECORD_BACKED_LABEL,
  buildOpenItemsLedger,
  elementMeta,
  isUnresolvedConclusion,
} from "./admt-prose-gold.ts";

export const ADMT_CSC_VERSION = "admt-csc-2026-08-06-item396";

/**
 * ITEM 396 — THE PHRASING CLASS THE ITEM-392 PROSE-GOLD PASS ITSELF WRITES.
 *
 * The first full-stack pilot (doc 6146db76) shipped a false absence on a fully
 * backed adequacy surface: prose-gold had relabelled `insufficient_basis` to
 * "not established from the information supplied" and written the open-items
 * ledger, and NEITHER form appeared in the emit-gate absence catalog the CSC
 * detector reads — so a2 saw no absence on a backed surface and repaired
 * nothing. This regex closes the class. The linkage test in
 * `tests/edge/item396` enumerates every phrasing prose-gold can write and
 * asserts each one matches here, so a future relabeling breaks the build.
 */
export const ADMT_LABEL_ABSENCE_RE =
  /(not established from the information supplied|(?:is|are|was|were)\s+not\s+established\b|not established on the (?:present )?record|Open items:[^.]{0,400}?\b(?:is|are)\s+unresolved)/i;

/**
 * The ADMT absence detector: the shared emit-gate catalog PLUS the reader-label
 * class above. Used by a2 (surface detection) and a3 (authority-field hygiene).
 * a4 deliberately keeps the narrow catalog: a structured `conclusion_label`
 * legitimately carries the reader label on a genuinely unbacked element.
 */
export function admtCarriesAbsence(text: string, needles: readonly string[]): string | null {
  const t = String(text ?? "").replace(/\s+/g, " ");
  if (!t.trim()) return null;
  const catalog = carriesAbsenceLanguage(t, needles);
  if (catalog) return catalog;
  const m = ADMT_LABEL_ABSENCE_RE.exec(t);
  return m ? m[0] : null;
}


export type AdmtCscCheckId =
  | "a1_element_conclusion_vs_record"
  | "a2_absence_claim_vs_record"
  | "a3_authority_field_hygiene"
  | "a4_structured_leaf_hygiene";

export interface AdmtCscViolation {
  check_id: AdmtCscCheckId;
  path: string;
  evidence: string;
  repaired: boolean;
}

export interface AdmtCscTelemetry {
  version: string;
  violations: AdmtCscViolation[];
  repairs: number;
  crashed: boolean;
  error?: string;
}

export interface AdmtCscOptions {
  /** The FULL persisted ADMT intake record the report was built from. */
  readonly intake: unknown;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function str(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(str).filter(Boolean).join(" | ");
  if (v && typeof v === "object") {
    try { return JSON.stringify(v); } catch { return ""; }
  }
  return "";
}

function clip(s: string, n = 160): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

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
// A2 — surface → backing intake keys
// ---------------------------------------------------------------------------

export interface AdmtCscSurface {
  /** Dotted report path of the surface. */
  readonly path: string;
  /** Dotted intake paths that back it. */
  readonly keys: readonly string[];
  /**
   * "all" — every key must be filled before the surface counts as backed.
   * ADMT defaults to "all" on the multi-element finding surfaces: a record
   * that answers only part of §§ 7220-7222 legitimately carries absence
   * language for the parts it does not answer.
   */
  readonly mode: "any" | "all";
  /** Single writer, when the surface has one. */
  readonly rebuild?: (intake: unknown) => unknown;
  /** Report-aware repair; takes precedence over `rebuild`. */
  readonly repair?: (node: unknown, intake: unknown, report: unknown) => unknown;
}

export const ADMT_CSC_SURFACES: readonly AdmtCscSurface[] = [
  // § 7222(b)(2) LOGIC-DISCLOSURE element (adequacy_by_element section).
  {
    path: "adequacy_finding.logic_disclosure",
    keys: ["access_logic_disclosure"],
    mode: "all",
    repair: (node, intake) => {
      const built = buildLogicDisclosureRecord(intake);
      if (!built) return undefined;
      if (node && typeof node === "object" && !Array.isArray(node)) {
        return { ...(node as Record<string, unknown>), reason: built };
      }
      return built;
    },
  },
  // § 7221(b)(1) HUMAN-INVOLVEMENT element.
  {
    path: "adequacy_finding.human_intervention",
    keys: ["human_review"],
    mode: "all",
    repair: (node, intake) => {
      const built = buildHumanInvolvementRecord(intake);
      if (!built) return undefined;
      if (node && typeof node === "object" && !Array.isArray(node)) {
        return { ...(node as Record<string, unknown>), reason: built };
      }
      return built;
    },
  },
  // The SCOPE section's human-review reasoning.
  {
    path: "scope_analysis.human_review_reasoning",
    keys: ["human_review"],
    mode: "all",
    rebuild: (intake) => buildHumanReviewReasoning(intake) || undefined,
  },
  // § 7220 PRE-USE NOTICE findings. No deterministic single writer: a
  // violation here is flagged and left standing, and the record-complete gate
  // reads it.
  {
    path: "notice_element_findings",
    keys: [
      "notice_full_text",
      "notice_delivery",
      "notice_has_specific_purpose",
      "notice_purpose_text",
    ],
    mode: "all",
  },
  // § 7221 OPT-OUT findings.
  {
    path: "opt_out_gaps",
    keys: [
      "opt_out_methods",
      "opt_out_exception",
      "opt_out_confirmation_mechanism",
      "opt_out_15_day_process",
    ],
    mode: "all",
  },
  // § 7222 ACCESS-READINESS findings.
  {
    path: "access_readiness_findings",
    keys: [
      "access_submission_methods",
      "access_verification_process",
      "access_logic_disclosure",
      "access_outcome_disclosure",
    ],
    mode: "all",
  },
];

/** Every string a surface carries, at any depth. */
export function deepProse(node: unknown): string {
  const out: string[] = [];
  const walk = (n: unknown) => {
    if (typeof n === "string") { out.push(n); return; }
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n && typeof n === "object") Object.values(n as Record<string, unknown>).forEach(walk);
  };
  walk(node);
  return out.join(" ");
}

function surfaceBacked(s: AdmtCscSurface, intake: unknown): boolean {
  return s.mode === "all"
    ? s.keys.every((k) => intakeFilled(intake, k))
    : s.keys.some((k) => intakeFilled(intake, k));
}

/** The prose a surface node exposes to A2, whatever its shape. */
export function surfaceProse(node: unknown): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(surfaceProse).join(" ");
  if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    return [
      "reason", "why", "text", "application", "record_fact",
      "finding", "gap_description", "process_on_the_record",
      "record_source", "reasoning", "information_needed",
    ].map((k) => str(o[k])).filter(Boolean).join(" ");
  }
  return "";
}

// ---------------------------------------------------------------------------
// A1 — adequacy element conclusion vs record
// ---------------------------------------------------------------------------

interface AdmtElement {
  readonly id: string;
  /** Every intake path the element runs on. */
  readonly keys: readonly string[];
  readonly why: string;
  /** ITEM 396 — the element's single writer, used by the a1 repair. */
  readonly rebuild: (intake: unknown) => string;
}

export const ADMT_ADEQUACY_ELEMENTS: readonly AdmtElement[] = [
  {
    id: "logic_disclosure",
    keys: ["access_logic_disclosure"],
    why: "the record states the explanation the business can give of how the technology produced its output",
    rebuild: buildLogicDisclosureRecord,
  },
  {
    id: "human_intervention",
    keys: ["human_review", "opt_out_appeal_process"],
    why: "the record answers the human-review question and describes the appeal process",
    rebuild: buildHumanInvolvementRecord,
  },
];


// ---------------------------------------------------------------------------
// A3 / A4 — field hygiene
// ---------------------------------------------------------------------------

export const AUTHORITY_FIELD_KEYS: readonly string[] = [
  "element_verbatim",
  "condition_verbatim",
  "verbatim_quote",
  "standard",
  "excerpt",
];

export function looksLikeAbsenceProse(text: string, needles: readonly string[]): string | null {
  const t = String(text ?? "").replace(/\s+/g, " ");
  if (!t.trim()) return null;
  const hit = admtCarriesAbsence(t, needles);
  if (hit) return hit;
  if (PARTIAL_DISCHARGE_RE.test(t)) return PARTIAL_DISCHARGE_RE.exec(t)![0];
  const m = /(the record is silent|carried forward|we could not verify this item|listed under information needed)/i
    .exec(t);
  return m ? m[0] : null;
}

export const ADMT_STRUCTURED_LEAF_KEYS: readonly string[] = [
  "verdict",
  "status",
  "status_label",
  "citation",
  "priority",
  "severity",
  "deadline",
  "element_label",
  "conclusion",
  "corpus_key",
];

// ---------------------------------------------------------------------------
// the pass
// ---------------------------------------------------------------------------

export function runAdmtCsc(
  report: Record<string, unknown> | null | undefined,
  opts: AdmtCscOptions,
): AdmtCscTelemetry {
  const t: AdmtCscTelemetry = {
    version: ADMT_CSC_VERSION,
    violations: [],
    repairs: 0,
    crashed: false,
  };
  try {
    if (!report || typeof report !== "object") return t;
    const intake = opts?.intake ?? {};
    const needles = frameBodyNeedles(null);

    const log = (v: AdmtCscViolation) => {
      t.violations.push(v);
      if (v.repaired) t.repairs += 1;
    };

    // ── A1 ────────────────────────────────────────────────────────────────
    // ITEM 396 — a1 now REPAIRS. Rule implemented (stated for the record):
    // when an adequacy element concludes "insufficient_basis" while the record
    // answers EVERY key that element runs on, the element's single writer
    // (the record register) rewrites the reader surface — `reason` — from what
    // the record states, the reader label follows
    // (`conclusion_label` → "established on the record"), and the element is
    // marked `record_backed: true` so it leaves the open-items ledger.
    //   The MACHINE ENUM `conclusion` IS NEVER FLIPPED. Determination semantics
    // (decideConsequence-class logic, the emit gate and the renderers that key
    // on the enum) stay byte-identical; only reader surfaces change.
    const adequacy = report.adequacy_finding as Record<string, unknown> | undefined;
    if (adequacy && typeof adequacy === "object" && !Array.isArray(adequacy)) {
      for (const el of ADMT_ADEQUACY_ELEMENTS) {
        const node = adequacy[el.id] as Record<string, unknown> | undefined;
        if (!node || typeof node !== "object" || Array.isArray(node)) continue;
        if (!isUnresolvedConclusion(node.conclusion)) continue;
        if (!el.keys.every((k) => intakeFilled(intake, k))) continue; // honest silence
        const built = el.rebuild(intake);
        if (built) {
          node.reason = built;
          node.conclusion_label = ADMT_RECORD_BACKED_LABEL;
          node.record_backed = true;
        }
        log({
          check_id: "a1_element_conclusion_vs_record",
          path: `adequacy_finding.${el.id}.conclusion`,
          evidence: `the element is concluded "insufficient_basis" although ${el.why} (${el.keys.join(", ")}).`,
          repaired: Boolean(built),
        });
      }

      // ── THE ONE OPEN-ELEMENT LEDGER (G-6) ──────────────────────────────
      // Derived STRICTLY from the elements that remain genuinely unbacked
      // after the a1 repairs above. Perfect record ⇒ no ledger.
      const stillOpen: string[] = [];
      for (const [key, value] of Object.entries(adequacy)) {
        if (key === "open_items" || !value || typeof value !== "object" || Array.isArray(value)) continue;
        const elNode = value as Record<string, unknown>;
        if (isUnresolvedConclusion(elNode.conclusion) && elNode.record_backed !== true) {
          stillOpen.push(elementMeta(key).label);
        }
      }
      const ledger = buildOpenItemsLedger(stillOpen);
      if (ledger) adequacy.open_items = ledger;
      else if ("open_items" in adequacy) delete adequacy.open_items;
    }

    // ── A2 ────────────────────────────────────────────────────────────────
    for (const surface of ADMT_CSC_SURFACES) {
      if (!surfaceBacked(surface, intake)) continue; // honest degradation
      const node = getPath(report, surface.path);
      if (node === undefined || node === null) continue;
      const prose = surface.repair || surface.rebuild ? deepProse(node) : surfaceProse(node);
      if (!prose.trim()) continue;
      const partial = PARTIAL_DISCHARGE_RE.exec(prose);
      const hit = admtCarriesAbsence(prose, needles) ?? (partial ? partial[0] : null);
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
          check_id: "a2_absence_claim_vs_record",
          path: surface.path,
          evidence: `absence language on a surface backed by ${surface.keys.join("/")}: ${clip(hit)}`,
          repaired: true,
        });
      } else {
        log({
          check_id: "a2_absence_claim_vs_record",
          path: surface.path,
          evidence: `absence language on a backed surface: ${clip(hit)}`,
          repaired: false,
        });
      }
    }

    // ── A3 + A4 ───────────────────────────────────────────────────────────
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
              check_id: "a3_authority_field_hygiene",
              path: p,
              evidence: `authority field carried absence prose and was dropped: ${clip(hit)}`,
              repaired: true,
            });
            continue;
          }
          if (!ADMT_STRUCTURED_LEAF_KEYS.includes(k)) continue;
          const hit = carriesAbsenceLanguage(v, needles);
          if (!hit) continue;
          log({
            check_id: "a4_structured_leaf_hygiene",
            path: p,
            evidence: `structured leaf carries register/absence prose: ${clip(hit)}`,
            repaired: false,
          });
          continue;
        }
        walk(v, p);
      }
    };
    walk(report, "");
  } catch (e) {
    t.crashed = true;
    t.error = (e as Error)?.message ?? String(e);
    console.warn("[admt-csc] failed (non-fatal):", t.error);
  }
  return t;
}

/** Run the pass and attach its telemetry at `_meta.internal.admt_csc`. */
export function attachAdmtCsc(
  report: Record<string, unknown>,
  opts: AdmtCscOptions,
): AdmtCscTelemetry {
  const t = runAdmtCsc(report, opts);
  try {
    const meta = (report._meta ??= {}) as Record<string, unknown>;
    const internal = (meta.internal ??= {}) as Record<string, unknown>;
    internal.admt_csc = t;
  } catch { /* non-fatal */ }
  return t;
}

export { ABSENCE_CLASS_RE, MACHINE_ABSENCE_SENTENCES };
