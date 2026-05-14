import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/dates";
import { categoryClass, categoryLabel, CATEGORY_BADGE_CLASS } from "@/config/categories";
import { normalizeTitle } from "@/lib/utils";
import eupTile from "@/assets/eup-intelligence-tile.jpg";

interface SpotlightArticle {
  id: string;
  title: string;
  source_name: string | null;
  source_url: string | null;
  published_at: string | null;
  jurisdiction: string | null;
  category: string | null;
  attention_level: string | null;
  image_url: string | null;
  why_it_matters_short: string | null;
  ai_summary: {
    why_it_matters?: string | null;
    compliance_impact?: string | null;
  } | null;
  action_items: Array<{ role?: string; action?: string; timeframe?: string }> | null;
  related_signals: Array<{ label?: string }> | null;
}

const SLOT_LABELS = [
  { icon: "👁", text: "What any visitor sees", className: "text-slate/60" },
  { icon: "✉", text: "Free account — see this level on every article", className: "text-blue font-medium" },
  { icon: "⭐", text: "Platform subscriber view — everything you need to act", className: "text-gold font-semibold" },
];

const SpotlightCard = ({
  article,
  tier,
}: {
  article: SpotlightArticle;
  tier: "anonymous" | "free" | "paid";
}) => {
  const actionProse = (() => {
    const items = article.action_items ?? [];
    if (items.length === 0) return null;
    const s = items.slice(0, 2).map(a => a.action).filter(Boolean).join(". ");
    return s ? s + "." : null;
  })();

  const watchProse = (() => {
    const signals = article.related_signals ?? [];
    if (signals.length === 0) return null;
    const labels = signals.map(s => s.label).filter(Boolean).join("; ");
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

  return (
    <div className="flex gap-4 items-start">
      <img
        src={article.image_url || eupTile}
        alt=""
        loading="lazy"
        className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-slate-100"
        onError={e => {
          (e.target as HTMLImageElement).src = eupTile;
        }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          {article.source_name && (
            <span className="text-[11px] font-semibold text-slate uppercase tracking-wide">
              {article.source_name}
            </span>
          )}
          {article.published_at && (
            <span className="text-[11px] text-slate-light">
              {fmtDate(article.published_at)}
            </span>
          )}
          {article.category && (
            <span className={`${CATEGORY_BADGE_CLASS} ${categoryClass(article.category)}`}>
              {categoryLabel(article.category)}
            </span>
          )}
          {article.attention_level === "WATCH CLOSELY" && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200">
              Watch Closely
            </span>
          )}
        </div>

        {article.source_url ? (
          <a
            href={article.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[14px] font-bold text-navy hover:text-blue leading-snug block mb-2 no-underline transition-colors"
          >
            {normalizeTitle(article.title)}
            <ExternalLink className="w-3 h-3 inline ml-1 opacity-40" />
          </a>
        ) : (
          <p className="text-[14px] font-bold text-navy leading-snug mb-2">
            {normalizeTitle(article.title)}
          </p>
        )}

        {tier === "anonymous" && (() => {
          const s = article.why_it_matters_short ?? article.ai_summary?.why_it_matters ?? null;
          if (!s) return null;
          const firstSentence = s.split(/(?<=[.!?])\s/)[0] ?? s;
          return (
            <div>
              <p className="text-[13px] text-slate leading-relaxed mb-2">{firstSentence}</p>
              <Link
                to={briefHref}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-gold hover:underline no-underline"
              >
                <Sparkles className="w-3 h-3" />
                {briefLabel}
              </Link>
            </div>
          );
        })()}

        {tier === "free" && (() => {
          const why = article.ai_summary?.why_it_matters ?? article.why_it_matters_short ?? null;
          if (!why) return null;
          return (
            <div>
              <p className="text-[13px] text-slate leading-relaxed mb-2">{why}</p>
              <div className="rounded-lg bg-paper border border-fog px-3 py-2">
                <p className="text-[12px] text-slate/70 italic">
                  Platform subscribers see what to do about this and what to watch for next.{" "}
                  <Link to="/subscribe" className="text-gold font-semibold no-underline hover:underline">
                    See Platform →
                  </Link>
                </p>
              </div>
            </div>
          );
        })()}

        {tier === "paid" && (() => {
          const why = article.ai_summary?.why_it_matters ?? article.why_it_matters_short ?? null;
          const impact = article.ai_summary?.compliance_impact ?? null;
          return (
            <div className="space-y-2">
              {why && <p className="text-[13px] text-slate leading-relaxed">{why}</p>}
              {impact && <p className="text-[13px] text-slate leading-relaxed">{impact}</p>}
              {(actionProse || watchProse) && (
                <p className="text-[13px] text-slate leading-relaxed">
                  {actionProse}
                  {actionProse && watchProse && " "}
                  {watchProse && <span className="italic">{watchProse}</span>}
                </p>
              )}
              <p className="text-[11px] text-slate/50 italic mt-1">
                This is what Platform subscribers see on every development, every day.
              </p>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

const FeedCtaBanner = ({ count }: { count: number }) => (
  <div className="rounded-2xl bg-navy px-6 py-8 text-center mt-6">
    <p className="text-[11px] font-bold uppercase tracking-widest text-gold mb-2">
      Privacy Intelligence Feed
    </p>
    <h2 className="font-display text-[22px] md:text-[26px] font-bold text-white mb-2">
      Today's full feed — {count > 0 ? `${count} developments` : "all developments"}, every one enriched
    </h2>
    <p className="text-[14px] text-blue-100/80 mb-5 max-w-xl mx-auto">
      Every regulatory update, enforcement action, and guidance document —
      with analysis calibrated to your programme and jurisdiction.
    </p>
    <Link
      to="/updates"
      className="inline-block bg-gold text-white font-semibold text-[15px] px-7 py-3 rounded-xl no-underline hover:opacity-90 transition-all"
    >
      Open the full Privacy Intelligence Feed →
    </Link>
  </div>
);

export default function HomepageSpotlight() {
  const [articles, setArticles] = useState<(SpotlightArticle | null)[]>([null, null, null]);
  const [feedCount, setFeedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];

    const fetchSpotlight = async () => {
      const { data: spotlight } = await supabase
        .from("homepage_spotlight")
        .select("slot, update_id")
        .eq("spotlight_date", today)
        .order("slot");

      let updateIds: string[] = [];
      if (spotlight && spotlight.length === 3) {
        const sorted = [...spotlight].sort((a, b) => a.slot - b.slot);
        updateIds = sorted.map(s => s.update_id);
      } else {
        const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        const { data: fallback } = await supabase
          .from("updates")
          .select("id, attention_level")
          .gte("created_at", cutoff)
          .eq("is_hidden", false)
          .not("ai_summary", "is", null)
          .order("published_at", { ascending: false })
          .limit(50);

        if (fallback && fallback.length > 0) {
          const severityOrder: Record<string, number> = { "WATCH CLOSELY": 0, "MONITOR": 1 };
          const sorted = [...fallback].sort(
            (a, b) =>
              (severityOrder[a.attention_level ?? ""] ?? 2) -
              (severityOrder[b.attention_level ?? ""] ?? 2)
          );
          updateIds = sorted.slice(0, 3).map(a => a.id);
        }
      }

      if (updateIds.length < 3) {
        setLoading(false);
        return;
      }

      const { data: updateData } = await supabase
        .from("updates")
        .select(
          `id, title, source_name, source_url, published_at, jurisdiction,
           category, attention_level, image_url, why_it_matters_short,
           ai_summary, action_items, related_signals`
        )
        .in("id", updateIds);

      if (updateData) {
        const ordered = updateIds
          .map(id => updateData.find(a => a.id === id) ?? null)
          .filter(Boolean) as SpotlightArticle[];
        setArticles([ordered[0] ?? null, ordered[1] ?? null, ordered[2] ?? null]);
      }

      const { count } = await supabase
        .from("updates")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .eq("is_hidden", false);

      setFeedCount(count ?? 0);
      setLoading(false);
    };

    fetchSpotlight();
  }, []);

  const tiers: ("anonymous" | "free" | "paid")[] = ["anonymous", "free", "paid"];

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-10">
        <div className="space-y-6">
          {[0, 1, 2].map(i => (
            <div key={i} className="animate-pulse flex gap-4">
              <div className="w-14 h-14 rounded-lg bg-slate-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-100 rounded w-32" />
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-8 py-10">
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate/60 mb-1">
          Today's regulatory developments
        </p>
        <h2 className="font-display text-[22px] font-bold text-navy">
          What you see — and what you're missing
        </h2>
        <p className="text-[13px] text-slate mt-1">
          Three of today's top developments, shown at each level of intelligence.
        </p>
      </div>

      <div className="space-y-0">
        {articles.map((article, i) => {
          if (!article) return null;
          const label = SLOT_LABELS[i];
          const tier = tiers[i];

          return (
            <div key={article.id} className="py-5 border-b border-fog last:border-0">
              <div className={`text-[10px] uppercase tracking-wider mb-3 ${label.className}`}>
                {label.icon} {label.text}
              </div>
              <SpotlightCard article={article} tier={tier} />
            </div>
          );
        })}
      </div>

      <FeedCtaBanner count={feedCount} />
    </section>
  );
}
