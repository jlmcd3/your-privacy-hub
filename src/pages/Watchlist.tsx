import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageContainer from "@/components/PageContainer";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import WatchlistManager from "@/components/watchlist/WatchlistManager";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";

export default function Watchlist() {
  const { isPremium } = useSubscriptionTier();

  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>Watchlist | End User Privacy</title>
      </Helmet>
      <Navbar />
      <DashboardSubnav />
      <PageContainer>
        <div className="py-6 max-w-3xl">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-navy">Watchlist</h1>
            <p className="text-sm text-slate mt-1">
              Follow jurisdictions and topics. Updates appear in your weekly digest.
            </p>
          </div>
          <WatchlistManager isPremium={isPremium} />
        </div>
      </PageContainer>
      <Footer />
    </div>
  );
}
