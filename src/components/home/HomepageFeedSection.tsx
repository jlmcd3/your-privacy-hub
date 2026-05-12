import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSeverityLabel } from "@/lib/severity";
import eupTile from "@/assets/eup-intelligence-tile.jpg";
import SectionShell from "./SectionShell";
import HomepageBriefPanel from "./HomepageBriefPanel";

interface FeedArticle {
  id: string;
  title: string;
  url: string;
  source_name: string | null;
  image_url: string | null;
  published_at: string;
  category: string;
  why_it_matters_short?: string | null;
  ai_summary?: any;
  entities?: any;
}

function categoryBadge(cat: string) {
  const map: Record<string, string> = {
    "eu-uk":       "bg-blue-50 text-blue-800 border-blue-200",
    "us-federal":  "bg-amber-50 text-amber-800 border-amber-200",
    "us-states":   "bg-amber-50 text-amber-800 border-amber-200",
    "enforcement": "bg-red-50 text-red-700 border-red-200",
    "ai-privacy":  "bg-purple-50 text-purple-800 border-purple-200",
    "global":      "bg-slate-100 text-slate-700 border-slate-200",
    "adtech":      "bg-purple-50 text-purple-800 border-purple-200",
  };
  const labels: Record<string, string> = {
    "eu-uk": "EU & UK", "us-federal": "U.S. Federal", "us-states": "U.S. States",
    "enforcement": "Enforcement", "ai-privacy": "AI & Privacy",
    "global": "Global", "adtech": "AdTech",
  };
  const cls = map[cat] ?? "bg-slate-100 text-slate-600 border-slate-200";
  const label = labels[cat] ?? cat;
  return (
    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${cls}`}>
      {label}
    </span>
  );
}

function leftAccent(aiSummary: any) {
  const s = getSeverityLabel(aiSummary);
  if (!s) return "border-l-slate-200";
  if (s.tone === "red")   return "border-l-red-400";
  if (s.tone === "amber") return "border-l-amber-400";
  return "border-l-blue-400";
}

function ArticleCard({ article, index }: { article: FeedArticle; index: number }) {
  const isEven   = index % 2 === 1;
  const severity = getSeverityLabel(article.ai_summary);
  const accent   = leftAccent(article.ai_summary);
  const thumb    = article.image_url || eupTile;
  const verdict  = article.why_it_matters_short ?? article.ai_summary?.why_it_matters_short;

  const chips: string[] = [];
  if (article.entities?.regulators?.length) chips.push(...article.entities.regulators.slice(0, 2));
  if (article.entities?.laws?.length)       chips.push(...article.entities.laws.slice(0, 1));
  if (!chips.length && article.source_name) chips.push(article.source_name);

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`grid grid-cols-[52px_1fr] gap-2.5 px-4 py-3 border-l-[3px] ${accent} ${
        isEven ? "bg-slate-50" : "bg-white"
      } hover:bg-blue-50/30 transition-colors no-underline border-b border-slate-100 last:border-b-0`}
    >
      <img
        src={thumb}
        alt=""
        className="w-[52px] h-[48px] object-cover rounded mt-0.5 flex-shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).src = eupTile; }}
      />

      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          {article.source_name && (
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate">
              {article.source_name}
            </span>
          )}
          <span className="w-1 h-1 rounded-full bg-fog" />
          {categoryBadge(article.category)}
          {severity && (
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${severity.className}`}>
              {severity.tone === "red" ? "⚡ " : ""}{severity.label}
            </span>
          )}
        </div>

        <p className="font-display font-bold text-[11px] text-navy leading-snug mb-1 line-clamp-2">
          {article.title}
        </p>

        {verdict && (
          <p className="text-[9px] text-slate leading-relaxed mb-1 line-clamp-2">
            {verdict}
          </p>
        )}

        {chips.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {chips.slice(0, 3).map((c, i) => (
              <span key={i} className="text-[8px] px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}

export default function HomepageFeedSection() {
  const [articles, setArticles] = useState<FeedArticle[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    supabase
      .from("updates")
      .select("id,title,url,source_name,image_url,published_at,category,why_it_matters_short,ai_summary,entities")
      .not("ai_summary", "is", null)
      .order("published_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setArticles((data as any) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <SectionShell
      eyebrow="Privacy Intelligence Feed"
      headline="Stay current on every regulation that affects your organisation."
      subline="119 monitored authorities. Enriched with compliance intelligence. Updated every 4 hours."
      ctaLabel="See all this week →"
      ctaHref="/updates"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[58%_42%]">
        <div className="border-b lg:border-b-0 lg:border-r border-slate-100">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-14 bg-slate-100 animate-pulse rounded" />
              ))}
            </div>
          ) : (
            articles.map((a, i) => <ArticleCard key={a.id} article={a} index={i} />)
          )}
        </div>

        <HomepageBriefPanel />
      </div>
    </SectionShell>
  );
}
