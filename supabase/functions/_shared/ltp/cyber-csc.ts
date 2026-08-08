// ITEM 406 LEG C — CPPA CYBER CROSS-SURFACE CONSISTENCY (CSC).
//
// CYBER ONLY. Deterministic post-pass in `run-cppa-cybersecurity`, run AFTER
// the item404 prose-gold pass and the item399 R11 lint, BEFORE the cyber
// coverage matrix and the item405 record-complete gate. It reads the assembled
// report and the FULL persisted intake record (`row.intake_data`) and asserts
// that what the document SAYS about the record agrees with what the record
// CONTAINS.
//
// LAWS (the dpia-csc / lia-csc / admt-csc / governance-csc idiom, unchanged)
//   * DETERMINISTIC — pure function of (report, intake). No I/O, no clock.
//   * FAIL-OPEN — any error yields `crashed:true`; the report is untouched.
//   * SINGLE-WRITER RESPECTING — a repair restores the surface's own record
//     register (the builders at the head of this module). This module authors
//     no analysis of its own; it only restates what the record says.
//   * HONEST DEGRADATION — every check is predicated on the record SUPPLYING
//     the backing fact. On a genuinely silent component it does nothing and the
//     surface keeps its absence sentence byte-for-byte.
//   * DETERMINATION OUTCOMES ARE READ-ONLY — `conclusion` / `status` /
//     `verdict` enums are never flipped. Only reader surfaces change.
//   * BYTE-PINNED LAW IS UNTOUCHABLE — any string carrying the § 7121(a)
//     phase-in markers, the resolved-cohort marker or the standing disclaimer
//     is skipped outright (`isProtectedCyberString`).
//
// CHECKS
//   cy1_control_finding_vs_record  — a per-component finding/remediation claims
//                                    the record does not state a control fact
//                                    the record does state. Single-writer
//                                    repair in place (the item403-A g1 shape);
//                                    deliberately OUTSIDE the gate.
//   cy2_absence_claim_vs_record    — absence language on a surface the record
//                                    backs, repaired from the record register.
//                                    This is the id
//                                    `FALSE_ABSENCE_CHECK_IDS["cppa-cyber"]`
//                                    reads.
//   cy3_authority_field_hygiene    — an authority field (`standard`,
//                                    `regulatory_basis`, …) carrying absence
//                                    prose instead of authority (repaired by
//                                    deletion — the item384 r4 precedent).
//   cy4_structured_leaf_hygiene    — a structured leaf (status/verdict/
//                                    citation/slug …) carrying register or
//                                    absence prose (flag).
//
// Telemetry rides `_meta.internal.cyber_csc`.
//
// MODULE CO-LOCATION NOTE (the item405 leg-B bundler lesson): the record
// register lives HERE rather than in a new sibling module under
// `cppa-cyber-deliverables/`. Leg B established that adding new sibling
// modules to a directory the batch functions bundle can fail specifier
// resolution at deploy time; one new module per leg keeps the closure stable.

import { carriesAbsenceLanguage, frameBodyNeedles, PARTIAL_DISCHARGE_RE } from "./dpia-csc.ts";
import {
  CYBER_ABSENCE_LABEL_PHRASINGS,
  isProtectedCyberString,
} from "./cyber-prose-gold.ts";
import { CYBER_CONTROL_SLUGS } from "../intake-contracts/cppa-cybersecurity.ts";

export const CYBER_CSC_VERSION = "cyber-csc@item406-2026-08-07";

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * ITEM 396 LESSON — the detector is BUILT FROM the phrasing class the item404
 * prose-gold pass can write (`CYBER_ABSENCE_LABEL_PHRASINGS`), plus the generic
 * cyber absence family. `tests/edge/item406/linkage.test.ts` enumerates the
 * prose-gold phrasings and asserts each is matched here, so a relabel cannot
 * escape its own detector.
 */
