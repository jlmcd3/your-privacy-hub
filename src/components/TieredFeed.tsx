import { Link } from "react-router-dom";
import { ArticleCard, HomepageCard, type ArticleItem } from "@/components/ArticleCard";
import { useAuth } from "@/hooks/useAuth";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useUserProfile } from "@/hooks/useUserProfile";
import { INTELLIGENCE_PRICING } from "@/config/pricing";

interface TieredFeedProps {
  articles: ArticleItem[];
  /** When true, anonymous users get load-more pagination on the newsfeed section.
   *  When false (homepage), anonymous users see a fixed slice. */
  paginated?: boolean;
  /** For homepage: max cards shown to anonymous users before "See all →" */
  newsfeedCap?: number;
  /** Deprecated — kept for prop compatibility, no longer used. */
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
  seeAllHref = "/updates",
  showSeeAll = true,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
}: TieredFeedProps) {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const userProfile = useUserProfile();

  const loadMoreButton = paginated && hasMore && onLoadMore && (
    <button
      onClick={onLoadMore}
      disabled={isLoadingMore}
      className="mt-4 w-full text-[12px] px-4 py-2.5 rounded-lg border border-fog text-slate hover:bg-slate-50 transition-colors disabled:opacity-50"
    >
      {isLoadingMore ? "Loading…" : "Load more updates"}
    </button>
  );

  const seeAllLink = showSeeAll && !paginated && (
    <div className="text-right mt-3">
      <Link to={seeAllHref} className="text-[12px] text-sky-700 hover:underline">See all updates →</Link>
    </div>
  );

  // ── INTELLIGENCE SUBSCRIBER ──────────────────────────────────────────────
  if (user && isPremium) {
    return (
      <div>
        {articles.map(a => (
          <ArticleCard
            key={a.id}
            item={a}
            variant="full"
            isPremium={true}
            userSalutation={userProfile.action_brief_salutation}
          />
        ))}
        {loadMoreButton}
        {seeAllLink}
      </div>
    );
  }

  // ── FREE REGISTERED USER ─────────────────────────────────────────────────
  // ActionBrief inside each FullCard is the upgrade nudge — no bottom strip.
  if (user && !isPremium) {
    return (
      <div>
        {articles.map(a => (
          <ArticleCard
            key={a.id}
            item={a}
            variant="full"
            isPremium={false}
            userSalutation={userProfile.action_brief_salutation}
          />
        ))}
        {loadMoreButton}
        {seeAllLink}
      </div>
    );
  }

  // ── ANONYMOUS VISITOR — uniform HomepageCard ─────────────────────────────
  const anonArticles = paginated ? articles : articles.slice(0, newsfeedCap);

  return (
    <div>
      <div>
        {anonArticles.map(a => (
          <HomepageCard key={a.id} item={a} />
        ))}
      </div>

      {loadMoreButton}

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
            Intelligence plan — {INTELLIGENCE_PRICING.monthly()}
          </Link>
        </div>
      </div>

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
