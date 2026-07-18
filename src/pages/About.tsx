import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";


const About = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>About End User Privacy | Privacy Regulatory Intelligence Platform</title>
        <meta name="description" content="EndUserPrivacy.com monitors worldwide privacy regulatory authorities on a daily basis and delivers weekly intelligence briefs for DPOs, privacy lawyers, and compliance teams." />

      </Helmet>
      <Navbar />
      <main id="main-content" aria-label="About End User Privacy" className="flex-1">
        <section className="bg-gradient-to-br from-brand-navy via-brand-slate-teal to-brand-navy py-16 px-4">
          <div className="max-w-[760px] mx-auto text-center">
            <span className="inline-block text-meta font-semibold tracking-wider uppercase text-brand-mist bg-brand-mist/10 border border-brand-mist/20 rounded-full px-3 py-1 mb-4">
              ABOUT END USER PRIVACY
            </span>
            <h1 className="font-display text-white leading-tight mb-4">
              About End User Privacy
            </h1>
            <p className="text-blue-200/80 text-base md:text-lg leading-relaxed">
              Monitoring regulatory authorities across the world, updated daily.
            </p>

          </div>
        </section>

        {/* Stats row */}
        <div className="bg-card border-b border-brand-cloud py-8 px-4">
          <div className="max-w-[760px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: 'Global', label: 'Regulatory Authorities' },
              { value: 'Worldwide', label: 'Coverage' },

              { value: 'Daily', label: 'Update Frequency' },
              { value: 'Free', label: 'To Browse' },
            ].map(stat => (
              <div key={stat.label}>
                <div className="font-display text-[36px] md:text-[44px] font-bold text-brand-navy leading-none mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-slate font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <section className="max-w-[760px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          {/* Mission block */}
          <div className="bg-card border border-brand-cloud rounded-2xl p-6 md:p-10 mb-12 md:mb-16">
            <span className="inline-block text-meta font-semibold tracking-wider uppercase text-brand-steel bg-brand-cloud rounded-full px-3 py-1 mb-5">
              Our mission
            </span>
            <blockquote className="font-display text-[22px] md:text-[28px] font-bold text-brand-navy leading-tight mb-5">
              “Privacy professionals should spend their time on the work that actually requires their expertise. The monitoring, the reading, the analysis: that's what we do.”
            </blockquote>
            <p className="text-[15px] text-slate leading-relaxed">
              EndUserPrivacy.com monitors privacy developments across the world on a daily basis, enriches every development with AI-assisted analysis, and delivers the results in a format built for professionals who need to act on what they read, not just know about it.
            </p>
          </div>

          {/* What we cover */}
          <div className="mb-12 md:mb-16">
            <h2 className="text-section-h2 text-brand-navy mb-5 md:mb-6">
              What we cover
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { stat: "Global", label: "Regulatory authorities monitored worldwide" },
                { stat: "Daily", label: "Jurisdictions covered, updated continuously" },

                { stat: "Daily", label: "Updated, enriched with regulatory context" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-card border border-brand-cloud rounded-xl p-5 md:p-6 text-center"
                >
                  <div className="font-display text-[28px] md:text-[36px] font-bold text-brand-navy leading-none mb-2">
                    {item.stat}
                  </div>
                  <div className="text-sm text-slate leading-snug">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <section className="max-w-3xl mx-auto px-6 py-10 border-t border-gray-100 mb-12 md:mb-16">
            <p className="text-eyebrow text-slate-400 mb-2">Why End User Privacy</p>
            <h2 className="text-section-h2 text-brand-navy mb-8">
              Built differently from every other privacy information source.
            </h2>

            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="text-2xl flex-shrink-0">⚖️</div>
                <div>
                  <h3 className="text-brand-navy mb-1">
                    Enforcement-calibrated, not statute-summarising
                  </h3>
                  <p className="text-sm text-gray-600">
                    Most privacy resources describe what the law says.
                    We calibrate our analysis against 3,700+ real enforcement
                    decisions: what regulators actually penalise, in practice,
                    across authorities worldwide. There is a material difference between
                    statutory text and enforcement reality. Our tools and
                    intelligence reflect that difference.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-2xl flex-shrink-0">🤖</div>
                <div>
                  <h3 className="text-brand-navy mb-1">
                    Intelligence, not aggregation
                  </h3>
                  <p className="text-sm text-gray-600">
                    Every development that passes through the platform is enriched
                    with three layers of AI analysis: an alert identifying the
                    regulatory risk, context explaining what it means, and analysis
                    with specific operational guidance. The result is not a link to
                    a press release; it is a briefing you can act on.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-2xl flex-shrink-0">🛠️</div>
                <div>
                  <h3 className="text-brand-navy mb-1">
                    Intelligence and compliance tools in one platform
                  </h3>
                  <p className="text-sm text-gray-600">
                    The privacy tools most professionals use (LIAs, DPIAs, DPA
                    generators, IR playbooks) are sold separately by specialist
                    vendors at significant cost. We offer thirteen enforcement-calibrated
                    compliance tools at standalone per-use prices.
                    The intelligence that informs the tools and the tools themselves
                    live in the same place.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-2xl flex-shrink-0">🎯</div>
                <div>
                  <h3 className="text-brand-navy mb-1">
                    Personalised to your professional context
                  </h3>
                  <p className="text-sm text-gray-600">
                    Your weekly Privacy Intelligence Report is generated
                    specifically for your role (DPO, privacy counsel, CISO,
                    compliance lead), your jurisdictions, and your tracked topics.
                    The platform knows whether you work in healthcare, financial
                    services, or AdTech, and surfaces the enforcement patterns
                    and guidance that are relevant to you, not to everyone.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Contact callout */}
          <div className="bg-brand-teal/5 border border-brand-teal/20 rounded-2xl p-6 md:p-8 mb-12 md:mb-16">
            <p className="text-[15px] text-brand-navy leading-relaxed">
              Questions about coverage, methodology, or your subscription? Reach us at{" "}
              <a
                href="mailto:support@enduserprivacy.com"
                className="text-brand-mist font-semibold hover:underline"
              >
                support@enduserprivacy.com
              </a>{" "}
              . We respond within one business day.
            </p>
          </div>

          <div className="space-y-6 text-[15px] text-slate leading-relaxed">
            <p>
              EndUserPrivacy.com monitors privacy regulatory authorities across the world, delivering daily updates on enforcement actions, legislative developments, and regulatory guidance.
            </p>
            <p>
              Our platform ingests, filters, and summarizes primary source material (press releases, regulatory announcements, and authoritative news coverage), so privacy professionals can focus on what matters most.
            </p>
            <p>
              Whether you're a Chief Privacy Officer at a Fortune 500 company, a privacy attorney at a global law firm, or a consultant advising clients on compliance, End User Privacy gives you the intelligence you need in one place.
            </p>
            <h2 className="font-display text-brand-navy pt-4">Our Mission</h2>
            <p>
              To make privacy regulatory intelligence accessible, comprehensive, and actionable, at any price point. We believe that staying informed about the global privacy landscape shouldn`t require expensive enterprise subscriptions or hours of manual research.
            </p>

            {/* Free Tools section */}
            <h2 className="font-display text-brand-navy pt-4">Free Tools</h2>
            <p>
              These tools are free. The digest and some features require a free account:
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {[
                "📅 Compliance Calendar",
                "📜 Legislation Tracker",
                "📊 US State Comparison (20 laws × 12 provisions)",
                "🌐 Global Jurisdiction Map (150+ jurisdictions)",
                "⚖️ Enforcement Tracker",
                "⏱️ Regulatory Timelines",
                "📖 Privacy Glossary",
                "📋 Personalized weekly digest (your regions and topics)",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2 text-brand-navy">
                  <span className="text-accent">✓</span> {t}
                </li>
              ))}
            </ul>

            <h2 className="font-display text-brand-navy pt-4">Contact</h2>
            <p>
              Have questions or feedback? Reach us at{" "}
              <a href="mailto:support@enduserprivacy.com" className="text-brand-mist hover:underline">
                support@enduserprivacy.com
              </a>
            </p>
          </div>

        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
