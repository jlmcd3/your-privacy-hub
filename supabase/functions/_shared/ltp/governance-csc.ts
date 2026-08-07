// ITEM 402 LEG C — GOVERNANCE CROSS-SURFACE CONSISTENCY (CSC).
//
// GOVERNANCE ONLY. Deterministic post-pass in `run-governance-assessment`, run
// AFTER the item-400 prose-gold pass and BEFORE the coverage matrix, the
// item-401 record-complete gate, the emit gate and the P2 serializer. It reads
// the assembled report and the FULL persisted intake record
// (`assessment.intake_data`) and asserts that what the document SAYS about the
// record agrees with what the record CONTAINS.
//
// LAWS (the dpia-csc / lia-csc / admt-csc idiom, unchanged)
//   * DETERMINISTIC — pure function of (report, intake). No I/O, no clock.
//   * FAIL-OPEN — any error yields `crashed:true`; the report is untouched.
//   * SINGLE-WRITER RESPECTING — a repair restores the surface's own writer
//     (`governance-deliverables/record-register.ts`). This module authors no
//     prose of its own.
//   * HONEST DEGRADATION — every check is predicated on the record SUPPLYING
//     the backing fact. On a genuinely silent record it does nothing, and the
//     surface keeps its absence sentence byte-for-byte.
//   * DETERMINATION OUTCOMES ARE READ-ONLY — `verdict` / `status` enums are
//     never flipped. Only reader surfaces change.
//
// CHECKS
//   g1_domain_finding_vs_record   — a per-domain finding claims the record does
//                                   not state a control fact the record does
//                                   state (flag).
//   g2_absence_claim_vs_record    — absence language on a surface the record
//                                   backs, repaired from the record register
//                                   where a single writer exists. This is the
//                                   id `FALSE_ABSENCE_CHECK_IDS.governance`
//                                   reads.
//   g3_authority_field_hygiene    — an authority field (`standard`,
//                                   `benchmark_verbatim`, …) carrying absence
//                                   prose instead of authority (repaired by
//                                   deletion — the item384 r4 precedent).
//   g4_structured_leaf_hygiene    — a structured leaf (verdict/status/citation/
//                                   severity …) carrying register or absence
//                                   prose (flag).
//
// Telemetry rides `_meta.internal.governance_csc`.

import { carriesAbsenceLanguage, frameBodyNeedles, PARTIAL_DISCHARGE_RE } from "./dpia-csc.ts";
import { GOVERNANCE_ABSENCE_LABEL_PHRASINGS } from "./governance-prose-gold.ts";
import {
  buildDpoRecordStatement,
  buildRetentionStatement,
  buildTrainingStatement,
  buildTransferStatement,
  buildVendorArt28Statement,
} from "./governance-deliverables/record-register.ts";

export const GOVERNANCE_CSC_VERSION = "governance-csc@item402-2026-08-07";

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * ITEM 396 LESSON — the detector is BUILT FROM the phrasing class the item400
 * prose-gold pass can write, plus the generic governance absence family. The
 * linkage test in `tests/edge/item402` enumerates the phrasings and asserts
 * each is matched here, so a relabel cannot escape its own detector.
 */
export const GOVERNANCE_LABEL_ABSENCE_RE = new RegExp(
  [
    ...GOVERNANCE_ABSENCE_LABEL_PHRASINGS.map(escapeRe),
    "the record does not (?:yet )?(?:carry|state|evidence|record|show)\\b",
    "the (?:intake|record) does not confirm\\b",
    "we could not verify this item",
    "is not (?:established|evidenced) (?:from|on) the (?:information supplied|record)",
    "no information (?:was )?(?:supplied|provided) (?:about|on)\\b",
    "listed under information needed",
  ].join("|"),
  "i",
);

/** The governance absence detector: shared emit-gate catalog + the label class. */
export function governanceCarriesAbsence(
  text: string,
  needles: readonly string[],
): string | null {
  const t = String(text ?? "").replace(/\s+/g, " ");
  if (!t.trim()) return null;
  const catalog = carriesAbsenceLanguage(t, needles);
  if (catalog) return catalog;
  const m = GOVERNANCE_LABEL_ABSENCE_RE.exec(t);
  return m ? m[0] : null;
}

export type GovernanceCscCheckId =
  | "g1_domain_finding_vs_record"
  | "g2_absence_claim_vs_record"
  | "g3_authority_field_hygiene"
  | "g4_structured_leaf_hygiene";

export interface GovernanceCscViolation {
  check_id: GovernanceCscCheckId;
  path: string;
  evidence: string;
  repaired: boolean;
}

export interface GovernanceCscTelemetry {
  version: string;
  violations: GovernanceCscViolation[];
  repairs: number;
  crashed: boolean;
  error?: string;
}

