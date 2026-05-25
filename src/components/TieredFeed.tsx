import { Fragment } from "react";
import { ArticleCard, type ArticleItem } from "@/components/ArticleCard";
import { useAuth } from "@/hooks/useAuth";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useUserProfile } from "@/hooks/useUserProfile";
import InFeedAd from "@/components/InFeedAd";

interface TieredFeedProps {
  articles: ArticleItem[];
  paginated?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  /** When true, interleaves an InFeedAd after every 5th article (anonymous/free only). */
  interleaveAds?: boolean;
  /** Legacy props — accepted but ignored. Enrichment is now inline per card. */
  newsfeedCap?: number;
  previewCount?: number;
  seeAllHref?: string;
  showSeeAll?: boolean;
}

export function TieredFeed({
  articles,
  paginated = false,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
  interleaveAds = false,
}: TieredFeedProps) {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const userProfile = useUserProfile();

  const loadMoreButton = paginated && hasMore && onLoadMore && (
    <button
      onClick={onLoadMore}
      disabled={isLoadingMore}
      className="mt-4 w-full text-[12px] px-4 py-2.5 rounded-lg border border-brand-cloud text-slate hover:bg-slate-50 transition-colors disabled:opacity-50"
    >
      {isLoadingMore ? "Loading…" : "Load more updates"}
    </button>
  );

  return (
    <div>
      {articles.map((a, index) => (
        <Fragment key={a.id}>
          {interleaveAds && index > 0 && index % 5 === 0 && <InFeedAd />}
          <ArticleCard
            item={a}
            variant="full"
            isPremium={isPremium}
            userSalutation={userProfile?.action_brief_salutation}
          />
        </Fragment>
      ))}
      {loadMoreButton}
    </div>
  );
}

export default TieredFeed;
