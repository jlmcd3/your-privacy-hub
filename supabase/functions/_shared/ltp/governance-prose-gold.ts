// ITEM 400 — GOVERNANCE REGISTER REPAIRS AT THE WALKED SEAMS (GV-1 … GV-3).
//
// Panel-ratified under the CEO's standing delegation from the live render of
// quality_run_documents cba3724c-ca12-43de-85e4-dd005e5bcf4e. Every defect
// below was confirmed on that document before this module was written.
//
//   GV-1 ONE VERDICT VOICE — the document carried two verdicts: the header
//        printed a readiness rating (empty after the item313 demotion, so it
//        rendered "Unknown") while the executive summary asserted "a
//        materially strong compliance posture". The AUTHORITATIVE verdict is
//        `accountability_determination` — Articles 5(2) and 24(1) — because
//        the maturity tier itself ships `superseded_by:
//        "accountability_determination"` and `statutory_basis: "none"`. The
//        summary is now verdict-led from that single source, and affirmative
//        posture claims that contradict a non-affirmative determination are
//        deterministically de-asserted. Determination OUTCOMES are never
//        edited — only the voice that reports them.
//   GV-2 HOLLOW FIELDS — `SECTOR —` and `JURISDICTIONS —` shipped as bare
//        em-dashes. A field with nothing to say is omitted (the item384-r4
//        discipline), with telemetry naming what was omitted.
//   GV-3 INTERNAL VOCABULARY — machine enums (`record_insufficient`,
//        `partially_satisfied`, …) reached reader surfaces. The enums stay
//        where the renderers key on them; reader-facing prose leaves carry the
//        words.
//
// This module never edits determination outcomes, gate conditions, emit-gate
// or customer-message semantics, disclaimers, or any non-governance surface.

import { GOVERNANCE_PIPELINE_STAMP } from "../prose/plans/governance.spine.ts";
import {
  attachReadinessDetermination,
  readinessLine as readinessLineFromTypedField,
} from "./governance-readiness.ts";

export const GOVERNANCE_PROSE_GOLD_VERSION = "governance-prose-gold@item402-2026-08-07";

// ─────────────────────────────────────────────────────────────────────────────
// GV-1 — ONE VERDICT VOICE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MACHINE-KEYED FIELDS — left untouched on purpose. The renderers, the CSC
 * passes and the graders key on these; only reader prose is reworded.
 */
export const GOVERNANCE_MACHINE_KEYED_FIELDS: readonly string[] = [
  "accountability_determination.verdict",
  "accountability_determination.status",
  "accountability_determination.appropriateness_verdict",
  "accountability_determination.demonstrability_verdict",
  "domain_findings.*.severity",
  "domain_element_findings.*.conclusion",
  "maturity_tier_readability_aid.tier",
  "maturity_tier_readability_aid.superseded_by",
];

/** Reader wording for the determination enum. Enums themselves are untouched. */
export const GOVERNANCE_VERDICT_LABELS: Record<string, string> = {
  satisfied: "the record evidences this duty",
  partially_satisfied: "the record evidences this duty in part",
  not_satisfied: "the record does not evidence this duty",
  record_insufficient: "the record does not yet carry what a determination requires",
  not_applicable: "this duty is not engaged",
  analysed: "analysed",
};

export function governanceVerdictLabel(v: unknown): string {
  const raw = String(v ?? "").trim();
  if (!raw) return "";
  return GOVERNANCE_VERDICT_LABELS[raw] ?? raw.replace(/_/g, " ");
}

/** Verdicts that permit an affirmative posture claim in the summary. */
const AFFIRMATIVE_VERDICTS = new Set(["satisfied", "not_applicable"]);

export function isAffirmativeVerdict(v: unknown): boolean {
  return AFFIRMATIVE_VERDICTS.has(String(v ?? "").trim());
}

/**
 * The single customer-facing readiness line. Derived ONLY from the
 * accountability determination — never from the demoted maturity tier and
 * never from summary prose.
 */
