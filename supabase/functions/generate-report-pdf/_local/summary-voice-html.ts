/**
 * ITEM 428 (PIECE B) — ONE SUMMARY VOICE, customer PDF path.
 *
 * The three summary-class sections of the LTP risk document, extracted from
 * generate-report-pdf/index.ts so the legacy byte-identity proof renders THE
 * REAL PATH (index.ts imports this and calls nothing else for those sections).
 *
 * LEGACY SHAPES render byte-identically to the pre-ITEM-428 inline
 * expressions. Only the CANONICAL fact strip (`assessment_summary._typed ===
 * RISK_FACT_STRIP_TYPE`) takes the new table layout, and `submission_summary`
 * is simply absent on item428 documents — the retired surface renders nothing
 * because the key is gone, not because this renderer suppresses it.
 */

import { headerForSection } from "../../_shared/report-contracts/cppa-risk-shape.ts";
import { RISK_FACT_STRIP_TYPE } from "../../_shared/report-contracts/risk-fact-strip.ts";

/** Byte-for-byte copy of generate-report-pdf's escHtml. */
function escHtml(s: unknown): string {
  if (s === null || s === undefined) return "";
  const str = typeof s === "string" ? s : (
    typeof s === "number" || typeof s === "boolean" ? String(s) :
    (() => { try { return JSON.stringify(s); } catch { return String(s); } })()
  );
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Byte-for-byte copy of the LTP builder's local `coerceNarrativeScalar`. */
function coerceNarrativeScalar(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string") return v.trim() ? v : undefined;
  if (Array.isArray(v)) {
    const parts = v
      .map((x) => (typeof x === "string" ? x : ""))
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return parts.length ? parts.join("\n\n") : undefined;
  }
  return undefined;
}

const text = (v: unknown) => escHtml(v === null || v === undefined ? "" : String(v));
const para = (v: string) => `<p>${text(v).replace(/\n+/g, "</p><p>")}</p>`;

export const FACT_STRIP_CSS = `
  table.fact-strip { border-collapse:collapse; width:100%; margin:0 0 10px; font-size:10.5pt; }
  table.fact-strip th, table.fact-strip td { border:1px solid var(--border); padding:6px 10px; text-align:left; vertical-align:top; }
  table.fact-strip th { width:34%; color:var(--navy); font-weight:700; background:#f7fafb; }
`;

/** THE executive summary section — the single narrative verdict surface. */
export function renderExecutiveSummarySectionHtml(report: Record<string, unknown>): string {
  const exec = coerceNarrativeScalar(report?.executive_summary);
  return exec
    ? `<section><h2>${text(headerForSection("executive_summary", "Executive Summary"))}</h2>${para(exec)}</section>`
    : "";
}

function factStripRows(strip: Record<string, unknown>): [string, string][] {
  const list = (v: unknown) =>
    Array.isArray(v) ? v.map((x) => String(x ?? "").trim()).filter((s) => s.length > 0) : [];
  const flag = (v: unknown) => (v === true ? "Yes" : v === false ? "No" : "");
  const activities = list(strip.triggered_activities);
  const claimed = list(strip.exceptions_claimed);
  const rows: [string, string][] = [
    ["Company", String(strip.company_name ?? "")],
    ["Sector", String(strip.sector ?? "")],
    ["Assessment date", String(strip.assessment_date ?? "")],
    ["Overall risk level", String(strip.overall_risk_level ?? "")],
    ["Triggered activities", activities.join("; ")],
    ["Exceptions claimed", claimed.join("; ")],
    ["Exceptions status", String(strip.exceptions_status ?? "")],
    ["ADMT disclosure required", flag(strip.admt_disclosure_required)],
    ["Cybersecurity audit required", flag(strip.cybersecurity_audit_required)],
  ];
  return rows.filter(([, v]) => v.trim().length > 0);
}

/**
 * THE assessment summary section.
 *  - canonical fact strip  → a table, never prose;
 *  - every legacy shape    → the pre-item428 paragraph render, byte-identical.
 */
export function renderAssessmentSummarySectionHtml(report: Record<string, unknown>): string {
  const summary = (report?.assessment_summary && typeof report.assessment_summary === "object" &&
      !Array.isArray(report.assessment_summary))
    ? report.assessment_summary as Record<string, unknown>
    : {};

  if (summary._typed === RISK_FACT_STRIP_TYPE) {
    const rows = factStripRows(summary);
    if (rows.length === 0) return "";
    return `<section><h2>${text(headerForSection("assessment_summary", "Assessment Summary"))}</h2><table class="fact-strip">${
      rows.map(([k, v]) => `<tr><th>${text(k)}</th><td>${text(v)}</td></tr>`).join("")
    }</table></section>`;
  }

  const summaryNarr = coerceNarrativeScalar(summary.narrative);
  if (!(summaryNarr || summary.company_name || summary.assessment_date || summary.overall_risk_level)) return "";
  return `<section><h2>${text(headerForSection("assessment_summary", "Assessment Summary"))}</h2>
      ${summary.company_name ? `<p><span class="label">Company:</span> ${text(summary.company_name)}</p>` : ""}
      ${summary.assessment_date ? `<p><span class="label">Assessment date:</span> ${text(summary.assessment_date)}</p>` : ""}
      ${summary.overall_risk_level ? `<p><span class="label">Overall risk level:</span> ${text(summary.overall_risk_level)}</p>` : ""}
      ${summary.exceptions_status ? `<p><span class="label">Exceptions:</span> ${text(summary.exceptions_status)}</p>` : ""}
      ${summaryNarr ? para(summaryNarr) : ""}
    </section>`;
}

/**
 * THE retired submission summary. Item428 documents do not carry the key, so
 * this renders nothing for them; legacy stored documents keep their section
 * exactly as before.
 */
export function renderSubmissionSummarySectionHtml(report: Record<string, unknown>): string {
  const submission = coerceNarrativeScalar(report?.submission_summary);
  return submission
    ? `<section><h2>${text(headerForSection("submission_summary", "Submission Summary"))}</h2>${para(submission)}</section>`
    : "";
}
