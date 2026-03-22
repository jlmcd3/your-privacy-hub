import { useState } from "react";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import { slugify } from "@/lib/utils";
import globalAuthorities from "@/data/global_privacy_authorities.json";

const regionFlags: Record<string, string> = {
  "European Union": "🇪🇺",
  "United Kingdom": "🇬🇧",
  "Canada": "🇨🇦",
  "Asia-Pacific": "🌏",
  "Latin America": "🌎",
  "Middle East & Africa": "🌍",
  "Other Notable": "🌐",
};

const GlobalAuthorities = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-paper">
      <Topbar />
      <Navbar />
      <div className="bg-gradient-to-br from-navy-mid to-navy-light py-12 px-8">
        <div className="max-w-[1280px] mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-sky mb-4 bg-sky/10 px-3 py-1.5 rounded-full border border-sky/20">
            🌐 Authority Directory
          </div>
          <h1 className="font-display text-[36px] text-white mb-3">Global Privacy Authorities</h1>
          <p className="text-base text-slate-light max-w-[700px]">
            Comprehensive directory of data protection authorities worldwide, organized by region. Includes authority names, primary legislation, official websites, and complaint portals.
          </p>
        </div>
      </div>

      <AdBanner variant="leaderboard" className="py-5" />

      <div className="max-w-[1280px] mx-auto px-8 py-10">
        {/* Search */}
        <div className="flex gap-3 items-center mb-8 p-4 bg-card rounded-xl border border-fog shadow-eup-sm">
          <div className="relative flex-1 max-w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-light w-4 h-4" />
            <input
              className="w-full py-2 pl-10 pr-4 text-sm border border-silver rounded-lg bg-paper text-navy outline-none focus:border-blue transition-colors"
              placeholder="Search countries, authorities, or legislation…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Regions */}
        <div className="space-y-6">
          {(globalAuthorities as any[]).map((region: any) => {
            const regionEntries = region.entries.filter((e: any) =>
              !searchTerm ||
              e.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
              e.authority_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (e.primary_legislation && e.primary_legislation.toLowerCase().includes(searchTerm.toLowerCase()))
            );

            if (regionEntries.length === 0) return null;

            const isExpanded = expandedRegion === region.region || searchTerm.length > 0;
            const displayEntries = isExpanded ? regionEntries : regionEntries.slice(0, 5);

            return (
              <div key={region.region} className="bg-card border border-fog rounded-2xl overflow-hidden shadow-eup-sm">
                <div className="px-6 py-5 bg-gradient-to-br from-navy-mid to-navy-light flex justify-between items-center">
                  <div>
                    <h3 className="font-display text-xl text-white flex items-center gap-2">
                      {regionFlags[region.region] || "🌐"} {region.region}
                    </h3>
                    <p className="text-[12px] text-slate-light mt-1">{regionEntries.length} authorities</p>
                  </div>
                  <div className="font-display text-[28px] text-sky leading-none">{regionEntries.length}</div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-fog">
                      <tr>
                        {["Country", "Authority", "Legislation", "Tier", "Links"].map((h) => (
                          <th key={h} className="px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-slate text-left border-b border-silver">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayEntries.map((entry: any) => (
                        <tr key={entry.id} className="hover:bg-paper transition-colors">
                          <td className="px-4 py-3 text-[13px] text-navy font-medium border-b border-fog whitespace-nowrap">
                            <Link
                              to={`/jurisdiction/${entry.slug || slugify(entry.country)}`}
                              className="text-primary hover:underline font-medium no-underline"
                            >
                              {entry.country}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-[13px] text-navy border-b border-fog">
                            <div className="font-medium">{entry.authority_name}</div>
                            <div className="text-[11px] text-slate mt-0.5">{entry.authority_abbreviation}</div>
                          </td>
                          <td className="px-4 py-3 text-[13px] text-navy border-b border-fog">
                            {entry.primary_legislation}
                            {entry.legislation_abbreviation && (
                              <span className="text-[11px] text-slate ml-1">({entry.legislation_abbreviation})</span>
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-fog">
                            <span className={`text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full ${
                              entry.monitoring_tier === 1 ? "bg-[#EBF3FB] text-[#1A5F9E]" :
                              entry.monitoring_tier === 2 ? "status-pending" : "status-none"
                            }`}>
                              Tier {entry.monitoring_tier}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[13px] border-b border-fog">
                            <div className="flex gap-2">
                              <a href={entry.website} target="_blank" rel="noopener noreferrer" className="text-blue hover:underline no-underline text-[12px]">Website ↗</a>
                              {entry.complaint_portal && (
                                <a href={entry.complaint_portal} target="_blank" rel="noopener noreferrer" className="text-blue hover:underline no-underline text-[12px]">Complaints ↗</a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!searchTerm && regionEntries.length > 5 && !isExpanded && (
                  <div className="p-3.5 text-center border-t border-fog bg-paper">
                    <button
                      onClick={() => setExpandedRegion(region.region)}
                      className="text-[13px] font-medium text-blue hover:underline cursor-pointer bg-transparent border-none"
                    >
                      View all {regionEntries.length} authorities in {region.region} →
                    </button>
                  </div>
                )}
                {isExpanded && !searchTerm && regionEntries.length > 5 && (
                  <div className="p-3.5 text-center border-t border-fog bg-paper">
                    <button
                      onClick={() => setExpandedRegion(null)}
                      className="text-[13px] font-medium text-blue hover:underline cursor-pointer bg-transparent border-none"
                    >
                      Show less
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <AdBanner variant="leaderboard" className="py-6" />
      </div>
      <Footer />
    </div>
  );
};

export default GlobalAuthorities;