export interface GovernanceCscOptions {
  /** The FULL persisted governance intake record the report was built from. */
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
  if (typeof v === "string") {
    const t = v.trim();
    return t.length > 0 && t.toLowerCase() !== "n/a" && t.toLowerCase() !== "no";
  }
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

/** Every string a surface carries, at any depth (machine buckets excluded). */
export function deepProse(node: unknown): string {
  const out: string[] = [];
  const walk = (n: unknown) => {
    if (typeof n === "string") { out.push(n); return; }
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n && typeof n === "object") {
      for (const [k, v] of Object.entries(n as Record<string, unknown>)) {
        if (k === "_meta" || k === "_staging") continue;
        walk(v);
      }
    }
  };
  walk(node);
  return out.join(" ");
}

// ---------------------------------------------------------------------------
// G2 — surface → backing intake keys (the absence-claim map)
// ---------------------------------------------------------------------------

export interface GovernanceCscSurface {
  /** Dotted report path of the surface. */
  readonly path: string;
  /** Dotted intake paths that back it. */
  readonly keys: readonly string[];
  /** "any" — one filled key backs the surface; "all" — every key must be filled. */
  readonly mode: "any" | "all";
  /** Reader leaf the repair writes into (the surface's own prose slot). */
  readonly leaf: string;
  /** Single writer from the record register, when the surface has one. */
  readonly rebuild?: (intake: unknown) => string;
}

export const GOVERNANCE_CSC_SURFACES: readonly GovernanceCscSurface[] = [
  // Arts. 37–39 — the DPO / accountability surface.
  {
    path: "dpo_determination",
    keys: ["dpo_status", "remediation_default_owner", "additional_context"],
    mode: "any",
    leaf: "record_states",
    rebuild: buildDpoRecordStatement,
  },
  // Art. 28 — the vendor / processor-contract surface.
  {
    path: "domain_findings.vendor_terms",
    keys: ["dpa_status", "dpa_art28_verified", "processing_nature"],
    mode: "any",
    leaf: "record_states",
    rebuild: buildVendorArt28Statement,
  },
  // Chapter V — the transfer surface.
  {
    path: "transfer_analysis",
    keys: ["transfer_status", "transfer_mechanism"],
    mode: "any",
    leaf: "record_states",
    rebuild: buildTransferStatement,
  },
  // Art. 30(1)(f) — the retention surface.
  {
    path: "art30_element_findings",
    keys: ["processing_scope"],
    mode: "all",
    leaf: "record_states",
    rebuild: buildRetentionStatement,
  },
  // Art. 39(1)(b) — the training surface.
  {
    path: "domain_findings.training",
    keys: ["training_status", "training_ai_coverage"],
    mode: "any",
    leaf: "record_states",
    rebuild: buildTrainingStatement,
  },
];

function surfaceBacked(s: GovernanceCscSurface, intake: unknown): boolean {
  return s.mode === "all"
    ? s.keys.every((k) => intakeFilled(intake, k))
    : s.keys.some((k) => intakeFilled(intake, k));
}

// ---------------------------------------------------------------------------
// G1 — per-domain finding vs the control facts that answer it
// ---------------------------------------------------------------------------

export interface GovernanceDomainControl {
  /** Key under `domain_findings`. */
  readonly domain: string;
  /** Intake keys whose answers are the control facts for that domain. */
  readonly keys: readonly string[];
  readonly why: string;
}

export const GOVERNANCE_DOMAIN_CONTROLS: readonly GovernanceDomainControl[] = [
  { domain: "training", keys: ["training_status", "training_ai_coverage"], why: "the record answers the training questions" },
  { domain: "vendor_terms", keys: ["dpa_status", "dpa_art28_verified"], why: "the record answers the processor-contract questions" },
  { domain: "privacy_notice", keys: ["privacy_policy", "privacy_notice_coverage"], why: "the record answers the notice questions" },
  { domain: "tool_inventory", keys: ["tools", "inventory_audit"], why: "the record lists the tools and the inventory position" },
  { domain: "subject_rights", keys: ["dsr_capability", "dsr_rights_tested"], why: "the record answers the rights-handling questions" },
  { domain: "incident_response", keys: ["incident_response"], why: "the record answers the incident-response question" },
  { domain: "dpia_status", keys: ["dpia_status", "dpia_ai_coverage"], why: "the record answers the DPIA questions" },
  { domain: "internal_policy", keys: ["tool_instruction"], why: "the record answers the AI-use policy question" },
  { domain: "data_submission", keys: ["technical_controls", "technical_controls_list"], why: "the record answers the technical-controls questions" },
];

/** The per-domain leaf G1 reads: the claim about what the record does not state. */
const DOMAIN_CLAIM_LEAVES = ["gap_description", "current_state"] as const;

// ---------------------------------------------------------------------------
// G3 / G4 — field hygiene
// ---------------------------------------------------------------------------

export const GOVERNANCE_AUTHORITY_FIELD_KEYS: readonly string[] = [
  "standard",
  "benchmark_verbatim",
  "element_verbatim",
  "verbatim_quote",
  "excerpt",
];

export const GOVERNANCE_STRUCTURED_LEAF_KEYS: readonly string[] = [
  "verdict",
  "status",
  "severity",
  "citation",
  "priority",
  "deadline",
  "domain_id",
  "domain_name",
  "conclusion",
  "tier",
];

