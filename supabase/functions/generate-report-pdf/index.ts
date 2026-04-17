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
  _title: string
): Promise<Uint8Array | null> {
  const pdfApiKey = Deno.env.get("PDF_SERVICE_API_KEY");
  if (!pdfApiKey) {
    console.error("PDF_SERVICE_API_KEY not set in Supabase secrets.");
    return null;
  }

  try {
    // ── PDF SERVICE CALL ─────────────────────────────────────────────────
    // Replace everything between these comments with the actual service call.
    // The call must ultimately produce pdfBytes: Uint8Array.
    //
    // Generic pattern for an HTML-to-PDF REST API:
    // const response = await fetch("https://[PDF_SERVICE_ENDPOINT]", {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `[AUTH_SCHEME] ${pdfApiKey}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({ source: html, landscape: false }),
    //   signal: AbortSignal.timeout(30000),
    // });
    // if (!response.ok) throw new Error(`PDF service error: ${response.status}`);
    // const pdfBytes = new Uint8Array(await response.arrayBuffer());
    // return pdfBytes;
    // ── END PDF SERVICE CALL ─────────────────────────────────────────────

    void html;
    throw new Error("PDF_SERVICE_NOT_CONFIGURED");
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
body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1916; line-height: 1.6; margin: 40px; max-width: 800px; }
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
body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1916; line-height: 1.6; margin: 40px; max-width: 800px; }
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
body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1916; line-height: 1.6; margin: 40px; max-width: 800px; }
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
// FILENAME HELPERS
// ─────────────────────────────────────────────────────────────────────────
const TOOL_LABELS: Record<string, string> = {
  li_assessment: "LI-Assessment",
  governance_assessment: "Governance-Assessment",
  dpia_framework: "DPIA-Framework",
};

function makeAttachmentName(toolType: string, generatedAt: string): string {
  const date = new Date(generatedAt).toISOString().slice(0, 10);
  return `EndUserPrivacy-${TOOL_LABELS[toolType] || "Report"}-${date}.pdf`;
}

function makeEmailSubject(toolType: string): string {
  const labels: Record<string, string> = {
    li_assessment: "Legitimate Interest Assessment",
    governance_assessment: "Data Governance Readiness Assessment",
    dpia_framework: "DPIA Framework",
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
    const { tool_type, assessment_id, user_email, user_name, result_url } = await req.json();

    if (!tool_type || !assessment_id) {
      return new Response(JSON.stringify({ error: "tool_type and assessment_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const tableMap: Record<string, string> = {
      li_assessment: "li_assessments",
      governance_assessment: "governance_assessments",
      dpia_framework: "dpia_frameworks",
    };
    const table = tableMap[tool_type];
    if (!table) {
      return new Response(JSON.stringify({ error: "Invalid tool_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: record } = await supabase.from(table)
      .select("*").eq("id", assessment_id).single();

    if (!record?.report_data) {
      return new Response(JSON.stringify({ error: "Report data not found or not yet complete" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const report = record.report_data as any;

    let html: string;
    if (tool_type === "li_assessment") html = buildLIReportHTML(report, record);
    else if (tool_type === "governance_assessment") html = buildGovernanceReportHTML(report, record);
    else html = buildDPIAReportHTML(report, record);

    const attachmentName = makeAttachmentName(tool_type, report.generated_at || new Date().toISOString());

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
        const { data: urlData } = supabase.storage
          .from("assessment-reports")
          .getPublicUrl(storagePath);
        pdfUrl = urlData?.publicUrl || null;
      }
    }

    if (pdfUrl) {
      await supabase.from(table).update({ pdf_url: pdfUrl }).eq("id", assessment_id);
    }

    let emailSent = false;
    if (user_email) {
      const toolLabels: Record<string, string> = {
        li_assessment: "Legitimate Interest Assessment",
        governance_assessment: "Data Governance Readiness Assessment",
        dpia_framework: "DPIA Framework",
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
