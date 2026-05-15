import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/dates";
import { normalizeTitle } from "@/lib/utils";
import { IntelligencePanel } from "@/components/IntelligencePanel";
import type { ArticleItem } from "@/components/ArticleCard";
import eupTile from "@/assets/eup-intelligence-tile.jpg";

type UpdateArticleRow = ArticleItem & {
  url?: string | null;
  direct_jurisdictions?: string[] | null;
  affected_jurisdictions?: string[] | null;
};

const toArticleItem = (row: UpdateArticleRow): ArticleItem => {
  const direct = Array.isArray(row.direct_jurisdictions) ? row.direct_jurisdictions : [];
  const affected = Array.isArray(row.affected_jurisdictions) ? row.affected_jurisdictions : [];

  return {
    ...row,
    source_url: row.source_url ?? row.url ?? null,
    jurisdiction: row.jurisdiction ?? direct[0] ?? affected[0] ?? null,
  };
};

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
  evenRow,
  demoTier,
}: {
  article: ArticleItem;
  isSelected: boolean;
  onSelect: () => void;
  tierLabel?: typeof SLOT_LABELS[0];
  evenRow?: boolean;
  /** undefined = authenticated user (no demo), 'anonymous'|'free'|'paid' = demo slot */
  demoTier?: "anonymous" | "free" | "paid";
}) => {
  const actionProse = (() => {
    const items = article.action_items ?? [];
    if (!items.length) return null;
    const s = items.slice(0, 2).map((a) => a.action).filter(Boolean).join(". ");
    return s ? s + "." : null;
  })();

  const watchProse = (() => {
    const signals = article.related_signals ?? [];
    if (!signals.length) return null;
    const labels = signals.map((s) => s.label).filter(Boolean).join("; ");
    return labels ? `Watch: ${labels}.` : null;
  })();

  const jur = article.jurisdiction ?? "";
  const cat = article.category ?? "";
  const briefParams = new URLSearchParams();
  if (jur) briefParams.set("pre_jurisdiction", jur);
  if (cat) briefParams.set("pre_topic", cat);
  const briefHref = briefParams.toString() ? `/#brief?${briefParams}` : "/#brief";
  const briefLabel = jur
    ? `Build a sample ${jur} Intelligence Brief →`
    : "Build a sample Intelligence Brief →";

  const renderEnrichment = () => {
    if (demoTier === "anonymous") {
      const s = article.why_it_matters_short ?? article.ai_summary?.why_it_matters_short;
      if (!s) return null;
      const firstSentence = s.split(/(?<=[.!?])\s/)[0] ?? s;
      return (
        <div className="mt-2">
          <p className="text-[12px] text-slate leading-relaxed">{firstSentence}</p>
          <Link
            to={briefHref}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-gold no-underline hover:underline"
          >
            <Sparkles className="w-3 h-3" />
            {briefLabel}
          </Link>
        </div>
      );
    }

    if (demoTier === "free") {
      const why =
        article.ai_summary?.why_it_matters ??
        article.why_it_matters_short ??
        article.ai_summary?.why_it_matters_short;
      if (!why) return null;
      return (
        <div className="mt-2">
          <p className="text-[12px] text-slate leading-relaxed">{why}</p>
          <div className="mt-2 rounded-md bg-paper border border-fog px-2.5 py-2">
            <p className="text-[11px] italic text-slate/70 leading-relaxed">
              Platform subscribers see what to do about this and what to watch
              for next.{" "}
              <Link
                to="/subscribe"
                className="text-gold font-semibold no-underline hover:underline not-italic"
              >
                See Platform →
              </Link>
            </p>
          </div>
        </div>
      );
    }

    if (demoTier === "paid") {
      const why = article.ai_summary?.why_it_matters ?? article.why_it_matters_short;
      const impact = article.ai_summary?.compliance_impact;
      return (
        <div className="mt-2 space-y-2">
          {why && <p className="text-[12px] text-slate leading-relaxed">{why}</p>}
          {impact && <p className="text-[12px] text-slate leading-relaxed">{impact}</p>}
          {(actionProse || watchProse) && (
            <p className="text-[12px] text-slate leading-relaxed">
              {actionProse}
              {actionProse && watchProse && " "}
              {watchProse && <span className="italic">{watchProse}</span>}
            </p>
          )}
          <p className="text-[11px] italic text-slate/60 pt-1">
            This is what Platform subscribers see on every development, every day.
          </p>
        </div>
      );
    }

    const s = article.why_it_matters_short ?? article.ai_summary?.why_it_matters_short;
    return s ? (
      <p className="text-[11px] text-slate/70 mt-1 line-clamp-2 leading-snug">{s}</p>
    ) : null;
  };

  return (
    <div
      className={`px-3 py-3.5 border-b border-fog last:border-0 cursor-pointer transition-colors
        ${isSelected
          ? "bg-blue-50/60 border-l-[3px] border-gold"
          : `${evenRow ? "bg-slate-50" : "bg-white"} hover:bg-fog/40`
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
          {renderEnrichment()}
        </div>
      </div>
    </div>
  );
};

interface HomepageFeedPanelProps {
  isPremium: boolean;
  isAuthenticated: boolean;
  embedded?: boolean;
}

export function HomepageFeedPanel({ isPremium, isAuthenticated, embedded = false }: HomepageFeedPanelProps) {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<ArticleItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

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
          ids = sorted.slice(0, 3).map((a) => a.id);
        }
      }

      if (!ids.length) {
        setLoading(false);
        return;
      }

      const { data, error: dataError } = await supabase
        .from("updates")
        .select(
          `id, title, summary, source_name, url, published_at,
           direct_jurisdictions, affected_jurisdictions,
           category, attention_level, image_url, why_it_matters_short,
           ai_summary, action_items, related_signals`
        )
        .in("id", ids);

      if (dataError) {
        console.error("HomepageFeedPanel article fetch error:", dataError);
        setLoading(false);
        return;
      }

      if (data) {
        const ordered = ids
          .map((id) => {
            const a = data.find((item: any) => item.id === id);
            if (!a) return null;
            return toArticleItem({ ...a, source_url: (a as any).url } as UpdateArticleRow);
          })
          .filter(Boolean) as ArticleItem[];
        setArticles(ordered);
        if (ordered.length > 0) {
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
      <section className={embedded ? "px-5 py-5" : "max-w-[1280px] mx-auto px-4 md:px-8 py-10"}>
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

  if (!articles.length) {
    return (
      <section className="max-w-[1280px] mx-auto px-4 md:px-8 py-10">
        <div className="rounded-xl border border-dashed border-fog bg-card px-6 py-10 text-center">
          <h2 className="font-display text-[20px] font-bold text-navy mb-2">
            No developments available yet
          </h2>
          <p className="text-[13px] text-slate max-w-md mx-auto mb-5 leading-relaxed">
            The homepage feed will refresh as soon as monitored privacy developments are available.
          </p>
          <Link
            to="/updates"
            className="inline-flex items-center gap-2 bg-gold text-white font-semibold text-[13px] px-5 py-2.5 rounded-xl no-underline hover:opacity-90 transition-all"
          >
            Open the full Privacy Intelligence Feed →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={embedded ? "px-5 py-5" : "max-w-[1280px] mx-auto px-4 md:px-8 py-10"}>
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

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.38fr)_minmax(280px,1fr)] gap-6 items-start">
        <div className="flex-1 min-w-0">
          {articles.map((article, i) => (
            <HomepageArticleCard
              key={article.id}
              article={article}
              isSelected={selectedArticle?.id === article.id}
              onSelect={() => setSelectedArticle(article)}
              tierLabel={showTierLabels ? SLOT_LABELS[i] : undefined}
              hideWhyItMatters={showTierLabels && i === 0}
              evenRow={i % 2 === 1}
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

        <div className="hidden md:block sticky top-20 self-start">
          <IntelligencePanel
            selectedArticle={selectedArticle}
            isPremium={isPremium}
            isAuthenticated={isAuthenticated}
            forceTier={
              showTierLabels && selectedArticle
                ? (() => {
                    const idx = articles.findIndex((a) => a.id === selectedArticle.id);
                    return idx === 2 ? "paid" : idx === 1 ? "free" : "anonymous";
                  })()
                : undefined
            }
          />
        </div>
      </div>
    </section>
  );
}

export default HomepageFeedPanel;
