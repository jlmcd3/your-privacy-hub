import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/dates";
import { normalizeTitle } from "@/lib/utils";
import { IntelligencePanel } from "@/components/IntelligencePanel";
import type { ArticleItem } from "@/components/ArticleCard";
import eupTile from "@/assets/eup-intelligence-tile.jpg";

const SLOT_LABELS = [
  { icon: "👁", text: "What any visitor sees", className: "text-slate/50 text-[10px]" },
  { icon: "✉", text: "Free account view", className: "text-blue text-[10px] font-medium" },
  { icon: "⭐", text: "Platform view", className: "text-gold text-[10px] font-semibold" },
];

const HomepageArticleCard = ({
  article,
  isSelected,
  onSelect,
  tierLabel,
}: {
  article: ArticleItem;
  isSelected: boolean;
  onSelect: () => void;
  tierLabel?: typeof SLOT_LABELS[0];
}) => (
  <div
    className={`py-3.5 border-b border-fog last:border-0 cursor-pointer rounded-lg transition-colors
      ${isSelected
        ? "bg-blue-50/60 border-l-[3px] border-gold px-2 -mx-2"
        : "hover:bg-fog/30 px-2 -mx-2"
      }`}
    onClick={(e) => {
      if ((e.target as HTMLElement).closest("a")) return;
      onSelect();
    }}
  >
    {tierLabel && (
      <div className={`mb-1.5 ${tierLabel.className}`}>
        {tierLabel.icon} {tierLabel.text}
      </div>
    )}

    <div className="flex gap-3 items-start">
      <img
        src={article.image_url || eupTile}
        alt=""
        loading="lazy"
        className="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-slate-100"
        onError={(e) => { (e.target as HTMLImageElement).src = eupTile; }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1 mb-1">
          {article.source_name && (
            <span className="text-[10px] font-semibold text-slate uppercase tracking-wide">
              {article.source_name}
            </span>
          )}
          {article.published_at && (
            <span className="text-[10px] text-slate-light">
              {fmtDate(article.published_at)}
            </span>
          )}
          {article.attention_level === "WATCH CLOSELY" && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
              Watch Closely
            </span>
          )}
        </div>
        {article.source_url ? (
          <a
            href={article.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-semibold text-navy hover:text-blue leading-snug block no-underline transition-colors"
          >
            {normalizeTitle(article.title)}
            <ExternalLink className="w-2.5 h-2.5 inline ml-1 opacity-30" />
          </a>
        ) : (
          <p className="text-[13px] font-semibold text-navy leading-snug">
            {normalizeTitle(article.title)}
          </p>
        )}
        {(() => {
          const s = article.why_it_matters_short ?? article.ai_summary?.why_it_matters_short;
          return s ? (
            <p className="text-[11px] text-slate/70 mt-1 line-clamp-2 leading-snug">{s}</p>
          ) : null;
        })()}
      </div>
    </div>
  </div>
);

interface HomepageFeedPanelProps {
  isPremium: boolean;
  isAuthenticated: boolean;
}

export function HomepageFeedPanel({ isPremium, isAuthenticated }: HomepageFeedPanelProps) {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<ArticleItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const fetchArticles = async () => {
      const { data: spotlight } = await supabase
        .from("homepage_spotlight")
        .select("slot, update_id")
        .eq("spotlight_date", today)
        .order("slot");

      let ids: string[] = [];

      if (spotlight && spotlight.length === 3) {
        ids = spotlight.sort((a, b) => a.slot - b.slot).map((s) => s.update_id);
      } else {
        const { data: fallback } = await supabase
          .from("updates")
          .select("id, attention_level")
          .gte("created_at", cutoff)
          .eq("is_hidden", false)
          .order("published_at", { ascending: false })
          .limit(50);

        if (fallback && fallback.length > 0) {
          const order: Record<string, number> = { "WATCH CLOSELY": 0, "MONITOR": 1 };
          const sorted = [...fallback].sort(
            (a, b) => (order[a.attention_level ?? ""] ?? 2) - (order[b.attention_level ?? ""] ?? 2)
          );
          ids = sorted.slice(0, 5).map((a) => a.id);
        }
      }

      if (!ids.length) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("updates")
        .select(
          `id, title, source_name, source_url, published_at, jurisdiction,
           category, attention_level, image_url, why_it_matters_short,
           ai_summary, action_items, related_signals`
        )
        .in("id", ids);

      if (data) {
        const ordered = ids
          .map((id) => data.find((a: any) => a.id === id))
          .filter(Boolean) as unknown as ArticleItem[];
        setArticles(ordered);
        if (isAuthenticated && ordered.length > 0) {
          setSelectedArticle(ordered[0]);
        }
      }

      setLoading(false);
    };

    fetchArticles();
  }, [isAuthenticated]);

  const showTierLabels = !isAuthenticated && articles.length >= 3;

  if (loading) {
    return (
      <section className="max-w-[1280px] mx-auto px-4 md:px-8 py-10">
        <div className="flex gap-6">
          <div className="flex-1 space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse flex gap-3 py-3 border-b border-fog">
                <div className="w-10 h-10 rounded-md bg-slate-100 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 bg-slate-100 rounded w-24" />
                  <div className="h-3.5 bg-slate-100 rounded w-3/4" />
                  <div className="h-2.5 bg-slate-100 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
          <div className="w-[280px] xl:w-[340px] flex-shrink-0 hidden md:block">
            <div className="animate-pulse h-64 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </section>
    );
  }

  if (!articles.length) return null;

  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-8 py-10">
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate/60 mb-1">
          Today's regulatory developments
        </p>
        <h2 className="font-display text-[22px] font-bold text-navy">
          {isAuthenticated
            ? "Today's intelligence"
            : "What you see — and what you're missing"}
        </h2>
        {!isAuthenticated && (
          <p className="text-[13px] text-slate mt-1">
            Three levels of intelligence. Register free for the second. Subscribe for the third.
          </p>
        )}
      </div>

      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0">
          {articles.map((article, i) => (
            <HomepageArticleCard
              key={article.id}
              article={article}
              isSelected={selectedArticle?.id === article.id}
              onSelect={() => setSelectedArticle(article)}
              tierLabel={showTierLabels ? SLOT_LABELS[i] : undefined}
            />
          ))}

          <div className="mt-5 pt-4 border-t border-fog">
            <Link
              to="/updates"
              className="inline-flex items-center gap-2 bg-gold text-white font-semibold text-[13px] px-5 py-2.5 rounded-xl no-underline hover:opacity-90 transition-all"
            >
              Open the full Privacy Intelligence Feed →
            </Link>
          </div>
        </div>

        <div className="w-[300px] xl:w-[340px] flex-shrink-0 hidden lg:block sticky top-20 self-start">
          <IntelligencePanel
            selectedArticle={selectedArticle}
            isPremium={isPremium}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
    </section>
  );
}

export default HomepageFeedPanel;