export const GOVERNANCE_READINESS_LINES: Record<string, string> = {
  satisfied: "Accountability evidenced",
  partially_satisfied: "Accountability partly evidenced",
  not_satisfied: "Accountability not evidenced",
  record_insufficient: "Accountability not yet determinable",
  not_applicable: "Accountability duties not engaged",
};

export function readinessLineFromDetermination(det: unknown): string {
  const verdict = String((det as Record<string, unknown> | null)?.verdict ?? "").trim();
  if (!verdict) return "";
  return GOVERNANCE_READINESS_LINES[verdict] ?? "";
}

/** Verdict-first opening sentence for the executive summary. */
export function verdictOpener(det: unknown): string {
  const d = (det ?? {}) as Record<string, unknown>;
  const verdict = String(d.verdict ?? "").trim();
  const citation = String(d.citation ?? "").trim();
  const cite = citation ? ` (${citation})` : "";
  switch (verdict) {
    case "satisfied":
      return `The record evidences the accountability duties this assessment tested${cite}.`;
    case "partially_satisfied":
      return `The record evidences the accountability duties this assessment tested in part${cite}.`;
    case "not_satisfied":
      return `The record does not evidence the accountability duties this assessment tested${cite}.`;
    case "record_insufficient":
      return `The record does not yet carry what a determination under these duties requires${cite}.`;
    case "not_applicable":
      return `The accountability duties this assessment tested are not engaged by the processing described${cite}.`;
    default:
      return "";
  }
}

/**
 * Affirmative posture claims that may not stand beside a non-affirmative
 * determination. Replacements are record-anchored and grammatical in place.
 */
const POSTURE_CONTRADICTIONS: readonly { readonly re: RegExp; readonly to: string }[] = [
  { re: /\ba (?:materially |substantially |broadly )?(?:strong|robust|mature|sound) compliance posture\b/gi, to: "the set of controls described below" },
  { re: /\bis (?:materially |substantially |broadly )?compliant\b/gi, to: "describes controls across the domains assessed" },
  { re: /\bpresents a (?:materially |substantially |broadly )?strong posture\b/gi, to: "presents the controls described below" },
];

export interface VerdictVoiceResult {
  readiness_line: string;
  opener_prepended: boolean;
  posture_claims_deasserted: number;
}

/**
 * GV-1. Reads the authoritative determination, writes ONE readiness line,
 * leads the summary with the verdict, and de-asserts contradicting posture
 * claims. Determination outcomes are read-only here.
 */
