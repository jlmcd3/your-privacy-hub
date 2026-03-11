const topics = [
  { icon: "🗺️", title: "U.S. State Privacy Laws", desc: "Comprehensive guide to enacted and pending state privacy legislation across all 50 states, including enforcement authority and effective dates.", updated: "Updated Mar 10, 2026" },
  { icon: "⚖️", title: "GDPR Enforcement", desc: "History and framework of GDPR enforcement across all 27 EU member states, including DPA activity, major fines, and enforcement trends.", updated: "Updated Mar 8, 2026" },
  { icon: "🤖", title: "AI Privacy Regulations", desc: "Global overview of AI-specific privacy regulation, covering the EU AI Act, national AI strategies, and emerging enforcement at the AI-data intersection.", updated: "Updated Mar 9, 2026" },
  { icon: "🏛️", title: "U.S. Federal Privacy Law", desc: "Overview of the U.S. federal privacy regulatory framework including FTC authority, HIPAA, COPPA, and federal privacy bill activity.", updated: "Updated Mar 5, 2026" },
  { icon: "🌐", title: "Global Privacy Laws", desc: "Comparative guide to privacy regulation outside the U.S. and EU, covering APAC, Latin America, Middle East, and Africa frameworks.", updated: "Updated Mar 7, 2026" },
  { icon: "🔒", title: "Data Breach Requirements", desc: "Global comparison of breach notification requirements — timelines, authority notification rules, and consumer notice obligations by jurisdiction.", updated: "Updated Mar 6, 2026" },
];

const ResearchTopics = () => {
  return (
    <section className="py-16 px-8 bg-paper">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="font-display text-[26px] tracking-tight text-navy">Research Topics</h2>
            <p className="text-sm text-slate mt-1">In-depth regulatory landscape guides</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {topics.map((topic) => (
            <a
              key={topic.title}
              href="#"
              className="group bg-card border border-fog rounded-xl p-6 no-underline flex flex-col relative overflow-hidden hover:shadow-eup-md hover:border-silver hover:-translate-y-0.5 transition-all"
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
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ResearchTopics;
