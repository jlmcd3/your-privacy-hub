import { useState } from "react";

interface UpdateCard {
  tag: string;
  tagClass: string;
  date: string;
  regulator: string;
  title: string;
  bullets: string[];
  source: string;
  sourceUrl: string;
  featured?: boolean;
  category: string;
}

const updates: UpdateCard[] = [
  {
    tag: "🇪🇺 EU",
    tagClass: "tag-eu-uk",
    category: "eu-uk",
    date: "Mar 10, 2026",
    regulator: "European Data Protection Board (EDPB)",
    title: "EDPB Adopts Binding Guidance on Personal Data Use in AI Model Training",
    bullets: [
      "EDPB Opinion 28/2026 establishes that training LLMs on scraped personal data without a valid legal basis constitutes a GDPR violation.",
      "Controllers must identify a legal basis under Article 6 for each distinct phase: data collection, pre-processing, and model training.",
      "Legitimate interest cannot be automatically assumed; controllers must conduct a balancing test for each use.",
      "Guidance applies to all controllers processing EU residents' data regardless of establishment location.",
    ],
    source: "edpb.europa.eu",
    sourceUrl: "#",
    featured: true,
  },
  {
    tag: "⚖️ Enforcement",
    tagClass: "tag-enforcement",
    category: "enforcement",
    date: "Mar 9, 2026",
    regulator: "Texas Attorney General",
    title: "Texas AG Files First TDPSA Enforcement Action Against Data Broker",
    bullets: [
      "Texas AG filed suit against a national data broker for selling sensitive personal data without required consumer consent.",
      "Alleged violations include failure to honor opt-out requests and processing sensitive data without explicit consent.",
      "TDPSA authorizes civil penalties of up to $7,500 per violation.",
    ],
    source: "texasattorneygeneral.gov",
    sourceUrl: "#",
  },
  {
    tag: "🤖 AI & Privacy",
    tagClass: "tag-ai-privacy",
    category: "ai-privacy",
    date: "Mar 8, 2026",
    regulator: "UK Information Commissioner's Office",
    title: "ICO Publishes Updated Guidance on Biometric Data in Workplace AI Systems",
    bullets: [
      "ICO guidance clarifies that biometric data processed by workplace AI systems is special category data requiring explicit consent or equivalent basis.",
      "Employers must complete a Data Protection Impact Assessment before deploying biometric attendance or monitoring systems.",
      "Guidance includes a 90-day grace period for existing deployments to achieve compliance.",
    ],
    source: "ico.org.uk",
    sourceUrl: "#",
  },
  {
    tag: "🗺️ U.S. States",
    tagClass: "tag-us-states",
    category: "us-states",
    date: "Mar 7, 2026",
    regulator: "California Privacy Protection Agency",
    title: "CPPA Approves Final Automated Decisionmaking Regulations",
    bullets: [
      "CPPA board approved final ADMT regulations requiring businesses to provide pre-use notices for automated decisionmaking.",
      "Consumers gain opt-out rights for ADM used in significant decisions including employment, housing, and credit.",
      "Regulations take effect January 1, 2027 with a 6-month enforcement delay.",
    ],
    source: "cppa.ca.gov",
    sourceUrl: "#",
  },
  {
    tag: "🇺🇸 U.S. Federal",
    tagClass: "tag-us-federal",
    category: "us-federal",
    date: "Mar 6, 2026",
    regulator: "Federal Trade Commission",
    title: "FTC Proposes Rule Expanding Children's Privacy Protections Under COPPA",
    bullets: [
      "FTC proposed rule would require verifiable parental consent for targeted advertising directed at children under 16.",
      "Proposed rule expands the definition of personal information to include biometric identifiers and persistent device identifiers.",
      "Public comment period open for 90 days.",
    ],
    source: "ftc.gov",
    sourceUrl: "#",
  },
  {
    tag: "🌐 Global",
    tagClass: "tag-global",
    category: "global",
    date: "Mar 5, 2026",
    regulator: "Brazil ANPD",
    title: "ANPD Issues Guidance on International Data Transfers Under LGPD",
    bullets: [
      "ANPD published Resolution No. 19 establishing standard contractual clauses for cross-border data transfers.",
      "Resolution requires data controllers to maintain records of all international transfers and legal bases used.",
      "Effective date: September 1, 2026.",
    ],
    source: "gov.br/anpd",
    sourceUrl: "#",
  },
];

