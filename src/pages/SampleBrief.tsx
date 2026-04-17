import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

const enforcementRows = [
  { reg: "ICO (UK)", jur: "UK", co: "TikTok Ltd", viol: "Children's data without parental consent", fine: "£12.7M", date: "Mar 3, 2026", url: "https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2023/04/ico-fines-tiktok-12-7-million-for-misusing-childrens-data/" },
  { reg: "Texas AG", jur: "US — Texas", co: "DataConnect Inc.", viol: "TDPSA: selling sensitive data without consent", fine: "$14.2M", date: "Mar 9, 2026", url: "https://www.texasattorneygeneral.gov/consumer-protection/data-privacy" },
  { reg: "CNIL (France)", jur: "EU — France", co: "Clearview AI", viol: "Unlawful biometric data processing", fine: "€20M", date: "Mar 8, 2026", url: "https://www.cnil.fr/en/facial-recognition-cnil-fines-clearview-ai-20-million-euros" },
  { reg: "AEPD (Spain)", jur: "EU — Spain", co: "CaixaBank", viol: "Insufficient legal basis for profiling", fine: "€6.2M", date: "Mar 5, 2026", url: "https://www.aepd.es/en/press-and-communication/notes-of-press" },
];

const actionItems = [
  { text: "Review your children's data practices immediately. The ICO's TikTok fine establishes that legitimate interests cannot justify algorithmic personalization for minors. If your platform serves or may serve users under 18, review consent mechanisms, age verification, and data minimization practices before Q2.", url: "https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2023/04/ico-fines-tiktok-12-7-million-for-misusing-childrens-data/" },
  { text: "Deploy ADMT pre-use notices by March 31. California's ADMT regulations take effect April 1. Any automated system affecting employment, housing, credit, or education for California residents requires a pre-use opt-out notice.", url: "https://cppa.ca.gov/regulations/consumer_privacy_act.html" },
  { text: "Begin LGPD transfer mechanism review now. Brazil's new SCC requirement for international transfers has a 90-day window. Organizations transferring data from Brazil should complete gap assessments and execute SCCs or obtain consent before June 14, 2026.", url: "https://www.gov.br/anpd/pt-br" },
];

const tocItems = [
  { label: "Executive Summary", anchor: "exec" },
  { label: "US Federal", anchor: "us-federal" },
  { label: "US States", anchor: "us-states" },
  { label: "EU & UK", anchor: "eu-uk" },
  { label: "Global", anchor: "global" },
  { label: "Enforcement Table", anchor: "enforcement" },
  { label: "Trend Signal", anchor: "trend" },
  { label: "Action Items", anchor: "actions" },
];