export const CYBER_LABEL_ABSENCE_RE = new RegExp(
  [
    ...CYBER_ABSENCE_LABEL_PHRASINGS.map(escapeRe),
    "the (?:intake|record) supplies no\\b",
    "the (?:intake|record) does not (?:yet )?(?:carry|state|supply|record|evidence|document|describe)\\b",
    "the (?:intake|record) does not confirm\\b",
    "no (?:artefact|artifact|evidence|documentation) (?:is |was )?(?:supplied|provided|recorded|named)\\b",
    "is not (?:established|evidenced) (?:from|on) the (?:information supplied|record)",
    "not determinable on this record",
    "cannot (?:be )?assess(?:ed)? (?:this component )?on this record",
    "insufficient information",
  ].join("|"),
  "i",
);

/** The cyber absence detector: shared emit-gate catalog + the label class. */
export function cyberCarriesAbsence(
  text: string,
  needles: readonly string[],
): string | null {
  const t = String(text ?? "").replace(/\s+/g, " ");
  if (!t.trim()) return null;
  if (isProtectedCyberString(t)) return null;
  const catalog = carriesAbsenceLanguage(t, needles);
  if (catalog) return catalog;
  const m = CYBER_LABEL_ABSENCE_RE.exec(t);
  return m ? m[0] : null;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function str(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(str).filter(Boolean).join(", ");
  if (v && typeof v === "object") {
    try { return JSON.stringify(v); } catch { return ""; }
  }
  return "";
}

function clip(s: string, n = 160): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function getPath(root: unknown, path: string): unknown {
  let cur: unknown = root;
  for (const seg of String(path).split(".")) {
    if (!seg) continue;
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
        if (k === "_meta" || k === "_staging" || k === "_revision") continue;
        walk(v);
      }
    }
  };
  walk(node);
  return out.join(" ");
}

const CONTROL_KEY_RE = /^controls\[([a-z0-9_]+)\]\.([a-z_]+)$/;

/** The record entry for one § 7123(c) component, by intake slug. */
export function cyberControlRecord(
  intake: unknown,
  slug: string,
): Record<string, unknown> | null {
  const rows = (intake as Record<string, unknown> | null)?.controls;
  if (!Array.isArray(rows)) return null;
  for (const r of rows) {
    if (r && typeof r === "object" && String((r as Record<string, unknown>).key ?? "") === slug) {
      return r as Record<string, unknown>;
    }
  }
  return null;
}

function valueFilled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    return t.length > 0 && t !== "n/a" && t !== "none" && t !== "no";
  }
  if (Array.isArray(v)) return v.filter((x) => valueFilled(x)).length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return String(v).trim().length > 0;
}

/**
 * Read a declared intake key. Two notations:
 *   `profile.last_audit`            — a dotted path into the record.
 *   `controls[c15_third_party].notes` — a field of one component's record row.
 */
export function readCyberKey(intake: unknown, key: string): unknown {
  const m = CONTROL_KEY_RE.exec(key);
  if (m) {
    const row = cyberControlRecord(intake, m[1]);
    return row ? row[m[2]] : undefined;
  }
  return getPath(intake, key);
}

export function cyberKeyFilled(intake: unknown, key: string): boolean {
  return valueFilled(readCyberKey(intake, key));
}

// ---------------------------------------------------------------------------
// THE RECORD REGISTER — the single writer for every repairable cyber surface.
//
// Each builder RESTATES the record and nothing else (the record-states-only
// idiom). A builder that has nothing to restate returns "" and the caller logs
// the violation UNREPAIRED, leaving the surface byte-identical.
// ---------------------------------------------------------------------------

function label(intake: unknown, slug: string, fallback: string): string {
  const row = cyberControlRecord(intake, slug);
  const l = str(row?.label);
  return l || fallback;
}

/** Component surface — `controls[slug].notes` / `.maturity` / `.evidence`. */
export function buildControlRecordStatement(intake: unknown, slug: string): string {
  const row = cyberControlRecord(intake, slug);
  if (!row) return "";
  const name = label(intake, slug, "this component");
  const maturity = str(row.maturity);
  const notes = str(row.notes);
  const evidence = Array.isArray(row.evidence) ? row.evidence.map(str).filter(Boolean) : [];
  const parts: string[] = [];
  if (notes) {
    parts.push(`The record describes the ${name.toLowerCase()} component: ${notes.slice(0, 900)}`);
  }
  if (maturity) {
    parts.push(`The recorded implementation position is "${maturity}".`);
  }
  if (evidence.length) {
    parts.push(`The evidence named on the record is ${evidence.join(", ")}.`);
  }
  return parts.join(" ").trim();
}