export function applyVerdictVoice(report: unknown): VerdictVoiceResult {
  const out: VerdictVoiceResult = { readiness_line: "", opener_prepended: false, posture_claims_deasserted: 0 };
  const r = report as Record<string, unknown> | null;
  if (!r || typeof r !== "object") return out;

  const det = r.accountability_determination as Record<string, unknown> | undefined;
  const line = readinessLineFromDetermination(det);
  if (!line) return out; // no authoritative verdict → no second voice invented
  out.readiness_line = line;
  r.governance_readiness_line = line;

  let summary = typeof r.executive_summary === "string" ? r.executive_summary : "";
  if (!summary.trim()) return out;

  if (!isAffirmativeVerdict(det?.verdict)) {
    for (const { re, to } of POSTURE_CONTRADICTIONS) {
      summary = summary.replace(re, () => {
        out.posture_claims_deasserted += 1;
        return to;
      });
    }
  }

  const opener = verdictOpener(det);
  if (opener && !summary.startsWith(opener)) {
    summary = `${opener} ${summary}`.replace(/\s+/g, " ").trim();
    out.opener_prepended = true;
  }
  r.executive_summary = summary;
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// GV-2 — HOLLOW FIELDS ARE OMITTED, NEVER SHIPPED
// ─────────────────────────────────────────────────────────────────────────────

/** A value with nothing to say: empty, whitespace, or a bare dash. */
export function isHollow(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (Array.isArray(v)) return v.length === 0 || v.every((x) => isHollow(x));
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  const s = String(v).trim();
  return s === "" || s === "—" || s === "-" || s === "–" || s === "n/a" || s === "N/A";
}

/** Reader-facing header fields the render walk found shipping hollow. */
export const GOVERNANCE_HEADER_FIELDS: readonly string[] = [
  "organization_name",
  "sector",
  "jurisdictions",
];

export interface HollowFieldResult {
  omitted: string[];
}

/**
 * GV-2. Builds `governance_header_fields` — only the fields that have
 * something to say. The renderer prints exactly what is present; a field with
 * nothing to say never reaches the page.
 */
export function applyHollowFieldOmission(report: unknown, intake: unknown): HollowFieldResult {
  const out: HollowFieldResult = { omitted: [] };
  const r = report as Record<string, unknown> | null;
  if (!r || typeof r !== "object") return out;
  const src = {
    ...(((r.organisation_profile ?? {}) as Record<string, unknown>) || {}),
    ...(((intake ?? {}) as Record<string, unknown>) || {}),
  };
  const fields: Record<string, string> = {};
  for (const key of GOVERNANCE_HEADER_FIELDS) {
    const raw = src[key];
    if (isHollow(raw)) { out.omitted.push(key); continue; }
    fields[key] = Array.isArray(raw) ? raw.map((x) => String(x)).join(", ") : String(raw).trim();
  }
  r.governance_header_fields = fields;
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// GV-3 — INTERNAL VOCABULARY OFF READER SURFACES
// ─────────────────────────────────────────────────────────────────────────────

/** Prose leaf keys the reader sees. Machine-keyed siblings are never touched. */
export const GOVERNANCE_READER_LEAF_KEYS: readonly string[] = [
  "reasoning",
  "information_needed",
  "why_urgent",
  "engaged_because",
  "action",
  "trigger",
  "narrative",
  "summary",
  "finding",
  "rationale",
  "explanation",
  "caveat",
];

const ENUM_TOKEN_RE = /\b(record_insufficient|partially_satisfied|not_satisfied|not_applicable|insufficient_basis)\b/g;

export interface CustomerRegisterResult {
  rewrites: number;
  paths: string[];
}

/** GV-3. Rewrites machine enum tokens inside reader prose leaves only. */
export function applyCustomerRegister(report: unknown): CustomerRegisterResult {
  const out: CustomerRegisterResult = { rewrites: 0, paths: [] };
  const readers = new Set(GOVERNANCE_READER_LEAF_KEYS);

  const walk = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${path}[${i}]`));
      return;
    }
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      if (k === "_meta" || k === "_staging") continue;
      const p = path ? `${path}.${k}` : k;
      if (typeof v === "string") {
        if (!readers.has(k)) continue;
        ENUM_TOKEN_RE.lastIndex = 0;
        if (!ENUM_TOKEN_RE.test(v)) continue;
        ENUM_TOKEN_RE.lastIndex = 0;
        obj[k] = v.replace(ENUM_TOKEN_RE, (m) => governanceVerdictLabel(m));
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
// ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

export interface GovernanceProseGoldTelemetry {
  version: string;
  stamp: string;
  verdict_voice: VerdictVoiceResult;
  hollow_fields: HollowFieldResult;
  customer_register: CustomerRegisterResult;
  errors: string[];
}

/**
 * The single governance prose-gold pass. Fail-open per sub-pass: a throwing
 * pass is recorded and the document continues unchanged.
 */
export function applyGovernanceProseGold(report: unknown, intake?: unknown): GovernanceProseGoldTelemetry {
  const t: GovernanceProseGoldTelemetry = {
    version: GOVERNANCE_PROSE_GOLD_VERSION,
    stamp: GOVERNANCE_PIPELINE_STAMP,
    verdict_voice: { readiness_line: "", opener_prepended: false, posture_claims_deasserted: 0 },
    hollow_fields: { omitted: [] },
    customer_register: { rewrites: 0, paths: [] },
    errors: [],
  };
  try { t.verdict_voice = applyVerdictVoice(report); } catch (e) { t.errors.push(`verdict_voice:${(e as Error)?.message}`); }
  try { t.hollow_fields = applyHollowFieldOmission(report, intake); } catch (e) { t.errors.push(`hollow_fields:${(e as Error)?.message}`); }
  try { t.customer_register = applyCustomerRegister(report); } catch (e) { t.errors.push(`customer_register:${(e as Error)?.message}`); }
  return t;
}
