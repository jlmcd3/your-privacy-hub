/**
 * ITEM 428 (PIECE B) — ONE SUMMARY VOICE.
 *
 * At HEAD the persisted risk document carried FOUR summary-class surfaces:
 * `submission_summary`, `executive_summary`, `assessment_summary` and
 * `processing_narrative` (`opening_summary` no longer ships — verified on the
 * live perfect-pilot documents). Loop2 had ONE. This is the consolidation:
 *
 *   executive_summary   — THE single narrative verdict surface (unchanged text).
 *   assessment_summary  — the TYPED FACT STRIP, rendered as a table, never prose.
 *   processing_narrative— the one prose account of the processing (untouched).
 *   submission_summary  — RETIRED as a top-level customer surface. It is
 *                         DEMOTED TO AN INPUT: when the verdict surface is
 *                         empty the executive summary is taken from it, and the
 *                         top-level key is then deleted. Demotion rather than
 *                         deletion because the string is the only verdict-class
 *                         prose some degraded documents carry, and dropping it
 *                         outright would lose a verdict rather than merge one.
 *
 * THE TYPED-SURFACE LAW: every fact-strip leaf comes from a typed source —
 * the item426 exception emission, the item427 activity emission, the
 * deterministic gate signals and the intake. Nothing is model-composed.
 *
 * Pure, fail-open, single write site. Never reads or writes a stored row.
 */

import {
  buildFactStrip,
  RISK_FACT_STRIP_CONTRACT_VERSION,
  type RiskFactStrip,
} from "../report-contracts/risk-fact-strip.ts";
import { coerceActivityView } from "../report-contracts/risk-activities.ts";
import { coerceExceptionView } from "../report-contracts/risk-exceptions.ts";

export const RISK_SUMMARY_VOICE_VERSION = "risk-summary-voice@item428-2026-08-09";

export interface SummaryVoiceSummary {
  readonly version: string;
  readonly contract: string;
  /** how the executive summary was sourced. */
  readonly verdict_source: "executive_summary" | "submission_summary" | "absent";
  /** true when the retired key was present and has been removed. */
  readonly submission_summary_retired: boolean;
  readonly fact_strip_leaves: number;
  readonly surfaces: readonly string[];
}

const str = (v: unknown): string =>
  typeof v === "string" ? v.trim() : v === null || v === undefined ? "" : String(v).trim();

function scalar(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) {
    return v.map((x) => (typeof x === "string" ? x.trim() : "")).filter((s) => s).join("\n\n");
  }
  return "";
}

/**
 * True when the string is the deterministic statutory submission/retention
 * block (§ 7157 / § 7155 / § 7121(a) / § 7120(b) prongs) rather than
 * verdict-class prose. Statutory content never becomes the verdict voice.
 */
function isStatutoryBlock(s: string): boolean {
  return /§\s*7157|§\s*7155|§\s*7121\(a\)|§\s*7120\(b\)/.test(s);
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
}

/** Triggered activities — from the item427 typed emission, else the legacy list. */
function triggeredActivities(report: Record<string, unknown>, legacy: unknown): string[] {
  const view = coerceActivityView(report.risk_assessment_by_activity);
  const typed = view.typed.map((r) => str(r.activity)).filter((s) => s.length > 0);
  if (typed.length) return [...new Set(typed)];
  return Array.isArray(legacy) ? [...new Set(legacy.map((x) => str(x)).filter((s) => s))] : [];
}

/** Exceptions — from the item426 typed emission, else the legacy list. */
function exceptionsClaimed(report: Record<string, unknown>, legacy: unknown): string[] {
  const view = coerceExceptionView(report.exception_analysis);
  const typed = view.typed.filter((r) => r.claimed === true)
    .map((r) => str(r.exception_name)).filter((s) => s.length > 0);
  if (typed.length) return [...new Set(typed)];
  return Array.isArray(legacy) ? [...new Set(legacy.map((x) => str(x)).filter((s) => s))] : [];
}

/**
 * THE single write site for the summary-class surfaces. Mutates `report` in
 * place and returns telemetry. Never throws.
 * RK2: pass `opts.detectOnly = true` to skip all mutations.
 */
