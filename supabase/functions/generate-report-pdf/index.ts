// pdf build active
// BUILD_STAMP — real exported constant. Bump on every behavior edit.
// External-verification gate: clone HEAD sha == BUILD_STAMP prefix.
export const BUILD_STAMP = "generate-report-pdf-item271-replay-review@2026-07-30T06:30:00Z";
// generate-report-pdf: DOCX/PDF export for assessment reports.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applyUniversalDisclaimerHtml } from "../_shared/report-disclaimer.ts";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { readAdmtScope } from "../_shared/admt-scope-contract.ts";
import {
  coerceNarrativeScalar,
  coerceNarrativeList,
  headerForSection,
} from "../_shared/report-contracts/cppa-risk-shape.ts";
import { hasProse9Document } from "../_shared/report-contracts/cppa-risk-prose9.ts";
import { renderAuthorityExhibitHtml, AUTHORITY_EXHIBIT_CSS } from "../_shared/report-exhibits/authority-exhibit.ts";
import { buildCPPARiskProse9HTML } from "./prose9-html.ts";



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
        margin: { top: "16mm", right: "14mm", bottom: "18mm", left: "14mm" },
        use_print: false,
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
  <p class="eyebrow">Compliance Tool · Customized Analysis</p>
  <h1>Legitimate Interest Assessment</h1>
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
<p class="meta">${escHtml(report.data_currency_note || "")}</p>
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
</style></head><body>
<div class="shell">
<header class="header">
  <img class="logo-img" src="${LOGO_URL}" alt="End User Privacy" />
  <p class="eyebrow">Compliance Tool · Customized Analysis</p>
  <h1>GDPR Governance Assessment</h1>
  <div class="meta">${buildReportMetaLine({ generatedAt: report.generated_at, organizationName: assessment?.organization_name }).replace(/<[^>]+>/g,'')}</div>
