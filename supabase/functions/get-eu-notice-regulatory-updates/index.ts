// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map each EU/global framework code to jurisdiction / topic tags used by `updates`.
const FRAMEWORK_TAGS: Record<string, { framework_name: string; tags: string[] }> = {
  EU_GDPR: { framework_name: "EU/EEA (GDPR)", tags: ["eu", "eea", "gdpr", "edpb", "european-union"] },
  UK_GDPR: { framework_name: "United Kingdom (UK GDPR)", tags: ["uk", "united-kingdom", "ico", "uk-gdpr", "dpa-2018"] },
  CH_FADP: { framework_name: "Switzerland (FADP)", tags: ["switzerland", "fadp", "fdpic", "ch"] },
  BR_LGPD: { framework_name: "Brazil (LGPD)", tags: ["brazil", "lgpd", "anpd", "br"] },
  JP_APPI: { framework_name: "Japan (APPI)", tags: ["japan", "appi", "ppc", "jp"] },
  IN_DPDPA: { framework_name: "India (DPDPA)", tags: ["india", "dpdpa", "in"] },
  ZA_POPIA: { framework_name: "South Africa (POPIA)", tags: ["south-africa", "popia", "za"] },
  CA_PIPEDA: { framework_name: "Canada (PIPEDA)", tags: ["canada", "pipeda", "opc", "ca"] },
  AU_PRIVACY: { framework_name: "Australia (Privacy Act)", tags: ["australia", "privacy-act", "oaic", "au"] },
  KR_PIPA: { framework_name: "South Korea (PIPA)", tags: ["south-korea", "korea", "pipa", "kr"] },
  TH_PDPA: { framework_name: "Thailand (PDPA)", tags: ["thailand", "pdpa-th", "th"] },
  CN_PIPL: { framework_name: "China (PIPL)", tags: ["china", "pipl", "cac", "cn"] },
};

interface ArticleRow {
  id: string;
  title: string;
  summary: string | null;
  why_it_matters_short: string | null;
  action_items: any;
  attention_level: string | null;
  topic_tags: string[] | null;
  direct_jurisdictions: string[] | null;
  affected_jurisdictions: string[] | null;
  published_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);

    let frameworkCodes: string[] = [];
    let since: string | null = body.since ?? body.last_generated_date ?? null;

    if (Array.isArray(body.framework_codes) && body.framework_codes.length > 0) {
      frameworkCodes = body.framework_codes.map((c: string) => String(c).toUpperCase());
    } else if (body.session_id) {
      const { data: sel, error: selErr } = await supabase
        .from("eu_notice_framework_selections")
        .select("framework_code, eu_notice_sessions!inner(client_id, completed_at)")
        .eq("session_id", body.session_id);
      if (selErr) return json({ error: selErr.message }, 400);
      frameworkCodes = (sel ?? []).map((r: any) => String(r.framework_code).toUpperCase());
      if (!since && sel && sel[0]) {
        since = (sel[0] as any).eu_notice_sessions?.completed_at ?? null;
      }
    }

    if (frameworkCodes.length === 0) {
      return json({ changes: [], updates: [] });
    }
    if (!since) {
      since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    }

    const allTags = Array.from(
      new Set(
        frameworkCodes.flatMap((c) => FRAMEWORK_TAGS[c]?.tags ?? [c.toLowerCase()]),
      ),
    );

    const { data: rows, error } = await supabase
      .from("updates")
      .select(
        "id, title, summary, why_it_matters_short, action_items, attention_level, topic_tags, direct_jurisdictions, affected_jurisdictions, published_at",
      )
      .gte("published_at", since)
      .in("attention_level", ["high", "medium"])
      .eq("is_hidden", false)
      .or(
        `topic_tags.ov.{${allTags.join(",")}},direct_jurisdictions.ov.{${allTags.join(",")}}`,
      )
      .order("published_at", { ascending: false })
      .limit(200);

    if (error) return json({ error: error.message }, 500);

    const byFramework = new Map<string, { framework_name: string; items: ArticleRow[] }>();
    for (const code of frameworkCodes) {
      const meta = FRAMEWORK_TAGS[code];
      if (meta) byFramework.set(code, { framework_name: meta.framework_name, items: [] });
    }
    for (const row of (rows ?? []) as ArticleRow[]) {
      const rowTags = new Set(
        [
          ...(row.topic_tags ?? []),
          ...(row.direct_jurisdictions ?? []),
          ...(row.affected_jurisdictions ?? []),
        ].map((t) => t.toLowerCase()),
      );
      for (const code of frameworkCodes) {
        const tags = FRAMEWORK_TAGS[code]?.tags ?? [code.toLowerCase()];
        if (tags.some((t) => rowTags.has(t))) {
          byFramework.get(code)?.items.push(row);
        }
      }
    }

    const changes: any[] = [];
    const updates: any[] = [];
    for (const [code, bucket] of byFramework) {
      if (bucket.items.length === 0) continue;
      const top = bucket.items[0];
      const actionRequired =
        Array.isArray(top.action_items) && top.action_items[0]
          ? typeof top.action_items[0] === "string"
            ? top.action_items[0]
            : (top.action_items[0]?.action ?? null)
          : null;

      changes.push({
        framework_code: code,
        framework_name: bucket.framework_name,
        count: bucket.items.length,
        summary:
          top.why_it_matters_short ||
          top.summary ||
          `${bucket.items.length} regulatory development${bucket.items.length === 1 ? "" : "s"} since the last notice.`,
      });

      for (const item of bucket.items) {
        updates.push({
          article_id: item.id,
          title: item.title,
          summary: item.why_it_matters_short || item.summary || "",
          framework_code: code,
          framework_name: bucket.framework_name,
          urgency: item.attention_level ?? "medium",
          action_required: actionRequired,
          source_date: item.published_at,
        });
      }
    }

    return json({ changes, updates });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
