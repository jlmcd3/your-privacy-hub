// supabase/functions/generate-eu-notice/index.ts
//
// Generates per-framework EU & Global privacy notices (HTML) from an
// eu_notice_session's answers + framework selections, uploads each file to
// the private `eu-notices` storage bucket, records rows in eu_notice_documents,
// and marks the session as completed (status = 'generated').
//
// Auth: requires a valid Supabase JWT. Ownership is enforced via
// public.owns_client() called as the requesting user.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  session_id?: string;
}

interface SessionRow {
  id: string;
  client_id: string;
  status: string;
  scope: string | null;
  version_number: number | null;
}

interface FwSel {
  framework_code: string;
  framework_name: string;
  region: string;
}

interface AnswerRow {
  question_key: string;
  answer_value: unknown;
}

const FRAMEWORK_FULL_NAMES: Record<string, string> = {
  EU_GDPR: "EU General Data Protection Regulation (GDPR)",
  UK_GDPR: "UK General Data Protection Regulation (UK GDPR)",
  CH_FADP: "Swiss Federal Act on Data Protection (FADP)",
  BR_LGPD: "Brazil Lei Geral de Proteção de Dados (LGPD)",
  JP_APPI: "Japan Act on the Protection of Personal Information (APPI)",
  IN_DPDPA: "India Digital Personal Data Protection Act (DPDPA)",
  ZA_POPIA: "South Africa Protection of Personal Information Act (POPIA)",
  CA_PIPEDA: "Canada Personal Information Protection and Electronic Documents Act (PIPEDA)",
  AU_PRIVACY: "Australia Privacy Act 1988",
  KR_PIPA: "South Korea Personal Information Protection Act (PIPA)",
  SG_PDPA: "Singapore Personal Data Protection Act (PDPA)",
  AE_PDPL: "UAE Personal Data Protection Law (PDPL)",
};

