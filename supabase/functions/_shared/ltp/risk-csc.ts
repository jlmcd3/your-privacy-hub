// ITEM 378 — DELIVERABLE 3: DETERMINISTIC CROSS-SURFACE CONSISTENCY CHECK (RISK).
//
// CPPA RISK ONLY. Runs as a deterministic post-pass in
// `run-cppa-risk-assessment` after every prose pass and before the final
// output. Model-agnostic: it reads the assembled report and the intake and
// asserts that what the document SAYS about the record agrees with what the
// record CONTAINS.
//
// LAWS (inherited from the ratified DPIA CSC, item374)
// ----------------------------------------------------
//   * DETERMINISTIC — pure function of (report, intake). No I/O, no clock,
//     no model. Same inputs, same violations, same repairs.
//   * FAIL-OPEN — any error leaves the report untouched and is reported.
//   * HONEST DEGRADATION — every check is predicated on the record SUPPLYING
//     the backing fact. On a genuinely incomplete record it does nothing.
//   * MINIMAL REPAIR — R1 repairs only pure invention (a claim with ZERO
//     intake anchor), routing it to `information_needed` per the existing
//     T6(a) pattern. Everything else is flagged, not rewritten.
//
// Telemetry rides `_meta.internal.risk_csc`.

export const RISK_CSC_VERSION = "risk-csc-2026-08-05-item378";

export type RiskCscCheckId =
  | "r1_benefits_vs_intake"
  | "r2_exception_vs_record"
  | "r3_secondary_use_predicate"
  | "r4_structured_leaf_hygiene";

export interface RiskCscViolation {
  check_id: RiskCscCheckId;
  path: string;
  evidence: string;
  repaired: boolean;
}

export interface RiskCscTelemetry {
  version: string;
  violations: RiskCscViolation[];
  repairs: number;
  crashed: boolean;
  error?: string;
}

export interface RiskCscOptions {
  /** The cppa-risk intake object the report was built from. */
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

function isNo(v: unknown): boolean {
  return /^\s*no\b/i.test(str(v));
}

// ---------------------------------------------------------------------------
// R1 — § 7152(a)(4) benefits vs the intake
// ---------------------------------------------------------------------------

/**
 * Words that a benefits sentence may carry without being "named in the
 * record": statutory furniture, regulator names, and ordinary drafting voice.
 * Anything else that looks like a proper noun or a hard number must be
 * anchored in the intake.
 */
const R1_TOKEN_STOPWORDS = new Set(
  [
    "the", "this", "that", "these", "those", "california", "civil", "code",
    "agency", "cppa", "ccpa", "section", "sections", "regulation", "regulations",
    "assessment", "record", "business", "consumer", "consumers", "processing",
    "personal", "information", "privacy", "act", "title", "chapter", "article",
    "board", "state", "united", "states", "january", "february", "march",
    "april", "may", "june", "july", "august", "september", "october",
    "november", "december", "cal", "civ", "cfr", "ccr",
  ],
);

function normalise(s: string): string {
  return s.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ");
}

/** The whole intake, flattened, as the anchor corpus. */
export function intakeAnchorText(intake: unknown): string {
  return normalise(str(intake ?? {}));
}

/** Hard numbers and proper-noun phrases a benefits claim asserts as fact. */
export function claimFactTokens(claim: string): string[] {
  const out: string[] = [];
  for (const m of claim.matchAll(/\$?\d[\d,.]*\s?(?:%|percent|million|billion|m\b|k\b)?/g)) {
    const t = m[0].trim();
    // Bare statutory pinpoints (7152, 1798.140) are furniture, not facts.
    if (/^\d{4}$/.test(t) || /^1798/.test(t)) continue;
    if (t.length > 1) out.push(t);
  }
  for (const m of claim.matchAll(/\b[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,})*\b/g)) {
    const t = m[0];
    if (t.split(/\s+/).every((w) => R1_TOKEN_STOPWORDS.has(w.toLowerCase()))) continue;
    out.push(t);
  }
  return out;
}

