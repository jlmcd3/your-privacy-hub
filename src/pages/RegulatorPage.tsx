import { useParams, Link } from "react-router-dom";
import { Lock } from "lucide-react";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import FollowButton from "@/components/FollowButton";
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
          <p className="text-sm text-slate-light mt-2">{regulator.country}{regulator.region && regulator.region !== regulator.country ? ` · ${regulator.region}` : ''}</p>
          <div className="mt-4">
            <FollowButton followType="regulator" followKey={slug!} label={regulator.abbreviation || regulator.name} />
          </div>
        </div>
      </div>

      <AdBanner variant="leaderboard" adSlot="eup-regulator-top" className="py-3" />

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

        {/* Recent Intelligence */}
        <div className="mb-8">
          <h2 className="font-display text-xl text-navy mb-4">
            Recent Intelligence
          </h2>
          <div className="rounded-2xl border border-sky/25 overflow-hidden shadow-eup-sm">
            {/* Header */}
            <div className="bg-gradient-to-br from-navy to-navy-mid px-5 py-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold tracking-widest uppercase text-sky mb-1">
                  ⭐ Weekly Intelligence
                </div>
                <h3 className="font-display text-[15px] text-white">
                  What moved at {regulator.abbreviation || regulator.name} this week
                </h3>
              </div>
              <Lock className="w-5 h-5 text-sky/50 shrink-0" />
            </div>

            {/* Blurred content + overlay */}
            <div className="relative bg-card px-5 py-5">
              <div className="space-y-3 blur-[3px] select-none pointer-events-none">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-navy/20 mt-1.5 shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 bg-navy/10 rounded w-3/4" />
                    <div className="h-3 bg-navy/10 rounded w-full" />
                    <div className="h-3 bg-navy/10 rounded w-1/2" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-navy/20 mt-1.5 shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 bg-navy/10 rounded w-5/6" />
                    <div className="h-3 bg-navy/10 rounded w-full" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-navy/20 mt-1.5 shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 bg-navy/10 rounded w-2/3" />
                    <div className="h-3 bg-navy/10 rounded w-4/5" />
                    <div className="h-3 bg-navy/10 rounded w-1/2" />
                  </div>
                </div>
              </div>

              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[1px]">
                <Lock className="w-5 h-5 text-navy/40 mb-2" />
                <p className="text-[13px] font-semibold text-navy mb-1 text-center px-4">
                  Premium subscribers get weekly intelligence for every regulator they follow.
                </p>
                <p className="text-[11.5px] text-slate text-center px-6 mb-4">
                  Enforcement actions, guidance updates, and what each development means — every Monday.
                </p>
                <Link to="/subscribe" className="px-5 py-2 text-[12px] font-semibold text-white bg-gradient-to-br from-steel to-blue rounded-lg no-underline hover:opacity-90 transition-all shadow-eup-sm">
                  Unlock Regulator Intelligence →
                </Link>
              </div>
            </div>
          </div>
        </div>

        <AdBanner variant="inline" className="py-4" />

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
