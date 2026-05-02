// supabase/functions/generate-us-notice/index.ts
//
// Generates per-state US privacy notices (HTML) from a us_notice_session's
// answers + state selections, uploads each file to the private `us-notices`
// storage bucket, records rows in us_notice_documents, and marks the session
// as completed.
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

interface StateRow {
  state_code: string;
  state_name: string;
  framework_type: string;
}

interface AnswerRow {
  question_key: string;
  answer_value: unknown;
}

const FRAMEWORK_LABELS: Record<string, string> = {
  ccpa: "California Consumer Privacy Act (CCPA/CPRA)",
  virginia_model: "Virginia-model state privacy law",
  maryland: "Maryland Online Data Privacy Act (MODPA)",
  florida: "Florida Digital Bill of Rights (FDBR)",
  pending: "Pending state privacy law",
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
  state: StateRow,
  answers: Record<string, unknown>,
  generatedAt: string,
): string {
  const businessName = answerString(answers["business_name"]) || "[Business name]";
  const businessDesc = answerString(answers["business_description"]) || "";
  const contactEmail = answerString(answers["contact_email"]) || "[contact email]";
  const dataCategories = answerString(answers["data_categories"]) || "—";
  const purposes = answerString(answers["collection_purposes"]) || "—";
  const sharing = answerString(answers["third_party_sharing"]);
  const thirdParties = answerString(answers["third_party_categories"]) || "—";
  const sale = answerString(answers["sale_or_sharing"]);
  const retention = answerString(answers["retention_general"]) || "Not specified";

  const showOptOut =
    sale === "sell_and_share" || sale === "sell_only" || sale === "share_only";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(state.state_name)} Privacy Notice — ${escapeHtml(businessName)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 760px; margin: 2rem auto; padding: 0 1.5rem; color: #1a1a1a; line-height: 1.55; }
  h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
  h2 { font-size: 1.15rem; margin-top: 2rem; border-bottom: 1px solid #ddd; padding-bottom: 0.25rem; }
  .meta { color: #666; font-size: 0.85rem; margin-bottom: 2rem; }
  .badge { display: inline-block; background: #f0f0f0; padding: 0.15rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; }
  .opt-out { background: #fff7ed; border: 1px solid #fdba74; padding: 1rem; border-radius: 0.375rem; margin: 1rem 0; }
  footer { color: #888; font-size: 0.75rem; margin-top: 3rem; border-top: 1px solid #eee; padding-top: 1rem; }
</style>
</head>
<body>
  <h1>${escapeHtml(state.state_name)} Privacy Notice</h1>
  <div class="meta">
    <span class="badge">${escapeHtml(FRAMEWORK_LABELS[state.framework_type] ?? state.framework_type)}</span>
    &nbsp;·&nbsp; Last updated: ${escapeHtml(generatedAt)}
  </div>

  <p>This notice explains how <strong>${escapeHtml(businessName)}</strong> collects, uses, and shares the personal information of ${escapeHtml(state.state_name)} residents, and the rights they have under the ${escapeHtml(FRAMEWORK_LABELS[state.framework_type] ?? state.framework_type)}.</p>
  ${businessDesc ? `<p>${escapeHtml(businessDesc)}</p>` : ""}

  <h2>1. Information we collect</h2>
  <p>${escapeHtml(dataCategories)}</p>

  <h2>2. How we use this information</h2>
  <p>${escapeHtml(purposes)}</p>

  <h2>3. Sharing with third parties</h2>
  ${
    sharing === "yes"
      ? `<p>We share personal information with the following categories of recipients: ${escapeHtml(thirdParties)}.</p>`
      : `<p>We do not share personal information with third parties for their own use, except as required by law.</p>`
  }

  ${
    showOptOut
      ? `<div class="opt-out">
          <strong>Your right to opt out of sale or sharing.</strong>
          <p>You have the right to opt out of the sale of your personal information and of its use for cross-context behavioural advertising. To exercise this right, contact us at <a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a> or use the "Do Not Sell or Share My Personal Information" link on our website.</p>
        </div>`
      : ""
  }

  <h2>4. How long we keep your information</h2>
  <p>${escapeHtml(retention)}</p>

  <h2>5. Your rights</h2>
  <p>As a ${escapeHtml(state.state_name)} resident, you have the right to: (a) know what personal information we collect about you; (b) request access to or a copy of that information; (c) request correction or deletion; and (d) opt out of certain processing. You may also designate an authorised agent to exercise these rights on your behalf.</p>

  <h2>6. How to contact us</h2>
  <p>To exercise any of these rights or for questions about this notice, contact us at <a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a>.</p>

  <footer>
    Generated by EndUserPrivacy.com. This notice is a starting template based on your inputs and is not legal advice. Review with qualified counsel before publishing.
  </footer>
</body>
</html>`;
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

    // Validate JWT.
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

    // Parse + validate body.
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

    // Service-role client for privileged reads/writes.
    const admin = createClient(supabaseUrl, serviceKey);

    // Load session.
    const { data: session, error: sessionErr } = await admin
      .from("us_notice_sessions")
      .select("id, client_id, status, scope, version_number")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionErr || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ownership check using user-scoped client.
    const { data: ownsData, error: ownsErr } = await userClient.rpc(
      "owns_client",
      { _client_id: (session as SessionRow).client_id },
    );
    if (ownsErr || ownsData !== true) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load states + answers in parallel.
    const [statesRes, answersRes] = await Promise.all([
      admin
        .from("us_notice_state_selections")
        .select("state_code, state_name, framework_type")
        .eq("session_id", sessionId),
      admin
        .from("us_notice_answers")
        .select("question_key, answer_value")
        .eq("session_id", sessionId),
    ]);

    if (statesRes.error) throw statesRes.error;
    if (answersRes.error) throw answersRes.error;

    const states = (statesRes.data ?? []) as StateRow[];
    if (states.length === 0) {
      return new Response(
        JSON.stringify({ error: "No states selected for this session" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const answers: Record<string, unknown> = {};
    for (const r of (answersRes.data ?? []) as AnswerRow[]) {
      answers[r.question_key] = r.answer_value;
    }

    // Mark previous current docs as not current (we're producing a new version).
    await admin
      .from("us_notice_documents")
      .update({ is_current: false })
      .eq("session_id", sessionId)
      .eq("is_current", true);

    const nextVersion = ((session as SessionRow).version_number ?? 0) + 1;
    const generatedAtIso = new Date().toISOString();
    const generatedAtHuman = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const generated: { state: string; path: string; size: number }[] = [];

    for (const state of states) {
      const html = buildNoticeHtml(state, answers, generatedAtHuman);
      const bytes = new TextEncoder().encode(html);
      const path = `${sessionId}/v${nextVersion}/${state.state_code}.html`;

      const { error: uploadErr } = await admin.storage
        .from("us-notices")
        .upload(path, bytes, {
          contentType: "text/html; charset=utf-8",
          upsert: true,
        });

      if (uploadErr) {
        console.error("[generate-us-notice] upload error", state.state_code, uploadErr);
        throw uploadErr;
      }

      const { error: insertErr } = await admin.from("us_notice_documents").insert({
        session_id: sessionId,
        client_id: (session as SessionRow).client_id,
        state_code: state.state_code,
        framework_type: state.framework_type,
        is_combined: false,
        version_number: nextVersion,
        document_format: "html",
        file_path: path,
        file_size_bytes: bytes.byteLength,
        is_current: true,
        generated_at: generatedAtIso,
      });

      if (insertErr) {
        console.error("[generate-us-notice] insert error", state.state_code, insertErr);
        throw insertErr;
      }

      generated.push({ state: state.state_code, path, size: bytes.byteLength });
    }

    // Update session.
    await admin
      .from("us_notice_sessions")
      .update({
        status: "completed",
        version_number: nextVersion,
        completed_at: generatedAtIso,
        last_activity_at: generatedAtIso,
      })
      .eq("id", sessionId);

    return new Response(
      JSON.stringify({
        ok: true,
        version: nextVersion,
        documents: generated,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[generate-us-notice] error", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
