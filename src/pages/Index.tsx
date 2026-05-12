import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreakingNewsBanner from "@/components/BreakingNewsBanner";
import SearchFirstHero from "@/components/home/SearchFirstHero";
import HomepageFeedBrief from "@/components/home/HomepageFeedBrief";
import HomepageTools from "@/components/home/HomepageTools";
import HomepagePricingStrip from "@/components/home/HomepagePricingStrip";
import { INTELLIGENCE_PRICING, PLATFORM_PRICING } from "@/config/pricing";

const Index = () => {
  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>Global Privacy Law, Tracked Daily | End User Privacy</title>
        <meta
          name="description"
          content={`Privacy regulatory intelligence and compliance tooling. Annual Platform at ${PLATFORM_PRICING.standard()} — every assessment, notice, and document tool included. Intelligence Feed from ${INTELLIGENCE_PRICING.monthly()}.`}
        />
      </Helmet>

      <Navbar />
      <BreakingNewsBanner />
      <SearchFirstHero />
      <HomepageFeedBrief />
      <HomepageTools />
      <HomepagePricingStrip />
      <Footer />
    </div>
  );
};

export default Index;
