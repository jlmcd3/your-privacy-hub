// pdf build active
// BUILD_STAMP — real exported constant. Bump on every behavior edit.
// External-verification gate: clone HEAD sha == BUILD_STAMP prefix.
export const BUILD_STAMP = "generate-report-pdf-item271-replay-review@2026-07-30T06:30:00Z";
// generate-report-pdf: DOCX/PDF export for assessment reports.
import { readinessLineForRender } from "../_shared/ltp/governance-readiness.ts";
import { firstSentence as boundFirstSentence } from "../_shared/ltp/clause-bound.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applyUniversalDisclaimerHtml } from "../_shared/report-disclaimer.ts";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { readAdmtScope } from "../_shared/admt-scope-contract.ts";
// DOC 170 (2026-09-04) — Syllabus & Record: the fleet presentation system.
import {
  isSyllabusRecordProduct,
  readSyllabus,
  toneForState,
  type SyllabusProjection,
} from "../_shared/prose/syllabus.ts";
import {
  coerceNarrativeScalar,
  coerceNarrativeList,
  headerForSection,
} from "../_shared/report-contracts/cppa-risk-shape.ts";
import { hasProse9Document } from "./_local/report-contracts/cppa-risk-prose9.ts";
// ITEM 420 — dual-read (string | typed action record) priority-action rendering.
import {
  renderPriorityActionsSectionHtml,
  renderPriorityActionsOrderedHtml,
} from "./_local/priority-actions-html.ts";
import { coerceActionList, sortByRank } from "../_shared/report-contracts/action-record.ts";
// ITEM 425 — dual-read (string | string[] | legacy object | typed record)
// record-sufficiency rendering. `coerceNarrativeList` is untouched.
import {
  renderRecordSufficiencySectionHtml,
  RECORD_SUFFICIENCY_TABLE_CSS,
} from "./_local/record-sufficiency-html.ts";
import { renderExceptionAnalysisSectionHtml } from "./_local/exception-analysis-html.ts";
import { renderActivityAnalysisSectionHtml } from "./_local/activity-analysis-html.ts";
import {
  FACT_STRIP_CSS,
  renderAssessmentSummarySectionHtml,
  renderExecutiveSummarySectionHtml,
  renderSubmissionSummarySectionHtml,
  renderSubmissionAndRetentionSectionHtml,
} from "./_local/summary-voice-html.ts";
import { coerceExceptionView } from "../_shared/report-contracts/risk-exceptions.ts";
import { coerceActivityView } from "../_shared/report-contracts/risk-activities.ts";
import { renderAuthorityExhibitHtml, AUTHORITY_EXHIBIT_CSS } from "../_shared/report-exhibits/authority-exhibit.ts";
// ITEM 4 — FIRST ToA FIX (CEO-directed, 2026-08-15; presentation only).
import { toaLines } from "../_shared/prose/skeleton-render.ts";
// ITEM 372 METHOD 2a — the determination leads the DPIA document in print too.
// ITEM 380 §2 — THE THREE-STATE BANNER. State (i) is byte-identical to the
// banner this document has always printed; states (ii)/(iii) are reachable
// ONLY when the deterministic truth gate wrote record_complete.value === true
// in the generating function. The legal disclaimer block is untouched in all
// three states.
import {
  decideBanner,
  renderBannerHtml,
} from "../_shared/ltp/record-complete.ts";

// deno-lint-ignore no-explicit-any
function renderRecordCompleteBanner(report: any): string {
  try {
    const internal = report?._meta?.internal ?? {};
    return renderBannerHtml(decideBanner(
      internal?.record_complete?.value === true,
      internal?.placeholder_classification ?? null,
      report?.has_unresolved_placeholders === true,
    ));
  } catch {
    return report?.has_unresolved_placeholders === true ? renderBannerHtml({ state: "draft_incomplete", action_items: 0, preconditions: 0 }) : "";
  }
}

import { renderDeterminationHtml, DETERMINATION_CSS } from "./_local/report-exhibits/determination.ts";
import { buildCPPARiskProse9HTML } from "./prose9-html.ts";
// ITEM 369-IR LEG 1 — two-file IR delivery (standing playbook + worksheet).
import { buildIRStandingPlaybookHTML, buildIRWorksheetHTML } from "./ir-artifacts-html.ts";
import { liaSectionTitle, liaVerdictLabel } from "./_local/prose/plans/lia.spine.ts";




const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOGO_URL = `${Deno.env.get("SITE_URL") || "https://enduserprivacy.com"}/logo.png`;

// ─────────────────────────────────────────────────────────────────────────
// NARRATIVE SANITIZER
// Strips internal status tags and bracketed citation markers from prose
// before it lands in HTML/PDF. Preserves [TO BE COMPLETED: ...] placeholders.
// ─────────────────────────────────────────────────────────────────────────
function sanitizeNarrative(s: string): string {
  if (!s || typeof s !== "string") return s as unknown as string;
  return s
    .replace(/\[(REJECTED|ACCEPTED|PENALISED|REQUIRED|UNKNOWN)\]\s*/g, "")
    .replace(/\[(Recital\s+\d+[a-z]?)\]/g, "$1")
    .replace(/\[(Art(?:icle)?\.?\s+[\dA-Za-z()]+)\]/g, "$1")
    .replace(/\[(EDPB[^\]]{0,60})\]/g, "$1");
}

// ─────────────────────────────────────────────────────────────────────────
// PDF GENERATION HELPER
// ─────────────────────────────────────────────────────────────────────────
// PLACEHOLDER: Replace the body of this function with your PDF service call.
// Environment variable to add to Supabase secrets: PDF_SERVICE_API_KEY
// Example services: PDFShift (api.pdfshift.io), Browserless, DocRaptor.
// ─────────────────────────────────────────────────────────────────────────
/**
 * 2026-08-25 polish round — the PDF footer's left cell used to print the raw
 * attachment filename ("EndUserPrivacy-CPPA-Risk-Assessment-2026-08-25"),
 * which emphasized system generation. Derive a readable product line from it;
 * the filename itself is unchanged.
 */
function footerTitleFromAttachment(attachmentName: string): string {
  const base = attachmentName
    .replace(/\.pdf$/i, "")
    .replace(/^EndUserPrivacy-/, "")
    .replace(/-\d{4}-\d{2}-\d{2}$/, "")
    .replace(/-/g, " ");
  return `End User Privacy · ${base}`;
}

// A-TEAM S3 RULING I.25 (doc 115, 2026-08-31) — the page footer printed a
// filename-derived short form ("CPPA Cybersecurity Audit") that drifted from
// the document's formal title ("CPPA Cybersecurity Audit Readiness Report").
// The footer now carries the document's own <h1>; the filename derivation
// survives only as the fallback for builders that emit no <h1>.
function footerTitleFromDocument(html: string, attachmentName: string): string {
  // DOC 170 (2026-09-04) — a Syllabus & Record document names its own
  // footer (its <h1> is the ACTIVITY title, not the product title).
  const sr = /data-sr-footer="([^"]*)"/.exec(html);
  if (sr && sr[1].trim()) return sr[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();
  const m = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const raw = m ? m[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim() : "";
  return raw ? `End User Privacy · ${raw}` : footerTitleFromAttachment(attachmentName);
}

/** DOC 170 — the Syllabus & Record running head ("END USER PRIVACY | <product>
 * · <company>"), declared by the document itself; null for every other
 * document, which keeps today's header-less request byte-for-byte. */
function runningHeadFromDocument(html: string): string | null {
  const m = /data-sr-runhead="([^"]*)"/.exec(html);
  const v = m ? m[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim() : "";
  return v || null;
}

async function generatePDF(
  html: string,
  title: string
): Promise<Uint8Array | null> {
  // PDFShift (https://pdfshift.io) — HTTP Basic auth with username "api"
  // and the API key as the password. Accepts inline HTML in `source`.
  const pdfApiKey =
    Deno.env.get("PDFSHIFT_API_KEY") ||
    Deno.env.get("PDF_SERVICE_API_KEY") || // legacy fallback
    Deno.env.get("PDFShift"); // secret stored under this name in this project

  if (!pdfApiKey) {
    console.error("PDFSHIFT_API_KEY not set in Supabase secrets.");
    return null;
  }

  // DOC 170 (2026-09-04) — Syllabus & Record documents carry a running head
  // (R5 furniture: END USER PRIVACY | product · company). PDFShift's header
  // option takes the same {source, spacing} shape as the footer below; the
  // top margin grows to make room. Every other document sends no header.
  const runhead = runningHeadFromDocument(html);
  const header = runhead
    ? {
      source:
        '<div style="font-family:Helvetica,Arial,sans-serif;font-size:7px;letter-spacing:0.12em;text-transform:uppercase;color:#8a9eb1;width:100%;padding:0 14mm;display:flex;justify-content:space-between;border-bottom:0.5px solid #dde5ea;padding-bottom:3px;">' +
        "<span>END USER PRIVACY</span>" +
        `<span>${runhead.replace(/</g, "&lt;")}</span>` +
        "</div>",
      spacing: 6,
    }
    : undefined;
  try {
    const response = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
      method: "POST",
      headers: {
        "X-API-Key": pdfApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: html,
        landscape: false,
        format: "Letter",
        margin: { top: header ? "20mm" : "16mm", right: "14mm", bottom: "18mm", left: "14mm" },
        ...(header ? { header } : {}),
        // A-TEAM S3 RULING I.4 (doc 115, 2026-08-31): multi-page tables were
        // not repeating their <thead> on continuation pages in production
        // even though the markup and `display:table-header-group` are
        // correct. Verified empirically with headless Chromium: header
        // repetition works in a PRINT-media context (5/5 pages, with and
        // without the .shell overflow) — the production difference is
        // screen-media emulation. The stylesheet carries no @media print
        // rules, so this flag changes only the emulated media type.
        use_print: true,
        sandbox: Deno.env.get("PDFSHIFT_SANDBOX") === "true",
        // Embed a small footer with the EndUserPrivacy mark + page numbers.
        footer: {
          source:
            '<div style="font-family:Helvetica,Arial,sans-serif;font-size:9px;color:#5c6d7a;width:100%;padding:0 14mm;display:flex;justify-content:space-between;">' +
            `<span>${title.replace(/</g, "&lt;")}</span>` +
            '<span>EndUserPrivacy.com · Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>' +
            "</div>",
          spacing: 4,
        },
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(`PDFShift error ${response.status}: ${errBody.slice(0, 300)}`);
    }
    return new Uint8Array(await response.arrayBuffer());
  } catch (e) {
    console.error("generatePDF failed:", e);
    return null;
  }
}


// ─────────────────────────────────────────────────────────────────────────
// SHARED META-LINE HELPER
// Single source of truth for the "Generated: … · EndUserPrivacy.com · …"
// line rendered atop every report builder. Pass null/undefined to omit
// optional segments. organizationName + extra are HTML-escaped.
// ─────────────────────────────────────────────────────────────────────────
function buildReportMetaLine(opts: {
  generatedAt: string | Date;
  organizationName?: string | null;
  jurisdictionLabel?: string | null;
  extra?: string | null;
}): string {
  const d = opts.generatedAt instanceof Date ? opts.generatedAt : new Date(opts.generatedAt);
  const dateStr = d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
     .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const parts = [`Generated: ${dateStr}`, "EndUserPrivacy.com"];
  if (opts.organizationName && String(opts.organizationName).trim()) {
    parts.push(esc(String(opts.organizationName).trim()));
  }
  if (opts.jurisdictionLabel && String(opts.jurisdictionLabel).trim()) {
    parts.push(String(opts.jurisdictionLabel).trim());
  }
  if (opts.extra && String(opts.extra).trim()) {
    parts.push(esc(String(opts.extra).trim()));
  }
  return `<div class="meta">${parts.join(" · ")}</div>`;
}

// ─────────────────────────────────────────────────────────────────────────
// HTML REPORT TEMPLATES
// ─────────────────────────────────────────────────────────────────────────



// UPGRADE-4 (ITEM 3/7) — the ICO three-part-arc deliverables, rendered in arc
// order (purpose → necessity → balancing) and closed by the attestation block.
// Placed after the three-part test and before the authority exhibit, which in
// turn sits before the universal disclaimer.
function buildLiaUpgrade4HTML(report: any): string {
  const S = (v: unknown) => sanitizeNarrative(String(v ?? ""));
  const statusLabel = (s: unknown) =>
    ({ record_sufficient: "Record sufficient", record_partial: "Record partial", record_insufficient: "Record insufficient" } as Record<string, string>)[String(s ?? "")] ??
    String(s ?? "").replace(/_/g, " ");
  const head = (title: string, f: any) => {
    if (!f) return "";
    const bits = [f.verdict ? liaVerdictLabel(f.verdict) : "", f.status ? statusLabel(f.status) : ""].filter(Boolean).join(" · ");
    return `<h3>${S(title)}${bits ? ` <span class="label">— ${S(bits)}</span>` : ""}</h3>`;
  };
  const finding = (title: string, f: any, extra = "") => {
    if (!f) return "";
    return `<div class="section">${head(title, f)}
${f.standard ? `<p class="meta"><em>${S(f.standard)}</em>${f.standard_citation ? ` — ${S(f.standard_citation)}` : ""}</p>` : ""}
${f.record_fact ? `<p class="meta">${S(f.record_fact)}</p>` : ""}
${f.application ? `<p>${S(f.application)}</p>` : ""}
${extra}
${f.cumulative_note ? `<p>${S(f.cumulative_note)}</p>` : ""}
${f.information_needed ? `<p class="meta"><em>Information needed — ${S(f.information_needed)}</em></p>` : ""}
${(f.citation || f.supporting_citation) ? `<p class="meta">Authority: ${S(f.citation || f.supporting_citation)}</p>` : ""}</div>`;
  };


  const il = report?.interest_legitimacy;
  const bb = report?.benefit_and_beneficiary;
  const ac = report?.alternatives_considered;
  const rel = report?.relationship_with_individual;
  const sfd = report?.scale_frequency_duration;
  const ph = report?.potential_harms;
  const oof = report?.opt_out_feasibility;
  const att = report?.attestation_block;
  if (!il && !bb && !ac && !rel && !sfd && !ph && !oof && !att) return "";

  const purpose = (il || bb)
    ? `<h2>Purpose — Is the interest legitimate?</h2>
${finding(liaSectionTitle("interest_legitimacy"), il, Array.isArray(il?.sub_tests) && il.sub_tests.length
        ? `<ul>${il.sub_tests.map((t: any) => `<li><strong>${S(t?.label)}</strong>${t?.verdict ? ` — ${S(liaVerdictLabel(t.verdict))}` : ""}${t?.reasoning ? `: ${S(t.reasoning)}` : ""}</li>`).join("")}</ul>`
        : "")}
${finding(liaSectionTitle("benefit_and_beneficiary"), bb, [
        bb?.benefit ? `<p><span class="label">Benefit:</span> ${S(bb.benefit)}</p>` : "",
        Array.isArray(bb?.beneficiary_labels ?? bb?.beneficiaries) && (bb.beneficiary_labels ?? bb.beneficiaries).length ? `<p><span class="label">Beneficiaries:</span> ${S((bb.beneficiary_labels ?? bb.beneficiaries).join(", "))}</p>` : "",
      ].join(""))}`
    : "";

  const necessity = ac
    ? `<h2>Necessity — Were less intrusive options ruled out?</h2>
${finding(liaSectionTitle("alternatives_considered"), ac, Array.isArray(ac?.alternatives) && ac.alternatives.length
        ? `<ul>${ac.alternatives.map((a: any) => `<li><strong>${S(a?.alternative)}</strong>${a?.why_inadequate ? ` — ${S(a.why_inadequate)}` : ""}</li>`).join("")}</ul>`
        : "")}`
    : "";

  const balancing = (rel || sfd || ph || oof)
    ? `<h2>Balancing — The individual's side of the scale</h2>
${finding(liaSectionTitle("relationship_with_individual"), rel, rel?.category ? `<p><span class="label">Category:</span> ${S(rel.category_label || rel.category)}</p>` : "")}
${finding(liaSectionTitle("scale_frequency_duration"), sfd, Array.isArray(sfd?.dimensions) && sfd.dimensions.length
        ? `<ul>${sfd.dimensions.map((dm: any) => `<li><strong>${S(dm?.label)}:</strong> ${S(dm?.recorded || statusLabel(dm?.status))}</li>`).join("")}</ul>`
        : "")}
${finding(liaSectionTitle("potential_harms"), ph, Array.isArray(ph?.harms) && ph.harms.length
        ? `<ul>${ph.harms.map((h: any) => `<li><strong>${S(h?.harm)}</strong>${h?.severity ? ` — ${S(h.severity)}` : ""}${h?.bearing_on_balance ? `: ${S(h.bearing_on_balance)}` : ""}</li>`).join("")}</ul>`
        : "")}
${finding(liaSectionTitle("opt_out_feasibility"), oof, [
        oof?.feasibility ? `<p><span class="label">Feasibility:</span> ${S(oof.feasibility)}</p>` : "",
        oof?.mechanism ? `<p><span class="label">Mechanism:</span> ${S(oof.mechanism)}</p>` : "",
      ].join(""))}`
    : "";

  const attestation = att
    ? `<h2>${S(liaSectionTitle("attestation_block"))}</h2>
<div class="section">
${att?.text ? `<p>${S(att.text)}</p>` : ""}
${att?.dpo_review?.reviewer ? `<p><span class="label">DPO review — who:</span> ${S(att.dpo_review.reviewer)}</p>` : ""}
${att?.dpo_review?.review_date ? `<p><span class="label">DPO review — when:</span> ${S(att.dpo_review.review_date)}</p>` : ""}
${Array.isArray(att?.approvers) && att.approvers.length ? `<p><span class="label">Approved by:</span> ${S(att.approvers.map((a: any) => [a?.name, a?.position].filter(Boolean).join(", ")).join("; "))}${att.approval_date ? ` (${S(att.approval_date)})` : ""}</p>` : ""}
${Array.isArray(att?.review_triggers) && att.review_triggers.length ? `<p class="label">Re-review triggers${att.triggers_are_default ? " (standard set)" : ""}:</p><ul>${att.review_triggers.map((t: string) => `<li>${S(t)}</li>`).join("")}</ul>` : ""}
${att?.information_needed ? `<p class="meta"><em>Information needed — ${S(att.information_needed)}</em></p>` : ""}
</div>`
    : "";

  return [purpose, necessity, balancing, attestation].filter(Boolean).join("\n");
}

function buildLIReportHTML(report: any, assessment: any): string {

  const d = report.three_part_test || {};
  const overall = report.three_part_test?.overall_assessment || {};
  const docRecs = report.documentation_recommendations || {};




  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
body { font-family:'Georgia','Times New Roman',serif; font-size:11pt; color:#1a1916;
  line-height:1.5; margin:0; background:#f5f8fa; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.shell { background:#fff; border:1px solid #dde5ea; border-radius:14px; overflow:hidden; }
.header { background:#0c2a44; color:#fff; padding:22px 26px 24px; }
.header .logo-img { display:block; height:34px; width:auto; margin-bottom:12px; object-fit:contain; }
.header .eyebrow { font-size:9px; font-weight:600; text-transform:uppercase;
  letter-spacing:0.14em; color:#93b5c6; margin:0 0 4px; }
.header h1 { font-family:'Georgia','Times New Roman',serif; font-size:22px; margin:0;
  line-height:1.25; font-weight:700; }
.header .meta { margin-top:6px; font-size:11px; color:#cbd5e1; }
.body { padding:22px 26px 26px; }
h2 { font-size:16px; color:#0c2a44; margin-top:28px; border-bottom:1px solid #dde5ea; padding-bottom:6px; }
h3 { font-size:14px; color:#2d9b90; margin-top:20px; }
.verdict-pass { color:#1e6b3c; font-weight:bold; }
.verdict-fail { color:#a32d2d; font-weight:bold; }
.verdict-uncertain { color:#8b5e0a; font-weight:bold; }
.strength { font-size:18px; font-weight:bold; padding:8px 16px; border-radius:4px;
  display:inline-block; margin-bottom:12px; }
.strength-strong { background:#eafaf1; color:#1e6b3c; }
.strength-moderate { background:#fef9ec; color:#8b5e0a; }
.strength-weak { background:#fcebeb; color:#a32d2d; }
.disclaimer { background:#e5f4f2; border-left:4px solid #2d9b90; padding:12px 16px;
  margin:24px 0; font-size:12px; border-radius:0 6px 6px 0; }
.section { margin-bottom:24px; }
ul { padding-left:20px; } li { margin-bottom:4px; }
.meta { color:#5c6d7a; font-size:12px; margin-bottom:24px; }
.label { font-weight:bold; text-transform:uppercase; font-size:11px;
  letter-spacing:0.05em; color:#5c6d7a; }
${AUTHORITY_EXHIBIT_CSS}

@media print {
  /* Prevent orphan section headings at page breaks */
  h1, h2, h3, h4, h5, h6,
  .section-heading,
  .label {
    break-after: avoid;
    page-break-after: avoid;
  }
  /* Keep heading with the first content element that follows */
  h1 + *, h2 + *, h3 + *, h4 + *, h5 + *, h6 + *,
  .section-heading + *,
  .label + * {
    break-before: avoid;
    page-break-before: avoid;
  }
  /* Keep bullet/list items together where possible */
  li {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  /* Keep the three-part test result cards and summary together */
  .section,
  .test-result-card,
  .assessment-summary,
  .disclaimer {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
</style></head><body>
<div class="shell">
<header class="header">
  <img class="logo-img" src="${LOGO_URL}" alt="End User Privacy" />
  <p class="eyebrow">Customized Compliance Assessment</p>
  <h1>Legitimate Interests Assessment</h1>
  <div class="meta">${buildReportMetaLine({ generatedAt: report.generated_at, organizationName: assessment?.organization_name }).replace(/<[^>]+>/g,'')}</div>
</header>
<div class="body">
<h2>Assessment Summary</h2>
<div class="section">
<span class="strength strength-${(overall.argument_strength || "uncertain").toLowerCase()}">Argument strength: ${overall.argument_strength || "Uncertain"}</span>
<p>${sanitizeNarrative(overall.strength_basis || "")}</p>
</div>
<h2>Three-Part Test</h2>
${["purpose_test", "necessity_test", "balancing_test"].map(key => {
    const t = d[key] || {};
    const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const verdictClass = (t.verdict || "uncertain").includes("pass") ? "pass" : (t.verdict || "").includes("fail") ? "fail" : "uncertain";
    const rawVerdict = t.verdict || "Uncertain";
    const verdictLabel = (rawVerdict.charAt(0).toUpperCase() + rawVerdict.slice(1)).replace(/_/g, " ");
    // W3-T2: render balancing_test.factors when present.
    const factorLabelMap: Record<string, string> = {
      reasonable_expectations: "Reasonable expectations",
      relationship: "Nature of the relationship",
      impact_severity: "Impact and severity",
      safeguards: "Safeguards (incl. opt-out)",
    };
    const dirLabel = (dv: string) => dv === "for_controller" ? "Tips for controller"
      : dv === "for_subjects" ? "Tips for data subjects" : "Neutral";
    const factorsHtml = (key === "balancing_test" && Array.isArray(t.factors) && t.factors.length)
      ? `<p class="label">EDPB four-factor balancing:</p>${t.factors.map((f: any) => `
<div class="section" style="margin-left:12px">
<p><strong>${sanitizeNarrative(factorLabelMap[f?.factor] || f?.factor || "")}</strong> — <em>${sanitizeNarrative(dirLabel(String(f?.direction || "")))}</em></p>
${f?.reasoning ? `<p>${sanitizeNarrative(f.reasoning)}</p>` : ""}
${Array.isArray(f?.intake_evidence) && f.intake_evidence.length ? `<ul>${f.intake_evidence.map((ev: any) => `<li><strong>${sanitizeNarrative(ev?.field || "")}:</strong> ${sanitizeNarrative(String(ev?.value ?? ""))}</li>`).join("")}</ul>` : (f?.evidence_absence ? `<p><em>Intake evidence absent:</em> ${sanitizeNarrative(String(f.evidence_absence))}</p>` : "")}
</div>`).join("")}${t.synthesis ? `<p><em>${sanitizeNarrative(t.synthesis)}</em></p>` : ""}`
      : "";
    return `<div class="section"><h3>${label} <span class="verdict-${verdictClass}">— ${verdictLabel}</span></h3>
<p>${sanitizeNarrative(t.analysis || "")}</p>
${factorsHtml}
${(t.risk_factors || []).length ? `<p class="label">Risk factors:</p><ul>${(t.risk_factors || []).map((r: string) => `<li>${sanitizeNarrative(r)}</li>`).join("")}</ul>` : ""}
${(t.supporting_factors || []).length ? `<p class="label">Supporting factors:</p><ul>${(t.supporting_factors || []).map((s: string) => `<li>${sanitizeNarrative(s)}</li>`).join("")}</ul>` : ""}
</div>`;
  }).join("")}
<h2>Documentation Recommendations</h2>
${((docRecs.recommended_documentation) || []).map((doc: any) =>
    `<div class="section"><h3>${doc.document || ""}</h3>
<p>${sanitizeNarrative(doc.purpose || "")}</p>
${(doc.key_elements || []).length ? `<ul>${(doc.key_elements || []).map((e: string) => `<li>${sanitizeNarrative(e)}</li>`).join("")}</ul>` : ""}</div>`
  ).join("")}
${((docRecs.balancing_record_elements) || []).length ? `<h2>Balancing Record — Must Include</h2>
<ul>${(docRecs.balancing_record_elements).map((e: string) => `<li>${sanitizeNarrative(e)}</li>`).join("")}</ul>` : ""}
${(() => {
    const anns = Array.isArray(report?.annotations) ? report.annotations : [];
    const precs = Array.isArray(report?.enforcement_precedents) ? report.enforcement_precedents : [];
    if (!anns.length && !precs.length) return "";
    const byId: Record<string, any> = {};
    for (const p of precs) if (p?.id) byId[p.id] = p;
    const isUk = (() => {
      const js = Array.isArray(assessment?.jurisdictions) ? assessment.jurisdictions : [];
      return js.some((j: string) => /united kingdom|uk|gb/i.test(String(j)));
    })();
    const tierLabel = (t: number | null | undefined): string => {
      if (t === 1) return isUk ? "UK GDPR enforcement" : "EU GDPR enforcement";
      if (t === 2) return isUk
        ? "Persuasive — EU decision (not binding under UK GDPR)"
        : "Persuasive — UK decision (not binding under EU GDPR)";
      if (t === 3) return "Non-EU/UK — supportive only, not authoritative";
      return "";
    };
    const items = (anns.length ? anns : precs.map((p: any) => ({ enforcement_action_id: p.id, regulator: p.regulator, jurisdiction: p.jurisdiction, summary: p.subject || p.violation, authority_tier: p.authority_tier })))
      .map((a: any) => {
        const ctx = byId[a.enforcement_action_id] || {};
        const tier = a.authority_tier ?? ctx.authority_tier ?? null;
        const verified = ctx.verified !== false;
        const fineLine = !verified
          ? `<p class="meta">(fine amount unverified — omitted)</p>`
          : (ctx.fine_eur_equivalent ? `<p class="meta">Fine: €${Number(ctx.fine_eur_equivalent).toLocaleString()}</p>` : "");
        const tl = tierLabel(tier);
        return `<div class="section"><h3>${sanitizeNarrative(a.regulator || ctx.regulator || "Enforcement source")}${tl ? ` <span class="label">— ${tl}</span>` : ""}</h3>
${a.summary ? `<p>${sanitizeNarrative(a.summary)}</p>` : (ctx.subject ? `<p>${sanitizeNarrative(ctx.subject)}</p>` : "")}
${a.relevance ? `<p><span class="label">Relevance:</span> ${sanitizeNarrative(a.relevance)}</p>` : ""}
${fineLine}</div>`;
      }).join("");
    return `<h2>Enforcement Precedents Cited</h2>${items}`;
  })()}
${buildLiaUpgrade4HTML(report)}
<p class="meta">${escHtml(report.data_currency_note || "")}</p>
${renderAuthorityExhibitHtml(report?.authority_exhibit)}
</div></div></body></html>`;

}

function buildGovernanceReportHTML(report: any, assessment: any): string {
  const domains = report.domain_findings || {};
  const severityColor: Record<string, string> = {
    Critical: "#a32d2d", High: "#c0722a", Medium: "#8b5e0a",
    Low: "#2d9b90", Compliant: "#1e6b3c", Unknown: "#5c5a54"
  };

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
body { font-family:'Georgia','Times New Roman',serif; font-size:11pt; color:#1a1916;
  line-height:1.5; margin:0; background:#f5f8fa; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.shell { background:#fff; border:1px solid #dde5ea; border-radius:14px; overflow:hidden; }
.header { background:#0c2a44; color:#fff; padding:22px 26px 24px; }
.header .logo-img { display:block; height:34px; width:auto; margin-bottom:12px; object-fit:contain; }
.header .eyebrow { font-size:9px; font-weight:600; text-transform:uppercase;
  letter-spacing:0.14em; color:#93b5c6; margin:0 0 4px; }
.header h1 { font-family:'Georgia','Times New Roman',serif; font-size:22px; margin:0; font-weight:700; }
.header .meta { margin-top:6px; font-size:11px; color:#cbd5e1; }
.body { padding:22px 26px 26px; }
h2 { font-size:16px; color:#0c2a44; margin-top:28px; border-bottom:1px solid #dde5ea; padding-bottom:6px; }
h3 { font-size:14px; color:#0c2a44; margin-top:20px; }
.rating { font-size:18px; font-weight:bold; padding:8px 16px; border-radius:4px;
  background:#e5f4f2; color:#0c2a44; display:inline-block; margin-bottom:12px; }
.severity { font-weight:bold; font-size:12px; padding:2px 8px; border-radius:3px; color:white; display:inline-block; }
.domain { border:1px solid #dde5ea; border-radius:6px; padding:14px 16px; margin-bottom:16px; }
.disclaimer { background:#e5f4f2; border-left:4px solid #2d9b90; padding:12px 16px;
  margin:24px 0; font-size:12px; border-radius:0 6px 6px 0; }
.meta { color:#5c6d7a; font-size:12px; margin-bottom:24px; }
.label { font-weight:bold; text-transform:uppercase; font-size:11px; letter-spacing:0.05em; color:#5c6d7a; }
ul { padding-left:20px; } li { margin-bottom:4px; }
${AUTHORITY_EXHIBIT_CSS}
</style></head><body>
<div class="shell">
<header class="header">
  <img class="logo-img" src="${LOGO_URL}" alt="End User Privacy" />
  <p class="eyebrow">Customized Compliance Assessment</p>
  <h1>GDPR Accountability Assessment</h1>
  <div class="meta">${buildReportMetaLine({ generatedAt: report.generated_at, organizationName: assessment?.organization_name }).replace(/<[^>]+>/g,'')}</div>
</header>
<div class="body">
${(() => {
    // ITEM 400 GV-2 — a header field with nothing to say is OMITTED, never
    // shipped as a bare em-dash. Values come from `governance_header_fields`
    // (written by the governance prose-gold pass) and fall back to the
    // report/assessment record for documents generated before ITEM 400.
    const hf = (report.governance_header_fields || {}) as Record<string, string>;
    const prof = (report.organisation_profile || {}) as Record<string, unknown>;
    const flat = (v: unknown): string =>
      Array.isArray(v) ? v.map((x) => String(x)).join(", ") : (v == null ? "" : String(v));
    const clean = (v: string): string => {
      const s = v.trim();
      return s === "—" || s === "-" || s === "–" || s.toLowerCase() === "n/a" ? "" : s;
    };
    const rows: { label: string; value: string }[] = [];
    const push = (label: string, v: string) => { const s = clean(v); if (s) rows.push({ label, value: s }); };
    push("Organization", hf.organization_name || flat(assessment?.organization_name) || flat(prof.organization_name));
    push("Sector", hf.sector || flat(prof.sector));
    push("Jurisdictions", hf.jurisdictions || flat(prof.jurisdictions));
    push("Generated", report.generated_at
      ? new Date(report.generated_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      : "");
    if (!rows.length) return "";
    return `<div style="border:1px solid #dde5ea;border-radius:8px;padding:14px 18px;margin-bottom:20px;background:#f8fafc;">
  <table style="width:100%;border-collapse:collapse;font-size:11px;">
    ${rows.map((r) => `<tr>
      <td style="padding:3px 12px 3px 0;color:#5c6d7a;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;width:140px;">${escHtml(r.label)}</td>
      <td style="padding:3px 0;color:#1a1916;">${escHtml(r.value)}</td>
    </tr>`).join("")}
  </table>
</div>`;
  })()}
<h2>Executive Summary</h2>
${/* ITEM 400 GV-1 — ONE verdict voice. The maturity tier is demoted (ITEM 313)
      and `overall_readiness_rating` is deleted, which is why this line used to
      print "Readiness: Unknown" beside a contradicting summary. The line now
      comes from the authoritative accountability determination, and prints
      nothing at all when there is no determination to report. */""}
${/* ITEM 402 item 4(b) — ONE CONSUMER PATH: the typed readiness_determination
      record is the source; this header only restates it. Documents persisted
      before item402 carry neither field and render exactly as before. */""}
${(() => {
      const line = readinessLineForRender(report);
      return line ? `<div class="rating">${escHtml(line)}</div>` : "";
    })()}
<p class="meta" style="font-size:10.5px;color:#5c5a54;margin-top:4px;">
  Domain severity guide: <strong>Critical</strong> = no controls in place; <strong>High</strong> = controls exist but are materially incomplete; <strong>Medium</strong> = controls mostly in place with identified gaps; <strong>Low</strong> = minor gaps only; <strong>Compliant</strong> = requirements met.
</p>
<p>${escHtml(report.executive_summary || "")}</p>
<p>${escHtml(report.readiness_rationale || "")}</p>
<h2>Top Three Risks</h2>
${(report.top_three_risks || []).map((r: any) =>
    `<div class="domain"><strong>${escHtml(r.risk || "")}</strong> <span class="severity" style="background:${severityColor[r.severity] || "#5c5a54"}">${escHtml(r.severity || "")}</span><p>${escHtml(r.why_urgent || "")}</p></div>`
  ).join("")}
<h2>Immediate Actions Required</h2>
<ul>${(report.immediate_actions || []).map((a: any) =>
    `<li><strong>${escHtml(a.action || "")}</strong> — ${escHtml(a.owner || "")}, ${escHtml(a.timeline || "")}</li>`
  ).join("")}</ul>
<h2>Domain Findings</h2>
${(() => {
    const entries = Object.values(domains) as any[];
    const withId = entries.filter((d) => d?.domain_id != null);
    const withoutId = entries.filter((d) => d?.domain_id == null);
    withId.sort((a, b) => Number(a.domain_id) - Number(b.domain_id));
    return [...withId, ...withoutId].map((dn: any) => {
      const heading = dn?.domain_id != null
        ? `Domain ${dn.domain_id} — ${escHtml(dn.domain_name || "")}`
        : escHtml(dn.domain_name || "");

      // QB-P25 B2 — prefer v2 objects with legacy string fallback.
      const rb2 = Array.isArray(dn?.regulatory_basis_v2) ? dn.regulatory_basis_v2 : null;
      const rbValidV2 = rb2 && rb2.length > 0 && rb2.every((e: any) =>
        e && typeof e.citation === "string" && e.citation.trim() &&
        typeof e.engaged_because === "string" && e.engaged_because.trim());
      const regulatoryHtml = rbValidV2
        ? `<p class="label">Regulatory basis</p><ul>${rb2.map((e: any) =>
            `<li><strong>${escHtml(e.citation)}</strong> — engaged because ${escHtml(e.engaged_because)}</li>`).join("")}</ul>`
        : `<p class="label">Regulatory basis</p><p>${escHtml(dn.regulatory_basis || "")}</p>`;

      const ra2 = dn?.recommended_action_v2;
      const raValidV2 = ra2 && typeof ra2 === "object"
        && typeof ra2.action === "string" && ra2.action.trim()
        && ra2.owner && typeof ra2.owner.role === "string" && ra2.owner.role.trim()
        && typeof ra2.owner.intake_field === "string" && ra2.owner.intake_field.trim()
        && typeof ra2.trigger === "string" && ra2.trigger.trim()
        && ra2.deadline && (
          (ra2.deadline.kind === "statutory" && typeof ra2.deadline.citation === "string" && ra2.deadline.citation.trim()) ||
          (ra2.deadline.kind === "org_set" && typeof ra2.deadline.illustrative_default === "string" && ra2.deadline.illustrative_default.trim())
        );
      const timelineSentence = raValidV2
        ? (ra2.deadline.kind === "statutory"
            ? `Statutory deadline: ${ra2.deadline.citation}${ra2.deadline.illustrative_default ? ` (illustrative cadence — ${ra2.deadline.illustrative_default})` : ""}`
            : `Timeline to be set by the organisation (e.g. ${ra2.deadline.illustrative_default})`)
        : "";
      const recommendedHtml = raValidV2
        ? `<p class="label">Recommended action</p>
           <p><strong>${escHtml(ra2.action)}</strong></p>
           <p class="meta">Owner: ${escHtml(ra2.owner.role)} (from ${escHtml(ra2.owner.intake_field)})</p>
           <p class="meta">Trigger: ${escHtml(ra2.trigger)}</p>
           <p class="meta">${escHtml(timelineSentence)}</p>`
        : `<p class="label">Recommended action</p><p><strong>${escHtml(dn.recommended_action || "")}</strong></p>
           <p class="meta">${escHtml(dn.suggested_owner || "")} &nbsp;|&nbsp; ${escHtml(dn.suggested_timeline || "")}</p>`;

      return `<div class="domain"><h3>${heading} <span class="severity" style="background:${severityColor[dn.severity] || "#5c5a54"}">${escHtml(dn.severity || "")}</span></h3>
<p class="label">Current state</p><p>${escHtml(dn.current_state || "")}</p>
${dn.gap_description ? `<p class="label">Gap</p><p>${escHtml(dn.gap_description)}</p>` : ""}
${regulatoryHtml}
${recommendedHtml}</div>`;
    }).join("");
  })()}
<h2>Cross-Domain Considerations</h2>
<p>${escHtml(report.interaction_effects || "")}</p>
${renderAuthorityExhibitHtml(report?.authority_exhibit)}
</div></div></body></html>`;
}

function buildDPIAReportHTML(report: any, dpia: any): string {
  const meta = report.dpia_metadata || {};
  const cellHtml = (key: string, val: any): string => {
    try {
      if (val === null || val === undefined || val === "") return "—";
      if (Array.isArray(val)) {
        // Guard against arrays of objects (val.join collapses to [object Object])
        return escHtml(val.map((x) => (x && typeof x === "object" ? JSON.stringify(x) : String(x))).join(", "));
      }
      if (typeof val === "object") {
        if ("is_special" in val) return val.is_special ? "Yes" + (Array.isArray(val.categories) && val.categories.length ? ": " + escHtml(val.categories.join(", ")) : "") : "No";
        return escHtml(JSON.stringify(val));
      }
      return sanitizeNarrative(String(val));
    } catch (e) {
      console.warn(`[dpia-pdf] cellHtml failed key=${key}`, (e as Error)?.message);
      return "—";
    }
  };
  // W3-T1 — provenance badge for rows carrying { intake_field, basis }.
  const provBadge = (source: any): string => {
    if (!source || typeof source !== "object") return "";
    const basis = String((source as any).basis ?? "").toLowerCase();
    const field = (source as any).intake_field ? String((source as any).intake_field) : "";
    if (basis === "inferred") {
      return ` <span style="display:inline-block;margin-left:6px;padding:1px 5px;font-size:9px;border:1px solid #1a4a6e;background:#eef4f7;color:#1a4a6e;border-radius:3px;text-transform:uppercase;">inferred — confirm</span>`;
    }
    if (basis === "stated" && field) {
      return ` <span style="display:inline-block;margin-left:6px;padding:1px 5px;font-size:9px;border:1px solid #047857;background:#d1fae5;color:#065f46;border-radius:3px;text-transform:uppercase;">stated · ${escHtml(field)}</span>`;
    }
    return "";
  };
  const tbl = (cols: { key: string; label: string }[], rows: any[]): string => {
    try {
      return Array.isArray(rows) && rows.length
        ? `<table class="dt"><thead><tr>${cols.map((c) => `<th>${escHtml(c.label)}</th>`).join("")}</tr></thead><tbody>${rows.map((r: any) => `<tr>${cols.map((c, ci) => `<td>${cellHtml(c.key, r?.[c.key])}${ci === 0 ? provBadge(r?.source) : ""}</td>`).join("")}</tr>`).join("")}</tbody></table>`
        : `<p style="font-style:italic;color:#5c6d7a;">[TO COMPLETE — no rows generated]</p>`;
    } catch (e) {
      console.warn("[dpia-pdf] tbl failed", (e as Error)?.message);
      return `<p style="font-style:italic;color:#5c6d7a;">[table render error]</p>`;
    }
  };
  const prose = (label: string, val: any): string => {
    try {
      if (val === null || val === undefined || val === "") return "";
      const str = typeof val === "string" ? val
        : typeof val === "number" || typeof val === "boolean" ? String(val)
        : Array.isArray(val) ? val.map((x) => (x && typeof x === "object" ? JSON.stringify(x) : String(x))).join("; ")
        : (() => { try { return JSON.stringify(val); } catch { return String(val); } })();
      if (!str) return "";
      return `<p><span class="label">${escHtml(label)}:</span> ${sanitizeNarrative(str)}</p>`;
    } catch (e) {
      console.warn(`[dpia-pdf] prose failed label=${label}`, (e as Error)?.message);
      return "";
    }
  };
  const sec = (heading: string, s: any, inner: string): string =>
    !s ? "" : `<h2>${escHtml(heading)}</h2>${s.guidance_note ? `<div class="guidance">${escHtml(s.guidance_note)}</div>` : ""}${inner}${s.completion_guidance ? `<div class="completion"><strong>The organization must complete: </strong>${escHtml(s.completion_guidance)}</div>` : ""}`;
  // PDF-FF-DPIA: per-section defensive wrapper. If a section's inner template
  // throws for any reason (unexpected data shape from a generator variant),
  // emit a compact placeholder for that section instead of failing the whole
  // PDF. The upstream 500 previously stranded PAID exports (docs 2/3 of
  // batch 3abe5259) with an opaque "Report generation failed" message.
  const safeSec = (heading: string, s: any, build: () => string): string => {
    if (!s) return "";
    try {
      return sec(heading, s, build());
    } catch (e) {
      const msg = (e as Error)?.message || "unknown";
      console.error(`[dpia-pdf] section render failed heading="${heading}" err=${msg}`, (e as Error)?.stack);
      return `<h2>${escHtml(heading)}</h2><div class="guidance">This section could not be rendered because the underlying data did not match the expected shape (${escHtml(msg)}). The rest of this DPIA framework remains valid — please rerun this section from the tool if needed.</div>`;
    }
  };

  const ov = report.section_0_overview, d1 = report.section_1_description, an = report.section_2_analysis;
  const np = report.section_3_necessity_proportionality, rm = report.section_4_risk_management;
  const ip = report.section_5_interested_parties, cc = report.section_6_conclusion;
  const ts = ov?.technical_sheet || {};

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
body { font-family:'Georgia','Times New Roman',serif; font-size:11pt; color:#1a1916;
  line-height:1.5; margin:0; background:#f5f8fa; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.shell { background:#fff; border:1px solid #dde5ea; border-radius:14px; overflow:hidden; }
.header { background:#0c2a44; color:#fff; padding:22px 26px 24px; }
.header .logo-img { display:block; height:34px; width:auto; margin-bottom:12px; object-fit:contain; }
.header .eyebrow { font-size:9px; font-weight:600; text-transform:uppercase;
  letter-spacing:0.14em; color:#93b5c6; margin:0 0 4px; }
.header h1 { font-family:'Georgia','Times New Roman',serif; font-size:22px; margin:0; font-weight:700; }
.header .meta { margin-top:6px; font-size:11px; color:#cbd5e1; }
.body { padding:22px 26px 26px; }
h2 { font-size:16px; color:#0c2a44; margin-top:28px; border-bottom:1px solid #dde5ea; padding-bottom:6px; }
.guidance { background:#edf2f5; border-left:4px solid #8a9eb1; padding:10px 14px;
  margin:12px 0; font-size:12px; border-radius:0 6px 6px 0; }
.completion { background:#e5f4f2; border-left:4px solid #2d9b90; padding:10px 14px;
  margin:12px 0; font-size:12px; border-radius:0 6px 6px 0; }
.signoff { border:1px solid #dde5ea; padding:16px; margin-top:16px;
  font-family:'Courier New',monospace; font-size:12px; line-height:2.2; }
.disclaimer { background:#e5f4f2; border-left:4px solid #2d9b90; padding:12px 16px;
  margin:24px 0; font-size:12px; border-radius:0 6px 6px 0; }
.meta { color:#5c6d7a; font-size:12px; margin-bottom:24px; }
.label { font-weight:bold; text-transform:uppercase; font-size:11px; letter-spacing:0.05em; color:#5c6d7a; }
ul { padding-left:20px; } li { margin-bottom:4px; }
h3 { font-size:12.5px; color:#0c2a44; margin:16px 0 6px; }
table.dt { width:100%; border-collapse:collapse; margin:8px 0 14px; font-size:10.5px; }
table.dt th { text-align:left; background:#eef3f6; color:#5c6d7a; text-transform:uppercase; letter-spacing:0.04em; font-size:9px; padding:5px 7px; border:1px solid #dde5ea; }
table.dt td { padding:5px 7px; border:1px solid #dde5ea; vertical-align:top; }
${AUTHORITY_EXHIBIT_CSS}
${DETERMINATION_CSS}
</style></head><body>
<div class="shell">
<header class="header">
  <img class="logo-img" src="${LOGO_URL}" alt="End User Privacy" />
  <p class="eyebrow">Customized Compliance Assessment</p>
  <h1>Data Protection Impact Assessment</h1>
  <div class="meta">${buildReportMetaLine({ generatedAt: report.generated_at, organizationName: dpia?.organization_name, extra: [meta.processing_activity_name ? `Processing activity: ${meta.processing_activity_name}` : null, `Version: ${meta.framework_version || "1.0"}`].filter(Boolean).join(" · ") }).replace(/<[^>]+>/g,'')}</div>
</header>
<div class="body">
${renderRecordCompleteBanner(report)}
${renderDeterminationHtml(report?.determination)}
<!-- ITEM 372 r2 (2) — LEGACY BANNER SLOT SUPPRESSED. The top-of-document
     "IMPORTANT: …" slot printed framework_disclaimer above everything. The
     determination block now opens the document, and the universal disclaimer
     closes it, so this slot has no remaining job; on a degraded record it
     printed a gap atom as the document's first line. -->
<div style="border:1px solid #dde5ea;border-radius:8px;padding:14px 18px;margin-bottom:20px;background:#f8fafc;">
  <table style="width:100%;border-collapse:collapse;font-size:11px;">
    <tr>
      <td style="padding:3px 12px 3px 0;color:#5c6d7a;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;width:140px;">Controller</td>
      <td style="padding:3px 0;color:#1a1916;">${escHtml(dpia?.organization_name || report.section_0_overview?.controllers?.[0]?.name || meta.controller_name || "[TO COMPLETE — controller legal name]")}</td>
      <td style="padding:3px 12px 3px 24px;color:#5c6d7a;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;width:120px;">Version</td>
      <td style="padding:3px 0;color:#1a1916;">${escHtml(meta.framework_version || "1.0")}</td>
    </tr>
    <tr>
      <td style="padding:3px 12px 3px 0;color:#5c6d7a;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Processing activity</td>
      <td style="padding:3px 0;color:#1a1916;" colspan="3">${escHtml(meta.processing_activity_name || "[TO COMPLETE]")}</td>
    </tr>
    <tr>
      <td style="padding:3px 12px 3px 0;color:#5c6d7a;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Jurisdiction scope</td>
      <td style="padding:3px 0;color:#1a1916;">${escHtml((Array.isArray(meta.applicable_frameworks) ? meta.applicable_frameworks : []).join(" | ") || "[TO COMPLETE]")}</td>
      <td style="padding:3px 12px 3px 24px;color:#5c6d7a;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Status</td>
      <td style="padding:3px 0;color:#b45309;font-weight:600;">FRAMEWORK — NOT A COMPLETED DPIA</td>
    </tr>
  </table>
</div>
${meta.supervisory_authority_consultation_trigger ? `<div class="completion"><strong>Supervisory authority consultation trigger: </strong>${meta.supervisory_authority_consultation_trigger}</div>` : ""}
${safeSec("0. Overview of the Processing", ov, () => `
<h3>Controller(s)</h3>${tbl([{ key: "name", label: "Controller" }, { key: "responsible_unit", label: "Responsible unit" }, { key: "main_establishment_or_representative", label: "Main establishment / representative" }, { key: "dpo", label: "DPO" }], ov?.controllers)}
<h3>Processor(s) / sub-processor(s)</h3>${tbl([{ key: "name", label: "Processor" }, { key: "obligations_and_tasks", label: "Obligations & tasks" }], ov?.processors)}
${prose("Processing name", ov?.processing_name)}${prose("Version / change history", ov?.processing_version)}${prose("Estimated launch date", ov?.planning?.estimated_launch_date)}${prose("Estimated end date", ov?.planning?.estimated_end_date)}
<h3>DPIA technical sheet</h3>${prose("Team (RACI)", ts.team_raci)}${prose("Reference materials", ts.reference_materials)}${prose("Reasons to conduct", Array.isArray(ts.reasons_to_conduct) ? ts.reasons_to_conduct.join("; ") : ts.reasons_to_conduct)}${prose("Scope", ts.scope)}${prose("Completion date", ts.completion_date)}${prose("Formal validation date", ts.formal_validation_date)}${prose("Publication intent", ts.publication_intent)}
${ov?.assessment_team ? `<h3>Assessment team</h3>${ov.assessment_team.text ? `<p>${sanitizeNarrative(String(ov.assessment_team.text))}</p>` : ""}${Array.isArray(ov.assessment_team.members) && ov.assessment_team.members.length ? `<ul>${ov.assessment_team.members.map((m: any) => `<li>${escHtml(m?.name || "")}${m?.role ? ` — ${escHtml(m.role)}` : ""}</li>`).join("")}</ul>` : ""}${ov.assessment_team.information_needed ? prose("Information needed", ov.assessment_team.information_needed) : ""}${prose("Template reference", ov.assessment_team.template_ref)}` : ""}`)}

${safeSec("1. Systematic Description of the Processing", d1, () => `
<h3>Processed personal data</h3>${tbl([{ key: "item", label: "Data item" }, { key: "explanation", label: "Explanation" }, { key: "special_category", label: "Special category" }], d1?.processed_personal_data)}
<h3>Purposes</h3>${tbl([{ key: "purpose", label: "Purpose" }, { key: "personal_data_involved_and_justification", label: "Data involved & justification" }], d1?.purposes)}
<h3>Secondary or compatible uses</h3>${tbl([{ key: "use", label: "Use" }, { key: "conditions_and_compatibility", label: "Conditions & compatibility" }], d1?.secondary_uses)}
${prose("Nature", d1?.nature)}${prose("Scope", d1?.scope)}${prose("Context", d1?.context)}${prose("Cross-border", d1?.cross_border)}${prose("International transfers", d1?.international_transfers)}
<h3>Functional description</h3>${tbl([{ key: "phase", label: "Phase" }, { key: "operations", label: "Operations" }, { key: "explanation", label: "Explanation" }], d1?.functional_description)}
<h3>Supporting assets</h3>${tbl([{ key: "phase", label: "Phase" }, { key: "assets", label: "Assets" }, { key: "explanation", label: "Explanation" }], d1?.supporting_assets)}
<h3>Codes of conduct</h3>${tbl([{ key: "code", label: "Code" }, { key: "basis", label: "Basis" }, { key: "explanation", label: "Explanation" }], d1?.codes_of_conduct)}`)}

${safeSec("2. Analysis of the Processing", an, () => `
<h3>Legal basis (per purpose)</h3>${tbl([{ key: "purpose", label: "Purpose / use" }, { key: "article_6_basis", label: "Art. 6(1) basis" }, { key: "justification", label: "Justification" }], an?.legal_basis)}
<h3>Reasons to lift the prohibition (special categories)</h3>${tbl([{ key: "data_item", label: "Data item" }, { key: "article_9_condition", label: "Art. 9(2) condition" }, { key: "justification", label: "Justification" }], an?.special_category_conditions)}
<h3>Data minimisation & retention</h3>${tbl([{ key: "data_item", label: "Data item" }, { key: "need_justification", label: "Need" }, { key: "recipients", label: "Recipients" }, { key: "retention_period", label: "Retention" }, { key: "retention_justification", label: "Retention justification" }], an?.data_minimisation_retention)}
<h3>Data quality</h3>${tbl([{ key: "data_item", label: "Data item" }, { key: "metrics", label: "Metrics" }, { key: "justification", label: "Justification" }], an?.data_quality)}
<h3>Measures — Article 5(1) principles</h3>${tbl([{ key: "principle", label: "Principle" }, { key: "measures", label: "Measures" }, { key: "appropriateness", label: "Appropriateness" }, { key: "implementation_status", label: "Status" }], an?.measures_article5)}
<h3>Measures — data subject rights</h3>${tbl([{ key: "right", label: "Right" }, { key: "measures", label: "Measures" }, { key: "appropriateness", label: "Appropriateness" }, { key: "implementation_status", label: "Status" }], an?.measures_rights)}
<h3>Measures — other GDPR requirements</h3>${tbl([{ key: "requirement", label: "Requirement" }, { key: "measures", label: "Measures" }, { key: "appropriateness", label: "Appropriateness" }, { key: "implementation_status", label: "Status" }], an?.measures_other)}
<h3>Measures — by design & default (Art. 25)</h3>${tbl([{ key: "measures", label: "Measures" }, { key: "appropriateness", label: "Appropriateness" }, { key: "implementation_status", label: "Status" }], an?.measures_dpbd)}
<h3>Measures — security (Art. 32)</h3>${tbl([{ key: "measures", label: "Measures" }, { key: "appropriateness", label: "Appropriateness" }, { key: "implementation_status", label: "Status" }], an?.measures_security)}`)}

${safeSec("3. Considerations on Necessity and Proportionality", np, () => `
<h3>Design / structural risk impacts</h3>${tbl([{ key: "threat", label: "Threat" }, { key: "how_materialised", label: "How it materialises" }, { key: "risk_sources", label: "Risk sources" }, { key: "impact_on_rights", label: "Impact on rights" }], np?.design_risk_impacts)}
${prose("Necessity assessment", np?.necessity_assessment)}${prose("Proportionality assessment", np?.proportionality_assessment)}`)}

${safeSec("4. Risk Assessment and Management", rm, () => `
<h3>Incident / deviation risk impacts</h3>${tbl([{ key: "threat", label: "Threat" }, { key: "how_materialised", label: "How it materialises" }, { key: "risk_sources", label: "Risk sources" }, { key: "impact_on_rights", label: "Impact on rights" }], rm?.incident_risk_impacts)}
${prose("Method", rm?.method)}
<h3>Inherent risk assessment</h3>${tbl([{ key: "risk", label: "Risk" }, { key: "likelihood", label: "Likelihood" }, { key: "severity", label: "Severity" }, { key: "modulating_factors", label: "Modulating factors" }, { key: "risk_level", label: "Risk level" }, { key: "acceptable", label: "Acceptable?" }], rm?.inherent_risk_assessment)}
${Array.isArray(rm?.annotations) && rm.annotations.length ? `<p class="label">Enforcement annotations:</p><ul>${rm.annotations.map((a: any) => `<li><strong>${escHtml(a?.regulator || "Enforcement source")}</strong>${a?.summary ? ` — ${sanitizeNarrative(typeof a.summary === "string" ? a.summary : JSON.stringify(a.summary))}` : ""}${a?.relevance ? ` (Relevance: ${sanitizeNarrative(typeof a.relevance === "string" ? a.relevance : JSON.stringify(a.relevance))})` : ""}</li>`).join("")}</ul>` : ""}
<h3>Additional mitigating measures</h3>${tbl([{ key: "measure", label: "Measure" }, { key: "mitigated_risks", label: "Mitigates" }, { key: "appropriateness", label: "Appropriateness" }, { key: "implementation_status", label: "Status" }], rm?.additional_mitigating_measures)}
<h3>Residual risk assessment</h3>${tbl([{ key: "risk", label: "Risk" }, { key: "residual_likelihood", label: "Residual likelihood" }, { key: "residual_severity", label: "Residual severity" }, { key: "residual_risk_level", label: "Residual level" }, { key: "acceptable", label: "Acceptable?" }], rm?.residual_risk_assessment)}
${prose("Action plan", rm?.plan)}`)}

${safeSec("5. Involvement of Interested Parties", ip, () => `${prose("DPO advice", ip?.dpo_advice)}${prose("Views of data subjects or their representatives", ip?.data_subject_views)}`)}

${safeSec("6. Conclusion and Decision", cc, () => `${prose("Decision", cc?.decision)}${Array.isArray(cc?.conditions) && cc.conditions.length ? `<p class="label">Conditions:</p><ul>${cc.conditions.map((c: any) => `<li>${sanitizeNarrative(typeof c === "string" ? c : JSON.stringify(c))}</li>`).join("")}</ul>` : ""}${prose("Supervisory authority consultation", cc?.supervisory_authority_consultation_required)}${cc?.validation_approval ? `<h3>Validation and approval</h3>${cc.validation_approval.text ? `<p>${sanitizeNarrative(String(cc.validation_approval.text))}</p>` : ""}${cc.validation_approval.attested ? `${prose("Approved by", cc.validation_approval.approved_by_name)}${prose("Title", cc.validation_approval.approved_by_title)}${prose("Date of approval", cc.validation_approval.approval_date)}${prose("Basis for sign-off", cc.validation_approval.basis_for_sign_off)}` : ""}${cc.validation_approval.information_needed ? prose("Information needed", cc.validation_approval.information_needed) : ""}${prose("Template reference", cc.validation_approval.template_ref)}` : ""}${prose("Review schedule", cc?.review_schedule)}${prose("Justification", cc?.justification)}`)}
${report.section_6_conclusion?.sign_off_template ? `<h2>Sign-Off Record</h2>
<div class="signoff">
Name: ___________________________<br>
Role: ___________________________<br>
Date of review: _________________<br>
Decision: [ ] Processing may proceed &nbsp;&nbsp; [ ] Further mitigation required<br>
Signature: ______________________
</div>` : ""}
${renderAuthorityExhibitHtml(report?.authority_exhibit)}
<div class="disclaimer"><strong>IMPORTANT: </strong>${escHtml(report.framework_disclaimer || "")}</div>
</div></div></body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────
// FREE-FORM ASSESSMENT TEXT BUILDER (Biometric, IR Playbook, DPA)
// Mirrors the on-screen ReportShell + AssessmentReport styling.
// ─────────────────────────────────────────────────────────────────────────

// ITEM 404 CY-7 — enforcement_context is a STRING on legacy cyber documents
// and an OBJECT on the fleet shape. Readers accept both; a legacy document
// renders byte-identically.
function enfText(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of ["narrative", "summary", "text", "aggregate_exposure_note"]) {
      const x = o[k];
      if (typeof x === "string" && x.trim()) return x;
    }
  }
  return "";
}

function escHtml(s: unknown): string {
  if (s === null || s === undefined) return "";
  const str = typeof s === "string" ? s : (
    typeof s === "number" || typeof s === "boolean" ? String(s) :
    (() => { try { return JSON.stringify(s); } catch { return String(s); } })()
  );
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderInlineHtml(text: string): string {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p) => {
    const m = /^\*\*([^*]+)\*\*$/.exec(p);
    if (m) return `<strong style="font-weight:500;color:#1a1916;">${escHtml(m[1])}</strong>`;
    return escHtml(p);
  }).join("");
}

type TextBlock =
  | { type: "subhead"; text: string; trailing?: string }
  | { type: "para"; text: string }
  | { type: "ol"; items: { num: string; text: string }[] }
  | { type: "ul"; items: string[] }
  | { type: "table"; header: string[]; rows: string[][] };

const PIPE_SEP_ROW_RE = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/;
function splitPipeRow(s: string): string[] {
  const t = s.trim().replace(/^\|/, "").replace(/\|$/, "");
  return t.split("|").map((c) => c.trim());
}

function parseTextBlocks(body: string): TextBlock[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks: TextBlock[] = [];
  const subheadRe = /^\*\*([^*]+?):\*\*\s*(.*)$/;
  const numberedSubheadRe = /^(\d+\.\d+)\s+(.+)$/;
  const numberedRe = /^(\d+)\.\s+(.*)$/;
  const bulletRe = /^[-•]\s+(.*)$/;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    if (/^[-*_]{3,}$/.test(line)) { i++; continue; }

    // Markdown pipe table: current line has '|' and next non-empty line is a separator row
    if (line.includes("|")) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      if (j < lines.length && PIPE_SEP_ROW_RE.test(lines[j].trim())) {
        const header = splitPipeRow(line);
        const rows: string[][] = [];
        i = j + 1;
        while (i < lines.length) {
          const cur = lines[i].trim();
          if (!cur || !cur.includes("|")) break;
          if (PIPE_SEP_ROW_RE.test(cur)) { i++; continue; }
          rows.push(splitPipeRow(cur));
          i++;
        }
        blocks.push({ type: "table", header, rows });
        continue;
      }
    }

    const sh = subheadRe.exec(line);
    if (sh) {
      blocks.push({ type: "subhead", text: sh[1].trim(), trailing: sh[2] ? sh[2].trim() : undefined });
      i++; continue;
    }
    const nsh = numberedSubheadRe.exec(line);
    if (nsh) {
      blocks.push({ type: "subhead", text: `${nsh[1]} ${nsh[2]}`.trim() });
      i++; continue;
    }
    if (numberedRe.test(line)) {
      const items: { num: string; text: string }[] = [];
      while (i < lines.length) {
        const cur = lines[i].trim();
        const m = numberedRe.exec(cur);
        if (m) { items.push({ num: m[1], text: m[2] }); i++; }
        else if (cur && !subheadRe.test(cur) && !bulletRe.test(cur) && !numberedSubheadRe.test(cur) && items.length > 0) {
          items[items.length - 1].text += " " + cur; i++;
        } else break;
      }
      blocks.push({ type: "ol", items });
      continue;
    }
    if (bulletRe.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const cur = lines[i].trim();
        const m = bulletRe.exec(cur);
        if (m) { items.push(m[1]); i++; }
        else if (cur && !subheadRe.test(cur) && !numberedRe.test(cur) && !numberedSubheadRe.test(cur) && items.length > 0) {
          items[items.length - 1] += " " + cur; i++;
        } else break;
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    blocks.push({ type: "para", text: line });
    i++;
  }
  return blocks;
}

function blocksToHtml(blocks: TextBlock[]): string {
  return blocks.map((b) => {
    if (b.type === "subhead") {
      return `<div class="subhead"><h4>${escHtml(b.text)}</h4><div class="rule"></div>${
        b.trailing ? `<p class="sub-trailing">${renderInlineHtml(b.trailing)}</p>` : ""
      }</div>`;
    }
    if (b.type === "para") return `<p class="body-p">${renderInlineHtml(b.text)}</p>`;
    if (b.type === "table") {
      const head = b.header.map((h) => `<th>${renderInlineHtml(h)}</th>`).join("");
      const body = b.rows.map((r) =>
        `<tr>${r.map((c) => `<td>${renderInlineHtml(c)}</td>`).join("")}</tr>`).join("");
      return `<table class="md-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    }
    if (b.type === "ol") {
      return `<ol class="num-list">${b.items.map((it) =>
        `<li><span class="num">${escHtml(it.num)}</span><span class="li-body">${renderInlineHtml(it.text)}</span></li>`).join("")}</ol>`;
    }
    return `<ul class="dot-list">${b.items.map((it) =>
      `<li><span class="dot"></span><span class="li-body">${renderInlineHtml(it)}</span></li>`).join("")}</ul>`;
  }).join("\n");
}

function splitTextSections(text: string): Array<{ heading: string | null; body: string }> {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: Array<{ heading: string | null; body: string }> = [];
  let cur: { heading: string | null; body: string } = { heading: null, body: "" };
  // Recognize H3 (### ), H2 (## ), and bare "Section N:" lines as new sections.
  const headingRe = /^(?:###\s+(.+)|##\s+(.+)|(Section\s+\d+:.*))$/;
  for (const line of lines) {
    const m = headingRe.exec(line);
    if (m) {
      const h = (m[1] ?? m[2] ?? m[3] ?? "").trim();
      if (cur.heading || cur.body.trim()) out.push(cur);
      cur = { heading: h, body: "" };
    } else { cur.body += (cur.body ? "\n" : "") + line; }
  }
  if (cur.heading || cur.body.trim()) out.push(cur);
  return out;
}

function splitHeading(h: string): { jurisdiction: string; statute?: string } {
  const m = /^(.+?)\s+[—–-]\s+(.+)$/.exec(h);
  if (m) return { jurisdiction: m[1].trim(), statute: m[2].trim() };
  return { jurisdiction: h };
}

interface TextReportOpts {
  title: string;
  metaLine?: string;
  text: string;
  showJurisdictionChip?: boolean;
  /** BATCH 16 (R8, A-Team RULING 3.9): cover eyebrow product noun.
   * Default unchanged fleet-wide; only products with an approved noun set
   * it (IR in Wave C5; the DPA when contract mode lands). */
  eyebrow?: string;
  callout?: { kind: "warn" | "muted"; title?: string; html: string };
  /**
   * PDF-1: pre-body HTML block rendered verbatim (unescaped) BEFORE section
   * parsing. Use this for renderer-owned metadata blocks (IR playbook
   * "Prepared for" card) so their raw HTML is not shoved through
   * parseTextBlocks and rendered as literal text.
   */
  htmlPrefix?: string;
  /**
   * Hardening 2026-08-04: appendix HTML rendered verbatim AFTER the body
   * sections and before the footer — used for the accountability attestation
   * and the shared table of authorities, which must sit at the end of the
   * report and immediately before the universal disclaimer.
   */
  appendixHtml?: string;
}

/**
 * Shared attestation renderer (PDF twin of src/components/report/AttestationBlock.tsx).
 * Prints the named approver, approval date, next review date and the product's
 * review triggers. Where the record carries no approver the block says so
 * rather than printing an empty signature line.
 */
function renderAttestationHtml(att: any): string {
  if (!att || typeof att !== "object") return "";
  const NR = "Not recorded";
  const rows: Array<[string, string]> = [
    ["Approved by", att.approved_by_name || NR],
    ["Role or title", att.approved_by_title || NR],
    ["Date of approval", att.approval_date || NR],
    ["Next review due", att.next_review_due || NR],
  ];
  const triggers: string[] = Array.isArray(att.review_triggers) ? att.review_triggers : [];
  return `<section class="attestation-block" style="margin-top:22px;padding-top:14px;border-top:1px solid #dde5ea;page-break-inside:avoid;">
    <h2 style="font-family:'Georgia','Times New Roman',serif;font-size:15px;color:#0c2a44;margin:0 0 8px;">${escHtml(att.heading || "Approval and review")}</h2>
    ${att.statement ? `<p style="font-size:11.5px;color:#3d4f5a;margin:0 0 10px;">${escHtml(att.statement)}</p>` : ""}
    <table style="width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:10px;">
      ${rows.map(([k, v]) => `<tr><td style="padding:3px 0;color:#5c6d7a;border-bottom:1px solid #edf2f5;">${escHtml(k)}</td><td style="padding:3px 0;text-align:right;font-weight:600;border-bottom:1px solid #edf2f5;">${escHtml(String(v))}</td></tr>`).join("")}
    </table>
    ${triggers.length ? `<p style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#5c6d7a;margin:0 0 4px;">Review triggers</p>
    <ul style="font-size:11.5px;color:#3d4f5a;padding-left:18px;margin:0;">${triggers.map((t) => `<li>${escHtml(t)}</li>`).join("")}</ul>` : ""}
    ${att.information_needed ? `<p style="font-size:10.5px;color:#5c6d7a;margin-top:8px;">Information needed: ${escHtml(att.information_needed)}</p>` : ""}
  </section>`;
}

/**
 * PDF-1: strip HTML tags from generator-emitted body text so raw markup does
 * not leak into the PDF as literal escaped characters. Preserves inner text
 * content and paragraph breaks; converts <br> to newlines and closing block
 * tags (</p>, </div>, </tr>, </table>, </li>, </h1..6>) to double newlines
 * so the downstream parser sees paragraph structure.
 */
function stripBodyHtml(text: string): string {
  if (!text) return "";
  if (!/<[a-zA-Z\/!]/.test(text)) return text; // fast path: no tags
  return text
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/\s*(p|div|tr|table|thead|tbody|li|ul|ol|h[1-6])\s*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildTextReportHTML(opts: TextReportOpts): string {
  const sections = splitTextSections(opts.text || "");
  const hasJurisdictions = sections.some((s) => s.heading);
  const showChip = opts.showJurisdictionChip ?? true;

  const sectionsHtml = sections.map((sec) => {
    const blocks = parseTextBlocks(sec.body);
    if (!sec.heading) return `<div class="preamble">${blocksToHtml(blocks)}</div>`;
    const { jurisdiction, statute } = splitHeading(sec.heading);
    return `<article class="jcard">
      <div class="rail"></div>
      <header class="jhead">
        ${hasJurisdictions && showChip ? `<span class="chip">Jurisdiction</span>` : ""}
        <h3>${escHtml(jurisdiction)}</h3>
        ${statute ? `<p class="statute">${escHtml(statute)}</p>` : ""}
      </header>
      <div class="jbody">${blocksToHtml(blocks)}</div>
    </article>`;
  }).join("\n");

  const calloutHtml = opts.callout
    ? `<div class="callout callout-${opts.callout.kind}">
        ${opts.callout.title ? `<div class="callout-title">${escHtml(opts.callout.title)}</div>` : ""}
        <div>${opts.callout.html}</div></div>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escHtml(opts.title)}</title>
<style>
  :root {
    --navy:#0c2a44; --navy-ink:#1a1916; --paper:#f5f8fa; --card:#ffffff;
    --border:#dde5ea; --steel:#8a9eb1; --silver:#edf2f5; --slate:#5c6d7a;
    --teal:#2d9b90; --teal-soft:#e5f4f2; --warn:#1a4a6e; --warn-soft:#eef4f7; --accent:#2d9b90;
  }
  * { box-sizing: border-box; }
  body { font-family:'Georgia','Times New Roman',serif; color:var(--navy-ink);
    background:var(--paper); font-size:11pt; line-height:1.5; margin:0;
    -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .shell { background:var(--card); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
  .header { background:var(--navy); color:#fff; padding:22px 26px 24px; }
  .header .logo-img { display:block; height:34px; width:auto; margin-bottom:12px; object-fit:contain; }
  .header .eyebrow { font-size:9px; font-weight:600; text-transform:uppercase;
    letter-spacing:0.14em; color:#93b5c6; margin:0 0 4px; }
  .header h1 { font-family:'Georgia','Times New Roman',serif; font-size:22px; margin:0;
    line-height:1.25; font-weight:700; }
  .header .meta { margin-top:6px; font-size:11px; color:#cbd5e1; }
  .body { padding:22px 26px 26px; }
${AUTHORITY_EXHIBIT_CSS}
  .disclaimer { border-left:4px solid var(--teal); background:var(--teal-soft);
    border-radius:0 6px 6px 0; padding:10px 14px; font-size:8.5pt; margin-bottom:16px; }
  .disclaimer .kw { font-weight:600; color:var(--navy); }
  .callout { border-left:4px solid var(--warn); background:var(--warn-soft);
    border-radius:0 6px 6px 0; padding:10px 14px; font-size:11.5px; margin-bottom:16px; }
  .callout-muted { border-left-color:var(--steel); background:#f5f6f7; color:var(--slate); font-style:italic; }
  .callout-title { font-weight:600; color:var(--warn); margin-bottom:4px; font-size:12px; }
  .callout-muted .callout-title { color:var(--slate); }
  .preamble { padding:0 2px 6px; }
  .jcard { position:relative; border:1px solid var(--border); border-radius:12px;
    overflow:hidden; margin-bottom:16px; background:#fff; page-break-inside:avoid; }
  .jcard .rail { position:absolute; left:0; top:0; bottom:0; width:4px; background:var(--steel); }
  .jhead { padding:14px 18px 10px 22px; border-bottom:1px solid var(--border);
    background:linear-gradient(135deg,var(--paper),#fff); }
  .chip { display:inline-block; font-size:9px; font-weight:600; text-transform:uppercase;
    letter-spacing:0.08em; color:var(--slate); background:var(--silver);
    padding:2px 8px; border-radius:999px; margin-bottom:6px; }
  .jhead h3 { margin:0; font-family:'Georgia','Times New Roman',serif; font-weight:700;
    color:var(--navy); font-size:16px; line-height:1.25; }
  .jhead .statute { margin:4px 0 0; font-family:'Courier New',monospace; font-size:10px;
    color:var(--slate); text-transform:uppercase; letter-spacing:0.04em; }
  .jbody { padding:14px 18px 16px 22px; }
  .subhead { margin-top:12px; }
  .subhead h4 { font-size:11.5px; font-weight:600; text-transform:uppercase;
    color:var(--navy); letter-spacing:0.02em; margin:0; }
  .subhead .rule { margin-top:4px; height:2px; width:36px; background:var(--steel); border-radius:2px; }
  .subhead .sub-trailing { margin-top:6px; }
  /* A-TEAM S3 RULING I.6 (doc 115) — 12px (~9pt) body text read as dense and
     inexpensive; ordinary body prose now sits at 10pt with the same leading.
     Table cells stay 9.5pt (above the 9pt floor); truly ancillary material
     only may sit below 8.5pt. */
  p.body-p, .sub-trailing, .li-body { font-size:10pt; line-height:1.55; color:var(--navy-ink); margin:0 0 8px; }
  ul.body-list { font-size:10pt; line-height:1.55; color:var(--navy-ink); margin:0 0 8px; }
  ul.body-list li { margin-bottom:4px; }
  ol.num-list, ul.dot-list { list-style:none; padding:0; margin:8px 0 4px; }
  ol.num-list li, ul.dot-list li { display:flex; gap:10px; align-items:flex-start;
    margin-bottom:7px; page-break-inside:avoid; }
  ol.num-list .num { flex:0 0 auto; width:18px; height:18px; border-radius:999px;
    background:var(--navy); color:#fff; font-size:10px; font-weight:600;
    display:inline-flex; align-items:center; justify-content:center; margin-top:1px; }
  ul.dot-list .dot { flex:0 0 auto; width:6px; height:6px; border-radius:999px;
    background:var(--teal); margin-top:8px; }
  .footer { margin-top:22px; padding-top:12px; border-top:1px solid var(--border);
    font-size:8.5pt; color:var(--slate); text-align:center; }
  table.md-table { border-collapse:collapse; width:100%; font-size:10.5pt; margin:12px 0; }
  table.md-table th, table.md-table td { border:1px solid var(--border); padding:6px 10px; text-align:left; vertical-align:top; }
  table.md-table th { background:var(--silver); font-weight:600; color:var(--navy); }
  /* 2026-08-25 polish round — a table that continues onto the next page
     repeats its header row there (table-header-group is the paged-media
     mechanism); rows never split mid-row. A-TEAM S3 (doc 115 I.4): the
     mechanism only engages under print-media emulation — see use_print in
     generatePDF. */
  thead { display:table-header-group; break-inside:avoid; }
  tr { page-break-inside:avoid; break-inside:avoid; }
  /* A-TEAM S3 RULING I.5 (doc 115) — callouts, condition boxes and the
     final notice never split across a page break (a taller-than-page block
     is exempt per the fragmentation spec, which is the right failure mode). */
  .callout, .condition-callout, .followup-callout, .recommendation-callout,
  .disclaimer, .eup-report-disclaimer {
    break-inside:avoid; page-break-inside:avoid; }
  /* 2026-08-25 polish round — Conditions to Proceed render inside a bordered
     amber callout so the condition can't be missed against a favorable
     disposition. Applied by skeletonSectionsHtml when a chunk opens with a
     Condition(s)-to-Proceed lead. */
  .condition-callout { border:1.5px solid #b9822d; background:#fdf6e7;
    border-radius:5px; padding:9px 13px; margin:0 0 10px; }
  .condition-callout p.body-p:last-child { margin-bottom:0; }
  /* CEO report review 2026-09-04 (§ 4.D palette) — Follow-Ups and
     Recommendations get their own boxes, colors chosen to read distinctly
     from the amber "can't miss this" condition box and from each other:
     Follow-Ups (light blue) is informational/tracked, not urgent;
     Recommendations (light green) reuses the report's own "ok"/positive
     badge tint (RISK_BADGE_PALETTE.ok) so it matches rather than
     introduces a new hue. Keep in sync with SkeletonDocumentView.tsx. */
  .followup-callout { border:1.5px solid #6f9bc4; background:#eef4f7;
    border-radius:5px; padding:9px 13px; margin:0 0 10px; }
  .followup-callout p.body-p:last-child { margin-bottom:0; }
  .recommendation-callout { border:1.5px solid #a4bfae; background:#f2f7f4;
    border-radius:5px; padding:9px 13px; margin:0 0 10px; }
  .recommendation-callout p.body-p:last-child { margin-bottom:0; }
  /* 2026-08-25 batch be0f9e02 — the wide-landscape named page was removed:
     PDFShift/Chromium honored the page SIZE but kept a single content
     layout width, clipping text on the rotated pages, and the 5-column
     heuristic flipped most of the DPIA plus the Risk signature page. See
     skeletonSectionsHtml's note and doc 66 Rule 10. */
</style></head>
<body><div class="shell">
  <header class="header">
    <img class="logo-img" src="${LOGO_URL}" alt="End User Privacy" />
    <p class="eyebrow">${escHtml(opts.eyebrow || "Customized Compliance Assessment")}</p>
    <h1>${escHtml(opts.title)}</h1>
    ${opts.metaLine ? `<div class="meta">${escHtml(opts.metaLine)}</div>` : ""}
  </header>
  <div class="body">
    ${calloutHtml}
    ${opts.htmlPrefix ?? ""}
    ${sectionsHtml}
    ${opts.appendixHtml ?? ""}
    <div class="footer">EndUserPrivacy.com · Generated ${new Date().toLocaleDateString("en-US",{ year:"numeric", month:"long", day:"numeric" })}</div>
  </div>
</div></body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────
// SO WIRE-IN — SKELETON DOCUMENT RENDERER.
//
// When a report carries `report_data.skeleton_document` (assembled by the
// product's edge function through the CEO-ratified byte-pinned skeleton), the
// PDF renders FROM that document rather than from the legacy narrative path.
// The renderer is dumb on purpose: headings and paragraphs exactly as
// assembled, no re-wording, no re-ordering, no added prose.
// ─────────────────────────────────────────────────────────────────────────
interface SkeletonDocLike {
  title?: string;
  subtitle?: string;
  spine_version?: string;
  sections?: Array<{
    id?: string;
    title?: string;
    paragraphs?: Array<{ kind?: string; text?: string; table?: SkeletonTableLike }>;
  }>;
}

/** PROMPT 8 — typed surfaces rendered as tables by the spine's `table` blocks. */
interface SkeletonTableLike {
  title?: string;
  columns?: string[];
  rows?: string[][];
  note?: string;
  /** CEO report review 2026-08-24 — see RenderedTable.hideHeader. */
  hideHeader?: boolean;
  /** DOC 127 §28 (Phase B, 2026-09-01) — the assembler's typed surface id,
   * persisted in skeleton_document; keys the Risk-scoped table styling
   * (never string-matched on visible cell text). */
  surface?: string;
}

/**
 * A table is rendered exactly as assembled: no cell is re-worded, re-ordered or
 * padded. A table with no rows never reaches here (no-padding law), but the
 * guard is kept so a malformed payload prints nothing rather than an empty grid.
 */
// doc 72 (Fleet Report Design System, 2026-08-25) — horizontal-rules-only
// table anatomy, applied here ONCE for every skeleton table in every
// product (cover panels, appendix matrices, the future risk ledger — this
// is the single fleet-wide table renderer). No vertical rules, no header
// fill, no zebra striping — the single biggest "generated PDF" tell. The
// table itself carries the heavy open/close rule; the header row a medium
// rule; body rows a light separator. border-collapse absorbs the
// coincident rule at the table's own top/bottom edge, so the last row
// needs no special-casing. Header text sets Arial — doc 72's "apparatus"
// voice (caps, tracked, sans) — the only place this renderer uses a
// second face; body cells stay Georgia (the base stylesheet's default).
function skeletonTableHtml(t: SkeletonTableLike): string {
  const cols = Array.isArray(t.columns) ? t.columns : [];
  const rows = Array.isArray(t.rows) ? t.rows.filter((r) => Array.isArray(r)) : [];
  if (rows.length === 0 || cols.length === 0) return "";
  const head = cols
    .map((c) => `<th style="border:none;border-bottom:0.75pt solid #000;background:#f3f6f8;padding:5pt 8pt 4pt 6pt;text-align:left;font-weight:bold;font-family:Arial,Helvetica,sans-serif;font-size:8pt;text-transform:uppercase;letter-spacing:0.06em;color:#1a1a1a;">${escHtml(c)}</th>`)
    .join("");
  const body = rows
    .map((r) =>
      `<tr>${cols
        .map((_c, i) => {
          const v = String(r[i] ?? "");
          // BATCH 16 (R7): signature fill-ins draw a bottom-border rule,
          // never literal underscore runs (doc 109 §1.6).
          const cell = /^_{6,}$/.test(v.trim())
            ? `<span style="display:inline-block;min-width:220px;border-bottom:0.75pt solid #0c2a44;">&nbsp;</span>`
            : escHtml(v);
          return `<td style="border:none;border-bottom:0.5pt solid #666;padding:6pt 8pt 6pt 0;vertical-align:top;font-size:9.5pt;">${cell}</td>`;
        })
        .join("")}</tr>`
    )
    .join("");
  // CEO report review 2026-08-24 — a label/value table's header row states
  // nothing the row's own first cell doesn't already say; omit it entirely.
  const headHtml = t.hideHeader ? "" : `<thead><tr>${head}</tr></thead>`;
  return `<div style="margin:0 0 10px;">
    ${t.title ? `<div style="font-weight:bold;font-size:10pt;margin:0 0 4px;break-after:avoid;page-break-after:avoid;">${escHtml(t.title)}</div>` : ""}
    <table style="width:100%;border-collapse:collapse;border-top:1.25pt solid #000;border-bottom:1.25pt solid #000;font-size:9.5pt;line-height:1.35;">
      ${headHtml}
      <tbody>${body}</tbody>
    </table>
    ${t.note ? `<div style="font-size:8pt;color:#4a5b6a;margin:3px 0 0;break-before:avoid;page-break-before:avoid;">${escHtml(t.note)}</div>` : ""}
  </div>`;
}

function readSkeletonDocument(reportData: any): SkeletonDocLike | null {
  const d = reportData?.skeleton_document;
  if (!d || typeof d !== "object") return null;
  if (!Array.isArray(d.sections) || d.sections.length === 0) return null;
  return d as SkeletonDocLike;
}

/**
 * Skeleton sections → HTML.
 *
 * Pagination policy (2026-08-10):
 *  - Sections FLOW. `page-break-inside:avoid` was inherited from the legacy
 *    short card blocks and, on multi-page prose sections, forced one page per
 *    section. Removed.
 *  - Headings stay glued to their first paragraph (break-after:avoid) so no
 *    heading is orphaned at the foot of a page. The base stylesheet has no
 *    rule reaching this markup, so it is applied inline here.
 *  - "table_of_authorities" always starts a fresh page (all nine SO spines
 *    use that id).
 *  - ir-playbook's "incident_worksheet" (Part Two) starts a fresh page.
 *    Product-specific: no other spine has an explicit part structure.
 */
// ITEM SO-12 — FOOTNOTE MARKER SUBSTITUTION (piloted on cppa-admt-v2 only).
//
// `_shared/report-exhibits/footnote-engine.ts` marks a footnote reference by
// wrapping its number in U+0001 (SOH), a control character `escHtml` leaves
// untouched. That means the sentinel survives escaping intact and can be
// found and replaced with real markup AFTER escaping — never before, so a
// citation string containing a stray "<" or "&" is still escaped correctly.
// Product-gated and purely additive: no other product's skeleton_document
// ever carries this sentinel, so this is a no-op everywhere else.
const FOOTNOTE_MARK = String.fromCharCode(1);
const FOOTNOTE_MARKER_HTML_RE = new RegExp(`${FOOTNOTE_MARK}(\\d+)${FOOTNOTE_MARK}`, "g");
function substituteFootnoteMarkers(escapedHtml: string): string {
  return escapedHtml.replace(
    FOOTNOTE_MARKER_HTML_RE,
    (_m, n) => `<sup><a href="#toa-fn-${n}" style="text-decoration:none;color:#0c2a44;">${n}</a></sup>`,
  );
}

// CEO report review 2026-08-24 — underline every inline cross-reference to
// an appendix ("Appendix H", "Appendix H — Materials Considered") so a
// reader can spot the citation at a glance. Matches "Appendix" + one
// capital letter, optionally followed by " — Title" up to the next
// clause boundary. Applied to already-escaped text (safe: none of the
// matched characters need escaping), same as the footnote-marker pass.
const APPENDIX_REF_RE = /Appendix [A-Z](?:\s*[—–-]\s*[A-Z][^.;]*)?/g;
function underlineAppendixRefs(escapedHtml: string): string {
  return escapedHtml.replace(APPENDIX_REF_RE, (m) => `<u>${m}</u>`);
}

// A-TEAM S3 RULING I.27 (doc 115, 2026-08-31) — a bare URL in skeleton prose
// (e.g. the § 7124 submission portal "https://cppa.ca.gov/") becomes a live
// hyperlink in the PDF. Display text is deliberately UNCHANGED: rewording it
// would alter byte-pinned skeleton prose, which needs its own re-pin batch.
// Applied to already-escaped text; a URL's characters need no escaping, and a
// trailing sentence stop is excluded from the link target.
const BARE_URL_RE = /https?:\/\/[^\s<>&"')]+/g;
function linkifyBareUrls(escapedHtml: string): string {
  return escapedHtml.replace(BARE_URL_RE, (m) => {
    const trimmed = m.replace(/[.,;:]+$/, "");
    const tail = m.slice(trimmed.length);
    return `<a href="${trimmed}" style="color:#0c2a44;">${trimmed}</a>${tail}`;
  });
}

// CEO report review 2026-08-24 — several composers already mark a list
// item as its own SENTENCE beginning with "— " (e.g. "Analysis. —
// Experian (...): under a written contract... — Sentinel Risk LLC
// (...): ..."). This walks the chunk sentence by sentence (reusing
// clause-bound.ts's abbreviation-aware boundary so "GDPR Art." etc. never
// mis-splits) and groups consecutive "— "-led sentences into list runs
// and everything else into paragraph runs, in original order — so a
// trailing "Conclusion. ..." sentence after the items renders as its own
// paragraph instead of being swallowed into the last bullet, and two
// separate lists in one block (a real shape in Section VIII's residual
// analysis) each render as their own <ul> rather than merging into one.
// A run with only one "— " item is folded back into plain prose (the
// marker stripped) — a single bullet isn't worth a list. Ordinary
// mid-sentence em-dash usage ("Appendix C — Processing and Data
// Inventory") never opens a sentence with "—", so it is never mistaken
// for a list item.
interface TextSegment {
  readonly kind: "list" | "para";
  readonly parts: readonly string[];
}
interface SentenceSpan {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}
/**
 * Sentence boundaries with their offsets in the ORIGINAL string. Offsets
 * (not just the trimmed sentence text) matter here: item 5's fix
 * deliberately joins pathway/safeguard items with a bare "\n" so each
 * starts its own line, and a plain-prose run spanning that "\n" must keep
 * it — re-joining trimmed sentences with a fixed " " would flatten it
 * back into a run-on line, undoing that fix.
 *
 * A lead ending ":" immediately before a "— " item ("...testing: —
 * Encryption...") is ALSO a boundary here, distinct from
 * `firstSentence()`'s own [.!?]-only rule: several composers (tested/
 * untested/planned safeguards) end their lead with a colon, not a
 * period, so without this the lead and its first item would glue into
 * one sentence that doesn't itself start with "—" and the whole run
 * would be missed as a list.
 */
function sentenceSpans(text: string): SentenceSpan[] {
  const out: SentenceSpan[] = [];
  let cursor = 0;
  let rest = text;
  for (;;) {
    const leadingWs = /^\s*/.exec(rest)![0];
    cursor += leadingWs.length;
    rest = rest.slice(leadingWs.length);
    if (!rest) break;
    const one = boundFirstSentence(rest);
    let len = one ? one.length : rest.length;
    const colonBoundary = /:\s+—\s/.exec(rest);
    if (colonBoundary && colonBoundary.index + 1 < len) len = colonBoundary.index + 1;
    out.push({ text: rest.slice(0, len).trim(), start: cursor, end: cursor + len });
    cursor += len;
    rest = rest.slice(len);
    if (!one) break;
  }
  return out;
}
function segmentDashText(text: string): TextSegment[] | null {
  const sentences = sentenceSpans(text);
  const segments: TextSegment[] = [];
  let hasRealList = false;
  let runStart = 0;
  let runKind: "list" | "para" | null = null;
  const flush = (endIdx: number) => {
    if (runKind === null || endIdx <= runStart) return;
    if (runKind === "list") {
      // A "(addresses: ...)." sentence is a parenthetical continuation of
      // the item just before it (several composers emit "— {item}." then
      // a SEPARATE "(addresses: ...)." sentence for the same bullet,
      // since firstSentence() treats the item's own trailing "." as a
      // real sentence end) — merge it into the previous item's text
      // rather than letting it become a stray non-list entry.
      const items: string[] = [];
      for (const s of sentences.slice(runStart, endIdx)) {
        if (/^\(/.test(s.text) && items.length > 0) items[items.length - 1] += ` ${s.text}`;
        else items.push(s.text.replace(/^—\s*/, "").trim());
      }
      segments.push({ kind: "list", parts: items });
      if (items.length >= 2) hasRealList = true;
    } else {
      // Preserve the ORIGINAL substring (including any "\n") rather than
      // rejoining trimmed sentences with a fixed separator.
      segments.push({ kind: "para", parts: [text.slice(sentences[runStart].start, sentences[endIdx - 1].end).trim()] });
    }
  };
  sentences.forEach((sentence, i) => {
    // A parenthetical-continuation sentence inherits the run it continues
    // (list stays list) rather than defaulting to "para" and splitting
    // the run — see the merge note in flush() above.
    const kind: "list" | "para" = /^—\s/.test(sentence.text)
      ? "list"
      : (/^\(/.test(sentence.text) && runKind) ? runKind : "para";
    if (runKind !== null && kind !== runKind) { flush(i); runStart = i; }
    runKind = kind;
  });
  flush(sentences.length);
  return hasRealList ? segments : null;
}

/**
 * ITEM SO-12 — a Table of Authorities line the admt-v2 assembler numbered
 * ("3. 11 CCR § 7220(c)(1) …") gets an anchor id matching the body markers
 * above target. Only the numbering PREFIX is consumed here; the rest of the
 * line renders exactly as `toaLines` already produced it for every other
 * product. Lines with no leading "N. " (every other product; ADMT lines the
 * assembler chose not to number) pass through unchanged.
 */
function toaAnchorId(line: string): { id: string | null; rest: string } {
  const m = /^(\d+)\.\s+(.*)$/.exec(line);
  if (!m) return { id: null, rest: line };
  return { id: `toa-fn-${m[1]}`, rest: `${m[1]}. ${m[2]}` };
}

// CEO report review 2026-08-24 — the blank/near-blank signature pages added
// to CPPA Risk, ADMT, and Cyber. Listed by id (not title-pattern, since none
// of these are titled "Appendix ..." — see the forceBreak note below) so the
// page-break and "is a fillable page, not narrative" treatment is centralized.
// BATCH 16 (A-Team doc-111 renderer wave, R7): "review_approval" is the
// Biometric §IV dedicated signature section. The LIA §V / DPIA §0+§6 /
// Registration approval blocks live INSIDE mixed-content sections today and
// join this set only when Waves C4/C5 split them into dedicated sections —
// forcing a whole mixed section onto its own page would be wrong.
const SIGNATURE_PAGE_IDS = new Set([
  "review_and_approval",
  "agency_submission_checklist",
  "review_of_assessment",
  "signature",
  "review_approval",
]);

// ─────────────────────────────────────────────────────────────────────────
// LEAD-PHRASE STYLING (doc 66 Rule 2; run-in treatment re-ruled by the CEO
// 2026-08-26).
//
// One regex, applied to the ESCAPED text of every plain paragraph run, with
// TWO label families (both closed whitelists — never a heuristic):
//
//  HEAD family — bold + underlined, inline where they stand:
//   - lettered leads ("E. Residual Risk.") — at chunk start, after a
//     sentence end, or after a newline;
//   - statutory harm labels ("(B) Unlawful discrimination …") opening the
//     v5.2 risk-ledger paragraphs;
//   - method-step leads ("Step 1 — Triggers.");
//   - the named phrase-leads (exec-summary and section heads).
//
//  RUN-IN family — CEO ruling 2026-08-26 (supersedes the 2026-08-25
//  batch-be0f9e02 inline treatment): the analytic run-in labels
//  ("Conclusion.", "Out of scope.", "Analysis.", …) render UNDERLINED, NOT
//  BOLD, and START A NEW LINE. The paragraph's `white-space:pre-line`
//  renders the inserted "\n"; a label already at a chunk start or after a
//  newline stays where it is.
//
// The lettered alternation is bounded ([^.\n]{0,80} and a required capital
// after the letter) so a mid-sentence "… v. Smith." can never be mistaken
// for a lead. Keep the web twin (SkeletonDocumentView.tsx) in sync.
// ─────────────────────────────────────────────────────────────────────────
// BATCH 16 (A-Team RULING 3.1 / doc 66 Rule 2 rewrite, 2026-08-30):
// HEAD_LEAD_LABELS is FROZEN — no new entries, ever. Structural leads are
// emitted by composers as their own chunks and render as h3 (see the h3
// branch in skeletonSectionsHtml). "Priority Matters:" and "Scope of
// Assessment:" moved HEAD → RUN-IN per RULING 3.1 item 4 (short inline
// labels that introduce a sentence). Keep the web twin
// (SkeletonDocumentView.tsx) byte-equivalent in LABELS and regex.
const HEAD_LEAD_LABELS = [
  "Activity Assessed\\.", "Why a Risk Assessment Is Required\\.", "Key Findings\\.",
  "Overall Determination\\.", "Conditions to Proceed\\.", "Condition to Proceed\\.",
  "Assessment Follow-Up Required\\.", "Recommendation\\.", "Recommendations\\.",
  "Required Follow-Up\\.", "Follow-Ups\\.", "Record Considered\\.",
  "Risk Assessments\\.", "Outstanding Matters\\.", "Review and Maintenance\\.",
  "Withholding and Security:",
];
// RUN-IN additions ratified by doc 66 Rule 2 item 6 (A-Team RULING 3.1).
// "Rulemaking context — persuasive only." doubles as the guidance-panel
// trigger (R5); "Deadline." doubles as the amber-callout trigger (R6).
const RUNIN_LEAD_LABELS = [
  "Analysis\\.", "Conclusion\\.", "Reasoning\\.", "Consequence\\.",
  "Caution\\.", "Out of scope\\.", "Effectiveness analysis\\.",
  "Entry\\.", "Stages\\.", "Output\\.",
  "Rulemaking context — persuasive only\\.", "Analytical note\\.",
  "Statutory text\\.", "Record\\.", "Status\\.", "Controls described\\.",
  "Evidence identified\\.", "Auditor testability\\.", "Reliance notice\\.",
  "Deadline\\.", "Priority Matters:", "Scope of Assessment:",
  // BATCH 18b (doc 113 S2.5) — doubles as the readiness-banner trigger.
  "Readiness\\.",
  // BATCH 19b (doc 113 S4.3) — doubles as the determination-banner trigger.
  "Determination\\.",
  // DOC 144 (2026-09-02) — the CPPA-Risk statutory run-in. In risk mode a
  // chunk OPENING with this label takes the framed law-cite treatment (see
  // the risk-law-cite branch in skeletonSectionsHtml); a mid-chunk
  // occurrence falls back to this ordinary run-in styling.
  "Governing requirement\\.",
];
const LEAD_PHRASE_RE = new RegExp(
  `(^|[.!?]\\s+|\\n\\s*)((?:[A-Z]\\.\\s+[A-Z][^.\\n]{0,80}?\\.)|(?:\\([A-H]\\)\\s+[A-Z][^.\\n]{0,140}?\\.)|(?:Step \\d+ — [A-Z][^.\\n]{0,40}?\\.)|${HEAD_LEAD_LABELS.join("|")})(?=\\s|$)` +
    `|(^|[.!?]\\s+|\\n\\s*)(${RUNIN_LEAD_LABELS.join("|")})(?=\\s|$)`,
  "g",
);
function styleLeadPhrases(escapedText: string, riskMode = false): string {
  return escapedText.replace(
    LEAD_PHRASE_RE,
    // doc 72 §4 — a dropped, thin underline (offset from the baseline so it
    // clears descenders) reads as engraved emphasis rather than a stray
    // hyperlink; the default browser underline strikes descenders.
    (_m, preHead: string | undefined, headLabel: string | undefined, preRunin: string | undefined, runinLabel: string | undefined) => {
      if (headLabel !== undefined) {
        // DOC 127 §5/§6 (Phase B) — Risk only: the marker/heading split (the
        // underline never runs beneath "A."/"(B)"/"Step N —"). Every other
        // product keeps the doc 66 Rule 2 whole-label treatment.
        if (riskMode) return `${preHead}${riskSplitLeadHtml(headLabel)}`;
        return `${preHead}<strong style="text-decoration:underline;text-underline-offset:2.5px;text-decoration-thickness:0.5pt;">${headLabel}</strong>`;
      }
      // Run-in: underlined (not bold), on a new line. Keep the sentence
      // punctuation of the preceding text, replace the separating spaces
      // with a line break; a label already at a line start stays put.
      const pre = preRunin ?? "";
      const brk = pre === "" || /\n\s*$/.test(pre) ? pre : `${pre.replace(/[^\S\n]+$/, "")}\n`;
      return `${brk}<u style="text-underline-offset:2.5px;text-decoration-thickness:0.5pt;">${runinLabel}</u>`;
    },
  );
}

// BATCH 16 (doc-111 renderer wave R2): a chunk that consists SOLELY of a
// structural lead renders as an h3 sub-heading (doc 66 Rule 2 rewrite).
// Composers opt in by emitting the label on its own blank-line-separated
// chunk; shapes are line-start anchored and length-bounded so a short
// numbered/lettered SENTENCE inside running prose never matches (it would
// not be its own chunk). Keep in sync with the web twin.
const H3_CHUNK_RE = new RegExp(
  `^(?:` +
    `(?:[A-Z]\\.\\s+[A-Z][^.\\n]{0,80}?\\.)` +
    `|(?:\\d{1,2}\\.\\s+[A-Z][^.\\n]{0,80}?)` +
    `|(?:§\\s?[\\d.()a-zA-Z/ ]{1,24}\\s+—\\s+[A-Z][^.\\n]{0,80}?\\.?)` +
    `|(?:Step \\d+ — [A-Z][^.\\n]{0,40}?\\.)` +
    // BATCH 18 (Wave C1): the biometric duty walk emits RCW pinpoint
    // headings ("RCW 19.375.020(1) — Enrolment notice"); keep synced.
    `|(?:RCW [\\d.()]{1,24}\\s+—\\s+[A-Z][^.\\n]{0,80}\\.?)` +
    // BATCH 18b (doc 113 S2.15): instrument-anchored per-state/per-instrument
    // heading — "California — Cal. Civ. Code § 1798.99.82", "European Union
    // representative — GDPR Art. 27(1)". Anchored on both sides; keep synced.
    `|(?:[A-Z][A-Za-z .()&'\\-]{1,48} — (?:Cal\\.|ORS |Tex\\.|\\d+ V\\.S\\.A\\.|GDPR |UK GDPR |Regulation \\(EU\\) )[^\\n]{0,60})` +
    `|(?:${HEAD_LEAD_LABELS.join("|")})` +
    // DOC 127 §13 (2026-08-31) — the CPPA Risk adverse-disposition § 4.D
    // head, emitted as its own chunk per RULING 3.1's h3 mechanism
    // (HEAD_LEAD_LABELS itself stays frozen). Keep synced with the web twin.
    `|(?:Conditions for Reassessment\\.)` +
  `)$`,
);
// R4: a statutory/verbatim quote chunk — either the composer emitted a
// quoted_authority paragraph kind (ADMT S4 excerpts), or the chunk is one
// enquoted span of ≥ 25 words.
const QUOTE_CHUNK_RE = /^[“"][\s\S]{40,}[”"]\.?$/;
const STATUTE_QUOTE_STYLE =
  "font-size:10.5px;border-left:3px solid #8a9eb1;padding:6px 12px;margin:6px 0 10px;white-space:pre-line;color:#1a1a1a;";
// R5: the rulemaking-context guidance voice (doc 109 §1.5) — tinted panel,
// reduced size, roman.
const GUIDANCE_PANEL_STYLE =
  "background:#edf2f5;border-left:4px solid #8a9eb1;padding:10px 14px;margin:0 0 10px;font-size:10.5px;";
// R6: the muted callout for not-yet-assessable states.
const MUTED_PANEL_STYLE =
  "border-left:3px solid #8a9eb1;background:#f5f6f7;color:#4a5b6a;font-style:italic;padding:8px 12px;margin:0 0 10px;font-size:10.5px;";

// ─────────────────────────────────────────────────────────────────────────
// DOC 127 PHASE B (2026-09-01) — the CPPA-Risk presentation system.
//
// Everything in this block is RISK-GATED: invoked only when the render
// product is "cppa-risk". Doc 66 Rule 2 remains fleet law for every other
// product; doc 128 is the running portability ledger recording which of
// these mechanisms generalize fleet-wide (surface-keyed table styling, the
// marker/heading split, status badges, the result card, the determination
// card, first-line indentation, the methodology strip).
//
// Styling is surface-keyed (§28): tables are recognized by the assembler's
// persisted `RenderedTable.surface` id — never by matching visible cell
// text. All styling stays inline (the fleet renderer's convention; inline
// wins over any injected stylesheet, so there is no specificity ambiguity).
// ─────────────────────────────────────────────────────────────────────────

const RISK_UNDERLINE = "text-decoration:underline;text-underline-offset:2.5px;text-decoration-thickness:0.5pt;";

/** Restrained status badge — §4.2/§21: light tint, dark text, 1px border;
 * grayscale-safe (weight and border carry the signal, never color alone).
 * DOC 144 (2026-09-02): an explicit `tone` override lets surface-keyed cell
 * renderers map determination words the value-regexes don't know (the § 3.B
 * necessity words, the ledger's likelihood/severity scale words) onto the
 * SAME tint families — no new palette is introduced.
 * DOC 147 (2026-09-02) — CEO T8 ruling: "Additional Information Required"
 * reads slate GLOBALLY (removed from the warn regex; falls to neutral),
 * closing doc 144 §D.1. */
type RiskBadgeTone = "ok" | "warn" | "hi" | "neutral";
const RISK_BADGE_PALETTE: Record<RiskBadgeTone, string> = {
  hi: "color:#6e2323;background:#faf3f3;border-color:#c4a0a0;",
  warn: "color:#6e5518;background:#fbf6ea;border-color:#cdb887;",
  ok: "color:#28503a;background:#f2f7f4;border-color:#a4bfae;",
  neutral: "color:#1a1a1a;background:#f3f6f8;border-color:#aab8c5;",
};
function riskBadgeHtml(value: string, opts?: { large?: boolean; tone?: RiskBadgeTone }): string {
  const v = value.trim();
  const tone: RiskBadgeTone = opts?.tone ?? (
    /^(Critical|High|Do Not Proceed)$/i.test(v)
      ? "hi"
      : /^(Moderate|Unresolved)$/i.test(v)
      ? "warn"
      : /^(Low|Yes|Proceed|Proceed with Conditions|Engaged|No Processing Decision Required)$/i.test(v)
      ? "ok"
      : "neutral"
  );
  const size = opts?.large
    ? "font-size:10pt;padding:2pt 9pt;"
    : "font-size:8pt;padding:0.5pt 5pt;";
  return `<span style="display:inline-block;border:1px solid;border-radius:3px;font-family:Arial,Helvetica,sans-serif;font-weight:700;letter-spacing:0.04em;${size}${RISK_BADGE_PALETTE[tone]}">${escHtml(v)}</span>`;
}

/** A ledger level cell ("High (unchanged)") → level badge + muted movement
 * word; any other value passes through escaped. */
function riskLevelCellHtml(value: string): string {
  const m = /^(Low|Moderate|High|Critical|Not assessed)\s*(\(reduced\)|\(unchanged\))?$/.exec(value.trim());
  if (!m) return escHtml(value);
  const tail = m[2] ? ` <span style="color:#6b7a87;font-size:8pt;">${escHtml(m[2])}</span>` : "";
  return riskBadgeHtml(m[1]) + tail;
}

/** DOC 144 — the § 4.A ledger's Likelihood/Severity cells: the Company's own
 * enum scale words badge onto the existing tint families (words the engine
 * emits: RiskLikelihood / RiskSeverity); "Not recorded" and any free text
 * pass through escaped. */
function riskScaleCellHtml(value: string): string {
  const v = value.trim();
  const tone: RiskBadgeTone | null = /^(Unlikely|Minimal)$/.test(v)
    ? "ok"
    : /^(Possible|Likely|Moderate)$/.test(v)
    ? "warn"
    : /^(Highly likely|Significant|Severe)$/.test(v)
    ? "hi"
    : null;
  return tone ? riskBadgeHtml(v, { tone }) : escHtml(value);
}

/** DOC 144 — the § 3.B necessity matrix's Determination cell: the three
 * exact determination words the engine emits (extractNecessity's a2 enum),
 * mapped onto the existing tint families. Any other value passes through
 * escaped (never guessed at). */
function riskNecessityCellHtml(value: string): string {
  const v = value.trim();
  if (v === "Necessary to the stated purpose") return riskBadgeHtml(v, { tone: "ok" });
  if (v === "Collected but not necessary to the stated purpose") return riskBadgeHtml(v, { tone: "hi" });
  if (v === "Unsure") return riskBadgeHtml(v, { tone: "warn" });
  return escHtml(value);
}

/** Bold the leading harm letter "(A) …" in a risk-name cell. */
function riskHarmCellHtml(value: string): string {
  const m = /^(\([A-H]\))\s+([\s\S]*)$/.exec(value.trim());
  return m ? `<strong>${escHtml(m[1])}</strong> ${escHtml(m[2])}` : escHtml(value);
}

/** Bold the leading status word of a merged determination cell
 * ("Engaged — basis" / "Unresolved — basis"). */
function riskStatusLeadCellHtml(value: string): string {
  const m = /^(Engaged|Unresolved)( — )([\s\S]*)$/.exec(value.trim());
  return m ? `<strong>${escHtml(m[1])}</strong>${escHtml(m[2])}${escHtml(m[3])}` : escHtml(value);
}

/** §4.1 — the Assessment Profile executive fact panel (surface cover_summary). */
function riskProfilePanelHtml(t: SkeletonTableLike): string {
  const rows = (t.rows ?? []).filter((r) => Array.isArray(r));
  if (!rows.length) return "";
  const body = rows.map((r, i) => {
    const sep = i < rows.length - 1 ? "border-bottom:0.5pt solid #e3e9ee;" : "";
    return `<tr>
      <td style="border:none;${sep}width:30%;padding:5pt 10pt 5pt 0;font-family:Arial,Helvetica,sans-serif;font-size:8.5pt;font-weight:600;letter-spacing:0.02em;color:#3f556b;vertical-align:top;">${escHtml(String(r[0] ?? ""))}</td>
      <td style="border:none;${sep}padding:5pt 0;font-size:10.5pt;font-weight:600;color:#12212f;vertical-align:top;">${escHtml(String(r[1] ?? ""))}</td>
    </tr>`;
  }).join("");
  return `<div class="risk-profile-panel" style="background:#f7f9fb;border-left:2.5pt solid #17324d;border-radius:3px;padding:7pt 12pt;margin:0 0 12px;break-inside:avoid;page-break-inside:avoid;">
    <table style="width:100%;border-collapse:collapse;border:none;">${body}</table>
  </div>`;
}

/** §4.2 — the Assessment Result executive card (surface exec_status_panel):
 * required/tier rows, a rule, then the disposition as the dominant object
 * with the Path-forward line beneath (doc 127 Part I). Falls back to the
 * generic table when the expected rows are absent (legacy payloads). */
function riskResultCardHtml(t: SkeletonTableLike): string {
  const get = (label: string): string => {
    const row = (t.rows ?? []).find((r) => String(r?.[0] ?? "") === label);
    return row ? String(row[1] ?? "") : "";
  };
  const disp = get("Assessment disposition");
  if (!disp) return "";
  const req = get("Assessment required");
  const inherent = get("Inherent privacy risk");
  const residual = get("Residual privacy risk");
  const path = get("Path forward");
  // DOC 144 (2026-09-02) — the Wave-1 dashboard rows (tallies, "What this
  // means") projected onto this surface render too: rows this card does not
  // consume by name render as compact label/value lines, so nothing the
  // assembler persisted is silently dropped from the cover.
  const CONSUMED = new Set([
    "Assessment required",
    "Inherent privacy risk",
    "Residual privacy risk",
    "Assessment disposition",
    "Path forward",
    "What this means",
  ]);
  const whatThisMeans = get("What this means");
  const extraRows = (t.rows ?? [])
    .filter((r) => Array.isArray(r) && !CONSUMED.has(String(r[0] ?? "")))
    .map((r) =>
      `<tr>
      <td style="border:none;padding:2.5pt 0;font-size:9pt;color:#3f556b;">${escHtml(String(r[0] ?? ""))}</td>
      <td style="border:none;padding:2.5pt 0;text-align:right;font-size:9pt;color:#12212f;">${escHtml(String(r[1] ?? ""))}</td>
    </tr>`
    ).join("");
  const tierRow = (label: string, v: string): string => {
    if (!v) return "";
    const badge = /^(Low|Moderate|High|Critical|Yes|No)$/.test(v.trim());
    return `<tr>
      <td style="border:none;padding:3.5pt 0;font-size:9.5pt;color:#3f556b;">${escHtml(label)}</td>
      <td style="border:none;padding:3.5pt 0;text-align:right;">${
      badge ? riskBadgeHtml(v.trim()) : `<span style="font-size:9.5pt;color:#12212f;">${escHtml(v)}</span>`
    }</td>
    </tr>`;
  };
  return `<div class="risk-result-card" style="border:1px solid #c6d0d9;border-radius:4px;padding:10pt 13pt 9pt;margin:0 0 14px;break-inside:avoid;page-break-inside:avoid;">
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:8pt;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#17324d;margin:0 0 5pt;break-after:avoid;page-break-after:avoid;">Assessment Result</div>
    <table style="width:100%;border-collapse:collapse;border:none;">
      ${tierRow("Assessment required", req)}
      ${tierRow("Inherent privacy risk", inherent)}
      ${tierRow("Residual privacy risk", residual)}
    </table>
    <div style="border-top:0.75pt solid #aab8c5;margin-top:5pt;padding-top:6pt;">
      <table style="width:100%;border-collapse:collapse;border:none;"><tr>
        <td style="border:none;font-size:9.5pt;color:#3f556b;vertical-align:middle;">Assessment disposition</td>
        <td style="border:none;text-align:right;vertical-align:middle;">${riskBadgeHtml(disp, { large: true })}</td>
      </tr></table>
      ${path ? `<div style="margin-top:5pt;font-size:9.5pt;line-height:1.4;color:#12212f;">${escHtml(path)}</div>` : ""}
      ${extraRows ? `<table style="width:100%;border-collapse:collapse;border:none;margin-top:4pt;">${extraRows}</table>` : ""}
      ${whatThisMeans ? `<div style="margin-top:4pt;font-size:9.5pt;line-height:1.4;color:#12212f;"><strong>What this means:</strong> ${escHtml(whatThisMeans)}</div>` : ""}
    </div>
  </div>`;
}

/** DOC 144 (2026-09-02) — the disposition-family accent for the Assessment-
 * at-a-Glance panel's left rule: restrained, keyed on the controlled badge
 * label families (proceed=green, conditions=amber, AIR/NPDR=slate/neutral,
 * do-not-proceed=red — the same grayscale-safe tint families the badges
 * use). No full-page tinting, ever. */
function riskDispositionAccent(label: string): string {
  const v = label.trim();
  if (/^Do Not Proceed$/i.test(v)) return "#6e2323";
  if (/^Proceed with Conditions$/i.test(v)) return "#b9822d";
  if (/^Proceed$/i.test(v)) return "#28503a";
  // Additional Information Required / No Processing Decision Required /
  // anything unrecognized: the slate/neutral family.
  return "#5c6d7a";
}

/** The panel-scoped disposition badge tone for the SAME family mapping.
 * DOC 147 (2026-09-02): since the CEO's T8 ruling the generic badge
 * machinery also reads AIR as neutral/slate, so this override now matters
 * only for future divergence; kept for explicitness. */
function riskDispositionPanelTone(label: string): RiskBadgeTone {
  const v = label.trim();
  if (/^Do Not Proceed$/i.test(v)) return "hi";
  if (/^Proceed with Conditions$/i.test(v)) return "warn";
  if (/^Proceed$/i.test(v)) return "ok";
  return "neutral";
}

/** DOC 144 (2026-09-02) — the page-2 "Assessment at a Glance" panel (the
 * approved mockup's treatment): eyebrow + dominant disposition badge, the
 * count-tile strip (Georgia numerals, Arial caps labels, hairline
 * separators), the key-dates line, and the fixed "What this means" line.
 * Built ONLY from data the assembler already persisted, surface-keyed
 * (exec_status_panel + key_dates — doc 127 §28 law): the SAME rows the
 * cover Assessment Result card projects, never re-derived. */
function riskGlancePanelHtml(doc: SkeletonDocLike): string {
  let panelRows: string[][] | null = null;
  let keyDateRows: string[][] | null = null;
  for (const sec of doc.sections ?? []) {
    for (const p of sec.paragraphs ?? []) {
      if (p?.kind !== "table" || !p.table) continue;
      if (p.table.surface === "exec_status_panel") {
        panelRows = (p.table.rows ?? []).filter((r) => Array.isArray(r)) as string[][];
      } else if (p.table.surface === "key_dates") {
        keyDateRows = (p.table.rows ?? []).filter((r) => Array.isArray(r)) as string[][];
      }
    }
  }
  if (!panelRows) return "";
  const get = (label: string): string => {
    const row = panelRows!.find((r) => String(r?.[0] ?? "") === label);
    return row ? String(row[1] ?? "") : "";
  };
  const disp = get("Assessment disposition");
  if (!disp) return "";
  const accent = riskDispositionAccent(disp);
  const tiles = ([
    ["Triggers engaged", get("Triggers engaged")],
    ["Risks identified", get("Risks identified")],
    ["Benefits credited", get("Benefits credited")],
    ["Conditions", get("Number of conditions")],
  ] as Array<[string, string]>).filter(([, v]) => v !== "");
  const tileStrip = tiles.length
    ? `<table style="width:100%;border-collapse:collapse;border:none;margin:6pt 0 0;"><tr>${
      tiles.map(([label, v], i) =>
        `<td style="border:none;${i > 0 ? "border-left:0.5pt solid #c9d3db;" : ""}padding:2pt 8pt 3pt;text-align:center;vertical-align:top;width:${Math.floor(100 / tiles.length)}%;">
          <div style="font-family:'Georgia','Times New Roman',serif;font-size:20pt;line-height:1.15;color:#17324d;">${escHtml(v)}</div>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:7.5pt;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#5c6d7a;">${escHtml(label)}</div>
        </td>`
      ).join("")
    }</tr></table>`
    : "";
  // The key-dates line: the two schedule anchors the governance table
  // already states (initial-assessment deadline when present, the § 7155
  // three-year review) — read from the persisted key_dates surface, never
  // re-derived.
  const keyDateOf = (label: string): string => {
    const row = (keyDateRows ?? []).find((r) => String(r?.[0] ?? "") === label);
    return row ? String(row[2] ?? "") : "";
  };
  const keyDates = ([
    ["Initial assessment", keyDateOf("Initial risk assessment")],
    ["Three-year review", keyDateOf("Three-year review")],
  ] as Array<[string, string]>).filter(([, v]) => v !== "");
  const keyDatesLine = keyDates.length
    ? `<div style="margin-top:5pt;padding-top:4pt;border-top:0.5pt solid #dfe6ec;font-size:8.5pt;line-height:1.4;color:#3f556b;"><span style="font-family:Arial,Helvetica,sans-serif;font-size:7.5pt;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Key dates</span> — ${
      keyDates.map(([l, v]) => `${escHtml(l)}: ${escHtml(v)}`).join(" · ")
    }</div>`
    : "";
  const plain = get("What this means");
  return `<div class="risk-glance-panel" style="border:1px solid #c6d0d9;border-left:3pt solid ${accent};border-radius:4px;background:#f7f9fb;padding:9pt 13pt 8pt;margin:0 0 14px;break-inside:avoid;page-break-inside:avoid;">
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:8pt;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#17324d;margin:0 0 4pt;">Assessment at a Glance</div>
    <div>${riskBadgeHtml(disp, { large: true, tone: riskDispositionPanelTone(disp) })}</div>
    ${tileStrip}
    ${keyDatesLine}
    ${plain ? `<div style="margin-top:4pt;font-size:9.5pt;line-height:1.4;color:#12212f;"><strong>What this means:</strong> ${escHtml(plain)}</div>` : ""}
  </div>`;
}

/** DOC 144 (2026-09-02) — the § 2.A customer-voice block (paragraph kind
 * `customer_voice`): attribution line as the teal eyebrow, the Processing/
 * Purpose labels as caps slate, the Company's quoted values in Georgia with
 * their typographic quotes preserved byte-for-byte. */
function riskCustomerVoiceHtml(text: string): string {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return "";
  const [attribution, ...rest] = lines;
  const rows = rest.map((line) => {
    const m = /^(Processing|Purpose)\.\s*([\s\S]*)$/.exec(line);
    if (!m) return `<div style="margin:0 0 2pt;font-size:10pt;line-height:1.5;">${escHtml(line)}</div>`;
    return `<div style="margin:0 0 2pt;font-size:10pt;line-height:1.5;"><span style="font-family:Arial,Helvetica,sans-serif;font-size:8pt;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#3f556b;margin-right:4pt;">${escHtml(m[1])}</span> ${escHtml(m[2])}</div>`;
  }).join("");
  return `<div class="risk-customer-voice" style="border-left:2.5pt solid #2d9b90;background:#f7fbfa;padding:7pt 12pt 6pt;margin:0 0 10px;break-inside:avoid;page-break-inside:avoid;">
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:8pt;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#1f7a71;margin:0 0 4pt;">${escHtml(attribution)}</div>
    ${rows}
  </div>`;
}

/** Per-surface column widths and cell renderers for the remaining Risk
 * tables (§10, §11, §14/§15, §25). Surfaces not listed render with the
 * shared defaults (plus the Risk row-break rule). */
const RISK_TABLE_SPECS: Record<string, {
  widths?: readonly string[];
  cell?: (value: string, col: number) => string;
  fontPt?: number;
}> = {
  exec_triggers: {
    widths: ["42%", "58%"],
    cell: (v, c) => (c === 1 ? riskStatusLeadCellHtml(v) : escHtml(v)),
  },
  exec_ledger: {
    widths: ["56%", "22%", "22%"],
    cell: (v, c) => (c === 2 ? riskLevelCellHtml(v) : c === 0 ? riskHarmCellHtml(v) : escHtml(v)),
  },
  // DOC 144 (2026-09-02) — the § 4.A ledger is now SIX columns (Privacy risk
  // | Likelihood | Severity | Before safeguards | Safeguard credited (status)
  // | Remaining risk). Portrait-only law holds: the App-register precedent's
  // 8.5pt scale absorbs the two added columns; level/scale words badge
  // (columns 1, 2, 3, 5), the harm cell keeps its bold letter.
  risk_ledger: {
    widths: ["23%", "11%", "11%", "13%", "28%", "14%"],
    fontPt: 8.5,
    cell: (v, c) =>
      c === 0
        ? riskHarmCellHtml(v)
        : c === 1 || c === 2
        ? riskScaleCellHtml(v)
        : c === 3 || c === 5
        ? riskLevelCellHtml(v)
        : escHtml(v),
  },
  // DOC 144 — the § 3.B in-body necessity matrix (previously appendix-only,
  // no spec entry): three columns, Determination badges on the engine's
  // exact necessity words (surface + column keyed, never cell-text keyed).
  necessity_matrix: {
    widths: ["24%", "31%", "45%"],
    cell: (v, c) => (c === 1 ? riskNecessityCellHtml(v) : escHtml(v)),
  },
  balance_summary: { widths: ["50%", "50%"] },
  review_approval_signatures: { widths: ["18%", "24%", "26%", "22%", "10%"] },
  risk_and_safeguard_register: { fontPt: 8.5 },
};

/** The Risk table renderer: profile panel and result card for the two cover
 * surfaces; the shared horizontal-rules anatomy with surface-keyed widths,
 * badges, and row break protection for everything else. */
function riskTableHtml(t: SkeletonTableLike): string {
  const cols = Array.isArray(t.columns) ? t.columns : [];
  const rows = Array.isArray(t.rows) ? t.rows.filter((r) => Array.isArray(r)) : [];
  if (rows.length === 0 || cols.length === 0) return "";
  if (t.surface === "cover_summary") return riskProfilePanelHtml(t);
  if (t.surface === "exec_status_panel") {
    const card = riskResultCardHtml(t);
    if (card) return card;
  }
  const spec = RISK_TABLE_SPECS[t.surface ?? ""] ?? {};
  const fontPt = spec.fontPt ?? 9.5;
  const colgroup = spec.widths
    ? `<colgroup>${spec.widths.map((w) => `<col style="width:${w};">`).join("")}</colgroup>`
    : "";
  const head = cols
    .map((c) => `<th style="border:none;border-bottom:0.75pt solid #000;background:#f3f6f8;padding:5pt 8pt 4pt 6pt;text-align:left;font-weight:bold;font-family:Arial,Helvetica,sans-serif;font-size:8pt;text-transform:uppercase;letter-spacing:0.06em;color:#17324d;">${escHtml(c)}</th>`)
    .join("");
  const body = rows
    .map((r) =>
      `<tr style="break-inside:avoid;page-break-inside:avoid;">${cols
        .map((_c, i) => {
          const v = String(r[i] ?? "");
          const cell = /^_{6,}$/.test(v.trim())
            ? `<span style="display:inline-block;min-width:220px;border-bottom:0.75pt solid #0c2a44;">&nbsp;</span>`
            : spec.cell
            ? spec.cell(v, i)
            : escHtml(v);
          return `<td style="border:none;border-bottom:0.5pt solid #666;padding:6pt 8pt 6pt 0;vertical-align:top;font-size:${fontPt}pt;">${cell}</td>`;
        })
        .join("")}</tr>`
    )
    .join("");
  const headHtml = t.hideHeader ? "" : `<thead style="display:table-header-group;"><tr>${head}</tr></thead>`;
  return `<div class="risk-table risk-${escHtml(t.surface ?? "table")}" style="margin:0 0 10px;">
    ${t.title ? `<div style="font-weight:bold;font-size:10pt;margin:0 0 4px;break-after:avoid;page-break-after:avoid;">${escHtml(t.title)}</div>` : ""}
    <table style="width:100%;border-collapse:collapse;border-top:1.25pt solid #000;border-bottom:1.25pt solid #000;font-size:${fontPt}pt;line-height:1.35;table-layout:fixed;">
      ${colgroup}
      ${headHtml}
      <tbody>${body}</tbody>
    </table>
    ${t.note ? `<div style="font-size:8pt;color:#4a5b6a;margin:3px 0 0;break-before:avoid;page-break-before:avoid;">${escHtml(t.note)}</div>` : ""}
  </div>`;
}

/** §5/§6/§8 — the marker/heading typography split for a lead label: the
 * section marker ("A.", "1.", "(B)", "Step 3 —") is bold and NEVER
 * underlined; the heading words carry the underline (bold at lettered
 * level, regular at numbered level). Input is already-escaped text. */
function riskSplitLeadHtml(escapedLabel: string): string {
  const m = /^([A-Z]\.|\([A-H]\)|Step \d+ —|\d{1,2}\.)\s+([\s\S]*)$/.exec(escapedLabel);
  if (!m) {
    const stop = /\.$/.test(escapedLabel) ? "." : "";
    const core = stop ? escapedLabel.slice(0, -1) : escapedLabel;
    return `<strong><span style="${RISK_UNDERLINE}">${core}</span>${stop}</strong>`;
  }
  const numbered = /^\d/.test(m[1]);
  const rest = m[2];
  const stop = /\.$/.test(rest) ? "." : "";
  const core = stop ? rest.slice(0, -1) : rest;
  const restHtml = numbered
    ? `<span style="${RISK_UNDERLINE}">${core}</span>${stop}`
    : `<strong><span style="${RISK_UNDERLINE}">${core}</span>${stop}</strong>`;
  return `<strong style="display:inline-block;min-width:1.65em;">${m[1]}</strong> ${restHtml}`;
}

/** §12 — the disposition label projected from the cover's Assessment Result
 * table (surface-keyed; the SAME normalized state, never re-derived). */
function riskDispositionOf(doc: SkeletonDocLike): string {
  for (const sec of doc.sections ?? []) {
    for (const p of sec.paragraphs ?? []) {
      if (p?.kind === "table" && p.table?.surface === "exec_status_panel") {
        const row = (p.table.rows ?? []).find((r) => String(r?.[0] ?? "") === "Assessment disposition");
        if (row) return String(row[1] ?? "");
      }
    }
  }
  return "";
}

function skeletonSectionsHtml(doc: SkeletonDocLike, opts?: { product?: string }): string {
  const footnotesOn = opts?.product === "cppa-admt-v2";
  // DOC 127 PHASE B (2026-09-01) — the Risk presentation system gate.
  const riskMode = opts?.product === "cppa-risk";
  const riskDisposition = riskMode ? riskDispositionOf(doc) : "";
  // R6: one amber Deadline box per document maximum (doc 109 §1.5); the
  // deadline-board table carries the rest.
  let deadlineCalloutUsed = false;
  return (doc.sections ?? []).map((sec) => {
    const paras = (sec.paragraphs ?? []).map((p) => {
      if (p?.kind === "table" && p.table) {
        return riskMode ? riskTableHtml(p.table) : skeletonTableHtml(p.table);
      }
      const t = typeof p?.text === "string" ? p.text : "";
      if (!t.trim()) return "";
      // DOC 127 §9 (Phase B) — the Section-1 methodology strip: each byte-
      // pinned "Step N — Title. Sentence" paragraph lays out as a compact
      // framework row (number chip, bold title, the sentence). Bytes are
      // untouched upstream; this is PDF layout only.
      const stepM = riskMode && sec.id === "i_method"
        ? /^Step (\d+) — ([^.]+)\.\s*([\s\S]*)$/.exec(t.trim())
        : null;
      if (stepM) {
        return `<div class="risk-step" style="padding:4pt 0 4pt 2pt;border-bottom:0.5pt solid #dfe6ec;break-inside:avoid;page-break-inside:avoid;font-size:9.5pt;line-height:1.4;">
          <span style="display:inline-block;width:13pt;height:13pt;border-radius:50%;background:#eef2f6;color:#17324d;font-family:Arial,Helvetica,sans-serif;font-size:8pt;font-weight:700;text-align:center;line-height:13pt;margin-right:5pt;">${escHtml(stepM[1])}</span><strong>${escHtml(stepM[2])}</strong> — ${escHtml(stepM[3])}
        </div>`;
      }
      // DOC 127 §12 (Phase B) — the executive DETERMINATION card: the exec
      // summary's determination lead (kind "lead", the ratified balancing
      // conclusion + pointer) renders inside a restrained card headed by
      // the same controlled disposition label the cover projects (read
      // from the exec_status_panel surface — the ONE normalized state,
      // never re-derived; §30.19).
      if (riskMode && sec.id === "executive_summary" && p?.kind === "lead") {
        const marked = linkifyBareUrls(underlineAppendixRefs(styleLeadPhrases(escHtml(t.trim()), true)));
        return `<div class="risk-determination-card" style="border-top:1.5pt solid #17324d;background:#f7f9fb;padding:8pt 12pt 9pt;margin:2pt 0 10pt;break-inside:avoid;page-break-inside:avoid;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:8pt;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#17324d;margin:0 0 3pt;">Determination</div>
          ${riskDisposition ? `<div style="margin:0 0 5pt;">${riskBadgeHtml(riskDisposition, { large: true })}</div>` : ""}
          <p class="body-p" style="white-space:pre-line;margin:0;font-size:9.5pt;line-height:1.4;">${marked}</p>
        </div>`;
      }
      // DOC 144 (2026-09-02) — the § 2.A customer-voice block (kind-driven,
      // risk only): the Company's recorded processing and purpose quoted as
      // given under the attribution line, on the teal-ruled ground.
      if (riskMode && p?.kind === "customer_voice") {
        return riskCustomerVoiceHtml(t);
      }
      // R4 (kind-driven): composer-typed quoted authority renders as the
      // statute-quote block, verbatim, no lead styling.
      if (p?.kind === "quoted_authority") {
        return `<div class="statute-quote" style="${STATUTE_QUOTE_STYLE}">${escHtml(t.trim())}</div>`;
      }
      if (sec.id === "table_of_authorities" && p?.kind !== "skeleton") {
        // ITEM 4 — FIRST ToA FIX (CEO-directed, 2026-08-15; presentation only):
        // one authority per line, single column, ledger order preserved.
        // CPPA Risk v4.5 repurposes this section id for Appendix G and adds a
        // "skeleton" intro paragraph ahead of its table; that intro is
        // ordinary prose, not ToA citation lines, so it falls through to the
        // plain paragraph branch below instead of the citation-line parser.
        const rows = toaLines(t).map((l) => {
          if (l.is_heading) {
            return `<tr><td style="padding:6px 0 2px;font-family:'Georgia','Times New Roman',serif;font-weight:bold;font-size:11px;color:#0c2a44;">${escHtml(l.text)}</td></tr>`;
          }
          // ITEM SO-12 — anchor a numbered ADMT-v2 entry so body footnote
          // markers can jump to it. Every other product's lines have no
          // leading "N. " and pass through with id=null (no-op).
          const { id, rest } = footnotesOn ? toaAnchorId(l.text) : { id: null, rest: l.text };
          const idAttr = id ? ` id="${id}"` : "";
          return `<tr><td${idAttr} style="padding:1px 0 1px 18px;font-family:'Courier New',monospace;font-size:10.5px;">${escHtml(rest)}</td></tr>`;
        }).join("");
        if (!rows) return "";
        return `<table class="toa-table" style="width:100%;border-collapse:collapse;margin:0 0 8px;"><tbody>${rows}</tbody></table>`;
      }
      // A-TEAM S4 RULING S3.4 (doc 119) — kind-driven chrome: a
      // legal_requirement paragraph opens with a small "Legal standard"
      // eyebrow chip; determination-lead kinds already carry banner chrome.
      const kindChip = p?.kind === "legal_requirement"
        ? `<div style="display:inline-block;font-size:7.5pt;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#4a5b6a;border:0.75pt solid #8a9eb1;border-radius:2px;padding:1pt 5pt;margin:8px 0 3px;break-after:avoid;page-break-after:avoid;">Legal standard</div>`
        : "";
      const chunksHtml = t.split(/\n{2,}/).map((chunk) => {
        // 2026-08-25 polish round — a chunk whose lead is a Condition(s)-to-
        // Proceed (bare, or right after a lettered lead like "D. Consequence.")
        // wraps in the amber .condition-callout so the condition is visually
        // impossible to miss. Detected on the raw chunk, ahead of both render
        // branches below, so list-shaped condition chunks get the box too.
        const trimmed = chunk.trim();
        // R2: a chunk that IS a structural lead renders as an h3.
        if (trimmed.length <= 96 && H3_CHUNK_RE.test(trimmed)) {
          // DOC 127 §5/§6/§8 (Phase B) — Risk h3 sub-heads carry the same
          // marker/heading split as inline leads: bold marker never
          // underlined; lettered heading words bold+underlined, numbered
          // heading words regular+underlined.
          if (riskMode) {
            const numbered = /^\d{1,2}\./.test(trimmed);
            return `<h3 style="font-family:'Georgia','Times New Roman',serif;font-weight:${numbered ? "400" : "bold"};font-size:13px;color:#0c2a44;margin:14px 0 6px;break-after:avoid;page-break-after:avoid;">${riskSplitLeadHtml(escHtml(trimmed))}</h3>`;
          }
          return `<h3 style="font-family:'Georgia','Times New Roman',serif;font-weight:bold;font-size:13px;color:#0c2a44;margin:14px 0 6px;break-after:avoid;page-break-after:avoid;">${escHtml(trimmed)}</h3>`;
        }
        // R4 (shape-driven): a chunk that is one enquoted span of ≥ ~25
        // words renders as the statute-quote block.
        if (QUOTE_CHUNK_RE.test(trimmed) && trimmed.split(/\s+/).length >= 25) {
          return `<div class="statute-quote" style="${STATUTE_QUOTE_STYLE}">${escHtml(trimmed)}</div>`;
        }
        // R5: a rulemaking-context chunk renders in the guidance panel; the
        // run-in label styling still applies inside it.
        const guidancePanel = trimmed.startsWith("Rulemaking context — persuasive only.");
        // R6: the muted panel for not-yet-assessable / corpus-pending
        // states — short chunks only, so an analysis paragraph that merely
        // mentions the phrase does not get pulled into the muted voice.
        const mutedPanel = !guidancePanel && trimmed.length <= 600 &&
          /not yet assessable/i.test(trimmed);
        // R6: "Deadline." opens the amber family once per document.
        const deadlineCallout = trimmed.startsWith("Deadline.") && !deadlineCalloutUsed;
        if (deadlineCallout) deadlineCalloutUsed = true;
        // BATCH 18b (doc 113 S2.5) — the IR readiness banner: a "Readiness."
        // chunk takes the condition-callout box; amber when it carries the
        // negative-state determination, the same geometry with the calm
        // slate border otherwise. Keep in sync with SkeletonDocumentView.tsx.
        const readinessCallout = trimmed.startsWith("Readiness.");
        const readinessNegative = readinessCallout && trimmed.includes("would not carry");
        // BATCH 19b (doc 113 S4.3) — the DPIA determination banner: amber
        // when it records a blocking outcome, the calm slate box otherwise.
        // Keep in sync with SkeletonDocumentView.tsx.
        const determinationCallout = trimmed.startsWith("Determination.");
        const determinationBlocking = determinationCallout &&
          /may not begin|should not begin|cannot yet determine/.test(trimmed);
        // DOC 127 §13 (Phase B) — the adverse § 4.D block's items chunk opens
        // with the ratified reassessment intro (its "Conditions for
        // Reassessment." head is its own h3 chunk), so that intro joins the
        // amber-callout trigger; the favorable branch is unchanged. Keep in
        // sync with SkeletonDocumentView.tsx.
        const conditionCallout = deadlineCallout || readinessNegative || determinationBlocking ||
          /^(?:[A-Z]\.\s+[^.]+\.\s+)?Conditions? to Proceed\./.test(chunk.trim()) ||
          /^The Activity should not proceed in its present form\./.test(chunk.trim());
        // CEO report review 2026-09-04 (§ 4.D palette) — the same lead-string
        // family the H3_CHUNK_RE trigger list already recognizes ("Follow-
        // Ups.", "Required Follow-Up.", "Assessment Follow-Up Required." /
        // "Recommendation.", "Recommendations."), matched on the raw chunk
        // ahead of both render branches so list-shaped chunks get the box
        // too, same as conditionCallout above. Keep in sync with
        // SkeletonDocumentView.tsx.
        const followupCallout =
          /^(?:[A-Z]\.\s+[^.]+\.\s+)?(?:Follow-Ups?\.|Required Follow-Up\.|Assessment Follow-Up Required\.)/.test(chunk.trim());
        const recommendationCallout =
          /^(?:[A-Z]\.\s+[^.]+\.\s+)?Recommendations?\./.test(chunk.trim());
        const wrapChunk = (html: string): string => {
          if (!html) return html;
          if (conditionCallout) {
            return `<div class="condition-callout" style="border:1.5px solid #b9822d;background:#fdf6e7;border-radius:5px;padding:9px 13px;margin:0 0 10px;">${html}</div>`;
          }
          if (followupCallout) {
            return `<div class="followup-callout" style="border:1.5px solid #6f9bc4;background:#eef4f7;border-radius:5px;padding:9px 13px;margin:0 0 10px;">${html}</div>`;
          }
          if (recommendationCallout) {
            return `<div class="recommendation-callout" style="border:1.5px solid #a4bfae;background:#f2f7f4;border-radius:5px;padding:9px 13px;margin:0 0 10px;">${html}</div>`;
          }
          if (readinessCallout || determinationCallout) {
            return `<div class="readiness-callout" style="border:1.5px solid #94a3b8;background:#f8fafc;border-radius:5px;padding:9px 13px;margin:0 0 10px;">${html}</div>`;
          }
          if (guidancePanel) return `<div class="guidance" style="${GUIDANCE_PANEL_STYLE}">${html}</div>`;
          if (mutedPanel) return `<div class="callout-muted" style="${MUTED_PANEL_STYLE}">${html}</div>`;
          return html;
        };
        // CEO report review 2026-08-24 — bold alone doesn't read as
        // distinct enough; the lead carries an underline too.
        const mark = (html: string) => {
          const underlined = linkifyBareUrls(underlineAppendixRefs(html));
          return footnotesOn ? substituteFootnoteMarkers(underlined) : underlined;
        };
        // DOC 144 (2026-09-02) — the plain-question landing line: a chunk
        // opening with the literal "[Q] " token (risk only) drops the token
        // and renders as the italic slate subline directly beneath its
        // section head.
        if (riskMode && trimmed.startsWith("[Q] ")) {
          return `<p class="risk-q" style="font-style:italic;color:#5c6d7a;font-size:10.5pt;line-height:1.45;margin:-2px 0 9px;">${mark(escHtml(trimmed.slice(4)))}</p>`;
        }
        // DOC 144 (2026-09-02) — the framed law-cite treatment: a chunk
        // opening with the "Governing requirement." run-in (risk only) takes
        // the slate-tinted hairline frame, the label as the Arial caps
        // eyebrow, the statutory text in the ordinary Georgia body.
        // Grayscale-safe (frame + weight carry the signal).
        if (riskMode && trimmed.startsWith("Governing requirement.")) {
          const rest = trimmed.slice("Governing requirement.".length).trim();
          return `<div class="risk-law-cite" style="background:#f4f6f8;border:0.75pt solid #c9d3db;border-radius:3px;padding:6pt 11pt 7pt;margin:0 0 10px;break-inside:avoid;page-break-inside:avoid;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:8.5pt;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#3f556b;margin:0 0 3pt;break-after:avoid;page-break-after:avoid;">Governing requirement</div>
            <p class="body-p" style="white-space:pre-line;margin:0;">${mark(styleLeadPhrases(escHtml(rest), true))}</p>
          </div>`;
        }
        // 2026-08-25 batch be0f9e02 fix — lead styling is applied by
        // styleLeadPhrases (see its definition) on the ESCAPED text of every
        // plain-paragraph run, in BOTH branches below. This closes the two
        // gaps the CEO's review found: (a) a chunk containing a "— item"
        // list run used to route around the lead styling entirely, so
        // lettered leads like "E. Inherent Risk Conclusion." on list-carrying
        // chunks rendered plain; (b) run-in analytic labels ("Analysis.",
        // "Conclusion.", "Reasoning.", …) mid-paragraph were never styled at
        // all — only chunk-opening leads were.
        // DOC 127 §7 (Phase B) — Risk body paragraphs take a CSS first-line
        // indent (never typed spaces); with white-space:pre-line only the
        // block's FIRST formatted line indents, so composer "\n" line runs
        // (Entry./Stages., numbered conditions) stay at the margin.
        const paragraphHtml = (text: string): string =>
          `<p class="body-p" style="white-space:pre-line;${riskMode ? "text-indent:0.22in;" : ""}">${mark(styleLeadPhrases(escHtml(text), riskMode))}</p>`;
        // CEO report review 2026-08-24 — a chunk containing a "— item"
        // list run (see segmentDashText) renders those runs as real
        // bullet lists and everything else as ordinary paragraphs.
        const segments = segmentDashText(chunk);
        if (segments) {
          return wrapChunk(segments.map((seg) => {
            if (seg.kind === "list" && seg.parts.length >= 2) {
              const itemsHtml = seg.parts.map((item) => `<li>${underlineAppendixRefs(escHtml(item))}</li>`).join("");
              return `<ul class="body-list" style="margin:0 0 8px;padding-left:20px;">${itemsHtml}</ul>`;
            }
            return paragraphHtml(seg.parts.join(" "));
          }).join(""));
        }
        return wrapChunk(paragraphHtml(chunk));
      }).join("");
      return kindChip + chunksHtml;
    }).join("");
    if (!paras) return "";
    // DOC 144 (2026-09-02) — the page-2 Assessment-at-a-Glance panel opens
    // the executive summary (built from the persisted exec_status_panel /
    // key_dates surfaces — the SAME data the cover card projects).
    const glanceHtml = riskMode && sec.id === "executive_summary" ? riskGlancePanelHtml(doc) : "";
    // Part B item 2 (2026-08-21, CEO-confirmed, PDF-only) — every Appendix
    // or Exhibit starts on a new page, not just the section that happens to
    // carry the "table_of_authorities" id. Title-driven so it is id-
    // agnostic: it covers CPPA Risk's Appendices A–H (only G reused the
    // table_of_authorities id) and ADMT v2's Appendices A and B
    // (appendix_a/appendix_b) without a per-product id whitelist.
    //
    // CEO report review 2026-08-24 — the same treatment for the new
    // signature pages (printable/removable, so each starts its own page):
    // "review_and_approval"/"agency_submission_checklist" (CPPA Risk),
    // "review_of_assessment" (CPPA ADMT), "signature" (CPPA Cyber).
    const forceBreak = sec.id === "table_of_authorities"
      || /^(appendix|exhibit)\b/i.test(sec.title ?? "")
      || (sec.id === "incident_worksheet" && opts?.product === "ir-playbook")
      || SIGNATURE_PAGE_IDS.has(sec.id ?? "");
    const breakCss = forceBreak ? "break-before:always;page-break-before:always;" : "";
    // 2026-08-25 batch be0f9e02 — the "wide-landscape" named-page treatment
    // is REMOVED (was: any section with a 5+-column table asked for a
    // landscape page). Verified against real PDFShift output: (a) the
    // heuristic over-fired badly — DPIA's EDPB tables routinely carry 5–7
    // columns, flipping 11 of 17 pages, and Risk's 5-column SIGNATURE table
    // flipped the Review-and-Approval page; (b) worse, Chromium lays the
    // document out at a single content width, so mixed-orientation named
    // pages CLIPPED text at the right edge rather than reflowing. Negative
    // result recorded in doc 66 Rule 10 — do not reintroduce without a
    // dedicated render test against the live PDF service.
    // DOC 144 (2026-09-02) — the risk section opener: the numbered main
    // sections (1–5 only; never appendices) open with the large quiet
    // Georgia numeral in light slate-blue left of the eyebrow+title stack,
    // under the retained 2.5pt navy top rule. The numeral marker is NEVER
    // underlined (Rule 1 — amends doc-66 Rule 2 for the RISK product).
    const riskOpener = riskMode ? /^([1-5])\.\s+(.+)$/.exec(sec.title ?? "") : null;
    const headingHtml = riskOpener
      ? `<div class="risk-section-opener" style="border-top:2.5pt solid #17324d;padding-top:6px;margin:4px 0 10px;break-after:avoid;page-break-after:avoid;break-inside:avoid;page-break-inside:avoid;">
        <table style="width:100%;border-collapse:collapse;border:none;"><tr>
          <td style="border:none;width:36pt;vertical-align:top;padding:0;font-family:'Georgia','Times New Roman',serif;font-size:40px;line-height:0.85;color:#b8c4cd;">${escHtml(riskOpener[1])}</td>
          <td style="border:none;vertical-align:bottom;padding:0 0 2px;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:7.5pt;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8a9eb1;margin:0 0 2px;">Section ${escHtml(riskOpener[1])}</div>
            <h2 style="font-family:'Georgia','Times New Roman',serif;color:#0c2a44;font-size:15px;margin:0;">${escHtml(riskOpener[2])}</h2>
          </td>
        </tr></table>
      </div>`
      : `<h2 style="font-family:'Georgia','Times New Roman',serif;color:#0c2a44;font-size:15px;margin:0 0 8px;break-after:avoid;page-break-after:avoid;">${escHtml(sec.title ?? "")}</h2>`;
    return `<section class="section" style="${breakCss}margin-bottom:14px;">
      ${headingHtml}
      ${glanceHtml}
      ${paras}
    </section>`;
  }).join("\n");
}

// ─────────────────────────────────────────────────────────────────────────
// DOC 170 (2026-09-04) — SYLLABUS & RECORD, the fleet presentation system
// (docs 143/144 → doc 151, CEO-ratified 2026-09-03; canonical record
// docs/design/SYLLABUS-RECORD-DESIGN-SYSTEM.md; reference implementation
// docs/design/syllabus-record/design-concept-v2.html).
//
// The model: the holding on page one (the Determination Syllabus), the
// reasoning in the body, the record behind a divider (the Supporting
// Assessment Record). Five type roles (Georgia display/body/table, Arial
// label/furniture), one rail geometry for every framed element, states as
// tinted TEXT never filled chips, justified body, two filled surfaces per
// document (the disposition panel and the divider foot). Gated per product
// by SR_PRODUCTS (../_shared/prose/syllabus.ts); every other product keeps
// the presentation it has today, byte-for-byte.
//
// PRODUCTION DEVIATIONS from the reference (design system § 9): no fixed-
// height pages (content flows; page breaks are declared, never measured);
// the reference's per-page locator FOOTERS cannot vary per page under
// Chromium print (one PDFShift footer template per document), so the
// running head carries the product + company and the section head carries
// the locator instead; multi-column constructs are tables, never flexbox.
// The renderer stays dumb: no re-wording, no re-ordering, no added prose —
// page one is a projection the assembler persisted (document.syllabus).
// ─────────────────────────────────────────────────────────────────────────

const SR_CSS = `
  * { box-sizing:border-box; }
  body.sr { font-family:Georgia,'Times New Roman',serif; color:#1a1916; background:#fff; margin:0; font-size:10pt; line-height:1.5; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .sr p { font-size:10pt; line-height:1.5; margin:0 0 6pt; text-align:justify; }
  .sr p.q { font-style:italic; color:#41505c; text-align:left; }
  .sr .lbl, .sr .eyebrow { font-family:Arial,Helvetica,sans-serif; font-size:7.5pt; font-weight:bold; letter-spacing:0.1em; text-transform:uppercase; }
  .sr .eyebrow { color:#5c6d7a; }
  .sr .st { font-family:Arial,Helvetica,sans-serif; font-size:7.5pt; font-weight:bold; letter-spacing:0.08em; text-transform:uppercase; white-space:nowrap; }
  .sr .st-ok { color:#28503a; } .sr .st-hold { color:#6e5518; } .sr .st-hi { color:#6e2323; } .sr .st-neutral { color:#41505c; }
  .sr .st-rest { font-size:8.4pt; color:#5c6d7a; white-space:normal; }
  .sr h1 { font-size:21pt; font-weight:normal; line-height:1.15; color:#0c2a44; margin:0; }
  .sr table.sechead { width:100%; border-collapse:collapse; border-bottom:1.5pt solid #0c2a44; margin:0 0 10pt; break-after:avoid; page-break-after:avoid; }
  .sr table.sechead td { border:none; padding:0 0 6pt; vertical-align:baseline; }
  .sr table.sechead td.secnum { width:40pt; font-family:Georgia,'Times New Roman',serif; font-size:30pt; color:#aab8c5; line-height:1; padding-right:12pt; }
  .sr table.sechead td.secnum.letter { font-size:22pt; }
  .sr table.sechead h2 { font-size:15.5pt; font-weight:normal; color:#0c2a44; margin:0; }
  .sr table.sechead .q { font-size:10pt; font-style:italic; color:#5c6d7a; display:block; margin-top:2pt; }
  .sr table.sechead .loc { display:block; font-family:Arial,Helvetica,sans-serif; font-size:7pt; letter-spacing:0.08em; color:#8a9eb1; text-transform:uppercase; margin-top:3pt; }
  .sr h2.plain { font-size:15.5pt; font-weight:normal; color:#0c2a44; margin:0 0 10pt; padding-bottom:6pt; border-bottom:1.5pt solid #0c2a44; break-after:avoid; page-break-after:avoid; }
  .sr h3 { font-size:10.5pt; margin:10pt 0 4pt; color:#12212f; font-weight:bold; break-after:avoid; page-break-after:avoid; }
  .sr h3 .mk { color:#5c6d7a; font-weight:normal; }
  .sr h3 u, .sr .cond .cn u, .sr .runin { text-decoration:underline; text-underline-offset:2.5px; text-decoration-thickness:0.5pt; }
  .sr .rail { border-left:2pt solid #0c2a44; padding:3pt 0 3pt 10pt; margin:8pt 0 9pt; break-inside:avoid; page-break-inside:avoid; }
  .sr .rail .rl { display:block; font-family:Arial,Helvetica,sans-serif; font-size:7.5pt; font-weight:bold; letter-spacing:0.1em; color:#0c2a44; text-transform:uppercase; }
  .sr .rail p { font-size:9.3pt; margin:1pt 0 0; }
  .sr .rail ul.body-list { font-size:9.3pt; margin:1pt 0 0; }
  .sr .rail-teal { border-left-color:#2d9b90; } .sr .rail-teal .rl { color:#2d9b90; }
  .sr .rail-hair { border-left-color:#c9d2d9; } .sr .rail-hair .rl { color:#5c6d7a; }
  .sr .rail-hold { border-left-color:#6e5518; } .sr .rail-hold .rl { color:#6e5518; }
  .sr table.srt { width:100%; border-collapse:collapse; margin:4pt 0 8pt; table-layout:fixed; }
  .sr table.srt th { font-family:Arial,Helvetica,sans-serif; font-size:7.5pt; font-weight:bold; letter-spacing:0.06em; text-transform:uppercase; color:#1a1916; text-align:left; border-bottom:1.5pt solid #41505c; padding:3pt 8pt 3pt 4pt; background:#f3f6f8; }
  .sr table.srt td { font-size:8.8pt; line-height:1.4; vertical-align:top; border-bottom:0.5pt solid #dde5ea; padding:4pt 8pt 4pt 4pt; text-align:left; word-wrap:break-word; }
  .sr table.srt.kv td.k { font-family:Arial,Helvetica,sans-serif; font-size:7.5pt; font-weight:bold; text-transform:uppercase; letter-spacing:0.06em; color:#5c6d7a; width:30%; }
  .sr .tbl-title { font-family:Arial,Helvetica,sans-serif; font-size:7.5pt; font-weight:bold; letter-spacing:0.1em; text-transform:uppercase; color:#5c6d7a; margin:6pt 0 2pt; break-after:avoid; page-break-after:avoid; }
  .sr .tbl-note { font-size:8.4pt; color:#41505c; margin:-4pt 0 8pt; }
  .sr thead { display:table-header-group; }
  .sr tr { page-break-inside:avoid; break-inside:avoid; }
  .sr table.brand { width:100%; border-collapse:collapse; border-bottom:2pt solid #0c2a44; }
  .sr table.brand td { border:none; padding:0 0 8pt; vertical-align:baseline; }
  .sr table.brand td.l { font-family:Arial,Helvetica,sans-serif; font-size:8pt; font-weight:bold; letter-spacing:0.2em; color:#0c2a44; }
  .sr table.brand td.r { font-family:Arial,Helvetica,sans-serif; font-size:7pt; color:#5c6d7a; letter-spacing:0.08em; text-align:right; line-height:1.5; }
  .sr .dispo { background:#f3f6f8; border:0.5pt solid #c9d2d9; border-left:2pt solid #0c2a44; padding:10pt 14pt 10pt 10pt; margin:14pt 0 12pt; break-inside:avoid; page-break-inside:avoid; }
  .sr .dispo .dv { font-size:17pt; color:#0c2a44; margin:2pt 0 4pt; font-family:Georgia,'Times New Roman',serif; }
  .sr .dispo p { margin:0; }
  .sr table.syltab td { font-size:9.2pt; border-bottom:0.5pt solid #dde5ea; padding:4pt 8pt 4pt 4pt; vertical-align:top; }
  .sr table.syltab td.k { font-family:Arial,Helvetica,sans-serif; font-size:7.5pt; font-weight:bold; text-transform:uppercase; letter-spacing:0.06em; color:#5c6d7a; width:34%; }
  .sr .cond { border-left:2pt solid #c9d2d9; padding:2pt 0 2pt 10pt; margin:6pt 0 8pt; break-inside:avoid; page-break-inside:avoid; }
  .sr .cond .cn { font-size:10pt; }
  .sr .cond p { font-size:9.3pt; margin:1pt 0 0; }
  .sr .kd { font-family:Arial,Helvetica,sans-serif; font-size:8pt; color:#41505c; border-top:0.5pt solid #c9d2d9; border-bottom:0.5pt solid #c9d2d9; padding:5pt 0; margin-top:10pt; line-height:1.6; }
  .sr .kd b { letter-spacing:0.05em; }
  .sr .divider { border-top:3pt solid #0c2a44; border-bottom:0.5pt solid #c9d2d9; padding:20pt 0 16pt; margin-top:30pt; }
  .sr .divider h2 { font-size:19pt; font-weight:normal; color:#0c2a44; margin:4pt 0 0; }
  .sr table.maprow { width:100%; border-collapse:collapse; margin-top:14pt; }
  .sr table.maprow td { padding:6pt 8pt 6pt 4pt; font-size:9.2pt; border-bottom:0.5pt solid #dde5ea; vertical-align:top; }
  .sr table.maprow td.ml { font-family:Georgia,'Times New Roman',serif; font-size:13pt; color:#aab8c5; width:8%; }
  .sr .page-break { break-before:always; page-break-before:always; }
  .sr section.section { margin-bottom:14pt; }
  .sr ul.body-list { font-size:10pt; line-height:1.5; margin:0 0 8pt; padding-left:18pt; }
  .sr ul.body-list li { margin-bottom:3pt; text-align:justify; }
  .sr table.toa-table td { font-size:8.8pt; }
  .sr .statute-quote { font-size:9.3pt; }
`;

/** A state word (the fleet lexicon) tinted as text; a value that OPENS with
 * a state word followed by " — " tints the word and sets the rest small and
 * slate; anything else renders verbatim. Never a filled chip. */
function srTintHtml(value: string): string {
  const v = value.trim();
  const whole = toneForState(v);
  if (whole) return `<span class="st st-${whole}">${escHtml(v)}</span>`;
  const m = /^([^—\n]{2,60}?)\s+—\s+([\s\S]+)$/.exec(v);
  if (m) {
    const tone = toneForState(m[1]);
    if (tone) return `<span class="st st-${tone}">${escHtml(m[1])}</span>&nbsp;&nbsp;<span class="st-rest">${escHtml(m[2])}</span>`;
  }
  return escHtml(v);
}

/** Section-head marker split (Rule 1 — markers never underlined): "A." /
 * "1." / "(B)" / "Step N —" in the quiet marker colour, the title words
 * underline-only. Input is already-escaped text. */
function srHeadHtml(escapedLabel: string): string {
  const m = /^([A-Z]\.|\([A-H]\)|Step \d+ —|\d{1,2}\.)\s+([\s\S]*)$/.exec(escapedLabel);
  const body = m ? m[2] : escapedLabel;
  const stop = /\.$/.test(body) ? "." : "";
  const core = stop ? body.slice(0, -1) : body;
  return `${m ? `<span class="mk">${m[1]}</span> ` : ""}<u>${core}</u>${stop}`;
}

/** The Governing-Requirement rail label with the cite the sentence itself
 * names ("Section 7152(a)(1) requires…" → "11 CCR § 7152(a)(1)"); the label
 * alone when the sentence names none. Statutory text stays verbatim. */
function srGoverningLabel(rest: string): string {
  const m = /^Sections?\s+(\d{4}[()\w.–-]*(?:(?:,\s*|\s+and\s+|–)\d{4}[()\w.–-]*)*)/.exec(rest.trim());
  if (!m) return "GOVERNING REQUIREMENT";
  const cites = m[1].split(/,\s*|\s+and\s+/).map((c) => c.trim()).filter(Boolean);
  const sym = cites.length > 1 || /–/.test(m[1]) ? "§§" : "§";
  return `GOVERNING REQUIREMENT · 11 CCR ${sym} ${escHtml(cites.join(", "))}`;
}

function srRailHtml(label: string, innerHtml: string, tone: "" | "teal" | "hair" | "hold" = ""): string {
  return `<div class="rail${tone ? ` rail-${tone}` : ""}"><span class="rl">${label}</span>${innerHtml}</div>`;
}

/** The R3/R4 table: Arial caps header, hairline rows, state words tinted as
 * text; a hidden-header key/value surface renders its keys as R4 labels. */
function srTableHtml(t: SkeletonTableLike, product?: string): string {
  const cols = Array.isArray(t.columns) ? t.columns : [];
  const rows = Array.isArray(t.rows) ? t.rows.filter((r) => Array.isArray(r)) : [];
  if (rows.length === 0 || cols.length === 0) return "";
  const kv = t.hideHeader === true && cols.length === 2;
  const spec = product === "cppa-risk" ? (RISK_TABLE_SPECS[t.surface ?? ""] ?? {}) : {};
  const colgroup = spec.widths
    ? `<colgroup>${spec.widths.map((w) => `<col style="width:${w};">`).join("")}</colgroup>`
    : "";
  const head = kv || t.hideHeader
    ? ""
    : `<thead><tr>${cols.map((c) => `<th>${escHtml(c)}</th>`).join("")}</tr></thead>`;
  const body = rows.map((r) =>
    `<tr>${cols.map((_c, i) => {
      const v = String(r[i] ?? "");
      const cell = /^_{6,}$/.test(v.trim())
        ? `<span style="display:inline-block;min-width:220px;border-bottom:0.75pt solid #0c2a44;">&nbsp;</span>`
        : srTintHtml(v);
      return `<td${kv && i === 0 ? ' class="k"' : ""}>${cell}</td>`;
    }).join("")}</tr>`
  ).join("");
  return `<div class="sr-table sr-${escHtml(t.surface ?? "table")}">
    ${t.title ? `<div class="tbl-title">${escHtml(t.title)}</div>` : ""}
    <table class="srt${kv ? " kv" : ""}">${colgroup}${head}<tbody>${body}</tbody></table>
    ${t.note ? `<div class="tbl-note">${escHtml(t.note)}</div>` : ""}
  </div>`;
}

/** Page 1 — the Determination Syllabus, from the persisted projection. */
function srSyllabusPageHtml(s: SyllabusProjection, record: any): string {
  const created = record?.created_at ? new Date(record.created_at) : new Date();
  const date = created.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }).toUpperCase();
  const reportId = typeof record?.id === "string" && record.id.length >= 8 ? `REPORT ${record.id.slice(0, 8).toUpperCase()} · ` : "";
  const rows = s.rows.map(([k, v]) => `<tr><td class="k">${escHtml(k)}</td><td>${srTintHtml(v)}</td></tr>`).join("");
  const conditions = s.conditions.length
    ? `<div class="eyebrow" style="margin-top:8pt;">${escHtml(s.conditions_heading)}</div>` +
      s.conditions.map((c, i) =>
        `<div class="cond"><div class="cn">${i + 1}.&nbsp;&nbsp;<u>${escHtml(c.name)}</u></div><p>${escHtml(c.text)}</p></div>`
      ).join("")
    : "";
  const kd = s.key_dates.length
    ? `<div class="kd"><b>KEY DATES</b> &nbsp;·&nbsp; ${
      s.key_dates.map(([k, v]) => `${escHtml(k)}: ${srTintHtml(v)}`).join(" &nbsp;·&nbsp; ")
    }</div>`
    : "";
  return `<section class="sr-syllabus">
    <table class="brand"><tr><td class="l">END USER PRIVACY</td><td class="r">${escHtml(s.instrument_line)}<br>${reportId}${escHtml(date)}</td></tr></table>
    <div style="margin-top:16pt;">
      <div class="eyebrow">Prepared for ${escHtml(s.prepared_for)}</div>
      <h1>${escHtml(s.activity)}</h1>
      ${s.subtitle ? `<div style="font-size:9.5pt;color:#5c6d7a;margin-top:3pt;">${escHtml(s.subtitle)}</div>` : ""}
    </div>
    <div class="dispo">
      <div class="lbl" style="color:#5c6d7a;">${escHtml(s.disposition_label)}</div>
      <div class="dv">${escHtml(s.disposition)}</div>
      ${s.paragraph ? `<p>${escHtml(s.paragraph)}</p>` : ""}
    </div>
    ${rows ? `<table class="syltab" style="width:100%;border-collapse:collapse;"><tbody>${rows}</tbody></table>` : ""}
    ${conditions}
    ${kd}
  </section>`;
}

/** The Record Divider page: end of the decision report, the ratified
 * paragraph, and the A–F map from the projection (or the titles alone). */
function srRecordDividerHtml(s: SyllabusProjection | null, appendices: Array<{ letter: string; title: string }>): string {
  const rows = appendices.map((a) => {
    const desc = s?.record_map.find((r) => r[0] === a.letter)?.[2] ?? "";
    return `<tr><td class="ml">${escHtml(a.letter)}</td><td style="width:34%;"><b>${escHtml(a.title)}</b></td><td>${escHtml(desc)}</td></tr>`;
  }).join("");
  return `<section class="sr-divider page-break">
    <div class="divider">
      <div class="eyebrow">END OF THE DECISION REPORT</div>
      <h2>Supporting Assessment Record</h2>
      <p style="margin-top:6pt;">The record that stands behind every conclusion above: authority traceability, the complete factual inventories, the full risk and safeguard register, the technical record, and the materials considered. A decision-maker may stop at the last numbered section. Counsel, auditors, and regulators continue here — and every entry cites the body section it supports.</p>
    </div>
    ${rows ? `<table class="maprow">${rows}</table>` : ""}
  </section>`;
}

/** The three-part action taxonomy leads and their rail labels. */
const SR_ACTION_LEADS: ReadonlyArray<[RegExp, string, "" | "hair" | "hold"]> = [
  [/^(?:Conditions? to Proceed\.)/, "CONDITIONS TO PROCEED — these condition the determination", "hold"],
  [/^(?:Conditions for Reassessment\.)/, "CONDITIONS FOR REASSESSMENT — a different disposition depends on these", "hold"],
  [/^(?:Follow-Ups?\.|Required Follow-Up\.|Assessment Follow-Up Required\.)/, "FOLLOW-UPS — these complete the record", "hair"],
  [/^(?:Recommendations?\.)/, "RECOMMENDATIONS — non-blocking", "hair"],
];

function srSectionsHtml(doc: SkeletonDocLike, product?: string): string {
  const footnotesOn = product === "cppa-admt-v2";
  const syllabus = readSyllabus(doc);
  const sections = doc.sections ?? [];
  const appendices = sections
    .map((sec) => /^Appendix ([A-Z])\s*[—–-]\s*(.+)$/.exec(sec.title ?? ""))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ letter: m[1], title: m[2] }));
  let dividerDone = false;
  const mark = (html: string) => {
    const underlined = linkifyBareUrls(underlineAppendixRefs(html));
    return footnotesOn ? substituteFootnoteMarkers(underlined) : underlined;
  };
  const paragraphHtml = (text: string): string =>
    `<p style="white-space:pre-line;">${mark(styleLeadPhrases(escHtml(text), true))}</p>`;
  const chunkHtml = (chunk: string, sec: { id?: string }): string => {
    const trimmed = chunk.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("[Q] ")) return `<p class="q">${mark(escHtml(trimmed.slice(4)))}</p>`;
    if (trimmed.startsWith("Governing requirement.")) {
      const rest = trimmed.slice("Governing requirement.".length).trim();
      return srRailHtml(srGoverningLabel(rest), `<p style="white-space:pre-line;">${mark(styleLeadPhrases(escHtml(rest), true))}</p>`);
    }
    if (trimmed.length <= 96 && H3_CHUNK_RE.test(trimmed)) return `<h3>${srHeadHtml(escHtml(trimmed))}</h3>`;
    if (QUOTE_CHUNK_RE.test(trimmed) && trimmed.split(/\s+/).length >= 25) {
      return srRailHtml("STATUTORY TEXT", `<p style="white-space:pre-line;">${escHtml(trimmed)}</p>`);
    }
    for (const [re, label, tone] of SR_ACTION_LEADS) {
      const m = re.exec(trimmed);
      if (m) {
        const body = trimmed.slice(m[0].length).trim();
        return srRailHtml(label, body ? `<p style="white-space:pre-line;">${mark(escHtml(body))}</p>` : "", tone);
      }
    }
    if (/^The Activity should not proceed in its present form\./.test(trimmed)) {
      return srRailHtml("CONDITIONS FOR REASSESSMENT — a different disposition depends on these", `<p style="white-space:pre-line;">${mark(escHtml(trimmed))}</p>`, "hold");
    }
    if (trimmed.startsWith("Rulemaking context — persuasive only.")) {
      return srRailHtml("RULEMAKING CONTEXT · PERSUASIVE ONLY", `<p style="white-space:pre-line;">${mark(escHtml(trimmed.slice("Rulemaking context — persuasive only.".length).trim()))}</p>`, "hair");
    }
    const lead = /^(Deadline|Readiness|Determination)\.\s*/.exec(trimmed);
    if (lead) {
      const body = trimmed.slice(lead[0].length);
      const hold = lead[1] === "Deadline" || /would not carry|may not begin|should not begin|cannot yet determine/.test(body);
      return srRailHtml(lead[1].toUpperCase(), `<p style="white-space:pre-line;">${mark(styleLeadPhrases(escHtml(body), true))}</p>`, hold ? "hold" : "");
    }
    if (trimmed.length <= 600 && /not yet assessable/i.test(trimmed)) {
      return srRailHtml("NOT YET ASSESSABLE", `<p style="white-space:pre-line;">${mark(escHtml(trimmed))}</p>`, "hair");
    }
    const segments = segmentDashText(chunk);
    if (segments) {
      return segments.map((seg) =>
        seg.kind === "list" && seg.parts.length >= 2
          ? `<ul class="body-list">${seg.parts.map((item) => `<li>${underlineAppendixRefs(escHtml(item))}</li>`).join("")}</ul>`
          : paragraphHtml(seg.parts.join(" "))
      ).join("");
    }
    void sec;
    return paragraphHtml(chunk);
  };

  return sections.map((sec) => {
    const title = (sec.title ?? "").trim();
    const appendixM = /^Appendix ([A-Z])\s*[—–-]\s*(.+)$/.exec(title);
    const numM = /^(\d{1,2})\.\s+(.+)$/.exec(title) ?? /^Section (\d{1,2})\s*[—–-]\s*(.+)$/.exec(title);
    let pre = "";
    if (appendixM && !dividerDone) { pre = srRecordDividerHtml(syllabus, appendices); dividerDone = true; }

    // The section question-line rides in the head when the section's first
    // prose chunk is a "[Q] " landing line (kind-agnostic; token stripped).
    let headQ = "";
    const paras = sec.paragraphs ?? [];
    const firstText = paras.find((p) => typeof p?.text === "string" && p.text.trim() && p.kind !== "table");
    if (firstText && firstText.text!.trim().startsWith("[Q] ")) {
      const chunks = firstText.text!.split(/\n{2,}/);
      headQ = chunks[0].trim().slice(4);
      firstText.text = chunks.slice(1).join("\n\n");
    }

    const body = paras.map((p) => {
      if (p?.kind === "table" && p.table) {
        // Consumed by page one: the cover panel and the executive result
        // panel (the syllabus carries the same persisted values). DOC 173
        // (2026-09-04) — Governance's programme scoreboard is the same
        // pattern: its rows are read straight into the syllabus's
        // determination table (buildGovernanceSyllabus), so the in-body copy
        // would otherwise repeat identical rows directly under the section
        // heading that already sits under page one's copy. DOC 174
        // (2026-09-04) — ADMT v2's cover table (surface "header": Organization
        // / System reviewed / Overall assessment / Record sufficiency /
        // Regulatory framework) is the same pattern again.
        if (
          syllabus &&
          (p.table.surface === "cover_summary" || p.table.surface === "exec_status_panel" ||
            p.table.surface === "art30_element_findings+demonstrability_findings+domain_element_findings+remediation_plan" ||
            p.table.surface === "header")
        ) return "";
        return srTableHtml(p.table, product);
      }
      const t = typeof p?.text === "string" ? p.text : "";
      if (!t.trim()) return "";
      if (syllabus && sec.id === "executive_summary" && p?.kind === "lead") return ""; // rendered on page one
      if (p?.kind === "customer_voice") {
        const lines = t.split("\n").map((l) => l.trim()).filter(Boolean);
        const [attribution, ...rest] = lines;
        const rows = rest.map((line) => {
          const m = /^(Processing|Purpose)\.\s*([\s\S]*)$/.exec(line);
          return m
            ? `<p><span class="lbl" style="color:#5c6d7a;font-size:7pt;">${escHtml(m[1])}</span>&nbsp; ${escHtml(m[2])}</p>`
            : `<p>${escHtml(line)}</p>`;
        }).join("");
        return srRailHtml(escHtml(attribution ?? ""), rows, "teal");
      }
      if (p?.kind === "legal_requirement") {
        return srRailHtml(srGoverningLabel(t.trim()), `<p style="white-space:pre-line;">${mark(styleLeadPhrases(escHtml(t.trim()), true))}</p>`);
      }
      if (p?.kind === "quoted_authority") {
        return srRailHtml("STATUTORY TEXT", `<p style="white-space:pre-line;">${escHtml(t.trim())}</p>`);
      }
      if (sec.id === "table_of_authorities" && p?.kind !== "skeleton") {
        const rows = toaLines(t).map((l) => {
          if (l.is_heading) return `<tr><td style="padding:6px 0 2px;font-weight:bold;font-size:9.5pt;color:#0c2a44;">${escHtml(l.text)}</td></tr>`;
          const { id, rest } = footnotesOn ? toaAnchorId(l.text) : { id: null, rest: l.text };
          return `<tr><td${id ? ` id="${id}"` : ""} style="padding:1px 0 1px 18px;font-size:8.8pt;">${escHtml(rest)}</td></tr>`;
        }).join("");
        return rows ? `<table class="toa-table" style="width:100%;border-collapse:collapse;margin:0 0 8px;"><tbody>${rows}</tbody></table>` : "";
      }
      if (syllabus && sec.id === "executive_summary" && p?.kind === "lead") return "";
      const chunks = t.split(/\n{2,}/);
      // DOC 171 (2026-09-04) — a product whose executive body OPENS with a
      // run-in-labeled "Determination. …" chunk (rather than carrying it as
      // its own `kind: "lead"` paragraph, the CPPA Risk shape) restates the
      // same sentence page one already prints under DETERMINATION. Dropped
      // here, presentation-only: the composed bytes and every other product
      // are untouched (a product outside SR_PRODUCTS never reaches this
      // branch; `syllabus` is null for it).
      const filtered = syllabus && sec.id === "executive_summary"
        ? chunks.filter((c) => !/^Determination\.\s/.test(c.trim()))
        : chunks;
      return filtered.map((c) => chunkHtml(c, sec)).join("");
    }).join("");
    if (!body.trim() && !headQ) return pre;

    const forceBreak = !!appendixM || sec.id === "table_of_authorities" || SIGNATURE_PAGE_IDS.has(sec.id ?? "")
      || (sec.id === "incident_worksheet" && product === "ir-playbook");
    const qHtml = headQ ? `<span class="q">${mark(escHtml(headQ))}</span>` : "";
    const headingHtml = numM
      ? `<table class="sechead"><tr><td class="secnum">${escHtml(numM[1])}</td><td><h2>${escHtml(numM[2])}</h2>${qHtml}</td></tr></table>`
      : appendixM
      ? `<table class="sechead"><tr><td class="secnum letter">${escHtml(appendixM[1])}</td><td><h2>${escHtml(appendixM[2])}</h2>${qHtml}<span class="loc">Supporting Assessment Record · Appendix ${escHtml(appendixM[1])}</span></td></tr></table>`
      : `<h2 class="plain">${escHtml(title)}</h2>${qHtml ? `<p class="q" style="margin-top:-6pt;">${mark(escHtml(headQ))}</p>` : ""}`;
    return `${pre}<section class="section${forceBreak && !(appendixM && pre) ? " page-break" : ""}" data-section="${escHtml(sec.id ?? "")}">
      ${headingHtml}
      ${body}
    </section>`;
  }).join("\n");
}

/** The whole Syllabus & Record document: page one, then the sections. */
function buildSyllabusRecordHTML(doc: SkeletonDocLike, record: any, fallbackTitle: string, product?: string): string {
  const syllabus = readSyllabus(doc);
  const title = doc.title || fallbackTitle;
  const runhead = syllabus?.running_head ?? title.toUpperCase();
  const page1 = syllabus
    ? srSyllabusPageHtml(syllabus, record)
    : `<section class="sr-syllabus"><table class="brand"><tr><td class="l">END USER PRIVACY</td><td class="r">${escHtml(title.toUpperCase())}</td></tr></table><div style="margin-top:16pt;"><h1>${escHtml(title)}</h1>${doc.subtitle ? `<div style="font-size:9.5pt;color:#5c6d7a;margin-top:3pt;">${escHtml(doc.subtitle)}</div>` : ""}</div></section>`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escHtml(title)}</title>
<style>${SR_CSS}</style></head>
<body class="sr" data-sr-runhead="${escHtml(runhead)}" data-sr-footer="${escHtml(`EndUserPrivacy.com · ${title}`)}">
${page1}
<div class="page-break"></div>
${srSectionsHtml(doc, product)}
</body></html>`;
}

// DOC 127 PHASE C (2026-09-01) — exported for the local print-media QA
// harness (the edge entrypoint itself cannot be imported without serving;
// the harness imports this builder directly). No behavior change.
export function buildSkeletonReportHTML(doc: SkeletonDocLike, record: any, fallbackTitle: string, product?: string, eyebrow?: string): string {
  // DOC 170 (2026-09-04) — Syllabus & Record products render through the
  // fleet presentation system; every other product is byte-unchanged.
  if (isSyllabusRecordProduct(product)) return buildSyllabusRecordHTML(doc, record, fallbackTitle, product);
  const created = record?.created_at ? new Date(record.created_at) : new Date();
  // A-TEAM S4 RULING S4 (doc 119) — the cover meta line carries a Report ID
  // derived from the row id, so a printed report can be traced to its record.
  const reportId = typeof record?.id === "string" && record.id.length >= 8
    ? `Report ID ${record.id.slice(0, 8).toUpperCase()}`
    : "";
  const metaLine = [
    reportId,
    `Generated ${created.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    doc.subtitle || "",
  ].filter(Boolean).join(" · ");
  // BATCH 16 (R10, A-Team RULING 3.7): Cyber-scoped Table of Contents —
  // one page after the cover block, h2 section titles only. Chromium's
  // print pipeline cannot resolve target page numbers, so entries are
  // anchor links without page numbers. Extension to any other product
  // waits for a calibrated batch readout, as its own ruling.
  //
  // DOC 135 FOLLOW-UP (deferred item, 2026-09-01, CEO-directed) — extended
  // to cppa-risk, reusing the identical mechanism proven for Cyber. Page
  // numbers remain the same known, documented limitation noted above (not
  // attempted here); PDF outline/bookmark entries were also considered
  // and not attempted — this pipeline emits plain HTML to PDFShift, which
  // has no supported path from HTML markup to a PDF's native bookmark
  // tree without a separate post-processing step, out of scope for this
  // batch.
  const tocHtml = (product === "cppa-cyber" || product === "cppa-risk")
    ? (() => {
      const items = (doc.sections ?? [])
        .map((sec, i) => ({ title: (sec.title ?? "").trim(), i }))
        .filter((x) => x.title);
      if (items.length <= 9) return "";
      return `<section class="section" style="break-after:always;page-break-after:always;margin-bottom:14px;">
        <h2 style="font-family:'Georgia','Times New Roman',serif;color:#0c2a44;font-size:15px;margin:0 0 10px;">Contents</h2>
        ${items.map((x) => `<p style="margin:0 0 4px;font-size:11px;border-bottom:0.5pt dotted #9fb0bd;padding-bottom:2px;">${escHtml(x.title)}</p>`).join("")}
      </section>`;
    })()
    : "";
  return buildTextReportHTML({
    title: doc.title || fallbackTitle,
    metaLine,
    text: "",
    showJurisdictionChip: false,
    // DOC 127 §29 (Phase B) — Risk sections carry the scoping wrapper class
    // so future stylesheet-level rules stay contained to this product.
    htmlPrefix: tocHtml + (product === "cppa-risk"
      ? `<div class="report risk-report">${skeletonSectionsHtml(doc, { product })}</div>`
      : skeletonSectionsHtml(doc, { product })),
    // BATCH 21a (doc 113 S7.3, completing RULING 3.9's Batch-16 half-
    // landing): threaded through to buildTextReportHTML's own eyebrow
    // param; omitted for every call site but IR's, so the fleet default
    // ("Customized Compliance Assessment") is unchanged everywhere else.
    eyebrow,
  });
}

// ─────────────────────────────────────────────────────────────────────────
// doc 113 Part I (RULING 9.1/9.4/9.5) — DPA CONTRACT MODE.
//
// A second, product-gated layout profile used ONLY when the record carries
// `report_data.dpa_contract` (the deterministic-path structured data —
// RULING 9.2/9.3). Every other DPA record (us-state/canada model-path
// records, pre-existing rows generated before this landed) keeps today's
// unmodified `buildTextReportHTML({ text: record.document_text, ... })`
// path — see the call site below.
//
// This renders through `htmlPrefix` (the same bypass `buildSkeletonReportHTML`
// uses) so the generic `parseTextBlocks`/`splitTextSections` parser — which
// mis-reads DPA clause numbering as headings (RULING 9.1's root-cause
// finding) — is never invoked on contract content. No report-prose
// heuristic (`segmentDashText`, `styleLeadPhrases`, `underlineAppendixRefs`)
// is called here: contract mode carries no underlining anywhere (doc 109
// §1.7 item 9).
// ─────────────────────────────────────────────────────────────────────────
interface DpaContractSectionLike { heading?: string; clauses?: string[] }
interface DpaContractPartyLike { label?: string; name?: string }
interface DpaContractExecutionLike { statement?: string; parties?: DpaContractPartyLike[] }
interface DpaContractAnnexLike { title?: string; rows?: string[][]; note?: string }
interface DpaContractLike {
  sections?: DpaContractSectionLike[];
  execution?: DpaContractExecutionLike;
  annexA?: DpaContractAnnexLike;
  annexB?: DpaContractAnnexLike;
  annexC?: DpaContractAnnexLike;
  annexD?: DpaContractAnnexLike;
}
interface DpaCoverageClauseLike {
  clause?: string;
  requirement?: string;
  status?: string;
  location?: string | null;
}
interface DpaCoverageLike {
  citation?: string | null;
  clauses?: DpaCoverageClauseLike[];
  present_count?: number;
  absent_count?: number;
}

// Whitelist-bounded, not a heuristic — the only acronyms the DPA clause
// library ever names in a heading ("...CCPA REQUIRED TERMS").
const DPA_HEADING_ACRONYMS = new Set(["CCPA", "CPRA", "GDPR", "EEA", "EU", "UK"]);
const DPA_HEADING_SMALL_WORDS = new Set(["and", "or", "of", "the", "in", "for", "to", "a", "an", "on", "as", "by", "with"]);
/**
 * Display-only ALL-CAPS→Title Case conversion for DPA part heads (doc 109
 * §1.7 item 9 bullet 2 — the piece doc 113 Part H correctly deferred to
 * contract mode rather than the fleet-wide report Title-Case sweep).
 * `sections[].heading`/`document_text` are never touched — every other
 * consumer (`checkDpaCompleteness`'s case-insensitive match, the legacy
 * grader payload) reads the untouched original string.
 */
function titleCaseHeading(h: string): string {
  return h.replace(/\S+/g, (word: string, offset: number) => {
    if (/^\d+\.$/.test(word)) return word;
    const bare = word.replace(/[^A-Za-z]/g, "");
    if (bare && DPA_HEADING_ACRONYMS.has(bare.toUpperCase()) && bare === bare.toUpperCase()) return word;
    const lower = word.toLowerCase();
    if (offset !== 0 && DPA_HEADING_SMALL_WORDS.has(lower.replace(/[^a-z]/g, ""))) return lower;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

// doc 109 §1.7 item 9 bullet 5 — `[TO BE COMPLETED: …]` and `[N]`-style
// negotiables render as a styled fill-in, never raw brackets in body ink.
const DPA_FILLIN_RE = /\[TO BE COMPLETED:[^\]]*\]|\[\d+\]/g;
function styleDpaFillIns(escapedText: string): string {
  return escapedText.replace(DPA_FILLIN_RE, (m) =>
    `<span style="background:#fdf6e7;color:#8a5a12;border-radius:3px;padding:1px 4px;">${m}</span>`);
}

// A clause number, optionally followed by a caption parenthetical ending
// `.)`, then the operative text — doc 109's whitelist-free, shape-driven
// caption rule ("a clause-opening parenthetical ending `.)` is the
// caption"). The caption body itself may contain parens (e.g. "Art.
// 28(3)(a)"), so the caption group is `[\s\S]` (any char, including `)`),
// lazily matched up to the first literal `.)` — not `[^)]*`, which a
// nested-paren caption would defeat. Bounded to 150 chars so a clause with
// no real caption can never be mis-matched against a distant, unrelated
// ".)" much later in the text.
const DPA_CLAUSE_RE = /^(\d+(?:\.\d+)*)\s+(\([\s\S]{1,150}?\.\))?\s*([\s\S]*)$/;
function renderDpaClauseHtml(clause: string): string {
  const trimmed = String(clause ?? "").trim();
  if (!trimmed) return "";
  const m = DPA_CLAUSE_RE.exec(trimmed);
  const style = "margin:0 0 8px;padding-left:28px;text-indent:-28px;font-size:11px;line-height:1.5;color:#1a1916;";
  if (!m) return `<p style="${style}">${styleDpaFillIns(escHtml(trimmed))}</p>`;
  const [, num, captionRaw, rest] = m;
  const captionHtml = captionRaw
    ? `<strong style="font-weight:bold;">${escHtml(captionRaw)}</strong> `
    : "";
  return `<p style="${style}"><span style="font-weight:bold;">${escHtml(num)}</span> ${captionHtml}${styleDpaFillIns(escHtml(rest))}</p>`;
}

function dpaAnnexTableHtml(annex: DpaContractAnnexLike | undefined, columns: string[], hideHeader?: boolean): string {
  if (!annex || !Array.isArray(annex.rows) || annex.rows.length === 0) return "";
  return skeletonTableHtml({ title: annex.title, columns, rows: annex.rows, note: annex.note, hideHeader });
}

function buildDpaContractHTML(
  contract: DpaContractLike,
  coverage: DpaCoverageLike | null | undefined,
  opts: { title: string; metaLine?: string },
): string {
  const sections = Array.isArray(contract.sections) ? contract.sections : [];
  const parties = Array.isArray(contract.execution?.parties) ? contract.execution!.parties! : [];

  // §1.7 item 9 bullet 1 — chrome exile: the instrument opens with a
  // centered title and party blocks, own page, ahead of Part 1.
  const coverHtml = parties.length
    ? `<div style="text-align:center;padding:36px 20px 56px;break-after:always;page-break-after:always;">
        <h1 style="font-family:'Georgia','Times New Roman',serif;font-size:20px;color:#0c2a44;margin:0 0 26px;">Data Processing Agreement</h1>
        ${parties.map((p) => `<p style="margin:0 0 6px;font-size:12px;color:#1a1916;"><strong>${escHtml(p.label ?? "")}:</strong> ${escHtml(p.name ?? "")}</p>`).join("")}
      </div>`
    : "";

  const sectionsHtml = sections.map((sec) => {
    const clauses = Array.isArray(sec.clauses) ? sec.clauses : [];
    if (!clauses.length) return "";
    return `<section class="section" style="margin-bottom:16px;">
      <h2 style="font-family:'Georgia','Times New Roman',serif;font-weight:bold;color:#0c2a44;font-size:13px;margin:0 0 10px;break-after:avoid;page-break-after:avoid;">${escHtml(titleCaseHeading(sec.heading ?? ""))}</h2>
      ${clauses.map(renderDpaClauseHtml).join("")}
    </section>`;
  }).join("\n");

  // §1.7 item 9 bullet 6 — per-party execution blocks, own page. Reuses
  // skeletonTableHtml's existing bottom-border fill-in rule (R7) for the
  // signature/name/title/date blanks — no new fill-in visual invented.
  const executionHtml = parties.length
    ? `<section class="section" style="break-before:always;page-break-before:always;margin-bottom:16px;">
        <h2 style="font-family:'Georgia','Times New Roman',serif;font-weight:bold;color:#0c2a44;font-size:13px;margin:0 0 10px;">Execution</h2>
        <p style="font-size:11px;margin:0 0 16px;color:#1a1916;">${escHtml(contract.execution?.statement ?? "")}</p>
        ${parties.map((p) => `<div style="margin-bottom:22px;">
          <p style="font-weight:bold;font-size:11.5px;margin:0 0 8px;">SIGNED for and on behalf of ${escHtml(p.name ?? "")} (${escHtml(p.label ?? "")}):</p>
          ${skeletonTableHtml({
            columns: ["Field", "Value"],
            hideHeader: true,
            rows: [
              ["By", "______________________"],
              ["Name", "______________________"],
              ["Title", "______________________"],
              ["Date", "______________________"],
            ],
          })}
        </div>`).join("")}
      </section>`
    : "";

  // §1.7 item 9 bullet 6 / §2.8 items 3–4 — Annexes A–D as real tables, via
  // the same fleet-wide table primitive every other product uses.
  const annexBlocks = [
    dpaAnnexTableHtml(contract.annexA, ["Field", "Value"], true),
    dpaAnnexTableHtml(contract.annexB, ["Field", "Value"], true),
    dpaAnnexTableHtml(contract.annexC, ["Measure", "Status"]),
    dpaAnnexTableHtml(contract.annexD, ["Name", "Service", "Location", "Date Authorised"]),
  ].filter(Boolean);
  const annexesHtml = annexBlocks.length
    ? `<section class="section" style="break-before:always;page-break-before:always;margin-bottom:16px;">${annexBlocks.join("<div style=\"height:14px;\"></div>")}</section>`
    : "";

  // §2.8 item 5 — the Art. 28(3) checklist as a labeled informational
  // Schedule table, sourced from the SAME structured `clause_coverage` the
  // deterministic path already persists (doc 113 Part F / RULING D3 named
  // this heading; the flat-text annex stays, unchanged, in `document_text`
  // for the coverage checker and legacy grader).
  const coverageClauses = Array.isArray(coverage?.clauses) ? coverage!.clauses! : [];
  const scheduleHtml = coverageClauses.length
    ? `<section class="section" style="break-before:always;page-break-before:always;margin-bottom:16px;">${skeletonTableHtml({
        title: "Schedule — Article 28(3) Clause-Coverage (Informational)",
        columns: ["Clause", "Requirement", "Status", "Location"],
        rows: coverageClauses.map((c) => [
          c.clause === "chapeau" ? "Chapeau" : c.clause === "second_subparagraph" ? "Second subparagraph" : `(${c.clause ?? ""})`,
          c.requirement ?? "",
          c.status === "present" ? "Present" : "Absent",
          c.location ?? "—",
        ]),
        note: `Deterministic coverage check against ${coverage?.citation ?? "GDPR Art. 28"}(3). ${coverage?.present_count ?? 0} present, ${coverage?.absent_count ?? 0} absent. A clause marked Absent has not been drafted into this document and requires attention before execution.`,
      })}</section>`
    : "";

  return buildTextReportHTML({
    title: opts.title,
    metaLine: opts.metaLine,
    text: "",
    showJurisdictionChip: false,
    htmlPrefix: coverHtml + sectionsHtml + executionHtml + annexesHtml + scheduleHtml,
  });
}


// CPPA shared compact renderers — prefer the synthesized agency_position_summary;
// fall back to the sentence-truncated agency_response already stored in report
// payloads. Never present comment_summary (the commenter's position) as agency voice.
// ─────────────────────────────────────────────────────────────────────────
function renderCppaFsorCompact(items: any[], maxItems = 2): string {
  if (!Array.isArray(items) || items.length === 0) return "";
  const rows = items.slice(0, maxItems).map((it: any) => {
    const cite = escHtml(it?.citation || it?.regulation_citation || "");
    const summary = escHtml(it?.agency_position_summary || it?.agency_response || "");
    const url = it?.source_url ? String(it.source_url) : "";
    const urlHtml = url ? ` · <a href="${escHtml(url)}">${escHtml(url)}</a>` : "";
    if (!cite && !summary && !url) return "";
    return `<li><span class="label">${cite}</span>${summary ? ` — ${summary}` : ""}${urlHtml}</li>`;
  }).filter(Boolean).join("");
  if (!rows) return "";
  return `<p class="label" style="margin-top:8px;">Rulemaking references</p><ul class="fsor-refs">${rows}</ul>`;
}

function renderCppaSectionCommentary(sectionMap: any): string {
  if (!sectionMap || typeof sectionMap !== "object") return "";
  const all: any[] = [];
  for (const v of Object.values(sectionMap)) {
    if (Array.isArray(v)) for (const r of v) all.push(r);
  }
  if (all.length === 0) return "";
  const rows = all.slice(0, 6).map((it: any) => {
    const cite = escHtml(it?.citation || it?.regulation_citation || "");
    const summary = escHtml(it?.agency_position_summary || it?.agency_response || "");
    const url = it?.source_url ? String(it.source_url) : "";
    const urlHtml = url ? ` · <a href="${escHtml(url)}">${escHtml(url)}</a>` : "";
    if (!cite && !summary && !url) return "";
    return `<li><span class="label">${cite}</span>${summary ? ` — ${summary}` : ""}${urlHtml}</li>`;
  }).filter(Boolean).join("");
  if (!rows) return "";
  return `<section class="section"><h2>Rulemaking context</h2><ul class="fsor-refs">${rows}</ul></section>`;
}

function renderCppaEnforcementPrecedents(items: any[]): string {
  if (!Array.isArray(items) || items.length === 0) return "";
  const cards = items.map((p: any) => {
    const regulator = escHtml(p?.regulator || "");
    const subject = escHtml(p?.subject || "");
    const year = p?.decision_date ? escHtml(String(p.decision_date).slice(0, 4)) : "";
    const articlesRaw = p?.violated_articles ?? p?.articles_violated ?? p?.violation ?? "";
    const articles = Array.isArray(articlesRaw)
      ? articlesRaw.map((a: any) => String(a)).join(", ")
      : String(articlesRaw || "");
    const failure = escHtml(p?.key_compliance_failure || "");
    const fineVerified = p?.fine_verified !== false; // default true when missing
    const fineEur = p?.fine_eur_equivalent;
    const fineLine = !fineVerified
      ? `<p><span class="label">Fine:</span> fine amount under verification — omitted</p>`
      : (fineEur !== null && fineEur !== undefined && Number(fineEur) > 0
          ? `<p><span class="label">Fine:</span> €${Number(fineEur).toLocaleString()}</p>`
          : `<p><span class="label">Fine:</span> n/a</p>`);
    const head = [regulator, subject].filter(Boolean).join(" v ") + (year ? ` (${year})` : "");
    return `<article class="annotation">
      <h3>${head || "Enforcement action"}</h3>
      ${articles ? `<p><span class="label">Violated articles:</span> ${escHtml(articles)}</p>` : ""}
      ${failure ? `<p>${failure}</p>` : ""}
      ${fineLine}
    </article>`;
  }).join("");
  return `<section class="section"><h2>Enforcement Precedents</h2>${cards}</section>`;
}

function buildCPPARiskLegacyHTML(report: any, record: any): string {
  const generatedDate = new Date(record.created_at || report?.generated_at || Date.now()).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const scope = report?.scope_confirmation || {};
  const domains = Array.isArray(report?.domains) ? report.domains : [];
  const topRisks = Array.isArray(report?.top_risks) ? report.top_risks : [];
  const nextSteps = Array.isArray(report?.next_steps) ? report.next_steps : [];
  const annotations = Array.isArray(report?.annotations) ? report.annotations : [];
  const text = (v: any) => escHtml(v === null || v === undefined ? "" : String(v));
  const list = (items: any[]) => items.length ? `<ul>${items.map((item) => `<li>${text(item)}</li>`).join("")}</ul>` : "";

  const statusClass = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "critical gap") return "critical";
    if (s === "gap") return "gap";
    if (s === "partial") return "partial";
    if (s === "compliant") return "compliant";
    return "neutral";
  };

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CPPA Privacy Risk Assessment</title>
<style>
  :root { --navy:#0c2a44; --ink:#1a1916; --paper:#f5f8fa; --card:#ffffff; --border:#dde5ea; --muted:#5c6d7a; --teal:#2d9b90; --teal-soft:#e5f4f2; --red:#0d2a45; --red-soft:#e8eff2; --orange:#1a4a6e; --orange-soft:#eef4f7; --amber:#24606c; --amber-soft:#eaf2f5; --green:#1c6960; --green-soft:#e5f4f2; }
  * { box-sizing:border-box; }
  body { font-family:'Georgia','Times New Roman',serif; color:var(--ink); background:var(--paper); font-size:11pt; line-height:1.5; margin:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .shell { background:var(--card); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
  .header { background:var(--navy); color:#fff; padding:24px 28px; }
  .logo-img { display:block; height:34px; width:auto; margin-bottom:12px; object-fit:contain; }
  .eyebrow { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.14em; color:#93b5c6; margin:0 0 4px; }
  h1 { font-size:24px; margin:0; line-height:1.2; }
  .meta { margin-top:6px; font-size:11px; color:#cbd5e1; }
  .summary-bar { margin-top:14px; display:flex; gap:8px; flex-wrap:wrap; }
  .pill { display:inline-block; border-radius:999px; padding:4px 10px; font-size:11px; font-weight:700; background:rgba(255,255,255,.12); color:#fff; }
  .body { padding:22px 28px 28px; }
  h2 { color:var(--navy); font-size:17px; margin:24px 0 10px; border-bottom:1px solid var(--border); padding-bottom:6px; }
  h3 { color:var(--navy); font-size:14px; margin:0 0 8px; }
  p { margin:0 0 9px; }
  ul, ol { margin:8px 0 0; padding-left:20px; } li { margin-bottom:5px; }
  .notice { border-left:4px solid var(--teal); background:var(--teal-soft); border-radius:0 6px 6px 0; padding:10px 14px; font-size:11px; margin-bottom:16px; }
  .callout { border-left:4px solid var(--orange); background:var(--orange-soft); border-radius:0 6px 6px 0; padding:10px 14px; font-size:11.5px; margin:16px 0; }
  .section { margin-bottom:16px; }
  .domain, .risk, .annotation { border:1px solid var(--border); border-radius:10px; padding:14px 16px; margin-bottom:12px; page-break-inside:avoid; background:#fff; }
  .domain-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:8px; }
  .score { color:var(--muted); font-size:11px; font-weight:700; white-space:nowrap; }
  .status { display:inline-block; border-radius:999px; padding:2px 8px; font-size:10px; font-weight:700; margin-left:6px; }
  .status-critical { background:var(--red-soft); color:var(--red); }
  .status-gap { background:var(--orange-soft); color:var(--orange); }
  .status-partial { background:var(--amber-soft); color:var(--amber); }
  .status-compliant { background:var(--green-soft); color:var(--green); }
  .status-neutral { background:#f2f6f8; color:var(--muted); }
  .label { font-weight:700; color:var(--navy); }
  .footer { margin-top:22px; padding-top:12px; border-top:1px solid var(--border); font-size:10px; color:var(--muted); text-align:center; }
</style></head><body><div class="shell">
  <header class="header">
    <img class="logo-img" src="${LOGO_URL}" alt="End User Privacy" />
    <p class="eyebrow">Customized Compliance Assessment</p>
    <h1>CPPA Privacy Risk Assessment</h1>
    ${buildReportMetaLine({ generatedAt: record.created_at || report?.generated_at || Date.now(), jurisdictionLabel: "California (CPPA)" })}
    <div class="summary-bar">
      ${report?.overall_score !== undefined ? `<span class="pill">Overall score: ${text(report.overall_score)} / 100</span>` : ""}
      ${report?.risk_level ? `<span class="pill">${text(report.risk_level)} risk</span>` : ""}
    </div>
  </header>
  <div class="body">
    ${report?.executive_summary ? `<section class="section"><h2>Executive Summary</h2><p>${text(report.executive_summary)}</p></section>` : ""}
    ${Object.keys(scope).length ? `<section class="section"><h2>Scope Confirmation</h2>
      <p><span class="label">In scope:</span> ${text(scope.in_scope)}</p>
      ${scope.threshold_met ? `<p><span class="label">Threshold met:</span> ${text(scope.threshold_met)}</p>` : ""}
      ${Array.isArray(scope.applicable_deadlines) && scope.applicable_deadlines.length ? `<p><span class="label">Applicable deadlines:</span></p>${list(scope.applicable_deadlines)}` : ""}
    </section>` : ""}
    ${enfText(report?.enforcement_context) ? `<div class="callout"><p class="label">Enforcement Context</p><p>${text(enfText(report?.enforcement_context))}</p></div>` : ""}
    ${domains.length ? `<section class="section"><h2>Domain Findings</h2>${domains.map((d: any) => `<article class="domain">
      <div class="domain-head"><h3>${text(d.domain)}${d.status ? `<span class="status status-${statusClass(d.status)}">${text(d.status)}</span>` : ""}</h3>${d.score !== undefined ? `<span class="score">${text(d.score)}/100</span>` : ""}</div>
      ${d.finding ? `<p><span class="label">Finding:</span> ${text(d.finding)}</p>` : ""}
      ${d.regulatory_basis ? `<p><span class="label">Regulatory basis:</span> ${text(d.regulatory_basis)}</p>` : ""}
      ${d.remediation ? `<p><span class="label">Remediation:</span> ${text(d.remediation)}</p>` : ""}
      ${d.priority ? `<p><span class="label">Priority:</span> ${text(d.priority)}</p>` : ""}
      ${renderCppaFsorCompact(d.fsor_commentary)}
    </article>`).join("")}</section>` : ""}
    ${topRisks.length ? `<section class="section"><h2>Top Risks</h2>${topRisks.slice(0, 3).map((r: any) => `<article class="risk"><h3>${text(r.title)}</h3>${r.description ? `<p>${text(r.description)}</p>` : ""}${r.deadline ? `<p><span class="label">Deadline:</span> ${text(r.deadline)}</p>` : ""}${r.consequence ? `<p><span class="label">Consequence:</span> ${text(r.consequence)}</p>` : ""}</article>`).join("")}</section>` : ""}
    ${nextSteps.length ? `<section class="section"><h2>Next Steps</h2><ol>${nextSteps.map((step: any) => `<li>${text(step)}</li>`).join("")}</ol></section>` : ""}
    ${renderCppaSectionCommentary(report?.fsor_section_commentary)}
    ${renderCppaEnforcementPrecedents(Array.isArray(report?.enforcement_precedents) ? report.enforcement_precedents : [])}
    ${annotations.length ? `<section class="section"><h2>Annotation Appendix</h2>${annotations.map((a: any) => `<article class="annotation"><h3>${text(a.regulator || "Enforcement source")}</h3>${a.summary ? `<p>${text(a.summary)}</p>` : ""}${a.relevance ? `<p><span class="label">Relevance:</span> ${text(a.relevance)}</p>` : ""}</article>`).join("")}</section>` : ""}
    <div class="footer">EndUserPrivacy.com · Generated ${text(generatedDate)}</div>
  </div>
</div></body></html>`;
}

// ── D1 enum display mapping (REBUILD-RISK-UI Task 3) ──
// Stored enum values remain unchanged; map at render only.
function displayInsufficientBasisPDF(v?: string): string {
  if (!v) return "";
  if (v === "Insufficient basis to assess" || v === "Insufficient basis") {
    return "Not yet resolved on the record";
  }
  return v;
}
function argStrengthLabelPDF(s?: string): string {
  const x = (s || "").toLowerCase();
  if (x === "strong") return "Strong";
  if (x === "colorable") return "Colorable";
  if (x === "counsel-review" || x === "counsel review") return "Counsel review recommended";
  return s || "";
}

// CPPA-HF6R Task A — render-layer intake-field-id label map. Fail closed:
// route both sides of every conflicting-inputs pair through this map. When
// a field id has no explicit label, emit a generic human-readable
// descriptor — never the raw id. Kept in sync with the HF5 LABELS map in
// run-cppa-risk-assessment/index.ts.
const RISK_INTAKE_FIELD_LABELS: Array<[RegExp, string]> = [
  [/^i5_admt_logic$/i, "the ADMT logic description"],
  [/^q19_admt_description$/i, "the ADMT-system description"],
  [/^q20_admt_opt_out$/i, "the ADMT opt-out description"],
  [/^i5_admt_training_source$/i, "the ADMT-training source"],
  [/^q18b?_admt_training$/i, "the ADMT-training answer"],
  [/^q18[a-c]?_admt(?:_[a-z_]+)?$/i, "the ADMT trigger response"],
  [/^i7_internal_contributors$/i, "the internal-contributors roster"],
  [/^i1b_min_pi$/i, "the minimum-PI justification"],
  [/^i1_processing_purpose$/i, "the processing purpose"],
  [/^i2_retention_period$/i, "the recorded retention period"],
  [/^i2_retention_detail$/i, "the recorded retention detail"],
  [/^i2_retention_criteria$/i, "the recorded retention criteria"],
  [/^i6_vendors$/i, "the vendor roster"],
  [/^q15c_spi_volume$/i, "the sensitive-PI volume figure"],
  [/^q1_revenue$/i, "the recorded revenue"],
  [/^impact_intake(?:\.[a-z_]+)?$/i, "the impact-assessment record"],
  [/^exceptions_intake(?:\.[a-z_]+)?$/i, "the exceptions record"],
];
// Raw-id shape used by the fail-closed guard: intake-field ids match
// /^[a-z]{1,3}\d{1,3}[a-z]?_[a-z][a-z0-9_]{2,}$/i OR /^intake_field_\d+$/i.
const RAW_FIELD_ID_RE = /^([a-z]{1,3}\d{1,3}[a-z]?_[a-z][a-z0-9_]{2,}|intake_field_\d+)$/i;
function labelForIntakeFieldId(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return "";
  for (const [re, label] of RISK_INTAKE_FIELD_LABELS) {
    if (re.test(s)) return label;
  }
  if (RAW_FIELD_ID_RE.test(s)) return "the corresponding intake field";
  return s; // already a human-readable descriptor
}

// Dispatch on schema: v4 rows carry risk_assessment_by_activity; v3 rows carry part_a; legacy rows carry domains.
function buildCPPARiskReportHTML(report: any, record: any): string {
  // ITEM 369 — prose-9 envelope wins the dispatch when (and only when) it is
  // present. The live path never sets `prose_document`, so live PDF output is
  // byte-for-byte unaffected by this branch.
  if (report && hasProse9Document(report)) {
    return buildCPPARiskProse9HTML(report, record);
  }
  // CP3 (Item 240) — LTP-shape detection. When the assembler is the body
  // source, executive_summary is a string, assessment_summary carries a
  // .narrative string, and narrative-list sections carry paragraph
  // strings. Dispatch to the LTP-native renderer in that case.
  if (report && isLtpRiskShape(report)) {
    return buildCPPARiskLtpHTML(report, record);
  }

  if (report && (Array.isArray(report.risk_assessment_by_activity) || (report.assessment_summary && typeof report.assessment_summary === "object"))) {
    return buildCPPARiskV4HTML(report, record);
  }
  if (report && typeof report.part_a === "object" && report.part_a !== null) {
    return buildCPPARiskV3HTML(report, record);
  }
  return buildCPPARiskLegacyHTML(report, record);
}

// ITEM 369 — the prose-9 renderer lives in ./prose9-html.ts (imported at the
// top of this file) so the Phase-2 proof harness can exercise it directly.




function isLtpRiskShape(report: any): boolean {
  if (!report || typeof report !== "object") return false;
  const es = report.executive_summary;
  const as = report.assessment_summary;
  const hasStringExec = typeof es === "string" && es.trim().length > 0;
  const hasNarrativeBag = as && typeof as === "object" && !Array.isArray(as) && typeof as.narrative === "string";
  const hasStringOpening = typeof report.opening_summary === "string" && report.opening_summary.trim().length > 0;
  return hasStringExec || hasNarrativeBag || hasStringOpening;
}

/**
 * CP3 LTP-native CPPA-risk PDF renderer. Consumes the assembler shape
 * declared in _shared/report-contracts/cppa-risk-shape.ts. Every
 * assembler-emitted section renders non-blank; omitted sections
 * degrade gracefully (no <section> element written).
 */

// UPGRADE-2 — PDF twin of src/components/cppa/RiskAnalyticDeliverables.tsx.
// Renders the six § 7152(a) structured deliverables in statutory order, then
// the § 7152(a)(8)-(9) attestation block. Order and labels are kept in lockstep
// with the screen renderer so the two surfaces never diverge.
const RISK_BENEFICIARY_LABELS: Record<string, string> = {
  business: "The business",
  consumer: "Consumers",
  other_stakeholders: "Other stakeholders",
  public: "The public",
};
const RISK_VERDICT_LABELS: Record<string, string> = {
  supported_as_necessary: "Necessary on the record",
  minimisation_candidate: "Not shown necessary — minimisation candidate",
  undetermined_on_the_record: "Record insufficient",
};
const RISK_DECISION_LABELS: Record<string, string> = {
  initiate: "Initiate the processing",
  initiate_with_modifications: "Initiate with modifications",
  restrict: "Restrict the processing",
  prohibit: "Do not initiate the processing",
  reserved_insufficient_record: "Reserved — the record is insufficient to decide",
};
const RISK_OUTWEIGH_LABELS: Record<string, string> = {
  benefits_outweigh: "Benefits outweigh the negative impacts",
  impacts_outweigh: "Negative impacts outweigh the benefits",
  close_balance: "Close balance",
  undetermined_on_the_record: "Undetermined on the record",
};

function buildCPPARiskDeliverablesHTML(report: any): string {
  const t = (v: any) => escHtml(v === null || v === undefined ? "" : String(v));
  const lab = (m: Record<string, string>, v: any) => t(m[String(v ?? "")] ?? String(v ?? "").replace(/_/g, " "));
  const f = (k: string, v: any) =>
    v === undefined || v === null || v === "" ? "" : `<p><span class="label">${t(k)}:</span> ${t(v)}</p>`;
  const raw = (k: string, v: string) => (v ? `<p><span class="label">${t(k)}:</span> ${v}</p>` : "");
  const note = (v: any) => (v ? `<p class="muted"><em>${t(v)}</em></p>` : "");
  const rows = Array.isArray(report?.activity_analytics) ? report.activity_analytics : [];
  if (rows.length === 0) return "";

  const body = rows.map((a: any, i: number) => {
    const nec = Array.isArray(a?.necessity_analysis) ? a.necessity_analysis : [];
    const ben = Array.isArray(a?.benefits) ? a.benefits : [];
    const harm = Array.isArray(a?.harm_causation) ? a.harm_causation : [];
    const safe = Array.isArray(a?.safeguard_map) ? a.safeguard_map : [];
    const weigh = Array.isArray(a?.weighing) ? a.weighing : [];
    const cons = a?.consequence;
    return `<div class="card">
      <h3>${t(a?.activity_name || `Activity ${i + 1}`)}</h3>
      ${f("Purpose", a?.activity_purpose)}
      ${nec.length ? `<h4>§ 7152(a)(2) — Is each element of personal information necessary?</h4>${nec.map((n: any) => `<div class="sub">
        ${f("Element", n?.element)}${f("Purpose served", n?.purpose_served)}
        ${raw("Verdict", lab(RISK_VERDICT_LABELS, n?.verdict))}${f("Why", n?.justification)}${note(n?.information_needed)}
      </div>`).join("")}` : ""}
      ${ben.length ? `<h4>§ 7152(a)(4) — Benefits, by beneficiary</h4>${ben.map((b: any) => `<div class="sub">
        ${raw("Beneficiary", lab(RISK_BENEFICIARY_LABELS, b?.beneficiary_class))}${f("Benefit", b?.benefit)}
        ${f("Supporting record fact", b?.supporting_record_fact)}${note(b?.information_needed)}
      </div>`).join("")}` : ""}
      ${harm.length ? `<h4>§ 7152(a)(5) — Negative impacts: source, cause and pathway</h4>${harm.map((h: any) => `<div class="sub">
        ${f("Harm", `${h?.harm_label ?? ""} (${h?.harm_pinpoint ?? ""})`)}
        ${h?.harm_verbatim ? `<blockquote>${t(h.harm_verbatim)}</blockquote>` : ""}
        ${f("Data involved", h?.data_involved)}${f("Actor", h?.actor)}${f("Pathway", h?.pathway)}
        ${f("Source", h?.source)}${f("Cause", h?.cause)}${note(h?.information_needed)}
      </div>`).join("")}` : ""}
      ${safe.length ? `<h4>§ 7152(a)(6) — Safeguards and the risk that remains</h4>${safe.map((s: any) => `<div class="sub">
        ${f("Safeguard", s?.safeguard)}
        ${f("Impacts addressed", Array.isArray(s?.harm_ids) ? s.harm_ids.join(", ") : s?.harm_id)}
        ${f("Residual risk", s?.residual_statement)}${note(s?.information_needed)}
      </div>`).join("")}` : ""}
      ${weigh.length ? `<h4>§ 7152(a) · § 7154(a) — The weighing</h4>${weigh.map((w: any) => `<div class="sub">
        ${raw("Beneficiary", lab(RISK_BENEFICIARY_LABELS, w?.beneficiary_class))}
        ${f("The case for", w?.case_for)}${f("The case against", w?.case_against)}
        ${raw("Determination", lab(RISK_OUTWEIGH_LABELS, w?.outweigh_determination))}
        ${f("Reasoning", w?.reasoning)}${note(w?.information_needed)}
      </div>`).join("")}` : ""}
      ${cons ? `<h4>§ 7152(a)(7) — Consequence</h4><div class="sub">
        ${raw("Decision", lab(RISK_DECISION_LABELS, cons?.decision))}
        ${Array.isArray(cons?.reasons) && cons.reasons.length ? `<ul>${cons.reasons.map((r: any) => `<li>${t(r)}</li>`).join("")}</ul>` : ""}
        ${Array.isArray(cons?.modifications) && cons.modifications.length ? `<p class="label">Modifications</p><ul>${cons.modifications.map((m: any) => `<li>${t(m?.modification)} — <em>addresses:</em> ${t(m?.addresses_risk)}</li>`).join("")}</ul>` : ""}
        ${note(cons?.information_needed)}
      </div>` : ""}
    </div>`;
  }).join("");

  return `<section><h2>The § 7152(a) analysis, activity by activity</h2>${body}</section>`;
}

function buildCPPARiskAttestationHTML(report: any): string {
  const t = (v: any) => escHtml(v === null || v === undefined ? "" : String(v));
  const b = report?.attestation_block;
  if (!b || typeof b !== "object") return "";
  const providers = Array.isArray(b.information_providers) ? b.information_providers : [];
  const approvers = Array.isArray(b.approvers) ? b.approvers : [];
  const hasAny = providers.length || approvers.length || b.review_date || b.approval_date ||
    b.approval_authority_requirement || b.text;
  if (!hasAny) return "";
  return `<section><h2>Who provided the information, and who reviewed and approved this assessment</h2>
    <p><span class="label">Information providers (§ 7152(a)(8)):</span> ${providers.length ? t(providers.join("; ")) : "Not stated on the record"}</p>
    ${b.legal_counsel_excluded ? `<p class="muted">Legal counsel is excluded from this list, as § 7152(a)(8) requires.</p>` : ""}
    <p><span class="label">Date reviewed:</span> ${t(b.review_date || "Not stated on the record")}</p>
    <p><span class="label">Date approved:</span> ${t(b.approval_date || "Not stated on the record")}</p>
    <p><span class="label">Approvers (§ 7152(a)(9)):</span> ${approvers.length ? t(approvers.map((a: any) => `${a?.name ?? ""} — ${a?.position ?? ""}`).join("; ")) : "Not stated on the record"}</p>
    ${b.approval_authority_requirement ? `<p>${t(b.approval_authority_requirement)}</p>` : ""}
    ${b.text ? `<p>${t(b.text)}</p>` : ""}
    ${b.information_needed ? `<p class="muted"><em>${t(b.information_needed)}</em></p>` : ""}
  </section>`;
}

function buildCPPARiskLtpHTML(report: any, record: any): string {
  const text = (v: any) => escHtml(v === null || v === undefined ? "" : String(v));
  const para = (v: string) => `<p>${text(v).replace(/\n+/g, "</p><p>")}</p>`;
  const summary = (report.assessment_summary && typeof report.assessment_summary === "object") ? report.assessment_summary : {};
  const meta = (report.document_metadata && typeof report.document_metadata === "object") ? report.document_metadata : {};
  const orgName = summary.company_name || record?.intake_data?.org_context?.company_name || "";
  const opening = coerceNarrativeScalar(report.opening_summary);
  // ITEM 428 — the three summary-class sections render through the extracted
  // module (the byte-identity proof renders THE REAL PATH).

  const scopeConf = coerceNarrativeList(report.scope_confirmation);
  const scopeTrig = coerceNarrativeList(report.scope_and_triggers);
  const nextSteps = coerceNarrativeList(report.next_steps);
  const strengthen = coerceNarrativeList(report.strengthen_items);
  const infoNeeded = coerceNarrativeList(report.information_needed);
  const generatedDate = new Date(record?.created_at || Date.now()).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  // ITEM 244 (E3) — customer-first section headers sourced from
  // CPPA_RISK_HEADER_MAP (single source of truth shared with composers).
  const listSection = (sectionKey: string, fallbackTitle: string, items?: readonly string[]) =>
    items && items.length
      ? `<section><h2>${text(headerForSection(sectionKey, fallbackTitle))}</h2>${items.map((s) => `<div class="card">${para(s)}</div>`).join("")}</section>`
      : "";
  // Processing Narrative (L1) — new customer-facing section.
  const processingNarrative = coerceNarrativeList((report as Record<string, unknown>).processing_narrative);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CPPA Privacy Risk Assessment</title>
<style>
  :root { --navy:#0c2a44; --ink:#1a1916; --paper:#f5f8fa; --card:#fff; --border:#dde5ea; --muted:#5c6d7a; --teal:#2d9b90; --teal-soft:#e5f4f2; }
  * { box-sizing:border-box; }
  body { font-family:'Georgia','Times New Roman',serif; color:var(--ink); background:var(--paper); font-size:11pt; line-height:1.55; margin:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .shell { background:var(--card); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
  .header { background:var(--navy); color:#fff; padding:24px 28px; }
  .logo-img { display:block; height:34px; width:auto; margin-bottom:12px; object-fit:contain; }
  .eyebrow { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.14em; color:#93b5c6; margin:0 0 4px; }
  h1 { font-size:24px; margin:0; line-height:1.2; }
  .meta { margin-top:6px; font-size:11px; color:#cbd5e1; }
  .body { padding:22px 28px 28px; }
  h2 { color:var(--navy); font-size:17px; margin:24px 0 10px; border-bottom:1px solid var(--border); padding-bottom:6px; }
  p { margin:0 0 10px; }
  .notice { border-left:4px solid var(--teal); background:var(--teal-soft); border-radius:0 6px 6px 0; padding:10px 14px; font-size:11px; margin-bottom:16px; }
  .card { border:1px solid var(--border); border-radius:10px; padding:14px 16px; margin-bottom:12px; page-break-inside:avoid; background:#fff; }
  .label { font-weight:700; color:var(--navy); }
  .opening { font-size:12pt; color:var(--navy); font-style:italic; margin-bottom:14px; }
  h3 { color:var(--navy); font-size:14px; margin:14px 0 6px; }
  h4 { color:var(--navy); font-size:12px; margin:12px 0 4px; }
  .sub { border-left:2px solid var(--border); padding-left:10px; margin-bottom:8px; }
  .muted { color:var(--muted); font-size:10px; }
  blockquote { border-left:2px solid var(--border); margin:4px 0 4px 10px; padding-left:10px; color:var(--muted); font-size:10px; }
  ${AUTHORITY_EXHIBIT_CSS}
  ${RECORD_SUFFICIENCY_TABLE_CSS}
  ${FACT_STRIP_CSS}
  .footer { margin-top:22px; padding-top:12px; border-top:1px solid var(--border); font-size:10px; color:var(--muted); text-align:center; }
</style></head><body><div class="shell">
  <header class="header">
    <img class="logo-img" src="${LOGO_URL}" alt="End User Privacy" />
    <p class="eyebrow">Customized Compliance Assessment</p>
    <h1>CPPA Privacy Risk Assessment</h1>
    ${buildReportMetaLine({ generatedAt: record?.created_at || Date.now(), jurisdictionLabel: "California (CPPA)", organizationName: orgName })}
  </header>
  <div class="body">
    ${opening ? `<section><div class="opening">${para(opening)}</div></section>` : ""}
    ${renderExecutiveSummarySectionHtml(report)}
    ${renderAssessmentSummarySectionHtml(report)}

    ${listSection("scope_and_triggers", "Scope & Triggers", scopeTrig || scopeConf)}
    ${listSection("processing_narrative", "How the business processes personal information", processingNarrative)}
    ${renderActivityAnalysisSectionHtml(report)}
    ${buildCPPARiskDeliverablesHTML(report)}
    ${renderExceptionAnalysisSectionHtml(report)}
    ${renderPriorityActionsSectionHtml(report)}
    ${listSection("next_steps", "Next Steps", nextSteps)}
    ${listSection("strengthen_items", "What Would Strengthen the Record", strengthen)}
    ${listSection("information_needed", "Items for Your Review", infoNeeded)}
    ${renderRecordSufficiencySectionHtml(report)}
    ${renderSubmissionSummarySectionHtml(report)}
    ${renderSubmissionAndRetentionSectionHtml(report)}
    ${buildCPPARiskAttestationHTML(report)}
    ${renderAuthorityExhibitHtml(report?.authority_exhibit)}
    <div class="footer">EndUserPrivacy.com · Generated ${text(generatedDate)}${meta.build_stamp ? ` · build ${text(meta.build_stamp)}` : ""}</div>
  </div>
</div></body></html>`;
}


function buildCPPARiskV4HTML(report: any, record: any): string {
  const generatedDate = new Date(record?.created_at || report?.generated_at || Date.now()).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const text = (v: any) => escHtml(v === null || v === undefined ? "" : String(v));
  const para = (v: any) => `<p>${text(v).replace(/\n+/g, "</p><p>")}</p>`;
  const list = (items: any[]) =>
    Array.isArray(items) && items.length
      ? `<ul>${items.map((i) => `<li>${text(typeof i === "string" ? i : JSON.stringify(i))}</li>`).join("")}</ul>`
      : "";
  const summary = report.assessment_summary || {};
  const scope = report.scope_and_triggers || {};
  // ITEM 427 — five-shape tolerance: strings, legacy eleven-leaf objects and
  // canonical thirteen-leaf records all reach this table; empty/absent render nothing.
  const activityView = coerceActivityView(report.risk_assessment_by_activity);
  const activities: any[] = [
    ...activityView.texts.map((t: string) => ({ __prose: t })),
    ...activityView.rows,
  ];
  // ITEM 426 — five-shape tolerance: strings, legacy objects and canonical
  // nine-leaf records all reach this table; the empty/absent states render nothing.
  const exceptionView = coerceExceptionView(report.exception_analysis);
  const exceptions: any[] = [
    ...exceptionView.texts.map((t: string) => ({ __prose: t })),
    ...exceptionView.rows,
  ];
  // QB-P25 B3 — sort priority actions by rank (1 = highest); missing ranks sink last.
  // ITEM 420 — dual-read: string elements become { action } records so the
  // object-shaped layout below never drops a legacy entry.
  const actionsRaw = (coerceActionList(report.priority_actions) ?? []).map(
    (i: any) => i.record ?? { action: i.text },
  );
  const actions = sortByRank(actionsRaw as any[]);
  // QB-P25 B3 — lookup for strengthen_item_ids pointer resolution.
  const strengthenItemsMap: Record<string, any> = {};
  for (const it of (Array.isArray(report.strengthen_items) ? report.strengthen_items : [])) {
    if (it && typeof it === "object" && typeof it.item_id === "string") strengthenItemsMap[it.item_id] = it;
  }
  const flags = Array.isArray(report.inconsistency_flags) ? report.inconsistency_flags : [];
  const enf = report.enforcement_context || {};
  const xrec = report.cross_tool_recommendations || {};
  const meta = report.document_metadata || {};
  const orgName = summary.company_name || record?.intake_data?.org_context?.company_name || "";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CPPA Privacy Risk Assessment</title>
<style>
  :root { --navy:#0c2a44; --ink:#1a1916; --paper:#f5f8fa; --card:#fff; --border:#dde5ea; --muted:#5c6d7a; --teal:#2d9b90; --teal-soft:#e5f4f2; --orange:#1a4a6e; --orange-soft:#eef4f7; --red:#0d2a45; --red-soft:#e8eff2; }
  * { box-sizing:border-box; }
  body { font-family:'Georgia','Times New Roman',serif; color:var(--ink); background:var(--paper); font-size:11pt; line-height:1.5; margin:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .shell { background:var(--card); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
  .header { background:var(--navy); color:#fff; padding:24px 28px; }
  .logo-img { display:block; height:34px; width:auto; margin-bottom:12px; object-fit:contain; }
  .eyebrow { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.14em; color:#93b5c6; margin:0 0 4px; }
  h1 { font-size:24px; margin:0; line-height:1.2; }
  .meta { margin-top:6px; font-size:11px; color:#cbd5e1; }
  .summary-bar { margin-top:14px; display:flex; gap:8px; flex-wrap:wrap; }
  .pill { display:inline-block; border-radius:999px; padding:4px 10px; font-size:11px; font-weight:700; background:rgba(255,255,255,.12); color:#fff; }
  .body { padding:22px 28px 28px; }
  h2 { color:var(--navy); font-size:17px; margin:24px 0 10px; border-bottom:1px solid var(--border); padding-bottom:6px; }
  h3 { color:var(--navy); font-size:14px; margin:0 0 8px; }
  p { margin:0 0 9px; }
  .notice { border-left:4px solid var(--teal); background:var(--teal-soft); border-radius:0 6px 6px 0; padding:10px 14px; font-size:11px; margin-bottom:16px; }
  .callout { border-left:4px solid var(--orange); background:var(--orange-soft); border-radius:0 6px 6px 0; padding:10px 14px; font-size:11.5px; margin:14px 0; }
  .card { border:1px solid var(--border); border-radius:10px; padding:14px 16px; margin-bottom:12px; page-break-inside:avoid; background:#fff; }
  .label { font-weight:700; color:var(--navy); }
  .pri { display:inline-block; border-radius:999px; padding:2px 8px; font-size:10px; font-weight:700; margin-left:6px; background:var(--red-soft); color:var(--red); }
  .pri-medium { background:var(--orange-soft); color:var(--orange); }
  .pri-low { background:var(--teal-soft); color:var(--teal); }
  .footer { margin-top:22px; padding-top:12px; border-top:1px solid var(--border); font-size:10px; color:var(--muted); text-align:center; }
  table.harm { width:100%; border-collapse:collapse; margin-top:6px; font-size:10.5pt; }
  table.harm th, table.harm td { border:1px solid var(--border); padding:6px 8px; vertical-align:top; text-align:left; }
  table.harm th { background:#f8fafc; color:var(--navy); }
</style></head><body><div class="shell">
  <header class="header">
    <img class="logo-img" src="${LOGO_URL}" alt="End User Privacy" />
    <p class="eyebrow">Customized Compliance Assessment</p>
    <h1>CPPA Privacy Risk Assessment</h1>
    ${buildReportMetaLine({ generatedAt: record?.created_at || report?.generated_at || Date.now(), jurisdictionLabel: "California (CPPA)", organizationName: orgName })}
    <div class="summary-bar">
      ${summary.overall_risk_level ? `<span class="pill">${text(displayInsufficientBasisPDF(summary.overall_risk_level))} risk</span>` : ""}
      ${summary.sector ? `<span class="pill">${text(summary.sector)}</span>` : ""}
      ${summary.admt_disclosure_required ? `<span class="pill">ADMT disclosure required</span>` : ""}
      ${summary.cybersecurity_audit_required ? `<span class="pill">Cybersecurity audit required</span>` : ""}
    </div>
  </header>
  <div class="body">

    <section><h2>Assessment Summary</h2>
      ${summary.company_name ? `<p><span class="label">Company:</span> ${text(summary.company_name)}</p>` : ""}
      ${summary.assessment_date ? `<p><span class="label">Assessment date:</span> ${text(summary.assessment_date)}</p>` : ""}
      ${summary.exceptions_status ? `<p><span class="label">Exceptions:</span> ${text(displayInsufficientBasisPDF(summary.exceptions_status === "Material gaps identified" ? "Material deficiencies identified" : summary.exceptions_status))}</p>` : ""}
      ${Array.isArray(summary.triggered_activities) && summary.triggered_activities.length ? `<p><span class="label">Triggered activities:</span></p>${list(summary.triggered_activities)}` : ""}
      ${summary.corpus_enforcement_note ? `<div class="callout"><p class="label">Enforcement context note</p>${para(summary.corpus_enforcement_note)}</div>` : ""}
    </section>

    ${scope.scope_notes || (Array.isArray(scope.triggered_activities_detail) && scope.triggered_activities_detail.length) ? `<section><h2>Scope &amp; Triggers</h2>
      ${scope.scope_notes ? para(scope.scope_notes) : ""}
      ${(Array.isArray(scope.triggered_activities_detail) ? scope.triggered_activities_detail : []).map((t: any) => `<div class="card">
        <h3>${text(t.activity || "")}</h3>
        ${t.statutory_basis ? `<p><span class="label">Statutory basis:</span> ${text(t.statutory_basis)}</p>` : ""}
        ${Array.isArray(t.data_categories) && t.data_categories.length ? `<p><span class="label">Data categories:</span> ${text(t.data_categories.join(", "))}</p>` : ""}
        ${Array.isArray(t.consumer_categories) && t.consumer_categories.length ? `<p><span class="label">Consumer categories:</span> ${text(t.consumer_categories.join(", "))}</p>` : ""}
        ${t.assessment_required_rationale ? `<p><span class="label">Rationale:</span> ${text(t.assessment_required_rationale)}</p>` : ""}
      </div>`).join("")}
    </section>` : ""}

    ${activities.length ? `<section><h2>Risk Assessment by Activity</h2>
      ${activities.map((a: any) => typeof a?.__prose === "string" ? `<div class="card">${para(a.__prose)}</div>` : `<div class="card">
        <h3>${text(a.activity || a.activity_name || "")}</h3>
        ${a.purpose ? `<p><span class="label">Purpose:</span> ${text(a.purpose)}</p>` : ""}
        ${a.statutory_basis ? `<p><span class="label">Statutory basis:</span> ${text(a.statutory_basis)}</p>` : ""}
        ${a.section_7153_mapping ? `<p><span class="label">§ 7153 mapping:</span> ${text(a.section_7153_mapping)}</p>` : ""}
        ${Array.isArray(a.section_7152_mapping) && a.section_7152_mapping.length ? `<p class="label">Where this sits in § 7152(a)</p><ul>${a.section_7152_mapping.map((m: any) => `<li>${text(m?.element || "")} — ${text(m?.pinpoint || "")}</li>`).join("")}</ul>` : ""}
        ${a.current_safeguards ? `<p><span class="label">Current safeguards:</span> ${text(a.current_safeguards)}</p>` : ""}
        ${a.safeguard_gaps ? `<p><span class="label">Safeguard deficiencies:</span> ${text(a.safeguard_gaps)}</p>` : ""}
        ${a.benefits_to_business ? `<p><span class="label">Business benefits:</span> ${text(a.benefits_to_business)}</p>` : ""}
        ${a.benefits_to_consumers ? `<p><span class="label">Consumer benefits:</span> ${text(a.benefits_to_consumers)}</p>` : ""}
        ${a.benefits_to_other_stakeholders ? `<p><span class="label">Benefits to other stakeholders:</span> ${text(a.benefits_to_other_stakeholders)}</p>` : ""}
        ${a.benefits_to_public ? `<p><span class="label">Benefits to the public:</span> ${text(a.benefits_to_public)}</p>` : ""}
        ${Array.isArray(a.adverse_effects) && a.adverse_effects.length ? `<p class="label" style="margin-top:8px;">Adverse effects</p>
          <table class="harm"><thead><tr><th>Harm</th><th>Severity</th><th>Likelihood</th><th>Description</th></tr></thead><tbody>
          ${a.adverse_effects.map((h: any) => `<tr><td>${text(h.harm_type || "")}</td><td>${text(h.severity || "")}</td><td>${text(h.likelihood || "")}</td><td>${text(h.description || "")}</td></tr>`).join("")}
          </tbody></table>` : ""}
        ${a.benefits_outweigh_risks_conclusion ? `<p style="margin-top:8px;"><span class="label">Benefits outweigh risks:</span> ${text(a.benefits_outweigh_risks_conclusion)}</p>` : ""}
        ${a.benefits_outweigh_risks_rationale ? `<p>${text(a.benefits_outweigh_risks_rationale)}</p>` : ""}
      </div>`).join("")}
    </section>` : ""}

    ${exceptions.length ? `<section><h2>Exception Analysis</h2>
      ${exceptions.map((e: any) => {
        if (typeof e?.__prose === "string") return `<div class="card">${para(e.__prose)}</div>`;
        const resolvedStrengthen: any[] = Array.isArray(e.strengthen_item_ids)
          ? e.strengthen_item_ids.map((id: string) => strengthenItemsMap[id]).filter(Boolean)
          : [];
        const hasNew = !!(e.facts_supporting || e.argument_strength || (Array.isArray(e.strengthen_position) && e.strengthen_position.length) || resolvedStrengthen.length);
        const hasOld = !!(e.documentation_status || e.validity_assessment || e.scope_described || e.safeguards_described);
        const argLbl = argStrengthLabelPDF(e.argument_strength);
        const argHeader = argLbl === "Counsel review recommended"
          ? "Counsel review recommended"
          : (argLbl ? `Argument strength: ${argLbl}` : "");
        return `<div class="card">
        <h3>${text(e.exception_name || "")}</h3>
        <p><span class="label">Claimed:</span> ${e.claimed ? "Yes" : "No"}</p>
        ${e.statutory_basis ? `<p><span class="label">Statutory basis:</span> ${text(e.statutory_basis)}</p>` : ""}
        ${hasNew ? `
          ${e.facts_supporting ? `<p><span class="label">Facts supporting the exception:</span> ${text(e.facts_supporting)}</p>` : ""}
          ${argHeader ? `<p><span class="label">${text(argHeader)}</span>${e.argument_strength_rationale ? ` — ${text(e.argument_strength_rationale)}` : ""}</p>` : ""}
          ${(resolvedStrengthen.length || (Array.isArray(e.strengthen_position) && e.strengthen_position.length))
            ? `<p class="label" style="margin-top:6px;">What would strengthen the position</p><ul>${
                resolvedStrengthen.map((it: any) => `<li>${text(it.recorded_basis || it.item_id || "")}${it.citation ? ` <span class="label">${text(it.citation)}</span>` : ""}${Array.isArray(it.field_ids) && it.field_ids.length ? ` — fields: ${text(it.field_ids.join(", "))}` : ""}</li>`).join("")
                + (Array.isArray(e.strengthen_position) ? e.strengthen_position.map((sp: any) => `<li>${text(sp)}</li>`).join("") : "")
              }</ul>`
            : ""}
        ` : (hasOld ? `
          ${e.scope_described ? `<p><span class="label">Scope:</span> ${text(e.scope_described)}</p>` : ""}
          ${e.safeguards_described ? `<p><span class="label">Safeguards:</span> ${text(e.safeguards_described)}</p>` : ""}
          ${e.documentation_status ? `<p><span class="label">Documentation:</span> ${text(e.documentation_status)}</p>` : ""}
          ${e.validity_assessment ? `<p><span class="label">Validity:</span> ${text(e.validity_assessment)}</p>` : ""}
        ` : "")}
        ${Array.isArray(e.flags) && e.flags.length ? list(e.flags) : ""}
      </div>`;
      }).join("")}
    </section>` : ""}

    ${actions.length ? `<section><h2>Priority Actions</h2>
      ${actions.map((a: any) => {
        const p = String(a.priority || "").toLowerCase();
        const cls = p === "medium" ? "pri pri-medium" : p === "low" ? "pri pri-low" : "pri";
        return `<div class="card"><h3>${text(a.action || "")}<span class="${cls}">${text(a.priority || "")}</span></h3>
          ${a.deadline ? `<p><span class="label">Deadline:</span> ${text(a.deadline)}</p>` : ""}
          ${a.statutory_basis ? `<p><span class="label">Statutory basis:</span> ${text(a.statutory_basis)}</p>` : ""}
        </div>`;
      }).join("")}
    </section>` : ""}

    ${flags.length ? `<section><h2>Inconsistencies to Resolve</h2>
      ${flags.map((f: any) => `<div class="card">
        ${f.description ? `<p>${text(f.description)}</p>` : ""}
        ${f.intake_field_1 || f.intake_field_2 ? `<p><span class="label">Conflicting inputs:</span> ${text([f.intake_field_1, f.intake_field_2].filter(Boolean).map(labelForIntakeFieldId).join(" ↔ "))}</p>` : ""}
        ${f.regulatory_citation ? `<p><span class="label">Citation:</span> ${text(f.regulatory_citation)}</p>` : ""}
        ${f.resolution_required ? `<p><span class="label">Resolution:</span> ${text(f.resolution_required)}</p>` : ""}
      </div>`).join("")}
    </section>` : ""}

    ${(enf.relevant_precedents || enf.sector_specific_patterns || enf.audit_division_priorities) ? `<section><h2>Enforcement Context</h2>
      ${enf.relevant_precedents ? `<div class="card"><h3>Relevant precedents</h3>${para(enf.relevant_precedents)}</div>` : ""}
      ${enf.sector_specific_patterns ? `<div class="card"><h3>Sector-specific patterns</h3>${para(enf.sector_specific_patterns)}</div>` : ""}
      ${enf.audit_division_priorities ? `<div class="card"><h3>Audit division priorities</h3>${para(enf.audit_division_priorities)}</div>` : ""}
    </section>` : ""}

    ${(xrec.admt_assessment || xrec.cybersecurity_audit || xrec.admt_assessment_rationale || xrec.cybersecurity_audit_rationale) ? `<section><h2>Cross-Tool Recommendations</h2>
      ${xrec.admt_assessment_rationale ? `<div class="card"><h3>ADMT assessment ${xrec.admt_assessment ? "(recommended)" : ""}</h3>${para(xrec.admt_assessment_rationale)}</div>` : ""}
      ${xrec.cybersecurity_audit_rationale ? `<div class="card"><h3>Cybersecurity audit ${xrec.cybersecurity_audit ? "(recommended)" : ""}</h3>${para(xrec.cybersecurity_audit_rationale)}</div>` : ""}
    </section>` : ""}

    <div class="footer">EndUserPrivacy.com · Generated ${text(generatedDate)}${meta.assessment_version ? ` · v${text(meta.assessment_version)}` : ""}</div>
  </div>
</div></body></html>`;
}

function buildCPPARiskV3HTML(report: any, record: any): string {
  const a = report.part_a || {};
  const b = report.part_b || {};
  const gating = report.gating || {};
  const cover = a.cover || {};
  const text = (v: any) => escHtml(v === null || v === undefined ? "" : String(v));
  const textJoin = (v: any) => Array.isArray(v)
    ? escHtml(
        v
          .filter((x) => x !== null && x !== undefined)
          .map((x) => {
            if (x !== null && typeof x === "object") {
              return String(
                (x as any).name ?? (x as any).vendor_name ?? (x as any).label ??
                (x as any).title ?? (x as any).company ?? JSON.stringify(x)
              );
            }
            return String(x);
          })
          .filter((s) => s.trim() !== "" && s !== "{}" && s !== "null")
          .join("; ")
      )
    : text(v);
  const capLabel = (k: string) => {
    const overrides: Record<string, string> = {
      humanReview: "Human review",
      human_review: "Human review",
      spi_categories: "SPI categories",
      "Spi categories": "SPI categories",
      spi_statement: "SPI statement",
      "Spi statement": "SPI statement",
    };
    if (overrides[k]) return overrides[k];
    const s = k.replace(/_/g, " ");
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  };
  const generatedDate = new Date(record.created_at || report?.generated_at || Date.now()).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const list = (items: any[]) => Array.isArray(items) && items.length
    ? `<ul>${items.map((i) => `<li>${text(i)}</li>`).join("")}</ul>` : "";
  const fillIn = (v: any, fallback = "[TO BE COMPLETED]") => {
    const s = v === null || v === undefined ? "" : String(v);
    return s.trim() ? text(s) : `<em>${fallback}</em>`;
  };
  const guidance = (v: any) => v
    ? `<p style="font-size:10px;color:#5c5a54;border-left:3px solid #e6e3da;padding-left:8px;margin-top:8px;"><strong>Guidance:</strong> ${text(v)}</p>`
    : "";
  const sectionHead = (num: string, title: string, statute: any) =>
    `<h2>§ ${num} — ${title}${statute ? ` <span style="font-size:10px;font-weight:400;color:#5c5a54;">(${text(statute)})</span>` : ""}</h2>`;
  const validatorChip = (v: any) => v?.status === "fail"
    ? `<span class="status status-gap">specificity check failed — edit before sign-off</span>` : "";
  const s1 = a.sec_1_trigger || {};
  const s2 = a.sec_2_purpose || {};
  const s3 = a.sec_3_pi_inventory || {};
  const piRows = (Array.isArray(s3.pi_categories) ? s3.pi_categories : [])
    .map((c: any) => `<tr><td style="padding:4px 10px;border:1px solid #e6e3da;">${text(c.category)}</td><td style="padding:4px 10px;border:1px solid #e6e3da;text-align:center;">${c.is_spi ? "SPI — § 7001(bbb)" : "PI"}</td></tr>`)
    .join("");
  const s4 = a.sec_4_operations || {};
  const opRow = (label: string, v: any) => (v !== undefined && v !== null && (Array.isArray(v) ? v.length : String(v).trim()))
    ? `<p><span class="label">${label}:</span> ${textJoin(v)}</p>` : "";
  const admt = s4.g_admt && typeof s4.g_admt === "object" ? s4.g_admt : null;
  const s5 = a.sec_5_benefits || {};
  const s6harms = Array.isArray(a.sec_6_harms?.harms) ? a.sec_6_harms.harms : [];
  const s7 = a.sec_7_safeguards || {};
  const sgGroup = (label: string, items: any[]) => Array.isArray(items) && items.length
    ? `<h3 style="margin-top:12px;">${label}</h3>${items.map((sg: any) => `<article class="domain"><p><span class="label">${text(sg.name)}</span>${Array.isArray(sg.linked_harms) && sg.linked_harms.length ? ` <span style="font-size:10px;color:#5c5a54;">→ addresses: ${sg.linked_harms.map((h: any) => text(h)).join(", ")}</span>` : ""}</p>${sg.description ? `<p>${text(sg.description)}</p>` : ""}</article>`).join("")}` : "";
  const s8 = a.sec_8_decision || {};
  const s9 = a.sec_9_stakeholders || {};
  const people = (items: any[]) => Array.isArray(items) && items.length
    ? `<ul>${items.map((p: any) => `<li>${text(p.role)}: ${fillIn(p.name, "[FILL IN]")}</li>`).join("")}</ul>` : "<p><em>None recorded.</em></p>";
  const s10 = a.sec_10_governance || {};
  const app = a.appendices || {};
  const vendorRows = (Array.isArray(app.b_vendor_register) ? app.b_vendor_register : [])
    .map((v: any) => `<tr>
      <td style="padding:4px 10px;border:1px solid #e6e3da;">${text(v.vendor)}</td>
      <td style="padding:4px 10px;border:1px solid #e6e3da;">${text(v.role)}</td>
      <td style="padding:4px 10px;border:1px solid #e6e3da;">${Array.isArray(v.pi_categories) ? v.pi_categories.map((c: any) => text(c)).join(", ") : text(v.pi_categories)}</td>
      <td style="padding:4px 10px;border:1px solid #e6e3da;">${text(v.purpose ?? "")}</td>
    </tr>`)
    .join("");
  const gatingBlock = gating.ready_for_signoff
    ? `<div class="callout" style="border-left-color:#1e6b3c;background:#eafaf1;"><p class="label">Ready for sign-off</p><p>All automated completeness checks passed. The certifying executive must still review and record the decision in § 8.</p></div>`
    : `<div class="callout"><p class="label">Not yet ready for sign-off</p>${list(Array.isArray(gating.blockers) ? gating.blockers : [])}</div>`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${a?.sec_1_trigger?.voluntary ? "Voluntary Privacy Impact Review" : "CPPA Privacy Risk Assessment"}</title>
<style>
  :root { --navy:#0c2a44; --ink:#1a1916; --paper:#f5f8fa; --card:#ffffff; --border:#dde5ea; --muted:#5c6d7a; --teal:#2d9b90; --teal-soft:#e5f4f2; --red:#0d2a45; --red-soft:#e8eff2; --orange:#1a4a6e; --orange-soft:#eef4f7; --amber:#24606c; --amber-soft:#eaf2f5; --green:#1c6960; --green-soft:#e5f4f2; }
  * { box-sizing:border-box; }
  body { font-family:'Georgia','Times New Roman',serif; color:var(--ink); background:var(--paper); font-size:11pt; line-height:1.5; margin:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .shell { background:var(--card); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
  .header { background:var(--navy); color:#fff; padding:24px 28px; }
  .logo-img { display:block; height:34px; width:auto; margin-bottom:12px; object-fit:contain; }
  .eyebrow { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.14em; color:#93b5c6; margin:0 0 4px; }
  h1 { font-size:24px; margin:0; line-height:1.2; }
  .meta { margin-top:6px; font-size:11px; color:#cbd5e1; }
  .summary-bar { margin-top:14px; display:flex; gap:8px; flex-wrap:wrap; }
  .pill { display:inline-block; border-radius:999px; padding:4px 10px; font-size:11px; font-weight:700; background:rgba(255,255,255,.12); color:#fff; }
  .body { padding:22px 28px 28px; }
  h2 { color:var(--navy); font-size:17px; margin:24px 0 10px; border-bottom:1px solid var(--border); padding-bottom:6px; }
  h3 { color:var(--navy); font-size:14px; margin:0 0 8px; }
  p { margin:0 0 9px; }
  ul, ol { margin:8px 0 0; padding-left:20px; } li { margin-bottom:5px; }
  table { border-collapse:collapse; width:100%; font-size:10.5pt; margin:8px 0; }
  th { background:#f3f4f6; text-align:left; padding:4px 10px; border:1px solid var(--border); }
  .notice { border-left:4px solid var(--teal); background:var(--teal-soft); border-radius:0 6px 6px 0; padding:10px 14px; font-size:11px; margin-bottom:16px; }
  .callout { border-left:4px solid var(--orange); background:var(--orange-soft); border-radius:0 6px 6px 0; padding:10px 14px; font-size:11.5px; margin:16px 0; }
  .section { margin-bottom:16px; }
  .domain, .risk { border:1px solid var(--border); border-radius:10px; padding:14px 16px; margin-bottom:12px; page-break-inside:avoid; background:#fff; }
  .status { display:inline-block; border-radius:999px; padding:2px 8px; font-size:10px; font-weight:700; margin-left:6px; }
  .status-gap { background:var(--orange-soft); color:var(--orange); }
  .label { font-weight:700; color:var(--navy); }
  .attest { border:1px solid var(--border); border-radius:10px; padding:16px; background:#fff; font-size:11pt; margin-top:10px; }
  .footer { margin-top:22px; padding-top:12px; border-top:1px solid var(--border); font-size:10px; color:var(--muted); text-align:center; }
</style></head><body><div class="shell">
  <header class="header">
    <img class="logo-img" src="${LOGO_URL}" alt="End User Privacy" />
    <p class="eyebrow">${a?.sec_1_trigger?.voluntary ? "Voluntary Privacy Review · Governance Documentation" : "Compliance Tool · Cal. Code Regs. tit. 11 §§ 7150–7157"}</p>
    <h1>${a?.sec_1_trigger?.voluntary ? "Voluntary Privacy Impact Review" : "CPPA Privacy Risk Assessment"}</h1>
    ${buildReportMetaLine({ generatedAt: record.created_at || report?.generated_at || Date.now(), jurisdictionLabel: "California (CPPA)" })}
    <div class="summary-bar">
      ${cover.business_legal_name ? `<span class="pill">${text(cover.business_legal_name)}</span>` : ""}
      ${cover.activity_name ? `<span class="pill">${text(cover.activity_name)}</span>` : ""}
      ${cover.version ? `<span class="pill">v${text(cover.version)}</span>` : ""}
    </div>
  </header>
  <div class="body">
    <section class="section"><h2>Cover — Assessment Record</h2>
      <p><span class="label">Business legal name:</span> ${fillIn(cover.business_legal_name, "[FILL IN]")}</p>
      <p><span class="label">Processing activity:</span> ${text(cover.activity_name)}</p>
      ${cover.scope_statement ? `<p><span class="label">Scope:</span> ${text(cover.scope_statement)}</p>` : ""}
      <p><span class="label">Effective date:</span> ${text(cover.effective_date)} · <span class="label">Next review:</span> ${text(cover.next_review_date)}</p>
      <p><span class="label">Certifying executive:</span> ${fillIn(cover.certifying_executive?.name, "[FILL IN]")}${cover.certifying_executive?.title ? `, ${text(cover.certifying_executive.title)}` : ""}</p>
    </section>
    ${gatingBlock}
    ${sectionHead("1", "Processing Trigger", s1.statute)}
    ${list(Array.isArray(s1.triggers_selected) ? s1.triggers_selected : [])}
    ${s1.narrative ? `<p>${text(s1.narrative)}</p>` : ""}
    ${sectionHead("2", "Purpose of Processing", s2.statute)}
    <p>${text(s2.purpose_statement)} ${validatorChip(s2.validator)}</p>
    ${guidance(s2.user_guidance)}
    ${sectionHead("3", "Personal Information Inventory", s3.statute)}
    ${piRows ? `<table><tr><th>Category</th><th>Classification</th></tr>${piRows}</table>` : ""}
    ${s3.minimum_necessary_justification ? `<p><span class="label">Minimum-necessary justification:</span> ${text(s3.minimum_necessary_justification)}</p>` : ""}
    ${guidance(s3.user_guidance)}
    ${sectionHead("4", "Operational Elements", s4.statute)}
    ${opRow("(A) Sources and methods", s4.a_sources)}
    ${opRow("(B) Retention", s4.b_retention)}
    ${opRow("(C) Consumer interaction", s4.c_consumer_interaction)}
    ${opRow("(D) Approximate CA consumers", s4.d_consumer_count)}
    ${opRow("(E) Disclosure mechanisms", s4.e_disclosures)}
    ${opRow("(F) Service providers / contractors", s4.f_service_providers)}
    ${admt ? `<p><span class="label">(G) ADMT:</span></p><ul>${Object.entries(admt).map(([k, v]) => `<li><span class="label">${escHtml(capLabel(k))}:</span> ${textJoin(v)}</li>`).join("")}</ul>` : `<p><span class="label">(G) ADMT:</span> Not applicable to this activity.</p>`}
    ${sectionHead("5", "Benefits", s5.statute)}
    <p><span class="label">To the business:</span> ${text(s5.to_business)} ${validatorChip(s5.validator)}</p>
    <p><span class="label">To the consumer:</span> ${text(s5.to_consumer)}</p>
    <p><span class="label">To the public:</span> ${text(s5.to_public)}</p>
    ${guidance(s5.user_guidance)}
    ${sectionHead("6", "Negative Impacts (Harms)", a.sec_6_harms?.statute)}
    ${s6harms.map((h: any) => `<article class="risk"><h3>${text(h.category)}</h3>
      ${h.source ? `<p><span class="label">Source:</span> ${text(h.source)}</p>` : ""}
      ${h.likelihood ? `<p><span class="label">Likelihood:</span> ${text(h.likelihood)} · <span class="label">Magnitude:</span> ${text(h.magnitude)}</p>` : ""}
      ${h.residual_after_safeguards ? `<p><span class="label">Residual risk after safeguards:</span> ${text(h.residual_after_safeguards)}</p>` : ""}
      ${guidance(h.user_guidance)}
    </article>`).join("")}
    ${sectionHead("7", "Safeguards", s7.statute)}
    ${sgGroup("Technical", s7.technical)}
    ${sgGroup("Organizational", s7.organizational)}
    ${sgGroup("Consumer-facing", s7.consumer_facing)}
    ${sgGroup("Contractual", s7.contractual)}
    ${sectionHead("8", "Decision", s8.statute)}
    ${s8.analysis ? `<p>${text(s8.analysis)}</p>` : ""}
    <p><span class="label">Recorded decision of certifying executive:</span> ${fillIn(s8.user_decision, "[TO BE RECORDED — record the decision; the analysis above is provided for consideration only and contains no tool-generated recommendation]")}</p>
    ${s8.user_conditions ? `<p><span class="label">Conditions:</span> ${text(s8.user_conditions)}</p>` : ""}
    ${guidance(s8.user_guidance)}
    ${sectionHead("9", "Contributors and Consultees", s9.statute)}
    <p><span class="label">Internal contributors:</span></p>${people(s9.internal_contributors)}
    <p><span class="label">External consultees:</span></p>${people(s9.external_consultees)}
    ${sectionHead("10", "Governance, Review and Retention", s10.statute)}
    ${s10.triennial_review_date ? `<p><span class="label">Triennial review date:</span> ${text(s10.triennial_review_date)}</p>` : ""}
    ${s10.material_change_commitment ? `<p>${text(s10.material_change_commitment)}</p>` : ""}
    ${s10.retention_commitment ? `<p>${text(s10.retention_commitment)}</p>` : ""}
    ${s10.production_commitment ? `<p>${text(s10.production_commitment)}</p>` : ""}
    <p><span class="label">Approver:</span> ${fillIn(s10.approver?.name, "[FILL IN]")}${s10.approver?.title ? `, ${text(s10.approver.title)}` : ""}${s10.approver?.date ? ` — ${text(s10.approver.date)}` : " — date [TO BE COMPLETED]"}</p>
    <h2>Appendices</h2>
    ${app.a_data_flow ? `<section class="section"><h3>Appendix A — Data Flow</h3><p>${text(app.a_data_flow)}</p></section>` : `<section class="section"><h3>Appendix A — Data Flow</h3><p><em>Not recorded.</em></p></section>`}
    ${vendorRows ? `<section class="section"><h3>Appendix B — Vendor Register</h3><table><tr><th>Vendor</th><th>Role</th><th>PI categories</th><th>Purpose</th></tr>${vendorRows}</table></section>` : `<section class="section"><h3>Appendix B — Vendor Register</h3><p><em>No vendors recorded.</em></p></section>`}
    ${app.c_admt_note ? `<section class="section"><h3>Appendix C — ADMT Note</h3><p>${typeof app.c_admt_note === "object" ? Object.entries(app.c_admt_note).map(([k, v]) => `<span class="label">${escHtml(capLabel(k))}:</span> ${textJoin(v)}`).join("<br/>") : text(app.c_admt_note)}</p></section>` : `<section class="section"><h3>Appendix C — ADMT Note</h3><p>Not applicable — no automated decision-making technology in scope for this activity.</p></section>`}
    ${app.d_spi_note ? `<section class="section"><h3>Appendix D — Sensitive PI Note</h3><p>${typeof app.d_spi_note === "object" ? Object.entries(app.d_spi_note).map(([k, v]) => `<span class="label">${escHtml(capLabel(k))}:</span> ${textJoin(v)}`).join("<br/>") : text(app.d_spi_note)}</p></section>` : `<section class="section"><h3>Appendix D — Sensitive PI Note</h3><p>Not applicable — no sensitive personal information identified.</p></section>`}
    ${app.e_dpia_gap_fill ? `<section class="section"><h3>Appendix E — DPIA Gap-Fill</h3><p>${typeof app.e_dpia_gap_fill === "object" ? Object.entries(app.e_dpia_gap_fill).map(([k, v]) => `<span class="label">${escHtml(capLabel(k))}:</span> ${textJoin(v)}`).join("<br/>") : text(app.e_dpia_gap_fill)}</p></section>` : `<section class="section"><h3>Appendix E — DPIA Gap-Fill</h3><p>Not applicable — no existing GDPR/UK GDPR DPIA was reported in the intake for this processing activity.</p></section>`}
    ${a?.sec_1_trigger?.voluntary
      ? `<section class="section"><h2>Part B — Submission Summary</h2>
           <div class="callout"><p class="label">Not applicable — Voluntary Review</p>
           <p>${typeof b === "string" ? text(b) : "No § 7150(b) processing trigger was identified. The § 7157 annual submission obligation does not apply to voluntary privacy impact reviews. If processing activities change such that a § 7150(b) trigger applies, a mandatory risk assessment and § 7157 submission will be required."}</p></div>
         </section>`
      : `<h2>Part B — Submission Summary${b.statute ? ` <span style="font-size:10px;font-weight:400;color:#5c5a54;">(${text(b.statute)})</span>` : ""}</h2>
         <p><span class="label">Business legal name:</span> ${fillIn(b.business_legal_name, "[FILL IN]")}</p>
         ${b.point_of_contact ? (typeof b.point_of_contact === "object"
           ? `<p><span class="label">Point of contact:</span> ${text(b.point_of_contact.name ?? "[FILL IN]")}, ${text(b.point_of_contact.title ?? "[FILL IN]")}</p><p><span class="label">Phone:</span> ${text(b.point_of_contact.phone ?? "[FILL IN — required by § 7157(b)(1)]")}</p><p><span class="label">Email:</span> ${text(b.point_of_contact.email ?? "[FILL IN — required by § 7157(b)(1)]")}</p>`
           : `<p><span class="label">Point of contact:</span> ${text(b.point_of_contact)}</p>`) : ""}
         ${b.assessment_count_in_period !== undefined ? `<p><span class="label">Assessments in period:</span> ${text(b.assessment_count_in_period)}</p>` : ""}
         ${Array.isArray(b.pi_categories_aggregated) && b.pi_categories_aggregated.length ? `<p><span class="label">PI categories (aggregated):</span> ${b.pi_categories_aggregated.map((c: any) => text(c)).join(", ")}</p>` : ""}
         ${Array.isArray(b.spi_flagged) && b.spi_flagged.length ? `<p><span class="label">SPI flagged:</span> ${b.spi_flagged.map((c: any) => text(c)).join(", ")}</p>` : ""}
         ${b.perjury_attestation_block ? `<div class="attest">${text(b.perjury_attestation_block)}</div>
         <p class="meta" style="margin-top:8px;font-size:10px;color:#b55a00;border-top:1px solid #e6e3da;padding-top:6px;">⚠ Sample document — the certifying executive name, title, and execution date above are placeholder values from the sample intake. Replace with the actual certifying executive's legal name, title, and execution date before this document is signed or submitted to the CPPA.</p>` : ""}
         ${b.submission_banner ? `<div class="callout"><p>${text(b.submission_banner)}</p></div>` : ""}`}
    <div class="footer">EndUserPrivacy.com · Generated ${text(generatedDate)}</div>
  </div>
</div></body></html>`;
}


function buildCPPACyberReportHTML(report: any, record: any): string {
  const generatedDate = new Date(record.created_at || report?.generated_at || Date.now()).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const controls = Array.isArray(report?.controls) ? report.controls : [];
  const topRisks = Array.isArray(report?.top_risks) ? report.top_risks : [];
  const nextSteps = Array.isArray(report?.next_steps) ? report.next_steps : [];
  const annotations = Array.isArray(report?.annotations) ? report.annotations : [];
  const text = (v: any) => escHtml(v === null || v === undefined ? "" : String(v));

  // ITEM 371 — concluding determinations (readiness first, independence second),
  // in the house determination shape: determination + basis + what must change
  // now + legal exposure.
  const READINESS_LABELS: Record<string, string> = {
    ready: "Ready for the Article 9 cybersecurity audit",
    ready_subject_to_named_remediation: "Ready subject to the named remediation",
    not_ready: "Not ready",
    record_insufficient: "Record insufficient to determine readiness",
  };
  const VERDICT_LABELS: Record<string, string> = {
    satisfied: "\u00a7 7122 independence conditions satisfied",
    partially_satisfied: "\u00a7 7122 independence conditions partially satisfied",
    not_satisfied: "\u00a7 7122 independence conditions not satisfied",
    not_applicable: "Not applicable on this record",
    record_insufficient: "Record insufficient to determine independence",
  };
  const rd = report?.readiness_determination;
  const ind = report?.independence_determination;
  const blocking = Array.isArray(rd?.blocking_components) ? rd.blocking_components : [];
  const unassessable = Array.isArray(rd?.unassessable_components) ? rd.unassessable_components : [];
  const unsatisfied = Array.isArray(ind?.unsatisfied_conditions) ? ind.unsatisfied_conditions : [];
  const readinessHtml = rd
    ? `<section class="section"><h2>Readiness Determination</h2><article class="determination">
      <p class="verdict">Determination: ${text(READINESS_LABELS[String(rd.conclusion)] || rd.conclusion)}</p>
      ${rd.headline ? `<p>${text(rd.headline)}</p>` : ""}
      ${rd.reasoning ? `<p><span class="label">Basis:</span> ${text(rd.reasoning)}</p>` : ""}
      ${blocking.length ? `<p class="label">What must change now</p><ul>${blocking.map((b: any) => `<li>${text(b?.label)}${b?.reason ? ` \u2014 ${text(b.reason)}` : ""}</li>`).join("")}</ul>` : ""}
      ${unassessable.length ? `<p class="label">Legal exposure \u2014 components an auditor cannot assess on this record</p><ul>${unassessable.map((u: any) => `<li>${text(u?.label)}${u?.information_needed ? ` \u2014 ${text(u.information_needed)}` : ""}</li>`).join("")}</ul>` : ""}
      ${Array.isArray(rd.citations) && rd.citations.length ? `<p class="score">${rd.citations.map((c: any) => text(c)).join(" \u00b7 ")}</p>` : ""}
    </article></section>`
    : "";
  const independenceHtml = ind
    ? `<section class="section"><h2>Independence Determination</h2><article class="determination">
      <p class="verdict">Determination: ${text(VERDICT_LABELS[String(ind.verdict)] || ind.verdict)}</p>
      ${ind.summary ? `<p><span class="label">Basis:</span> ${text(ind.summary)}</p>` : ""}
      ${(ind.auditor_type || ind.engagement_status) ? `<p class="score">Auditor on the record: ${text(ind.auditor_type || "unknown")}${ind.engagement_status ? ` \u00b7 ${text(ind.engagement_status)}` : ""}</p>` : ""}
      ${unsatisfied.length ? `<p class="label">What must change now</p><ul>${unsatisfied.map((c: any) => `<li>${text(typeof c === "string" ? c : c?.label)}</li>`).join("")}</ul><p class="label">Legal exposure</p><p>An audit completed without satisfying every \u00a7 7122 condition is not a compliant Article 9 cybersecurity audit, and the \u00a7 7124 certification submitted on its basis would misstate completion.</p>` : ""}
    </article></section>`
    : "";
  const determinationsBlock = `${readinessHtml}${independenceHtml}`;

  // Collect FSOR refs across all controls, dedupe by citation+url, cap at 8.
  const fsorMap = new Map<string, any>();
  for (const c of controls) {
    const items = Array.isArray(c?.fsor_commentary) ? c.fsor_commentary : [];
    for (const it of items) {
      const cite = String(it?.citation || it?.regulation_citation || "").trim();
      const url = String(it?.source_url || "").trim();
      const summary = String(it?.agency_position_summary || it?.agency_response || "").trim();
      const key = `${cite}||${url}||${summary.slice(0, 40)}`;
      if (!key.replaceAll("|", "").trim()) continue;
      if (!fsorMap.has(key)) fsorMap.set(key, it);
    }
  }
  const dedupedFsor = Array.from(fsorMap.values()).slice(0, 8);
  const dedupedFsorBlock = dedupedFsor.length
    ? `<section class="section"><h2>Rulemaking context</h2><ul class="fsor-refs">${dedupedFsor.map((it: any) => {
        const cite = escHtml(it?.citation || it?.regulation_citation || "");
        const summary = escHtml(it?.agency_position_summary || it?.agency_response || "");
        const url = it?.source_url ? String(it.source_url) : "";
        const urlHtml = url ? ` · <a href="${escHtml(url)}">${escHtml(url)}</a>` : "";
        return `<li><span class="label">${cite}</span>${summary ? ` — ${summary}` : ""}${urlHtml}</li>`;
      }).join("")}</ul></section>`
    : "";

  // Scorecard table (Control · Status · Score · Priority).
  const scorecardRows = controls.map((c: any) => `<tr>
    <td>${text(c.control)}</td>
    <td>${text(c.status || "")}</td>
    <td>${c.score !== undefined && c.score !== null ? text(c.score) : ""}</td>
    <td>${text(c.priority || "")}</td>
  </tr>`).join("");
  const scorecardBlock = controls.length
    ? `<section class="section"><h2>Control Scorecard</h2><table class="md-table">
        <thead><tr><th>Control</th><th>Status</th><th>Score</th><th>Priority</th></tr></thead>
        <tbody>${scorecardRows}</tbody></table>
        <p class="meta" style="margin-top:6px;font-size:10.5px;color:#5c5a54;">
          <strong>Score guide:</strong> 0–20 = Critical Gap (foundational control absent);
          21–59 = Gap or Partial (control absent or material gaps remain);
          60–89 = Implemented (control substantially in place, monitor and maintain);
          90–100 = Mature (full implementation with documented evidence).
          <strong>Status labels:</strong> Critical Gap / Gap / Partial / Implemented / Mature reflect qualitative maturity, not a binary pass/fail.
          Scores are based on the information provided in the intake; an independent auditor will conduct their own assessment.
        </p></section>`
    : "";

  const statusClass = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "critical gap") return "critical";
    if (s === "gap") return "gap";
    if (s === "partial") return "partial";
    if (s === "mature") return "mature";
    if (s === "implemented") return "compliant";
    return "neutral";
  };

  const intake = record?.intake_data || {};
  const orgName: string =
    intake?.organizationName ||
    intake?.profile?.organizationName ||
    intake?.company_name ||
    intake?.org_name ||
    "";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CPPA Cybersecurity Audit — Readiness Assessment</title>
<style>
  :root { --navy:#0c2a44; --ink:#1a1916; --paper:#f5f8fa; --card:#ffffff; --border:#dde5ea; --muted:#5c6d7a; --teal:#2d9b90; --teal-soft:#e5f4f2; --red:#0d2a45; --red-soft:#e8eff2; --orange:#1a4a6e; --orange-soft:#eef4f7; --amber:#24606c; --amber-soft:#eaf2f5; --green:#1c6960; --green-soft:#e5f4f2; }
  * { box-sizing:border-box; }
  body { font-family:'Georgia','Times New Roman',serif; color:var(--ink); background:var(--paper); font-size:11pt; line-height:1.5; margin:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .shell { background:var(--card); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
  .header { background:var(--navy); color:#fff; padding:24px 28px; }
  .logo-img { display:block; height:34px; width:auto; margin-bottom:12px; object-fit:contain; }
  .eyebrow { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.14em; color:#93b5c6; margin:0 0 4px; }
  h1 { font-size:24px; margin:0; line-height:1.2; }
  .meta { margin-top:6px; font-size:11px; color:#cbd5e1; }
  .summary-bar { margin-top:14px; display:flex; gap:8px; flex-wrap:wrap; }
  .pill { display:inline-block; border-radius:999px; padding:4px 10px; font-size:11px; font-weight:700; background:rgba(255,255,255,.12); color:#fff; }
  .body { padding:22px 28px 28px; }
  h2 { color:var(--navy); font-size:17px; margin:24px 0 10px; border-bottom:1px solid var(--border); padding-bottom:6px; }
  h3 { color:var(--navy); font-size:14px; margin:0 0 8px; }
  p { margin:0 0 9px; }
  ul, ol { margin:8px 0 0; padding-left:20px; } li { margin-bottom:5px; }
  ul.fsor-refs { font-size:10.5px; color:var(--muted); }
  ul.fsor-refs li { margin-bottom:4px; }
  ul.fsor-refs a { color:var(--muted); word-break:break-all; }
  .notice { border-left:4px solid var(--teal); background:var(--teal-soft); border-radius:0 6px 6px 0; padding:10px 14px; font-size:11px; margin-bottom:16px; }
  .callout { border-left:4px solid var(--orange); background:var(--orange-soft); border-radius:0 6px 6px 0; padding:10px 14px; font-size:11.5px; margin:16px 0; }
  .section { margin-bottom:16px; }
  .control, .risk, .annotation { border:1px solid var(--border); border-radius:10px; padding:14px 16px; margin-bottom:12px; page-break-inside:avoid; background:#fff; }
  .control-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:8px; }
  .score { color:var(--muted); font-size:11px; font-weight:700; white-space:nowrap; }
  .status { display:inline-block; border-radius:999px; padding:2px 8px; font-size:10px; font-weight:700; margin-left:6px; }
  .status-critical { background:var(--red-soft); color:var(--red); }
  .status-gap { background:var(--orange-soft); color:var(--orange); }
  .status-partial { background:var(--amber-soft); color:var(--amber); }
  .status-compliant { background:var(--green-soft); color:var(--green); }
  .status-mature { background:#e8eff2; color:#0d2a45; }
  .status-neutral { background:#f2f6f8; color:var(--muted); }
  .label { font-weight:700; color:var(--navy); }
  .footer { margin-top:22px; padding-top:12px; border-top:1px solid var(--border); font-size:10px; color:var(--muted); text-align:center; }
  .determination { border:1px solid var(--border); border-left:4px solid var(--navy); border-radius:0 10px 10px 0; padding:14px 16px; margin-bottom:12px; page-break-inside:avoid; background:#fff; }
  .determination .verdict { font-weight:700; color:var(--navy); }
  ${AUTHORITY_EXHIBIT_CSS}
</style></head><body><div class="shell">
  <header class="header">
    <img class="logo-img" src="${LOGO_URL}" alt="End User Privacy" />
    <p class="eyebrow">CPPA Audit Readiness · Module 2 · Assessment</p>
    <h1>CPPA Cybersecurity Audit — Readiness Assessment</h1>
    ${buildReportMetaLine({ generatedAt: record.created_at || report?.generated_at || Date.now(), organizationName: orgName || null, jurisdictionLabel: "California (CPPA)" })}
    <div class="summary-bar">
      ${report?.overall_score !== undefined ? `<span class="pill">Overall score: ${text(report.overall_score)} / 100</span>` : ""}
      ${report?.readiness_level ? `<span class="pill">${text(report.readiness_level)}</span>` : ""}
    </div>
    ${orgName ? `<p style="margin-top:6px;font-size:11px;color:#93b5c6;">Prepared for: <strong>${escHtml(orgName)}</strong></p>` : ""}
  </header>
  <div class="body">
    <div class="notice"><span class="label">This is a readiness assessment, not the Article 9 cybersecurity audit.</span> This report is generated from self-reported intake data and does not constitute the annual cybersecurity audit required under 11 CCR § 7122, which must be conducted by a qualified, objective, independent professional. Findings should be validated against your organization's authoritative records before operational reliance.</div>
    ${report?.executive_summary ? `<section class="section"><h2>Executive Summary</h2><p>${text(report.executive_summary)}</p></section>` : ""}
    ${scorecardBlock}
    ${enfText(report?.enforcement_context) ? `<div class="callout"><p class="label">Enforcement Context</p><p>${text(enfText(report?.enforcement_context))}</p></div>` : ""}
    ${controls.length ? `<section class="section"><h2>Control Findings</h2>${controls.map((c: any) => `<article class="control">
      <div class="control-head"><h3>${text(c.control)}${c.status ? `<span class="status status-${statusClass(c.status)}">${text(c.status)}</span>` : ""}</h3>${c.score !== undefined ? `<span class="score">${text(c.score)}/100</span>` : ""}</div>
      ${c.finding ? `<p><span class="label">Finding:</span> ${text(c.finding)}</p>` : ""}
      ${c.regulatory_basis ? `<p><span class="label">Regulatory basis:</span> ${text(c.regulatory_basis)}</p>` : ""}
      ${c.remediation ? `<p><span class="label">Remediation:</span> ${text(c.remediation)}</p>` : ""}
      ${c.priority ? `<p><span class="label">Priority:</span> ${text(c.priority)}</p>` : ""}
    </article>`).join("")}</section>` : ""}
    ${topRisks.length ? `<section class="section"><h2>Top Risks</h2>${topRisks.slice(0, 3).map((r: any) => `<article class="risk"><h3>${text(r.title)}</h3>${r.description ? `<p>${text(r.description)}</p>` : ""}${r.deadline ? `<p><span class="label">Deadline:</span> ${text(r.deadline)}</p>` : ""}${r.consequence ? `<p><span class="label">Consequence:</span> ${text(r.consequence)}</p>` : ""}</article>`).join("")}</section>` : ""}
    ${nextSteps.length ? `<section class="section"><h2>Next Steps</h2><ol>${nextSteps.map((step: any) => `<li>${text(step)}</li>`).join("")}</ol></section>` : ""}
    ${dedupedFsorBlock || renderCppaSectionCommentary(report?.fsor_section_commentary)}
    ${renderCppaEnforcementPrecedents(Array.isArray(report?.enforcement_precedents) ? report.enforcement_precedents : [])}
    ${annotations.length ? `<section class="section"><h2>Annotation Appendix</h2>${annotations.map((a: any) => `<article class="annotation"><h3>${text(a.regulator || "Enforcement source")}</h3>${a.summary ? `<p>${text(a.summary)}</p>` : ""}${a.relevance ? `<p><span class="label">Relevance:</span> ${text(a.relevance)}</p>` : ""}</article>`).join("")}</section>` : ""}
    ${determinationsBlock}
    ${renderAuthorityExhibitHtml(report?.authority_exhibit)}
    <div class="footer">EndUserPrivacy.com · Generated ${text(generatedDate)}</div>
  </div>
</div></body></html>`;
}


// ─────────────────────────────────────────────────────────────────────────
// CPPA ADMT Compliance Assessment — Module 3 HTML builder
// ─────────────────────────────────────────────────────────────────────────
function buildADMTReportHTML(report: any, record: any): string {
  const text = (v: any) => escHtml(v === null || v === undefined ? "" : String(v));
  const createdAt = new Date(record.created_at || Date.now()).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const systemName = report?.system_name || "ADMT system";
  const intake = record?.intake_data || {};
  const orgName: string = intake?.company_name || intake?.org_name || intake?.organizationName || "";
  const overallLabel =
    report?.overall_status === "compliant" ? "No gaps identified"
    : report?.overall_status === "gaps_identified" ? "Gaps identified — action required"
    : report?.overall_status === "significant_gaps" ? "Significant gaps — urgent action required"
    : (report?.overall_status || "—");
  const deadline = report?.compliance_deadline || "January 1, 2027";

  const statusClass = (s: string) => {
    const v = (s || "").toLowerCase();
    if (v === "compliant") return "compliant";
    if (v === "gap") return "gap";
    if (v === "missing") return "critical";
    return "neutral";
  };
  const statusLabel = (s: string) => {
    const v = (s || "").toLowerCase();
    if (v === "compliant") return "Compliant";
    if (v === "gap") return "Gap";
    if (v === "missing") return "Missing";
    return text(s || "—");
  };

  const gapSection = (title: string, items: any[]) => {
    if (!Array.isArray(items) || items.length === 0) return "";
    const rows = items.map((it: any) => `<article class="control">
      <div class="control-head">
        <h3>${text(it.element || "")}${it.status ? `<span class="status status-${statusClass(it.status)}">${statusLabel(it.status)}</span>` : ""}</h3>
        ${it.citation ? `<span class="score">${text(it.citation)}</span>` : ""}
      </div>
      ${it.finding ? `<p>${text(it.finding)}</p>` : ""}
      ${it.remediation ? `<p><span class="label">Remediation:</span> ${text(it.remediation)}</p>` : ""}
      ${it.enforcement_exposure && it.status !== "compliant" ? `<p><span class="label">Enforcement exposure:</span> ${text(it.enforcement_exposure)}</p>` : ""}
    </article>`).join("");
    return `<section class="section"><h2>${escHtml(title)}</h2>${rows}</section>`;
  };

  const scopeBlock = (report?.scope_analysis || report?.is_admt !== undefined) ? (() => {
    // POST-C1-FIX-1C: read via canonical contract so historical reports with
    // top-level scope fields still render correctly.
    const sa = readAdmtScope(report, { context: "generate-report-pdf" });
    const rows: Array<[string, any]> = [
      ["Qualifies as ADMT (§ 7001(e))", sa.is_admt],
      ["Triggers significant decision obligations (§ 7200)", sa.triggers_significant_decision],
      ["Triggers risk assessment — use/training on PI (§§ 7150–7157)", sa.triggers_risk_assessment],
      ["Triggers risk assessment — profiling/inference (§ 7150(b)(4)–(5))", sa.triggers_profiling],
    ];
    const items = rows.map(([label, val]) =>
      `<li><span class="label">${escHtml(label)}:</span> ${val === true ? "Yes — obligations apply" : val === false ? "No — not triggered" : "Not determined"}</li>`
    ).join("");
    return `<section class="section"><h2>Scope Analysis</h2><ul>${items}</ul>${sa.summary ? `<p>${text(sa.summary)}</p>` : ""}</section>`;
  })() : "";

  const enfBlock = report?.enforcement_context ? (() => {
    const ec = report.enforcement_context;
    const fmt = (n: any, fallback: number) =>
      `$${Number(n ?? fallback).toLocaleString()}`;
    return `<section class="section"><h2>Enforcement Context</h2><ul>
      <li><span class="label">Per-violation penalty (unintentional):</span> ${fmt(ec.penalty_per_violation_unintentional, 2663)}${ec.penalty_statutory_basis ? ` — ${text(ec.penalty_statutory_basis)}` : ""}</li>
      <li><span class="label">Per-violation penalty (intentional):</span> ${fmt(ec.penalty_per_violation_intentional, 7988)}</li>
    </ul>${ec.aggregate_exposure_note ? `<p>${text(ec.aggregate_exposure_note)}</p>` : ""}</section>`;
  })() : "";

  // ── UPGRADE-3 (ADMT) — SHAPE-LAW deliverables, lawfulness rendered first ──
  const shapeRows = (f: any) => [
    ["Standard", f?.standard],
    ["What the company has indicated", f?.record_fact ?? f?.process_on_the_record],
    ["Application", f?.application],
    ["Why", f?.why],
    ["Information needed", f?.information_needed],
  ].filter(([, v]) => typeof v === "string" && v.trim().length > 0)
    .map(([l, v]) => `<p><span class="label">${escHtml(String(l))}:</span> ${text(String(v))}</p>`).join("");

  const verdictLabel = (v: any) => typeof v === "string" && v ? String(v).replace(/_/g, " ") : "";

  const elementArticle = (f: any) => `<article class="control">
      <div class="control-head">
        <h3>${text(f?.element_label || f?.finding_id || "")}${verdictLabel(f?.verdict) ? `<span class="status status-neutral">${escHtml(verdictLabel(f?.verdict))}</span>` : ""}</h3>
        ${f?.citation ? `<span class="score">${text(f.citation)}</span>` : ""}
      </div>
      ${f?.element_verbatim ? `<p><em>${text(f.element_verbatim)}</em></p>` : ""}
      ${f?.published_text ? `<p><span class="label">Your published words:</span> ${text(f.published_text)}</p>` : ""}
      ${shapeRows(f)}
    </article>`;

  const lawfulnessBlock = report?.determination?.lawfulness ? (() => {
    const l = report.determination.lawfulness;
    return `<section class="section"><h2>Lawfulness Determination</h2>
      ${l.finding ? `<p>${text(l.finding)}</p>` : ""}
      ${l.citation ? `<p><span class="label">Authority:</span> ${text(l.citation)}</p>` : ""}
      ${l.information_needed ? `<p><span class="label">Information needed:</span> ${text(l.information_needed)}</p>` : ""}
    </section>`;
  })() : "";

  const noticeTestingBlock = (() => {
    const list = Array.isArray(report?.notice_element_findings) ? report.notice_element_findings : [];
    const ex = report?.exception_identification;
    if (!list.length && !ex) return "";
    return `<section class="section"><h2>Pre-Use Notice — element by element (§ 7220)</h2>${list.map(elementArticle).join("")}${ex ? elementArticle(ex) : ""}</section>`;
  })();

  const exceptionBlock = (() => {
    const list = Array.isArray(report?.exception_qualification) ? report.exception_qualification : [];
    if (!list.length) return "";
    return `<section class="section"><h2>Opt-Out Exceptions — condition by condition (§ 7221)</h2>${list.map((e: any) => `<article class="control">
      <div class="control-head">
        <h3>${text(e?.exception_label || "")}${verdictLabel(e?.qualifies) ? `<span class="status status-neutral">${escHtml(verdictLabel(e?.qualifies))}</span>` : ""}</h3>
        ${e?.citation ? `<span class="score">${text(e.citation)}</span>` : ""}
      </div>
      ${(Array.isArray(e?.conditions) ? e.conditions : []).map((c: any) => `<p><span class="label">${text(c?.condition_verbatim || c?.condition_id || "")}</span> — ${escHtml(verdictLabel(c?.verdict))}${c?.evidence_on_the_record ? ` ${text(c.evidence_on_the_record)}` : ""}${c?.why ? ` ${text(c.why)}` : ""}${c?.information_needed ? ` <em>Information needed: ${text(c.information_needed)}</em>` : ""}</p>`).join("")}
      ${e?.information_needed ? `<p><span class="label">Information needed:</span> ${text(e.information_needed)}</p>` : ""}
    </article>`).join("")}</section>`;
  })();

  const accessReadinessBlock = (() => {
    const list = Array.isArray(report?.access_readiness_findings) ? report.access_readiness_findings : [];
    if (!list.length) return "";
    return `<section class="section"><h2>Access Rights — explanation readiness (§ 7222)</h2>${list.map(elementArticle).join("")}</section>`;
  })();

  const priorityBlock = renderPriorityActionsOrderedHtml(report);

  const riskNote = report?.risk_assessment_note
    ? `<div class="callout"><p class="label">Risk Assessment Note</p><p>${text(report.risk_assessment_note)}</p></div>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ADMT Compliance Assessment</title>
<style>
  :root { --navy:#0c2a44; --ink:#1a1916; --paper:#f5f8fa; --card:#ffffff; --border:#dde5ea; --muted:#5c6d7a; --teal:#2d9b90; --teal-soft:#e5f4f2; --red:#0d2a45; --red-soft:#e8eff2; --orange:#1a4a6e; --orange-soft:#eef4f7; --amber:#24606c; --amber-soft:#eaf2f5; --green:#1c6960; --green-soft:#e5f4f2; }
  * { box-sizing:border-box; }
  body { font-family:'Georgia','Times New Roman',serif; color:var(--ink); background:var(--paper); font-size:11pt; line-height:1.5; margin:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .shell { background:var(--card); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
  .header { background:var(--navy); color:#fff; padding:24px 28px; }
  .logo-img { display:block; height:34px; width:auto; margin-bottom:12px; object-fit:contain; }
  .eyebrow { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.14em; color:#93b5c6; margin:0 0 4px; }
  h1 { font-size:24px; margin:0; line-height:1.2; }
  .meta { margin-top:6px; font-size:11px; color:#cbd5e1; }
  .prepared-for { margin-top:4px; font-size:11px; color:#93b5c6; }
  .summary-bar { margin-top:14px; display:flex; gap:8px; flex-wrap:wrap; }
  .pill { display:inline-block; border-radius:999px; padding:4px 10px; font-size:11px; font-weight:700; background:rgba(255,255,255,.12); color:#fff; }
  .body { padding:22px 28px 28px; }
  h2 { color:var(--navy); font-size:17px; margin:24px 0 10px; border-bottom:1px solid var(--border); padding-bottom:6px; }
  h3 { color:var(--navy); font-size:14px; margin:0 0 8px; }
  p { margin:0 0 9px; }
  ul, ol { margin:8px 0 0; padding-left:20px; } li { margin-bottom:5px; }
  .notice { border-left:4px solid var(--teal); background:var(--teal-soft); border-radius:0 6px 6px 0; padding:10px 14px; font-size:11px; margin-bottom:16px; }
  .callout { border-left:4px solid var(--orange); background:var(--orange-soft); border-radius:0 6px 6px 0; padding:10px 14px; font-size:11.5px; margin:16px 0; }
  .section { margin-bottom:16px; }
  .control { border:1px solid var(--border); border-radius:10px; padding:14px 16px; margin-bottom:12px; page-break-inside:avoid; background:#fff; }
  .control-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:8px; }
  .score { color:var(--muted); font-size:11px; font-weight:700; white-space:nowrap; font-family:'Courier New', monospace; }
  .status { display:inline-block; border-radius:999px; padding:2px 8px; font-size:10px; font-weight:700; margin-left:6px; }
  .status-critical { background:var(--red-soft); color:var(--red); }
  .status-gap { background:var(--amber-soft); color:var(--amber); }
  .status-compliant { background:var(--green-soft); color:var(--green); }
  .status-neutral { background:#f2f6f8; color:var(--muted); }
  .label { font-weight:700; color:var(--navy); }
  .footer { margin-top:22px; padding-top:12px; border-top:1px solid var(--border); font-size:10px; color:var(--muted); text-align:center; }
  ${AUTHORITY_EXHIBIT_CSS}
</style></head><body><div class="shell">
  <header class="header">
    <img class="logo-img" src="${LOGO_URL}" alt="End User Privacy" />
    <p class="eyebrow">CPPA Audit Readiness · Module 3 · Compliance Assessment</p>
    <h1>ADMT Compliance Assessment</h1>
    <p class="meta">${text(systemName)} · Generated ${text(createdAt)} · Compliance deadline ${text(deadline)}</p>
    <div class="summary-bar">
      <span class="pill">Overall: ${text(overallLabel)}</span>
    </div>
    ${orgName ? `<p class="prepared-for">Prepared for: ${escHtml(orgName)}</p>` : ""}
  </header>
  <div class="body">
    <div class="notice">Findings should be validated against your organization's authoritative records before relying on them for regulatory submissions. Primary authorities: 11 CCR §§ 7001, 7150–7157, 7200, 7220–7222, and Cal. Civ. Code § 1798.185. Verify all citations against the current official text before reliance.</div>
    ${scopeBlock}
    ${priorityBlock}
    ${gapSection("Pre-Use Notice (§ 7220)", report?.notice_gaps ?? [])}
    ${gapSection("Opt-Out Rights (§ 7221)", report?.opt_out_gaps ?? [])}
    ${gapSection("Access Rights (§ 7222)", report?.access_gaps ?? [])}
    ${lawfulnessBlock}
    ${noticeTestingBlock}
    ${exceptionBlock}
    ${accessReadinessBlock}
    ${enfBlock}
    ${riskNote}
    ${renderAuthorityExhibitHtml(report?.authority_exhibit)}
    <div class="footer">EndUserPrivacy.com · CPPA ADMT Compliance Assessment (Module 3) · 11 CCR Article 11 · <a href="https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf">Official text</a></div>
  </div>
</div></body></html>`;
}


function buildRegistrationReportHTML(record: any): string {
  const summary = record.result_summary || {};
  const orgName: string = record.organization_name || summary.organization_name || "[Organization]";
  const generatedAt: string = record.created_at || new Date().toISOString();
  const generatedHuman = new Date(generatedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const confidence: string = summary.confidence || record.confidence_tier || "—";
  const rulesFired: string[] = Array.isArray(summary.rules_fired) ? summary.rules_fired : [];
  const warnings: string[] = Array.isArray(summary.warnings) ? summary.warnings : [];
  const confidenceReasons: string[] = Array.isArray(summary.confidence_reasons) ? summary.confidence_reasons : [];
  const jurisdictions: any[] = Array.isArray(summary.jurisdictions) ? summary.jurisdictions : [];
  const obSummary = summary.obligations_summary || {};

  const confColor = confidence === "high" ? "#2d9b90" : confidence === "medium" ? "#e8a020" : "#cc3333";

  const recCodes: string[] = Array.isArray(record.recommended_jurisdictions)
    ? record.recommended_jurisdictions
    : jurisdictions.map((j: any) => j.code);
  const codeBadges = recCodes.map((c: string) =>
    `<span style="display:inline-block;background:#edf2f5;border:1px solid #c8d6de;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;margin:2px 3px 2px 0;font-family:monospace;">${escHtml(c)}</span>`
  ).join("");

  const jurisdictionCards = jurisdictions.map((j: any) => {
    const obligations: string[] = Array.isArray(j.obligations) ? j.obligations : [];
    const obLabels: Record<string, string> = {
      registration: "Data-protection registration",
      lead_authority: "Lead supervisory authority (EU OSS)",
      eu_representative: "EU Article 27 representative required",
      uk_representative: "UK Article 27 representative required",
      ico_fee: "Annual ICO data-protection fee",
      dpo: "DPO appointment required",
      ai_eu_database: "EU AI Act database registration (Annex VIII)",
      data_broker_registration: "Data broker registration",
      biometric_consent_policy: "Biometric consent policy required",
      childrens_data_safeguards: "Children's data safeguards required",
      sale_share_opt_out: "Sale/sharing opt-out and disclosures required",
    };
    const filteredObs = obligations
      .filter((o: string) => o !== "registration" || j.registration_required !== false)
      .filter((o: string) => o !== "childrens_data_safeguards" || obligations.length > 1)
      .map((o: string) => obLabels[o] || o);

    const feeStr = j.filing_fee_cents && j.filing_currency
      ? `${(j.filing_fee_cents / 100).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} ${j.filing_currency}`
      : null;
    const renewalStr = j.renewal_period_months ? `${j.renewal_period_months} months` : null;

    const dpoYN = j.dpo_required === true ? "✓ Required" : j.dpo_required === false ? "Not required" : "—";
    const repYN = j.representative_required === true ? "✓ Required" : j.representative_required === false ? "Not required" : "—";
    const aiYN = j.ai_registration_required === true ? "✓ Required" : j.ai_registration_required === false ? "Not required" : "—";

    return `
<div style="border:1px solid #dde5ea;border-radius:8px;padding:16px;margin-bottom:14px;break-inside:avoid;page-break-inside:avoid;">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;gap:12px;">
    <div>
      <span style="font-family:monospace;font-size:11px;font-weight:700;background:#0c2a44;color:#fff;padding:2px 7px;border-radius:4px;">${escHtml(j.code)}</span>
      <span style="font-size:14px;font-weight:600;color:#0c2a44;margin-left:8px;">${escHtml(j.name || j.code)}</span>
      ${j.region ? `<span style="font-size:11px;color:#5c6d7a;margin-left:6px;">${escHtml(j.region)}</span>` : ""}
    </div>
    <span style="font-size:10px;color:#5c6d7a;white-space:nowrap;flex-shrink:0;">${escHtml(j.rule_id || "")}</span>
  </div>
  ${j.law ? `<div style="font-size:12px;color:#0c2a44;font-weight:600;margin-bottom:4px;">${escHtml(j.law)}</div>` : ""}
  ${j.authority ? `<div style="font-size:12px;color:#5c6d7a;margin-bottom:8px;">Authority: ${j.authority_url ? `<a href="${escHtml(j.authority_url)}" style="color:#2d9b90;">${escHtml(j.authority)}</a>` : escHtml(j.authority)}</div>` : ""}
  ${j.why ? `<div style="font-size:12px;color:#3d4f5a;margin-bottom:10px;line-height:1.5;">${escHtml(j.why)}</div>` : ""}

  <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px;">
    <tr style="background:#f6f8fa;">
      <td style="padding:4px 8px;color:#5c6d7a;font-weight:600;width:40%;">DPO</td>
      <td style="padding:4px 8px;color:#1a1a1a;">${dpoYN}</td>
    </tr>
    <tr>
      <td style="padding:4px 8px;color:#5c6d7a;font-weight:600;">Representative</td>
      <td style="padding:4px 8px;color:#1a1a1a;">${repYN}</td>
    </tr>
    <tr style="background:#f6f8fa;">
      <td style="padding:4px 8px;color:#5c6d7a;font-weight:600;">AI Act registration</td>
      <td style="padding:4px 8px;color:#1a1a1a;">${aiYN}</td>
    </tr>
    ${feeStr ? `<tr><td style="padding:4px 8px;color:#5c6d7a;font-weight:600;">Filing fee</td><td style="padding:4px 8px;color:#1a1a1a;">${escHtml(feeStr)}</td></tr>` : ""}
    ${renewalStr ? `<tr style="background:#f6f8fa;"><td style="padding:4px 8px;color:#5c6d7a;font-weight:600;">Renewal</td><td style="padding:4px 8px;color:#1a1a1a;">${escHtml(renewalStr)}</td></tr>` : ""}
  </table>

  ${filteredObs.length > 0 ? `
  <div style="margin-bottom:6px;font-size:11px;font-weight:600;color:#5c6d7a;">Obligations</div>
  <ul style="margin:0;padding-left:16px;font-size:11px;color:#3d4f5a;line-height:1.6;">
    ${filteredObs.map((o: string) => `<li>${escHtml(o)}</li>`).join("")}
  </ul>` : ""}

  ${j.notes ? `<div style="margin-top:10px;padding:8px 10px;background:#f6f8fa;border-left:3px solid #c8d6de;font-size:11px;color:#5c6d7a;line-height:1.5;">${escHtml(j.notes)}</div>` : ""}
</div>`;
  }).join("");

  const brokerRegs: string[] = Array.isArray(obSummary.data_broker_registrations)
    ? obSummary.data_broker_registrations : [];
  const summaryRows: [string, string][] = [
    ["DPO required", obSummary.dpo_required === true ? "✓ Yes" : "No"],
    ["EU representative required", obSummary.eu_representative_required === true ? "✓ Yes" : "No"],
    ["UK representative required", obSummary.uk_representative_required === true ? "✓ Yes" : "No"],
    ["EU AI Act obligations engaged", (obSummary.ai_act_obligations_engaged ?? obSummary.ai_act_provider_obligations) === true ? "✓ Yes" : "No"],
    ["Data broker registrations", brokerRegs.length > 0 ? brokerRegs.join(", ") : "None"],
  ];

  const warningsHtml = warnings.length > 0 ? `
<div style="margin-bottom:20px;">
  <h2 style="font-size:14px;font-weight:700;color:#0c2a44;border-bottom:2px solid #2d9b90;padding-bottom:4px;margin-bottom:10px;">Warnings</h2>
  <ul style="margin:0;padding-left:16px;font-size:12px;color:#8a5c00;line-height:1.7;">
    ${warnings.map((w: string) => `<li>${escHtml(w)}</li>`).join("")}
  </ul>
</div>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Registration Assessment — ${escHtml(orgName)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1.5rem; color: #1a1a1a; line-height: 1.5; font-size: 13px; }
  .eup-bar { background: #0c2a44; padding: 9px 1.5rem; display: flex; align-items: center; gap: 12px; margin: -2rem -1.5rem 2rem -1.5rem; }
  .eup-bar span { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: #93b5c6; }
  h1 { font-size: 1.6rem; color: #0c2a44; margin-bottom: 0.2rem; }
  h2 { font-size: 14px; font-weight: 700; color: #0c2a44; border-bottom: 2px solid #2d9b90; padding-bottom: 4px; margin: 20px 0 10px; break-after: avoid; page-break-after: avoid; }
  h2 + * { break-before: avoid; page-break-before: avoid; }
  .meta { color: #5c6d7a; font-size: 12px; margin-bottom: 1.5rem; }
  a { color: #2d9b90; }
  table.kv { width: 100%; border-collapse: collapse; font-size: 12px; }
  table.kv tr:nth-child(even) { background: #f6f8fa; }
  table.kv td { padding: 5px 10px; }
  table.kv td:first-child { color: #5c6d7a; font-weight: 600; width: 45%; }
  .conf-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; color: #fff; background: ${confColor}; }
  footer { color: #5c6d7a; font-size: 11px; margin-top: 2rem; border-top: 1px solid #dde5ea; padding-top: 1rem; }
  @media print {
    h2 { break-after: avoid; page-break-after: avoid; }
    h2 + * { break-before: avoid; page-break-before: avoid; }
  }
</style>
</head>
<body>
<div class="eup-bar">
  <img src="${LOGO_URL}" alt="End User Privacy" style="height:22px;width:auto;display:block;" />
  <span>Customized Compliance Assessment</span>
</div>
<h1>Registration Assessment</h1>
<div class="meta">Generated ${escHtml(generatedHuman)} · ${escHtml(orgName)}</div>
<h2>Recommended Jurisdictions</h2>
<div style="margin-bottom:16px;">${codeBadges}</div>
<div style="display:flex;gap:20px;margin-bottom:20px;font-size:12px;flex-wrap:wrap;">
  <span>Confidence: <span class="conf-badge">${escHtml(confidence)}</span></span>
  <span style="color:#5c6d7a;">Rules: ${escHtml(rulesFired.join(", ") || "—")}</span>
</div>

${warningsHtml}

<h2>Jurisdictions</h2>
${jurisdictionCards || "<p style='color:#5c6d7a;font-size:12px;'>No jurisdictions identified.</p>"}

<h2>Obligations Summary</h2>
<table class="kv" style="margin-bottom:20px;">
  ${summaryRows.map(([k, v]) => `<tr><td>${escHtml(k)}</td><td style="color:${String(v).startsWith("✓") ? "#1a7a5e" : "#1a1a1a"};">${escHtml(String(v))}</td></tr>`).join("")}
</table>

<h2>Confidence Reasons</h2>
<ul style="font-size:12px;color:#3d4f5a;padding-left:20px;margin-bottom:20px;">
  ${confidenceReasons.map((r: string) => `<li>${escHtml(r)}</li>`).join("") || "<li style='color:#5c6d7a;'>No confidence signals recorded.</li>"}
</ul>

${renderAttestationHtml(summary?.registration_deliverables?.attestation)}
${renderAuthorityExhibitHtml(summary?.authority_exhibit)}

<footer>
  Generated by <strong>EndUserPrivacy</strong> · enduserprivacy.com ·
  Validate all findings against your organization's authoritative records before operational reliance.
</footer>
</body>
</html>`;
}





// ─────────────────────────────────────────────────────────────────────────
// FILENAME HELPERS
// ─────────────────────────────────────────────────────────────────────────
const TOOL_LABELS: Record<string, string> = {
  li_assessment: "LI-Assessment",
  governance_assessment: "Governance-Assessment",
  // 2026-08-25 polish round — "Impact-Assessment-Builder" was internal
  // product language; the label drives both the filename and the footer.
  dpia_framework: "Data-Protection-Impact-Assessment",
  biometric_checker: "Biometric-Compliance",
  ir_playbook: "Breach-Response-Playbook",
  dpa_generator: "Custom-DPA",
  cppa_cybersecurity: "CPPA-Cybersecurity-Audit",
  cppa_risk: "CPPA-Risk-Assessment",
  cppa_admt: "CPPA-ADMT-Compliance-Assessment",
  cppa_scope: "CPPA-Scope-Check",
  registration_assessment: "Registration-Assessment",
  registration_document: "Registration-Filing",
  brief: "Intelligence-Brief",
};

// Tables that have a pdf_url column; others skip the row-update step.
const TABLES_WITH_PDF_URL = new Set([
  "li_assessments",
  "governance_assessments",
  "dpia_frameworks",
  "biometric_assessments",
  "ir_playbooks",
  "dpa_documents",
  "registration_documents",
  "cppa_assessments",
]);

function makeAttachmentName(toolType: string, generatedAt: string): string {
  const date = new Date(generatedAt).toISOString().slice(0, 10);
  return `EndUserPrivacy-${TOOL_LABELS[toolType] || "Report"}-${date}.pdf`;
}


// ─────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  console.log(`[generate-report-pdf] build active · build_stamp=${BUILD_STAMP}`);
  console.log(JSON.stringify({ evt: "pdf_build_stamp", build_stamp: BUILD_STAMP }));

  try {
    // SEC-1b: Do not 401 anon callers here — let the eligibility check below
    // return the stable PREVIEW_REQUIRES_ACCOUNT / forbidden codes instead.
    // A missing/invalid token is treated as an anon caller (userId=null).
    const callerRaw = await verifyCaller(req);
    const caller = callerRaw.ok ? callerRaw : { ok: true, userId: null as string | null, internal: false };

    const { tool_type, assessment_id, user_email, user_name, result_url, force, mode, result_id, artifact } = await req.json();

    // ITEM 369-IR LEG 1 — the IR playbook ships TWO files from one run. The
    // artifact selector is IR-only; every other tool_type ignores it and its
    // storage layout, cache key and response are unchanged.
    const irArtifact: "standing_playbook" | "incident_worksheet" =
      artifact === "incident_worksheet" ? "incident_worksheet" : "standing_playbook";
    const artifactPathSuffix = tool_type === "ir_playbook" ? `/${irArtifact}` : "";


    // ── ITEM 271: admin-only replay-harness export path ──────────────────
    // Renders a harness `assembled_report` through the SAME shipped
    // buildCPPARiskReportHTML + generatePDF path customers receive, so the
    // CEO review surface is byte-faithful. Admin-gated, read-only, and
    // never touches customer records.
    if (mode === "replay_harness") {
      if (!caller.userId) {
        return new Response(JSON.stringify({ error: "forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: caller.userId, _role: "admin" });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!result_id) {
        return new Response(JSON.stringify({ error: "result_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: rrow } = await supabase
        .from("replay_harness_results")
        .select("id, doc_id, assembled_report, created_at")
        .eq("id", result_id)
        .maybeSingle();
      if (!rrow?.assembled_report) {
        return new Response(JSON.stringify({ error: "report_data_invalid" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const replayHtml = buildCPPARiskReportHTML(rrow.assembled_report, {
        created_at: rrow.created_at,
        intake_data: {},
      });
      const replayName = makeAttachmentName("cppa_risk", rrow.created_at || new Date().toISOString());
      const replayBytes = await generatePDF(replayHtml, footerTitleFromDocument(replayHtml, replayName));
      let replayUrl: string | null = null;
      if (replayBytes) {
        const p = `reports/replay_harness_results/${rrow.id}/${replayName}`;
        const { error: sErr } = await supabase.storage.from("assessment-reports")
          .upload(p, replayBytes, { contentType: "application/pdf", upsert: true });
        if (!sErr) {
          const { data: u } = await supabase.storage.from("assessment-reports").createSignedUrl(p, 600);
          replayUrl = u?.signedUrl || null;
        }
      }
      return new Response(
        JSON.stringify({ success: true, pdf_generated: !!replayBytes, pdf_url: replayUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tool_type || !assessment_id) {
      return new Response(JSON.stringify({ error: "tool_type and assessment_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }



    const tableMap: Record<string, string> = {
      li_assessment: "li_assessments",
      governance_assessment: "governance_assessments",
      dpia_framework: "dpia_frameworks",
      biometric_checker: "biometric_assessments",
      ir_playbook: "ir_playbooks",
      dpa_generator: "dpa_documents",
      // Newly supported tools (text/document-based or summary-based output):
      cppa_cybersecurity: "cppa_assessments",
      cppa_risk: "cppa_assessments",
      cppa_admt: "cppa_assessments",
      // ITEM SO-12 — CONVERSION build (v1.2 spine, deterministic engine, no
      // model call). Shares cppa_assessments with v1; distinguished by the
      // caller's tool_type string and the record's own module="admt_v2",
      // never by a separate table. See run-admt-checker-v2/index.ts.
      cppa_admt_v2: "cppa_assessments",
      cppa_scope: "cppa_scope_checks",
      registration_assessment: "registration_assessments",
      registration_document: "registration_documents",
      brief: "custom_briefs",
    };
    const table = tableMap[tool_type];
    if (!table) {
      return new Response(JSON.stringify({ error: "Invalid tool_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: record } = await supabase.from(table)
      .select("*").eq("id", assessment_id).single();

    if (!record) {
      return new Response(JSON.stringify({ error: "Record not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // SEC-1b: Owner-only PDF access. Allow only if:
    //   - caller is internal (service-role), OR
    //   - caller is an admin end-user, OR
    //   - record.user_id IS SET AND matches the caller.
    // A NULL record.user_id (preview-stage) can never mint a PDF.
    {
      const recordUserId = (record as any).user_id ?? null;
      let allowed = false;
      if (caller.internal) {
        allowed = true;
      } else if (recordUserId && caller.userId === recordUserId) {
        allowed = true;
      } else if (caller.userId) {
        try {
          const { data: isAdmin } = await supabase.rpc("has_role", {
            _user_id: caller.userId, _role: "admin",
          });
          if (isAdmin) allowed = true;
        } catch (_e) { /* fall through */ }
      }
      if (!allowed) {
        if (!recordUserId) {
          return new Response(
            JSON.stringify({ error: "PREVIEW_REQUIRES_ACCOUNT" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Distinguish "no verified caller" (expired/missing session token) from
        // a genuinely non-owning signed-in caller. Both used to read "forbidden".
        if (!caller.userId) {
          console.log(JSON.stringify({
            evt: "pdf_auth_unverified", tool_type, assessment_id,
            reason: (callerRaw as any).error ?? "no_token",
          }));
          return new Response(
            JSON.stringify({ error: "auth_expired", message: "Session expired or missing — sign in again and retry." }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: "forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

    }

    // SEC-1b: sign-only mode — return a fresh short-TTL (600s) signed URL for
    // an already-rendered cached PDF. Never persists the URL. Never renders.
    if (mode === "sign-only") {
      const folder = `reports/${table}/${assessment_id}${artifactPathSuffix}`;
      const { data: existing } = await supabase.storage
        .from("assessment-reports")
        .list(folder, { limit: 10, sortBy: { column: "created_at", order: "desc" } });
      const cachedFile = (existing || []).find((f) => f.name.toLowerCase().endsWith(".pdf"));
      if (!cachedFile) {
        return new Response(
          JSON.stringify({ error: "report_not_ready" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { data: urlData } = await supabase.storage
        .from("assessment-reports")
        .createSignedUrl(`${folder}/${cachedFile.name}`, 600);
      if (!urlData?.signedUrl) {
        return new Response(
          JSON.stringify({ error: "sign_failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ success: true, pdf_url: urlData.signedUrl, cached: true, sign_only: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── R0 PART 1: Cross-cutting error / empty-body / structural guard ──
    // Protects all tool types from rendering blank PDFs when the generator
    // wrote an error row, empty report_data, or a body that is missing the
    // required top-level keys the corresponding build*ReportHTML reads.
    {
      const status = (record as any).status;
      if (status === "error" || status === "failed") {
        console.warn("[pdf-guard] 409 report_not_ready", { tool_type, assessment_id, status });
        return new Response(
          JSON.stringify({ error: "report_not_ready", status }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const readsReportData = new Set([
        "li_assessment", "governance_assessment", "dpia_framework",
        "cppa_risk", "cppa_cybersecurity", "cppa_admt", "cppa_admt_v2", "biometric_checker",
      ]);
      if (readsReportData.has(tool_type)) {
        const rd: any = (record as any).report_data;
        if (rd == null || (typeof rd === "object" && rd.error != null)) {
          console.warn("[pdf-guard] 409 report_data_invalid", { tool_type, assessment_id, reason: rd?.error || "null" });
          return new Response(
            JSON.stringify({ error: "report_data_invalid", detail: rd?.error || "missing" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // STRUCTURAL MINIMUM — derived from the keys each builder actually reads.
        const isNonEmptyArr = (v: any) => Array.isArray(v) && v.length > 0;
        const isNonEmptyObj = (v: any) => v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length > 0;
        let bodyOk = true;
        let missingKey = "";
        switch (tool_type) {
          case "li_assessment":
            bodyOk = isNonEmptyObj(rd.three_part_test);
            missingKey = "three_part_test";
            break;
          case "governance_assessment":
            bodyOk = isNonEmptyObj(rd.domain_findings);
            missingKey = "domain_findings";
            break;
          case "dpia_framework":
            bodyOk = isNonEmptyObj(rd.dpia_metadata) || isNonEmptyObj(rd.section_0_overview) || isNonEmptyObj(rd.section_1_description);
            missingKey = "dpia_metadata|section_1_description";
            break;
          case "cppa_risk":
            // v4 persists risk_assessment_by_activity + assessment_summary;
            // v3 persists part_a/part_b; legacy rows have a domains array.
            bodyOk =
              isNonEmptyArr(rd.risk_assessment_by_activity) ||
              isNonEmptyObj(rd.assessment_summary) ||
              isNonEmptyObj(rd.part_a) ||
              isNonEmptyArr(rd.domains);
            missingKey = "risk_assessment_by_activity|assessment_summary|part_a|domains";
            break;
          case "cppa_cybersecurity":
            // CYBER_DETERMINISTIC_ENABLED (C1.1a/C2): the deterministic path
            // deliberately persists `controls: []` and the customer document
            // is `skeleton_document`, which the render dispatch below prefers.
            // A renderable skeleton therefore satisfies the guard; the
            // controls minimum applies only when no skeleton exists (defect
            // found live: batch 4e89037e, 409 report_body_empty on a
            // complete deterministic-path row, 2026-08-26).
            if (isNonEmptyObj(rd.skeleton_document) && isNonEmptyArr(rd.skeleton_document?.sections)) {
              break;
            }
            // Only enforce when the structured path would be selected.
            if (Array.isArray(rd.controls) || rd.controls != null) {
              bodyOk = isNonEmptyArr(rd.controls);
              missingKey = "controls";
            }
            break;
          case "cppa_admt": {
            // CONVERSION SWAP (2026-08-20): a "cppa_admt" row may now be
            // either v1 shape (top-level system_name) or v2 shape
            // (skeleton_document only) — same distinction the render
            // dispatch below already makes off record.module.
            const isAdmtV2Record = (record as any).module === "admt_v2";
            if (isAdmtV2Record) {
              bodyOk = isNonEmptyObj(rd.skeleton_document) && isNonEmptyArr(rd.skeleton_document?.sections);
              missingKey = "skeleton_document";
            } else {
              bodyOk = typeof rd.system_name === "string" && rd.system_name.length > 0;
              missingKey = "system_name";
            }
            break;
          }
          case "cppa_admt_v2":
            bodyOk = isNonEmptyObj(rd.skeleton_document) && isNonEmptyArr(rd.skeleton_document?.sections);
            missingKey = "skeleton_document";
            break;
          case "biometric_checker": {
            const text = (record as any).analysis_text || rd?.assessment_text || "";
            bodyOk = typeof text === "string" && text.trim().length > 0;
            missingKey = "analysis_text|assessment_text";
            break;
          }
          case "ir_playbook": {
            const text = (record as any).playbook_text || "";
            bodyOk = typeof text === "string" && text.trim().length > 0;
            missingKey = "playbook_text";
            break;
          }
          case "dpa_generator": {
            const text = (record as any).document_text || "";
            bodyOk = typeof text === "string" && text.trim().length > 0;
            missingKey = "document_text";
            break;
          }
          case "registration_assessment": {
            const recs = (record as any).recommended_jurisdictions;
            const summary = (record as any).result_summary;
            bodyOk = isNonEmptyArr(recs) || isNonEmptyObj(summary);
            missingKey = "recommended_jurisdictions|result_summary";
            break;
          }
          case "registration_document": {
            const text = (record as any).content_text || "";
            bodyOk = typeof text === "string" && text.trim().length > 0;
            missingKey = "content_text";
            break;
          }
        }
        if (!bodyOk) {
          console.warn("[pdf-guard] 409 report_body_empty", { tool_type, assessment_id, missingKey });
          return new Response(
            JSON.stringify({ error: "report_body_empty", missing: missingKey }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }



    // ── CACHE CHECK ─────────────────────────────────────────────────────
    // If a PDF was already generated for this assessment, reuse it instead
    // of calling PDFShift again. Re-sign the stored object and return.
    // Skip cache when `force=true`.
    if (!force) {
      try {
        const folder = `reports/${table}/${assessment_id}${artifactPathSuffix}`;
        const { data: existing } = await supabase.storage
          .from("assessment-reports")
          .list(folder, { limit: 10, sortBy: { column: "created_at", order: "desc" } });
        const cachedFile = (existing || []).find((f) => f.name.toLowerCase().endsWith(".pdf"));
        if (cachedFile) {
          const { data: urlData } = await supabase.storage
            .from("assessment-reports")
            .createSignedUrl(`${folder}/${cachedFile.name}`, 600);
          if (urlData?.signedUrl) {
            // SEC-1b: do NOT persist the signed URL. Return to authorized caller only.
            return new Response(
              JSON.stringify({ success: true, pdf_generated: true, pdf_url: urlData.signedUrl, email_sent: false, cached: true }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch (cacheErr) {
        console.warn("Cache lookup failed, falling through to fresh render:", cacheErr);
      }
    }


    // Tools that ship a structured report_data JSON blob
    const structuredTools = new Set(["li_assessment", "governance_assessment", "dpia_framework"]);
    if (structuredTools.has(tool_type) && !record.report_data) {
      return new Response(JSON.stringify({ error: "Report data not found or not yet complete" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Helper: turn a JSON summary into bullet-styled plain text for the
    // generic text builder. Keeps PDF output readable for tools that don't
    // (yet) have a bespoke HTML template.
    // Keys we never want surfaced in customer-facing PDFs (internal DB fields,
    // verbatim FSOR text, raw enforcement-precedent metadata). Also excludes
    // structured blocks that have dedicated compact renderers below so they
    // are not double-dumped by the generic walker.
    const EXCLUDE_KEYS = new Set([
      "id", "ids",
      "enforcement_action_id", "precedent_significance",
      "fine_eur_equivalent", "breach_related", "biometric_related",
      "agency_response", "agency_response_verbatim",
      "comment_summary_verbatim", "embedding", "obligation_snapshot",
      // Rendered separately via structured helpers, never dumped raw:
      "fsor_commentary", "fsor_section_commentary",
      "enforcement_precedents", "enforcement_meta",
    ]);
    const summaryToText = (obj: any): string => {
      if (!obj) return "";
      if (typeof obj === "string") return obj;
      try {
        const out: string[] = [];
        const walk = (o: any, depth = 0) => {
          const pad = "  ".repeat(depth);
          if (Array.isArray(o)) {
            o.forEach((v) => {
              if (v && typeof v === "object") walk(v, depth);
              else out.push(`${pad}• ${String(v)}`);
            });
          } else if (o && typeof o === "object") {
            for (const [k, v] of Object.entries(o)) {
              if (EXCLUDE_KEYS.has(k)) continue;
              const label = k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
              if (v && typeof v === "object") {
                out.push(`\n${pad}${label}`);
                walk(v, depth + 1);
              } else if (v !== null && v !== undefined && v !== "") {
                out.push(`${pad}${label}: ${String(v)}`);
              }
            }
          } else {
            out.push(`${pad}${String(o)}`);
          }
        };
        walk(obj);
        return out.join("\n");
      } catch {
        return JSON.stringify(obj, null, 2);
      }
    };

    let html: string;
    let generatedAt: string;

    if (tool_type === "li_assessment") {
      const report = record.report_data as any;
      // SO-11 WIRE-IN: the byte-pinned LIA skeleton IS the customer document
      // when the pipeline assembled one; the legacy narrative path survives
      // only for reports generated before the wire-in.
      const skelLia = readSkeletonDocument(report);
      html = skelLia
        // DOC 172 (2026-09-04) — the "lia" product string activates the
        // Syllabus & Record presentation system (SR_PRODUCTS).
        ? buildSkeletonReportHTML(skelLia, record, "Legitimate Interests Assessment", "lia")
        : buildLIReportHTML(report, record);
      generatedAt = report.generated_at || record.created_at || new Date().toISOString();

    } else if (tool_type === "governance_assessment") {
      const report = record.report_data as any;
      // SO-3 WIRE-IN: the byte-pinned governance skeleton IS the customer
      // document when the pipeline assembled one; the legacy narrative path
      // survives only for reports generated before the wire-in.
      const skelGov = readSkeletonDocument(report);
      html = skelGov
        // DOC 173 (2026-09-04) — the "governance" product string activates
        // the Syllabus & Record presentation system (SR_PRODUCTS).
        ? buildSkeletonReportHTML(skelGov, record, "GDPR Accountability Assessment", "governance")
        : buildGovernanceReportHTML(report, record);
      generatedAt = report.generated_at || record.created_at || new Date().toISOString();
    } else if (tool_type === "dpia_framework") {
      const report = record.report_data as any;
      // SO-5 WIRE-IN: the byte-pinned DPIA skeleton IS the customer document
      // when the pipeline assembled one; the legacy narrative path survives
      // only for reports generated before the wire-in.
      const skelDpia = readSkeletonDocument(report);
      html = skelDpia
        // DOC 171 (2026-09-04) — the "dpia" product string activates the
        // Syllabus & Record presentation system (SR_PRODUCTS).
        ? buildSkeletonReportHTML(skelDpia, record, "Data Protection Impact Assessment", "dpia")
        : buildDPIAReportHTML(report, record);
      generatedAt = report.generated_at || record.created_at || new Date().toISOString();

    } else if (tool_type === "biometric_checker") {
      const intake = record.intake_data || {};
      const text = record.analysis_text || record.report_data?.assessment_text || "";
      // BIPA litigation risk callout retired 2026-07-14 — bipa_risk field removed from report_data.
      // A-TEAM DELTA (ChatGPT multi-instance review, 2026-08-31, Biometric
      // P1-1) — biometric is the one product still rendered through
      // buildTextReportHTML (below) rather than the shared
      // buildSkeletonReportHTML, which is where every other product's
      // Report ID (A-TEAM S4 RULING S4, doc 119) comes from. Same
      // derivation, applied here directly.
      const bioReportId = typeof record?.id === "string" && record.id.length >= 8
        ? `Report ID ${record.id.slice(0, 8).toUpperCase()}`
        : "";
      const metaLine = [
        bioReportId,
        `Generated ${new Date(record.created_at).toLocaleDateString("en-US",{ year:"numeric", month:"long", day:"numeric" })}`,
        (record.jurisdictions || intake.jurisdictions || []).length
          ? (record.jurisdictions || intake.jurisdictions).join(", ")
          : "",
      ].filter(Boolean).join(" · ");
      const orgNameForPdf = (intake as any).orgName || (intake as any).organizationName || "";
      // SO-6 WIRE-IN: the byte-pinned Biometric skeleton IS the customer
      // document when the pipeline assembled one; the legacy narrative path
      // survives only for reports generated before the wire-in.
      const skelBio = readSkeletonDocument(record.report_data);
      // Biometric's skeleton spine has its own table_of_authorities section
      // (now Appendix A) built from this same authority_exhibit data — skip
      // the legacy exhibit block when that appendix already rendered,
      // otherwise the citations print twice. Same bug class as ADMT/DPIA.
      const bioHasToaAppendix = skelBio?.sections?.some((s: any) => s.id === "table_of_authorities");
      html = skelBio
        ? buildTextReportHTML({
            title: skelBio.title || "Biometric Compliance Assessment",
            metaLine: `${metaLine}${orgNameForPdf ? ` · Prepared for: ${orgNameForPdf}` : ""}`,
            text: "",
            showJurisdictionChip: false,
            htmlPrefix: skeletonSectionsHtml(skelBio),
            appendixHtml:
              renderAttestationHtml((record.report_data as any)?.biometric_deliverables?.attestation) +
              (bioHasToaAppendix ? "" : renderAuthorityExhibitHtml((record.report_data as any)?.authority_exhibit)),
          })
        : buildTextReportHTML({
            title: "Biometric Compliance Assessment",
            metaLine: `${metaLine}${orgNameForPdf ? ` · Prepared for: ${orgNameForPdf}` : ""}`,
            text,
            showJurisdictionChip: true,
            // BIPA risk callout branch retired 2026-07-14
            callout: undefined,
            appendixHtml:
              renderAttestationHtml((record.report_data as any)?.biometric_deliverables?.attestation) +
              renderAuthorityExhibitHtml((record.report_data as any)?.authority_exhibit),
          });

      generatedAt = record.created_at || new Date().toISOString();
    } else if (tool_type === "ir_playbook") {
      // ITEM 369-IR LEG 1 — TWO-ARTIFACT DELIVERY. Rows generated by the
      // two-artifact build render through the dedicated artifact builders:
      // Artifact A carries the fourteen locked sections plus the authority
      // exhibit last; Artifact B carries the blank forms and NO exhibit.
      // Legacy rows (no artifacts persisted) keep the original single-file
      // text render, which is the standing-playbook slot only.
      const irReport: any = record.report_data ?? {};
      const hasIrArtifacts = !!(irReport?.standing_playbook || irReport?.incident_worksheet);
      if (hasIrArtifacts) {
        // SO-7 WIRE-IN: for Artifact A the byte-pinned IR skeleton IS the
        // customer document when the pipeline assembled one; the legacy
        // standing-playbook builder survives only for rows generated before
        // the wire-in. Artifact B (the worksheet) is untouched — its blank
        // fields are correct output and are never padded.
        const skelIr = readSkeletonDocument(irReport);
        html = irArtifact === "incident_worksheet"
          ? buildIRWorksheetHTML(record)
          : skelIr
          // BATCH 21a (doc 113 S7.3, RULING 3.9): the ops-playbook eyebrow —
          // the only product-noun set fleet-wide besides the DPA's future
          // contract-mode noun.
          ? buildSkeletonReportHTML(skelIr, record, "Incident Response Playbook", "ir-playbook", "Incident Response Playbook")
          : buildIRStandingPlaybookHTML(record);
        generatedAt = record.created_at || new Date().toISOString();

      } else if (irArtifact === "incident_worksheet") {
        console.warn("[pdf-guard] 409 artifact_not_available", { tool_type, assessment_id, artifact: irArtifact });
        return new Response(
          JSON.stringify({ error: "artifact_not_available", artifact: irArtifact }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
      const intake = record.intake_data || {};
      const jurArr: any[] = Array.isArray(intake.jurisdictions) ? intake.jurisdictions : [];
      const isEUish = jurArr.some((j) =>
        /EU|GDPR|EEA|UK|United Kingdom|Ireland|Germany|France|Denmark|Netherlands|Spain|Italy/i.test(String(j)));
      const calloutText = isEUish
        ? "This playbook and its documentation checklist contribute to your Article 33(5) accountability record."
        : "This playbook and its documentation checklist contribute to your accountability record under the applicable breach-notification frameworks.";
      const orgName = record.organization_name || intake.organizationName || "";
      const orgType = intake.organisationType || intake.organizationType || "";
      const causeShort = (intake.cause || "").length > 80
        ? (intake.cause || "").slice(0, 77) + "…"
        : (intake.cause || "");
      const metadataBlock = `<div style="border:1px solid #dde5ea;border-radius:8px;padding:14px 18px;margin:16px 0 20px;background:#f8fafc;">
  <table style="width:100%;border-collapse:collapse;font-size:11px;">
    <tr>
      <td style="padding:3px 12px 3px 0;color:#5c6d7a;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;width:140px;">Prepared for</td>
      <td style="padding:3px 0;color:#1a1916;font-weight:600;">${escHtml(orgName || "[TO BE COMPLETED: organization name]")}</td>
      <td style="padding:3px 12px 3px 24px;color:#5c6d7a;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;width:100px;">Incident ID</td>
      <td style="padding:3px 0;color:#b45309;font-weight:600;">[TO BE COMPLETED: assign unique incident ID]</td>
    </tr>
    <tr>
      <td style="padding:3px 12px 3px 0;color:#5c6d7a;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Organization type</td>
      <td style="padding:3px 0;color:#1a1916;">${escHtml(orgType || "—")}</td>
      <td style="padding:3px 12px 3px 24px;color:#5c6d7a;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Status</td>
      <td style="padding:3px 0;color:#7c1a1a;font-weight:600;">CONFIRM ALL DEADLINES WITH COUNSEL</td>
    </tr>
    <tr>
      <td style="padding:3px 12px 3px 0;color:#5c6d7a;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Jurisdictions</td>
      <td style="padding:3px 0;color:#1a1916;" colspan="3">${escHtml(jurArr.join(", ") || "—")}</td>
    </tr>
    ${causeShort ? `<tr>
      <td style="padding:3px 12px 3px 0;color:#5c6d7a;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Incident scenario</td>
      <td style="padding:3px 0;color:#1a1916;" colspan="3">${escHtml(causeShort)}</td>
    </tr>` : ""}
  </table>
</div>`;
      html = buildTextReportHTML({
        title: "Your Incident Response Playbook",
        metaLine: `Generated ${new Date(record.created_at).toLocaleDateString("en-US",{ year:"numeric", month:"long", day:"numeric" })}` +
          (orgName ? ` · ${orgName}` : "") +
          (jurArr.length ? ` · ${jurArr.join(", ")}` : ""),
        // PDF-1: metadataBlock is raw renderer-owned HTML — pass via htmlPrefix
        // so it renders as styled content, not escaped as literal text.
        // playbook_text may embed generator-emitted HTML (tables/divs) which
        // parseTextBlocks does not understand and would previously escape into
        // visible markup on page 1 — strip tags before parsing.
        htmlPrefix: metadataBlock,
        text: stripBodyHtml(record.playbook_text || ""),
        showJurisdictionChip: false,
        callout: { kind: "muted", html: calloutText },
      });
      generatedAt = record.created_at || new Date().toISOString();
      }
    } else if (tool_type === "dpa_generator") {
      const intake = record.intake_data || {};
      // PDF-1 subtitle guard: legalFramework can arrive as an object from
      // intake shims; String(obj) → "[object Object]" is the bug. Coerce
      // safely and fall back to omission for non-string values.
      const rawFramework = (intake as any).legalFramework;
      const frameworkLabel = typeof rawFramework === "string" && rawFramework.trim()
        ? rawFramework.trim()
        : (rawFramework && typeof rawFramework === "object"
            ? String((rawFramework as any).label ?? (rawFramework as any).name ?? "").trim()
            : "");
      const ctrlName = typeof (intake as any).controllerName === "string" ? (intake as any).controllerName : "Controller";
      const procName = typeof (intake as any).processorName === "string" ? (intake as any).processorName : "Processor";
      const generatedLine = `Generated ${new Date(record.created_at).toLocaleDateString("en-US",{ year:"numeric", month:"long", day:"numeric" })}`;
      const dpaTitle = `Your Custom DPA — ${ctrlName} / ${procName}`;
      const dpaMetaLine = frameworkLabel ? `${generatedLine} · ${frameworkLabel}` : generatedLine;
      // doc 113 Part I (RULING 9.4) — contract mode renders only when the
      // deterministic path populated `report_data.dpa_contract`; every other
      // record (us-state/canada model path, pre-existing rows) keeps today's
      // unmodified flat-text rendering.
      const dpaContractData = (record.report_data as any)?.dpa_contract;
      html = (dpaContractData && typeof dpaContractData === "object" && Array.isArray(dpaContractData.sections) && dpaContractData.sections.length)
        ? buildDpaContractHTML(dpaContractData, (record.report_data as any)?.clause_coverage, { title: dpaTitle, metaLine: dpaMetaLine })
        : buildTextReportHTML({
            title: dpaTitle,
            metaLine: dpaMetaLine,
            text: record.document_text || "",
            showJurisdictionChip: false,
          });
      generatedAt = record.created_at || new Date().toISOString();
    } else if (tool_type === "cppa_risk") {
      if (!record.report_data) {
        return new Response(JSON.stringify({ error: "Report data not found or not yet complete" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const skel = readSkeletonDocument(record.report_data);
      // DOC 127 PHASE B (2026-09-01) — the product string activates the
      // Risk-scoped presentation system (surface-keyed tables, marker/
      // heading split, determination card, methodology strip, indentation).
      html = skel
        ? buildSkeletonReportHTML(skel, record, "CPPA Privacy Risk Assessment", "cppa-risk")
        : buildCPPARiskReportHTML(record.report_data, record);
      generatedAt = record.created_at || new Date().toISOString();
    } else if (tool_type === "cppa_admt") {
      if (!record.report_data) {
        return new Response(JSON.stringify({ error: "Report data not found or not yet complete" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // CONVERSION SWAP (2026-08-20): new "cppa_admt" purchases run the v2
      // engine and are stamped module="admt_v2" (see create-tool-checkout's
      // MODULE_FOR_TOOL). PDFDownloadButton still sends tool_type "cppa_admt"
      // for both — the module discriminates which spine actually produced
      // the record, and only the v2 shape needs the "cppa-admt-v2" product
      // string to activate footnote-marker substitution.
      const isAdmtV2Record = record.module === "admt_v2";
      const skelAdmt = readSkeletonDocument(record.report_data);
      html = skelAdmt
        ? buildSkeletonReportHTML(skelAdmt, record, "ADMT Compliance Assessment", isAdmtV2Record ? "cppa-admt-v2" : undefined)
        : buildADMTReportHTML(record.report_data, record);
      generatedAt = record.created_at || new Date().toISOString();
    } else if (tool_type === "cppa_admt_v2") {
      // ITEM SO-12 — CONVERSION build. Always carries skeleton_document (no
      // legacy narrative path exists for this tool_type — the "cppa_admt_v2"
      // structural-minimum check above already guarantees it before this
      // branch is reached). The "cppa-admt-v2" product string activates the
      // footnote-marker substitution piloted in skeletonSectionsHtml.
      if (!record.report_data) {
        return new Response(JSON.stringify({ error: "Report data not found or not yet complete" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const skelAdmtV2 = readSkeletonDocument(record.report_data);
      if (!skelAdmtV2) {
        return new Response(JSON.stringify({ error: "report_data_invalid", detail: "skeleton_document" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // BATCH 19 (doc 111 queue) — retitle leftover: the product is the
      // "CPPA ADMT Compliance Assessment" (Batch 9 retitle); the fallback
      // must match the skeleton title, never resurrect the old name.
      html = buildSkeletonReportHTML(skelAdmtV2, record, "CPPA ADMT Compliance Assessment", "cppa-admt-v2");
      generatedAt = record.created_at || new Date().toISOString();
    } else if (tool_type === "cppa_cybersecurity") {
      const intake = record.intake_data || {};
      const parts = [record.document_a_text, record.document_b_text].filter(Boolean);
      const hasStructured = record.report_data && typeof record.report_data === "object"
        && Array.isArray((record.report_data as any).controls);
      // SO-4: when the report carries the byte-pinned skeleton document, that
      // document IS the customer report — the legacy narrative path is bypassed.
      const skelCyber = readSkeletonDocument(record.report_data);
      if (skelCyber) {
        html = buildSkeletonReportHTML(skelCyber, record, "CPPA Cybersecurity Audit Readiness Report", "cppa-cyber");
      } else if (parts.length === 0 && hasStructured) {
        // Structured report path: render via dedicated HTML template that
        // emits compact FSOR refs + formatted enforcement precedents and
        // never dumps internal field names or verbatim agency_response text.
        html = buildCPPACyberReportHTML(record.report_data, record);

      } else {
        const text = parts.length
          ? parts.join("\n\n──────────────────────────────\n\n")
          : summaryToText(record.report_data);
        html = buildTextReportHTML({
          title: "CPPA Cybersecurity Audit",
          metaLine: `Generated ${new Date(record.created_at).toLocaleDateString("en-US",{ year:"numeric", month:"long", day:"numeric" })}` +
            (intake.organizationName ? ` · ${intake.organizationName}` : "") + " · California (CPPA)",
          text,
          showJurisdictionChip: false,
        });
      }
      generatedAt = record.created_at || new Date().toISOString();
    } else if (tool_type === "cppa_scope") {
      const text = summaryToText({
        in_scope: record.in_scope,
        obligation_map: record.obligation_map,
      });
      html = buildTextReportHTML({
        title: "CPPA Scope Check",
        metaLine: `Generated ${new Date(record.created_at).toLocaleDateString("en-US",{ year:"numeric", month:"long", day:"numeric" })} · California (CPPA)`,
        text,
        showJurisdictionChip: false,
      });
      generatedAt = record.created_at || new Date().toISOString();
    } else if (tool_type === "registration_assessment") {
      // SO-8 WIRE-IN: the byte-pinned registration skeleton IS the customer
      // document when the pipeline assembled one; the legacy builder survives
      // only for rows generated before the wire-in.
      const skelReg = readSkeletonDocument(record.result_summary);
      html = skelReg
        ? buildSkeletonReportHTML(skelReg, record, "Registration Assessment")
        : buildRegistrationReportHTML(record);
      generatedAt = record.created_at || new Date().toISOString();
    } else if (tool_type === "registration_document") {
      html = buildTextReportHTML({
        title: `Registration Filing — ${record.jurisdiction_code || ""}`,
        metaLine: `Generated ${new Date(record.created_at).toLocaleDateString("en-US",{ year:"numeric", month:"long", day:"numeric" })} · ${record.document_type || ""} · ${record.language || "en"}`,
        text: record.content_text || "",
        showJurisdictionChip: false,
      });
      generatedAt = record.created_at || new Date().toISOString();
    } else { // brief
      const sections = record.custom_sections || {};
      const text = typeof sections === "string"
        ? sections
        : summaryToText(sections);
      html = buildTextReportHTML({
        title: `Intelligence Brief — ${record.week_label || ""}`,
        metaLine: `Generated ${new Date(record.generated_at || record.created_at || Date.now()).toLocaleDateString("en-US",{ year:"numeric", month:"long", day:"numeric" })}`,
        text,
        showJurisdictionChip: false,
      });
      generatedAt = record.generated_at || record.created_at || new Date().toISOString();
    }

    // ITEM 369-IR LEG 1 — the two IR artifacts get distinct filenames so a user
    // holding both files can tell them apart without opening them.
    const attachmentName = tool_type === "ir_playbook"
      ? `EndUserPrivacy-${irArtifact === "incident_worksheet" ? "Incident-Worksheet" : "Standing-Playbook"}-${new Date(generatedAt).toISOString().slice(0, 10)}.pdf`
      : makeAttachmentName(tool_type, generatedAt);


    html = applyUniversalDisclaimerHtml(html);

    const pdfBytes = await generatePDF(html, footerTitleFromDocument(html, attachmentName));

    let pdfUrl: string | null = null;
    if (pdfBytes) {
      const storagePath = `reports/${table}/${assessment_id}${artifactPathSuffix}/${attachmentName}`;
      const { error: storageError } = await supabase.storage
        .from("assessment-reports")
        .upload(storagePath, pdfBytes, {
          contentType: "application/pdf",
          upsert: true,
        });
      if (!storageError) {
        // SEC-1b: short-TTL signed URL (600s), never persisted.
        const { data: urlData } = await supabase.storage
          .from("assessment-reports")
          .createSignedUrl(storagePath, 600);
        pdfUrl = urlData?.signedUrl || null;
      }
    }

    // SEC-1b: do NOT persist pdf_url. URL is returned to the authorized caller only.


    return new Response(
      JSON.stringify({ success: true, pdf_generated: !!pdfBytes, pdf_url: pdfUrl, email_sent: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const err = e as Error;
    console.error(JSON.stringify({
      evt: "generate_report_pdf_error",
      name: err?.name || "Error",
      message: err?.message || String(e),
      stack: err?.stack || null,
    }));
    return new Response(JSON.stringify({ error: "Report generation failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
