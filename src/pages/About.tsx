import { Helmet } from "react-helmet-async";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const About = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>About EndUserPrivacy | Privacy Regulatory Intelligence Platform</title>
        <meta name="description" content="EndUserPrivacy monitors 119 regulatory authorities daily and delivers AI-synthesized weekly intelligence briefs for DPOs, privacy lawyers, and compliance teams." />
      </Helmet>
      <Topbar />
      <Navbar />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-navy via-navy-light to-navy py-16 px-4">
          <div className="max-w-[760px] mx-auto text-center">
            <span className="inline-block text-[11px] font-semibold tracking-wider uppercase text-sky bg-sky/10 border border-sky/20 rounded-full px-3 py-1 mb-4">
              🏢 ABOUT US
            </span>
            <h1 className="font-display text-[32px] md:text-[40px] font-extrabold text-white leading-tight mb-4">
              About End User Privacy
            </h1>
            <p className="text-slate-light text-[15px] max-w-[520px] mx-auto">
              The most comprehensive privacy regulatory intelligence platform — built for privacy professionals who need to stay ahead.
            </p>
          </div>
        </section>
        <section className="max-w-[760px] mx-auto px-4 py-12">
          <div className="space-y-6 text-[15px] text-slate leading-relaxed">
            <p>
              End User Privacy monitors 119 regulatory authorities across 150+ jurisdictions worldwide, delivering daily updates on enforcement actions, legislative developments, and regulatory guidance.
            </p>
            <p>
              Our platform uses AI to ingest, filter, and summarize primary source material — press releases, regulatory announcements, and authoritative news coverage — so privacy professionals can focus on what matters most.
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
              Every tool on the platform is free and requires no account to use:
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
                "📋 Weekly Intelligence Brief",
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
                    <th className="px-5 py-3.5 text-center text-[12px] font-semibold text-blue bg-blue/5">EndUserPrivacy</th>
                    <th className="px-5 py-3.5 text-center text-[12px] font-semibold text-slate">DataGuidance (OneTrust) — $300–$3,500/yr</th>
                    <th className="px-5 py-3.5 text-center text-[12px] font-semibold text-slate">IAPP Membership — $550+/yr</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Price", "$20/month (Pro)", "$300–$3,500+/year", "$550+/year"],
                    ["Format", "Weekly AI intelligence brief", "Research database", "Membership + events"],
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
