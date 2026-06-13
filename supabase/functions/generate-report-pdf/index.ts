import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";

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
</style></head><body>
<div class="shell">
<header class="header">
  <img class="logo-img" src="${LOGO_URL}" alt="End User Privacy" />
  <p class="eyebrow">Compliance Tool · Customised Analysis</p>
  <h1>Legitimate Interest Assessment</h1>
  <div class="meta">${buildReportMetaLine({ generatedAt: report.generated_at, organizationName: assessment?.organization_name }).replace(/<[^>]+>/g,'')}</div>
</header>
<div class="body">
<div class="disclaimer">${escHtml(report.disclaimer || "")}</div>
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
    return `<div class="section"><h3>${label} <span class="verdict-${verdictClass}">— ${verdictLabel}</span></h3>
<p>${sanitizeNarrative(t.analysis || "")}</p>
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
<div class="disclaimer">${escHtml(report.disclaimer || "")}</div>
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
  <p class="eyebrow">Compliance Tool · Customised Analysis</p>
  <h1>Data Governance Readiness Assessment</h1>
  <div class="meta">${buildReportMetaLine({ generatedAt: report.generated_at, organizationName: assessment?.organization_name }).replace(/<[^>]+>/g,'')}</div>
</header>
<div class="body">
<div class="disclaimer">${escHtml(report.disclaimer || "")}</div>
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
      return `<div class="domain"><h3>${heading} <span class="severity" style="background:${severityColor[dn.severity] || "#5c5a54"}">${escHtml(dn.severity || "")}</span></h3>
<p class="label">Current state</p><p>${escHtml(dn.current_state || "")}</p>
${dn.gap_description ? `<p class="label">Gap</p><p>${escHtml(dn.gap_description)}</p>` : ""}
<p class="label">Regulatory basis</p><p>${escHtml(dn.regulatory_basis || "")}</p>
<p class="label">Recommended action</p><p><strong>${escHtml(dn.recommended_action || "")}</strong></p>
<p class="meta">${escHtml(dn.suggested_owner || "")} &nbsp;|&nbsp; ${escHtml(dn.suggested_timeline || "")}</p></div>`;
    }).join("");
  })()}
<h2>Cross-Domain Considerations</h2>
<p>${escHtml(report.interaction_effects || "")}</p>
<div class="disclaimer">${escHtml(report.disclaimer || "")}</div>
</div></div></body></html>`;
}

