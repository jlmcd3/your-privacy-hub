import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/dates";
import { normalizeTitle, stripHtml } from "@/lib/utils";
import type { ArticleItem } from "@/components/ArticleCard";
import { InvestigationPrompt } from "@/components/InvestigationPrompt";
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
  { icon: "👁", text: "What any visitor sees", className: "text-slate/60 text-sm" },
  { icon: "✉", text: "Free account view", className: "text-blue text-sm font-medium" },
  { icon: "⭐", text: "Platform view", className: "text-gold text-sm font-semibold" },
];

const getToolCTA = (item: ArticleItem): { label: string; href: string } => {
  const cat = (item.category ?? '').toLowerCase();
  const jur = (item.jurisdiction ?? '').toLowerCase();
  if (cat.includes('biometric'))
    return { label: 'Check biometric compliance →', href: '/biometric-checker' };
  if (cat.includes('breach') || cat.includes('incident'))
    return { label: 'Build an IR Playbook →', href: '/ir-playbook' };
  if (cat.includes('ai') || cat.includes('artificial intelligence'))
    return { label: 'Run an LIA for this processing →', href: '/li-assessment' };
  if (cat.includes('cross-border') || cat.includes('transfer') || cat.includes('dpa'))
    return { label: 'Generate a Data Processing Agreement →', href: '/dpa-generator' };
  if (cat.includes('dpia') || cat.includes('impact assessment'))
    return { label: 'Run a DPIA →', href: '/dpia-framework' };
  if (jur.includes('california') || jur.includes('cppa'))
    return { label: 'Check your CPPA scope →', href: '/cppa-scope-checker' };
  return { label: 'Assess your governance posture →', href: '/governance-assessment' };
};