/** Evidence surface — what the record says is on file for one component. */
export function buildControlEvidenceStatement(intake: unknown, slug: string): string {
  const row = cyberControlRecord(intake, slug);
  if (!row) return "";
  const name = label(intake, slug, "this component");
  const evidence = Array.isArray(row.evidence) ? row.evidence.map(str).filter(Boolean) : [];
  if (!evidence.length) return "";
  const notes = str(row.notes);
  const parts = [
    `The record names the following evidence on file for the ${name.toLowerCase()} component: ${evidence.join(", ")}.`,
  ];
  if (notes) parts.push(`The record's own account of the control is carried forward: ${notes.slice(0, 600)}`);
  return parts.join(" ");
}

/** Audit-readiness surface — the recorded audit history and engagement. */
export function buildAuditReadinessStatement(intake: unknown): string {
  const last = str(readCyberKey(intake, "profile.last_audit"));
  const engagement = str(readCyberKey(intake, "profile.auditor_engagement_status"));
  const framework = str(readCyberKey(intake, "profile.framework"));
  const inScope = readCyberKey(intake, "profile.in_scope_frameworks");
  const rationale = str(readCyberKey(intake, "profile.audit_scope_rationale"));
  if (!last && !engagement) return "";
  const parts: string[] = [];
  if (last) parts.push(`The record states the last cybersecurity audit as "${last}".`);
  if (engagement) parts.push(`The recorded auditor-engagement position is "${engagement}".`);
  if (framework) parts.push(`The primary framework the record names is ${framework}.`);
  if (Array.isArray(inScope) && inScope.length) {
    parts.push(`The frameworks the record puts in scope are ${inScope.map(str).filter(Boolean).join(", ")}.`);
  }
  if (rationale) parts.push(`The record's own account of audit scope is carried forward: ${rationale.slice(0, 700)}`);
  return parts.join(" ");
}

/** § 7122 independence surface — the recorded engagement and prior scope. */
export function buildAuditorEngagementStatement(intake: unknown): string {
  const engagement = str(readCyberKey(intake, "profile.auditor_engagement_status"));
  if (!engagement) return "";
  const prior = str(readCyberKey(intake, "profile.prior_audit_scope"));
  const parts = [`The record states the auditor-engagement position as "${engagement}".`];
  if (prior) parts.push(`The record's account of the prior engagement's scope is carried forward: ${prior.slice(0, 700)}`);
  return parts.join(" ");
}

/**
 * Replace the ONE sentence carrying the unsupported absence claim with the
 * record statement, leaving every other sentence byte-identical. Returns ""
 * when the swap cannot be made safely (no sentence located, or the result
 * would fall below the item384-r2 40-character substance floor), in which case
 * the caller leaves the text unchanged and logs the violation unrepaired.
 */
export function replaceAbsenceSentence(
  text: string,
  hit: string,
  replacement: string,
): string {
  const src = String(text ?? "");
  const idx = src.toLowerCase().indexOf(String(hit ?? "").toLowerCase());
  if (idx < 0 || !replacement.trim()) return "";
  let start = 0;
  for (let i = idx; i > 0; i--) {
    if (/[.!?]/.test(src[i - 1]) && /\s/.test(src[i] ?? " ")) { start = i; break; }
  }
  let end = src.length;
  for (let i = idx + hit.length; i < src.length; i++) {
    if (/[.!?]/.test(src[i])) { end = i + 1; break; }
  }
  const out = `${src.slice(0, start)}${replacement}${src.slice(end)}`
    .replace(/\s+/g, " ")
    .trim();
  if (out.replace(/\s+/g, "").length < 40) return "";
  return out;
}

// ---------------------------------------------------------------------------
// CY-2 — surface → backing intake keys (the absence-claim map)
// ---------------------------------------------------------------------------

