// Surface regulatory updates relevant to a legitimate-interest assessment (LIA).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface RegulatoryUpdate {
  article_id: string;
  title: string;
  summary: string;
  url: string;
  jurisdiction_name: string;
  urgency: "high" | "medium";
  action_required: string;
  source_date: string;
  domain?: string;
}

function mapUrgency(level: string | null): "high" | "medium" | null {
  if (!level) return null;
  const v = String(level).toLowerCase();
  if (["urgent", "critical", "high"].includes(v)) return "high";
  if (["important", "medium", "moderate"].includes(v)) return "medium";
  return null;
}
function buildActionRequired(u: any): string {
  const first = Array.isArray(u.action_items) ? u.action_items[0] : null;
  const fromAction =
    typeof first === "string" ? first : (first?.action ?? null);
  return (
    fromAction ??
    u.why_it_matters_short ??
    "Review whether this development affects this document."
  );
}

const TOOL_TYPE = "lia";

const LIA_TAGS = [
  "legitimate-interest",
  "gdpr-article-6",
  "edpb-guidelines",
  "balancing-test",
  "three-part-test",
  "lia",
  "legitimate-interests",
  "edpb",
  "ico",
  "article-6-1-f",
];

const CATEGORY_TAG_MAP: Record<string, string[]> = {
  direct_marketing: ["direct-marketing", "marketing-consent", "epriv", "spam"],
  fraud_prevention: ["fraud-prevention", "financial-privacy"],
  employee_monitoring: ["employee-privacy", "workplace-monitoring", "hr-privacy"],
  behavioral_advertising: ["adtech", "cookie-consent", "behavioural-advertising", "tracking"],
  research_analytics: ["research", "statistics", "anonymisation"],
  it_security: ["cybersecurity", "security-monitoring"],
  contractual_administration: ["gdpr-article-6", "contract-performance"],
};

const JURISDICTION_TAG_MAP: Record<string, string[]> = {
  EU: ["eu", "gdpr", "edpb", "european-union"],
  UK: ["uk", "united-kingdom", "ico", "uk-gdpr"],
  US: ["us-federal", "us-states", "ftc"],
};

function detectCategory(text: string): string | null {
  const t = (text ?? "").toLowerCase();
  if (!t) return null;
  if (t.includes("direct marketing") || t.includes("marketing")) return "direct_marketing";
  if (t.includes("fraud")) return "fraud_prevention";
  if (t.includes("employee") || t.includes("workplace") || t.includes("monitoring")) {
    return "employee_monitoring";
  }
  if (t.includes("behavioural") || t.includes("behavioral") || t.includes("advertising")) {
    return "behavioral_advertising";
  }
  if (t.includes("research") || t.includes("analytics") || t.includes("statistics")) {
    return "research_analytics";
  }
  if (t.includes("security") || t.includes("cyber")) return "it_security";
  if (t.includes("contract") || t.includes("administration")) return "contractual_administration";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonError("Missing authorization", 401);

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
    const document_id = body?.document_id as string | undefined;
    if (!document_id || !/^[0-9a-f-]{36}$/i.test(document_id)) {
      return jsonError("Invalid document_id", 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: doc } = await admin
      .from("li_assessments")
      .select("id, created_at, jurisdictions, sector, stated_purpose, data_categories, client_id")
      .eq("id", document_id)
      .maybeSingle();
    if (!doc) return jsonError("Document not found", 404);

    const { data: clientRow } = await admin
      .from("clients")
      .select("owner_id")
      .eq("id", doc.client_id)
      .maybeSingle();
    if (!clientRow || clientRow.owner_id !== userId) return jsonError("Forbidden", 403);

    const jurisdictions: string[] = (doc as any).jurisdictions ?? [];
    const sector: string = (doc as any).sector ?? "";
    const stated_purpose: string = (doc as any).stated_purpose ?? "";

    const category =
      detectCategory(stated_purpose) ??
      detectCategory(sector) ??
      null;

    const tagSet = new Set<string>(LIA_TAGS);
    if (category && CATEGORY_TAG_MAP[category]) {
      CATEGORY_TAG_MAP[category].forEach((t) => tagSet.add(t));
    }
    for (const j of jurisdictions) {
      const mapped = JURISDICTION_TAG_MAP[j];
      if (mapped) mapped.forEach((t) => tagSet.add(t));
      else if (j) tagSet.add(String(j).toLowerCase());
    }

    const document_created_at: string = doc.created_at;
    const { data: rawUpdates, error: uErr } = await admin
      .from("updates")
      .select(
        "id, title, url, summary, why_it_matters_short, action_items, " +
          "attention_level, topic_tags, direct_jurisdictions, " +
          "affected_jurisdictions, published_at",
      )
      .gte("published_at", document_created_at)
      .in("attention_level", ["high", "medium"])
      .eq("is_hidden", false)
      .order("published_at", { ascending: false })
      .limit(200);
    if (uErr) return jsonError(uErr.message, 500);

    const relevant = (rawUpdates ?? []).filter((u: any) => {
      const topic: string[] = u.topic_tags ?? [];
      const direct: string[] = u.direct_jurisdictions ?? [];
      const affected: string[] = u.affected_jurisdictions ?? [];
      if (topic.some((t) => tagSet.has(t))) return true;
      if (direct.some((t) => tagSet.has(t))) return true;
      if (affected.some((t) => tagSet.has(t))) return true;
      return false;
    });

    const { data: noted } = await admin
      .from("tool_regulatory_update_acknowledgements")
      .select("article_id")
      .eq("user_id", userId)
      .eq("tool_type", TOOL_TYPE)
      .eq("document_id", document_id);
    const notedIds = new Set((noted ?? []).map((n: any) => n.article_id));

    const results: RegulatoryUpdate[] = [];
    for (const u of relevant) {
      if (notedIds.has(u.id)) continue;
      const urgency = mapUrgency(u.attention_level);
      if (!urgency) continue;

      let jurisdiction_name = jurisdictions[0] ?? "Multiple jurisdictions";
      const direct: string[] = u.direct_jurisdictions ?? [];
      for (const j of jurisdictions) {
        const mapped = JURISDICTION_TAG_MAP[j] ?? [String(j).toLowerCase()];
        if (direct.some((d) => mapped.includes(d))) {
          jurisdiction_name = j;
          break;
        }
      }

      results.push({
        article_id: u.id,
        title: u.title,
        summary: u.why_it_matters_short ?? u.summary ?? "",
        url: u.url,
        jurisdiction_name,
        urgency,
        action_required: buildActionRequired(u),
        source_date: u.published_at,
      });
    }

    results.sort((a, b) => {
      if (a.urgency !== b.urgency) return a.urgency === "high" ? -1 : 1;
      return (b.source_date ?? "").localeCompare(a.source_date ?? "");
    });

    return json({
      updates: results.slice(0, 20),
      document_created_at,
      jurisdictions_monitored: jurisdictions,
      total_before_limit: results.length,
    });
  } catch (err) {
    console.error("get-lia-regulatory-updates error:", err);
    return jsonError(err instanceof Error ? err.message : "Internal error", 500);
  }
});
