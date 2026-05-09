import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import LatestUpdates from "@/components/LatestUpdates";
import Footer from "@/components/Footer";
import BreakingNewsBanner from "@/components/BreakingNewsBanner";

import SearchFirstHero from "@/components/home/SearchFirstHero";
import HomepageTriptych from "@/components/home/HomepageTriptych";
import { IntelligenceBriefSection } from "@/components/home/IntelligenceBriefSection";
import ToolsStrip from "@/components/home/ToolsStrip";
import SampleBriefShowcase from "@/components/SampleBriefShowcase";

import BriefBuilder from "@/components/subscribe/BriefBuilder";
import { INTELLIGENCE_PRICING, PLATFORM_PRICING } from "@/config/pricing";

const Index = () => {
  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>Global Privacy Law, Tracked Daily | End User Privacy</title>
        <meta name="description" content={`Privacy regulatory intelligence and compliance tooling. Annual Platform at ${PLATFORM_PRICING.standard()} — every assessment, notice, and document tool included. Intelligence Feed from ${INTELLIGENCE_PRICING.monthly()}.`} />
      </Helmet>

      {/* Sticky navbar */}
      <Navbar />

      {/* Breaking news */}
      <BreakingNewsBanner />

      {/* Hero with three CTA cards */}
      <SearchFirstHero />

      {/* Intelligence Brief pitch */}
      <IntelligenceBriefSection />

      {/* Sample brief proof — sits immediately below the pitch */}
      <SampleBriefShowcase variant="condensed" />

      {/* Build-your-own brief */}
      <div id="briefbuilder" className="scroll-mt-16 py-16 bg-paper">
        <div className="max-w-3xl mx-auto px-4 md:px-8 mb-6">
          <h2 className="font-display text-[24px] font-bold text-navy mb-2">
            Build your brief
          </h2>
          <p className="text-[14px] text-slate">
            Tell us your jurisdiction and role. We'll show you exactly what your
            Monday brief looks like.
          </p>
        </div>
        <div className="max-w-3xl mx-auto px-4 md:px-8">
          <BriefBuilder />
        </div>
      </div>

      {/* Live regulatory feed */}
      <div id="updates" className="scroll-mt-16 py-16">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 mb-6">
          <h2 className="font-display text-[24px] font-bold text-navy mb-2">
            Today's regulatory developments
          </h2>
          <p className="text-[14px] text-slate">
            Live intelligence from 119 monitored authorities, enriched with
            compliance analysis.
          </p>
        </div>
        <div className="max-w-[1280px] mx-auto px-4 md:px-8">
          <LatestUpdates />
        </div>
      </div>

      {/* Compliance tools */}
      <div id="tools" className="scroll-mt-16 py-16 bg-paper">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 mb-6">
          <h2 className="font-display text-[24px] font-bold text-navy mb-2">
            Your compliance toolkit
          </h2>
          <p className="text-[14px] text-slate">
            Enforcement-calibrated assessments and documents — not checkbox
            compliance.
          </p>
        </div>
        <HomepageTriptych />
        <ToolsStrip />
      </div>

      <Footer />
    </div>
  );
};

export default Index;