function escapeHtml(s: unknown): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function answerString(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function buildNoticeHtml(
  fw: FwSel,
  answers: Record<string, unknown>,
  generatedAtHuman: string,
): string {
  const lawName = FRAMEWORK_FULL_NAMES[fw.framework_code] ?? fw.framework_name;
  const controllerName = answerString(answers["controller_name"]) || "[Controller name]";
  const controllerAddress = answerString(answers["controller_address"]) || "";
  const contactEmail = answerString(answers["contact_email"]) || "[contact email]";
  const dpoYes = answerString(answers["dpo_details"]) === "yes";
  const dpoName = answerString(answers["dpo_name"]);
  const dpoEmail = answerString(answers["dpo_email"]);
  const purposes = answerString(answers["processing_purposes"]) || "—";
  const categories = answerString(answers["data_categories"]) || "—";
  const lawfulBasis = answerString(answers["lawful_basis"]) || "—";
  const recipients = answerString(answers["third_party_recipients"]) || "—";
  const transfersYes = answerString(answers["transfer_outside_eea"]) === "yes";
  const safeguards = answerString(answers["transfer_safeguards"]);
  const retention = answerString(answers["retention_period"]) || "Not specified";
  const automatedYes = answerString(answers["automated_decisions"]) === "yes";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>${escapeHtml(fw.framework_name)} Privacy Notice — ${escapeHtml(controllerName)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 760px; margin: 2rem auto; padding: 0 1.5rem; color: #1a1a1a; line-height: 1.55; }
  h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
  h2 { font-size: 1.15rem; margin-top: 2rem; border-bottom: 1px solid #ddd; padding-bottom: 0.25rem; }
  .meta { color: #666; font-size: 0.85rem; margin-bottom: 2rem; }
  .badge { display: inline-block; background: #f0f0f0; padding: 0.15rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; }
  footer { color: #888; font-size: 0.75rem; margin-top: 3rem; border-top: 1px solid #eee; padding-top: 1rem; }
</style></head><body>
  <h1>${escapeHtml(fw.framework_name)} Privacy Notice</h1>
  <div class="meta">
    <span class="badge">${escapeHtml(lawName)}</span>
    &nbsp;·&nbsp; Last updated: ${escapeHtml(generatedAtHuman)}
  </div>

  <p>This notice explains how <strong>${escapeHtml(controllerName)}</strong> processes personal data under the ${escapeHtml(lawName)}.</p>

  <h2>1. Who we are</h2>
  <p><strong>${escapeHtml(controllerName)}</strong>${controllerAddress ? `, ${escapeHtml(controllerAddress)}` : ""}.</p>
  <p>You can contact us about this notice at <a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a>.</p>
  ${dpoYes ? `<p>Our Data Protection Officer can be reached at ${dpoName ? `<strong>${escapeHtml(dpoName)}</strong>, ` : ""}<a href="mailto:${escapeHtml(dpoEmail || contactEmail)}">${escapeHtml(dpoEmail || contactEmail)}</a>.</p>` : ""}

  <h2>2. Personal data we process</h2>
  <p>${escapeHtml(categories)}</p>

  <h2>3. Purposes of processing</h2>
  <p>${escapeHtml(purposes)}</p>

  <h2>4. Lawful basis</h2>
  <p>We rely on the following lawful basis (or bases) for our processing: ${escapeHtml(lawfulBasis)}.</p>

  <h2>5. Recipients of personal data</h2>
  <p>We share personal data with the following categories of recipients: ${escapeHtml(recipients)}.</p>

  ${transfersYes ? `<h2>6. International transfers</h2>
  <p>We transfer personal data outside the relevant jurisdiction. Our safeguards: ${escapeHtml(safeguards || "Standard Contractual Clauses (SCCs) or equivalent")}.</p>` : ""}

  <h2>${transfersYes ? "7" : "6"}. Retention</h2>
  <p>${escapeHtml(retention)}</p>

  <h2>${transfersYes ? "8" : "7"}. Your rights</h2>
  <p>Under the ${escapeHtml(lawName)}, you have rights including access, rectification, erasure, restriction, portability, and objection. You may also lodge a complaint with the relevant supervisory authority.</p>

  ${automatedYes ? `<h2>${transfersYes ? "9" : "8"}. Automated decision-making</h2>
  <p>We use automated decision-making with legal or similarly significant effects. You have the right to obtain human intervention, express your point of view, and contest the decision.</p>` : ""}

  <footer>
    Generated by EndUserPrivacy.com. This notice is a starting template based on your inputs and is not legal advice. Review with qualified counsel before publishing.
  </footer>
</body></html>`;
}

function buildCombinedHtml(
  controllerName: string,
  contactEmail: string,
  fws: FwSel[],
  answers: Record<string, unknown>,
  generatedAtHuman: string,
): string {
  const tocHtml = fws
    .map((f) => `<li><a href="#${escapeHtml(f.framework_code)}" style="color:#1d4ed8;">${escapeHtml(f.framework_name)}</a> — <span style="color:#666;font-size:0.85rem;">${escapeHtml(FRAMEWORK_FULL_NAMES[f.framework_code] ?? f.framework_name)}</span></li>`)
    .join("");

  const sectionsHtml = fws
    .map(
      (f) =>
        `<a id="${escapeHtml(f.framework_code)}"></a>${
          buildNoticeHtml(f, answers, generatedAtHuman)
            .replace(/^[\s\S]*?<body>/, "")
            .replace(/<\/body>[\s\S]*$/, "")
            .replace(/<h1>[^<]*<\/h1>/, `<h2 style="font-size:1.4rem;">${escapeHtml(f.framework_name)}</h2>`)
        }`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>International Privacy Notice — ${escapeHtml(controllerName)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 820px; margin: 2rem auto; padding: 0 1.5rem; color: #1a1a1a; line-height: 1.55; }
  h1 { font-size: 1.9rem; margin-bottom: 0.25rem; }
  .meta { color: #666; font-size: 0.85rem; margin-bottom: 2rem; }
  ul.toc { background:#f9fafb;border:1px solid #e5e7eb;padding:1rem 1.25rem 1rem 2.25rem;border-radius:0.5rem; }
  footer { color: #888; font-size: 0.75rem; margin-top: 3rem; border-top: 1px solid #eee; padding-top: 1rem; }
</style></head><body>
<h1>International Privacy Notice</h1>
<div class="meta">${escapeHtml(controllerName)} · Last updated: ${escapeHtml(generatedAtHuman)} · ${fws.length} framework${fws.length === 1 ? "" : "s"}</div>
<p>This notice consolidates the privacy disclosures ${escapeHtml(controllerName)} maintains across each privacy framework listed below. Use the table of contents to jump to the section that applies to you. To exercise your rights, contact us at <a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a>.</p>
<h2>Table of contents</h2>
<ul class="toc">${tocHtml}</ul>
${sectionsHtml}
<footer>Generated by EndUserPrivacy.com. This combined notice is a starting template based on your inputs and is not legal advice. Review with qualified counsel before publishing.</footer>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: RequestBody;
    try {
      body = (await req.json()) as RequestBody;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sessionId = body.session_id;
    if (!sessionId || typeof sessionId !== "string") {
      return new Response(JSON.stringify({ error: "session_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: session, error: sessionErr } = await admin
      .from("eu_notice_sessions")
      .select("id, client_id, status, scope, version_number")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionErr || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ownsData, error: ownsErr } = await userClient.rpc("owns_client", {
      _client_id: (session as SessionRow).client_id,
    });
    if (ownsErr || ownsData !== true) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [fwRes, ansRes] = await Promise.all([
      admin
        .from("eu_notice_framework_selections")
        .select("framework_code, framework_name, region")
        .eq("session_id", sessionId),
      admin
        .from("eu_notice_answers")
        .select("question_key, answer_value")
        .eq("session_id", sessionId)
        .is("ropa_activity_id", null),
    ]);
    if (fwRes.error) throw fwRes.error;
    if (ansRes.error) throw ansRes.error;

    const fws = (fwRes.data ?? []) as FwSel[];
    if (fws.length === 0) {
      return new Response(JSON.stringify({ error: "No frameworks selected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const answers: Record<string, unknown> = {};
    for (const r of (ansRes.data ?? []) as AnswerRow[]) {
      answers[r.question_key] = r.answer_value;
    }

    // Mark prior current docs as not current
    await admin
      .from("eu_notice_documents")
      .update({ is_current: false })
      .eq("session_id", sessionId)
      .eq("is_current", true);

    const nextVersion = ((session as SessionRow).version_number ?? 0) + 1;
    const generatedAtIso = new Date().toISOString();
    const generatedAtHuman = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

    const generated: { framework: string; path: string; size: number; combined?: boolean }[] = [];

    // Combined international notice when multiple frameworks
    if (fws.length > 1) {
      const controllerName = answerString(answers["controller_name"]) || "[Controller name]";
      const contactEmail = answerString(answers["contact_email"]) || "[contact email]";
      const combinedHtml = buildCombinedHtml(controllerName, contactEmail, fws, answers, generatedAtHuman);
      const combinedBytes = new TextEncoder().encode(combinedHtml);
      const combinedPath = `${sessionId}/v${nextVersion}/_international.html`;
      const { error: upErr } = await admin.storage
        .from("eu-notices")
        .upload(combinedPath, combinedBytes, { contentType: "text/html; charset=utf-8", upsert: true });
      if (upErr) throw upErr;
      const { error: insErr } = await admin.from("eu_notice_documents").insert({
        session_id: sessionId,
        client_id: (session as SessionRow).client_id,
        framework_code: "_INTERNATIONAL",
        is_combined: true,
        version_number: nextVersion,
        document_format: "html",
        file_path: combinedPath,
        file_size_bytes: combinedBytes.byteLength,
        is_current: true,
        generated_at: generatedAtIso,
      });
      if (insErr) throw insErr;
      generated.push({ framework: "_INTERNATIONAL", path: combinedPath, size: combinedBytes.byteLength, combined: true });
    }

    for (const fw of fws) {
      const html = buildNoticeHtml(fw, answers, generatedAtHuman);
      const bytes = new TextEncoder().encode(html);
      const path = `${sessionId}/v${nextVersion}/${fw.framework_code}.html`;
      const { error: upErr } = await admin.storage
        .from("eu-notices")
        .upload(path, bytes, { contentType: "text/html; charset=utf-8", upsert: true });
      if (upErr) throw upErr;
      const { error: insErr } = await admin.from("eu_notice_documents").insert({
        session_id: sessionId,
        client_id: (session as SessionRow).client_id,
        framework_code: fw.framework_code,
        is_combined: false,
        version_number: nextVersion,
        document_format: "html",
        file_path: path,
        file_size_bytes: bytes.byteLength,
        is_current: true,
        generated_at: generatedAtIso,
      });
      if (insErr) throw insErr;
      generated.push({ framework: fw.framework_code, path, size: bytes.byteLength });
    }

    await admin
      .from("eu_notice_sessions")
      .update({
        status: "generated",
        version_number: nextVersion,
        completed_at: generatedAtIso,
        last_activity_at: generatedAtIso,
      })
      .eq("id", sessionId);

    return new Response(
      JSON.stringify({ ok: true, version: nextVersion, documents: generated }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[generate-eu-notice] error", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
