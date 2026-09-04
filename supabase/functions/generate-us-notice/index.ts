// supabase/functions/generate-us-notice/index.ts
//
// Generates US privacy notices (HTML) from a us_notice_session's answers +
// state selections, uploads each file to the private `us-notices` storage
// bucket, records rows in us_notice_documents, and marks the session as
// completed.
//
// DOC 181 (2026-09-04) — every document is the U.S. Privacy Notice spine:
// each per-state row is a STATE EDITION (the state addendum limited to that
// state; the California layer only for California), and the combined row is
// the NATIONAL notice covering every selected state. The us_state_privacy_laws
// registry is read for the enforcement contact, law name and effective date
// the State-Specific Addendum cites (static STATE_LAW_NAMES fallback when the
// read fails or a row is absent).
//
// Auth: requires a valid Supabase JWT. Ownership is enforced via
// public.owns_client() called as the requesting user.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { verifyCaller } from "../_shared/verify-caller.ts";
// S-N5 — the pure render layer lives in _local/render.ts (testable without
// this module's Deno.serve listener); re-exported below.
import {
  buildNationalNoticeHtml,
  buildNoticeHtml,
  missingRequiredUsFields,
  type StateRow,
  type UsLawRow,
} from "./_local/render.ts";
export {
  buildNationalNoticeHtml,
  buildNoticeHtml,
  missingRequiredUsFields,
  type StateRow,
  type UsLawRow,
} from "./_local/render.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Machine-checkable manifest of statutory assertions carried by the spine.
// lint-deterministic-legal-text resolves each `citation` against the corpus
// (cppa_authorities) and verifies every `mustContain` phrase appears in the
// corpus full_text. Update the shared module alongside any spine edit that
// changes a statutory claim.
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

    // DOC 181 — the law registry feeds the State-Specific Addendum's
    // enforcement contact and effective date. A failed read degrades to the
    // static fallback inside the spine; it never blocks generation.
    const laws: Record<string, UsLawRow> = {};
    try {
      const { data: lawRows, error: lawErr } = await admin
        .from("us_state_privacy_laws")
        .select("state_code, law_name, effective_date, enforcement_body, enforcement_url")
        .in("state_code", states.map((s) => s.state_code));
      if (lawErr) {
        console.warn(`[generate-us-notice] us_state_privacy_laws read failed; using static law table — ${lawErr.message}`);
      } else {
        for (const row of (lawRows ?? []) as UsLawRow[]) laws[row.state_code] = row;
      }
    } catch (e) {
      console.warn(`[generate-us-notice] us_state_privacy_laws read threw; using static law table — ${e instanceof Error ? e.message : String(e)}`);
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

    // ---------- National U.S. Privacy Notice (the combined row) ----------
    // When the session covers multiple states, also produce the national
    // notice: the spine with every selected state in the addendum.
    const isSuite =
      ((session as SessionRow).scope === "all_states") || states.length > 1;

    if (isSuite) {
      const combinedHtml = buildNationalNoticeHtml(states, answers, generatedAtHuman, laws);
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

    // ---------- State editions ----------
    for (const state of states) {
      const html = buildNoticeHtml(state, answers, generatedAtHuman, true, laws);
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
