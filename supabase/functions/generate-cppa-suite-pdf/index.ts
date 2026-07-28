// Combined CPPA Audit Readiness Suite PDF.
// Takes { risk_id, cyber_id } for the authenticated user, fetches both
// cppa_assessments rows, renders a single HTML document containing both
// modules, sends it to PDFShift, uploads the result to the
// assessment-reports bucket under cppa-suite/<userId>/<ts>.pdf, and
// returns a signed URL. Caching uses the most recent file in that folder
// for the (risk_id, cyber_id) pair.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const esc = (s: any) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function statusClass(s: string) {
  const x = (s || "").toLowerCase();
  if (x.includes("critical")) return "bg:#fee;color:#991b1b";
  if (x === "gap") return "bg:#fef3c7;color:#92400e";
  if (x === "partial") return "bg:#fef9c3;color:#854d0e";
  if (x === "compliant") return "bg:#dcfce7;color:#166534";
  if (x === "high" || x === "critical") return "bg:#fee2e2;color:#991b1b";
  if (x === "medium") return "bg:#fef3c7;color:#92400e";
  if (x === "low") return "bg:#dcfce7;color:#166534";
  return "bg:#f1f5f9;color:#0f172a";
}

function chip(text: string) {
  if (!text) return "";
  const css = statusClass(text);
  const [bg, color] = css.split(";").map((p) => p.split(":")[1]);
  return `<span style="display:inline-block;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;background:${bg};color:${color};margin-left:6px;">${esc(text)}</span>`;
}

function coerceNarrative(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    return v.filter((x) => typeof x === "string" && x.trim().length > 0).join("\n\n");
  }
  if (v && typeof v === "object") {
    const bag = v as { narrative?: unknown };
    if (typeof bag.narrative === "string") return bag.narrative;
  }
  return "";
}

function renderRisk(row: any) {
  const r = row?.report_data || {};
  const scope = r.scope_confirmation && typeof r.scope_confirmation === "object" && !Array.isArray(r.scope_confirmation) ? r.scope_confirmation : {};
  const scopeList = Array.isArray(r.scope_confirmation) ? r.scope_confirmation : (Array.isArray(r.scope_and_triggers) ? r.scope_and_triggers : []);
  const domains: any[] = Array.isArray(r.domains) ? r.domains : [];
  const top: any[] = Array.isArray(r.top_risks) ? r.top_risks : [];
  const next: any[] = Array.isArray(r.next_steps) ? r.next_steps : [];
  const execTxt = coerceNarrative(r.executive_summary);
  const opening = coerceNarrative(r.opening_summary);
  const summaryNarr = coerceNarrative(r.assessment_summary);
  return `
  <section class="module">
    <div class="module-head">
      <p class="kicker">MODULE 1 · 11 CCR § 7150</p>
      <h2>Privacy Risk Assessment</h2>
      <div class="meta">
        ${r.overall_score != null ? `<span class="pill">Score: <strong>${esc(r.overall_score)} / 100</strong></span>` : ""}
        ${r.risk_level ? `<span class="pill">${esc(r.risk_level)} risk</span>` : ""}
      </div>
      ${opening ? `<p class="summary" style="font-style:italic">${esc(opening)}</p>` : ""}
      ${execTxt ? `<p class="summary">${esc(execTxt)}</p>` : ""}
      ${summaryNarr && summaryNarr !== execTxt ? `<p class="summary">${esc(summaryNarr)}</p>` : ""}
    </div>

    ${scopeList.length ? `<div class="block">
      <h3>Scope Confirmation</h3>
      ${scopeList.filter((x: unknown) => typeof x === "string" && x).map((s: string) => `<p>${esc(s)}</p>`).join("")}
    </div>` : (Object.keys(scope).length ? `<div class="block">
      <h3>Scope Confirmation</h3>
      <p><strong>In scope:</strong> ${esc(scope.in_scope)}</p>
      ${scope.threshold_met ? `<p><strong>Threshold met:</strong> ${esc(scope.threshold_met)}</p>` : ""}
      ${Array.isArray(scope.applicable_deadlines) && scope.applicable_deadlines.length
        ? `<p><strong>Applicable deadlines:</strong></p><ul>${scope.applicable_deadlines.map((d: string) => `<li>${esc(d)}</li>`).join("")}</ul>`
        : ""}
    </div>` : "")}

    ${r.enforcement_context && typeof r.enforcement_context === "string" ? `<div class="callout"><p class="label">Enforcement Context</p><p>${esc(r.enforcement_context)}</p></div>` : ""}

    ${domains.length ? `<div class="block">
      <h3>Domain Findings</h3>
      ${domains.map((d) => typeof d === "string"
        ? `<div class="row"><p>${esc(d)}</p></div>`
        : `<div class="row">
        <p class="row-head"><strong>${esc(d.domain)}</strong>${d.score != null ? ` <span class="muted">${esc(d.score)}/100</span>` : ""}${d.status ? chip(d.status) : ""}</p>
        ${d.finding ? `<p><span class="label">Finding:</span> ${esc(d.finding)}</p>` : ""}
        ${d.regulatory_basis ? `<p><span class="label">Regulatory basis:</span> ${esc(d.regulatory_basis)}</p>` : ""}
        ${d.remediation ? `<p><span class="label">Remediation:</span> ${esc(d.remediation)}</p>` : ""}
        ${d.priority ? `<p class="muted">Priority: ${esc(d.priority)}</p>` : ""}
      </div>`).join("")}
    </div>` : ""}

    ${top.length ? `<div class="block">
      <h3>Top Risks</h3>
      ${top.slice(0, 3).map((t) => typeof t === "string" ? `<div class="row"><p>${esc(t)}</p></div>` : `<div class="row">
        <p><strong>${esc(t.title || t.factor_id || "")}</strong></p>
        ${t.description ? `<p>${esc(t.description)}</p>` : ""}
        ${t.deadline ? `<p class="muted">Deadline: ${esc(t.deadline)}</p>` : ""}
        ${t.consequence ? `<p class="muted" style="color:#991b1b">${esc(t.consequence)}</p>` : ""}
      </div>`).join("")}
    </div>` : ""}

    ${next.length ? `<div class="block">
      <h3>Next Steps</h3>
      <ol>${next.map((s) => `<li>${esc(typeof s === "string" ? s : (s?.step_label || s?.action || ""))}</li>`).join("")}</ol>
    </div>` : ""}
  </section>`;
}