export interface CyberCscSurface {
  /**
   * Report path. `controls[<slug>]` and `evidence_sufficiency[<slug>]` are
   * resolved by matching the row's `key`/`slug`; anything else is dotted.
   */
  readonly path: string;
  /**
   * ITEM 403-A LESSON (b) — PRIMARY keys only. A key belongs here ONLY when it
   * is, on its own, sufficient evidence for the proposition the surface
   * asserts. Everything that merely colours the picture goes to
   * `corroborating`, which never backs the surface by itself.
   */
  readonly keys: readonly string[];
  /** Keys that support but cannot alone establish the surface's proposition. */
  readonly corroborating?: readonly string[];
  /** "any" — one filled PRIMARY key backs it; "all" — every primary key must be. */
  readonly mode: "any" | "all";
  /** Reader leaf the repair writes into. */
  readonly leaf: string;
  /** The surface's single writer from the record register. */
  readonly rebuild: (intake: unknown) => string;
}

// ITEM 403-A LESSON (b) — THE HOMOGENEITY AUDIT, SURFACE BY SURFACE.
//
//  controls[slug]                 The proposition is "the record states a fact
//                                 about this component". `notes` — the record's
//                                 own account of the control — is the only
//                                 independently sufficient key. `maturity` is a
//                                 self-assessed band, not a control fact, and
//                                 `evidence` names artefacts rather than the
//                                 control: BOTH corroborate.
//  evidence_sufficiency[slug]     The proposition is "the record names evidence
//                                 for this component". `evidence` is the only
//                                 key that establishes it; `notes` describes the
//                                 control and corroborates only.
//  readiness_determination        The proposition is "the record speaks to audit
//                                 readiness". `last_audit` and
//                                 `auditor_engagement_status` each independently
//                                 state a recorded audit position. `framework`,
//                                 `in_scope_frameworks`, `audit_scope_rationale`
//                                 and `prior_audit_scope` describe the programme
//                                 and the scope — corroborating.
//  independence_determination     Single key (`auditor_engagement_status`);
//                                 `prior_audit_scope` corroborates.
//
// Named in the item: the vendor / third-party oversight surface is
// controls[c15_third_party] (the item404 defect (b) neighbourhood), incident
// response is controls[c17_incident], training is controls[c13_training] and
// awareness is controls[c12_awareness]. They are not special-cased: the map is
// generated over all eighteen § 7123(c) components so no component can drift
// out of coverage.

const CONTROL_SURFACES: readonly CyberCscSurface[] = CYBER_CONTROL_SLUGS.map((slug) => ({
  path: `controls[${slug}]`,
  keys: [`controls[${slug}].notes`],
  corroborating: [`controls[${slug}].maturity`, `controls[${slug}].evidence`],
  mode: "any" as const,
  leaf: "record_states",
  rebuild: (intake: unknown) => buildControlRecordStatement(intake, slug),
}));

const EVIDENCE_SURFACES: readonly CyberCscSurface[] = CYBER_CONTROL_SLUGS.map((slug) => ({
  path: `evidence_sufficiency[${slug}]`,
  keys: [`controls[${slug}].evidence`],
  corroborating: [`controls[${slug}].notes`],
  mode: "any" as const,
  leaf: "record_states",
  rebuild: (intake: unknown) => buildControlEvidenceStatement(intake, slug),
}));

export const CYBER_CSC_SURFACES: readonly CyberCscSurface[] = [
  ...CONTROL_SURFACES,
  ...EVIDENCE_SURFACES,
  {
    path: "readiness_determination",
    keys: ["profile.last_audit", "profile.auditor_engagement_status"],
    corroborating: [
      "profile.framework",
      "profile.in_scope_frameworks",
      "profile.audit_scope_rationale",
      "profile.prior_audit_scope",
    ],
    mode: "any",
    leaf: "record_states",
    rebuild: buildAuditReadinessStatement,
  },
  {
    path: "independence_determination",
    keys: ["profile.auditor_engagement_status"],
    corroborating: ["profile.prior_audit_scope"],
    mode: "any",
    leaf: "record_states",
    rebuild: buildAuditorEngagementStatement,
  },
];

export function surfaceBacked(s: CyberCscSurface, intake: unknown): boolean {
  return s.mode === "all"
    ? s.keys.every((k) => cyberKeyFilled(intake, k))
    : s.keys.some((k) => cyberKeyFilled(intake, k));
}

