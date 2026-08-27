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
import { REPORT_DISCLAIMER } from "../_shared/report-disclaimer.ts";
import { verifyCaller } from "../_shared/verify-caller.ts";
// S-N5 — the pure render layer lives in _local/render.ts (testable without
// this module's Deno.serve listener); moved verbatim, re-exported below.
import {
  answerString,
  buildNoticeHtml,
  escapeHtml,
  LOGO_URL,
  missingRequiredUsFields,
  resolveLawLabel,
  type StateRow,
  usDraftBannerHtml,
} from "./_local/render.ts";
export { buildNoticeHtml, missingRequiredUsFields, type StateRow } from "./_local/render.ts";



const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Machine-checkable manifest of statutory assertions carried by the hardcoded
// templates below. lint-deterministic-legal-text resolves each `citation`
// against the corpus (cppa_authorities) and verifies every `mustContain`
// phrase appears in the corpus full_text. Update the shared module alongside
// any template edit that changes a statutory claim.
import { US_NOTICE_LEGAL_TEXT_ASSERTIONS } from "../_shared/legal-text-assertions.ts";
export const LEGAL_TEXT_ASSERTIONS = US_NOTICE_LEGAL_TEXT_ASSERTIONS;



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


interface AnswerRow {
  question_key: string;
  answer_value: unknown;
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

    
    const caller = await verifyCaller(req);
    if (!caller.userId && !caller.internal) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    // For non-internal callers, we use a user-scoped client for owns_client RPC.
    const userClient = caller.internal
      ? null
      : createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });


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

    // Check ownership: internal callers (service-role) bypass; otherwise try RPC, then fall back to admin check.
    let ownsClient = caller.internal;
    if (!ownsClient && userClient) {
      try {
        const { data: ownsData, error: ownsErr } = await userClient.rpc(
          "owns_client",
          { _client_id: (session as SessionRow).client_id },
        );
        if (!ownsErr) ownsClient = ownsData === true;
      } catch { /* fall through to admin check */ }
    }

    if (!ownsClient && caller.userId) {
      const { data: clientCheck } = await admin
        .from("clients")
        .select("id")
        .eq("id", (session as SessionRow).client_id)
        .eq("owner_id", caller.userId)
        .maybeSingle();
      ownsClient = !!clientCheck;
    }


    if (!ownsClient) {
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

    const states = ((statesRes.data ?? []) as StateRow[]).sort((a, b) => {
      // California first (most comprehensive law, consumers read it first).
      // All other states follow alphabetically by state name.
      if (a.state_code === "CA") return -1;
      if (b.state_code === "CA") return 1;
      return a.state_name.localeCompare(b.state_name);
    });
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

    // S-N5 (doc 80, 2026-08-27) — server-side required-field screen. The
    // generated documents render a visible do-not-publish banner naming the
    // missing fields; this log line is the server-side record of the same
    // check (PN-N2's full contract-with-ratified-absence-forms design rides
    // the N1 redline; a hard 4xx block is deliberately NOT introduced here
    // so existing draft sessions can still regenerate and see the banner).
    const missingRequired = missingRequiredUsFields(answers);
    if (missingRequired.length > 0) {
      console.warn(`[generate-us-notice] required fields missing (banner rendered): ${missingRequired.join(", ")} — session ${sessionId}`);
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

    const generated: { state: string; path: string; size: number; combined?: boolean }[] = [];

    // ---------- Combined "all-states suite" master notice ----------
    // When the session covers multiple states, also produce a single master
    // notice that aggregates every per-state section into one document.
    const isSuite =
      ((session as SessionRow).scope === "all_states") || states.length > 1;

    if (isSuite) {
      const businessName = answerString(answers["business_name"]) || "[Business name]";
      const contactEmail = answerString(answers["contact_email"]) || "[contact email]";
      const sectionsHtml = states
        .map((s) => {
          const label = resolveLawLabel(s);
          return `<section style="margin-top:2.5rem;padding-top:1.5rem;border-top:2px solid #e5e7eb;">
  <h2 style="font-size:1.35rem;">${escapeHtml(s.state_name)}</h2>
  <p style="color:#666;font-size:0.85rem;margin-top:-0.25rem;">${escapeHtml(label)}</p>
  <p>This section applies to residents of <strong>${escapeHtml(s.state_name)}</strong>. ${escapeHtml(businessName)} honors the rights granted under ${escapeHtml(label)}, including access, correction, deletion, portability, and (where applicable) the right to opt out of sale, sharing, or targeted advertising.</p>
  <p>To exercise these rights as a ${escapeHtml(s.state_name)} resident, contact us at <a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a>.</p>
</section>`;
        })
        .join("\n");

      const tocHtml = states
        .map(
          (s) =>
            `<li><a href="#${escapeHtml(s.state_code)}" style="color:#2d9b90;">${escapeHtml(s.state_name)}</a> — <span style="color:#5c6d7a;font-size:0.85rem;">${escapeHtml(resolveLawLabel(s))}</span></li>`,
        )
        .join("");

      const combinedHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>US Privacy Notice Suite — ${escapeHtml(businessName)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 820px; margin: 2rem auto; padding: 0 1.5rem; color: #1a1a1a; line-height: 1.55; }
  .eup-bar { background:#0c2a44; padding:9px 1.5rem; display:flex; align-items:center;
    gap:12px; margin:-2rem -1.5rem 2rem -1.5rem; }
  .eup-bar img { height:22px; width:auto; display:block; }
  .eup-bar span { font-size:9px; font-weight:600; text-transform:uppercase;
    letter-spacing:0.12em; color:#93b5c6; }
  h1, h2 { color:#0c2a44; }
  h1 { font-size: 1.9rem; margin-bottom: 0.25rem; }
  h2 { font-size: 1.35rem; border-bottom: 2px solid #2d9b90; padding-bottom:0.25rem; }
  a { color:#2d9b90; }
  .meta { color:#5c6d7a; font-size: 0.85rem; margin-bottom: 2rem; }
  ul.toc { background:#edf2f5;border:1px solid #dde5ea;padding:1rem 1.25rem 1rem 2.25rem;border-radius:0.5rem; }
  .opt-out { background:#e5f4f2; border:1px solid #2d9b90; padding:1rem; border-radius:0.375rem; margin:1rem 0; }
  footer { color:#5c6d7a; font-size: 0.75rem; margin-top: 3rem; border-top: 2px solid #2d9b90; padding-top: 1rem; }
</style></head><body>
<div class="eup-bar">
  <img src="${LOGO_URL}" alt="End User Privacy" />
  <span>Privacy Intelligence</span>
</div>
<h1>US State Privacy Notice Suite</h1>
<div class="meta">${escapeHtml(businessName)} · Last updated: ${escapeHtml(generatedAtHuman)} · ${states.length} state${states.length === 1 ? "" : "s"} covered</div>
${usDraftBannerHtml(missingRequiredUsFields(answers))}
${states.length < 10
  ? `<div style="background:#fff8e1;border:1px solid #f59e0b;border-radius:0.375rem;padding:0.75rem 1rem;margin-bottom:1.5rem;font-size:0.85rem;color:#92400e;">
      <strong>Scope note:</strong> This suite covers ${states.length} state${states.length === 1 ? "" : "s"} (${states.map((s) => escapeHtml(s.state_name)).join(", ")}). As of 2024–2026, approximately 20 US states have enacted comprehensive privacy laws. This document does not constitute a complete US national privacy notice; the applicability of additional state laws depends on where your organisation directs business and processes residents' personal information, and further clarification is advisable.
    </div>`
  : ""
}
<p>This suite consolidates the privacy notices ${escapeHtml(businessName)} maintains for residents of each US state listed below. Each state's section incorporates the rights and disclosures required by that state's privacy law. Use the table of contents to jump to the section that applies to you.</p>
<h2>Table of contents</h2>
<ul class="toc">${tocHtml}</ul>
${states
  .map(
    (s) =>
      `<a id="${escapeHtml(s.state_code)}"></a>${
        // Reuse the per-state body sections so the suite stays consistent.
        buildNoticeHtml(s, answers, generatedAtHuman, false)
          .replace(/^[\s\S]*?<body>/, "")
          .replace(/<\/body>[\s\S]*$/, "")
          .replace(/<div class="eup-bar">[\s\S]*?<\/div>/, "")
          .replace(/<h1>[^<]*<\/h1>/, `<h2>${escapeHtml(s.state_name)} Privacy Notice</h2>`)
      }`,
  )
  .join("\n")}
<footer>Generated by <strong>EndUserPrivacy</strong> · enduserprivacy.com ·
${REPORT_DISCLAIMER}</footer>
</body></html>`;

      const combinedBytes = new TextEncoder().encode(combinedHtml);
      const combinedPath = `${(session as SessionRow).client_id}/${sessionId}/v${nextVersion}/_suite.html`;
      const { error: combinedUploadErr } = await admin.storage
        .from("us-notices")
        .upload(combinedPath, combinedBytes, {
          contentType: "text/html; charset=utf-8",
          upsert: true,
        });
      if (combinedUploadErr) {
        console.error("[generate-us-notice] combined upload error", combinedUploadErr);
        throw combinedUploadErr;
      }
      const { error: combinedInsertErr } = await admin.from("us_notice_documents").insert({
        session_id: sessionId,
        client_id: (session as SessionRow).client_id,
        state_code: null,
        framework_type: "pending",
        is_combined: true,
        version_number: nextVersion,
        document_format: "html",
        file_path: combinedPath,
        file_size_bytes: combinedBytes.byteLength,
        is_current: true,
        generated_at: generatedAtIso,
      });
      if (combinedInsertErr) {
        console.error("[generate-us-notice] combined insert error", combinedInsertErr);
        throw combinedInsertErr;
      }
      generated.push({ state: "_suite", path: combinedPath, size: combinedBytes.byteLength, combined: true });
    }

    for (const state of states) {
      const html = buildNoticeHtml(state, answers, generatedAtHuman);
      const bytes = new TextEncoder().encode(html);
      const path = `${(session as SessionRow).client_id}/${sessionId}/v${nextVersion}/${state.state_code}.html`;

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
