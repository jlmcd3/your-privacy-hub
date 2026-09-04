import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreakingNewsBanner from "@/components/BreakingNewsBanner";

import SearchFirstHero from "@/components/home/SearchFirstHero";
import HomeOrientationStrip from "@/components/home/HomeOrientationStrip";
import HomeGeographyPaths from "@/components/home/HomeGeographyPaths";
import CPPADeadlineStrip from "@/components/CPPADeadlineStrip";
import HomepageFeedSection from "@/components/home/HomepageFeedSection";
import HomepageBriefSection from "@/components/home/HomepageBriefSection";
import HomepageToolsSection from "@/components/home/HomepageToolsSection";
import HomepagePricingStrip from "@/components/home/HomepagePricingStrip";
import { PRICING } from "@/config/pricing";

const Index = () => (
  <div className="min-h-screen bg-brand-cloud">
    <Helmet>
      <title>Global Privacy Law, Tracked Daily | End User Privacy</title>
      <meta name="description" content={`Privacy regulatory intelligence and compliance tooling. Intelligence from ${PRICING.intelligence.monthly.display}/month · Professional from ${PRICING.professional.base.display}/month + ${PRICING.professional.perClient.display}/client/year · Tools available standalone.`} />
    </Helmet>

    <Navbar />
    <BreakingNewsBanner />
    <main id="main-content" aria-label="Home">
    <SearchFirstHero />
    <HomeOrientationStrip />
    <HomeGeographyPaths />
    <CPPADeadlineStrip />

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

    </main>
    <Footer />
  </div>
);

export default Index;