function buildDPIAReportHTML(report: any, dpia: any): string {
  const meta = report.dpia_metadata || {};
  const sections = [
    ["section_1_description", "1. Description of Processing"],
    ["section_2_necessity", "2. Necessity and Proportionality"],
    ["section_3_risks", "3. Risk Assessment"],
    ["section_4_mitigation", "4. Mitigation Measures"],
    ["section_5_consultation", "5. DPO and Stakeholder Consultation"],
    ["section_6_conclusion", "6. Conclusion and Sign-Off"],
  ] as const;

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
</style></head><body>
<div class="shell">
<header class="header">
  <img class="logo-img" src="${LOGO_URL}" alt="End User Privacy" />
  <p class="eyebrow">Compliance Tool · Customised Analysis</p>
  <h1>DPIA Framework</h1>
  <div class="meta">${buildReportMetaLine({ generatedAt: report.generated_at, organizationName: dpia?.organization_name, extra: [meta.processing_activity_name ? `Processing activity: ${meta.processing_activity_name}` : null, `Version: ${meta.framework_version || "1.0"}`].filter(Boolean).join(" · ") }).replace(/<[^>]+>/g,'')}</div>
</header>
<div class="body">
<div class="disclaimer"><strong>IMPORTANT: </strong>${escHtml(report.framework_disclaimer || "")}</div>
${(meta.applicable_frameworks || []).length ? `<p><span class="label">Applicable frameworks: </span>${(meta.applicable_frameworks || []).join(" &nbsp;|&nbsp; ")}</p>` : ""}
${meta.supervisory_authority_consultation_trigger ? `<div class="completion"><strong>Supervisory authority consultation trigger: </strong>${meta.supervisory_authority_consultation_trigger}</div>` : ""}
${sections.map(([key, heading]) => {
    const s = report[key] || {};
    return `<h2>${heading}</h2>
${s.guidance_note ? `<div class="guidance"><strong>Article 35 requirement: </strong>${s.guidance_note}</div>` : ""}
${(s.risk_assessment || []).length ? `<ul>${(s.risk_assessment || []).map((r: any) =>
        `<li><strong>${r.risk_type || ""}</strong> — Likelihood: ${r.likelihood || ""}, Severity: ${r.severity || ""}. ${sanitizeNarrative(r.description || "")}</li>`
      ).join("")}</ul>` : ""}
${(s.proposed_measures || []).length ? `<ul>${(s.proposed_measures || []).map((m: any) =>
        `<li><strong>${m.measure || ""}</strong>: ${sanitizeNarrative(m.implementation_guidance || "")} (Residual risk: ${m.residual_risk_after || ""})</li>`
      ).join("")}</ul>` : ""}
${Object.entries(s)
        .filter(([k, v]) => !["title", "guidance_note", "completion_guidance", "risk_assessment", "proposed_measures", "annotations"].includes(k)
          && (typeof v === "string" ? v.trim().length > 0 : typeof v === "boolean"))
        .map(([k, v]) => `<p><span class="label">${k.replace(/_/g, " ")}:</span> ${typeof v === "boolean" ? (v ? "Yes" : "No") : sanitizeNarrative(String(v))}</p>`)
        .join("")}
${Array.isArray(s.annotations) && s.annotations.length ? `<p class="label">Enforcement annotations:</p><ul>${s.annotations.map((a: any) =>
        `<li><strong>${a.regulator || "Enforcement source"}</strong>${a.summary ? ` — ${sanitizeNarrative(a.summary)}` : ""}${a.relevance ? ` (Relevance: ${sanitizeNarrative(a.relevance)})` : ""}</li>`
      ).join("")}</ul>` : ""}
${s.completion_guidance ? `<div class="completion"><strong>Your DPO/Counsel must complete: </strong>${s.completion_guidance}</div>` : ""}`;
  }).join("")}
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

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
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
  /** Optional override for the standard "Not legal advice" disclaimer block. */
  disclaimerHtml?: string;
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
    <p class="eyebrow">Compliance Tool · Customised Analysis</p>
    <h1>${escHtml(opts.title)}</h1>
    ${opts.metaLine ? `<div class="meta">${escHtml(opts.metaLine)}</div>` : ""}
  </header>
  <div class="body">
    <div class="disclaimer">${opts.disclaimerHtml ?? `<span class="kw">Not legal advice.</span>
      This document is a compliance framework generated for informational purposes only.
      It does not create an attorney-client relationship. Always consult qualified legal
      counsel for advice specific to your situation.`}</div>
    ${calloutHtml}
    ${sectionsHtml}
    <div class="footer">EndUserPrivacy.com · Generated ${new Date().toLocaleDateString("en-US",{ year:"numeric", month:"long", day:"numeric" })}</div>
  </div>
</div></body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────
// CPPA shared compact renderers — never emit verbatim agency_response or
// raw internal field-name dumps. Used by both cppa_risk and cppa_cybersecurity.
// ─────────────────────────────────────────────────────────────────────────
function renderCppaFsorCompact(items: any[], maxItems = 2): string {
  if (!Array.isArray(items) || items.length === 0) return "";
  const rows = items.slice(0, maxItems).map((it: any) => {
    const cite = escHtml(it?.citation || it?.regulation_citation || "");
    const summary = escHtml(it?.comment_summary || "");
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
    const summary = escHtml(it?.comment_summary || "");
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
  :root { --navy:#0f172a; --ink:#1a1916; --paper:#faf8f3; --card:#ffffff; --border:#e6e3da; --muted:#5c5a54; --gold:#c0911f; --gold-soft:#fbf3df; --red:#a32d2d; --red-soft:#fce8e8; --orange:#b45309; --orange-soft:#fdf3e1; --amber:#8b5e0a; --amber-soft:#fef9ec; --green:#1e6b3c; --green-soft:#eafaf1; }
  * { box-sizing:border-box; }
  body { font-family:'Times New Roman', Times, serif; color:var(--ink); background:var(--paper); font-size:11pt; line-height:1.5; margin:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .shell { background:var(--card); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
  .header { background:var(--navy); color:#fff; padding:24px 28px; }
  .logo { display:inline-block; background:#fff; color:var(--navy); border-radius:6px; padding:5px 10px; font-size:13px; font-weight:700; margin-bottom:12px; }
  .eyebrow { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.14em; color:#93c5fd; margin:0 0 4px; }
  h1 { font-size:24px; margin:0; line-height:1.2; }
  .meta { margin-top:6px; font-size:11px; color:#cbd5e1; }
  .summary-bar { margin-top:14px; display:flex; gap:8px; flex-wrap:wrap; }
  .pill { display:inline-block; border-radius:999px; padding:4px 10px; font-size:11px; font-weight:700; background:rgba(255,255,255,.12); color:#fff; }
  .body { padding:22px 28px 28px; }
  h2 { color:var(--navy); font-size:17px; margin:24px 0 10px; border-bottom:1px solid var(--border); padding-bottom:6px; }
  h3 { color:var(--navy); font-size:14px; margin:0 0 8px; }
  p { margin:0 0 9px; }
  ul, ol { margin:8px 0 0; padding-left:20px; } li { margin-bottom:5px; }
  .notice { border-left:4px solid var(--gold); background:var(--gold-soft); border-radius:0 6px 6px 0; padding:10px 14px; font-size:11px; margin-bottom:16px; }
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
    <span class="logo">enduserprivacy.com</span>
    <p class="eyebrow">Compliance Tool · Customised Analysis</p>
    <h1>CPPA Privacy Risk Assessment</h1>
    ${buildReportMetaLine({ generatedAt: record.created_at || report?.generated_at || Date.now(), jurisdictionLabel: "California (CPPA)" })}
    <div class="summary-bar">
      ${report?.overall_score !== undefined ? `<span class="pill">Overall score: ${text(report.overall_score)} / 100</span>` : ""}
      ${report?.risk_level ? `<span class="pill">${text(report.risk_level)} risk</span>` : ""}
    </div>
  </header>
  <div class="body">
    <div class="notice"><span class="label">Not legal advice.</span> This compliance framework report does not constitute legal advice. Findings should be reviewed with qualified legal counsel.</div>
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
    <div class="notice"><span class="label">Not legal advice.</span> This compliance framework report does not constitute legal advice. Findings should be reviewed with qualified legal counsel.</div>
    <div class="footer">EndUserPrivacy.com · Generated ${text(generatedDate)}</div>
  </div>
</div></body></html>`;
}

// Dispatch on schema: v3 rows carry part_a; legacy rows carry domains.
function buildCPPARiskReportHTML(report: any, record: any): string {
  if (report && typeof report.part_a === "object" && report.part_a !== null) {
    return buildCPPARiskV3HTML(report, record);
  }
  return buildCPPARiskLegacyHTML(report, record);
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
    .map((c: any) => `<tr><td style="padding:4px 10px;border:1px solid #e6e3da;">${text(c.category)}</td><td style="padding:4px 10px;border:1px solid #e6e3da;text-align:center;">${c.is_spi ? "SPI — § 7001(ccc)" : "PI"}</td></tr>`)
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
    .map((v: any) => `<tr><td style="padding:4px 10px;border:1px solid #e6e3da;">${text(v.vendor)}</td><td style="padding:4px 10px;border:1px solid #e6e3da;">${text(v.role)}</td><td style="padding:4px 10px;border:1px solid #e6e3da;">${Array.isArray(v.pi_categories) ? v.pi_categories.map((c: any) => text(c)).join(", ") : text(v.pi_categories)}</td></tr>`)
    .join("");
  const gatingBlock = gating.ready_for_signoff
    ? `<div class="callout" style="border-left-color:#1e6b3c;background:#eafaf1;"><p class="label">Ready for sign-off</p><p>All automated completeness checks passed. The certifying executive must still review and record the decision in § 8.</p></div>`
    : `<div class="callout"><p class="label">Not yet ready for sign-off</p>${list(Array.isArray(gating.blockers) ? gating.blockers : [])}</div>`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CPPA Privacy Risk Assessment</title>
<style>
  :root { --navy:#0f172a; --ink:#1a1916; --paper:#faf8f3; --card:#ffffff; --border:#e6e3da; --muted:#5c5a54; --gold:#c0911f; --gold-soft:#fbf3df; --red:#a32d2d; --red-soft:#fce8e8; --orange:#b45309; --orange-soft:#fdf3e1; --amber:#8b5e0a; --amber-soft:#fef9ec; --green:#1e6b3c; --green-soft:#eafaf1; }
  * { box-sizing:border-box; }
  body { font-family:'Times New Roman', Times, serif; color:var(--ink); background:var(--paper); font-size:11pt; line-height:1.5; margin:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .shell { background:var(--card); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
  .header { background:var(--navy); color:#fff; padding:24px 28px; }
  .logo { display:inline-block; background:#fff; color:var(--navy); border-radius:6px; padding:5px 10px; font-size:13px; font-weight:700; margin-bottom:12px; }
  .eyebrow { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.14em; color:#93c5fd; margin:0 0 4px; }
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
  .notice { border-left:4px solid var(--gold); background:var(--gold-soft); border-radius:0 6px 6px 0; padding:10px 14px; font-size:11px; margin-bottom:16px; }
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
    <span class="logo">enduserprivacy.com</span>
    <p class="eyebrow">Compliance Tool · Cal. Code Regs. tit. 11 §§ 7150–7157</p>
    <h1>CPPA Privacy Risk Assessment</h1>
    ${buildReportMetaLine({ generatedAt: record.created_at || report?.generated_at || Date.now(), jurisdictionLabel: "California (CPPA)" })}
    <div class="summary-bar">
      ${cover.business_legal_name ? `<span class="pill">${text(cover.business_legal_name)}</span>` : ""}
      ${cover.activity_name ? `<span class="pill">${text(cover.activity_name)}</span>` : ""}
      ${cover.version ? `<span class="pill">v${text(cover.version)}</span>` : ""}
    </div>
  </header>
  <div class="body">
    <div class="notice"><span class="label">Not legal advice.</span> This compliance framework report does not constitute legal advice. Findings should be reviewed with qualified legal counsel.</div>
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
    ${vendorRows ? `<section class="section"><h3>Appendix B — Vendor Register</h3><table><tr><th>Vendor</th><th>Role</th><th>PI categories</th></tr>${vendorRows}</table></section>` : `<section class="section"><h3>Appendix B — Vendor Register</h3><p><em>No vendors recorded.</em></p></section>`}
    ${app.c_admt_note ? `<section class="section"><h3>Appendix C — ADMT Note</h3><p>${typeof app.c_admt_note === "object" ? Object.entries(app.c_admt_note).map(([k, v]) => `<span class="label">${escHtml(capLabel(k))}:</span> ${textJoin(v)}`).join("<br/>") : text(app.c_admt_note)}</p></section>` : `<section class="section"><h3>Appendix C — ADMT Note</h3><p>Not applicable — no automated decision-making technology in scope for this activity.</p></section>`}
    ${app.d_spi_note ? `<section class="section"><h3>Appendix D — Sensitive PI Note</h3><p>${typeof app.d_spi_note === "object" ? Object.entries(app.d_spi_note).map(([k, v]) => `<span class="label">${escHtml(capLabel(k))}:</span> ${textJoin(v)}`).join("<br/>") : text(app.d_spi_note)}</p></section>` : `<section class="section"><h3>Appendix D — Sensitive PI Note</h3><p>Not applicable — no sensitive personal information identified.</p></section>`}
    ${app.e_dpia_gap_fill ? `<section class="section"><h3>Appendix E — DPIA Gap-Fill</h3><p>${typeof app.e_dpia_gap_fill === "object" ? Object.entries(app.e_dpia_gap_fill).map(([k, v]) => `<span class="label">${escHtml(capLabel(k))}:</span> ${textJoin(v)}`).join("<br/>") : text(app.e_dpia_gap_fill)}</p></section>` : `<section class="section"><h3>Appendix E — DPIA Gap-Fill</h3><p>Not applicable — no existing GDPR/UK GDPR DPIA was reported in the intake for this processing activity.</p></section>`}
    <h2>Part B — Submission Summary${b.statute ? ` <span style="font-size:10px;font-weight:400;color:#5c5a54;">(${text(b.statute)})</span>` : ""}</h2>
    <p><span class="label">Business legal name:</span> ${fillIn(b.business_legal_name, "[FILL IN]")}</p>
    ${b.point_of_contact ? `<p><span class="label">Point of contact:</span> ${text(b.point_of_contact)}</p>` : ""}
    ${b.assessment_count_in_period !== undefined ? `<p><span class="label">Assessments in period:</span> ${text(b.assessment_count_in_period)}</p>` : ""}
    ${Array.isArray(b.pi_categories_aggregated) && b.pi_categories_aggregated.length ? `<p><span class="label">PI categories (aggregated):</span> ${b.pi_categories_aggregated.map((c: any) => text(c)).join(", ")}</p>` : ""}
    ${Array.isArray(b.spi_flagged) && b.spi_flagged.length ? `<p><span class="label">SPI flagged:</span> ${b.spi_flagged.map((c: any) => text(c)).join(", ")}</p>` : ""}
    ${b.perjury_attestation_block ? `<div class="attest">${text(b.perjury_attestation_block)}</div>
    <p class="meta" style="margin-top:8px;font-size:10px;color:#b55a00;border-top:1px solid #e6e3da;padding-top:6px;">⚠ Sample document — the certifying executive name, title, and execution date above are placeholder values from the sample intake. Replace with the actual certifying executive's legal name, title, and execution date before this document is signed or submitted to the CPPA.</p>` : ""}
    ${b.submission_banner ? `<div class="callout"><p>${text(b.submission_banner)}</p></div>` : ""}
    <div class="notice"><span class="label">Not legal advice.</span> This compliance framework report does not constitute legal advice. Findings should be reviewed with qualified legal counsel.</div>
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

  // Collect FSOR refs across all controls, dedupe by citation+url, cap at 8.
  const fsorMap = new Map<string, any>();
  for (const c of controls) {
    const items = Array.isArray(c?.fsor_commentary) ? c.fsor_commentary : [];
    for (const it of items) {
      const cite = String(it?.citation || it?.regulation_citation || "").trim();
      const url = String(it?.source_url || "").trim();
      const summary = String(it?.comment_summary || "").trim();
      const key = `${cite}||${url}||${summary.slice(0, 40)}`;
      if (!key.replaceAll("|", "").trim()) continue;
      if (!fsorMap.has(key)) fsorMap.set(key, it);
    }
  }
  const dedupedFsor = Array.from(fsorMap.values()).slice(0, 8);
  const dedupedFsorBlock = dedupedFsor.length
    ? `<section class="section"><h2>Rulemaking context</h2><ul class="fsor-refs">${dedupedFsor.map((it: any) => {
        const cite = escHtml(it?.citation || it?.regulation_citation || "");
        const summary = escHtml(it?.comment_summary || "");
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
          21–59 = Partial (control exists but material gaps remain);
          60–89 = Implemented (control substantially in place, monitor and maintain);
          90–100 = Mature.
          <strong>Status labels:</strong> Critical Gap / Partial / Implemented reflect qualitative maturity, not a binary pass/fail.
          Scores are based on the information provided in the intake; an independent auditor will conduct their own assessment.
        </p></section>`
    : "";

  const statusClass = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "critical gap") return "critical";
    if (s === "gap") return "gap";
    if (s === "partial") return "partial";
    if (s === "implemented") return "compliant";
    return "neutral";
  };

  const intake = record?.intake_data || {};
  const orgName = intake?.organizationName || intake?.profile?.organizationName || "";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CPPA Cybersecurity Audit</title>
<style>
  :root { --navy:#0f172a; --ink:#1a1916; --paper:#faf8f3; --card:#ffffff; --border:#e6e3da; --muted:#5c5a54; --gold:#c0911f; --gold-soft:#fbf3df; --red:#a32d2d; --red-soft:#fce8e8; --orange:#b45309; --orange-soft:#fdf3e1; --amber:#8b5e0a; --amber-soft:#fef9ec; --green:#1e6b3c; --green-soft:#eafaf1; }
  * { box-sizing:border-box; }
  body { font-family:'Times New Roman', Times, serif; color:var(--ink); background:var(--paper); font-size:11pt; line-height:1.5; margin:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .shell { background:var(--card); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
  .header { background:var(--navy); color:#fff; padding:24px 28px; }
  .logo { display:inline-block; background:#fff; color:var(--navy); border-radius:6px; padding:5px 10px; font-size:13px; font-weight:700; margin-bottom:12px; }
  .eyebrow { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.14em; color:#93c5fd; margin:0 0 4px; }
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
  .notice { border-left:4px solid var(--gold); background:var(--gold-soft); border-radius:0 6px 6px 0; padding:10px 14px; font-size:11px; margin-bottom:16px; }
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
  .status-neutral { background:#f3f4f6; color:var(--muted); }
  .label { font-weight:700; color:var(--navy); }
  .footer { margin-top:22px; padding-top:12px; border-top:1px solid var(--border); font-size:10px; color:var(--muted); text-align:center; }
</style></head><body><div class="shell">
  <header class="header">
    <span class="logo">enduserprivacy.com</span>
    <p class="eyebrow">Compliance Tool · Customised Analysis</p>
    <h1>CPPA Cybersecurity Audit</h1>
    ${buildReportMetaLine({ generatedAt: record.created_at || report?.generated_at || Date.now(), organizationName: orgName || null, jurisdictionLabel: "California (CPPA)" })}
    <div class="summary-bar">
      ${report?.overall_score !== undefined ? `<span class="pill">Overall score: ${text(report.overall_score)} / 100</span>` : ""}
      ${report?.readiness_level ? `<span class="pill">${text(report.readiness_level)}</span>` : ""}
    </div>
  </header>
  <div class="body">
    <div class="notice"><span class="label">Not legal advice.</span> This compliance framework report does not constitute legal advice. Findings should be reviewed with qualified legal counsel.</div>
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
    <div class="notice"><span class="label">Not legal advice.</span> This compliance framework report does not constitute legal advice. Findings should be reviewed with qualified legal counsel.</div>
    <div class="footer">EndUserPrivacy.com · Generated ${text(generatedDate)}</div>
  </div>
</div></body></html>`;
}


// ─────────────────────────────────────────────────────────────────────────
// FILENAME HELPERS
// ─────────────────────────────────────────────────────────────────────────
const TOOL_LABELS: Record<string, string> = {
  li_assessment: "LI-Assessment",
  governance_assessment: "Governance-Assessment",
  dpia_framework: "DPIA-Framework",
  biometric_checker: "Biometric-Compliance",
  ir_playbook: "Breach-Response-Playbook",
  dpa_generator: "Custom-DPA",
  cppa_cybersecurity: "CPPA-Cybersecurity-Audit",
  cppa_risk: "CPPA-Risk-Assessment",
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

  try {
    const caller = await verifyCaller(req);
    if (!caller.internal && !caller.userId) {
      return new Response(
        JSON.stringify({ error: "unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { tool_type, assessment_id, user_email, user_name, result_url, force } = await req.json();

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

    // Ownership check — internal callers (service-role / admin sample generation)
    // are trusted; end-user callers must own the record.
    if (!caller.internal && (record as any).user_id && caller.userId !== (record as any).user_id) {
      return new Response(
        JSON.stringify({ error: "forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        "cppa_risk", "cppa_cybersecurity", "biometric_checker",
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
            bodyOk = isNonEmptyObj(rd.dpia_metadata) || isNonEmptyObj(rd.section_1_description);
            missingKey = "dpia_metadata|section_1_description";
            break;
          case "cppa_risk":
            // v3 schema persists part_a/part_b; legacy rows have a domains array.
            bodyOk = isNonEmptyObj(rd.part_a) || isNonEmptyArr(rd.domains);
            missingKey = "part_a|domains";
            break;
          case "cppa_cybersecurity":
            // Only enforce when the structured path would be selected.
            if (Array.isArray(rd.controls) || rd.controls != null) {
              bodyOk = isNonEmptyArr(rd.controls);
              missingKey = "controls";
            }
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
            .createSignedUrl(`${folder}/${cachedFile.name}`, 60 * 60 * 24 * 365);
          if (urlData?.signedUrl) {
            if (TABLES_WITH_PDF_URL.has(table)) {
              await supabase.from(table).update({ pdf_url: urlData.signedUrl }).eq("id", assessment_id);
            }
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
      const bipa = record.report_data?.bipa_risk;
      const metaLine = `Generated ${new Date(record.created_at).toLocaleDateString("en-US",{ year:"numeric", month:"long", day:"numeric" })}` +
        ((record.jurisdictions || intake.jurisdictions || []).length
          ? ` · ${(record.jurisdictions || intake.jurisdictions).join(", ")}` : "");
      html = buildTextReportHTML({
        title: "Biometric Compliance Assessment",
        metaLine,
        text,
        showJurisdictionChip: true,
        callout: bipa ? {
          kind: "warn",
          title: "BIPA Litigation Risk Estimate",
          html: `Low end: <strong>$${(bipa.lowEnd || 0).toLocaleString()}</strong> · High end: <strong>$${(bipa.highEnd || 0).toLocaleString()}</strong>${bipa.note ? `<div style="margin-top:4px;font-size:10.5px;color:#5c5a54;">${escHtml(bipa.note)}</div>` : ""}`,
        } : undefined,
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
      html = buildTextReportHTML({
        title: "Your Incident Response Playbook",
        metaLine: `Generated ${new Date(record.created_at).toLocaleDateString("en-US",{ year:"numeric", month:"long", day:"numeric" })}` +
          (record.organization_name ? ` · ${record.organization_name}` : "") +
          (jurArr.length ? ` · ${jurArr.join(", ")}` : ""),
        text: record.playbook_text || "",
        showJurisdictionChip: false,
        callout: { kind: "muted", html: calloutText },
        disclaimerHtml: `<span class="kw">Not legal advice.</span> This is an operational incident-response playbook generated from your inputs. Deadlines and notification decisions must be confirmed with qualified legal counsel before reliance during a live incident.`,
      });
      generatedAt = record.created_at || new Date().toISOString();
    } else if (tool_type === "dpa_generator") {
      const intake = record.intake_data || {};
      html = buildTextReportHTML({
        title: `Your Custom DPA — ${intake.controllerName || "Controller"} / ${intake.processorName || "Processor"}`,
        metaLine: `Generated ${new Date(record.created_at).toLocaleDateString("en-US",{ year:"numeric", month:"long", day:"numeric" })} · ${intake.legalFramework || "GDPR"}`,
        text: record.document_text || "",
        showJurisdictionChip: false,
        disclaimerHtml: `<span class="kw">Not legal advice.</span> This is a template legal contract generated from your inputs for review by qualified counsel. It is not a negotiated agreement and must not be executed without legal review. It does not create an attorney-client relationship.`,
      });
      generatedAt = record.created_at || new Date().toISOString();
    } else if (tool_type === "cppa_risk") {
      if (!record.report_data) {
        return new Response(JSON.stringify({ error: "Report data not found or not yet complete" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      html = buildCPPARiskReportHTML(record.report_data, record);
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
      const summary = record.result_summary || {};
      const text = summaryToText({
        recommended_jurisdictions: record.recommended_jurisdictions,
        confidence_tier: record.confidence_tier,
        ...summary,
      });
      html = buildTextReportHTML({
        title: "Registration Assessment",
        metaLine: `Generated ${new Date(record.created_at).toLocaleDateString("en-US",{ year:"numeric", month:"long", day:"numeric" })}` +
          (record.organization_name ? ` · ${record.organization_name}` : ""),
        text,
        showJurisdictionChip: false,
      });
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
        // Bucket is private — issue a long-lived signed URL (1 year).
        const { data: urlData } = await supabase.storage
          .from("assessment-reports")
          .createSignedUrl(storagePath, 60 * 60 * 24 * 365);
        pdfUrl = urlData?.signedUrl || null;
      }
    }

    if (pdfUrl && TABLES_WITH_PDF_URL.has(table)) {
      await supabase.from(table).update({ pdf_url: pdfUrl }).eq("id", assessment_id);
    }


    return new Response(
      JSON.stringify({ success: true, pdf_generated: !!pdfBytes, pdf_url: pdfUrl, email_sent: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-report-pdf error:", e);
    return new Response(JSON.stringify({ error: "Report generation failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
