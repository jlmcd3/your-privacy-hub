import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreakingNewsBanner from "@/components/BreakingNewsBanner";

import SearchFirstHero from "@/components/home/SearchFirstHero";
import HomepageTriptych from "@/components/home/HomepageTriptych";
import ToolsStrip from "@/components/home/ToolsStrip";
import { HomepageFeedPanel } from "@/components/home/HomepageFeedPanel";

import { useAuth } from "@/hooks/useAuth";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { INTELLIGENCE_PRICING, PLATFORM_PRICING } from "@/config/pricing";

const Index = () => {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();

  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>Global Privacy Law, Tracked Daily | End User Privacy</title>
        <meta name="description" content={`Privacy regulatory intelligence and compliance tooling. Annual Platform at ${PLATFORM_PRICING.standard()} — every assessment, notice, and document tool included. Intelligence Feed from ${INTELLIGENCE_PRICING.monthly()}.`} />
      </Helmet>

      <Navbar />
      <BreakingNewsBanner />
      <SearchFirstHero />

      {/* Two-column: articles + intelligence panel */}
      <HomepageFeedPanel isPremium={isPremium} isAuthenticated={!!user} />

      {/* ── Tools ─────────────────────────── */}
      <div id="tools" className="scroll-mt-16 py-16">
        {!isPremium && (
          <div className="max-w-[1280px] mx-auto px-4 md:px-8 mb-6">
            <h2 className="font-display text-[24px] font-bold text-navy mb-2">
              Your compliance toolkit
            </h2>
            <p className="text-[14px] text-slate">
              Enforcement-calibrated assessments and documents — not checkbox compliance.
            </p>
          </div>
        )}
        <HomepageTriptych />
        <ToolsStrip />
      </div>

      <Footer />
    </div>
  );
};

export default Index;
