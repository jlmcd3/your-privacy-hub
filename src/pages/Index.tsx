import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreakingNewsBanner from "@/components/BreakingNewsBanner";

import SearchFirstHero from "@/components/home/SearchFirstHero";
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
    <HomeGeographyPaths />
    <CPPADeadlineStrip />

    <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-8 space-y-6">
      <div id="updates" className="scroll-mt-20">
        <HomepageFeedSection />
      </div>
      <HomepageBriefSection />

      <section className="max-w-4xl mx-auto px-6 py-10 border-t border-gray-100">
        <p className="text-eyebrow !text-sm text-brand-steel mb-3">How it fits together</p>
        <h2 className="text-section-h2 text-brand-navy mb-8">
          From intelligence to action, in the same platform.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <div className="text-2xl mb-2">📡</div>
            <h3 className="text-brand-navy mb-1">Monitor</h3>
            <p className="text-sm text-gray-600">
              Worldwide privacy authorities tracked daily. Every enforcement action,
              regulatory guidance, and legislative development, enriched
              with AI analysis before it reaches you.
            </p>
          </div>
          <div>
            <div className="text-2xl mb-2">🧠</div>
            <h3 className="text-brand-navy mb-1">Analyse</h3>
            <p className="text-sm text-gray-600">
              Your weekly Privacy Intelligence Report synthesises what
              matters for your role, jurisdiction, and industry. Not a
              news digest: a decision-ready briefing.
            </p>
          </div>
          <div>
            <div className="text-2xl mb-2">⚖️</div>
            <h3 className="text-brand-navy mb-1">Act</h3>
            <p className="text-sm text-gray-600">
              Run an LIA. Draft a DPA. Generate an IR playbook. Assess
              your CPPA readiness. Thirteen compliance tools included with
              Annual Platform, each calibrated to enforcement. Includes 4 generations:
              your initial report plus up to 3 revisions at no extra cost.
            </p>
          </div>
        </div>
      </section>

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
