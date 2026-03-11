import { useParams, Link } from "react-router-dom";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import globalAuthorities from "@/data/global_privacy_authorities.json";

// Build regulator lookup from JSON
const buildRegulatorData = () => {
  const regulators: Record<string, {
    name: string;
    abbreviation: string;
    country: string;
    region: string;
    website: string;
    complaint_portal?: string;
    legislation?: string;
    legislation_abbreviation?: string;
    monitoring_tier?: number;
  }> = {};

  (globalAuthorities as any[]).forEach((region: any) => {
    region.entries.forEach((entry: any) => {
      const slug = (entry.authority_abbreviation || entry.authority_name)
        .toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-");
      regulators[slug] = {
        name: entry.authority_name,
        abbreviation: entry.authority_abbreviation || "",
        country: entry.country,
        region: region.region,
        website: entry.website,
        complaint_portal: entry.complaint_portal,
        legislation: entry.primary_legislation,
        legislation_abbreviation: entry.legislation_abbreviation,
        monitoring_tier: entry.monitoring_tier,
      };
    });
  });

  // Add some common aliases
  const aliases: Record<string, string> = {
    "edpb": "edpb",
    "ico": "ico",
    "ftc": "ftc",
    "cnil": "cnil",
    "dpc": "dpc",
  };

  // FTC (not in global JSON, add manually)
  regulators["ftc"] = {
    name: "Federal Trade Commission",
    abbreviation: "FTC",
    country: "United States",
    region: "Americas",
    website: "https://www.ftc.gov",
    complaint_portal: "https://reportfraud.ftc.gov",
    legislation: "FTC Act Section 5, COPPA, various sector-specific statutes",
    monitoring_tier: 1,
  };

  return regulators;
};

const allRegulators = buildRegulatorData();

const RegulatorPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const regulator = slug ? allRegulators[slug] : null;

  if (!regulator) {
    return (
      <div className="min-h-screen bg-paper">
        <Topbar />
        <Navbar />
        <div className="max-w-[860px] mx-auto px-4 md:px-8 py-20 text-center">
          <h1 className="font-display text-3xl text-navy mb-4">Regulator Not Found</h1>
          <p className="text-slate mb-6">The regulator you're looking for is not yet in our database.</p>
          <Link to="/global-privacy-authorities" className="text-blue hover:underline">Browse all regulators →</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const tierLabel = regulator.monitoring_tier === 1 ? "Tier 1 — Major" : regulator.monitoring_tier === 2 ? "Tier 2 — Secondary" : "Tier 3 — Global";
  const tierClass = regulator.monitoring_tier === 1 ? "bg-[#EBF3FB] text-[#1A5F9E]" : regulator.monitoring_tier === 2 ? "status-pending" : "status-none";

  return (
    <div className="min-h-screen bg-paper">
      <Topbar />
      <Navbar />
      <div className="bg-gradient-to-br from-navy-mid to-navy-light py-10 md:py-14 px-4 md:px-8">
        <div className="max-w-[860px] mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-sky mb-4 bg-sky/10 px-3 py-1.5 rounded-full border border-sky/20">
            ⚖️ Regulator Profile
          </div>
          <h1 className="font-display text-[28px] md:text-[40px] text-white mb-2">{regulator.name}</h1>
          {regulator.abbreviation && <p className="text-lg text-sky font-display">{regulator.abbreviation}</p>}
          <p className="text-sm text-slate-light mt-2">{regulator.country} · {regulator.region}</p>
        </div>
      </div>

      <div className="max-w-[860px] mx-auto px-4 md:px-8 py-10">
        {/* Key info card */}
        <div className="bg-card border border-fog rounded-2xl overflow-hidden shadow-eup-sm mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-fog">
            <div className="p-5">
              <div className="text-[11px] font-semibold tracking-wider uppercase text-slate mb-2">Jurisdiction</div>
              <div className="text-[15px] text-navy font-medium">{regulator.country}</div>
              <div className="text-[12px] text-slate mt-0.5">{regulator.region}</div>
            </div>
            <div className="p-5">
              <div className="text-[11px] font-semibold tracking-wider uppercase text-slate mb-2">Monitoring</div>
              <span className={`text-[11px] font-semibold tracking-wide px-2.5 py-1 rounded-full ${tierClass}`}>
                {tierLabel}
              </span>
            </div>
          </div>
          {regulator.legislation && (
            <div className="border-t border-fog p-5">
              <div className="text-[11px] font-semibold tracking-wider uppercase text-slate mb-2">Primary Legislation</div>
              <div className="text-[15px] text-navy font-medium">
                {regulator.legislation}
                {regulator.legislation_abbreviation && (
                  <span className="text-slate ml-1 font-normal">({regulator.legislation_abbreviation})</span>
                )}
              </div>
            </div>
          )}
          <div className="border-t border-fog p-5">
            <div className="text-[11px] font-semibold tracking-wider uppercase text-slate mb-3">Links</div>
            <div className="flex gap-4 flex-wrap">
              <a href={regulator.website} target="_blank" rel="noopener noreferrer" className="text-[13px] text-blue hover:underline no-underline font-medium">Official Website ↗</a>
              {regulator.complaint_portal && (
                <a href={regulator.complaint_portal} target="_blank" rel="noopener noreferrer" className="text-[13px] text-blue hover:underline no-underline font-medium">Complaint / Enforcement Portal ↗</a>
              )}
            </div>
          </div>
        </div>

        {/* Recent updates placeholder */}
        <div className="mb-8">
          <h2 className="font-display text-xl text-navy mb-4">Recent Updates</h2>
          <div className="bg-card border border-fog rounded-xl p-6 text-center">
            <p className="text-[13px] text-slate mb-3">Regulatory updates from {regulator.abbreviation || regulator.name} will appear here once the monitoring pipeline is active.</p>
            <Link to="/#premium" className="text-[13px] font-medium text-blue no-underline hover:underline">
              Subscribe for alerts →
            </Link>
          </div>
        </div>

        {/* Related */}
        <div className="border-t border-fog pt-8">
          <h3 className="font-display text-lg text-navy mb-4">Related Resources</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link to={`/jurisdiction/${regulator.country.toLowerCase().replace(/\s+/g, "-")}`} className="flex items-center gap-2 p-3 bg-card border border-fog rounded-lg hover:bg-fog transition-colors no-underline text-[13px] text-navy font-medium">
              <span className="text-blue">→</span> {regulator.country} Jurisdiction Page
            </Link>
            <Link to="/global-privacy-authorities" className="flex items-center gap-2 p-3 bg-card border border-fog rounded-lg hover:bg-fog transition-colors no-underline text-[13px] text-navy font-medium">
              <span className="text-blue">→</span> Global Authority Directory
            </Link>
            <Link to="/enforcement-tracker" className="flex items-center gap-2 p-3 bg-card border border-fog rounded-lg hover:bg-fog transition-colors no-underline text-[13px] text-navy font-medium">
              <span className="text-blue">→</span> Enforcement Tracker
            </Link>
            <Link to="/gdpr-enforcement" className="flex items-center gap-2 p-3 bg-card border border-fog rounded-lg hover:bg-fog transition-colors no-underline text-[13px] text-navy font-medium">
              <span className="text-blue">→</span> GDPR Enforcement
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default RegulatorPage;
