import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import PageContainer from "@/components/PageContainer";
import WatchlistManager from "@/components/watchlist/WatchlistManager";
import AdBanner from "@/components/AdBanner";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";

export default function Watchlist() {
  const { isPremium } = useSubscriptionTier();

  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>Watchlist | End User Privacy</title>
      </Helmet>
      <PageContainer>
        <div className="py-6 max-w-3xl">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-navy">Watchlist</h1>
            <p className="text-sm text-slate mt-1">
              Follow jurisdictions and topics. Updates appear in your weekly digest.
            </p>
          </div>
          <AdBanner variant="leaderboard" className="mb-6" />
          <WatchlistManager isPremium={isPremium} />
          {/* Empty state hint — shown by WatchlistManager when empty; provide a CTA below as well */}
          <div className="mt-8 text-center text-sm text-slate">
            New here?{" "}
            <Link to="/updates" className="inline-block bg-gold text-white rounded-xl px-4 py-2 ml-2 text-cta no-underline hover:opacity-90 transition-all">
              Browse the Feed →
            </Link>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
