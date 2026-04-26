import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import LatestUpdates from "@/components/LatestUpdates";
import WeeklyBriefTeaser from "@/components/WeeklyBriefTeaser";
import PremiumBanner from "@/components/PremiumBanner";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import StickyRailAd from "@/components/StickyRailAd";
import BreakingNewsBanner from "@/components/BreakingNewsBanner";
import EmailSignup from "@/components/EmailSignup";
import SponsorshipBanner from "@/components/SponsorshipBanner";
import { AD_SLOTS, GOOGLE_AD_CLIENT } from "@/config/adSlots";

import SearchFirstHero from "@/components/home/SearchFirstHero";
import ThisWeekInPrivacy from "@/components/home/ThisWeekInPrivacy";
import ToolkitSection from "@/components/home/ToolkitSection";
import ProToolsBanner from "@/components/home/ProToolsBanner";

import FreeVsPaidStrip from "@/components/FreeVsPaidStrip";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

const Index = () => {
  const { isPremium } = usePremiumStatus();

  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>Global Privacy Law, Tracked Daily | EndUserPrivacy</title>
        <meta name="description" content="Privacy regulatory intelligence for professionals. Tracking 119 authorities across 150+ jurisdictions — enforcement actions, new legislation, and regulatory guidance, updated daily." />
      </Helmet>

      {/* Layer 2: Navbar — sticky, must be near top so it anchors immediately */}
      <Navbar />

      {/* Layer 3: Breaking news */}
      <BreakingNewsBanner />

      {/* Layer 4: Hero panels */}
      <SearchFirstHero />

      {/* Layer 5: Free vs paid */}
      <FreeVsPaidStrip />

      {/* Layer 5b: Pro Tools cross-link (includes Registration Manager) */}
      <ProToolsBanner />

      {/* Layer 6: Main editorial content */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Two-column layout: main content + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">

          {/* === LEFT COLUMN === */}
          <div className="min-w-0">
            {/* Article feed with filters */}

            {/* Article feed with filters */}
            <LatestUpdates />
          </div>

          {/* === RIGHT SIDEBAR === */}
          <aside className="hidden lg:flex flex-col gap-6">
            {/* Sticky desktop rail ad — shown to all users (Intelligence included) */}
            <StickyRailAd
              adSlot={AD_SLOTS.home_sidebar_rail.id}
              googleAdClient={GOOGLE_AD_CLIENT}
              googleAdSlot={AD_SLOTS.home_sidebar_rail.googleAdSlot}
              topOffset={96}
            />
            <SponsorshipBanner placement="home_sidebar" />


            {/* Weekly brief sidebar card — hidden for premium */}
            {!isPremium && (
              <div className="bg-gradient-to-br from-navy to-steel rounded-2xl p-5 text-white">
                <div className="text-[9px] font-bold uppercase tracking-widest text-amber-400 mb-2">
                  ⭐ Weekly Intelligence Brief
                </div>
                <p className="font-display font-bold text-[15px] leading-snug mb-2">
                  Every Monday. Intelligence. 8-section analysis.
                </p>
                <p className="text-blue-200 text-[12px] leading-relaxed mb-4">
                  Enforcement table · trend signals · action items ·
                  regional analysis. Re-analyzed for your industry.
                </p>
                <Link
                  to="/sample-brief"
                  className="block text-center text-[12px] font-semibold text-navy bg-white hover:opacity-90 px-4 py-2 rounded-lg no-underline mb-3"
                >
                  See a sample brief →
                </Link>
                <div className="border-t border-white/10 pt-3">
                  <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-1.5">
                    ⭐ Intelligence — $39/month
                  </p>
                  <p className="text-[11px] text-blue-200 leading-snug mb-2">
                    Re-written for your industry and jurisdictions.
                  </p>
                  <Link
                    to="/subscribe"
                    className="block text-center text-[11px] font-bold text-navy bg-amber-400 hover:bg-amber-300 px-4 py-1.5 rounded-lg no-underline"
                  >
                    Get full intelligence →
                  </Link>
                </div>
              </div>
            )}

            {/* Search */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate mb-2">
                Search the platform
              </p>
              <SearchBar />
            </div>

          </aside>

        </div>
      </div>

      {/* Below-fold content */}
      <SponsorshipBanner placement="home_belowfold" className="mx-auto max-w-[1280px] mt-6" />
      <AdBanner
        variant="leaderboard"
        adSlot={AD_SLOTS.home_bottom_leaderboard.id}
        googleAdClient={GOOGLE_AD_CLIENT}
        googleAdSlot={AD_SLOTS.home_bottom_leaderboard.googleAdSlot}
        className="py-4 bg-paper"
      />
      <EmailSignup variant="strip" />

      <div className="h-px bg-fog" />
      <WeeklyBriefTeaser />
      <div className="py-12"><ToolkitSection /></div>
      <PremiumBanner />
      <Footer />
    </div>
  );
};

export default Index;
