// Phase 4 of RoPA refresh: surface regulatory updates published since the last
// generated document for the session's jurisdictions. Read-only, requires JWT.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

// Mirror of src/data/ropa-topic-mapping.ts — kept inline so the edge function
// is self-contained (no cross-tree imports allowed).
const TOPIC_TO_TEMPLATE_KEYS: Record<string, string[]> = {
  "ai-privacy": ["marketing_analytics", "tech_it_systems", "hr_recruitment", "customer_support"],
  "ai-governance": ["tech_it_systems", "hr_recruitment", "marketing_analytics"],
  "children-privacy": ["marketing_email", "marketing_social", "customer_accounts"],
  "health-hipaa": ["hr_benefits", "customer_accounts", "third_party_vendors"],
  "data-breaches": ["tech_security", "tech_it_systems", "tech_cloud"],
  "adtech": ["marketing_advertising", "marketing_analytics", "marketing_social"],
  "cookie-consent": ["marketing_analytics", "marketing_advertising"],
  "biometric-data": ["hr_monitoring", "tech_security", "customer_kyc"],
  "data-transfers": ["tech_cloud", "third_party_transfers", "third_party_vendors"],
  "cross-border": ["third_party_transfers", "tech_cloud"],
  "data-brokers": ["third_party_sharing", "marketing_analytics"],
  "employee-privacy": ["hr_payroll", "hr_recruitment", "hr_performance", "hr_monitoring"],
  "privacy-litigation": ["legal_compliance", "legal_contracts"],
  "enforcement": ["legal_compliance"],
  "apac-latam": ["third_party_transfers", "tech_cloud"],
};

const TOPIC_TO_QUESTION_KEYS: Record<string, string[]> = {
  "ai-privacy": ["automated_decision_making", "data_categories", "lawful_basis"],
  "ai-governance": ["automated_decision_making", "dpia_required"],
  "children-privacy": ["data_subjects", "lawful_basis", "parental_consent"],
  "health-hipaa": ["special_category_data", "data_categories"],
  "data-breaches": ["security_measures", "breach_notification"],
  "adtech": ["lawful_basis", "third_party_recipients", "international_transfers"],
  "cookie-consent": ["lawful_basis", "consent_mechanism"],
  "biometric-data": ["special_category_data", "lawful_basis"],
  "data-transfers": ["international_transfers", "transfer_safeguards"],
  "cross-border": ["international_transfers", "transfer_safeguards"],
  "data-brokers": ["third_party_recipients", "data_sources"],
  "employee-privacy": ["lawful_basis", "data_categories"],
  "privacy-litigation": ["lawful_basis", "dpia_required"],
};

function mapAttentionToUrgency(level: string | null): "high" | "medium" | null {
  if (!level) return null;
  const v = level.toLowerCase();
  if (["urgent", "critical", "high"].includes(v)) return "high";
  if (["important", "medium", "moderate"].includes(v)) return "medium";
  return null;
}

