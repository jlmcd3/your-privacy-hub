// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map US state codes to jurisdiction / topic tags used by the `updates` table.
const STATE_TAGS: Record<string, { state_name: string; tags: string[] }> = {
  CA: { state_name: "California", tags: ["california", "ccpa", "cpra", "cppa", "us-ca"] },
  CO: { state_name: "Colorado", tags: ["colorado", "cpa", "gpc", "us-co"] },
  CT: { state_name: "Connecticut", tags: ["connecticut", "ctdpa", "us-ct"] },
  VA: { state_name: "Virginia", tags: ["virginia", "vcdpa", "us-va"] },
  UT: { state_name: "Utah", tags: ["utah", "ucpa", "us-ut"] },
  TX: { state_name: "Texas", tags: ["texas", "tdpsa", "us-tx"] },
  OR: { state_name: "Oregon", tags: ["oregon", "ocpa", "us-or"] },
  MT: { state_name: "Montana", tags: ["montana", "mcdpa", "us-mt"] },
  IA: { state_name: "Iowa", tags: ["iowa", "icdpa", "us-ia"] },
  TN: { state_name: "Tennessee", tags: ["tennessee", "tipa", "us-tn"] },
  IN: { state_name: "Indiana", tags: ["indiana", "incdpa", "us-in"] },
  DE: { state_name: "Delaware", tags: ["delaware", "dpdpa", "us-de"] },
  NH: { state_name: "New Hampshire", tags: ["new-hampshire", "nhpa", "us-nh"] },
  NJ: { state_name: "New Jersey", tags: ["new-jersey", "njdpa", "us-nj"] },
  KY: { state_name: "Kentucky", tags: ["kentucky", "kcdpa", "us-ky"] },
  MN: { state_name: "Minnesota", tags: ["minnesota", "mcdpa", "us-mn"] },
  RI: { state_name: "Rhode Island", tags: ["rhode-island", "ridtpa", "us-ri"] },
  NE: { state_name: "Nebraska", tags: ["nebraska", "ndpa", "us-ne"] },
  MD: { state_name: "Maryland", tags: ["maryland", "modpa", "us-md"] },
  FL: { state_name: "Florida", tags: ["florida", "fdbr", "us-fl"] },
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

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);

    // Resolve state codes + since date — accept either request shape.
    let stateCodes: string[] = [];
    let since: string | null = body.since ?? body.last_generated_date ?? null;

    if (Array.isArray(body.state_codes) && body.state_codes.length > 0) {
      stateCodes = body.state_codes.map((c: string) => String(c).toUpperCase());
    } else if (body.session_id) {
      const { data: sel, error: selErr } = await supabase
        .from("us_notice_state_selections")
        .select("state_code, us_notice_sessions!inner(client_id, completed_at)")
        .eq("session_id", body.session_id);
      if (selErr) return json({ error: selErr.message }, 400);
      stateCodes = (sel ?? []).map((r: any) => r.state_code.toUpperCase());
      if (!since && sel && sel[0]) {
        since = (sel[0] as any).us_notice_sessions?.completed_at ?? null;
      }
    }

    if (stateCodes.length === 0) {
      return json({ changes: [], updates: [] });
    }
    if (!since) {
      // Default to 12 months ago if we have no anchor date
      since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    }

    // Build the union of all jurisdiction tags for the requested states.
    const allTags = Array.from(
      new Set(
        stateCodes.flatMap((c) => STATE_TAGS[c]?.tags ?? [c.toLowerCase()]),
      ),
    );

    // Pull recent, high/medium attention items overlapping any of the tags.
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

    // Group articles by state.
    const byState = new Map<string, { state_name: string; items: ArticleRow[] }>();
    for (const code of stateCodes) {
      const meta = STATE_TAGS[code];
      if (meta) byState.set(code, { state_name: meta.state_name, items: [] });
    }
    for (const row of (rows ?? []) as ArticleRow[]) {
      const rowTags = new Set(
        [
          ...(row.topic_tags ?? []),
          ...(row.direct_jurisdictions ?? []),
          ...(row.affected_jurisdictions ?? []),
        ].map((t) => t.toLowerCase()),
      );
      for (const code of stateCodes) {
        const tags = STATE_TAGS[code]?.tags ?? [code.toLowerCase()];
        if (tags.some((t) => rowTags.has(t))) {
          byState.get(code)?.items.push(row);
        }
      }
    }

    // Two response shapes (UI uses `changes`, spec describes `updates`):
    const changes: any[] = [];
    const updates: any[] = [];
    for (const [code, bucket] of byState) {
      if (bucket.items.length === 0) continue;
      const top = bucket.items[0];
      const actionRequired =
        Array.isArray(top.action_items) && top.action_items[0]
          ? typeof top.action_items[0] === "string"
            ? top.action_items[0]
            : (top.action_items[0]?.action ?? null)
          : null;

      changes.push({
        state_code: code,
        state_name: bucket.state_name,
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
          state_code: code,
          state_name: bucket.state_name,
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
