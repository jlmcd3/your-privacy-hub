// ─────────────────────────────────────────────────────────────────────────────
// ITEM 416 LEG C — IR CROSS-SURFACE CONSISTENCY (CSC).
//
// IR ONLY. Deterministic post-pass in `generate-ir-playbook`, run AFTER the
// item-414 prose-gold pass and BEFORE the coverage matrix, the item-415
// record-complete gate, the emit gate and the P2 serializer. It reads the
// assembled report and the FULL persisted intake record and asserts that what
// the two artifacts SAY about the record agrees with what the record CONTAINS.
//
// PLACEMENT: colocated in `generate-ir-playbook/_local/ltp/` — exactly one
// function's closure reaches it (post-402-C-3 rule).
//
// LAWS (the dpia / lia / admt / governance / cyber / biometric idiom)
//   * DETERMINISTIC — pure function of (report, intake). No I/O, no clock.
//   * FAIL-OPEN — any error yields `crashed:true`; the report is untouched.
//   * SINGLE-WRITER RESPECTING — a repair NEVER authors prose here. The only
//     writer of a standing-playbook section is `buildStandingPlaybook`, so a
//     repair rebuilds the playbook from the SAME intake and the SAME
//     `content_owner_mapping` the report already carries, and splices back
//     ONLY the offending section (plus the ledger fields, which are a pure
//     function of the sections). Every other section stays byte-identical,
//     including the item-414 prose-gold repairs applied before this pass.
//   * HONEST DEGRADATION — every check is predicated on the record SUPPLYING
//     the backing fact. On a genuinely silent record this pass does nothing and
//     the section keeps its ask and its absence sentence byte-for-byte.
//   * DETERMINATION OUTCOMES ARE READ-ONLY — `verdict` / `status` enums are
//     never flipped by this module; they change only as the section's own
//     writer recomputes them from the record.
//   * THE WORKSHEET IS NEVER TOUCHED — the incident worksheet is blank by
//     design (item369). A blank cell is correct output, never a false absence.
//   * THE AUTHORITY EXHIBIT AND EVERY CORPUS LEAF ARE BYTE-UNTOUCHED —
//     `authority_exhibit`, `standard`, `standard_citation`,
//     `requirement_verbatim` and their family are never written or deleted.
//     (Contrast governance g3, which deletes an authority field; on this
//     product that would delete verified corpus bytes, so i4 is FLAG-ONLY.)
//
// CHECKS
//   i1_section_ask_vs_record     — a standing section still ASKS for a fact the
//                                  record supplies (flag + single-writer
//                                  splice). Outside the gate, per the item403-A
//                                  g1 precedent.
//   i2_absence_claim_vs_record   — absence language on a surface the record
//                                  backs (flag + single-writer splice). This is
//                                  the id `FALSE_ABSENCE_CHECK_IDS["ir-playbook"]`
//                                  reads.
//   i3_ledger_vs_record          — the ONE ledger (IR-1) or the deduplicated
//                                  `information_needed` list names a section the
//                                  record in fact completes (repaired by
//                                  adopting the rebuilt ledger fields).
//   i4_structured_leaf_hygiene   — a structured leaf (verdict / status /
//                                  citation / severity …) carrying absence
//                                  prose where a machine value belongs. FLAG
//                                  ONLY — see the authority rule above.
//
// Telemetry rides `_meta.internal.ir_csc`.
// ─────────────────────────────────────────────────────────────────────────────

import { carriesAbsenceLanguage, frameBodyNeedles } from "../../../_shared/ltp/dpia-csc.ts";
import {
  IR_ABSENCE_LABEL_PHRASINGS,
  IR_DESIGNED_ABSENCE_EXEMPTIONS,
} from "./ir-prose-gold.ts";
import {
  buildStandingPlaybook,
  type PlaybookSection,
} from "./ir-playbook-deliverables/standing-playbook.ts";

export const IR_CSC_VERSION = "ir-csc@item416-2026-08-09";

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * ITEM 396 LESSON — the detector is BUILT FROM the phrasing class the IR
 * builders and the item-414 prose-gold pass can actually write, plus the
 * generic IR absence family. `tests/edge/item416/csc-and-coverage.test.ts`
 * enumerates `IR_ABSENCE_LABEL_PHRASINGS` and asserts each one is matched
 * here, so a relabel in the builder cannot escape its own detector.
 */
export const IR_LABEL_ABSENCE_RE = new RegExp(
  [
    ...IR_ABSENCE_LABEL_PHRASINGS.map(escapeRe),
    "the organisation has (?:recorded no|not yet recorded)\\b",
    "the (?:record|intake) does not (?:yet )?(?:state|record|carry|show|evidence|confirm)\\b",
    "is not answerable from what the organisation has recorded",
    "the determination cannot be made\\b",
    "we could not verify this item",
    "listed under information needed",
    "no (?:information|detail)s? (?:was|were|has been|have been)? ?(?:supplied|provided|recorded)\\b",
  ].join("|"),
  "i",
);

