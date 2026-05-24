// Shared helpers for tool regulatory-update edge functions.
// Self-contained so each function can import without cross-tree issues.

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export interface RegulatoryUpdate {
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

export function mapAttentionToUrgency(level: string | null): "high" | "medium" | null {
  if (!level) return null;
  const v = String(level).toLowerCase();
  if (["urgent", "critical", "high"].includes(v)) return "high";
  if (["important", "medium", "moderate"].includes(v)) return "medium";
  return null;
}

export function buildActionRequired(u: any): string {
  const first = Array.isArray(u.action_items) ? u.action_items[0] : null;
  const fromAction =
    typeof first === "string"
      ? first
      : first?.action ?? first?.title ?? null;
  return (
    fromAction ??
    u.why_it_matters_short ??
    "Review whether this development affects this document."
  );
}

export function overlaps(a: string[] | null | undefined, b: Set<string>): string[] {
  return (a ?? []).filter((x) => b.has(x));
}

export async function authenticate(req: Request): Promise<
  | { ok: true; userId: string; admin: SupabaseClient }
  | { ok: false; response: Response }
> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, response: jsonError("Missing authorization", 401) };
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return { ok: false, response: jsonError("Invalid auth", 401) };
  }
  const admin = createClient(supabaseUrl, serviceKey);
  return { ok: true, userId: userData.user.id, admin };
}

export async function parseDocumentId(req: Request): Promise<
  { ok: true; documentId: string } | { ok: false; response: Response }
> {
  const body = await req.json().catch(() => ({}));
  const documentId = body?.document_id as string | undefined;
  if (!documentId || !/^[0-9a-f-]{36}$/i.test(documentId)) {
    return { ok: false, response: jsonError("Invalid document_id", 400) };
  }
  return { ok: true, documentId };
}

export async function verifyClientOwnership(
  admin: SupabaseClient,
  clientId: string,
  userId: string,
): Promise<Response | null> {
  const { data: clientRow } = await admin
    .from("clients")
    .select("owner_id")
    .eq("id", clientId)
    .maybeSingle();
  if (!clientRow || clientRow.owner_id !== userId) {
    return jsonError("Forbidden", 403);
  }
  return null;
}

export async function fetchCandidateUpdates(
  admin: SupabaseClient,
  documentCreatedAt: string,
): Promise<{ data: any[] | null; error: any }> {
  return await admin
    .from("updates")
    .select(
      "id, title, url, summary, why_it_matters_short, action_items, " +
        "attention_level, topic_tags, direct_jurisdictions, " +
        "affected_jurisdictions, published_at",
    )
    .gte("published_at", documentCreatedAt)
    .in("attention_level", ["high", "medium"])
    .eq("is_hidden", false)
    .order("published_at", { ascending: false })
    .limit(200);
}

export async function fetchNotedArticleIds(
  admin: SupabaseClient,
  userId: string,
  toolType: string,
  documentId: string,
): Promise<Set<string>> {
  const { data: noted } = await admin
    .from("tool_regulatory_update_acknowledgements")
    .select("article_id")
    .eq("user_id", userId)
    .eq("tool_type", toolType)
    .eq("document_id", documentId);
  return new Set((noted ?? []).map((n: any) => n.article_id));
}

export function sortAndLimit(
  results: RegulatoryUpdate[],
  limit = 20,
): { sliced: RegulatoryUpdate[]; total: number } {
  const sorted = [...results].sort((a, b) => {
    if (a.urgency !== b.urgency) return a.urgency === "high" ? -1 : 1;
    return (b.source_date ?? "").localeCompare(a.source_date ?? "");
  });
  return { sliced: sorted.slice(0, limit), total: sorted.length };
}

export function filterByTagOrJurisdiction(
  rows: any[],
  tags: Set<string>,
  jurisdictionTokens: Set<string>,
): any[] {
  return rows.filter((u) => {
    const topicTags: string[] = u.topic_tags ?? [];
    const direct: string[] = u.direct_jurisdictions ?? [];
    const affected: string[] = u.affected_jurisdictions ?? [];
    if (topicTags.some((t) => tags.has(t))) return true;
    if (direct.some((j) => jurisdictionTokens.has(j) || tags.has(j))) return true;
    if (affected.some((j) => jurisdictionTokens.has(j) || tags.has(j))) return true;
    return false;
  });
}

export function buildRegulatoryUpdate(
  u: any,
  jurisdictionName: string,
  domain?: string,
): RegulatoryUpdate {
  return {
    article_id: u.id,
    title: u.title,
    summary: u.why_it_matters_short ?? u.summary ?? "",
    url: u.url,
    jurisdiction_name: jurisdictionName,
    urgency: mapAttentionToUrgency(u.attention_level) ?? "medium",
    action_required: buildActionRequired(u),
    source_date: u.published_at,
    ...(domain ? { domain } : {}),
  };
}

export function inferJurisdictionName(
  u: any,
  fallback: string,
  jurisdictions: string[],
): string {
  const direct: string[] = u.direct_jurisdictions ?? [];
  for (const j of jurisdictions) {
    if (direct.includes(j)) return j;
  }
  if (direct.length > 0) return direct[0];
  const affected: string[] = u.affected_jurisdictions ?? [];
  if (affected.length > 0) return affected[0];
  return fallback;
}
