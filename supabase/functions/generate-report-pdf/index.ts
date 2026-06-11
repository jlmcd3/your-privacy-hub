import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
            '<div style="font-family:Helvetica,Arial,sans-serif;font-size:9px;color:#5c5a54;width:100%;padding:0 14mm;display:flex;justify-content:space-between;">' +
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
// EMAIL DELIVERY HELPER
// ─────────────────────────────────────────────────────────────────────────
// PLACEHOLDER: Replace the body of this function with your email service call.
// Environment variable to add to Supabase secrets: EMAIL_SERVICE_API_KEY
// Also set: EMAIL_FROM_ADDRESS (e.g. reports@enduserprivacy.com)
// ─────────────────────────────────────────────────────────────────────────
async function sendEmail(opts: {
  toEmail: string;
  toName: string;
  subject: string;
  bodyHtml: string;
  pdfBytes: Uint8Array | null;
  attachmentName: string;
}): Promise<boolean> {
  const emailApiKey = Deno.env.get("EMAIL_SERVICE_API_KEY");
  const fromAddress = Deno.env.get("EMAIL_FROM_ADDRESS") || "reports@enduserprivacy.com";
  if (!emailApiKey) {
    console.error("EMAIL_SERVICE_API_KEY not set in Supabase secrets.");
    return false;
  }

  try {
    // ── EMAIL SERVICE CALL ───────────────────────────────────────────────
    // Replace everything between these comments with the actual service call.
    // If pdfBytes is null, send the email without an attachment.
    //
    // Generic pattern for a transactional email REST API:
    // const payload: any = {
    //   from: fromAddress,
    //   to: [{ email: opts.toEmail, name: opts.toName }],
    //   subject: opts.subject,
    //   html: opts.bodyHtml,
    // };
    // if (opts.pdfBytes) {
    //   payload.attachments = [{
    //     filename: opts.attachmentName,
    //     content: btoa(String.fromCharCode(...opts.pdfBytes)),
    //     type: "application/pdf",
    //   }];
    // }
    // const response = await fetch("https://[EMAIL_SERVICE_ENDPOINT]", {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Bearer ${emailApiKey}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify(payload),
    //   signal: AbortSignal.timeout(15000),
    // });
    // return response.ok;
    // ── END EMAIL SERVICE CALL ───────────────────────────────────────────

    void fromAddress; void opts;
    throw new Error("EMAIL_SERVICE_NOT_CONFIGURED");
  } catch (e) {
    console.error("sendEmail failed:", e);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// HTML REPORT TEMPLATES
// ─────────────────────────────────────────────────────────────────────────

function buildLIReportHTML(report: any, _assessment: any): string {
  const d = report.three_part_test || {};
  const overall = report.three_part_test?.overall_assessment || {};
  const docRecs = report.documentation_recommendations || {};
  const date = new Date(report.generated_at).toLocaleDateString("en-US",
    { year: "numeric", month: "long", day: "numeric" });

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #1a1916; line-height: 1.5; margin: 40px; max-width: 800px; }
h1 { font-size: 22px; border-bottom: 2px solid #1a1916; padding-bottom: 8px; }
h2 { font-size: 16px; color: #1a5276; margin-top: 28px; }
h3 { font-size: 14px; color: #2c3e50; margin-top: 20px; }
.verdict-pass { color: #1e6b3c; font-weight: bold; }
.verdict-fail { color: #a32d2d; font-weight: bold; }
.verdict-uncertain { color: #8b5e0a; font-weight: bold; }
.strength { font-size: 18px; font-weight: bold; padding: 8px 16px; border-radius: 4px; display: inline-block; margin-bottom: 12px; }
.strength-strong { background: #eafaf1; color: #1e6b3c; }
.strength-moderate { background: #fef9ec; color: #8b5e0a; }
.strength-weak { background: #fcebeb; color: #a32d2d; }
.disclaimer { background: #fef9ec; border-left: 4px solid #8b5e0a; padding: 12px 16px; margin: 24px 0; font-size: 12px; }
.section { margin-bottom: 24px; }
ul { padding-left: 20px; } li { margin-bottom: 4px; }
.meta { color: #5c5a54; font-size: 12px; margin-bottom: 24px; }
.label { font-weight: bold; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; color: #5c5a54; }
</style></head><body>
<h1>Legitimate Interest Assessment</h1>
<div class="meta">Generated: ${date} &nbsp;|&nbsp; EndUserPrivacy.com &nbsp;|&nbsp; Precedents reviewed: ${report.precedents_reviewed || 0} of ${report.precedent_database_size || 0} tracked decisions</div>
<div class="disclaimer">${report.disclaimer || ""}</div>
<h2>Assessment Summary</h2>
<div class="section">
<span class="strength strength-${(overall.argument_strength || "uncertain").toLowerCase()}">Argument strength: ${overall.argument_strength || "Uncertain"}</span>
<p>${overall.strength_basis || ""}</p>
</div>
<h2>Three-Part Test</h2>
${["purpose_test", "necessity_test", "balancing_test"].map(key => {
    const t = d[key] || {};
    const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const verdictClass = (t.verdict || "uncertain").includes("pass") ? "pass" : (t.verdict || "").includes("fail") ? "fail" : "uncertain";
    return `<div class="section"><h3>${label} <span class="verdict-${verdictClass}">— ${t.verdict || "Uncertain"}</span></h3>
<p>${t.analysis || ""}</p>
${(t.risk_factors || []).length ? `<p class="label">Risk factors:</p><ul>${(t.risk_factors || []).map((r: string) => `<li>${r}</li>`).join("")}</ul>` : ""}
${(t.supporting_factors || []).length ? `<p class="label">Supporting factors:</p><ul>${(t.supporting_factors || []).map((s: string) => `<li>${s}</li>`).join("")}</ul>` : ""}
</div>`;
  }).join("")}
<h2>Documentation Recommendations</h2>
${((docRecs.recommended_documentation) || []).map((doc: any) =>
    `<div class="section"><h3>${doc.document || ""}</h3>
<p>${doc.purpose || ""}</p>
${(doc.key_elements || []).length ? `<ul>${(doc.key_elements || []).map((e: string) => `<li>${e}</li>`).join("")}</ul>` : ""}</div>`
  ).join("")}
<h2>Balancing Record — Must Include</h2>
<ul>${((docRecs.balancing_record_elements) || []).map((e: string) => `<li>${e}</li>`).join("")}</ul>
<p class="meta">${report.data_currency_note || ""}</p>
<div class="disclaimer">${report.disclaimer || ""}</div>
</body></html>`;
}

function buildGovernanceReportHTML(report: any, _assessment: any): string {
  const date = new Date(report.generated_at).toLocaleDateString("en-US",
    { year: "numeric", month: "long", day: "numeric" });
  const domains = report.domain_findings || {};
  const severityColor: Record<string, string> = {
    Critical: "#a32d2d", High: "#c0722a", Medium: "#8b5e0a",
    Low: "#1a5276", Compliant: "#1e6b3c", Unknown: "#5c5a54"
  };

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #1a1916; line-height: 1.5; margin: 40px; max-width: 800px; }
h1 { font-size: 22px; border-bottom: 2px solid #1a1916; padding-bottom: 8px; }
h2 { font-size: 16px; color: #1a5276; margin-top: 28px; }
h3 { font-size: 14px; color: #2c3e50; margin-top: 20px; }
.rating { font-size: 18px; font-weight: bold; padding: 8px 16px; border-radius: 4px; background: #eaf2fb; color: #1a5276; display: inline-block; margin-bottom: 12px; }
.severity { font-weight: bold; font-size: 12px; padding: 2px 8px; border-radius: 3px; color: white; display: inline-block; }
.domain { border: 1px solid #dddbd3; border-radius: 6px; padding: 14px 16px; margin-bottom: 16px; }
.disclaimer { background: #fef9ec; border-left: 4px solid #8b5e0a; padding: 12px 16px; margin: 24px 0; font-size: 12px; }
.meta { color: #5c5a54; font-size: 12px; margin-bottom: 24px; }
.label { font-weight: bold; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; color: #5c5a54; }
ul { padding-left: 20px; } li { margin-bottom: 4px; }
</style></head><body>
<h1>Data Governance Readiness Assessment</h1>
<div class="meta">Generated: ${date} &nbsp;|&nbsp; EndUserPrivacy.com</div>
<div class="disclaimer">${report.disclaimer || ""}</div>
<h2>Executive Summary</h2>
<div class="rating">Readiness: ${report.overall_readiness_rating || "Unknown"}</div>
<p>${report.executive_summary || ""}</p>
<p>${report.readiness_rationale || ""}</p>
<h2>Top Three Risks</h2>
${(report.top_three_risks || []).map((r: any) =>
    `<div class="domain"><strong>${r.risk || ""}</strong> <span class="severity" style="background:${severityColor[r.severity] || "#5c5a54"}">${r.severity || ""}</span><p>${r.why_urgent || ""}</p></div>`
  ).join("")}
<h2>Immediate Actions Required</h2>
<ul>${(report.immediate_actions || []).map((a: any) =>
    `<li><strong>${a.action || ""}</strong> — ${a.owner || ""}, ${a.timeline || ""}</li>`
  ).join("")}</ul>
<h2>Domain Findings</h2>
${Object.values(domains).map((dn: any) =>
    `<div class="domain"><h3>${dn.domain_name || ""} <span class="severity" style="background:${severityColor[dn.severity] || "#5c5a54"}">${dn.severity || ""}</span></h3>
<p class="label">Current state</p><p>${dn.current_state || ""}</p>
${dn.gap_description ? `<p class="label">Gap</p><p>${dn.gap_description}</p>` : ""}
<p class="label">Regulatory basis</p><p>${dn.regulatory_basis || ""}</p>
<p class="label">Recommended action</p><p><strong>${dn.recommended_action || ""}</strong></p>
<p class="meta">${dn.suggested_owner || ""} &nbsp;|&nbsp; ${dn.suggested_timeline || ""}</p></div>`
  ).join("")}
<h2>Cross-Domain Considerations</h2>
<p>${report.interaction_effects || ""}</p>
<div class="disclaimer">${report.disclaimer || ""}</div>
</body></html>`;
}

function buildDPIAReportHTML(report: any, _dpia: any): string {
  const date = new Date(report.generated_at).toLocaleDateString("en-US",
    { year: "numeric", month: "long", day: "numeric" });
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
body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #1a1916; line-height: 1.5; margin: 40px; max-width: 800px; }
h1 { font-size: 22px; border-bottom: 2px solid #1a1916; padding-bottom: 8px; }
h2 { font-size: 16px; color: #1a5276; margin-top: 28px; }
.guidance { background: #f4f0fd; border-left: 4px solid #5b3a8a; padding: 10px 14px; margin: 12px 0; font-size: 12px; }
.completion { background: #fef9ec; border-left: 4px solid #8b5e0a; padding: 10px 14px; margin: 12px 0; font-size: 12px; }
.signoff { border: 1px solid #dddbd3; padding: 16px; margin-top: 16px; font-family: "Courier New", monospace; font-size: 12px; line-height: 2.2; }
.disclaimer { background: #fef9ec; border-left: 4px solid #8b5e0a; padding: 12px 16px; margin: 24px 0; font-size: 12px; }
.meta { color: #5c5a54; font-size: 12px; margin-bottom: 24px; }
.label { font-weight: bold; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; color: #5c5a54; }
ul { padding-left: 20px; } li { margin-bottom: 4px; }
</style></head><body>
<h1>DPIA Framework</h1>
<div class="meta">Processing activity: <strong>${meta.processing_activity_name || ""}</strong> &nbsp;|&nbsp; Version: ${meta.framework_version || "1.0"} &nbsp;|&nbsp; Generated: ${date} &nbsp;|&nbsp; EndUserPrivacy.com</div>
<div class="disclaimer"><strong>IMPORTANT: </strong>${report.framework_disclaimer || ""}</div>
${(meta.applicable_frameworks || []).length ? `<p><span class="label">Applicable frameworks: </span>${(meta.applicable_frameworks || []).join(" &nbsp;|&nbsp; ")}</p>` : ""}
${meta.supervisory_authority_consultation_trigger ? `<div class="completion"><strong>Supervisory authority consultation trigger: </strong>${meta.supervisory_authority_consultation_trigger}</div>` : ""}
${sections.map(([key, heading]) => {
    const s = report[key] || {};
    return `<h2>${heading}</h2>
${s.guidance_note ? `<div class="guidance"><strong>Article 35 requirement: </strong>${s.guidance_note}</div>` : ""}
${Object.entries(s)
        .filter(([k]) => !["title", "guidance_note", "completion_guidance", "risk_assessment", "proposed_measures"].includes(k))
        .map(([k, v]) => `<p><span class="label">${k.replace(/_/g, " ")}:</span> ${v || ""}</p>`)
        .join("")}
${(s.risk_assessment || []).length ? `<ul>${(s.risk_assessment || []).map((r: any) =>
        `<li><strong>${r.risk_type || ""}</strong> — Likelihood: ${r.likelihood || ""}, Severity: ${r.severity || ""}. ${r.description || ""}</li>`
      ).join("")}</ul>` : ""}
${(s.proposed_measures || []).length ? `<ul>${(s.proposed_measures || []).map((m: any) =>
        `<li><strong>${m.measure || ""}</strong>: ${m.implementation_guidance || ""} (Residual risk: ${m.residual_risk_after || ""})</li>`
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
<div class="disclaimer"><strong>IMPORTANT: </strong>${report.framework_disclaimer || ""}</div>
</body></html>`;
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
  | { type: "ul"; items: string[] };

function parseTextBlocks(body: string): TextBlock[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks: TextBlock[] = [];
  const subheadRe = /^\*\*([^*]+?):\*\*\s*(.*)$/;
  const numberedRe = /^(\d+)\.\s+(.*)$/;
  const bulletRe = /^[-•]\s+(.*)$/;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    if (/^[-*_]{3,}$/.test(line)) { i++; continue; }
    const sh = subheadRe.exec(line);
    if (sh) {
      blocks.push({ type: "subhead", text: sh[1].trim(), trailing: sh[2] ? sh[2].trim() : undefined });
      i++; continue;
    }
    if (numberedRe.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const cur = lines[i].trim();
        const m = numberedRe.exec(cur);
        if (m) { items.push(m[2]); i++; }
        else if (cur && !subheadRe.test(cur) && !bulletRe.test(cur) && items.length > 0) {
          items[items.length - 1] += " " + cur; i++;
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
        else if (cur && !subheadRe.test(cur) && !numberedRe.test(cur) && items.length > 0) {
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
    if (b.type === "ol") {
      return `<ol class="num-list">${b.items.map((it, j) =>
        `<li><span class="num">${j + 1}</span><span class="li-body">${renderInlineHtml(it)}</span></li>`).join("")}</ol>`;
    }
    return `<ul class="dot-list">${b.items.map((it) =>
      `<li><span class="dot"></span><span class="li-body">${renderInlineHtml(it)}</span></li>`).join("")}</ul>`;
  }).join("\n");
}

function splitTextSections(text: string): Array<{ heading: string | null; body: string }> {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: Array<{ heading: string | null; body: string }> = [];
  let cur: { heading: string | null; body: string } = { heading: null, body: "" };
  for (const line of lines) {
    const m = /^###\s+(.+)$/.exec(line);
    if (m) {
      if (cur.heading || cur.body.trim()) out.push(cur);
      cur = { heading: m[1].trim(), body: "" };
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
    --navy:#0f172a; --navy-ink:#1a1916; --paper:#faf8f3; --card:#ffffff;
    --border:#e6e3da; --steel:#94a3b8; --silver:#eef0f2; --slate:#5c5a54;
    --gold:#c0911f; --gold-soft:#fbf3df; --warn:#b45309; --warn-soft:#fdf3e1; --accent:#1a5276;
  }
  * { box-sizing: border-box; }
  body { font-family:'Times New Roman', Times, serif; color:var(--navy-ink);
    background:var(--paper); font-size:11pt; line-height:1.5; margin:0;
    -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .shell { background:var(--card); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
  .header { background:var(--navy); color:#fff; padding:22px 26px 24px; }
  .header .logo-tile { display:inline-block; background:#fff; border-radius:6px; padding:5px 10px;
    margin-bottom:12px; font-family:'Georgia','Times New Roman',serif; font-size:13px;
    font-weight:700; color:var(--navy); letter-spacing:0.02em; }
  .header .eyebrow { font-size:9px; font-weight:600; text-transform:uppercase;
    letter-spacing:0.14em; color:#93c5fd; margin:0 0 4px; }
  .header h1 { font-family:'Georgia','Times New Roman',serif; font-size:22px; margin:0;
    line-height:1.25; font-weight:700; }
  .header .meta { margin-top:6px; font-size:11px; color:#cbd5e1; }
  .body { padding:22px 26px 26px; }
  .disclaimer { border-left:4px solid var(--gold); background:var(--gold-soft);
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
    background:var(--accent); margin-top:8px; }
  .footer { margin-top:22px; padding-top:12px; border-top:1px solid var(--border);
    font-size:10px; color:var(--slate); text-align:center; }
</style></head>
<body><div class="shell">
  <header class="header">
    <span class="logo-tile">enduserprivacy.com</span>
    <p class="eyebrow">Compliance Tool · Customised Analysis</p>
    <h1>${escHtml(opts.title)}</h1>
    ${opts.metaLine ? `<div class="meta">${escHtml(opts.metaLine)}</div>` : ""}
  </header>
  <div class="body">
    <div class="disclaimer"><span class="kw">Not legal advice.</span>
      This document is a compliance framework generated for informational purposes only.
      It does not create an attorney-client relationship. Always consult qualified legal
      counsel for advice specific to your situation.</div>
    ${calloutHtml}
    ${sectionsHtml}
    <div class="footer">EndUserPrivacy.com · Generated ${new Date().toLocaleDateString("en-US",{ year:"numeric", month:"long", day:"numeric" })}</div>
  </div>
</div></body></html>`;
}

function buildCPPARiskReportHTML(report: any, record: any): string {
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
    <div class="meta">Generated ${text(generatedDate)} · California (CPPA)</div>
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
    </article>`).join("")}</section>` : ""}
    ${topRisks.length ? `<section class="section"><h2>Top Risks</h2>${topRisks.slice(0, 3).map((r: any) => `<article class="risk"><h3>${text(r.title)}</h3>${r.description ? `<p>${text(r.description)}</p>` : ""}${r.deadline ? `<p><span class="label">Deadline:</span> ${text(r.deadline)}</p>` : ""}${r.consequence ? `<p><span class="label">Consequence:</span> ${text(r.consequence)}</p>` : ""}</article>`).join("")}</section>` : ""}
    ${nextSteps.length ? `<section class="section"><h2>Next Steps</h2><ol>${nextSteps.map((step: any) => `<li>${text(step)}</li>`).join("")}</ol></section>` : ""}
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

function makeEmailSubject(toolType: string): string {
  const labels: Record<string, string> = {
    li_assessment: "Legitimate Interest Assessment",
    governance_assessment: "Data Governance Readiness Assessment",
    dpia_framework: "DPIA Framework",
    biometric_checker: "Biometric Compliance Assessment",
    ir_playbook: "Incident Response Playbook",
    dpa_generator: "Custom DPA",
  };
  return `Your ${labels[toolType] || "Report"} is ready — EndUserPrivacy.com`;
}

function makeEmailBody(opts: {
  toolType: string; recipientName: string;
  reportTitle: string; resultUrl: string; hasPdf: boolean;
}): string {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;color:#1a1916;">
<h2 style="font-size:18px;border-bottom:1px solid #dddbd3;padding-bottom:8px;">Your ${opts.reportTitle} is ready</h2>
<p>Hi${opts.recipientName ? " " + opts.recipientName : ""},</p>
<p>Your report has been generated and is available on EndUserPrivacy.com.</p>
<p style="margin:24px 0;"><a href="${opts.resultUrl}" style="background:#1a5276;color:white;padding:10px 20px;border-radius:4px;text-decoration:none;font-weight:bold;">View your report →</a></p>
${opts.hasPdf ? "<p>A PDF copy is attached to this email.</p>" : ""}
<p style="font-size:11px;color:#9c9a94;border-top:1px solid #dddbd3;padding-top:12px;margin-top:24px;">
This report is a compliance framework tool and does not constitute legal advice. All findings should be reviewed with qualified legal counsel.<br><br>
EndUserPrivacy.com &nbsp;|&nbsp; <a href="https://enduserprivacy.com">enduserprivacy.com</a>
</p></div>`;
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    // ── CACHE CHECK ─────────────────────────────────────────────────────
    // If a PDF was already generated for this assessment, reuse it instead
    // of calling PDFShift again. Re-sign the stored object and return.
    // Skip cache when `force=true` or when an email send is requested
    // (so a fresh attachment can be delivered).
    if (!force && !user_email) {
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
      html = buildTextReportHTML({
        title: "Your Incident Response Playbook",
        metaLine: `Generated ${new Date(record.created_at).toLocaleDateString("en-US",{ year:"numeric", month:"long", day:"numeric" })}` +
          ((intake.jurisdictions || []).length ? ` · ${intake.jurisdictions.join(", ")}` : ""),
        text: record.playbook_text || "",
        showJurisdictionChip: false,
        callout: {
          kind: "muted",
          html: "This playbook and its documentation checklist contribute to your Article 33(5) accountability record.",
        },
      });
      generatedAt = record.created_at || new Date().toISOString();
    } else if (tool_type === "dpa_generator") {
      const intake = record.intake_data || {};
      html = buildTextReportHTML({
        title: `Your Custom DPA — ${intake.controllerName || "Controller"} / ${intake.processorName || "Processor"}`,
        metaLine: `Generated ${new Date(record.created_at).toLocaleDateString("en-US",{ year:"numeric", month:"long", day:"numeric" })} · ${intake.legalFramework || "GDPR"}`,
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
    } else if (tool_type === "cppa_cybersecurity") {
      const intake = record.intake_data || {};
      const parts = [record.document_a_text, record.document_b_text].filter(Boolean);
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

    let emailSent = false;
    if (user_email) {
      const toolLabels: Record<string, string> = {
        li_assessment: "Legitimate Interest Assessment",
        governance_assessment: "Data Governance Readiness Assessment",
        dpia_framework: "DPIA Framework",
        biometric_checker: "Biometric Compliance Assessment",
        ir_playbook: "Incident Response Playbook",
        dpa_generator: "Custom DPA",
      };
      emailSent = await sendEmail({
        toEmail: user_email,
        toName: user_name || "",
        subject: makeEmailSubject(tool_type),
        bodyHtml: makeEmailBody({
          toolType: tool_type,
          recipientName: user_name || "",
          reportTitle: toolLabels[tool_type] || "Report",
          resultUrl: result_url || `https://enduserprivacy.com/${tool_type.replace(/_/g, "-")}/result/${assessment_id}`,
          hasPdf: !!pdfBytes,
        }),
        pdfBytes,
        attachmentName,
      });
    }

    return new Response(
      JSON.stringify({ success: true, pdf_generated: !!pdfBytes, pdf_url: pdfUrl, email_sent: emailSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-report-pdf error:", e);
    return new Response(JSON.stringify({ error: "Report generation failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