const filters = ["All", "🇺🇸 U.S. Federal", "🗺️ U.S. States", "🇪🇺 EU & UK", "🌐 Global", "⚖️ Enforcement", "🤖 AI & Privacy"];
const filterMap: Record<string, string> = {
  "All": "all",
  "🇺🇸 U.S. Federal": "us-federal",
  "🗺️ U.S. States": "us-states",
  "🇪🇺 EU & UK": "eu-uk",
  "🌐 Global": "global",
  "⚖️ Enforcement": "enforcement",
  "🤖 AI & Privacy": "ai-privacy",
};

const LatestUpdates = () => {
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered = activeFilter === "All" ? updates : updates.filter(u => u.category === filterMap[activeFilter]);

  return (
    <section className="py-10 md:py-16 px-4 md:px-8 bg-paper">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-8">
          <div>
            <h2 className="font-display text-[22px] md:text-[26px] tracking-tight text-navy">Latest Regulatory Updates</h2>
            <p className="text-sm text-slate mt-1">Updated continuously from 250+ monitored sources</p>
          </div>
          <a href="#" className="text-[13px] font-medium text-blue flex items-center gap-1 hover:gap-2 transition-all no-underline">
            View all updates →
          </a>
        </div>

        <div className="flex gap-2 flex-wrap mb-7 p-3 md:p-4 bg-card rounded-xl border border-fog shadow-eup-sm items-center">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate mr-1">Filter:</span>
          {filters.map((f) => (
            <span
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-2.5 md:px-3.5 py-1 md:py-1.5 text-[11px] md:text-[12.5px] font-medium border rounded-full cursor-pointer transition-all ${
                activeFilter === f
                  ? "bg-navy text-white border-navy shadow-[0_2px_8px_rgba(13,31,53,0.2)]"
                  : "bg-card text-slate border-silver hover:bg-navy hover:text-white hover:border-navy"
              }`}
            >
              {f}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((card, i) => (
            <div
              key={i}
              className={`rounded-xl overflow-hidden transition-all cursor-pointer flex flex-col hover:shadow-eup-md hover:-translate-y-0.5 ${
                card.featured
                  ? "md:col-span-2 bg-gradient-to-br from-navy to-navy-mid text-white border border-navy-light"
                  : "bg-card border border-fog hover:border-silver"
              }`}
            >
              <div className="flex justify-between items-start px-4 md:px-5 pt-4 gap-2.5">
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${card.tagClass}`}>
                  {card.tag}
                </span>
                <span className="text-[11px] whitespace-nowrap text-slate-light">{card.date}</span>
              </div>
              <div className="px-4 md:px-5 pt-3 pb-4 flex-1 flex flex-col">
                <div className={`text-[11px] font-semibold tracking-wide uppercase mb-2 ${card.featured ? "text-sky" : "text-slate"}`}>
                  {card.regulator}
                </div>
                <div className={`font-display leading-snug mb-3 ${card.featured ? "text-white text-lg md:text-xl" : "text-navy text-base"}`}>
                  {card.title}
                </div>
                <ul className="list-none flex-1">
                  {card.bullets.map((b, bi) => (
                    <li
                      key={bi}
                      className={`text-[12.5px] leading-relaxed py-1 pl-3.5 relative ${
                        card.featured
                          ? "text-slate-light border-b border-white/[0.06] last:border-b-0"
                          : "text-slate border-b border-fog last:border-b-0"
                      }`}
                    >
                      <span className={`absolute left-0 top-2.5 w-1.5 h-1.5 rounded-full ${card.featured ? "bg-sky" : "bg-blue-light"}`} />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`flex justify-between items-center px-4 md:px-5 py-3 border-t ${
                card.featured ? "bg-black/15 border-white/[0.08]" : "bg-paper border-fog"
              }`}>
                <a href={card.sourceUrl} className={`text-[11px] no-underline transition-colors ${
                  card.featured ? "text-slate-light hover:text-sky" : "text-slate-light hover:text-blue"
                }`}>
                  {card.source} ↗
                </a>
                <span className={`text-[12px] ${card.featured ? "text-sky" : "text-blue"}`}>→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LatestUpdates;
