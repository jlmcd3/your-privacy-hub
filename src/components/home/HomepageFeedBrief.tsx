import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getSeverityLabel } from "@/lib/severity";
import BriefBuilder from "@/components/subscribe/BriefBuilder";
import eupTile from "@/assets/eup-intelligence-tile.jpg";

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
  topic_tags?: string[];
  entities?: any;
}

function SeverityBadge({ aiSummary }: { aiSummary: any }) {
  const s = getSeverityLabel(aiSummary);
  if (!s) return null;
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${s.className}`}>
      {s.tone === "red" ? "⚡ " : ""}{s.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    "eu-uk":      { label: "EU & UK",      cls: "bg-blue-50 text-blue-800 border border-blue-200" },
    "us-federal": { label: "U.S. Federal", cls: "bg-amber-50 text-amber-800 border border-amber-200" },
    "us-states":  { label: "U.S. States",  cls: "bg-amber-50 text-amber-800 border border-amber-200" },
    "enforcement":{ label: "Enforcement",  cls: "bg-red-50 text-red-700 border border-red-200" },
    "ai-privacy": { label: "AI & Privacy", cls: "bg-purple-50 text-purple-800 border border-purple-200" },
    "global":     { label: "Global",       cls: "bg-slate-100 text-slate-700 border border-slate-200" },
    "adtech":     { label: "AdTech",       cls: "bg-purple-50 text-purple-800 border border-purple-200" },
  };
  const def = map[category] ?? { label: category, cls: "bg-slate-100 text-slate-700 border border-slate-200" };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${def.cls}`}>
      {def.label}
    </span>
  );
}

function accentColor(aiSummary: any): string {
  const s = getSeverityLabel(aiSummary);
  if (!s) return "border-l-border";
  if (s.tone === "red")   return "border-l-red-500";
  if (s.tone === "amber") return "border-l-amber-500";
  return "border-l-blue-500";
}

function ArticleCard({ article }: { article: FeedArticle }) {
  const accent = accentColor(article.ai_summary);
  const thumb  = article.image_url || eupTile;

  const chips: string[] = [];
  if (article.entities?.regulators?.length) chips.push(...article.entities.regulators.slice(0, 2));
  if (article.entities?.laws?.length)       chips.push(...article.entities.laws.slice(0, 2));
  if (!chips.length && article.source_name) chips.push(article.source_name);

  const verdict = article.why_it_matters_short || article.ai_summary?.why_it_matters_short;
  const date = new Date(article.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex gap-4 bg-card border border-fog border-l-4 ${accent} rounded-lg p-4 hover:shadow-eup-sm transition-shadow no-underline group`}
    >
      <img
        src={thumb}
        alt=""
        className="w-24 h-24 object-cover rounded flex-shrink-0 hidden sm:block"
        onError={(e) => { (e.target as HTMLImageElement).src = eupTile; }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <CategoryBadge category={article.category} />
          <SeverityBadge aiSummary={article.ai_summary} />
          {article.source_name && (
            <span className="text-[11px] text-slate truncate">{article.source_name}</span>
          )}
          <span className="text-[11px] text-slate">· {date}</span>
        </div>
        <h3 className="font-display font-bold text-navy text-[15px] leading-snug mb-1 group-hover:text-[#2563EB]">
          {article.title}
        </h3>
        {verdict && (
          <p className="text-[13px] text-slate leading-relaxed line-clamp-2 mb-2">
            {verdict}
          </p>
        )}
        {chips.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {chips.slice(0, 4).map((c, i) => (
              <span key={i} className="text-[10px] text-slate bg-muted/60 px-1.5 py-0.5 rounded">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}

export default function HomepageFeedBrief() {
  const [articles, setArticles] = useState<FeedArticle[]>([]);
  const [loading, setLoading]   = useState(true);
  const [briefGenerated, setBriefGenerated] = useState(false);
  const briefOutputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("updates")
        .select("id,title,url,source_name,image_url,published_at,category,why_it_matters_short,ai_summary,topic_tags,entities")
        .not("ai_summary", "is", null)
        .order("published_at", { ascending: false })
        .limit(5);
      setArticles((data ?? []) as any);
      setLoading(false);
    })();
  }, []);

  const handleBriefGenerated = () => {
    setBriefGenerated(true);
    setTimeout(() => {
      briefOutputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  return (
    <section className="py-12 px-4">
      <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-[58%_42%] gap-8">
        {/* LEFT — Feed */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-[22px] font-bold text-navy">
              Privacy Intelligence Feed
            </h2>
            <Link to="/updates" className="text-[13px] font-semibold text-[#2563EB] no-underline hover:underline">
              See all this week →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-28 bg-muted/40 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : articles.length === 0 ? (
            <p className="text-sm text-slate">Loading intelligence feed…</p>
          ) : (
            <div className="space-y-3">
              {articles.map(a => <ArticleCard key={a.id} article={a} />)}
            </div>
          )}
        </div>

        {/* RIGHT — Brief builder */}
        <div className="bg-card border border-fog rounded-2xl shadow-eup-sm p-5 md:p-6 self-start">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB] mb-2">
            Privacy Intelligence Report
          </p>
          <h2 className="font-display text-[22px] font-bold text-navy leading-snug mb-1">
            Your briefing, built for your practice.
          </h2>
          <p className="text-[12px] text-slate mb-4">
            Delivered every Monday · From $29/month
          </p>
          <BriefBuilder onBriefGenerated={handleBriefGenerated} />
        </div>
      </div>

      {briefGenerated && (
        <div ref={briefOutputRef} className="max-w-[1280px] mx-auto mt-10 rounded-2xl bg-gradient-to-br from-navy to-[#1A3A5C] text-white p-8 text-center">
          <p className="font-display text-[20px] font-bold mb-2">
            Your sample brief is ready above ↑
          </p>
          <p className="text-[14px] text-blue-100/80">
            Scroll up to read it, or{" "}
            <Link to="/subscribe" className="underline font-semibold text-white">
              subscribe to receive it every Monday →
            </Link>
          </p>
        </div>
      )}
    </section>
  );
}
