import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import NewsfeedPaywallCard from "./NewsfeedPaywallCard";
import InFeedAd from "./InFeedAd";

const FREE_LIMIT = 15;
const BATCH_SIZE = 15;

interface Article {
  id: string;
  title: string;
  summary?: string | null;
  source?: string | null;
  jurisdiction?: string;
  category?: string;
  published_at?: string;
  url?: string;
  image_url?: string | null;
  [key: string]: any;
}

interface NewsfeedListProps {
  articles: Article[];
  renderArticle: (article: Article, index: number, isPremium: boolean) => React.ReactNode;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export default function NewsfeedList({
  articles,
  renderArticle,
  isLoading = false,
  hasMore = false,
  onLoadMore,
}: NewsfeedListProps) {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [visibleCount, setVisibleCount] = useState(FREE_LIMIT);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("is_premium, is_pro")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setIsPremium(data?.is_premium === true || data?.is_pro === true);
      });
  }, [user]);

  const showPaywall = !isPremium && articles.length > FREE_LIMIT && visibleCount >= FREE_LIMIT;
  const visibleArticles = isPremium ? articles : articles.slice(0, visibleCount);

  const handleLoadMore = () => {
    if (isPremium) {
      onLoadMore?.();
    } else {
      setVisibleCount((c) => Math.min(c + BATCH_SIZE, FREE_LIMIT));
    }
  };

  return (
    <div>
      {/* Article list */}
      <div className="space-y-0">
        {visibleArticles.map((article, i) => (
          <div key={article.id || i}>
            {renderArticle(article, i, isPremium)}
            {i === 3 && <InFeedAd adSlot="eup-infeed-1" />}
            {i === 8 && <InFeedAd adSlot="eup-infeed-2" />}
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="py-8 text-center text-slate text-sm animate-pulse">
          Loading more updates…
        </div>
      )}

      {/* Paywall for free users at limit */}
      {showPaywall && <NewsfeedPaywallCard />}

      {/* Load more — only show if not at free limit or user is premium */}
      {!showPaywall && (isPremium ? hasMore : visibleCount < FREE_LIMIT && articles.length > visibleCount) && (
        <div className="flex justify-center mt-8">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="border border-blue/30 text-blue font-semibold text-sm px-8 py-3 rounded-xl hover:bg-blue/5 transition-all disabled:opacity-50"
          >
            {isLoading ? "Loading…" : "Load 15 more updates →"}
          </button>
        </div>
      )}

      {/* Premium: end of feed */}
      {isPremium && !hasMore && !isLoading && articles.length > 0 && (
        <p className="text-center text-slate text-sm py-8">
          You're all caught up — check back tomorrow for new updates.
        </p>
      )}
    </div>
  );
}
