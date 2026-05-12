import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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

function CategoryBadge({ cat }: { cat: string }) {
  const map: Record<string, [string, string]> = {
    "eu-uk":       ["EU & UK",      "bg-blue-50 text-blue-800 border-blue-200"],
    "us-federal":  ["U.S. Federal", "bg-amber-50 text-amber-800 border-amber-200"],
    "us-states":   ["U.S. States",  "bg-amber-50 text-amber-800 border-amber-200"],
    "enforcement": ["Enforcement",  "bg-red-50 text-red-700 border-red-200"],
    "ai-privacy":  ["AI & Privacy", "bg-purple-50 text-purple-800 border-purple-200"],
    "global":      ["Global",       "bg-slate-100 text-slate-700 border-slate-200"],
    "adtech":      ["AdTech",       "bg-purple-50 text-purple-800 border-purple-200"],
  };
  const [label, cls] = map[cat] ?? [cat, "bg-slate-100 text-slate-600 border-slate-200"];
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${cls}`}>
      {label}
    </span>
  );
}

function ArticleRow({ article, index }: { article: FeedArticle; index: number }) {
  const isAlt = index % 2 === 1;
  const sev = getSeverityLabel(article.ai_summary);
  const accent = sev
    ? sev.tone === "red"
      ? "border-l-red-400"
      : sev.tone === "amber"
        ? "border-l-amber-400"
        : "border-l-[hsl(var(--cobalt))]"
    : "border-l-transparent";
  const thumb = article.image_url || eupTile;
  const verdict = article.why_it_matters_short ?? article.ai_summary?.why_it_matters_short;
  const chips: string[] = [
    ...(article.entities?.regulators?.slice(0, 2) ?? []),
    ...(article.entities?.laws?.slice(0, 1) ?? []),
    ...(!article.entities?.regulators?.length && article.source_name ? [article.source_name] : []),
  ];

  return (
    <Link
      to={`/updates/${article.id}`}
      className={`flex gap-3 p-4 border-l-4 ${accent} ${isAlt ? "bg-slate-50" : "bg-white"} hover:bg-fog/40 transition-colors no-underline`}
    >
      <img
        src={thumb}
        alt=""
        className="w-20 h-20 object-cover rounded-md flex-shrink-0 bg-fog"
        onError={(e) => {
          (e.target as HTMLImageElement).src = eupTile;
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {article.source_name && (
            <span className="text-[11px] font-semibold text-slate">{article.source_name}</span>
          )}
          <span className="text-[11px] text-slate-light">·</span>
          <CategoryBadge cat={article.category} />
          {sev && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${sev.className}`}>
              {sev.tone === "red" ? "⚡ " : ""}{sev.label}
            </span>
          )}
        </div>
        <h3 className="text-[15px] font-semibold text-navy leading-snug mb-1 line-clamp-2">
          {article.title}
        </h3>
        {verdict && (
          <p className="text-[13px] text-slate leading-snug line-clamp-2 mb-1">{verdict}</p>
        )}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {chips.slice(0, 3).map((c, i) => (
              <span key={i} className="text-[10px] text-slate bg-fog/60 px-1.5 py-0.5 rounded">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function HomepageFeedSection() {
  const [articles, setArticles] = useState<FeedArticle[]>([]);
  const [loading, setLoading] = useState(true);

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
      eyebrow="Live regulatory intelligence"
      headline="Today's privacy developments"
      subline="Live from 119 monitored authorities, enriched with compliance analysis."
      ctaLabel="See full feed →"
      ctaHref="/updates"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[58%_42%] gap-6">
        <div className="border border-fog rounded-2xl overflow-hidden bg-white">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 border-b border-fog last:border-0 animate-pulse bg-slate-50" />
              ))
            : articles.map((a, i) => <ArticleRow key={a.id} article={a} index={i} />)}
        </div>
        <HomepageBriefPanel />
      </div>
    </SectionShell>
  );
}
