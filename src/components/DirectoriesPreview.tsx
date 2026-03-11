import { Link } from "react-router-dom";

const usPreview = [
  { name: "California — CPPA", sub: "California Consumer Privacy Act / CPRA", status: "Enacted" },
  { name: "Texas — Attorney General", sub: "Texas Data Privacy and Security Act", status: "Enacted" },
  { name: "New York — Attorney General", sub: "New York Privacy Act (pending)", status: "Pending" },
  { name: "Virginia — Attorney General", sub: "Consumer Data Protection Act", status: "Enacted" },
  { name: "Colorado — Attorney General", sub: "Colorado Privacy Act", status: "Enacted" },
];

const globalPreview = [
  { flag: "🇪🇺", name: "EDPB — European Data Protection Board", sub: "GDPR — Supranational coordinator", status: "Active" },
  { flag: "🇬🇧", name: "ICO — Information Commissioner's Office", sub: "UK GDPR / Data Protection Act 2018", status: "Active" },
  { flag: "🇫🇷", name: "CNIL — Commission Nationale (France)", sub: "GDPR enforcement authority", status: "Active" },
  { flag: "🇮🇪", name: "DPC — Data Protection Commission (Ireland)", sub: "GDPR lead authority for Big Tech EU ops", status: "Active" },
  { flag: "🇧🇷", name: "ANPD — National Data Protection Authority", sub: "LGPD — Brazil", status: "Active" },
];

const statusClass = (s: string) =>
  s === "Enacted" || s === "Active" ? "status-enacted" : s === "Pending" ? "status-pending" : "status-none";

const DirectoriesPreview = () => {
  return (
    <section className="py-10 md:py-16 px-4 md:px-8 bg-paper">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="font-display text-[22px] md:text-[26px] tracking-tight text-navy">Regulatory Authority Directories</h2>
            <p className="text-sm text-slate mt-1">Complete reference database — free access</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* US States */}
          <div className="bg-card border border-fog rounded-2xl overflow-hidden shadow-eup-sm hover:shadow-eup-md hover:-translate-y-0.5 transition-all">
            <div className="px-5 md:px-6 py-5 md:py-6 bg-gradient-to-br from-navy-mid to-navy-light flex justify-between items-start">
              <div>
                <h3 className="font-display text-lg md:text-xl text-white mb-1">🇺🇸 U.S. State Privacy Authorities</h3>
                <p className="text-[12px] text-slate-light">All 50 states + DC — statutes, status, AG websites, complaint portals</p>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <div className="font-display text-[28px] md:text-[32px] text-sky leading-none">51</div>
                <div className="text-[10px] text-slate-light">jurisdictions</div>
              </div>
            </div>
            <div>
              {usPreview.map((entry, i) => (
                <div key={i} className="flex items-center gap-3.5 px-4 md:px-5 py-3 border-b border-fog last:border-b-0 hover:bg-paper transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-fog to-silver flex items-center justify-center text-lg flex-shrink-0">🏛️</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-navy">{entry.name}</div>
                    <div className="text-[11px] text-slate mt-0.5 truncate">{entry.sub}</div>
                  </div>
                  <span className={`text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 ${statusClass(entry.status)}`}>
                    {entry.status}
                  </span>
                </div>
              ))}
            </div>
            <div className="p-3.5 text-center border-t border-fog bg-paper">
              <Link to="/us-state-privacy-authorities" className="text-[13px] font-medium text-blue hover:gap-2 transition-all no-underline flex items-center justify-center gap-1">
                View all 51 state authorities →
              </Link>
            </div>
          </div>

          {/* Global */}
          <div className="bg-card border border-fog rounded-2xl overflow-hidden shadow-eup-sm hover:shadow-eup-md hover:-translate-y-0.5 transition-all">
            <div className="px-5 md:px-6 py-5 md:py-6 bg-gradient-to-br from-navy-mid to-navy-light flex justify-between items-start">
              <div>
                <h3 className="font-display text-lg md:text-xl text-white mb-1">🌐 Global Privacy Authorities</h3>
                <p className="text-[12px] text-slate-light">68 authorities across 6 regions — legislation, DPA websites, complaint portals</p>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <div className="font-display text-[28px] md:text-[32px] text-sky leading-none">68</div>
                <div className="text-[10px] text-slate-light">authorities</div>
              </div>
            </div>
            <div>
              {globalPreview.map((entry, i) => (
                <div key={i} className="flex items-center gap-3.5 px-4 md:px-5 py-3 border-b border-fog last:border-b-0 hover:bg-paper transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-fog to-silver flex items-center justify-center text-lg flex-shrink-0">{entry.flag}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-navy">{entry.name}</div>
                    <div className="text-[11px] text-slate mt-0.5 truncate">{entry.sub}</div>
                  </div>
                  <span className={`text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 ${statusClass(entry.status)}`}>
                    {entry.status}
                  </span>
                </div>
              ))}
            </div>
            <div className="p-3.5 text-center border-t border-fog bg-paper">
              <Link to="/global-privacy-authorities" className="text-[13px] font-medium text-blue hover:gap-2 transition-all no-underline flex items-center justify-center gap-1">
                View all 68 global authorities →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DirectoriesPreview;
