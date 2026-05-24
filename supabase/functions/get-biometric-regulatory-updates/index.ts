// Surface regulatory updates relevant to a biometric compliance assessment.
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

const TOOL_TYPE = "biometric";

const BIOMETRIC_TAGS = ["biometric-data", "enforcement",
  "health-hipaa", "data-breaches"];

const JURISDICTION_TAG_MAP: Record<string, string[]> = {
  "Illinois (BIPA)": ["illinois", "bipa", "us-il"],
  "Texas (CUBI)": ["texas", "us-tx", "tdpsa"],
  "Washington (MHMD)": ["washington", "us-wa", "washington-mhmd"],
  "EU (GDPR)": ["eu", "gdpr", "edpb", "gdpr-article-9"],
  "UK (UK GDPR)": ["uk", "ico", "uk-gdpr"],
  "GDPR": ["eu", "gdpr", "edpb"],
  "Other US State": ["us-states", "us-ca", "us-co", "us-ct", "biometric-data"],
};

const JURISDICTION_SLUG_MAP: Record<string, string[]> = {
  "GDPR": ["eu", "gdpr", "edpb", "european-union", "eea"],
  "UK GDPR": ["uk", "united-kingdom", "ico", "uk-gdpr"],
  "US - Various States": ["us-states", "us-ca", "us-ny", "us-tx", "us-il", "us-co", "us-va", "us-wa"],
  "US - HIPAA": ["us-federal", "hipaa", "hhs"],
  "CCPA / CPRA": ["california", "us-ca", "ccpa", "cpra"],
  "California": ["california", "us-ca", "ccpa", "cpra", "cppa"],
  "Illinois (BIPA)": ["us-il", "illinois", "bipa"],
  "Texas (CUBI)": ["us-tx", "texas"],
  "Washington (MHMD)": ["us-wa", "washington"],
  "EU (GDPR)": ["eu", "gdpr", "edpb", "european-union"],
  "Switzerland": ["switzerland", "fadp", "ch"],
  "Australia": ["australia", "oaic", "au"],
  "Canada": ["canada", "pipeda", "ca"],
  "Brazil": ["brazil", "lgpd", "br"],
  "Japan": ["japan", "appi", "jp"],
  "India": ["india", "dpdpa", "in"],
};

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
      .from("biometric_assessments")
      .select("id, created_at, jurisdictions, intake_data, client_id")
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

    const tagSet = new Set<string>(BIOMETRIC_TAGS);
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
      .in("attention_level", ["High", "Medium"])
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
      const affected: string[] = u.affected_jurisdictions ?? [];
      for (const j of jurisdictions) {
        const mapped = JURISDICTION_TAG_MAP[j] ?? [String(j).toLowerCase()];
        if (direct.some((d) => mapped.includes(d)) || affected.some((d) => mapped.includes(d))) {
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
    console.error("get-biometric-regulatory-updates error:", err);
    return jsonError(err instanceof Error ? err.message : "Internal error", 500);
  }
});