export function normalizeRiskSummaryVoice(
  report: Record<string, unknown>,
  rawIntake?: unknown,
  opts?: { detectOnly?: boolean },
): SummaryVoiceSummary {
  // RK2 detect-only: return empty telemetry without mutations.
  if (opts?.detectOnly) {
    return {
      version: RISK_SUMMARY_VOICE_VERSION,
      contract: RISK_FACT_STRIP_CONTRACT_VERSION,
      verdict_source: "absent",
      submission_summary_retired: false,
      fact_strip_leaves: 0,
      surfaces: [],
    };
  }
  const intake = obj(rawIntake);
  const org = obj(obj(intake).org_context);
  const legacy = obj(report.assessment_summary);

  // 1. THE VERDICT VOICE. `submission_summary` is NOT verdict material on the
  // LTP path — it is the deterministic § 7157 / § 7155(c) / § 7121(a)
  // statutory block. It is therefore consumed as a verdict input ONLY when the
  // verdict surface is empty (a degraded legacy document that carries its only
  // verdict-class prose there); otherwise merging it would give the executive
  // summary a second voice and duplicate the fact strip (R2/R7).
  let verdict = scalar(report.executive_summary);
  let verdict_source: SummaryVoiceSummary["verdict_source"] = verdict ? "executive_summary" : "absent";
  const submissionRaw = report.submission_summary;
  const submission = scalar(submissionRaw);
  if (!verdict && submission && !isStatutoryBlock(submission)) {
    verdict = submission;
    verdict_source = "submission_summary";
  }
  if (verdict) report.executive_summary = verdict;

  // 2. THE RETIRED SURFACE, RE-HOMED BYTE-IDENTICALLY.
  // ITEM 428 (PIECE B) ruling: the § 7157(a)(1) submission timing, the
  // § 7155(c) retention rule, the § 7121(a) cohort deadline sentence and the
  // § 7120(b) prong postures are ratified, law-bearing content. They do not
  // retire with the surface: the VALUE MOVES UNCHANGED — same string, same
  // bytes, same object — onto `submission_and_retention`, the statutory
  // surface that now owns that class. Nothing is reworded, dropped or merged.
  const submission_summary_retired = "submission_summary" in report;
  if (submission_summary_retired) {
    if (submissionRaw !== undefined && submissionRaw !== null && submissionRaw !== "") {
      if (report.submission_and_retention === undefined) {
        report.submission_and_retention = submissionRaw;
      }
    }
    delete report.submission_summary;
  }


  // 3. THE TYPED FACT STRIP.
  const strip: RiskFactStrip = buildFactStrip({
    company_name: str(legacy.company_name) || str(org.company_name) || str(intake.company_name),
    sector: str(legacy.sector) || str(org.sector) || str(intake.sector),
    assessment_date: str(legacy.assessment_date) || str(intake.assessment_date),
    overall_risk_level: str(legacy.overall_risk_level) || str(report.risk_level),
    triggered_activities: triggeredActivities(report, legacy.triggered_activities),
    exceptions_claimed: exceptionsClaimed(report, legacy.exceptions_claimed),
    exceptions_status: str(legacy.exceptions_status),
    admt_disclosure_required: legacy.admt_disclosure_required === true,
    cybersecurity_audit_required: legacy.cybersecurity_audit_required === true,
  });
  report.assessment_summary = strip as unknown as Record<string, unknown>;

  const leaves = [
    strip.company_name, strip.sector, strip.assessment_date, strip.overall_risk_level,
    strip.triggered_activities.length ? "y" : "", strip.exceptions_claimed.length ? "y" : "",
    strip.exceptions_status,
  ].filter((s) => s.length > 0).length + 2; // the two booleans are always stated

  return {
    version: RISK_SUMMARY_VOICE_VERSION,
    contract: RISK_FACT_STRIP_CONTRACT_VERSION,
    verdict_source,
    submission_summary_retired,
    fact_strip_leaves: leaves,
    surfaces: ["executive_summary", "assessment_summary", "processing_narrative", "submission_and_retention"],
  };
}
