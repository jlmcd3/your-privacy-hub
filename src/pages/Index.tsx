import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreakingNewsBanner from "@/components/BreakingNewsBanner";
import AdBanner from "@/components/AdBanner";

import SearchFirstHero from "@/components/home/SearchFirstHero";
import HomepageFeedSection from "@/components/home/HomepageFeedSection";
import HomepageBriefSection from "@/components/home/HomepageBriefSection";
import HomepageToolsSection from "@/components/home/HomepageToolsSection";
import HomepagePricingStrip from "@/components/home/HomepagePricingStrip";
import { INTELLIGENCE_PRICING, PLATFORM_PRICING } from "@/config/pricing";

const Index = () => (
  <div className="min-h-screen bg-paper">
    <Helmet>
      <title>Global Privacy Law, Tracked Daily | End User Privacy</title>
      <meta name="description" content={`Privacy regulatory intelligence and compliance tooling. Annual Platform at ${PLATFORM_PRICING.standard()} — every assessment, notice, and document tool included. Intelligence Feed from ${INTELLIGENCE_PRICING.monthly()}.`} />
    </Helmet>

    <Navbar />
    <BreakingNewsBanner />
    <SearchFirstHero />

    <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-8 space-y-6">
      <div id="updates" className="scroll-mt-20">
        <HomepageFeedSection />
      </div>
      <HomepageBriefSection />
      <div id="tools" className="scroll-mt-20">
        <HomepageToolsSection />
      </div>
    </div>

    <HomepagePricingStrip />
    <AdBanner variant="leaderboard" className="mt-8 mb-4" />
    <Footer />
  </div>
);

export default Index;
