import { Link } from "react-router-dom";
import { ArticleCard, HomepageCard, type ArticleItem } from "@/components/ArticleCard";
import { useAuth } from "@/hooks/useAuth";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useUserProfile } from "@/hooks/useUserProfile";
import { INTELLIGENCE_PRICING } from "@/config/pricing";

interface TieredFeedProps {
  articles: ArticleItem[];
  paginated?: boolean;
  newsfeedCap?: number;
  previewCount?: number;
  seeAllHref?: string;
  showSeeAll?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  /** The currently selected article (shown in the intelligence panel) */
  selectedArticle?: ArticleItem | null;
  /** Called when the user clicks a card body to select it */
  onSelectArticle?: (article: ArticleItem) => void;
  /** When true, cards show in minimal panel mode (no inline enrichment) */
  panelMode?: boolean;
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
  selectedArticle = null,
  onSelectArticle,
  panelMode = false,
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

  // ── PANEL MODE — uniform minimal cards with selection (any tier) ─────────
  if (panelMode) {
    return (
      <div>
        {articles.map(a => (
          <ArticleCard
            key={a.id}
            item={a}
            variant="full"
            isPremium={isPremium}
            userSalutation={userProfile?.action_brief_salutation}
            panelMode
            isSelected={selectedArticle?.id === a.id}
            onSelect={onSelectArticle ? () => onSelectArticle(a) : undefined}
          />
        ))}
        {loadMoreButton}
      </div>
    );
  }

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
