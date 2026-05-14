import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import LatestUpdates from "@/components/LatestUpdates";
import BreakingNewsBanner from "@/components/BreakingNewsBanner";
import BriefBuilder from "@/components/subscribe/BriefBuilder";
import AdBanner from "@/components/AdBanner";

import SearchFirstHero from "@/components/home/SearchFirstHero";
import HomepageTriptych from "@/components/home/HomepageTriptych";
import { IntelligenceBriefSection } from "@/components/home/IntelligenceBriefSection";
import ToolsStrip from "@/components/home/ToolsStrip";

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

      <BreakingNewsBanner />
      <SearchFirstHero />
      <div className="max-w-[1280px] mx-auto px-4 md:px-8">
        <AdBanner variant="leaderboard" className="my-6" />
      </div>
      {/* ── Updates (above the brief) ─────────── */}
      <div id="updates" className="scroll-mt-16 py-12">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 mb-6">
          <h2 className="font-display text-[24px] font-bold text-navy mb-2">
            Today's regulatory developments
          </h2>
          <p className="text-[14px] text-slate">
            Live intelligence from 119 monitored authorities, enriched with compliance analysis.
          </p>
        </div>
        <section className="px-4">
          <div className="max-w-[1280px] mx-auto">
            <LatestUpdates />
          </div>
        </section>
      </div>

      <IntelligenceBriefSection>
        <div id="brief" className="scroll-mt-16">
          <div className="max-w-3xl mx-auto mb-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-300 mb-2">
              Your Privacy Intelligence Report
            </p>
            <h3 className="font-display text-[22px] md:text-[24px] font-bold text-white mb-2">
              Build your sample
            </h3>
            <p className="text-[14px] text-blue-100/80">
              Customized and analyzed for your priorities and responsibilities.
              Here is what lands in your inbox every Monday.
            </p>
          </div>
          <div className="max-w-3xl mx-auto">
            <div className="bg-card border border-fog rounded-2xl shadow-eup-sm p-5 md:p-8">
              <BriefBuilder />

              {!user && (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center my-6">
                  <p className="text-[15px] font-semibold text-foreground mb-1">
                    Create a free account to read the full analysis
                  </p>
                  <p className="text-[13px] text-muted-foreground mb-4 leading-relaxed">
                    Key takeaways, compliance impact, and action intelligence on every update.
                  </p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    <Link to="/signup" className="text-[13px] font-semibold bg-gold text-white px-4 py-2 rounded-xl hover:opacity-90 transition-all no-underline">
                      Register free →
                    </Link>
                    <Link to="/subscribe" className="text-[13px] font-semibold border border-border text-foreground px-4 py-2 rounded-xl hover:bg-muted transition-colors no-underline">
                      See plans →
                    </Link>
                  </div>
                </div>
              )}

              {user && !isPremium && (
                <div className="rounded-xl border border-blue/20 bg-white px-4 py-4 text-center mt-6">
                  <p className="text-[14px] font-semibold text-navy mb-1">
                    Upgrade to Platform for full action intelligence
                  </p>
                  <p className="text-[12px] text-slate mb-3 leading-relaxed">
                    Compliance impact, action items by role, regulatory theory, and deep analysis on every update.
                  </p>
                  <Link to="/subscribe" className="inline-block text-[13px] font-semibold bg-gold text-white px-4 py-2 rounded-xl hover:opacity-90 transition-all no-underline">
                    Upgrade to Platform →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </IntelligenceBriefSection>

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

    </div>
  );
};

export default Index;
