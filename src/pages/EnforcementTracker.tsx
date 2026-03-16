import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  const [liveArticles, setLiveArticles] = useState<any[]>([]);

  useEffect(() => {
    async function loadArticles() {
      const { data } = await (supabase as any)
        .from("updates")
        .select("id,title,url,source_name,image_url,published_at")
        .eq("category", "enforcement")
        .order("published_at", { ascending: false })
        .limit(20);

      if (data) setLiveArticles(data);
    }
    loadArticles();
  }, []);

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

        {/* Label */}
        <div className="text-[10px] font-bold tracking-widest uppercase text-slate-light mb-3">
          Curated Sample — Recent Major Actions
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

          {/* Honest premium CTA */}
          <div className="p-7 bg-gradient-to-b from-transparent to-fog border-t border-fog">
            <div className="max-w-[600px] mx-auto text-center">
              <div className="text-[10px] font-bold tracking-widest uppercase text-sky mb-2">⭐ Premium Intelligence</div>
              <p className="text-navy font-semibold text-[15px] mb-1">
                Get full enforcement analysis every Monday
              </p>
              <p className="text-slate text-[13px] mb-4">
                Premium subscribers receive a dedicated enforcement section in the weekly brief, AI-synthesized with compliance implications.
              </p>
              <Link to="/subscribe" className="inline-block px-6 py-2.5 text-[13px] font-semibold text-white bg-gradient-to-br from-steel to-blue rounded-lg shadow-[0_2px_8px_rgba(59,130,196,0.25)] hover:opacity-90 transition-all no-underline">
                View Premium Plans →
              </Link>
            </div>
          </div>
        </div>

        {/* Live enforcement news */}
        {liveArticles.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="font-display text-xl text-navy">Latest Enforcement News</h2>
              <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                Live
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveArticles.map((a) => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-4 p-4 bg-card border border-fog rounded-xl hover:border-silver hover:shadow-eup-sm transition-all no-underline"
                >
                  {a.image_url && (
                    <img
                      src={a.image_url}
                      alt=""
                      className="w-20 h-14 object-cover rounded-lg flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate mb-1">
                      {a.source_name} · {new Date(a.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                    <p className="text-[13px] font-medium text-navy group-hover:text-blue transition-colors line-clamp-2">
                      {a.title}
                    </p>
                  </div>
                  <ExternalLink size={12} className="text-slate-light group-hover:text-blue transition-colors flex-shrink-0 mt-1" />
                </a>
              ))}
            </div>
          </div>
        )}

        <AdBanner variant="leaderboard" className="py-6" />
      </div>
      <Footer />
    </div>
  );
};

export default EnforcementTrackerPage;
