import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const RSS_SOURCES = [
  // ── EU & UK ────────────────────────────────────────────────────────
  {
    url: "https://www.edpb.europa.eu/feed/news_en",
    source: "EDPB",
    domain: "edpb.europa.eu",
    defaultCategory: "eu-uk",
    regulator: "European Data Protection Board",
  },
  {
    url: "https://www.huntonprivacyblog.com/feed/",
    source: "Hunton Privacy Blog",
    domain: "hunton.com",
    defaultCategory: "us-federal",
    regulator: "Hunton Andrews Kurth",
  },
  {
    url: "https://www.cnil.fr/en/rss.xml",
    source: "CNIL",
    domain: "cnil.fr",
    defaultCategory: "eu-uk",
    regulator: "Commission Nationale de l'Informatique et des Libertés",
  },
  // ── U.S. Federal ──────────────────────────────────────────────────
  {
    url: "https://www.ftc.gov/feeds/press-release.xml",
    source: "FTC",
    domain: "ftc.gov",
    defaultCategory: "us-federal",
    regulator: "Federal Trade Commission",
  },
  {
    url: "https://www.nist.gov/blogs/cybersecurity-insights/rss.xml",
    source: "NIST",
    domain: "nist.gov",
    defaultCategory: "us-federal",
    regulator: "NIST",
  },
  {
    url: "https://www.insideprivacy.com/feed/",
    source: "Inside Privacy",
    domain: "insideprivacy.com",
    defaultCategory: "global",
    regulator: "Covington & Burling",
  },
  {
    url: "https://fpf.org/feed/",
    source: "FPF",
    domain: "fpf.org",
    defaultCategory: "global",
    regulator: "Future of Privacy Forum",
  },
];

const FALLBACK_IMAGES: Record<string, string> = {
  "us-federal": "https://picsum.photos/seed/federal-law/400/200",
  "us-states": "https://picsum.photos/seed/state-capitol/400/200",
  "eu-uk": "https://picsum.photos/seed/european-union/400/200",
  "global": "https://picsum.photos/seed/global-privacy/400/200",
  "enforcement": "https://picsum.photos/seed/legal-court/400/200",
  "ai-privacy": "https://picsum.photos/seed/artificial-intelligence/400/200",
};

function extractTag(xml: string, tag: string): string {
  const patterns = [
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i"),
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = xml.match(pattern);
    if (match) return match[1].trim();
  }
  return "";
}

function extractAllItems(xml: string): string[] {
  const results: string[] = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  const entryRegex = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) results.push(match[1]);
  while ((match = entryRegex.exec(xml)) !== null) results.push(match[1]);
  return results;
}

function categorize(title: string, description: string, defaultCat: string): string {
  const text = (title + " " + description).toLowerCase();
  if (/\b(fine|penalty|enforcement action|sued|lawsuit|violation|sanction|prosecut)\b/.test(text)) return "enforcement";
  if (/\b(ai\b|artificial intelligence|machine learning|biometric|facial recognition|deepfake|llm|generative)\b/.test(text)) return "ai-privacy";
  if (/\b(california|texas|virginia|colorado|connecticut|utah|state privacy|cppa|ccpa|cpra|tdpsa|vcdpa)\b/.test(text)) return "us-states";
  if (/\b(ftc|congress|federal privacy|hipaa|coppa|senate|house bill|federal trade)\b/.test(text)) return "us-federal";
  if (/\b(gdpr|edpb|ico|cnil|dpc|european|eu data|uk gdpr|britain|dpa\b)\b/.test(text)) return "eu-uk";
  return defaultCat;
}

async function extractOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "Mozilla/5.0 EndUserPrivacy-Bot/1.0" },
    });
    const html = await res.text();
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
}

function extractLink(itemXml: string): string {
  const linkTag = itemXml.match(/<link[^>]*>([^<]+)<\/link>/i);
  if (linkTag) return linkTag[1].trim();
  const linkHref = itemXml.match(/<link[^>]+href=["']([^"']+)["']/i);
  if (linkHref) return linkHref[1].trim();
  const guid = itemXml.match(/<guid[^>]*>([^<]+)<\/guid>/i);
  if (guid && guid[1].startsWith("http")) return guid[1].trim();
  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const results = { inserted: 0, skipped: 0, errors: [] as string[] };

  for (const source of RSS_SOURCES) {
    try {
      const res = await fetch(source.url, {
        signal: AbortSignal.timeout(12000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; EndUserPrivacy/1.0)" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      const items = extractAllItems(xml).slice(0, 10);

      for (const item of items) {
        const title = stripHtml(extractTag(item, "title"));
        const link = extractLink(item);
        const description = stripHtml(extractTag(item, "description") || extractTag(item, "summary") || extractTag(item, "content"));
        const pubDate = extractTag(item, "pubDate") || extractTag(item, "published") || extractTag(item, "dc:date");

        if (!title || !link || !link.startsWith("http")) continue;

        const category = categorize(title, description, source.defaultCategory);
        const imageUrl = await extractOgImage(link) || FALLBACK_IMAGES[category];

        const row = {
          title: title.slice(0, 400),
          summary: description.slice(0, 500) || null,
          url: link,
          source_name: source.source,
          source_domain: source.domain,
          image_url: imageUrl,
          category,
          regulator: source.regulator,
          published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          is_premium: false,
        };

        const { error } = await supabase
          .from("updates")
          .upsert(row, { onConflict: "url", ignoreDuplicates: true });

        if (error) results.skipped++;
        else results.inserted++;
      }
    } catch (e: any) {
      results.errors.push(`${source.source}: ${e.message}`);
    }
  }

  const newsApiKey = Deno.env.get("NEWSAPI_KEY");
  if (newsApiKey) {
    const queries = [
      "data privacy regulation enforcement",
      "GDPR privacy fine",
      "privacy law compliance",
    ];
    for (const q of queries) {
      try {
        const res = await fetch(
          `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${newsApiKey}`,
          { signal: AbortSignal.timeout(10000) }
        );
        const json = await res.json();
        for (const article of json.articles || []) {
          if (!article.title || !article.url || article.title === "[Removed]") continue;
          const domain = new URL(article.url).hostname.replace("www.", "");
          const category = categorize(article.title, article.description || "", "global");
          const row = {
            title: article.title.slice(0, 400),
            summary: (article.description || "").slice(0, 500) || null,
            url: article.url,
            source_name: article.source?.name || domain,
            source_domain: domain,
            image_url: article.urlToImage || FALLBACK_IMAGES[category],
            category,
            regulator: article.source?.name || "",
            published_at: article.publishedAt || new Date().toISOString(),
            is_premium: false,
          };
          const { error } = await supabase
            .from("updates")
            .upsert(row, { onConflict: "url", ignoreDuplicates: true });
          if (!error) results.inserted++;
          else results.skipped++;
        }
      } catch (e: any) {
        results.errors.push(`NewsAPI [${q}]: ${e.message}`);
      }
    }
  }

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});