/**
 * ITEM 403-A LESSON (a) — EVIDENCE MAY NAME ONLY ANSWERED KEYS.
 * The evidence string is built from the keys the record actually supplies,
 * never from the surface's declared key list.
 */
export function answeredKeysForSurface(s: CyberCscSurface, intake: unknown): string[] {
  return [...s.keys, ...(s.corroborating ?? [])].filter((k) => cyberKeyFilled(intake, k));
}

const ROW_PATH_RE = /^([a-z_]+)\[([a-z0-9_]+)\]$/;

/** Resolve a surface path against the report (row paths match on key/slug). */
export function resolveSurfaceNode(
  report: Record<string, unknown>,
  path: string,
): Record<string, unknown> | null {
  const m = ROW_PATH_RE.exec(path);
  if (m) {
    const rows = report[m[1]];
    if (!Array.isArray(rows)) return null;
    for (const r of rows) {
      if (!r || typeof r !== "object") continue;
      const o = r as Record<string, unknown>;
      if (String(o.key ?? o.slug ?? "") === m[2]) return o;
    }
    return null;
  }
  const node = getPath(report, path);
  return node && typeof node === "object" && !Array.isArray(node)
    ? node as Record<string, unknown>
    : null;
}

// ---------------------------------------------------------------------------
// CY-1 — per-component finding vs the control facts that answer it
// ---------------------------------------------------------------------------

/** Reader leaves CY-1 reads on a component row. */
export const CYBER_CONTROL_CLAIM_LEAVES = [
  "finding",
  "remediation",
  "evidence",
  "record_fact",
  "application",
] as const;

/** Row collections whose entries are per-component reader surfaces. */
export const CYBER_CONTROL_ROW_KEYS = ["controls", "component_coverage"] as const;

// ---------------------------------------------------------------------------
// CY-3 / CY-4 — field hygiene
// ---------------------------------------------------------------------------

export const CYBER_AUTHORITY_FIELD_KEYS: readonly string[] = [
  "standard",
  "regulatory_basis",
  "authority_verbatim",
  "verbatim_quote",
  "excerpt",
];

export const CYBER_STRUCTURED_LEAF_KEYS: readonly string[] = [
  "verdict",
  "severity",
  "priority",
  "slug",
  "component_number",
  "sufficiency",
  "readiness_level",
  "auditor_type",
  "engagement_status",
];

// ---------------------------------------------------------------------------
// the pass
// ---------------------------------------------------------------------------

export type CyberCscCheckId =
  | "cy1_control_finding_vs_record"
  | "cy2_absence_claim_vs_record"
  | "cy3_authority_field_hygiene"
  | "cy4_structured_leaf_hygiene";

export interface CyberCscViolation {
  check_id: CyberCscCheckId;
  path: string;
  evidence: string;
  repaired: boolean;
}

export interface CyberCscTelemetry {
  version: string;
  violations: CyberCscViolation[];
  repairs: number;
  crashed: boolean;
  error?: string;
}

export interface CyberCscOptions {
  /** The FULL persisted cyber intake record the report was built from. */
  readonly intake: unknown;
}