interface RegulatoryUpdate {
  article_id: string;
  title: string;
  summary: string;
  url: string;
  jurisdiction_code: string;
  jurisdiction_name: string;
  affected_template_keys: string[];
  affected_question_keys: string[];
  urgency: "high" | "medium";
  action_required: string;
  source_date: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError("Missing authorization", 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return jsonError("Invalid auth", 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const sessionId = body.session_id as string | undefined;
    const lastGenerated = body.last_generated_date as string | undefined;
    if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId)) {
      return jsonError("Invalid session_id", 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify session ownership
    const { data: session } = await admin
      .from("ropa_sessions")
      .select("id, client_id, parent_session_id")
      .eq("id", sessionId)
      .maybeSingle();
    if (!session) return jsonError("Session not found", 404);

    const { data: client } = await admin
      .from("clients")
      .select("id, owner_id")
      .eq("id", session.client_id)
      .maybeSingle();
    if (!client || client.owner_id !== userId) return jsonError("Forbidden", 403);

    // Determine cutoff date
    let sinceIso = lastGenerated;
    if (!sinceIso && session.parent_session_id) {
      const { data: parent } = await admin
        .from("ropa_sessions")
        .select("completed_at, started_at")
        .eq("id", session.parent_session_id)
        .maybeSingle();
      sinceIso = parent?.completed_at ?? parent?.started_at ?? undefined;
    }
    if (!sinceIso) {
      // Fallback: 12 months ago
      const d = new Date();
      d.setMonth(d.getMonth() - 12);
      sinceIso = d.toISOString();
    }

    // Load jurisdictions
    const { data: jurisdictions } = await admin
      .from("ropa_jurisdiction_selections")
      .select("jurisdiction_code, jurisdiction_name")
      .eq("client_id", session.client_id);
    const jurCodes = (jurisdictions || []).map((j) => j.jurisdiction_code);
    const jurNameByCode = new Map(
      (jurisdictions || []).map((j) => [j.jurisdiction_code, j.jurisdiction_name]),
    );
    if (jurCodes.length === 0) {
      return jsonOk({ updates: [], jurisdictions_monitored: [] });
    }

    // Load templates the client uses (so we only flag relevant ones)
    const { data: activities } = await admin
      .from("ropa_processing_activities")
      .select("template_key")
      .eq("session_id", sessionId);
    const activeTemplateKeys = new Set(
      (activities || [])
        .map((a) => a.template_key)
        .filter((k): k is string => Boolean(k)),
    );

    // Query updates: published since cutoff, attention level high/medium,
    // overlapping jurisdiction codes (direct or affected).
    const { data: rawUpdates, error: uErr } = await admin
      .from("updates")
      .select(
        "id, title, summary, url, published_at, attention_level, topic_tags, " +
          "direct_jurisdictions, affected_jurisdictions, action_items, why_it_matters_short",
      )
      .gte("published_at", sinceIso)
      .eq("is_hidden", false)
      .order("published_at", { ascending: false })
      .limit(200);
    if (uErr) return jsonError(uErr.message, 500);

    const results: RegulatoryUpdate[] = [];
    for (const u of rawUpdates || []) {
      const urgency = mapAttentionToUrgency(u.attention_level);
      if (!urgency) continue;

      const direct: string[] = u.direct_jurisdictions || [];
      const affected: string[] = u.affected_jurisdictions || [];
      const allJur = new Set([...direct, ...affected]);
      const matchingJur = jurCodes.filter((c) => allJur.has(c));
      if (matchingJur.length === 0) continue;

      const tags: string[] = u.topic_tags || [];
      const tplSet = new Set<string>();
      const qSet = new Set<string>();
      tags.forEach((t) => {
        (TOPIC_TO_TEMPLATE_KEYS[t] || []).forEach((k) => tplSet.add(k));
        (TOPIC_TO_QUESTION_KEYS[t] || []).forEach((q) => qSet.add(q));
      });
      const affectedTemplates = [...tplSet].filter((k) => activeTemplateKeys.has(k));
      if (affectedTemplates.length === 0) continue;

      // Build action_required string
      let actionRequired = u.why_it_matters_short || "";
      if (!actionRequired && Array.isArray(u.action_items) && u.action_items.length > 0) {
        const first = u.action_items[0];
        actionRequired =
          typeof first === "string"
            ? first
            : first?.action || first?.title || "Review this update for impact on your processing.";
      }
      if (!actionRequired) {
        actionRequired = "Review whether this development requires changes to your records.";
      }

      const primaryJur = matchingJur[0];
      results.push({
        article_id: u.id,
        title: u.title,
        summary: u.summary || "",
        url: u.url,
        jurisdiction_code: primaryJur,
        jurisdiction_name: jurNameByCode.get(primaryJur) || primaryJur,
        affected_template_keys: affectedTemplates,
        affected_question_keys: [...qSet],
        urgency,
        action_required: actionRequired,
        source_date: u.published_at,
      });
    }

    // Sort high before medium, then by date
    results.sort((a, b) => {
      if (a.urgency !== b.urgency) return a.urgency === "high" ? -1 : 1;
      return b.source_date.localeCompare(a.source_date);
    });

    return jsonOk({
      updates: results,
      jurisdictions_monitored: (jurisdictions || []).map((j) => ({
        code: j.jurisdiction_code,
        name: j.jurisdiction_name,
      })),
      since: sinceIso,
    });
  } catch (err) {
    console.error("get-ropa-regulatory-updates error:", err);
    return jsonError(err instanceof Error ? err.message : "Internal error", 500);
  }
});

function jsonOk(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}
function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
