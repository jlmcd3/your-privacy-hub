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
import HomepageTriptych from "@/components/home/HomepageTriptych";
import { IntelligenceBriefSection } from "@/components/home/IntelligenceBriefSection";

import FreeVsPaidStrip from "@/components/FreeVsPaidStrip";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { INTELLIGENCE_PRICING, PLATFORM_PRICING } from "@/config/pricing";

const Index = () => {
  const { isPremium } = usePremiumStatus();

  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>Global Privacy Law, Tracked Daily | End User Privacy</title>
        <meta name="description" content={`Privacy regulatory intelligence and compliance tooling. Annual Platform at ${PLATFORM_PRICING.standard()} — every assessment, notice, and document tool included. Intelligence Feed from ${INTELLIGENCE_PRICING.monthly()}.`} />
      </Helmet>

      {/* Layer 2: Navbar — sticky, must be near top so it anchors immediately */}
      <Navbar />

      {/* Layer 3: Breaking news */}
      <BreakingNewsBanner />

      {/* Layer 4: Hero panels */}
      <SearchFirstHero />

      {/* Personalised Intelligence Brief section */}
      <IntelligenceBriefSection />

      {/* Layer 5: Free vs paid */}
      <FreeVsPaidStrip />

      {/* Layer 5b: Homepage triptych — Intelligence / Assessments / Documents */}
      <HomepageTriptych />

      {/* Layer 6: Main editorial content — full-width feed matching triptych */}
      <section className="mt-4 px-4">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
          {/* === LEFT COLUMN === */}
          <div className="min-w-0">
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


            {/* Two-tier pricing card — hidden for premium */}
            {!isPremium && (
              <div className="bg-card border border-fog rounded-xl p-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate mb-3">
                  Get started
                </p>

                {/* Platform option — primary */}
                <div className="mb-4">
                  <p className="text-navy font-bold text-[15px]">Compliance Platform</p>
                  <p className="text-[22px] font-display font-bold text-navy leading-tight">
                    {PLATFORM_PRICING.standard()}
                  </p>
                  <p className="text-[11px] text-amber-700 font-semibold mb-2">
                    Billed annually · {PLATFORM_PRICING.standardMonthly()} equivalent
                  </p>
                  <p className="text-[11px] text-slate mb-3">
                    All compliance tools included. Full intelligence brief.
                  </p>
                  <Link
                    to="/subscribe"
                    className="block w-full text-center bg-navy text-white text-[12px] font-bold py-2.5 rounded-lg hover:opacity-90 no-underline"
                  >
                    Start platform →
                  </Link>
                </div>

                {/* Intelligence option — secondary */}
                <div className="border-t border-fog pt-4">
                  <p className="text-navy font-semibold text-[13px]">Intelligence only</p>
                  <p className="text-[18px] font-display font-bold text-navy leading-tight">
                    {INTELLIGENCE_PRICING.monthlyShort()}
                  </p>
                  <p className="text-[11px] text-slate mb-2">
                    Brief, monitoring, and enforcement tracking.
                  </p>
                  <Link
                    to="/subscribe"
                    className="block w-full text-center border border-navy text-navy text-[12px] font-semibold py-2 rounded-lg hover:bg-navy/5 no-underline"
                  >
                    Start intelligence →
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
      </section>

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