export function runCyberCsc(
  report: Record<string, unknown> | null | undefined,
  opts: CyberCscOptions,
): CyberCscTelemetry {
  const t: CyberCscTelemetry = {
    version: CYBER_CSC_VERSION,
    violations: [],
    repairs: 0,
    crashed: false,
  };
  try {
    if (!report || typeof report !== "object") return t;
    const intake = opts?.intake ?? {};
    const needles = frameBodyNeedles(null);
    const log = (v: CyberCscViolation) => {
      t.violations.push(v);
      if (v.repaired) t.repairs += 1;
    };

    // ── CY-1 — per-component finding vs the recorded control facts ────────
    // Single-writer repair in place; flag-only for the GATE (deliberately
    // outside FALSE_ABSENCE_CHECK_IDS — the item403-A g1 precedent).
    for (const rowKey of CYBER_CONTROL_ROW_KEYS) {
      const rows = report[rowKey];
      if (!Array.isArray(rows)) continue;
      rows.forEach((row, i) => {
        if (!row || typeof row !== "object") return;
        const node = row as Record<string, unknown>;
        const slug = String(node.key ?? node.slug ?? "");
        if (!slug) return;
        const backing = [`controls[${slug}].notes`, `controls[${slug}].maturity`, `controls[${slug}].evidence`];
        const answered = backing.filter((k) => cyberKeyFilled(intake, k));
        if (!answered.length) return; // honest silence — the record says nothing
        for (const leaf of CYBER_CONTROL_CLAIM_LEAVES) {
          const text = typeof node[leaf] === "string" ? node[leaf] as string : "";
          if (!text) continue;
          if (isProtectedCyberString(text)) continue;
          const hit = cyberCarriesAbsence(text, needles);
          if (!hit) continue;
          const built = buildControlRecordStatement(intake, slug);
          const repaired = built ? replaceAbsenceSentence(text, hit, built) : "";
          if (repaired && repaired !== text) node[leaf] = repaired;
          log({
            check_id: "cy1_control_finding_vs_record",
            path: `${rowKey}[${i}].${leaf}`,
            evidence:
              `the component surface says "${clip(hit, 90)}" although the record supplies ${answered.join(", ")}.`,
            repaired: Boolean(repaired && repaired !== text),
          });
        }
      });
    }

    // ── CY-2 — absence claim vs record, repaired from the record register ──
    for (const surface of CYBER_CSC_SURFACES) {
      if (!surfaceBacked(surface, intake)) continue; // honest degradation
      const node = resolveSurfaceNode(report, surface.path);
      if (!node) continue;
      const prose = deepProse(node);
      if (!prose.trim()) continue;
      const partial = PARTIAL_DISCHARGE_RE.exec(prose);
      const hit = cyberCarriesAbsence(prose, needles) ?? (partial ? partial[0] : null);
      if (!hit) continue;

      const built = surface.rebuild(intake);
      // NEVER change a surface's SHAPE and never flip a determination enum:
      // the repair writes the register sentence into the surface's own reader
      // leaf and leaves every other key byte-identical.
      if (built) {
        node[surface.leaf] = built;
        node.record_backed = true;
      }
      log({
        check_id: "cy2_absence_claim_vs_record",
        path: surface.path,
        // ITEM 403-A LESSON (a) — only keys the record actually supplies.
        evidence:
          `the surface says "${clip(hit, 90)}" although the record supplies ${answeredKeysForSurface(surface, intake).join(", ")}.`,
        repaired: Boolean(built),
      });
    }

    // ── CY-3 / CY-4 — field hygiene ───────────────────────────────────────
    const authority = new Set(CYBER_AUTHORITY_FIELD_KEYS);
    const structured = new Set(CYBER_STRUCTURED_LEAF_KEYS);
    const walk = (node: unknown, path: string): void => {
      if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`)); return; }
      if (!node || typeof node !== "object") return;
      const obj = node as Record<string, unknown>;
      for (const [k, v] of Object.entries(obj)) {
        if (k === "_meta" || k === "_staging" || k === "_revision") continue;
        const p = path ? `${path}.${k}` : k;
        if (typeof v === "string") {
          if (isProtectedCyberString(v)) continue;
          const hit = cyberCarriesAbsence(v, needles);
          if (!hit) continue;
          if (authority.has(k)) {
            delete obj[k];
            log({
              check_id: "cy3_authority_field_hygiene",
              path: p,
              evidence: `the authority field carried absence prose ("${clip(hit, 80)}") instead of authority; the field was removed.`,
              repaired: true,
            });
            continue;
          }
          if (structured.has(k)) {
            log({
              check_id: "cy4_structured_leaf_hygiene",
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

/** Run the pass and attach its telemetry at `_meta.internal.cyber_csc`. */
export function attachCyberCsc(
  report: Record<string, unknown>,
  opts: CyberCscOptions,
): CyberCscTelemetry {
  const t = runCyberCsc(report, opts);
  try {
    const meta = (report._meta ??= {}) as Record<string, unknown>;
    const internal = ((meta as Record<string, unknown>).internal ??= {}) as Record<string, unknown>;
    internal.cyber_csc = t;
  } catch { /* non-fatal */ }
  return t;
}