</header>
<div class="body">
<div style="border:1px solid #dde5ea;border-radius:8px;padding:14px 18px;margin-bottom:20px;background:#f8fafc;">
  <table style="width:100%;border-collapse:collapse;font-size:11px;">
    <tr>
      <td style="padding:3px 12px 3px 0;color:#5c6d7a;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;width:140px;">Organization</td>
      <td style="padding:3px 0;color:#1a1916;">${escHtml(assessment?.organization_name || report.organisation_profile?.organization_name || "—")}</td>
      <td style="padding:3px 12px 3px 24px;color:#5c6d7a;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;width:100px;">Sector</td>
      <td style="padding:3px 0;color:#1a1916;">${escHtml(report.organisation_profile?.sector || "—")}</td>
    </tr>
    <tr>
      <td style="padding:3px 12px 3px 0;color:#5c6d7a;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Jurisdictions</td>
      <td style="padding:3px 0;color:#1a1916;" colspan="3">${escHtml(
        Array.isArray(report.organisation_profile?.jurisdictions)
          ? report.organisation_profile.jurisdictions.join(", ")
          : (report.organisation_profile?.jurisdictions || "—")
      )}</td>
    </tr>
    <tr>
      <td style="padding:3px 12px 3px 0;color:#5c6d7a;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Generated</td>
      <td style="padding:3px 0;color:#1a1916;">${escHtml(
        report.generated_at
          ? new Date(report.generated_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
          : "—"
      )}</td>
    </tr>
  </table>
</div>
<h2>Executive Summary</h2>
<div class="rating">Readiness: ${escHtml(report.overall_readiness_rating || "Unknown")}</div>
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
      return ` <span style="display:inline-block;margin-left:6px;padding:1px 5px;font-size:9px;border:1px solid #b45309;background:#fef3c7;color:#92400e;border-radius:3px;text-transform:uppercase;">inferred — confirm</span>`;
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
</style></head><body>
<div class="shell">
<header class="header">
  <img class="logo-img" src="${LOGO_URL}" alt="End User Privacy" />
  <p class="eyebrow">Compliance Tool · Customized Analysis</p>
  <h1>Impact Assessment Builder</h1>
  <div class="meta">${buildReportMetaLine({ generatedAt: report.generated_at, organizationName: dpia?.organization_name, extra: [meta.processing_activity_name ? `Processing activity: ${meta.processing_activity_name}` : null, `Version: ${meta.framework_version || "1.0"}`].filter(Boolean).join(" · ") }).replace(/<[^>]+>/g,'')}</div>
</header>
<div class="body">
${report.has_unresolved_placeholders ? `<div style="background:#7c1a1a;color:#fff;padding:10px 16px;font-size:12px;font-weight:600;border-radius:6px;margin-bottom:16px;letter-spacing:0.03em;">⚠ DRAFT — REQUIRED INPUTS INCOMPLETE — DO NOT SIGN OR RELY ON THIS DOCUMENT until all fields marked [TO COMPLETE] and [TO BE ASSESSED] have been resolved.</div>` : ""}
<div class="disclaimer"><strong>IMPORTANT: </strong>${escHtml(report.framework_disclaimer || "")}</div>
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
<h3>DPIA technical sheet</h3>${prose("Team (RACI)", ts.team_raci)}${prose("Reference materials", ts.reference_materials)}${prose("Reasons to conduct", Array.isArray(ts.reasons_to_conduct) ? ts.reasons_to_conduct.join("; ") : ts.reasons_to_conduct)}${prose("Scope", ts.scope)}${prose("Completion date", ts.completion_date)}${prose("Formal validation date", ts.formal_validation_date)}${prose("Publication intent", ts.publication_intent)}`)}

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

${safeSec("6. Conclusion and Decision", cc, () => `${prose("Decision", cc?.decision)}${Array.isArray(cc?.conditions) && cc.conditions.length ? `<p class="label">Conditions:</p><ul>${cc.conditions.map((c: any) => `<li>${sanitizeNarrative(typeof c === "string" ? c : JSON.stringify(c))}</li>`).join("")}</ul>` : ""}${prose("Supervisory authority consultation", cc?.supervisory_authority_consultation_required)}${prose("Review schedule", cc?.review_schedule)}${prose("Justification", cc?.justification)}`)}
${report.section_6_conclusion?.sign_off_template ? `<h2>Sign-Off Record</h2>
<div class="signoff">
Name: ___________________________<br>
Role: ___________________________<br>
Date of review: _________________<br>
Decision: [ ] Processing may proceed &nbsp;&nbsp; [ ] Further mitigation required<br>
Signature: ______________________
</div>` : ""}
<div class="disclaimer"><strong>IMPORTANT: </strong>${escHtml(report.framework_disclaimer || "")}</div>
</div></div></body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────
// FREE-FORM ASSESSMENT TEXT BUILDER (Biometric, IR Playbook, DPA)
// Mirrors the on-screen ReportShell + AssessmentReport styling.
// ─────────────────────────────────────────────────────────────────────────

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
  callout?: { kind: "warn" | "muted"; title?: string; html: string };
  /**
   * PDF-1: pre-body HTML block rendered verbatim (unescaped) BEFORE section
   * parsing. Use this for renderer-owned metadata blocks (IR playbook
   * "Prepared for" card) so their raw HTML is not shoved through
   * parseTextBlocks and rendered as literal text.
   */
  htmlPrefix?: string;
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
    --teal:#2d9b90; --teal-soft:#e5f4f2; --warn:#b45309; --warn-soft:#fdf3e1; --accent:#2d9b90;
  }
  * { box-sizing: border-box; }
  body { font-family:'Times New Roman', Times, serif; color:var(--navy-ink);
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
  .disclaimer { border-left:4px solid var(--teal); background:var(--teal-soft);
    border-radius:0 6px 6px 0; padding:10px 14px; font-size:11px; margin-bottom:16px; }
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
  p.body-p, .sub-trailing, .li-body { font-size:12px; line-height:1.6; color:var(--navy-ink); margin:0 0 8px; }
  ol.num-list, ul.dot-list { list-style:none; padding:0; margin:8px 0 4px; }
  ol.num-list li, ul.dot-list li { display:flex; gap:10px; align-items:flex-start;
    margin-bottom:7px; page-break-inside:avoid; }
  ol.num-list .num { flex:0 0 auto; width:18px; height:18px; border-radius:999px;
    background:var(--navy); color:#fff; font-size:10px; font-weight:600;
    display:inline-flex; align-items:center; justify-content:center; margin-top:1px; }
  ul.dot-list .dot { flex:0 0 auto; width:6px; height:6px; border-radius:999px;
    background:var(--teal); margin-top:8px; }
  .footer { margin-top:22px; padding-top:12px; border-top:1px solid var(--border);
    font-size:10px; color:var(--slate); text-align:center; }
  table.md-table { border-collapse:collapse; width:100%; font-size:10.5pt; margin:12px 0; }
  table.md-table th, table.md-table td { border:1px solid var(--border); padding:6px 10px; text-align:left; vertical-align:top; }
  table.md-table th { background:var(--silver); font-weight:600; color:var(--navy); }
</style></head>
<body><div class="shell">
  <header class="header">
    <img class="logo-img" src="${LOGO_URL}" alt="End User Privacy" />
    <p class="eyebrow">Compliance Tool · Customized Analysis</p>
    <h1>${escHtml(opts.title)}</h1>
    ${opts.metaLine ? `<div class="meta">${escHtml(opts.metaLine)}</div>` : ""}
  </header>
  <div class="body">
    ${calloutHtml}
    ${opts.htmlPrefix ?? ""}
    ${sectionsHtml}
    <div class="footer">EndUserPrivacy.com · Generated ${new Date().toLocaleDateString("en-US",{ year:"numeric", month:"long", day:"numeric" })}</div>
  </div>
</div></body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────
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
  :root { --navy:#0c2a44; --ink:#1a1916; --paper:#f5f8fa; --card:#ffffff; --border:#dde5ea; --muted:#5c6d7a; --teal:#2d9b90; --teal-soft:#e5f4f2; --red:#a32d2d; --red-soft:#fce8e8; --orange:#b45309; --orange-soft:#fdf3e1; --amber:#8b5e0a; --amber-soft:#fef9ec; --green:#1e6b3c; --green-soft:#eafaf1; }
  * { box-sizing:border-box; }
  body { font-family:'Times New Roman', Times, serif; color:var(--ink); background:var(--paper); font-size:11pt; line-height:1.5; margin:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
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
  .status-neutral { background:#f3f4f6; color:var(--muted); }
  .label { font-weight:700; color:var(--navy); }
  .footer { margin-top:22px; padding-top:12px; border-top:1px solid var(--border); font-size:10px; color:var(--muted); text-align:center; }
</style></head><body><div class="shell">
  <header class="header">
    <img class="logo-img" src="${LOGO_URL}" alt="End User Privacy" />
    <p class="eyebrow">Compliance Tool · Customized Analysis</p>
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
    ${report?.enforcement_context ? `<div class="callout"><p class="label">Enforcement Context</p><p>${text(report.enforcement_context)}</p></div>` : ""}
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
  const exec = coerceNarrativeScalar(report.executive_summary);
  const summaryNarr = coerceNarrativeScalar(summary.narrative);
  const submission = coerceNarrativeScalar(report.submission_summary);
  const activityPara = coerceNarrativeList(report.risk_assessment_by_activity);
  const scopeConf = coerceNarrativeList(report.scope_confirmation);
  const scopeTrig = coerceNarrativeList(report.scope_and_triggers);
  const priority = coerceNarrativeList(report.priority_actions);
  const nextSteps = coerceNarrativeList(report.next_steps);
  const strengthen = coerceNarrativeList(report.strengthen_items);
  const exceptions = coerceNarrativeList(report.exception_analysis);
  const infoNeeded = coerceNarrativeList(report.information_needed);
  const recordSuf = coerceNarrativeList(report.record_sufficiency);
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
  body { font-family:'Times New Roman',Times,serif; color:var(--ink); background:var(--paper); font-size:11pt; line-height:1.55; margin:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
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
  .footer { margin-top:22px; padding-top:12px; border-top:1px solid var(--border); font-size:10px; color:var(--muted); text-align:center; }
</style></head><body><div class="shell">
  <header class="header">
    <img class="logo-img" src="${LOGO_URL}" alt="End User Privacy" />
    <p class="eyebrow">Compliance Tool · Customized Analysis</p>
    <h1>CPPA Privacy Risk Assessment</h1>
    ${buildReportMetaLine({ generatedAt: record?.created_at || Date.now(), jurisdictionLabel: "California (CPPA)", organizationName: orgName })}
  </header>
  <div class="body">
    ${opening ? `<section><div class="opening">${para(opening)}</div></section>` : ""}
    ${exec ? `<section><h2>${text(headerForSection("executive_summary", "Executive Summary"))}</h2>${para(exec)}</section>` : ""}
    ${(summaryNarr || summary.company_name || summary.assessment_date || summary.overall_risk_level) ? `<section><h2>${text(headerForSection("assessment_summary", "Assessment Summary"))}</h2>
      ${summary.company_name ? `<p><span class="label">Company:</span> ${text(summary.company_name)}</p>` : ""}
      ${summary.assessment_date ? `<p><span class="label">Assessment date:</span> ${text(summary.assessment_date)}</p>` : ""}
      ${summary.overall_risk_level ? `<p><span class="label">Overall risk level:</span> ${text(summary.overall_risk_level)}</p>` : ""}
      ${summary.exceptions_status ? `<p><span class="label">Exceptions:</span> ${text(summary.exceptions_status)}</p>` : ""}
      ${summaryNarr ? para(summaryNarr) : ""}
    </section>` : ""}
    ${listSection("scope_and_triggers", "Scope & Triggers", scopeTrig || scopeConf)}
    ${listSection("processing_narrative", "How the business processes personal information", processingNarrative)}
    ${listSection("risk_assessment_by_activity", "Risk Assessment by Activity", activityPara)}
    ${buildCPPARiskDeliverablesHTML(report)}
    ${listSection("exception_analysis", "Exception Analysis", exceptions)}
    ${listSection("priority_actions", "Priority Actions", priority)}
    ${listSection("next_steps", "Next Steps", nextSteps)}
    ${listSection("strengthen_items", "What Would Strengthen the Record", strengthen)}
    ${listSection("information_needed", "Items for Your Review", infoNeeded)}
    ${listSection("record_sufficiency", "Record Sufficiency", recordSuf)}
    ${submission ? `<section><h2>${text(headerForSection("submission_summary", "Submission Summary"))}</h2>${para(submission)}</section>` : ""}
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
  const activities = Array.isArray(report.risk_assessment_by_activity) ? report.risk_assessment_by_activity : [];
  const exceptions = Array.isArray(report.exception_analysis) ? report.exception_analysis : [];
  // QB-P25 B3 — sort priority actions by rank (1 = highest); missing ranks sink last.
  const actionsRaw = Array.isArray(report.priority_actions) ? report.priority_actions : [];
  const actions = [...actionsRaw].sort((a: any, b: any) => {
    const ar = typeof a?.rank === "number" ? a.rank : Number.POSITIVE_INFINITY;
    const br = typeof b?.rank === "number" ? b.rank : Number.POSITIVE_INFINITY;
    return ar - br;
  });
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
  :root { --navy:#0c2a44; --ink:#1a1916; --paper:#f5f8fa; --card:#fff; --border:#dde5ea; --muted:#5c6d7a; --teal:#2d9b90; --teal-soft:#e5f4f2; --orange:#b45309; --orange-soft:#fdf3e1; --red:#a32d2d; --red-soft:#fce8e8; }
  * { box-sizing:border-box; }
  body { font-family:'Times New Roman',Times,serif; color:var(--ink); background:var(--paper); font-size:11pt; line-height:1.5; margin:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
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
    <p class="eyebrow">Compliance Tool · Customized Analysis</p>
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
      ${activities.map((a: any) => `<div class="card">
        <h3>${text(a.activity || "")}</h3>
        ${a.purpose ? `<p><span class="label">Purpose:</span> ${text(a.purpose)}</p>` : ""}
        ${a.statutory_basis ? `<p><span class="label">Statutory basis:</span> ${text(a.statutory_basis)}</p>` : ""}
        ${a.section_7153_mapping ? `<p><span class="label">§ 7153 mapping:</span> ${text(a.section_7153_mapping)}</p>` : ""}
        ${a.current_safeguards ? `<p><span class="label">Current safeguards:</span> ${text(a.current_safeguards)}</p>` : ""}
        ${a.safeguard_gaps ? `<p><span class="label">Safeguard deficiencies:</span> ${text(a.safeguard_gaps)}</p>` : ""}
        ${a.benefits_to_business ? `<p><span class="label">Business benefits:</span> ${text(a.benefits_to_business)}</p>` : ""}
        ${a.benefits_to_consumers ? `<p><span class="label">Consumer benefits:</span> ${text(a.benefits_to_consumers)}</p>` : ""}
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
  :root { --navy:#0c2a44; --ink:#1a1916; --paper:#f5f8fa; --card:#ffffff; --border:#dde5ea; --muted:#5c6d7a; --teal:#2d9b90; --teal-soft:#e5f4f2; --red:#a32d2d; --red-soft:#fce8e8; --orange:#b45309; --orange-soft:#fdf3e1; --amber:#8b5e0a; --amber-soft:#fef9ec; --green:#1e6b3c; --green-soft:#eafaf1; }
  * { box-sizing:border-box; }
  body { font-family:'Times New Roman', Times, serif; color:var(--ink); background:var(--paper); font-size:11pt; line-height:1.5; margin:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
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
  :root { --navy:#0c2a44; --ink:#1a1916; --paper:#f5f8fa; --card:#ffffff; --border:#dde5ea; --muted:#5c6d7a; --teal:#2d9b90; --teal-soft:#e5f4f2; --red:#a32d2d; --red-soft:#fce8e8; --orange:#b45309; --orange-soft:#fdf3e1; --amber:#8b5e0a; --amber-soft:#fef9ec; --green:#1e6b3c; --green-soft:#eafaf1; }
  * { box-sizing:border-box; }
  body { font-family:'Times New Roman', Times, serif; color:var(--ink); background:var(--paper); font-size:11pt; line-height:1.5; margin:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
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
  .status-mature { background:#dbeafe; color:#1d4ed8; }
  .status-neutral { background:#f3f4f6; color:var(--muted); }
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
    ${report?.enforcement_context ? `<div class="callout"><p class="label">Enforcement Context</p><p>${text(report.enforcement_context)}</p></div>` : ""}
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

  const priorityBlock = Array.isArray(report?.priority_actions) && report.priority_actions.length
    ? `<section class="section"><h2>Priority Actions</h2><ol>${report.priority_actions.map((a: string) => `<li>${text(a.replace(/^(\s*\d+[.)]\s*)+/, ""))}</li>`).join("")}</ol></section>`
    : "";

  const riskNote = report?.risk_assessment_note
    ? `<div class="callout"><p class="label">Risk Assessment Note</p><p>${text(report.risk_assessment_note)}</p></div>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ADMT Compliance Assessment</title>
<style>
  :root { --navy:#0c2a44; --ink:#1a1916; --paper:#f5f8fa; --card:#ffffff; --border:#dde5ea; --muted:#5c6d7a; --teal:#2d9b90; --teal-soft:#e5f4f2; --red:#a32d2d; --red-soft:#fce8e8; --orange:#b45309; --orange-soft:#fdf3e1; --amber:#8b5e0a; --amber-soft:#fef9ec; --green:#1e6b3c; --green-soft:#eafaf1; }
  * { box-sizing:border-box; }
  body { font-family:'Times New Roman', Times, serif; color:var(--ink); background:var(--paper); font-size:11pt; line-height:1.5; margin:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
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
  .status-neutral { background:#f3f4f6; color:var(--muted); }
  .label { font-weight:700; color:var(--navy); }
  .footer { margin-top:22px; padding-top:12px; border-top:1px solid var(--border); font-size:10px; color:var(--muted); text-align:center; }
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
    ${enfBlock}
    ${riskNote}
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
  <span>Compliance Tool · Customized Analysis</span>
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
  dpia_framework: "Impact-Assessment-Builder",
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

    const { tool_type, assessment_id, user_email, user_name, result_url, force, mode, result_id } = await req.json();

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
      const replayBytes = await generatePDF(replayHtml, replayName.replace(".pdf", ""));
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
        return new Response(
          JSON.stringify({ error: "forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // SEC-1b: sign-only mode — return a fresh short-TTL (600s) signed URL for
    // an already-rendered cached PDF. Never persists the URL. Never renders.
    if (mode === "sign-only") {
      const folder = `reports/${table}/${assessment_id}`;
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
        "cppa_risk", "cppa_cybersecurity", "cppa_admt", "biometric_checker",
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
            // Only enforce when the structured path would be selected.
            if (Array.isArray(rd.controls) || rd.controls != null) {
              bodyOk = isNonEmptyArr(rd.controls);
              missingKey = "controls";
            }
            break;
          case "cppa_admt":
            bodyOk = typeof rd.system_name === "string" && rd.system_name.length > 0;
            missingKey = "system_name";
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
        const folder = `reports/${table}/${assessment_id}`;
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
      html = buildLIReportHTML(report, record);
      generatedAt = report.generated_at || record.created_at || new Date().toISOString();
    } else if (tool_type === "governance_assessment") {
      const report = record.report_data as any;
      html = buildGovernanceReportHTML(report, record);
      generatedAt = report.generated_at || record.created_at || new Date().toISOString();
    } else if (tool_type === "dpia_framework") {
      const report = record.report_data as any;
      html = buildDPIAReportHTML(report, record);
      generatedAt = report.generated_at || record.created_at || new Date().toISOString();
    } else if (tool_type === "biometric_checker") {
      const intake = record.intake_data || {};
      const text = record.analysis_text || record.report_data?.assessment_text || "";
      // BIPA litigation risk callout retired 2026-07-14 — bipa_risk field removed from report_data.
      const metaLine = `Generated ${new Date(record.created_at).toLocaleDateString("en-US",{ year:"numeric", month:"long", day:"numeric" })}` +
        ((record.jurisdictions || intake.jurisdictions || []).length
          ? ` · ${(record.jurisdictions || intake.jurisdictions).join(", ")}` : "");
      const orgNameForPdf = (intake as any).orgName || (intake as any).organizationName || "";
      html = buildTextReportHTML({
        title: "Biometric Compliance Assessment",
        metaLine: `${metaLine}${orgNameForPdf ? ` · Prepared for: ${orgNameForPdf}` : ""}`,
        text,
        showJurisdictionChip: true,
        // BIPA risk callout branch retired 2026-07-14
        callout: undefined,
      });
      generatedAt = record.created_at || new Date().toISOString();
    } else if (tool_type === "ir_playbook") {
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
      <td style="padding:3px 0;color:#7c1a1a;font-weight:600;">DRAFT — CONFIRM ALL DEADLINES WITH COUNSEL</td>
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
      html = buildTextReportHTML({
        title: `Your Custom DPA — ${ctrlName} / ${procName}`,
        metaLine: frameworkLabel ? `${generatedLine} · ${frameworkLabel}` : generatedLine,
        text: record.document_text || "",
        showJurisdictionChip: false,
      });
      generatedAt = record.created_at || new Date().toISOString();
    } else if (tool_type === "cppa_risk") {
      if (!record.report_data) {
        return new Response(JSON.stringify({ error: "Report data not found or not yet complete" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      html = buildCPPARiskReportHTML(record.report_data, record);
      generatedAt = record.created_at || new Date().toISOString();
    } else if (tool_type === "cppa_admt") {
      if (!record.report_data) {
        return new Response(JSON.stringify({ error: "Report data not found or not yet complete" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      html = buildADMTReportHTML(record.report_data, record);
      generatedAt = record.created_at || new Date().toISOString();
    } else if (tool_type === "cppa_cybersecurity") {
      const intake = record.intake_data || {};
      const parts = [record.document_a_text, record.document_b_text].filter(Boolean);
      const hasStructured = record.report_data && typeof record.report_data === "object"
        && Array.isArray((record.report_data as any).controls);
      if (parts.length === 0 && hasStructured) {
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
      html = buildRegistrationReportHTML(record);
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

    const attachmentName = makeAttachmentName(tool_type, generatedAt);

    html = applyUniversalDisclaimerHtml(html);

    const pdfBytes = await generatePDF(html, attachmentName.replace(".pdf", ""));

    let pdfUrl: string | null = null;
    if (pdfBytes) {
      const storagePath = `reports/${table}/${assessment_id}/${attachmentName}`;
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
