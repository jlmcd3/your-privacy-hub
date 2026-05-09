import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { INTELLIGENCE_PRICING } from "@/config/pricing";
import BriefBuilder from "@/components/subscribe/BriefBuilder";
import SampleBriefShowcase from "@/components/SampleBriefShowcase";

const SampleBrief = () => {
  const { isPremium } = usePremiumStatus();
  return (
    <div className="min-h-screen flex flex-col bg-slate-800">
      <Helmet>
        <title>Sample Intelligence Brief | End User Privacy</title>
        <meta
          name="description"
          content="See a full sample of the weekly Privacy Intelligence Brief — 8 sections covering US Federal, US States, EU & UK, global developments, enforcement table, and trend signals."
        />
      </Helmet>
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-navy via-navy-light to-navy py-14 px-4">
          <div className="max-w-[760px] mx-auto text-center">
            <span className="inline-block text-[11px] font-semibold tracking-wider uppercase text-sky bg-sky/10 border border-sky/20 rounded-full px-3 py-1 mb-4">
              📋 SAMPLE INTELLIGENCE BRIEF
            </span>
            <h1 className="font-display text-[28px] md:text-[36px] font-extrabold text-white leading-tight mb-4">
              See what your Intelligence brief sends you every Monday
            </h1>
            <p className="text-slate-light text-[15px] max-w-[600px] mx-auto mb-6">
              This is what Intelligence subscribers receive every Monday — a full 8-section Intelligence Brief covering
              every significant privacy regulatory development from the prior week, customized and analyzed for your
              priorities and responsibilities.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {!isPremium && (
                <Link
                  to="/subscribe"
                  className="inline-block px-6 py-3 bg-white text-navy font-semibold rounded-lg hover:opacity-90 transition-all no-underline text-[14px]"
                >
                  Get full intelligence →
                </Link>
              )}
              <a
                href="#brief-builder-section"
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById("brief-builder-section");
                  if (!el) return;
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                  window.setTimeout(() => {
                    el.focus({ preventScroll: true });
                  }, 400);
                }}
                className="inline-flex items-center px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors no-underline text-[14px]"
              >
                Build a brief like this for your practice →
              </a>
              <Link
                to="/"
                className="inline-block px-6 py-3 border border-white/30 text-white font-semibold rounded-lg hover:bg-white/10 transition-all no-underline text-[14px]"
              >
                Browse Free →
              </Link>
            </div>
          </div>
        </section>

        {/* Full sample brief — story cards */}
        <SampleBriefShowcase variant="full" />

        {/* BriefBuilder — interactive demo */}
        <div className="bg-white py-12">
          <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8">
            <div
              id="brief-builder-section"
              tabIndex={-1}
              aria-label="Build your own intelligence brief"
              className="scroll-mt-8 focus:outline-none"
            >
              <div className="text-center mb-8">
                <h2 className="font-display font-bold text-navy text-[24px] mb-3">
                  Build a brief like this for your practice
                </h2>
                <p className="text-slate text-[15px] max-w-[520px] mx-auto">
                  Select your jurisdiction, role, and topic tracks. We'll show you
                  the depth and format you'd receive every Monday — written for your role.
                </p>
              </div>
              <BriefBuilder />
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="bg-gradient-to-br from-navy to-steel rounded-2xl p-8 text-center">
            <h3 className="font-display text-[22px] font-bold text-white mb-2">
              Receive this analysis every Monday morning.
            </h3>
            <p className="text-blue-200 text-[14px] mb-5 max-w-[500px] mx-auto">
              This is the Intelligence Brief. Free accounts include a personalized weekly digest filtered to your
              regions and topics. Get the full brief, customized and analyzed for your priorities and responsibilities —{" "}
              {`${INTELLIGENCE_PRICING.monthly()}`}.
            </p>
            <div className="text-center">
              <Link
                to="/subscribe"
                className="inline-block bg-white text-navy font-bold text-[14px] py-3 px-10 rounded-xl no-underline hover:opacity-90 transition-all"
              >
                Get full intelligence — {`${INTELLIGENCE_PRICING.monthly()}`} →
              </Link>
              <p className="text-blue-300 text-[12px] mt-3">
                First 25 subscribers get the first year free · Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SampleBrief;
