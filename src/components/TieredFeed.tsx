import { Link } from "react-router-dom";
import { ArticleCard, type ArticleItem } from "@/components/ArticleCard";
import { useAuth } from "@/hooks/useAuth";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

interface TieredFeedProps {
  articles: ArticleItem[];
  /** When true, anonymous users get load-more pagination on the newsfeed section.
   *  When false (homepage), anonymous users see a fixed slice. */
  paginated?: boolean;
  /** For homepage: max newsfeed cards shown to anonymous users before "See all →" */
  newsfeedCap?: number;
  /** Number of preview (full-enrichment) cards for anonymous users */
  previewCount?: number;
  seeAllHref?: string;
  showSeeAll?: boolean;
  /** Passed through from parent for paginated mode */
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

export function TieredFeed({
  articles,
  paginated = false,
  newsfeedCap = 12,
  previewCount = 3,
  seeAllHref = "/updates",
  showSeeAll = true,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
}: TieredFeedProps) {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();

  // Select preview articles: highest-urgency first, then most recent
  const highUrgency = articles.filter(a =>
    a.ai_summary?.urgency === 'immediate' ||
    a.ai_summary?.urgency === 'Immediate' ||
    (a as any).attention_level === 'High'
  );
  const usedIds = new Set(highUrgency.slice(0, previewCount).map(a => a.id));
  const padArticles = articles.filter(a => !usedIds.has(a.id));
  const previews = highUrgency.length >= previewCount
    ? highUrgency.slice(0, previewCount)
    : [...highUrgency, ...padArticles].slice(0, previewCount);
  const previewIds = new Set(previews.map(a => a.id));
  const newsfeedArticles = articles.filter(a => !previewIds.has(a.id));

  // ── INTELLIGENCE SUBSCRIBER ──────────────────────────────────────────────
  if (user && isPremium) {
    return (
      <div>
        {articles.map(a => (
          <ArticleCard key={a.id} item={a} variant="full" isPremium={true} />
        ))}
        {paginated && hasMore && onLoadMore && (
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="mt-4 w-full text-[12px] px-4 py-2.5 rounded-lg border border-fog text-slate hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {isLoadingMore ? "Loading…" : "Load more updates"}
          </button>
        )}
        {showSeeAll && !paginated && (
          <div className="text-right mt-3">
            <Link to={seeAllHref} className="text-[12px] text-sky-700 hover:underline">See all updates →</Link>
          </div>
        )}
      </div>
    );
  }

  // ── FREE REGISTERED USER ─────────────────────────────────────────────────
  if (user && !isPremium) {
    return (
      <div>
        {articles.map(a => (
          <ArticleCard key={a.id} item={a} variant="full" isPremium={false} />
        ))}
        {paginated && hasMore && onLoadMore && (
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="mt-4 w-full text-[12px] px-4 py-2.5 rounded-lg border border-fog text-slate hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {isLoadingMore ? "Loading…" : "Load more updates"}
          </button>
        )}
        {/* Analyzed-layer upgrade nudge — once, below all cards */}
        <div className="mt-4 p-3 rounded-lg border border-sky-200/60 bg-sky-50 flex items-center gap-3">
          <p className="text-[12px] text-navy flex-1">
            Unlock regulatory theory, cross-jurisdiction signals, and action intelligence on every update.
          </p>
          <Link
            to="/subscribe"
            className="shrink-0 text-[11px] px-3 py-1.5 rounded-lg bg-navy text-white font-semibold hover:opacity-90 transition-colors whitespace-nowrap"
          >
            Get Intelligence →
          </Link>
        </div>
        {showSeeAll && !paginated && (
          <div className="text-right mt-3">
            <Link to={seeAllHref} className="text-[12px] text-sky-700 hover:underline">See all updates →</Link>
          </div>
        )}
      </div>
    );
  }

  // ── ANONYMOUS VISITOR ────────────────────────────────────────────────────
  // Newsfeed slice: homepage shows fixed cap; /updates shows all (paginated)
  const newsfeedToShow = paginated ? newsfeedArticles : newsfeedArticles.slice(0, newsfeedCap);

  return (
    <div>
      {/* Context label */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold tracking-widest uppercase text-sky-600">
          Intelligence preview
        </span>
        <span className="text-[11px] text-slate">
          — register free to see this on every update
        </span>
      </div>

      {/* Preview cards — full inline enrichment */}
      <div className="mb-5">
        {previews.map(a => (
          <ArticleCard key={a.id} item={a} variant="preview" isPremium={false} />
        ))}
      </div>

      {/* Divider */}
      {newsfeedToShow.length > 0 && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 border-t border-fog" />
            <span className="text-[11px] text-slate-400 font-medium px-1">
              {paginated ? "Latest from the feed" : "More from the feed"}
            </span>
            <div className="flex-1 border-t border-fog" />
          </div>

          {/* Newsfeed cards */}
          <div>
            {newsfeedToShow.map(a => (
              <ArticleCard key={a.id} item={a} variant="newsfeed" isPremium={false} />
            ))}
          </div>

          {/* Paginated load-more on /updates */}
          {paginated && hasMore && onLoadMore && (
            <button
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="mt-4 w-full text-[12px] px-4 py-2.5 rounded-lg border border-fog text-slate hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {isLoadingMore ? "Loading…" : "Load more from the feed"}
            </button>
          )}
        </>
      )}

      {/* Bottom gate — always shown to anonymous users */}
      <div className="mt-5 p-4 rounded-xl border border-dashed border-fog bg-slate-50 text-center">
        <p className="text-[13px] font-medium text-navy mb-1">
          See analysis like this on every regulatory update
        </p>
        <p className="text-[12px] text-slate mb-3">
          Why it matters, urgency ratings, cross-jurisdiction signals, and action intelligence — free account gets you started.
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
          <Link
            to="/signup"
            className="text-[12px] px-4 py-2 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-500 transition-colors no-underline"
          >
            Register free
          </Link>
          <Link
            to="/subscribe"
            className="text-[12px] px-4 py-2 rounded-lg border border-fog text-navy font-medium hover:bg-white transition-colors no-underline"
          >
            Intelligence plan — $39/month
          </Link>
        </div>
      </div>

      {/* Homepage "see all" link */}
      {showSeeAll && !paginated && (
        <div className="text-right mt-3">
          <Link to={seeAllHref} className="text-[12px] text-sky-700 hover:underline">
            See full feed →
          </Link>
        </div>
      )}
    </div>
  );
}

export default TieredFeed;
