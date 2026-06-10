// accumulate-ropa-activity
// Drafts a processing activity into the client's most recent active RoPA session
// when an assessment (LIA / DPIA / DPA / Biometric / Governance / CPPA-Cyber)
// completes. Idempotent via the (session_id, source_tool, source_assessment_id)
// unique partial index on ropa_processing_activities.
//
// Called server-to-server from other edge functions with the service role key.
// Validates inputs and silently no-ops if the client has no active RoPA session.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const ALLOWED_TOOLS = new Set([
  "li_assessment",
  "dpia_framework",
  "dpa_generator",
  "biometric_checker",
  "governance_assessment",
  "cppa_cybersecurity",
]);

const TOOL_LABEL: Record<string, string> = {
  li_assessment: "Legitimate Interest Assessment",
  dpia_framework: "Impact Assessment (DPIA)",
  dpa_generator: "Data Processing Agreement",
  biometric_checker: "Biometric Compliance Check",
  governance_assessment: "Governance Assessment",
  cppa_cybersecurity: "CPPA Cybersecurity Audit",
};

// Active session statuses we will accumulate into. Once a session is
// 'generated' / 'final' we don't auto-modify it.
const ACTIVE_STATUSES = ["setup", "in_progress", "review", "draft"];

interface Body {
  client_id?: string;
  source_tool?: string;
  source_assessment_id?: string;
  display_name?: string;
  source_summary?: string;
  is_high_risk?: boolean;
  template_key?: string | null;
  category?: string | null;
}

function isUuid(s: unknown): s is string {
  return typeof s === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Body = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const {
    client_id,
    source_tool,
    source_assessment_id,
    display_name,
    source_summary,
    is_high_risk = false,
    template_key = null,
    category = null,
  } = body;

  if (!isUuid(client_id) || !isUuid(source_assessment_id)) {
    return new Response(JSON.stringify({ error: "client_id and source_assessment_id must be uuids" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!source_tool || !ALLOWED_TOOLS.has(source_tool)) {
    return new Response(JSON.stringify({ error: "invalid source_tool" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Find most recent active session for client
  const { data: sessions, error: sErr } = await supabase
    .from("ropa_sessions")
    .select("id, status, last_activity_at")
    .eq("client_id", client_id)
    .in("status", ACTIVE_STATUSES)
    .order("last_activity_at", { ascending: false })
    .limit(1);

  if (sErr) {
    console.error("[accumulate-ropa] session lookup error", sErr);
    return new Response(JSON.stringify({ error: sErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!sessions || sessions.length === 0) {
    return new Response(JSON.stringify({ accumulated: false, reason: "no_active_session" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const session = sessions[0];

  // Compute next display_order
  const { data: maxRow } = await supabase
    .from("ropa_processing_activities")
    .select("display_order")
    .eq("session_id", session.id)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = ((maxRow?.display_order as number | undefined) ?? -1) + 1;

  const finalName = display_name?.trim() ||
    `Suggested from ${TOOL_LABEL[source_tool] || source_tool}`;

  const insertRow = {
    session_id: session.id,
    client_id,
    template_key, // null = custom
    display_name: finalName.slice(0, 200),
    category: category || "other",
    status: "draft_suggested",
    completion_pct: 0,
    is_high_risk: !!is_high_risk,
    is_public_facing: false,
    display_order: nextOrder,
    source_tool,
    source_assessment_id,
    source_summary: source_summary ? source_summary.slice(0, 2000) : null,
  };

  const { data: inserted, error: iErr } = await supabase
    .from("ropa_processing_activities")
    .insert(insertRow)
    .select("id")
    .single();

  if (iErr) {
    // Duplicate from unique partial index → idempotent success
    if ((iErr as any).code === "23505") {
      return new Response(JSON.stringify({ accumulated: false, reason: "already_drafted", session_id: session.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("[accumulate-ropa] insert error", iErr);
    return new Response(JSON.stringify({ error: iErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Bump session activity counters & timestamp
  await supabase
    .from("ropa_sessions")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", session.id);

  return new Response(JSON.stringify({
    accumulated: true,
    activity_id: inserted?.id,
    session_id: session.id,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
