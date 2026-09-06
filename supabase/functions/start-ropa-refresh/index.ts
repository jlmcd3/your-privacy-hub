// Clone a paid/generated RoPA session into a new "refresh" session.
// The new session inherits the client_id, version_number+1, links via parent_session_id,
// and copies all processing activities and their answers. A ropa_refresh_cycles row is created.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { nextLineageVersion, type LineageRow } from "./_local/version-lineage.ts";

interface RequestBody {
  source_session_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError("Missing authorization header", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return jsonError("Invalid authentication", 401);
    }
    const userId = userData.user.id;

    const body: RequestBody = await req.json().catch(() => ({}));
    const sourceSessionId = body.source_session_id;
    if (!sourceSessionId || !/^[0-9a-f-]{36}$/i.test(sourceSessionId)) {
      return jsonError("Invalid source_session_id", 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Load source session and verify ownership via clients.owner_id
    const { data: source, error: srcErr } = await admin
      .from("ropa_sessions")
      // QA round two (ROPA-B-01 / ROPA-C01, High) — org_name is the company
      // this register documents. It was not selected here and not cloned
      // below, so every refreshed session carried org_name = null and both
      // RopaReview and generate-ropa-document fell back to clients.name, which
      // for a single-workspace account is the default "My Workspace" row.
      .select("id, client_id, version_number, status, payment_confirmed, org_name, parent_session_id")
      .eq("id", sourceSessionId)
      .maybeSingle();
    if (srcErr || !source) return jsonError("Source session not found", 404);

    const { data: client, error: clientErr } = await admin
      .from("clients")
      .select("id, owner_id")
      .eq("id", source.client_id)
      .maybeSingle();
    if (clientErr || !client || client.owner_id !== userId) {
      return jsonError("Forbidden", 403);
    }

    // QA batch 2026-09-05 (ROPA 04) — an INCLUDED first generation (annual
    // subscriber, create-tool-checkout bypass) reaches status "generated" with
    // payment_confirmed = false, so every refresh from it was refused as
    // "not paid". A generated register is the thing being refreshed; payment
    // confirmation is one of two ways it got there.
    if (!source.payment_confirmed && source.status !== "generated") {
      return jsonError("The source register has not been generated yet — generate it before starting a refresh.", 400);
    }

    // QA round two (ROPA-B-02 / ROPA-C02, Medium) — version numbers did not
    // form a per-register sequence. The max was taken across the WHOLE client,
    // and a workspace that documents several companies against one client row
    // shares that counter: the QA account produced 1–5 for customer A, then
    // 6–8 for B, then 9–11 for C, so a refresh the UI promised as "v2" was
    // generated as "Version 9".
    //
    // A version belongs to its own register, so the sequence is scoped to the
    // refresh LINEAGE — the chain of parent_session_id links this session
    // descends from. Sessions per client are few, so the chain is resolved in
    // memory rather than with a recursive query.
    const { data: clientSessions } = await admin
      .from("ropa_sessions")
      .select("id, parent_session_id, version_number")
      .eq("client_id", source.client_id);

    const nextVersion = nextLineageVersion(
      (clientSessions ?? []) as LineageRow[],
      source.id as string,
      Number(source.version_number ?? 0),
    );

    // Create new session
    const { data: newSession, error: newErr } = await admin
      .from("ropa_sessions")
      .insert({
        client_id: source.client_id,
        // ROPA-B-01 / ROPA-C01 — carry the customer identity forward. Without
        // this the refreshed register is titled with the workspace name.
        org_name: source.org_name ?? null,
        status: "in_progress",
        version_number: nextVersion,
        is_refresh: true,
        parent_session_id: sourceSessionId,
        payment_confirmed: false,
      })
      .select()
      .single();
    if (newErr || !newSession) {
      return jsonError(newErr?.message || "Failed to create new session", 500);
    }

    // Clone activities
    const { data: srcActivities } = await admin
      .from("ropa_processing_activities")
      .select("*")
      .eq("session_id", sourceSessionId)
      .order("display_order", { ascending: true });

    const activityIdMap: Record<string, string> = {};
    if (srcActivities && srcActivities.length > 0) {
      const newActivityRows = srcActivities.map((a) => ({
        session_id: newSession.id,
        client_id: a.client_id,
        template_key: a.template_key,
        display_name: a.display_name,
        category: a.category,
        status: "not_started",
        completion_pct: 0,
        is_high_risk: a.is_high_risk,
        is_public_facing: a.is_public_facing,
        display_order: a.display_order,
      }));
      const { data: insertedActivities, error: insActErr } = await admin
        .from("ropa_processing_activities")
        .insert(newActivityRows)
        .select();
      if (insActErr) {
        return jsonError(`Failed to clone activities: ${insActErr.message}`, 500);
      }

      // Map source -> new activity ids by display_order + display_name
      (insertedActivities || []).forEach((newAct) => {
        const src = srcActivities.find(
          (s) =>
            s.display_order === newAct.display_order &&
            s.display_name === newAct.display_name,
        );
        if (src) activityIdMap[src.id] = newAct.id;
      });

      // Clone answers
      const { data: srcAnswers } = await admin
        .from("ropa_answers")
        .select("activity_id, question_key, answer_value")
        .eq("session_id", sourceSessionId);

      if (srcAnswers && srcAnswers.length > 0) {
        const newAnswerRows = srcAnswers
          .filter((ans) => activityIdMap[ans.activity_id])
          .map((ans) => ({
            activity_id: activityIdMap[ans.activity_id],
            session_id: newSession.id,
            question_key: ans.question_key,
            answer_value: ans.answer_value,
          }));
        if (newAnswerRows.length > 0) {
          const { error: ansErr } = await admin.from("ropa_answers").insert(newAnswerRows);
          if (ansErr) {
            console.error("Answer clone error:", ansErr.message);
          }
        }
      }

      // Update aggregate counts on session
      await admin
        .from("ropa_sessions")
        .update({ total_activities: srcActivities.length })
        .eq("id", newSession.id);
    }

    // Create refresh cycle record
    const { error: cycleErr } = await admin.from("ropa_refresh_cycles").insert({
      client_id: source.client_id,
      source_session_id: sourceSessionId,
      new_session_id: newSession.id,
    });
    if (cycleErr) console.error("Cycle insert warning:", cycleErr.message);

    return new Response(
      JSON.stringify({
        new_session_id: newSession.id,
        version_number: nextVersion,
        cloned_activities: srcActivities?.length ?? 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err) {
    console.error("start-ropa-refresh error:", err);
    return jsonError(err instanceof Error ? err.message : "Internal error", 500);
  }
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
