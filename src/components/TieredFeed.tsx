import { ArticleCard, type ArticleItem } from "@/components/ArticleCard";
import { useAuth } from "@/hooks/useAuth";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useUserProfile } from "@/hooks/useUserProfile";

interface TieredFeedProps {
  articles: ArticleItem[];
  paginated?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

export function TieredFeed({
  articles,
  paginated = false,
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

  return (
    <div>
      {articles.map((a) => (
        <ArticleCard
          key={a.id}
          item={a}
          variant="full"
          isPremium={isPremium}
          userSalutation={userProfile?.action_brief_salutation}
        />
      ))}
      {loadMoreButton}
    </div>
  );
}

export default TieredFeed;