const SampleBrief = () => {
  const { isPremium } = usePremiumStatus();
  return (
    <div className="min-h-screen flex flex-col bg-slate-800">
      <Helmet>
        <title>Sample Intelligence Brief | EndUserPrivacy</title>
        <meta name="description" content="See a full sample of the weekly Privacy Intelligence Brief — 8 sections covering US Federal, US States, EU & UK, global developments, enforcement table, and trend signals." />
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
              This is what Premium subscribers receive every Monday — a full 8-section
              Intelligence Brief covering every significant privacy regulatory development
              from the prior week, re-analyzed specifically for their industry and jurisdiction.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {!isPremium && (
                <Link
                  to="/subscribe"
                  className="inline-block px-6 py-3 bg-white text-navy font-semibold rounded-lg hover:opacity-90 transition-all no-underline text-[14px]"
                >
                  Get Premium →
                </Link>
              )}
              <Link
                to="/get-intelligence"
                className="inline-flex items-center px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors no-underline text-[14px]"
              >
                Build a brief like this for your practice →
              </Link>
              <Link
                to="/"
                className="inline-block px-6 py-3 border border-white/30 text-white font-semibold rounded-lg hover:bg-white/10 transition-all no-underline text-[14px]"
              >
                Browse Free →
              </Link>
            </div>
          </div>
        </section>

        {/* Brief Document */}
        <div className="max-w-[800px] mx-auto px-4 py-10">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-10">

            {/* Document header — dark branded band */}
            <div className="bg-gradient-to-r from-navy to-steel px-8 py-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-sky">
                  ⭐ EndUserPrivacy Intelligence Brief
                </span>
                <span className="text-[11px] text-blue-300">Week 11 · 2026</span>
              </div>
              <h2 className="font-display text-[22px] md:text-[26px] text-white font-bold leading-tight mb-3">
                ICO Issues £12.7M TikTok Fine for Children's Data Violations;
                Texas AG Files First TDPSA Action; EDPB Adopts Binding AI Training Guidance
              </h2>
              <p className="text-[12px] text-blue-300">
                Based on 18 regulatory updates · 8 sections · Published every Monday
              </p>
            </div>

            {/* Table of contents navigation strip */}
            <div className="px-8 py-3 bg-slate-50 border-b border-slate-100 overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                {tocItems.map(item => (
                  <a key={item.anchor} href={`#${item.anchor}`}
                    className="text-[11px] font-medium text-slate-500 hover:text-navy
                    px-3 py-1.5 rounded-full hover:bg-slate-100 transition-all
                    no-underline whitespace-nowrap">
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Document sections */}
            <div className="px-8 py-2 divide-y divide-slate-100">

              {/* Section 1 — Executive Summary */}
              <section id="exec" className="py-8">
                <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-4">Executive Summary</h3>
                <p className="text-[15px] text-slate-700 leading-relaxed">
                  This week's dominant regulatory theme is enforcement convergence: three separate authorities — the UK ICO, Texas AG, and EU EDPB — each took significant action within the same seven-day window, signaling accelerating enforcement activity across all major jurisdictions simultaneously. The ICO's £12.7 million fine against TikTok for processing children's data without adequate parental consent establishes a new benchmark for children's privacy enforcement under UK GDPR, and is expected to trigger follow-on investigations by EU DPAs under the GDPR's one-stop-shop mechanism. In the US, the Texas Attorney General's filing against DataConnect Inc. under the TDPSA marks the first enforcement action under the new state law, confirming that state AGs are prepared to act immediately where federal privacy legislation remains stalled. Meanwhile, the EDPB's Opinion 28/2026 on AI training data creates binding compliance obligations for any organization operating in the EU that uses personal data to train AI models — a development with immediate implications for technology companies, financial institutions, and any organization deploying generative AI tools.
                </p>
              </section>

              {/* Section 2 — US Federal */}
              <section id="us-federal" className="py-8">
                <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-4">
                  <span className="mr-2">🇺🇸</span>US Federal Analysis
                </h3>
                <p className="text-[15px] text-slate-700 leading-relaxed">
                  No major federal privacy legislation advanced this week. However, the FTC continued its active enforcement posture with two new rulemakings: a proposed rule on rental housing fee transparency and a negative-option marketing rule. Neither directly concerns privacy, but both signal the FTC's sustained use of its Section 5 authority in consumer protection contexts adjacent to data practices. Privacy counsel should note that the FTC's current rulemaking pace suggests the agency is building an enforcement infrastructure that could pivot to AI and data practices rapidly once political conditions allow. No new NIST framework updates this week.
                </p>
              </section>

              {/* Section 3 — US States */}
              <section id="us-states" className="py-8">
                <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-4">
                  <span className="mr-2">🏛️</span>US State Analysis
                </h3>
                <p className="text-[15px] text-slate-700 leading-relaxed">
                  Texas leads enforcement activity this week with the first TDPSA action (see enforcement table). Three states to watch in the next 90 days: (1) Texas — AG has signaled further TDPSA enforcement actions are imminent, particularly against data brokers. (2) California — CPPA's ADMT regulations take effect April 1, 2026; organizations with automated decision-making systems affecting employment, housing, or credit must have pre-use notices and opt-out mechanisms in place. (3) New York — SHIELD Act enforcement activity has increased; the NY AG's office filed 3 data breach enforcement actions in the past 30 days. Compliance teams operating in multiple US states should prioritize: data broker registration filings (Texas, California, Oregon, Montana); ADMT notice deployment for California; and data breach notification procedure review for New York.
                </p>
              </section>

              {/* Section 4 — EU & UK */}
              <section id="eu-uk" className="py-8">
                <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-4">
                  <span className="mr-2">🇪🇺</span>EU & UK Analysis
                </h3>
                <p className="text-[15px] text-slate-700 leading-relaxed">
                  The ICO's £12.7M TikTok fine is the largest UK GDPR children's privacy fine to date and the second-largest UK GDPR fine overall. The ICO found that TikTok failed to obtain valid parental consent for users under 13 and failed to implement adequate age verification. Significantly, the ICO rejected TikTok's legitimate interests argument for processing children's data for algorithmic recommendations — a ruling with broad implications for any platform that targets or knowingly serves minors. EU DPAs are expected to open parallel investigations under Article 60 GDPR. The EDPB's Opinion 28/2026 on AI training data establishes that: (1) scraping personal data from public sources without a GDPR-compliant legal basis constitutes a violation regardless of whether the data was originally public; (2) legitimate interests cannot justify AI training on personal data without a robust balancing test; (3) data minimization obligations apply to AI training datasets. This opinion is binding on all EU DPAs and will directly affect every organization using EU residents' personal data in AI model training.
                </p>
              </section>

              {/* Pro version inset — inline after EU & UK */}
              <div className="ml-0 pl-4 border-l-4 border-amber-400 bg-amber-50/50 rounded-r-xl py-4 pr-4 my-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-amber-700 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                    ⭐ Pro version — Healthcare sector
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Same developments. Re-analyzed for your world.
                  </span>
                </div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700/70 mb-2">
                  EU & UK — Healthcare Analysis
                </p>
                <p className="text-[14px] text-slate-700 leading-relaxed mb-3">
                  The ICO's TikTok ruling has a direct implication that most healthcare
                  platforms will miss: the <strong>legitimate interests prohibition
                  for algorithmic personalization</strong> now established by the ICO applies to
                  pediatric health app recommendation engines and patient portal
                  personalization for users under 13. If your platform serves or
                  may serve users under 18, your consent mechanisms and personalization
                  logic need immediate review under both UK GDPR and COPPA.
                </p>
                <p className="text-[14px] text-slate-700 leading-relaxed mb-3">
                  The EDPB's Opinion 28/2026 on AI training data creates a
                  specific and urgent problem for healthcare AI developers:
                  the opinion's prohibition on scraping personal data for AI training
                  without a GDPR-compliant legal basis directly implicates any
                  organization that has used EU patient records, clinical notes,
                  or diagnostic imaging to train diagnostic AI models.
                  The Article 9 special category data obligation compounds this —
                  health data processed for AI training requires explicit consent
                  or a specific Article 9(2) exemption. Review your AI training
                  datasets against this opinion before Q2 DPA inquiries begin.
                </p>
                <div className="bg-amber-100/80 rounded-lg px-4 py-3 mt-3 mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-1">
                    🎯 Your action item this week (Healthcare)
                  </p>
                  <p className="text-[13px] text-amber-900 leading-relaxed">
                    Audit pediatric portal personalization and any AI training datasets
                    containing EU patient data. EDPB enforcement coordination is
                    expected in Q2-Q3. Healthcare operators have the shortest
                    lead time — the Article 9 analysis must be completed and documented
                    before the first DPA inquiry lands.
                  </p>
                </div>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <p className="text-[11px] text-slate-400">
                    Also available for: AdTech, AI, Financial Services, Legal, Retail
                  </p>
                  <Link to="/subscribe"
                    className="text-[12px] font-bold text-white bg-amber-500 hover:bg-amber-400
                    px-4 py-1.5 rounded-lg no-underline transition-all">
                    Get your Pro brief — $20/month →
                  </Link>
                </div>
              </div>

              {/* Section 5 — Global */}
              <section id="global" className="py-8">
                <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-4">
                  <span className="mr-2">🌍</span>Global Developments
                </h3>
                <p className="text-[15px] text-slate-700 leading-relaxed">
                  Brazil's ANPD published Resolution No. 19 establishing standard contractual clauses for international data transfers — the first formal transfer mechanism under the LGPD. Organizations transferring personal data from Brazil to the US, EU, or APAC must now either use these SCCs or obtain explicit consent. The 90-day implementation period ends June 14, 2026. Canada's Bill C-27 (CPPA/AIDA) remains stalled in committee but parliamentary sources indicate a vote is expected before summer recess. Organizations with Canadian operations should begin CPPA compliance gap assessments now. Singapore's PDPC issued updated AI governance guidelines expanding the definition of 'significant decisions' subject to human review requirements.
                </p>
              </section>

              {/* Section 6 — Enforcement Table */}
              <section id="enforcement" className="py-8">
                <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-4">
                  <span className="mr-2">⚖️</span>Enforcement Table
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-[12px] text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="pb-3 pr-3 pt-3 font-semibold text-[10px] uppercase tracking-wider text-slate-500 first:pl-4 last:pr-4">Regulator</th>
                        <th className="pb-3 pr-3 pt-3 font-semibold text-[10px] uppercase tracking-wider text-slate-500">Jurisdiction</th>
                        <th className="pb-3 pr-3 pt-3 font-semibold text-[10px] uppercase tracking-wider text-slate-500">Company</th>
                        <th className="pb-3 pr-3 pt-3 font-semibold text-[10px] uppercase tracking-wider text-slate-500">Violation</th>
                        <th className="pb-3 pr-3 pt-3 font-semibold text-[10px] uppercase tracking-wider text-slate-500">Fine</th>
                        <th className="pb-3 pr-3 pt-3 font-semibold text-[10px] uppercase tracking-wider text-slate-500">Date</th>
                        <th className="pb-3 pr-3 pt-3 font-semibold text-[10px] uppercase tracking-wider text-slate-500 last:pr-4">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enforcementRows.map((r, i) => (
                        <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} border-b border-slate-100`}>
                          <td className="py-2.5 pr-3 pl-4 font-medium text-navy whitespace-nowrap">
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline font-medium">{r.reg}</a>
                          </td>
                          <td className="py-2.5 pr-3 text-slate-600 whitespace-nowrap">{r.jur}</td>
                          <td className="py-2.5 pr-3 text-slate-600 whitespace-nowrap">{r.co}</td>
                          <td className="py-2.5 pr-3 text-slate-600">{r.viol}</td>
                          <td className="py-2.5 pr-3 font-semibold text-navy whitespace-nowrap">{r.fine}</td>
                          <td className="py-2.5 pr-3 text-slate-500 whitespace-nowrap">{r.date}</td>
                          <td className="py-2.5 pr-4 whitespace-nowrap">
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-[11px] font-medium no-underline hover:underline transition-colors">
                              View ↗
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Section 7 — Trend Signal */}
              <section id="trend" className="py-8">
                <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-4">
                  <span className="mr-2">📡</span>Trend Signal
                </h3>
                <p className="text-[15px] text-slate-700 leading-relaxed">
                  Week-over-week pattern: Enforcement volume is up 40% compared to the same period in 2025. The concentration of simultaneous enforcement actions across UK, US, and EU in a single week is unusual and suggests coordinated intelligence-sharing between regulators — a pattern that has preceded major enforcement waves in the past (see 2021 GDPR enforcement surge). The 30-90 day outlook: organizations should expect (1) follow-on EU investigations against TikTok within 60 days; (2) additional Texas TDPSA enforcement actions against data brokers within 30 days; (3) first ADMT enforcement actions from CPPA in Q2 2026 following the April 1 effective date. The EDPB AI training opinion is likely to be followed by coordinated DPA investigations against major AI developers in Q2-Q3 2026.
                </p>
              </section>

              {/* Section 8 — Action Items — dark section */}
              <section id="actions" className="py-8">
                <div className="bg-navy rounded-xl p-6">
                  <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-amber-400 mb-5">
                    🎯 Action Items for GC / CPO
                  </h3>
                  <div className="space-y-5">
                    {actionItems.map((item, i) => (
                      <div key={i} className="flex gap-4">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500 text-navy text-[12px] font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-[14px] text-blue-100 leading-relaxed">{item.text}</p>
                          <a href={item.url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 mt-2 no-underline">
                            Source ↗
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

            </div>{/* end divide-y container */}
          </div>{/* end white document card */}

          {/* Bottom CTA — outside the document */}
          <div className="bg-gradient-to-br from-navy to-steel rounded-2xl p-8 text-center">
            <h3 className="font-display text-[22px] font-bold text-white mb-2">
              Receive this analysis every Monday morning.
            </h3>
            <p className="text-blue-200 text-[14px] mb-5 max-w-[500px] mx-auto">
              This is the Premium Intelligence Brief. Free accounts include a personalized weekly digest filtered to your regions and topics. Get Premium for the full brief, re-analyzed for your industry and jurisdiction — $20/month.
            </p>
            <div className="text-center">
              <Link
                to="/subscribe"
                className="inline-block bg-white text-navy font-bold text-[14px] py-3 px-10 rounded-xl no-underline hover:opacity-90 transition-all"
              >
                Get Premium — $20/month →
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