// ---------------------------------------------------------------------------
// the pass
// ---------------------------------------------------------------------------

export function runGovernanceCsc(
  report: Record<string, unknown> | null | undefined,
  opts: GovernanceCscOptions,
): GovernanceCscTelemetry {
  const t: GovernanceCscTelemetry = {
    version: GOVERNANCE_CSC_VERSION,
    violations: [],
    repairs: 0,
    crashed: false,
  };
  try {
    if (!report || typeof report !== "object") return t;
    const intake = opts?.intake ?? {};
    const needles = frameBodyNeedles(null);
    const log = (v: GovernanceCscViolation) => {
      t.violations.push(v);
      if (v.repaired) t.repairs += 1;
    };

    // ── G1 — per-domain finding vs the control facts ──────────────────────
    const domains = report.domain_findings as Record<string, unknown> | undefined;
    if (domains && typeof domains === "object" && !Array.isArray(domains)) {
      for (const ctl of GOVERNANCE_DOMAIN_CONTROLS) {
        const node = domains[ctl.domain] as Record<string, unknown> | undefined;
        if (!node || typeof node !== "object" || Array.isArray(node)) continue;
        if (!ctl.keys.every((k) => intakeFilled(intake, k))) continue; // honest silence
        for (const leaf of DOMAIN_CLAIM_LEAVES) {
          const text = str(node[leaf]);
          if (!text) continue;
          const hit = governanceCarriesAbsence(text, needles);
          if (!hit) continue;
          log({
            check_id: "g1_domain_finding_vs_record",
            path: `domain_findings.${ctl.domain}.${leaf}`,
            evidence: `the finding says "${clip(hit, 90)}" although ${ctl.why} (${ctl.keys.join(", ")}).`,
            repaired: false,
          });
        }
      }
    }

    // ── G2 — absence claim vs record, repaired from the record register ───
    for (const surface of GOVERNANCE_CSC_SURFACES) {
      if (!surfaceBacked(surface, intake)) continue; // honest degradation
      const node = getPath(report, surface.path);
      if (node === undefined || node === null) continue;
      const prose = deepProse(node);
      if (!prose.trim()) continue;
      const partial = PARTIAL_DISCHARGE_RE.exec(prose);
      const hit = governanceCarriesAbsence(prose, needles) ?? (partial ? partial[0] : null);
      if (!hit) continue;

      const built = surface.rebuild ? surface.rebuild(intake) : "";
      // NEVER change a surface's SHAPE, and never flip a determination enum:
      // the repair writes the register sentence into the surface's own reader
      // leaf and leaves every other key byte-identical.
      if (built && node && typeof node === "object" && !Array.isArray(node)) {
        (node as Record<string, unknown>)[surface.leaf] = built;
        (node as Record<string, unknown>).record_backed = true;
      }
      log({
        check_id: "g2_absence_claim_vs_record",
        path: surface.path,
        evidence: `the surface says "${clip(hit, 90)}" although the record supplies ${surface.keys.join(", ")}.`,
        repaired: Boolean(built),
      });
    }

    // ── G3 / G4 — field hygiene ───────────────────────────────────────────
    const authority = new Set(GOVERNANCE_AUTHORITY_FIELD_KEYS);
    const structured = new Set(GOVERNANCE_STRUCTURED_LEAF_KEYS);
    const walk = (node: unknown, path: string): void => {
      if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`)); return; }
      if (!node || typeof node !== "object") return;
      const obj = node as Record<string, unknown>;
      for (const [k, v] of Object.entries(obj)) {
        if (k === "_meta" || k === "_staging") continue;
        const p = path ? `${path}.${k}` : k;
        if (typeof v === "string") {
          const hit = governanceCarriesAbsence(v, needles);
          if (!hit) continue;
          if (authority.has(k)) {
            delete obj[k];
            log({
              check_id: "g3_authority_field_hygiene",
              path: p,
              evidence: `the authority field carried absence prose ("${clip(hit, 80)}") instead of authority; the field was removed.`,
              repaired: true,
            });
            continue;
          }
          if (structured.has(k)) {
            log({
              check_id: "g4_structured_leaf_hygiene",
              path: p,
              evidence: `the structured leaf carries prose ("${clip(hit, 80)}") where a machine value belongs.`,
              repaired: false,
            });
          }
        } else {
          walk(v, p);
        }
      }
    };
    walk(report, "");
  } catch (e) {
    t.crashed = true;
    t.error = (e as Error)?.message?.slice(0, 200) ?? "unknown";
  }
  return t;
}

/** Attach telemetry at `_meta.internal.governance_csc`. */
export function attachGovernanceCsc(
  report: Record<string, unknown>,
  t: GovernanceCscTelemetry,
): GovernanceCscTelemetry {
  try {
    const meta = (report._meta ??= {}) as Record<string, unknown>;
    const internal = ((meta as Record<string, unknown>).internal ??= {}) as Record<string, unknown>;
    internal.governance_csc = t;
  } catch { /* non-fatal */ }
  return t;
}