/**
 * Removes the phrasings that only LOOK like absence. Each is designed output on
 * its own surface (see `IR_DESIGNED_ABSENCE_EXEMPTIONS`), so stripping them
 * before detection is what keeps this pass from "repairing" correct prose.
 */
export function stripDesignedAbsence(text: string): string {
  let out = String(text ?? "");
  for (const re of IR_DESIGNED_ABSENCE_EXEMPTIONS) {
    out = out.replace(new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`), " ");
  }
  return out;
}

/** The IR absence detector: the shared emit-gate catalog + the label class. */
export function irCarriesAbsence(
  text: string,
  needles: readonly string[],
): string | null {
  const t = stripDesignedAbsence(text).replace(/\s+/g, " ");
  if (!t.trim()) return null;
  const catalog = carriesAbsenceLanguage(t, needles);
  if (catalog) return catalog;
  const m = IR_LABEL_ABSENCE_RE.exec(t);
  return m ? m[0] : null;
}

export type IrCscCheckId =
  | "i1_section_ask_vs_record"
  | "i2_absence_claim_vs_record"
  | "i3_ledger_vs_record"
  | "i4_structured_leaf_hygiene";

export interface IrCscViolation {
  check_id: IrCscCheckId;
  path: string;
  evidence: string;
  repaired: boolean;
}

export interface IrCscTelemetry {
  version: string;
  product: "ir-playbook";
  violations: IrCscViolation[];
  repairs: number;
  checks_run: number;
  crashed: boolean;
  error?: string;
}

export interface IrCscOptions {
  /** The FULL persisted IR record the report was built from. */
  readonly intake: unknown;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function clip(s: string, n = 160): string {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function readIntakePath(intake: unknown, path: string): unknown {
  let cur: unknown = intake;
  for (const seg of String(path).split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

/**
 * IR's own filled test. It deliberately does NOT treat "no" as unanswered:
 * on this product `contained: "No"` and `processorInvolved: false` are ANSWERS
 * that drive Art. 34(3)(b) and Art. 33(2). Only emptiness and an explicit
 * "Unknown" are silence.
 */
export function irFilled(intake: unknown, path: string): boolean {
  const v = readIntakePath(intake, path);
  if (v === null || v === undefined) return false;
  if (typeof v === "boolean") return true;
  if (typeof v === "number") return true;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    return t.length > 0 && t !== "unknown" && t !== "n/a";
  }
  if (Array.isArray(v)) {
    return v.some((x) =>
      x && (typeof x !== "object" || Object.values(x as object).some((y) => String(y ?? "").trim()))
    );
  }
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return false;
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
// the surface map — standing-playbook section → the intake keys that back it
// ---------------------------------------------------------------------------

export interface IrCscSurface {
  /** Standing-playbook section id. */
  readonly section: string;
  /**
   * PRIMARY keys only (the item403-A defect-1(b) standard): a key belongs here
   * ONLY when it is, on its own, sufficient evidence for what the section
   * asserts. Anything that merely colours the picture goes to `corroborating`.
   */
  readonly keys: readonly string[];
  readonly corroborating?: readonly string[];
  /** "any" — one filled primary key backs it; "all" — every primary key must be. */
  readonly mode: "any" | "all";
  readonly why: string;
}

export const IR_CSC_SURFACES: readonly IrCscSurface[] = [
  {
    section: "activation_criteria",
    keys: ["activationCriteria"],
    mode: "all",
    why: "the record states the standing activation triggers",
  },
  {
    // Either shape completes the section: the builder renders the structured
    // matrix when it exists and falls back to the flat thresholds.
    section: "severity_matrix",
    keys: ["severityMatrix", "severityThresholds"],
    mode: "any",
    why: "the record states the severity levels or their thresholds",
  },
  {
    section: "response_team",
    keys: ["responseTeamRoster"],
    mode: "all",
    why: "the record names the response roles",
  },
  {
    // Any ONE standing contact completes the contact table; the privilege flag
    // colours the counsel row but cannot alone evidence a contact list.
    section: "key_contacts",
    keys: [
      "outsideCounselName", "outsideCounselContact", "insurerContact",
      "forensicVendorContact", "lawEnforcementContact",
    ],
    corroborating: ["privilegeProtocol"],
    mode: "any",
    why: "the record names at least one standing incident contact",
  },
  {
    section: "first_hour_checklist",
    keys: ["firstHourConfirmations"],
    mode: "all",
    why: "the record states which first-hour arrangements are already standing",
  },
  {
    section: "first_24_hours_checklist",
    keys: ["itIsolationAuthority"],
    mode: "all",
    why: "the record names the role that may isolate a production system",
  },
  {
    section: "evidence_preservation",
    keys: ["keySystems", "logSources"],
    mode: "any",
    why: "the record names the systems or log sources to preserve",
  },
  {
    section: "breach_classification",
    keys: ["dataTypes"],
    mode: "all",
    why: "the record states the categories of personal data held",
  },
  {
    section: "contractual_notification_finding",
    keys: ["breachNoticeContracts"],
    mode: "all",
    why: "the record lists the agreements carrying a breach-notice clause",
  },
  {
    section: "contractual_notifications",
    keys: ["breachNoticeContracts"],
    mode: "all",
    why: "the record lists the agreements carrying a breach-notice clause",
  },
  {
    section: "testing_training",
    keys: ["nextTabletopDate"],
    mode: "all",
    why: "the record states the date of the next tabletop exercise",
  },
];

function surfaceBacked(s: IrCscSurface, intake: unknown): boolean {
  return s.mode === "all"
    ? s.keys.every((k) => irFilled(intake, k))
    : s.keys.some((k) => irFilled(intake, k));
}

/**
 * ITEM 403-A DEFECT 1(a) — EVIDENCE MAY NAME ONLY ANSWERED KEYS. The evidence
 * string is built from what the record actually supplies, never from the
 * surface's declared key list.
 */
export function answeredKeysForSurface(s: IrCscSurface, intake: unknown): string[] {
  return [...s.keys, ...(s.corroborating ?? [])].filter((k) => irFilled(intake, k));
}

// ---------------------------------------------------------------------------
// i4 — structured leaves
// ---------------------------------------------------------------------------

export const IR_STRUCTURED_LEAF_KEYS: readonly string[] = [
  "verdict",
  "status",
  "severity",
  "citation",
  "priority",
  "deadline",
  "owner",
  "regime",
  "conclusion",
];

/**
 * Authority and corpus leaves. NEVER written, NEVER deleted, NEVER flagged —
 * a verbatim provision quotation legitimately contains phrases the absence
 * detector would otherwise match ("does not state", "no information").
 */
export const IR_AUTHORITY_LEAF_KEYS: ReadonlySet<string> = new Set([
  "standard",
  "standard_citation",
  "citation",
  "citations",
  "as_cited",
  "requirement_verbatim",
  "verbatim",
  "verbatim_excerpt",
  "excerpt",
  "corpus_key",
  "pinpoint",
  "authority_class",
  "template_note",
  "scope_note",
]);

// ---------------------------------------------------------------------------
// the pass
// ---------------------------------------------------------------------------

function sectionsOf(sp: unknown): PlaybookSection[] {
  const s = (sp as Record<string, unknown> | undefined)?.sections;
  return Array.isArray(s) ? (s as PlaybookSection[]) : [];
}

export function runIrCsc(
  report: Record<string, unknown> | null | undefined,
  opts: IrCscOptions,
): IrCscTelemetry {
  const t: IrCscTelemetry = {
    version: IR_CSC_VERSION,
    product: "ir-playbook",
    violations: [],
    repairs: 0,
    checks_run: 0,
    crashed: false,
  };
  try {
    if (!report || typeof report !== "object") return t;
    const intake = opts?.intake ?? {};
    const needles = frameBodyNeedles(null);
    const log = (v: IrCscViolation) => {
      t.violations.push(v);
      if (v.repaired) t.repairs += 1;
    };

    const sp = report.standing_playbook as Record<string, unknown> | undefined;
    const current = sectionsOf(sp);

    // The single writer, re-run over the SAME inputs the report was built
    // from. Nothing here is authored; a repair is a splice from this object.
    let rebuilt: ReturnType<typeof buildStandingPlaybook> | null = null;
    const rebuild = () => {
      if (!rebuilt) {
        rebuilt = buildStandingPlaybook(intake, report.content_owner_mapping as never);
      }
      return rebuilt;
    };
    const spliced = new Map<string, PlaybookSection>();
    const spliceSection = (id: string): boolean => {
      const next = sectionsOf(rebuild()).find(
        (s) => (s as Record<string, unknown>).id === id,
      );
      if (!next) return false;
      spliced.set(id, next);
      return true;
    };

    // ── i1 / i2 — per-section, over the backed surfaces only ──────────────
    for (const surface of IR_CSC_SURFACES) {
      if (!surfaceBacked(surface, intake)) continue; // honest degradation
      const node = current.find(
        (s) => (s as unknown as Record<string, unknown>).id === surface.section,
      ) as Record<string, unknown> | undefined;
      if (!node) continue;
      t.checks_run += 1;
      const answered = answeredKeysForSurface(surface, intake).join(", ");

      // i1 — the section still asks for what the record supplies.
      const ask = typeof node.information_needed === "string" ? node.information_needed : "";
      if (ask.trim()) {
        const repaired = spliceSection(surface.section);
        log({
          check_id: "i1_section_ask_vs_record",
          path: `standing_playbook.sections.${surface.section}.information_needed`,
          evidence: `the section asks "${clip(ask, 90)}" although ${surface.why} (${answered}).`,
          repaired,
        });
      }

      // i2 — absence language anywhere in the section's own prose. The ask is
      // excluded: i1 already owns it, and counting it twice would let a single
      // defect fail the gate on two ids.
      const prose = deepProse({ ...node, information_needed: undefined });
      const hit = prose.trim() ? irCarriesAbsence(prose, needles) : null;
      if (hit) {
        const repaired = spliced.has(surface.section) || spliceSection(surface.section);
        log({
          check_id: "i2_absence_claim_vs_record",
          path: `standing_playbook.sections.${surface.section}`,
          evidence: `the section says "${clip(hit, 90)}" although ${surface.why} (${answered}).`,
          repaired,
        });
      }
    }

    // ── apply the splices, then adopt the rebuilt ledger fields ───────────
    if (sp && spliced.size > 0) {
      const nextSections = current.map((s) => {
        const id = (s as unknown as Record<string, unknown>).id as string;
        return spliced.get(id) ?? s;
      });
      sp.sections = nextSections;
      // i3 — the ledger and the deduplicated ask list are a pure function of
      // the sections, so after a splice the ONLY correct values are the
      // rebuilt ones. Adopting them is the single-writer repair.
      const rb = rebuild() as unknown as Record<string, unknown>;
      const before = {
        ledger: sp.unrecorded_ledger,
        needed: JSON.stringify(sp.information_needed ?? []),
        status: sp.status,
      };
      sp.information_needed = rb.information_needed;
      if (rb.unrecorded_ledger === undefined) delete sp.unrecorded_ledger;
      else sp.unrecorded_ledger = rb.unrecorded_ledger;
      sp.status = rb.status;
      const changed = before.ledger !== sp.unrecorded_ledger ||
        before.needed !== JSON.stringify(sp.information_needed ?? []) ||
        before.status !== sp.status;
      if (changed) {
        t.checks_run += 1;
        log({
          check_id: "i3_ledger_vs_record",
          path: "standing_playbook.unrecorded_ledger",
          evidence:
            `the ledger named ${spliced.size} section(s) the record in fact completes; the ledger and the ask list were recomputed by their own writer.`,
          repaired: true,
        });
      }
    }

    // ── i4 — structured-leaf hygiene (FLAG ONLY) ──────────────────────────
    const structured = new Set(IR_STRUCTURED_LEAF_KEYS);
    const walk = (node: unknown, path: string): void => {
      if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`)); return; }
      if (!node || typeof node !== "object") return;
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        if (k === "_meta" || k === "_staging") continue;
        if (IR_AUTHORITY_LEAF_KEYS.has(k)) continue; // corpus bytes: never read
        const p = path ? `${path}.${k}` : k;
        if (typeof v === "string") {
          if (!structured.has(k)) continue;
          const hit = irCarriesAbsence(v, needles);
          if (!hit) continue;
          t.checks_run += 1;
          log({
            check_id: "i4_structured_leaf_hygiene",
            path: p,
            evidence: `the structured leaf carries prose ("${clip(hit, 80)}") where a machine value belongs.`,
            repaired: false,
          });
        } else {
          walk(v, p);
        }
      }
    };
    // The worksheet is blank by design and is never read by this pass.
    for (const [k, v] of Object.entries(report)) {
      if (k === "incident_worksheet" || k === "_meta" || k === "_staging") continue;
      if (k === "authority_exhibit") continue; // corpus bytes
      walk(v, k);
    }
  } catch (e) {
    t.crashed = true;
    t.error = (e as Error)?.message?.slice(0, 200) ?? "unknown";
  }
  return t;
}

/** Attach telemetry at `_meta.internal.ir_csc`. */
export function attachIrCsc(
  report: Record<string, unknown>,
  t: IrCscTelemetry,
): IrCscTelemetry {
  try {
    const meta = (report._meta ??= {}) as Record<string, unknown>;
    const internal = (meta.internal ??= {}) as Record<string, unknown>;
    internal.ir_csc = t;
  } catch { /* non-fatal */ }
  return t;
}