function renderCyber(row: any) {
  const r = row?.report_data || {};
  const controls: any[] = Array.isArray(r.controls) ? r.controls : [];
  const top: any[] = Array.isArray(r.top_risks) ? r.top_risks : [];
  const next: any[] = Array.isArray(r.next_steps) ? r.next_steps : [];
  return `
  <section class="module">
    <div class="module-head">
      <p class="kicker">MODULE 2 · 11 CCR §§ 7120–7124</p>
      <h2>Cybersecurity Audit Readiness</h2>
      <div class="meta">
        ${r.overall_score != null ? `<span class="pill">Score: <strong>${esc(r.overall_score)} / 100</strong></span>` : ""}
        ${r.readiness_level ? `<span class="pill">${esc(r.readiness_level)}</span>` : ""}
      </div>
      ${r.executive_summary ? `<p class="summary">${esc(r.executive_summary)}</p>` : ""}
    </div>

    ${r.enforcement_context ? `<div class="callout"><p class="label">Enforcement Context</p><p>${esc(r.enforcement_context)}</p></div>` : ""}

    ${controls.length ? `<div class="block">
      <h3>§ 7123(c) Cybersecurity Component Findings</h3>
      ${controls.map((c) => `<div class="row">
        <p class="row-head"><strong>${esc(c.control || c.component)}</strong>${c.status ? chip(c.status) : ""}</p>
        ${c.finding ? `<p><span class="label">Finding:</span> ${esc(c.finding)}</p>` : ""}
        ${c.regulatory_basis ? `<p><span class="label">Regulatory basis:</span> ${esc(c.regulatory_basis)}</p>` : ""}
        ${c.remediation ? `<p><span class="label">Remediation:</span> ${esc(c.remediation)}</p>` : ""}
      </div>`).join("")}
    </div>` : ""}

    ${top.length ? `<div class="block">
      <h3>Top Risks</h3>
      ${top.slice(0, 3).map((t) => `<div class="row">
        <p><strong>${esc(t.title)}</strong></p>
        ${t.description ? `<p>${esc(t.description)}</p>` : ""}
      </div>`).join("")}
    </div>` : ""}

    ${next.length ? `<div class="block">
      <h3>Next Steps</h3>
      <ol>${next.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
    </div>` : ""}
  </section>`;
}

function buildHTML(riskRow: any, cyberRow: any) {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return `<!doctype html><html><head><meta charset="utf-8"><title>CPPA Audit Readiness Suite</title>
<style>
  body{font-family:Helvetica,Arial,sans-serif;color:#1a1916;font-size:11px;line-height:1.45;margin:0;padding:0;}
  .cover{padding:40px 0 24px;border-bottom:2px solid #0d2a45;margin-bottom:24px}
  .cover .kicker{font-family:monospace;letter-spacing:.12em;color:#5c5a54;font-size:10px;text-transform:uppercase;margin:0}
  .cover h1{font-family:Georgia,serif;font-size:22px;margin:6px 0 8px;color:#0d2a45}
  .cover p.sub{color:#5c5a54;margin:0 0 16px}
  .cover .grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;font-size:10.5px;border-top:1px solid #ddd;border-bottom:1px solid #ddd;padding:10px 0}
  .cover .grid div span{color:#5c5a54}
  h2{font-family:Georgia,serif;font-size:18px;color:#0d2a45;margin:0 0 4px}
  h3{font-size:13px;color:#0d2a45;margin:14px 0 6px}
  .module{page-break-inside:auto;margin-bottom:28px}
  .module-head{background:#0d2a45;color:#fff;padding:16px 18px;border-radius:6px;margin-bottom:14px}
  .module-head .kicker{font-family:monospace;letter-spacing:.12em;color:#9bb4cf;font-size:9.5px;text-transform:uppercase;margin:0}
  .module-head h2{color:#fff;margin:4px 0 6px}
  .module-head .summary{color:#cbd5e1;margin:8px 0 0;font-size:10.5px}
  .module-head .pill{display:inline-block;background:rgba(255,255,255,.12);padding:3px 10px;border-radius:12px;margin-right:6px;font-size:10px}
  .block{border:1px solid #e5e7eb;border-radius:6px;padding:12px 14px;margin:10px 0}
  .row{border-top:1px solid #f1f5f9;padding:8px 0}
  .row:first-child{border-top:none;padding-top:0}
  .row-head{margin:0 0 4px}
  .label{color:#5c5a54;font-weight:600}
  .muted{color:#5c5a54;font-size:10px}
  .callout{border-left:4px solid #f59e0b;background:#fffbeb;padding:10px 12px;margin:10px 0;border-radius:4px}
  .callout .label{display:block;margin-bottom:2px}
  .page-break{page-break-before:always}
  .notice{margin-top:24px;padding:10px 12px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;font-size:10px}
  ul,ol{margin:4px 0 4px 18px;padding:0}
</style></head><body>
<div style="padding:0 24px">
  <div class="cover">
    <p class="kicker">CPPA AUDIT READINESS SUITE</p>
    <h1>Combined CPPA Audit Readiness Report</h1>
    <p class="sub">Module 1 (Privacy Risk Assessment) and Module 2 (Cybersecurity Audit Readiness) — prepared ${esc(today)}.</p>
    <div class="grid">
      <div><span>Risk assessment ID:</span> <span style="font-family:monospace">${esc(riskRow?.id || "—")}</span></div>
      <div><span>Cybersecurity ID:</span> <span style="font-family:monospace">${esc(cyberRow?.id || "—")}</span></div>
      <div><span>Risk overall score:</span> ${esc(riskRow?.report_data?.overall_score ?? "—")}${riskRow?.report_data?.overall_score != null ? " / 100" : ""}</div>
      <div><span>Cyber overall score:</span> ${esc(cyberRow?.report_data?.overall_score ?? "—")}${cyberRow?.report_data?.overall_score != null ? " / 100" : ""}</div>
      <div><span>Risk level:</span> ${esc(riskRow?.report_data?.risk_level || "—")}</div>
      <div><span>Readiness level:</span> ${esc(cyberRow?.report_data?.readiness_level || "—")}</div>
    </div>
  </div>

  ${riskRow ? renderRisk(riskRow) : ""}
  ${cyberRow ? `<div class="page-break"></div>${renderCyber(cyberRow)}` : ""}

  <div class="notice">
    <strong>Not legal advice.</strong> This report does not constitute legal advice.
    Findings should be validated against your organization's authoritative records and, where applicable, an independent CPPA cybersecurity auditor's assessment before operational reliance.
  </div>
</div>
</body></html>`;
}

async function renderViaPdfShift(html: string, title: string): Promise<Uint8Array | null> {
  const key = Deno.env.get("PDFSHIFT_API_KEY") || Deno.env.get("PDF_SERVICE_API_KEY") || Deno.env.get("PDFShift");
  if (!key) { console.error("PDFSHIFT_API_KEY not set"); return null; }
  const res = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
    method: "POST",
    headers: { "X-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      source: html,
      format: "Letter",
      margin: { top: "16mm", right: "14mm", bottom: "18mm", left: "14mm" },
      sandbox: Deno.env.get("PDFSHIFT_SANDBOX") === "true",
      footer: {
        source:
          '<div style="font-family:Helvetica,Arial,sans-serif;font-size:9px;color:#5c5a54;width:100%;padding:0 14mm;display:flex;justify-content:space-between;">' +
          `<span>${title.replace(/</g, "&lt;")}</span>` +
          '<span>EndUserPrivacy.com · Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>' +
          "</div>",
        spacing: 4,
      },
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    console.error(`PDFShift error ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
    return null;
  }
  return new Uint8Array(await res.arrayBuffer());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "auth required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "auth invalid" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { risk_id, cyber_id, force } = await req.json().catch(() => ({}));
    if (!risk_id && !cyber_id) {
      return new Response(JSON.stringify({ error: "risk_id or cyber_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ids = [risk_id, cyber_id].filter(Boolean);
    const { data: rows, error: rowsErr } = await supabase
      .from("cppa_assessments")
      .select("*")
      .in("id", ids)
      .eq("user_id", userId);
    if (rowsErr) throw rowsErr;
    const riskRow = (rows || []).find((r: any) => r.id === risk_id) || null;
    const cyberRow = (rows || []).find((r: any) => r.id === cyber_id) || null;

    if (!riskRow && !cyberRow) {
      return new Response(JSON.stringify({ error: "no matching assessments for this user" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    for (const r of [riskRow, cyberRow]) {
      if (r && r.status !== "complete") {
        return new Response(JSON.stringify({ error: "both reports must be complete first" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // R0 PART 1 — surface generator-side errors / empty bodies as 409.
      if (r) {
        const rd: any = r.report_data;
        if (rd == null || (typeof rd === "object" && rd.error != null)) {
          console.warn("[suite-pdf-guard] 409 report_data_invalid", { id: r.id, reason: rd?.error || "null" });
          return new Response(JSON.stringify({ error: "report_data_invalid", id: r.id, detail: rd?.error || "missing" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        // Structural minimums: risk → domains; cybersecurity → controls.
        if (r.id === risk_id && !(Array.isArray(rd.domains) && rd.domains.length > 0)) {
          console.warn("[suite-pdf-guard] 409 report_body_empty (risk.domains)", { id: r.id });
          return new Response(JSON.stringify({ error: "report_body_empty", missing: "domains", id: r.id }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (r.id === cyber_id && !(Array.isArray(rd.controls) && rd.controls.length > 0)) {
          console.warn("[suite-pdf-guard] 409 report_body_empty (cyber.controls)", { id: r.id });
          return new Response(JSON.stringify({ error: "report_body_empty", missing: "controls", id: r.id }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }


    const cacheKey = `${riskRow?.id || "none"}_${cyberRow?.id || "none"}`;
    const folder = `cppa-suite/${userId}/${cacheKey}`;

    if (!force) {
      const { data: existing } = await supabase.storage
        .from("assessment-reports")
        .list(folder, { limit: 5, sortBy: { column: "created_at", order: "desc" } });
      const cached = (existing || []).find((f) => f.name.toLowerCase().endsWith(".pdf"));
      if (cached) {
        const { data: urlData } = await supabase.storage
          .from("assessment-reports")
          .createSignedUrl(`${folder}/${cached.name}`, 3600);
        if (urlData?.signedUrl) {
          return new Response(JSON.stringify({ success: true, pdf_url: urlData.signedUrl, cached: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    const html = buildHTML(riskRow, cyberRow);
    const title = "CPPA Audit Readiness Suite";
    const bytes = await renderViaPdfShift(html, title);
    if (!bytes) {
      return new Response(JSON.stringify({ error: "PDF generation failed. Check PDFSHIFT_API_KEY." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const path = `${folder}/cppa-suite-${ts}.pdf`;
    const { error: upErr } = await supabase.storage
      .from("assessment-reports")
      .upload(path, bytes, { contentType: "application/pdf", upsert: true });
    if (upErr) throw upErr;

    const { data: urlData } = await supabase.storage
      .from("assessment-reports")
      .createSignedUrl(path, 3600);

    return new Response(JSON.stringify({ success: true, pdf_url: urlData?.signedUrl || null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-cppa-suite-pdf error", e);
    return new Response(JSON.stringify({ error: (e as Error).message || "PDF generation failed." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
