import { useState } from "react";
import { Search } from "lucide-react";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";

const enforcementData = [
  { regulator: "CNIL (France)", company: "Clearview AI", jurisdiction: "EU — France", violation: "Unlawful biometric data processing without consent", fine: "€20M", date: "Mar 8, 2026" },
  { regulator: "Texas AG", company: "DataConnect Inc.", jurisdiction: "U.S. — Texas", violation: "TDPSA: selling sensitive data without consumer consent", fine: "$14.2M", date: "Mar 9, 2026" },
  { regulator: "AEPD (Spain)", company: "CaixaBank", jurisdiction: "EU — Spain", violation: "Insufficient legal basis for profiling activities", fine: "€6.2M", date: "Mar 5, 2026" },
  { regulator: "ICO (UK)", company: "TikTok Ltd", jurisdiction: "UK", violation: "Processing children's data without parental consent", fine: "£12.7M", date: "Mar 3, 2026" },
  { regulator: "FTC", company: "HealthTrack App", jurisdiction: "U.S. — Federal", violation: "Deceptive health data sharing practices", fine: "$7.8M", date: "Feb 28, 2026" },
  { regulator: "DPC (Ireland)", company: "Meta Platforms", jurisdiction: "EU — Ireland", violation: "Insufficient transparency in ad targeting data use", fine: "€390M", date: "Feb 25, 2026" },
  { regulator: "ANPD (Brazil)", company: "DataBroker LATAM", jurisdiction: "Brazil", violation: "LGPD: international transfer without adequate safeguards", fine: "R$8.5M", date: "Feb 22, 2026" },
  { regulator: "Garante (Italy)", company: "ChatGPT (OpenAI)", jurisdiction: "EU — Italy", violation: "Insufficient age verification and transparency", fine: "€15M", date: "Feb 18, 2026" },
  { regulator: "BfDI (Germany)", company: "Palantir Technologies", jurisdiction: "EU — Germany", violation: "Unlawful processing of personal data by law enforcement", fine: "€8.3M", date: "Feb 14, 2026" },
  { regulator: "AP (Netherlands)", company: "Uber Technologies", jurisdiction: "EU — Netherlands", violation: "Cross-border transfer violations to U.S. servers", fine: "€10M", date: "Feb 10, 2026" },
  { regulator: "California CPPA", company: "Sephora Inc.", jurisdiction: "U.S. — California", violation: "CCPA: failure to honor opt-out signals", fine: "$1.2M", date: "Feb 6, 2026" },
  { regulator: "PIPC (South Korea)", company: "Kakao Corp", jurisdiction: "South Korea", violation: "PIPA: inadequate consent mechanisms for data collection", fine: "₩5.6B", date: "Feb 2, 2026" },
];

const EnforcementTrackerPage = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = enforcementData.filter((row) =>
    Object.values(row).some((v) => v.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-paper">
      <Topbar />
      <Navbar />
      <div className="bg-gradient-to-br from-navy-mid to-navy-light py-12 px-8">
        <div className="max-w-[1280px] mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-sky mb-4 bg-sky/10 px-3 py-1.5 rounded-full border border-sky/20">
            ⚖️ Enforcement Database
          </div>
          <h1 className="font-display text-[36px] text-white mb-3">Enforcement Tracker</h1>
          <p className="text-base text-slate-light max-w-[700px]">
            Comprehensive database of global privacy enforcement actions, fines, and sanctions. Searchable by regulator, company, jurisdiction, and violation type.
          </p>
        </div>
      </div>

      <AdBanner variant="leaderboard" className="py-5" />

      <div className="max-w-[1280px] mx-auto px-8 py-10">
        <div className="flex gap-3 items-center mb-8 p-4 bg-card rounded-xl border border-fog shadow-eup-sm">
          <div className="relative flex-1 max-w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-light w-4 h-4" />
            <input
              className="w-full py-2 pl-10 pr-4 text-sm border border-silver rounded-lg bg-paper text-navy outline-none focus:border-blue transition-colors"
              placeholder="Search enforcement actions…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <span className="ml-auto text-[12px] text-slate-light">{filtered.length} actions</span>
        </div>

        <div className="bg-card border border-fog rounded-2xl overflow-hidden shadow-eup-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-fog">
                <tr>
                  {["Regulator", "Company", "Jurisdiction", "Alleged Violation", "Fine", "Date"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-slate text-left border-b border-silver">{h}</th>
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
            <p className="text-slate text-[13px] mb-3">Showing top 20 enforcement actions. Full database requires Premium access.</p>
            <a href="/#premium" className="inline-block px-5 py-2 text-[13px] font-semibold text-white bg-gradient-to-br from-steel to-blue rounded-lg shadow-[0_2px_8px_rgba(59,130,196,0.25)] hover:opacity-90 transition-all no-underline">
              Upgrade for Full Access →
            </a>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default EnforcementTrackerPage;
