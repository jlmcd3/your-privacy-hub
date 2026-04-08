import { Link } from "react-router-dom";

const topics = [
  { icon: "🇺🇸", title: "U.S. Privacy Laws", desc: "Complete guide to the U.S. privacy regulatory framework — federal statutes, FTC enforcement authority, and state-level comprehensive privacy laws across all 50 states.", updated: "Updated Mar 10, 2026", href: "/us-privacy-laws" },
  { icon: "⚖️", title: "GDPR Enforcement", desc: "History and framework of GDPR enforcement across all 27 EU member states, including DPA activity, major fines, and enforcement trends.", updated: "Updated Mar 8, 2026", href: "/gdpr-enforcement" },
  { icon: "🤖", title: "AI Privacy Regulations", desc: "Global overview of AI-specific privacy regulation, covering the EU AI Act, national AI strategies, and emerging enforcement at the AI-data intersection.", updated: "Updated Mar 9, 2026", href: "/ai-privacy-regulations" },
  { icon: "🌐", title: "Global Privacy Laws", desc: "Comparative guide to privacy regulation outside the U.S. and EU, covering APAC, Latin America, Middle East, and Africa frameworks.", updated: "Updated Mar 7, 2026", href: "/global-privacy-laws" },
  { icon: "🔒", title: "Data Breach Requirements", desc: "Global comparison of breach notification requirements — timelines, authority notification rules, and consumer notice obligations by jurisdiction.", updated: "Updated Mar 6, 2026", href: "/enforcement-tracker" },
];

const ResearchTopics = () => {
  return (
    <section className="pt-5 pb-10 md:pt-8 md:pb-16 px-4 md:px-8 bg-paper">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="font-display text-[22px] md:text-[26px] tracking-tight text-navy">Research Topics</h2>
            <p className="text-sm text-slate mt-1">In-depth regulatory landscape guides</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics.map((topic) => (
            <Link
              key={topic.title}
              to={topic.href}
              className="group bg-card border border-fog rounded-xl p-5 md:p-6 no-underline flex flex-col relative overflow-hidden hover:shadow-eup-md hover:border-silver hover:-translate-y-0.5 transition-all"
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-steel to-blue scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300" />
              <div className="w-10 h-10 bg-fog rounded-lg flex items-center justify-center text-xl mb-3.5 group-hover:bg-sky transition-colors">
                {topic.icon}
              </div>
              <div className="font-display text-[15px] text-navy mb-2">{topic.title}</div>
              <div className="text-[12.5px] text-slate leading-relaxed flex-1">{topic.desc}</div>
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-fog">
                <span className="text-[10.5px] text-slate-light">{topic.updated}</span>
                <span className="text-[12px] text-blue">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ResearchTopics;
