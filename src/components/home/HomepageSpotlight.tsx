import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Sparkles, Eye, Mail, Star } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/dates";
import { categoryClass, categoryLabel, CATEGORY_BADGE_CLASS } from "@/config/categories";
import { normalizeTitle } from "@/lib/utils";
import ArticleThumb from "@/components/feed/ArticleThumb";

interface SpotlightArticle {
  id: string;
  title: string;
  source_name: string | null;
  source_url: string | null;
  published_at: string | null;
  jurisdiction: string[] | null;
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

const TIER_ICON_CLS = "inline w-[1em] h-[1em] align-[-0.125em] mr-1";
const SLOT_LABELS = [
  { icon: <Eye aria-hidden="true" strokeWidth={1.75} className={TIER_ICON_CLS} />, text: "What any visitor sees", className: "text-brand-steel" },
  { icon: <Mail aria-hidden="true" strokeWidth={1.75} className={TIER_ICON_CLS} />, text: "Free account — see this level on every article", className: "text-brand-teal-text font-medium" },
  { icon: <Star aria-hidden="true" strokeWidth={1.75} className={TIER_ICON_CLS} />, text: "Platform subscriber view — everything you need to act", className: "text-brand-teal-text font-semibold" },
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

  const jur = Array.isArray(article.jurisdiction) ? (article.jurisdiction[0] ?? "") : (article.jurisdiction ?? "");
  const cat = article.category ?? "";
  const briefParams = new URLSearchParams();
  if (jur) briefParams.set("pre_jurisdiction", jur);
  if (cat) briefParams.set("pre_topic", cat);
  const briefHref = briefParams.toString() ? `/#brief?${briefParams}` : "/#brief";
  const briefLabel = jur
    ? `Build a sample ${jur} Privacy Intelligence Report →`
    : "Build a sample Privacy Intelligence Report →";

  return (
    <div className="flex gap-4 items-start">
      <ArticleThumb
        item={article}
        className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-slate-100"
      />

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          {article.source_name && (
            <span className="text-meta font-semibold text-slate uppercase tracking-wide">
              {article.source_name}
            </span>
          )}
          {article.published_at && (
            <span className="text-meta text-brand-mist">
              {fmtDate(article.published_at)}
            </span>
          )}
          {article.category && (
            <span className={`${CATEGORY_BADGE_CLASS} ${categoryClass(article.category)}`}>
              {categoryLabel(article.category)}
            </span>
          )}
          {/* attention_level intentionally not surfaced to end users */}
        </div>

        {article.source_url ? (
          <a
            href={article.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-brand-navy hover:text-brand-teal-text leading-snug block mb-2 no-underline transition-colors"
          >
            {normalizeTitle(article.title)}
            <ExternalLink className="w-3 h-3 inline ml-1 opacity-40" />
          </a>
        ) : (
          <p className="text-[11px] font-bold text-brand-navy leading-snug mb-2">
            {normalizeTitle(article.title)}
          </p>
        )}

        {tier === "anonymous" && (() => {
          const s = article.why_it_matters_short ?? article.ai_summary?.why_it_matters ?? null;
          if (!s) return null;
          const firstSentence = s.split(/(?<=[.!?])\s/)[0] ?? s;
          return (
            <div>
              <p className="text-sm text-slate leading-relaxed mb-2">{firstSentence}</p>
              <Link
                to={briefHref}
                className="inline-flex items-center gap-1.5 text-meta font-semibold text-brand-teal-text hover:underline no-underline"
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
              <p className="text-sm text-slate leading-relaxed mb-2">{why}</p>
              <div className="rounded-lg bg-brand-cloud border border-brand-cloud px-3 py-2">
                <p className="text-meta text-slate/70 italic">
                  Platform subscribers see what to do about this and what to watch for next.{" "}
                  <Link to="/subscribe" className="text-brand-teal-text font-semibold no-underline hover:underline">
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
              {why && <p className="text-sm text-slate leading-relaxed">{why}</p>}
              {impact && <p className="text-sm text-slate leading-relaxed">{impact}</p>}
              {(actionProse || watchProse) && (
                <p className="text-sm text-slate leading-relaxed">
                  {actionProse}
                  {actionProse && watchProse && " "}
                  {watchProse && <span className="italic">{watchProse}</span>}
                </p>
              )}
              <p className="text-meta text-slate/50 italic mt-1">
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
  <div className="rounded-2xl bg-brand-navy px-6 py-8 text-center mt-6">
    <p className="text-eyebrow text-brand-teal-text mb-2">
      Privacy Intelligence Feed
    </p>
    <h2 className="text-section-h2 text-white mb-2">
      Today's full feed — {count > 0 ? `${count} developments` : "all developments"}, every one enriched
    </h2>
    <p className="text-sm text-blue-100/80 mb-5 max-w-xl mx-auto">
      Every regulatory update, enforcement action, and guidance document —
      with analysis calibrated to your programme and jurisdiction.
    </p>
    <Link
      to="/updates"
      className="inline-block bg-brand-teal-deep text-white font-semibold text-[15px] px-7 py-3 rounded-xl no-underline hover:opacity-90 transition-all"
    >
      Open the full Privacy Intelligence Feed →
    </Link>
  </div>
);

export default function HomepageSpotlight() {
  const [article, setArticle] = useState<SpotlightArticle | null>(null);
  const [feedCount, setFeedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];

    const fetchSpotlight = async () => {
      // Only show articles that have been FULLY enriched. We require all four
      // enrichment outputs (ai_summary, why_it_matters_short, action_items,
      // related_signals) so every tier (anonymous / free / paid) has real
      // content to render. Partially-enriched articles are skipped.
      const isFullyEnriched = (a: any) =>
        a &&
        a.ai_summary &&
        typeof a.ai_summary === "object" &&
        (a.ai_summary.why_it_matters || a.ai_summary.compliance_impact) &&
        a.why_it_matters_short &&
        Array.isArray(a.action_items) &&
        a.action_items.length > 0 &&
        Array.isArray(a.related_signals) &&
        a.related_signals.length > 0;

      const fetchEnriched = async (id: string) => {
        const { data } = await supabase
          .from("updates")
          .select(
            `id, title, source_name, source_url:url, published_at,
             jurisdiction:direct_jurisdictions,
             category, attention_level, image_url, why_it_matters_short,
             ai_summary, action_items, related_signals`
          )
          .eq("id", id)
          .maybeSingle();
        return data;
      };

      // Try today's curated spotlight first; only accept if fully enriched.
      const { data: spotlight } = await supabase
        .from("homepage_spotlight")
        .select("slot, update_id")
        .eq("spotlight_date", today)
        .order("slot");

      let chosen: any = null;
      if (spotlight && spotlight.length > 0) {
        const ordered = [...spotlight].sort((a, b) => a.slot - b.slot);
        for (const row of ordered) {
          const candidate = await fetchEnriched(row.update_id);
          if (isFullyEnriched(candidate)) {
            chosen = candidate;
            break;
          }
        }
      }

      // Fallback: scan recent enriched articles and take the first that
      // passes the full-enrichment check.
      if (!chosen) {
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: fallback } = await supabase
          .from("updates")
          .select(
            `id, title, source_name, source_url:url, published_at,
             jurisdiction:direct_jurisdictions,
             category, attention_level, image_url, why_it_matters_short,
             ai_summary, action_items, related_signals`
          )
          .gte("created_at", cutoff)
          .eq("is_hidden", false)
          .not("ai_summary", "is", null)
          .not("why_it_matters_short", "is", null)
          .not("action_items", "is", null)
          .not("related_signals", "is", null)
          .order("published_at", { ascending: false })
          .limit(100);

        if (fallback && fallback.length > 0) {
          const severityOrder: Record<string, number> = { "WATCH CLOSELY": 0, "MONITOR": 1 };
          const sorted = [...fallback].sort(
            (a, b) =>
              (severityOrder[a.attention_level ?? ""] ?? 2) -
              (severityOrder[b.attention_level ?? ""] ?? 2)
          );
          chosen = sorted.find(isFullyEnriched) ?? null;
        }
      }

      if (!chosen) {
        setLoading(false);
        return;
      }

      setArticle(chosen as unknown as SpotlightArticle);

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

  if (!article) {
    return (
      <section className="max-w-[1280px] mx-auto px-4 md:px-8 py-10">
        <div className="rounded-2xl border border-dashed border-brand-cloud bg-slate-50/60 px-6 py-12 text-center">
          <Sparkles className="w-8 h-8 mx-auto text-slate/40 mb-3" aria-hidden />
          <h2 className="font-display text-brand-navy mb-2">
            No new developments yet today
          </h2>
          <p className="text-sm text-slate max-w-md mx-auto mb-5 leading-relaxed">
            Our monitoring tracks privacy regulations across U.S. Federal, EU & UK,
            and global jurisdictions. New analysis appears here as soon as it's
            published.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link
              to="/updates"
              className="text-xs px-4 py-2 rounded-lg bg-brand-navy text-white font-medium hover:bg-brand-navy/90 transition-colors no-underline"
            >
              Browse the full feed →
            </Link>
            <Link
              to="/#brief"
              className="text-xs px-4 py-2 rounded-lg border border-brand-cloud text-brand-navy font-medium hover:bg-white transition-colors no-underline"
            >
              Build an Privacy Intelligence Report
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-8 py-10">
      <div className="mb-6">
        <p className="text-eyebrow text-brand-steel mb-1">
          Today's top regulatory development
        </p>
        <h2 className="text-section-h2 text-brand-navy">
          What you see — and what you're missing
        </h2>
        <p className="text-sm text-slate mt-1">
          The same story, shown at each level of intelligence.
        </p>
      </div>

      <div className="space-y-0">
        {tiers.map((tier, i) => {
          const label = SLOT_LABELS[i];
          return (
            <div key={tier} className="py-5 border-b border-brand-cloud last:border-0">
              <div className={`text-meta uppercase tracking-wider mb-3 ${label.className}`}>
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
