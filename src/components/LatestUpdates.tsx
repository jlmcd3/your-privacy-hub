import { useState } from "react";
import { ExternalLink } from "lucide-react";

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

        <div className="flex flex-col gap-3">
          {filtered.map((card, i) => (
            <div
              key={i}
              className={`flex items-start gap-4 p-4 md:p-5 bg-card border border-fog rounded-xl hover:border-silver hover:shadow-eup-sm hover:-translate-y-px transition-all cursor-pointer ${
                card.featured ? "border-l-2 border-l-blue" : ""
              }`}
            >
              {/* LEFT: Thumbnail */}
              <div className="w-[120px] h-[80px] flex-shrink-0 rounded-lg overflow-hidden">
                <img
                  src="https://placehold.co/120x80/E5E7EB/9CA3AF?text="
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>

              {/* CENTER: Content */}
              <div className="flex-1 min-w-0">
                {/* Top row */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <div className="w-5 h-5 rounded-full bg-blue/10 text-blue text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {card.regulator.charAt(0)}
                  </div>
                  <span className="text-[12px] font-semibold text-slate uppercase tracking-wide">{card.source}</span>
                  <span className="text-silver text-[10px]">|</span>
                  <span className="text-[11px] text-slate-light">{card.date}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${card.tagClass}`}>{card.tag}</span>
                  {card.featured && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full font-medium">
                      ★ Featured
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-display text-[15px] leading-snug text-navy hover:text-blue transition-colors cursor-pointer mb-2">
                  {card.title}
                </h3>

                {/* Bullets summary */}
                <p className="text-[12.5px] text-slate leading-relaxed line-clamp-2">
                  {card.bullets[0]}
                  {card.bullets.length > 1 && (
                    <span className="text-[11px] text-slate-light ml-1">
                      +{card.bullets.length - 1} more details
                    </span>
                  )}
                </p>

                {/* Bottom row */}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[11px] text-slate-light truncate max-w-[280px]">{card.regulator}</span>
                  {card.featured && (
                    <span className="flex items-center gap-1 text-[10px] text-accent font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
                      Top Story
                    </span>
                  )}
                </div>
              </div>

              {/* RIGHT: External link */}
              <div className="flex-shrink-0 pl-4">
                <a href={card.sourceUrl} className="text-slate-light hover:text-blue transition-colors">
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <a href="#" className="inline-flex items-center gap-2 text-[13px] font-medium text-blue hover:text-navy transition-colors no-underline">
            View all regulatory updates →
          </a>
        </div>
      </div>
    </section>
  );
};

export default LatestUpdates;
