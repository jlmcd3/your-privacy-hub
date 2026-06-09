import { Helmet } from "react-helmet-async";
import PageContainer from "@/components/PageContainer";
import WorkspaceLayout from "@/components/dashboard/WorkspaceLayout";
import WatchlistManager from "@/components/watchlist/WatchlistManager";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";

export default function Watchlist() {
  const { isPremium } = useSubscriptionTier();

  return (
    <WorkspaceLayout>
      <Helmet>
        <title>Watchlist | End User Privacy</title>
      </Helmet>
      <PageContainer>
        <div className="py-6 max-w-3xl">
          <div className="mb-6">
            <h1 className="font-display text-brand-navy">Watchlist</h1>
            <p className="text-sm text-slate mt-1">
              Follow jurisdictions, topics, and industries. Updates appear in your weekly digest and personalise your investigation prompts.
            </p>
          </div>
          <WatchlistManager isPremium={isPremium} />
        </div>
      </PageContainer>
    </WorkspaceLayout>
  );
}
