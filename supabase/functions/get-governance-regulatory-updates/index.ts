// Surface regulatory updates relevant to a governance assessment.
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

const TOOL_TYPE = "governance_assessment";

const DOMAIN_TAG_MAP: Record<string, string[]> = {
  "Tool Inventory": ["shadow-it", "saas", "vendor-management"],
  "Data Submission Risk": ["data-minimisation", "gdpr-article-5", "sensitive-data"],
  "Vendor Data Terms": ["gdpr-article-28", "processor", "sub-processor", "controller-processor"],
  "Internal Policy": ["data-governance", "privacy-policy", "acceptable-use"],
  "Employee Training": ["privacy-training", "data-protection-officer"],
  "Incident Response": ["breach-notification", "gdpr-article-33", "incident-response"],
  "Regulatory Exposure": ["gdpr", "ccpa", "cppa", "enforcement"],
  "Privacy Impact Assessment": ["gdpr-article-35", "dpia", "pia", "high-risk-processing"],
  "Data Subject Rights": [
    "data-subject-rights",
    "gdpr-article-12",
    "right-to-erasure",
    "right-of-access",
  ],
  "Privacy Notice": ["privacy-notice", "gdpr-article-13", "gdpr-article-14", "transparency"],
};

const SECTOR_TAGS: Record<string, string[]> = {
  healthcare: ["hipaa", "health-data", "gdpr-article-9"],
  financial: ["glba", "financial-privacy", "cfpb"],
  technology: ["adtech", "cookie-consent", "ai-governance"],
  saas: ["adtech", "cookie-consent", "ai-governance"],
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
      .from("governance_assessments")
      .select("id, created_at, intake_data, report_data, client_id")
      .eq("id", document_id)
      .maybeSingle();
    if (!doc) return jsonError("Document not found", 404);

    const { data: clientRow } = await admin
      .from("clients")
      .select("owner_id")
      .eq("id", doc.client_id)
      .maybeSingle();
    if (!clientRow || clientRow.owner_id !== userId) return jsonError("Forbidden", 403);

    const intake = (doc.intake_data as any) ?? {};
    const jurisdictions: string[] = intake?.jurisdictions ?? [];
    const sector: string = (intake?.sector ?? "").toLowerCase();

    const tagSet = new Set<string>();
    for (const tags of Object.values(DOMAIN_TAG_MAP)) tags.forEach((t) => tagSet.add(t));
    for (const j of jurisdictions) tagSet.add(String(j).toLowerCase());
    for (const [key, tags] of Object.entries(SECTOR_TAGS)) {
      if (sector.includes(key)) tags.forEach((t) => tagSet.add(t));
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

      // Resolve domain by first matching domain whose tags intersect article tags.
      const articleTags: string[] = u.topic_tags ?? [];
      let domain = "General";
      for (const [domainName, tags] of Object.entries(DOMAIN_TAG_MAP)) {
        if (articleTags.some((t) => tags.includes(t))) {
          domain = domainName;
          break;
        }
      }

      let jurisdiction_name = jurisdictions[0] ?? "Multiple jurisdictions";
      const direct: string[] = u.direct_jurisdictions ?? [];
      for (const j of jurisdictions) {
        if (direct.includes(j) || direct.includes(String(j).toLowerCase())) {
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
        domain,
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
    console.error("get-governance-regulatory-updates error:", err);
    return jsonError(err instanceof Error ? err.message : "Internal error", 500);
  }
});
