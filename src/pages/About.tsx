import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const About = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>About End User Privacy | Privacy Regulatory Intelligence Platform</title>
        <meta name="description" content="End User Privacy monitors 119 regulatory authorities daily and delivers weekly intelligence briefs for DPOs, privacy lawyers, and compliance teams." />
      </Helmet>
      <Navbar />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-navy via-navy-light to-navy py-16 px-4">
          <div className="max-w-[760px] mx-auto text-center">
            <span className="inline-block text-[11px] font-semibold tracking-wider uppercase text-sky bg-sky/10 border border-sky/20 rounded-full px-3 py-1 mb-4">
              ABOUT END USER PRIVACY
            </span>
            <h1 className="font-display text-[32px] md:text-[40px] font-extrabold text-white leading-tight mb-4">
              About End User Privacy
            </h1>
            <p className="text-slate-light text-[15px] max-w-[520px] mx-auto">
              Monitoring 119 regulatory authorities across 150+ jurisdictions, updated daily.
            </p>
          </div>
        </section>

        {/* Stats row */}
        <div className="bg-card border-b border-fog py-8 px-4">
          <div className="max-w-[760px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '119', label: 'Regulatory Authorities' },
              { value: '150+', label: 'Jurisdictions Tracked' },
              { value: 'Daily', label: 'Update Frequency' },
              { value: 'Free', label: 'To Browse' },
            ].map(stat => (
              <div key={stat.label}>
                <div className="font-display text-[36px] md:text-[44px] font-bold text-navy leading-none mb-1">
                  {stat.value}
                </div>
                <div className="text-[13px] text-slate font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <section className="max-w-[760px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          {/* Mission block */}
          <div className="bg-card border border-fog rounded-2xl p-6 md:p-10 mb-12 md:mb-16">
            <span className="inline-block text-[11px] font-semibold tracking-wider uppercase text-steel bg-fog rounded-full px-3 py-1 mb-5">
              Our mission
            </span>
            <blockquote className="font-display text-[22px] md:text-[28px] font-bold text-navy leading-tight mb-5">
              “Privacy professionals should spend their time on the work that actually requires their expertise. The monitoring, the reading, the analysis — that's what we do.”
            </blockquote>
            <p className="text-[15px] text-slate leading-relaxed">
              End User Privacy monitors 119 regulatory authorities and 150+ jurisdictions daily, enriches every development with AI-assisted analysis, and delivers the results in a format built for professionals who need to act on what they read, not just know about it.
            </p>
          </div>

          {/* What we cover */}
          <div className="mb-12 md:mb-16">
            <h2 className="font-display text-[20px] md:text-[24px] font-bold text-navy mb-5 md:mb-6">
              What we cover
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { stat: "119", label: "Regulatory authorities monitored" },
                { stat: "150+", label: "Jurisdictions covered" },
                { stat: "Daily", label: "Updated, enriched with regulatory context" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-card border border-fog rounded-xl p-5 md:p-6 text-center"
                >
                  <div className="font-display text-[28px] md:text-[36px] font-bold text-navy leading-none mb-2">
                    {item.stat}
                  </div>
                  <div className="text-[13px] text-slate leading-snug">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact callout */}
          <div className="bg-blue/5 border border-blue/20 rounded-2xl p-6 md:p-8 mb-12 md:mb-16">
            <p className="text-[15px] text-navy leading-relaxed">
              Questions about coverage, methodology, or your subscription? Reach us at{" "}
              <a
                href="mailto:hello@enduserprivacy.com"
                className="text-sky font-semibold hover:underline"
              >
                hello@enduserprivacy.com
              </a>{" "}
              — we respond within one business day.
            </p>
          </div>

          <div className="space-y-6 text-[15px] text-slate leading-relaxed">
            <p>
              End User Privacy monitors 119 regulatory authorities across 150+ jurisdictions worldwide, delivering daily updates on enforcement actions, legislative developments, and regulatory guidance.
            </p>
            <p>
              Our platform ingests, filters, and summarizes primary source material — press releases, regulatory announcements, and authoritative news coverage — so privacy professionals can focus on what matters most.
            </p>
            <p>
              Whether you're a Chief Privacy Officer at a Fortune 500 company, a privacy attorney at a global law firm, or a consultant advising clients on compliance, End User Privacy gives you the intelligence you need in one place.
            </p>
            <h2 className="font-display text-[20px] font-bold text-navy pt-4">Our Mission</h2>
            <p>
              To make privacy regulatory intelligence accessible, comprehensive, and actionable — at any price point. We believe that staying informed about the global privacy landscape shouldn't require expensive enterprise subscriptions or hours of manual research.
            </p>

            {/* Free Tools section */}
            <h2 className="font-display text-[20px] font-bold text-navy pt-4">Free Tools</h2>
            <p>
              These tools are free. The digest and some features require a free account:
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[14px]">
              {[
                "📅 Compliance Calendar",
                "📜 Legislation Tracker",
                "📊 US State Comparison (20 laws × 12 provisions)",
                "🌐 Global Jurisdiction Map (160+ jurisdictions)",
                "⚖️ Enforcement Tracker",
                "⏱️ Regulatory Timelines",
                "📖 Privacy Glossary",
                "📋 Personalized weekly digest (your regions and topics)",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2 text-navy">
                  <span className="text-accent">✓</span> {t}
                </li>
              ))}
            </ul>

            <h2 className="font-display text-[20px] font-bold text-navy pt-4">Contact</h2>
            <p>
              Have questions or feedback? Reach us at{" "}
              <a href="mailto:hello@enduserprivacy.com" className="text-sky hover:underline">
                hello@enduserprivacy.com
              </a>
            </p>
          </div>

          <div className="mt-12">
            <p className="text-[14px] text-navy font-semibold mb-4">
              DataGuidance (OneTrust) charges $300–3,500+/year for features you access here free.
            </p>
            <h2 className="font-display text-[20px] text-navy mb-6">The alternative to expensive enterprise platforms</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-card border border-fog rounded-2xl overflow-hidden text-[13px]">
                <thead>
                  <tr className="bg-fog">
                    <th className="px-5 py-3.5 text-left text-[12px] font-semibold tracking-wider uppercase text-slate" />
                    <th className="px-5 py-3.5 text-center text-[12px] font-semibold text-blue bg-blue/5">End User Privacy</th>
                    <th className="px-5 py-3.5 text-center text-[12px] font-semibold text-slate">DataGuidance (OneTrust) — $300–$3,500/yr</th>
                    <th className="px-5 py-3.5 text-center text-[12px] font-semibold text-slate">IAPP Membership — $550+/yr</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Price", "$39/month (Pro)", "$300–$3,500+/year", "$550+/year"],
                    ["Format", "Weekly intelligence brief", "Research database", "Membership + events"],
                    ["Focus", "Privacy & AI regulation only", "Broad legal coverage", "Credentialing & community"],
                    ["Update frequency", "Daily monitoring, Monday brief", "Periodic updates", "Weekly to monthly"],
                    ["Learning curve", "Ready in 5 minutes", "Weeks of onboarding", "Conference-based"],
                    ["Free tools", "Calendar, Tracker, Map, Comparison", "None (trial requires payment)", "Limited articles"],
                  ].map(([label, us, dg, iapp], i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-card" : "bg-paper/50"}>
                      <td className="px-5 py-3 text-navy font-medium border-t border-fog">{label}</td>
                      <td className="px-5 py-3 text-center text-navy font-medium border-t border-fog">
                        <span className="text-accent mr-1">✓</span>{us}
                      </td>
                      <td className="px-5 py-3 text-center text-slate border-t border-fog">{dg}</td>
                      <td className="px-5 py-3 text-center text-slate border-t border-fog">{iapp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
