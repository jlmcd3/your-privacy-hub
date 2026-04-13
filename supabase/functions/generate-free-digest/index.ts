import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const REGION_CATEGORIES: Record<string, string[]> = {
  "us-canada": ["us-federal", "us-states"],
  "eu-uk": ["eu-uk"],
  "apac": ["global"],
  "latam": ["global"],
  "mea": ["global"],
};

const REGION_KEYWORDS: Record<string, string[]> = {
  apac: ["Australia", "Japan", "China", "India", "Singapore", "South Korea", "New Zealand", "APAC", "PDPA", "PIPL", "APPI", "DPDP"],
  latam: ["Brazil", "ANPD", "Argentina", "Mexico", "Colombia", "LGPD"],
  mea: ["UAE", "Saudi", "Africa", "Kenya", "South Africa", "DIFC", "ADGM"],
};

const TOPIC_FILTERS: Record<string, { category?: string; keywords?: string[] }> = {
  enforcement: { category: "enforcement" },
  "ai-privacy": { category: "ai-privacy" },
  adtech: { category: "adtech" },
  children: { keywords: ["children", "COPPA", "minor", "age verification", "KOSA", "AADC"] },
  health: { keywords: ["HIPAA", "health data", "medical", "FTC health"] },
  breaches: { keywords: ["data breach", "breach notification", "incident"] },
  transfers: { keywords: ["data transfer", "SCC", "adequacy", "DPF", "cross-border"] },
  biometric: { keywords: ["biometric", "facial recognition", "BIPA", "fingerprint"] },
};

function regionLabel(category: string): string {
  const map: Record<string, string> = {
    "us-federal": "🇺🇸 US Federal",
    "us-states": "🇺🇸 US States",
    "eu-uk": "🇪🇺 EU & UK",
    global: "🌐 Global",
    enforcement: "⚖️ Enforcement",
    "ai-privacy": "🤖 AI & Privacy",
    adtech: "📱 AdTech",
  };
  return map[category] || "🌐 Global";
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth check
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const adminToken = Deno.env.get("ADMIN_SECRET_TOKEN");
  if (!adminToken || token !== adminToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Period
  const now = new Date();
  const periodEnd = now.toISOString().split("T")[0];
  const periodStart = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0];
  const weekLabel = `Week of ${periodStart} – ${periodEnd}`;

  // Fetch users with digest preferences
  const { data: users, error: usersErr } = await supabase
    .from("profiles")
    .select("id, digest_jurisdictions, digest_topics")
    .not("digest_jurisdictions", "is", null)
    .gt("digest_jurisdictions", "{}");

  if (usersErr || !users) {
    return new Response(JSON.stringify({ error: "Failed to fetch users", detail: usersErr }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let digestsGenerated = 0;

  for (const user of users) {
    const jurisdictions: string[] = user.digest_jurisdictions || [];
    const topics: string[] = user.digest_topics || [];
    if (jurisdictions.length === 0) continue;

    // Build category list from jurisdictions
    const categories = new Set<string>();
    const needsKeywordFilter: Record<string, string[]> = {};
    for (const j of jurisdictions) {
      const cats = REGION_CATEGORIES[j] || [];
      cats.forEach((c) => categories.add(c));
      if (REGION_KEYWORDS[j]) {
        needsKeywordFilter[j] = REGION_KEYWORDS[j];
      }
    }

    // Fetch articles from past 7 days in matching categories
    const { data: articles } = await supabase
      .from("updates")
      .select("id, title, summary, category, source_name, url, published_at, ai_summary")
      .in("category", Array.from(categories))
      .gte("published_at", periodStart)
      .order("published_at", { ascending: false })
      .limit(100);

    if (!articles || articles.length === 0) continue;

    // Filter: for global category, apply keyword matching for apac/latam/mea
    let filtered = articles.filter((a: any) => {
      if (a.category !== "global") return true;
      // Check if any region keyword matches
      for (const [, kws] of Object.entries(needsKeywordFilter)) {
        const titleLower = (a.title || "").toLowerCase();
        if (kws.some((kw) => titleLower.includes(kw.toLowerCase()))) return true;
      }
      // If user has a non-global region that includes global, and no keyword filter needed
      if (!Object.keys(needsKeywordFilter).length) return true;
      return false;
    });

    // Apply topic filter
    if (topics.length > 0) {
      filtered = filtered.filter((a: any) => {
        for (const t of topics) {
          const tf = TOPIC_FILTERS[t];
          if (!tf) continue;
          if (tf.category && a.category === tf.category) return true;
          if (tf.keywords) {
            const text = ((a.title || "") + " " + (a.summary || "")).toLowerCase();
            if (tf.keywords.some((kw) => text.includes(kw.toLowerCase()))) return true;
          }
        }
        return false;
      });
    }

    // Limit to 8
    const digestArticles = filtered.slice(0, 8);
    if (digestArticles.length < 3) continue;

    // Format digest items
    const digestItems = digestArticles.map((a: any) => ({
      title: a.title,
      summary: a.ai_summary?.why_it_matters || a.summary || "",
      category: a.category,
      region_label: regionLabel(a.category),
      source_name: a.source_name || "",
      url: a.url,
      published_at: a.published_at,
    }));

    // Pattern detection
    let patternObservation: string | null = null;
    const categoryGroups: Record<string, Set<string>> = {};
    for (const item of digestItems) {
      // Group by topic match
      for (const t of topics) {
        const tf = TOPIC_FILTERS[t];
        if (!tf) continue;
        const matches = tf.category === item.category ||
          (tf.keywords && tf.keywords.some((kw) =>
            ((item.title || "") + " " + (item.summary || "")).toLowerCase().includes(kw.toLowerCase())
          ));
        if (matches) {
          if (!categoryGroups[t]) categoryGroups[t] = new Set();
          categoryGroups[t].add(item.category);
        }
      }
    }

    // Check if any topic has articles from 2+ different categories
    for (const [topicKey, catSet] of Object.entries(categoryGroups)) {
      if (catSet.size >= 2) {
        const sources = digestItems
          .filter((item: any) => {
            const tf = TOPIC_FILTERS[topicKey];
            if (!tf) return false;
            return tf.category === item.category ||
              (tf.keywords && tf.keywords.some((kw) =>
                ((item.title || "") + " " + (item.summary || "")).toLowerCase().includes(kw.toLowerCase())
              ));
          })
          .map((item: any) => item.source_name)
          .filter(Boolean);

        const uniqueSources = [...new Set(sources)].slice(0, 4);
        const topicLabel = TOPICS_LABELS[topicKey] || topicKey;

        if (uniqueSources.length >= 2) {
          patternObservation = `${uniqueSources.join(", ")} each addressed ${topicLabel} this week across different jurisdictions.`;
        }
        break;
      }
    }

    // Upsert
    await supabase
      .from("free_digests")
      .upsert(
        {
          user_id: user.id,
          week_label: weekLabel,
          period_start: periodStart,
          period_end: periodEnd,
          digest_items: digestItems,
          pattern_observation: patternObservation,
          jurisdictions_used: jurisdictions,
          topics_used: topics,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,period_end" }
      );

    digestsGenerated++;
  }

  return new Response(
    JSON.stringify({ success: true, users_processed: users.length, digests_generated: digestsGenerated }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

const TOPICS_LABELS: Record<string, string> = {
  enforcement: "enforcement actions",
  "ai-privacy": "AI and privacy",
  adtech: "AdTech and consent",
  children: "children's privacy",
  health: "health and medical data",
  breaches: "data breaches",
  transfers: "cross-border data transfers",
  biometric: "biometric data",
};
