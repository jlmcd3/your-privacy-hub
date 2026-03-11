import { useState } from "react";
import { Search } from "lucide-react";

const enforcementData = [
  { regulator: "CNIL (France)", company: "Clearview AI", jurisdiction: "EU — France", violation: "Unlawful biometric data processing without consent", fine: "€20M", date: "Mar 8, 2026" },
  { regulator: "Texas AG", company: "DataConnect Inc.", jurisdiction: "U.S. — Texas", violation: "TDPSA: selling sensitive data without consumer consent", fine: "$14.2M", date: "Mar 9, 2026" },
  { regulator: "AEPD (Spain)", company: "CaixaBank", jurisdiction: "EU — Spain", violation: "Insufficient legal basis for profiling activities", fine: "€6.2M", date: "Mar 5, 2026" },
  { regulator: "ICO (UK)", company: "TikTok Ltd", jurisdiction: "UK", violation: "Processing children's data without parental consent", fine: "£12.7M", date: "Mar 3, 2026" },
  { regulator: "FTC", company: "HealthTrack App", jurisdiction: "U.S. — Federal", violation: "Deceptive health data sharing practices", fine: "$7.8M", date: "Feb 28, 2026" },
];

const EnforcementTracker = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const filtered = enforcementData.filter((row) =>
    Object.values(row).some((v) => v.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <section className="py-16 px-8 bg-card">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="font-display text-[26px] tracking-tight text-navy">Enforcement Tracker</h2>
            <p className="text-sm text-slate mt-1">Recent privacy enforcement actions worldwide</p>
          </div>
          <a href="/enforcement-tracker" className="text-[13px] font-medium text-blue flex items-center gap-1 hover:gap-2 transition-all no-underline">
            View full tracker →
          </a>
        </div>

        <div className="bg-card border border-fog rounded-2xl overflow-hidden shadow-eup-sm">
          <div className="px-6 py-5 bg-navy flex justify-between items-center">
            <div>
              <h3 className="font-display text-lg text-white">Recent Enforcement Actions</h3>
              <p className="text-[12px] text-slate-light mt-0.5">Top 20 visible free · Full database requires Premium</p>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-light" />
              <input
                className="pl-8 pr-3.5 py-1.5 text-[13px] bg-white/[0.08] border border-white/15 rounded-lg text-white outline-none placeholder:text-slate-light focus:border-sky transition-colors"
                placeholder="Search actions…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-fog">
                <tr>
                  {["Regulator", "Company", "Jurisdiction", "Alleged Violation", "Fine", "Date"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-slate text-left border-b border-silver">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={i} className="hover:bg-paper transition-colors">
                    <td className="px-4 py-3 text-[13px] text-navy border-b border-fog">{row.regulator}</td>
                    <td className="px-4 py-3 text-[13px] text-navy font-medium border-b border-fog">{row.company}</td>
                    <td className="px-4 py-3 text-[13px] text-navy border-b border-fog">{row.jurisdiction}</td>
                    <td className="px-4 py-3 text-[13px] text-navy border-b border-fog max-w-[300px]">{row.violation}</td>
                    <td className="px-4 py-3 font-semibold text-warn font-display text-sm border-b border-fog">{row.fine}</td>
                    <td className="px-4 py-3 text-[13px] text-navy border-b border-fog whitespace-nowrap">{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-7 text-center bg-gradient-to-b from-transparent to-fog border-t border-fog">
            <p className="text-slate text-[13px] mb-3">Full searchable enforcement database available with Premium</p>
            <a href="#premium" className="inline-block px-5 py-2 text-[13px] font-semibold text-white bg-gradient-to-br from-steel to-blue rounded-lg shadow-[0_2px_8px_rgba(59,130,196,0.25)] hover:opacity-90 transition-all no-underline">
              Upgrade for Full Access →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EnforcementTracker;