/** Content words used to decide whether a claim has ANY anchor at all. */
export function claimContentWords(claim: string): string[] {
  return normalise(claim)
    .split(/[^a-z0-9']+/)
    .filter((w) => w.length >= 6 && !R1_TOKEN_STOPWORDS.has(w));
}

export interface R1Verdict {
  /** Fact tokens the intake does not contain. */
  unanchored: string[];
  /** True when NOTHING in the claim is anchored in the record. */
  pureInvention: boolean;
}

export function assessBenefitClaim(claim: string, anchor: string): R1Verdict {
  const unanchored = claimFactTokens(claim).filter((t) => !anchor.includes(normalise(t)));
  const content = claimContentWords(claim);
  const anchored = content.filter((w) => anchor.includes(w));
  return {
    unanchored,
    pureInvention: content.length > 0 && anchored.length === 0,
  };
}

/** The T6(a) targeted ask for a benefit the record does not supply. */
export function benefitAsk(activityName: string): string {
  return (
    "§ 7152(a)(4) requires the benefits of the processing to be documented — " +
    `the record does not yet identify the beneficiary group and the specific benefit that group obtains from ${
      activityName || "the described processing"
    }.`
  );
}

// ---------------------------------------------------------------------------
// R2 — exception analysis vs the record
// ---------------------------------------------------------------------------

export const EXCEPTION_CLAIMED_RE =
  /(claims? (?:the|an|this) [^.]{0,60}exception|exception is claimed|asserts? (?:the|an|this) [^.]{0,60}exception|relies on (?:the|an|this) [^.]{0,60}exception|has claimed [^.]{0,60}exception)/i;

export function exceptionsClaimedInIntake(intake: unknown): boolean {
  const ex = (intake as Record<string, unknown> | null)?.exceptions_intake;
  if (!ex || typeof ex !== "object") return false;
  for (const v of Object.values(ex as Record<string, unknown>)) {
    if (v && typeof v === "object" && (v as Record<string, unknown>).claimed) return true;
    if (typeof v === "boolean" && v) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// R3 — secondary-use predicate
// ---------------------------------------------------------------------------

export const SECONDARY_USE_ASSERTION_RE =
  /(secondary use|secondary purpose|further processing|re-?use of the data|repurpos)/i;

export function secondaryUsesDenied(intake: unknown): boolean {
  const rec = (intake as Record<string, unknown> | null) ?? {};
  if (!("has_secondary_uses" in rec)) return false;
  const secondaries = rec.secondary_activities;
  const hasRows = Array.isArray(secondaries) && secondaries.length > 0;
  return isNo(rec.has_secondary_uses) && !hasRows;
}

// ---------------------------------------------------------------------------
// R4 — structured-leaf hygiene + absence claims vs the record
// ---------------------------------------------------------------------------

/** Leaf keys that hold structured values, never prose. */
export const RISK_STRUCTURED_LEAF_KEYS: readonly string[] = [
  "rank",
  "likelihood",
  "severity",
  "safeguard_status",
  "element",
  "necessity",
  "status",
  "citation",
  "risk_id",
  "harm_id",
  "inherent_band",
  "residual_band",
  "approver_name",
  "approver_position",
  "approval_date",
  "name",
  "position",
];

export const RISK_ABSENCE_CLASS_RE =
  /(not identified on the present record|the record does not (?:name|state|identify|supply)|no one is recorded as|is not recorded on the present record|\[TO BE COMPLETED)/i;

export interface RiskCscSurface {
  /** Dotted report path of the surface. */
  readonly path: string;
  /** Intake keys that back it. `mode: "any"` → one filled key is enough. */
  readonly keys: readonly string[];
  readonly mode: "any" | "all";
}

export const RISK_CSC_SURFACES: readonly RiskCscSurface[] = [
  {
    path: "attestation_block.approvers",
    keys: ["a9_approver_name", "a9_approver_position", "a9_approval_date"],
    mode: "any",
  },
  {
    path: "attestation_block.information_providers",
    keys: ["a8_information_providers", "i7_internal_contributors"],
    mode: "any",
  },
  {
    path: "attestation_block.text",
    keys: ["i8_certifying_exec_name", "i8_certifying_exec_title"],
    mode: "any",
  },
];

// ---------------------------------------------------------------------------
// path utilities
// ---------------------------------------------------------------------------

function getPath(root: unknown, path: string): unknown {
  let cur: unknown = root;
  for (const seg of path.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

function pushInformationNeeded(
  report: Record<string, unknown>,
  row: { id: string; topic: string; information_needed: string; source_fields: string[] },
): void {
  const arr = Array.isArray(report.information_needed) ? report.information_needed : [];
  if (arr.some((r) => r && typeof r === "object" && (r as Record<string, unknown>).id === row.id)) return;
  arr.push({ ...row, status: "open" });
  report.information_needed = arr;
}

// ---------------------------------------------------------------------------
// the pass
// ---------------------------------------------------------------------------

export function runRiskCsc(
  report: Record<string, unknown> | null | undefined,
  opts: RiskCscOptions,
): RiskCscTelemetry {
  const t: RiskCscTelemetry = {
    version: RISK_CSC_VERSION,
    violations: [],
    repairs: 0,
    crashed: false,
  };
  try {
    if (!report || typeof report !== "object") return t;
    const intake = opts?.intake ?? {};
    const anchor = intakeAnchorText(intake);

    const log = (v: RiskCscViolation) => {
      t.violations.push(v);
      if (v.repaired) t.repairs += 1;
    };

    // ── R1 — benefits vs intake ───────────────────────────────────────────
    const analytics = Array.isArray(report.activity_analytics) ? report.activity_analytics : [];
    analytics.forEach((rawAct, ai) => {
      const act = rawAct as Record<string, unknown> | null;
      if (!act || typeof act !== "object") return;
      const activityName = str(act.activity_name) || str(act.activity_id);
      const benefits = Array.isArray(act.benefits) ? act.benefits : null;
      if (benefits) {
        const kept: unknown[] = [];
        benefits.forEach((rawRow, bi) => {
          const row = rawRow as Record<string, unknown> | null;
          const claim = row
            ? `${str(row.benefit)} ${str(row.supporting_record_fact)} ${str(row.beneficiary_class)}`
            : "";
          if (!claim.trim()) { kept.push(rawRow); return; }
          const verdict = assessBenefitClaim(claim, anchor);
          const path = `activity_analytics[${ai}].benefits[${bi}]`;
          if (verdict.pureInvention) {
            pushInformationNeeded(report, {
              id: `risk_csc_benefit_${ai}_${bi}`,
              topic: "benefits_7152_a_4",
              information_needed: benefitAsk(activityName),
              source_fields: ["a4_benefits", "i1_purpose"],
            });
            log({
              check_id: "r1_benefits_vs_intake",
              path,
              evidence: `benefit claim with no intake anchor, routed to information_needed: ${clip(claim)}`,
              repaired: true,
            });
            return; // row removed
          }
          if (verdict.unanchored.length > 0) {
            log({
              check_id: "r1_benefits_vs_intake",
              path,
              evidence: `benefit claim names facts absent from the record (${
                verdict.unanchored.slice(0, 4).join("; ")
              }): ${clip(claim)}`,
              repaired: false,
            });
          }
          kept.push(rawRow);
        });
        if (kept.length !== benefits.length) act.benefits = kept;
      }

      const weighing = Array.isArray(act.weighing) ? act.weighing : [];
      weighing.forEach((rawRow, wi) => {
        const row = rawRow as Record<string, unknown> | null;
        const claim = row ? str(row.benefit_statement) : "";
        if (!claim.trim()) return;
        const verdict = assessBenefitClaim(claim, anchor);
        if (verdict.unanchored.length === 0 && !verdict.pureInvention) return;
        log({
          check_id: "r1_benefits_vs_intake",
          path: `activity_analytics[${ai}].weighing[${wi}].benefit_statement`,
          evidence: verdict.pureInvention
            ? `weighing benefit statement with no intake anchor: ${clip(claim)}`
            : `weighing benefit statement names facts absent from the record (${
              verdict.unanchored.slice(0, 4).join("; ")
            }): ${clip(claim)}`,
          repaired: false,
        });
      });
    });

    const byActivity = Array.isArray(report.risk_assessment_by_activity)
      ? report.risk_assessment_by_activity
      : [];
    byActivity.forEach((rawRow, i) => {
      const row = rawRow as Record<string, unknown> | null;
      if (!row) return;
      for (const key of ["benefits_to_business", "benefits_to_consumers"]) {
        const claim = str(row[key]);
        if (!claim) continue;
        const verdict = assessBenefitClaim(claim, anchor);
        if (verdict.unanchored.length === 0 && !verdict.pureInvention) continue;
        log({
          check_id: "r1_benefits_vs_intake",
          path: `risk_assessment_by_activity[${i}].${key}`,
          evidence: verdict.pureInvention
            ? `benefit prose with no intake anchor: ${clip(claim)}`
            : `benefit prose names facts absent from the record (${
              verdict.unanchored.slice(0, 4).join("; ")
            }): ${clip(claim)}`,
          repaired: false,
        });
      }
    });

    // ── R2 — exception analysis vs the record ─────────────────────────────
    if (!exceptionsClaimedInIntake(intake)) {
      const rows = Array.isArray(report.exception_analysis) ? report.exception_analysis : [];
      rows.forEach((rawRow, i) => {
        const row = rawRow as Record<string, unknown> | null;
        if (!row || typeof row !== "object") return;
        const statusClaimed = /^(claimed|asserted)/i.test(str(row.status));
        const prose = `${str(row.text)} ${str(row.description)} ${str(row.recorded_basis)} ${
          str(row.rationale)
        }`;
        const proseClaimed = EXCEPTION_CLAIMED_RE.test(prose);
        if (!statusClaimed && !proseClaimed) return;
        row.status = "not_claimed";
        log({
          check_id: "r2_exception_vs_record",
          path: `exception_analysis[${i}]`,
          evidence: `exception asserted as claimed while the record claims none: ${
            clip(statusClaimed ? str(row.status) + " " + prose : prose)
          }`,
          repaired: true,
        });
      });
    }

    // ── R3 — secondary-use predicate ──────────────────────────────────────
    if (secondaryUsesDenied(intake)) {
      const register = report.risk_register;
      if (Array.isArray(register)) {
        const kept: unknown[] = [];
        register.forEach((rawRow, i) => {
          const row = rawRow as Record<string, unknown> | null;
          const predicate = `${str(row?.description)} ${str(row?.rationale)} ${str(row?.activity)}`;
          if (row && SECONDARY_USE_ASSERTION_RE.test(predicate)) {
            log({
              check_id: "r3_secondary_use_predicate",
              path: `risk_register[${i}]`,
              evidence: `row predicated on secondary uses the record denies: ${clip(predicate)}`,
              repaired: true,
            });
            return; // REMOVED. Remaining ids are NOT renumbered.
          }
          kept.push(rawRow);
        });
        if (kept.length !== register.length) report.risk_register = kept;
      }
      for (const key of ["executive_summary", "processing_narrative"]) {
        const prose = str(report[key]);
        if (prose && SECONDARY_USE_ASSERTION_RE.test(prose)) {
          log({
            check_id: "r3_secondary_use_predicate",
            path: key,
            evidence: `surface asserts secondary uses the record denies: ${clip(prose)}`,
            repaired: false,
          });
        }
      }
    }

    // ── R4 — structured-leaf hygiene + absence claims ─────────────────────
    const walk = (node: unknown, path: string): void => {
      if (node === null || node === undefined) return;
      if (Array.isArray(node)) {
        node.forEach((v, i) => walk(v, `${path}[${i}]`));
        return;
      }
      if (typeof node !== "object") return;
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        if (k === "_meta" || k === "_staging") continue;
        const p = path ? `${path}.${k}` : k;
        if (typeof v === "string") {
          if (!RISK_STRUCTURED_LEAF_KEYS.includes(k)) continue;
          const m = RISK_ABSENCE_CLASS_RE.exec(v);
          if (!m) continue;
          log({
            check_id: "r4_structured_leaf_hygiene",
            path: p,
            evidence: `structured leaf carries absence prose: ${clip(m[0])}`,
            repaired: false,
          });
          continue;
        }
        walk(v, p);
      }
    };
    walk(report, "");

    for (const surface of RISK_CSC_SURFACES) {
      const backed = surface.mode === "all"
        ? surface.keys.every((k) => filled(intake, k))
        : surface.keys.some((k) => filled(intake, k));
      if (!backed) continue; // honest degradation
      const node = getPath(report, surface.path);
      if (node === undefined || node === null) continue;
      const prose = str(node);
      const m = RISK_ABSENCE_CLASS_RE.exec(prose);
      if (!m) continue;
      log({
        check_id: "r4_structured_leaf_hygiene",
        path: surface.path,
        evidence: `absence claim on a surface backed by ${surface.keys.join("/")}: ${clip(m[0])}`,
        repaired: false,
      });
    }
  } catch (e) {
    t.crashed = true;
    t.error = (e as Error)?.message ?? String(e);
    console.warn("[risk-csc] failed (non-fatal):", t.error);
  }
  return t;
}

/** Run the pass and attach its telemetry at `_meta.internal.risk_csc`. */
export function attachRiskCsc(
  report: Record<string, unknown>,
  opts: RiskCscOptions,
): RiskCscTelemetry {
  const t = runRiskCsc(report, opts);
  try {
    const meta = ((report as Record<string, unknown>)._meta ??= {}) as Record<string, unknown>;
    const internal = (meta.internal ??= {}) as Record<string, unknown>;
    internal.risk_csc = t;
  } catch { /* non-fatal */ }
  return t;
}