const HomepageArticleCard = ({
  article,
  isSelected,
  onSelect,
  tierLabel,
  evenRow,
  demoTier,
  isPremium,
}: {
  article: ArticleItem;
  isSelected: boolean;
  onSelect: () => void;
  tierLabel?: typeof SLOT_LABELS[0];
  evenRow?: boolean;
  /** undefined = authenticated user (no demo), 'anonymous'|'free'|'paid' = demo slot */
  demoTier?: "anonymous" | "free" | "paid";
  isPremium?: boolean;
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

  const renderEnrichment = () => {
    const excerpt = article.summary ? (
      <p className="text-body text-gray-500 mt-1.5 line-clamp-2">
        {stripHtml(article.summary)}
      </p>
    ) : null;

    const shortWhy = article.why_it_matters_short ?? article.ai_summary?.why_it_matters_short;
    const sentence = shortWhy ? (shortWhy.split(/(?<=[.!?])\s/)[0] ?? shortWhy) : null;
    const alertNode = sentence ? (
      <p className="text-body mt-2" style={{ color: '#92400E' }}>
        <span className="font-semibold text-warn">Alert: </span>{sentence}
      </p>
    ) : null;

    const why =
      article.ai_summary?.why_it_matters ??
      article.why_it_matters_short ??
      article.ai_summary?.why_it_matters_short;
    const contextNode = why ? (
      <p className="text-body text-steel mt-2">
        <span className="font-semibold">Context: </span>{why}
      </p>
    ) : null;

    if (demoTier === "anonymous") {
      return (
        <div>
          {excerpt}
          {alertNode}
          <div className="flex flex-col gap-1 mt-1">
            <Link to="/signup" className="text-meta font-semibold text-steel hover:underline no-underline">
              Register free to see Context →
            </Link>
            <Link to="/subscribe" className="text-meta font-semibold text-gold hover:underline no-underline">
              Subscribe to see Analysis and Guidance →
            </Link>
          </div>
        </div>
      );
    }

    if (demoTier === "free") {
      return (
        <div>
          {excerpt}
          {alertNode}
          {contextNode}
          <div className="mt-1.5">
            <Link to="/subscribe" className="text-meta font-semibold text-gold hover:underline no-underline">
              Subscribe to see Analysis and Guidance →
            </Link>
          </div>
        </div>
      );
    }

    if (demoTier === "paid") {
      const impact = article.ai_summary?.compliance_impact;
      const toolCTA = getToolCTA(article);
      return (
        <div className="space-y-1.5">
          {excerpt}
          {alertNode}
          {contextNode}
          {(impact || actionProse || watchProse) && (
            <p className="text-body mt-2" style={{ color: '#78350F' }}>
              <span className="font-semibold text-gold">Analysis and Guidance: </span>
              {impact}
              {impact && (actionProse || watchProse) && " "}
              {actionProse}
              {actionProse && watchProse && " "}
              {watchProse && <span className="italic">{watchProse}</span>}
            </p>
          )}
          <p className="text-eyebrow mt-4 mb-1" style={{ color: 'hsl(var(--cobalt))' }}>
            ⭐ Platform feature preview
          </p>
          <InvestigationPrompt item={article} />
          <div className="pt-1.5 border-t border-fog">
            <Link to={toolCTA.href} className="text-meta font-semibold text-gold hover:underline no-underline">
              {toolCTA.label}
            </Link>
          </div>
        </div>
      );
    }

    // Authenticated (non-demo)
    if (isPremium) {
      const impact = article.ai_summary?.compliance_impact;
      const toolCTA = getToolCTA(article);
      return (
        <div className="space-y-1.5">
          {excerpt}
          {alertNode}
          {contextNode}
          {(impact || actionProse || watchProse) && (
            <p className="text-body mt-2" style={{ color: '#78350F' }}>
              <span className="font-semibold text-gold">Analysis and Guidance: </span>
              {impact}
              {impact && (actionProse || watchProse) && " "}
              {actionProse}
              {actionProse && watchProse && " "}
              {watchProse && <span className="italic">{watchProse}</span>}
            </p>
          )}
          <InvestigationPrompt item={article} />
          <div className="pt-1.5 border-t border-fog">
            <Link to={toolCTA.href} className="text-meta font-semibold text-gold hover:underline no-underline">
              {toolCTA.label}
            </Link>
          </div>
        </div>
      );
    }

    // Authenticated free user — show excerpt + alert + context
    return (
      <div>
        {excerpt}
        {alertNode}
        {contextNode}
      </div>
    );
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
          {demoTier === "paid" && (
            <div className="text-meta text-gold/80 font-normal mt-0.5">
              + AI investigation prompt, pre-built for this article
            </div>
          )}
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
            <Link
              to="/updates"
              className="text-eyebrow font-semibold px-1.5 py-0.5 rounded bg-gold text-white hover:opacity-90 no-underline transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              Open feed →
            </Link>
            {article.source_name && (
              <span className="text-meta font-semibold text-slate uppercase tracking-wide">
                {article.source_name}
              </span>
            )}
            {article.published_at && (
              <span className="text-meta text-slate-light">
                {fmtDate(article.published_at)}
              </span>
            )}
            {article.attention_level === "WATCH CLOSELY" && (
              <span className="text-eyebrow px-1 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                Watch Closely
              </span>
            )}
          </div>
          {article.source_url ? (
            <a
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-card-title text-gray-900 hover:text-blue block no-underline transition-colors"
            >
              {normalizeTitle(article.title)}
              <ExternalLink className="w-2.5 h-2.5 inline ml-1 opacity-30" />
            </a>
          ) : (
            <p className="text-card-title text-gray-900">
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
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // An article is only eligible for the homepage demo if it carries
    // every enrichment field — otherwise the anonymous / free / paid
    // tiers would render with empty content.
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

    const ARTICLE_SELECT = `id, title, summary, source_name, url, published_at,
       direct_jurisdictions, affected_jurisdictions,
       category, attention_level, image_url, why_it_matters_short,
       ai_summary, action_items, related_signals`;

    const fetchArticles = async () => {
      // Anonymous demo: pick a SINGLE fully-enriched article and render
      // it three times at the three tier views. Same article, three
      // levels of intelligence.
      if (!isAuthenticated) {
        let chosen: any = null;

        // Prefer today's curated spotlight if any entry is fully enriched.
        const { data: spotlight } = await supabase
          .from("homepage_spotlight")
          .select("slot, update_id")
          .eq("spotlight_date", today)
          .order("slot");

        if (spotlight && spotlight.length > 0) {
          const ids = spotlight.sort((a, b) => a.slot - b.slot).map((s) => s.update_id);
          const { data } = await supabase.from("updates").select(ARTICLE_SELECT).in("id", ids);
          if (data) {
            for (const id of ids) {
              const cand = data.find((d: any) => d.id === id);
              if (isFullyEnriched(cand)) { chosen = cand; break; }
            }
          }
        }

        // Fallback: scan recent enriched articles for the first that passes.
        if (!chosen) {
          const { data: fallback } = await supabase
            .from("updates")
            .select(ARTICLE_SELECT)
            .gte("created_at", cutoff)
            .eq("is_hidden", false)
            .not("ai_summary", "is", null)
            .not("why_it_matters_short", "is", null)
            .not("action_items", "is", null)
            .not("related_signals", "is", null)
            .order("published_at", { ascending: false })
            .limit(100);
          if (fallback && fallback.length > 0) {
            const order: Record<string, number> = { "WATCH CLOSELY": 0, "MONITOR": 1 };
            const sorted = [...fallback].sort(
              (a, b) => (order[a.attention_level ?? ""] ?? 2) - (order[b.attention_level ?? ""] ?? 2)
            );
            chosen = sorted.find(isFullyEnriched) ?? null;
          }
        }

        if (chosen) {
          const item = toArticleItem({ ...chosen, source_url: (chosen as any).url } as UpdateArticleRow);
          setArticles([item]);
          setSelectedArticle(item);
        }
        setLoading(false);
        return;
      }

      // Authenticated: keep the existing 3-article feed view.
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
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
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
        .select(ARTICLE_SELECT)
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

  // Anonymous demo renders the same article three times (one per tier).
  const showTierLabels = !isAuthenticated && articles.length >= 1;


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
          <h2 className="font-display text-navy mb-2">
            No developments available yet
          </h2>
          <p className="text-sm text-slate max-w-md mx-auto mb-5 leading-relaxed">
            The homepage feed will refresh as soon as monitored privacy developments are available.
          </p>
          <Link
            to="/updates"
            className="inline-flex items-center gap-2 bg-gold text-white font-semibold text-sm px-5 py-2.5 rounded-xl no-underline hover:opacity-90 transition-all"
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
        <p className="text-eyebrow text-slate/60 mb-1">
          Today's regulatory developments
        </p>
        <h2 className="text-section-h2 text-navy">
          {isAuthenticated
            ? "Today's intelligence"
            : "What you see — and what you're missing"}
        </h2>
        {!isAuthenticated && (
          <p className="text-base text-slate mt-1">
            Three levels of intelligence. Register free for the second. Subscribe for the third.
          </p>
        )}
      </div>

      <div className="items-start">
        <div className="min-w-0">
          {(() => {
            const DEMO_TIERS: ("anonymous" | "free" | "paid")[] = ["anonymous", "free", "paid"];
            // For anonymous visitors, show the SAME fully-enriched article
            // three times — once per tier view. Authenticated users see the
            // normal multi-article feed.
            const rows = !isAuthenticated && articles.length > 0
              ? DEMO_TIERS.map((tier) => ({ article: articles[0], tier }))
              : articles.slice(0, 3).map((article) => ({ article, tier: undefined as undefined }));
            return rows.map(({ article, tier }, i) => (
              <HomepageArticleCard
                key={tier ? `${article.id}-${tier}` : article.id}
                article={article}
                isSelected={selectedArticle?.id === article.id}
                onSelect={() => setSelectedArticle(article)}
                tierLabel={showTierLabels ? SLOT_LABELS[i] : undefined}
                evenRow={i % 2 === 1}
                demoTier={tier}
                isPremium={isPremium}
              />
            ));
          })()}


          <div className="mt-5 pt-4 border-t border-fog">
            <Link
              to="/updates"
              className="inline-flex items-center gap-2 bg-gold text-white font-semibold text-sm px-5 py-2.5 rounded-xl no-underline hover:opacity-90 transition-all"
            >
              Open the full Privacy Intelligence Feed →
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}

export default HomepageFeedPanel;
