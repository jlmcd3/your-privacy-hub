import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import FollowButton from "@/components/FollowButton";
import globalAuthorities from "@/data/global_privacy_authorities.json";
import usStates from "@/data/us_state_privacy_authorities.json";

// Build jurisdiction data from JSON
const buildJurisdictionData = () => {
  const jurisdictions: Record<string, {
    name: string;
    region: string;
    flag: string;
    overview: string;
    authorities: { name: string; abbreviation?: string; website: string; complaint_portal?: string; legislation?: string }[];
  }> = {};

  const regionFlags: Record<string, string> = {
    "European Union": "🇪🇺", "United Kingdom": "🇬🇧", "Canada": "🇨🇦",
    "Asia-Pacific": "🌏", "Latin America": "🌎", "Middle East & Africa": "🌍", "Other Notable": "🌐",
  };

  (globalAuthorities as any[]).forEach((region: any) => {
    region.entries.forEach((entry: any) => {
      const slug = entry.country.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      if (!jurisdictions[slug]) {
        jurisdictions[slug] = {
          name: entry.country,
          region: region.region,
          flag: regionFlags[region.region] || "🌐",
          overview: `${entry.country} privacy regulation is primarily governed by ${entry.primary_legislation || "national data protection law"}${entry.legislation_abbreviation ? ` (${entry.legislation_abbreviation})` : ""}. The primary regulatory authority is the ${entry.authority_name}${entry.authority_abbreviation ? ` (${entry.authority_abbreviation})` : ""}.`,
          authorities: [],
        };
      }
      jurisdictions[slug].authorities.push({
        name: entry.authority_name,
        abbreviation: entry.authority_abbreviation,
        website: entry.website,
        complaint_portal: entry.complaint_portal,
        legislation: entry.primary_legislation,
      });
    });
  });

  jurisdictions["united-states"] = {
    name: "United States",
    region: "Americas",
    flag: "🇺🇸",
    overview: "The United States lacks a comprehensive federal privacy law, instead relying on a patchwork of sector-specific federal statutes and state-level privacy legislation. The FTC serves as the primary federal privacy enforcement authority. As of 2026, 20+ states have enacted comprehensive privacy laws.",
    authorities: usStates.map((s: any) => ({
      name: s.authority_name,
      stateName: s.state,
      website: s.website,
      complaint_portal: s.complaint_portal,
      legislation: s.statute_name,
      statute_status: s.statute_status,
      effective_date: s.effective_date,
      notes: s.notes,
    })),
  };

  return jurisdictions;
};

const allJurisdictions = buildJurisdictionData();

const EU_COUNTRIES = new Set([
  "austria","belgium","bulgaria","croatia","cyprus","czech republic","denmark","estonia",
  "finland","france","germany","greece","hungary","ireland","italy","latvia","lithuania",
  "luxembourg","malta","netherlands","poland","portugal","romania","slovakia","slovenia","spain","sweden",
]);

const deriveCategory = (jurisdiction: { name: string; region: string }) => {
  const name = jurisdiction.name.toLowerCase();
  if (jurisdiction.region === "European Union" || EU_COUNTRIES.has(name)) return "eu-uk";
  if (jurisdiction.region === "United States" || name === "united states") return "us-federal";
  return "global";
};

const JurisdictionPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const jurisdiction = slug ? allJurisdictions[slug] : null;

  const [devArticles, setDevArticles] = useState<any[] | null>(null);
  const [devLoading, setDevLoading] = useState(true);

  const derivedCategory = jurisdiction ? deriveCategory(jurisdiction) : "global";

  useEffect(() => {
    if (!jurisdiction) return;
    setDevLoading(true);
    (async () => {
      const { data, error } = await (supabase as any)
        .from("updates")
        .select("id,title,summary,url,source_domain,source_name,image_url,category,published_at")
        .eq("category", derivedCategory)
        .order("published_at", { ascending: false })
        .limit(20);
      if (error || !data || data.length === 0) {
        setDevArticles(null);
      } else {
        const term = jurisdiction.name.toLowerCase();
        const sorted = [...data].sort((a: any, b: any) => {
          const aMatch = (a.title + " " + (a.summary || "")).toLowerCase().includes(term);
          const bMatch = (b.title + " " + (b.summary || "")).toLowerCase().includes(term);
          if (aMatch && !bMatch) return -1;
          if (!aMatch && bMatch) return 1;
          return 0;
        });
        setDevArticles(sorted.slice(0, 4));
      }
      setDevLoading(false);
    })();
  }, [jurisdiction, derivedCategory]);

  if (!jurisdiction) {
    return (
      <div className="min-h-screen bg-paper">
        <Topbar />
        <Navbar />
        <div className="max-w-[860px] mx-auto px-4 md:px-8 py-20 text-center">
          <h1 className="font-display text-3xl text-navy mb-4">Jurisdiction Not Found</h1>
          <p className="text-slate mb-6">The jurisdiction you're looking for is not yet in our database.</p>
          <Link to="/global-privacy-authorities" className="text-blue hover:underline">Browse all jurisdictions →</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <Topbar />
      <Navbar />
      <div className="bg-gradient-to-br from-navy-mid to-navy-light py-10 md:py-14 px-4 md:px-8">
        <div className="max-w-[860px] mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-sky mb-4 bg-sky/10 px-3 py-1.5 rounded-full border border-sky/20">
            {jurisdiction.flag} Jurisdiction Profile
          </div>
          <h1 className="font-display text-[28px] md:text-[40px] text-white mb-3">{jurisdiction.name}</h1>
          <p className="text-sm text-slate-light">Region: {jurisdiction.region} · {jurisdiction.authorities.length} regulatory {jurisdiction.authorities.length === 1 ? "authority" : "authorities"}</p>
          <div className="mt-4">
            <FollowButton followType="jurisdiction" followKey={slug!} label={jurisdiction.name} />
          </div>
        </div>
      </div>

      <AdBanner variant="leaderboard" className="py-5" />

      <div className="max-w-[860px] mx-auto px-4 md:px-8 py-10">
        {/* Overview */}
        <div className="bg-card border border-fog rounded-2xl p-5 md:p-8 shadow-eup-sm mb-8">
          <h2 className="font-display text-xl text-navy mb-3">Overview</h2>
          <p className="text-[14px] text-slate leading-relaxed">{jurisdiction.overview}</p>
        </div>

        {/* Authorities */}
        <h2 className="font-display text-xl text-navy mb-4">Regulatory Authorities</h2>
        <div className="space-y-4 mb-10">
          {jurisdiction.authorities.map((auth, i) => (
            <div key={i} className="bg-card border border-fog rounded-xl p-5 shadow-eup-sm">
              {(auth as any).stateName ? (
                <>
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <h3 className="font-display text-[22px] leading-tight text-navy">
                      {(auth as any).stateName}
                    </h3>
                    {(auth as any).statute_status && (
                      <span className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full border ${
                        (auth as any).statute_status === "Enacted"
                          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                          : (auth as any).statute_status === "Pending"
                            ? "text-amber-700 bg-amber-50 border-amber-200"
                            : "text-slate-500 bg-slate-50 border-slate-200"
                      }`}>
                        {(auth as any).statute_status === "None" ? "No Law" : (auth as any).statute_status}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] font-medium text-slate mb-2">{auth.name}</p>
                </>
              ) : (
                <>
                  <h3 className="font-display text-[20px] leading-tight text-navy mb-1">{auth.name}</h3>
                  {auth.abbreviation && <span className="text-[11px] text-slate">{auth.abbreviation}</span>}
                </>
              )}
              {auth.legislation && (
                <div className="text-[12px] text-slate mt-1">
                  <span className="font-semibold text-navy">Statute: </span>{" "}
                  {auth.legislation}
                  {(auth as any).effective_date && (
                    <span className="text-slate/70 ml-1">
                      · Effective{" "}
                      {new Date((auth as any).effective_date)
                        .toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </span>
                  )}
                </div>
              )}
              {(auth as any).notes && (
                <p className="text-[11.5px] text-slate/75 leading-relaxed mt-2 italic">
                  {(auth as any).notes}
                </p>
              )}
              <div className="mt-3 flex gap-4 flex-wrap">
                <a href={auth.website} target="_blank" rel="noopener noreferrer" className="text-[12px] font-medium text-blue hover:underline no-underline">Official Website ↗</a>
                {auth.complaint_portal && (
                  <a href={auth.complaint_portal} target="_blank" rel="noopener noreferrer" className="text-[12px] font-medium text-blue hover:underline no-underline">Complaint Portal ↗</a>
                )}
              </div>
            </div>
          ))}
        </div>

        <AdBanner variant="inline" className="py-4" />

        {/* Recent Developments from category */}
        {devLoading ? (
          <div className="mb-10">
            <h2 className="font-display text-[20px] text-navy mb-1">Recent Developments</h2>
            <p className="text-sm text-slate mb-4">Latest regulatory news from {jurisdiction.name} and its authorities</p>
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        ) : devArticles ? (
          <div className="mb-10">
            <h2 className="font-display text-[20px] text-navy mb-1">Recent Developments</h2>
            <p className="text-sm text-slate mb-4">Latest regulatory news from {jurisdiction.name} and its authorities</p>
            <div className="space-y-2">
              {devArticles.map((a: any) => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 p-3 bg-card border border-fog rounded-xl hover:border-silver transition-all no-underline group"
                >
                  {a.image_url && (
                    <img src={a.image_url} alt="" className="w-[60px] h-[60px] rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold uppercase text-slate tracking-wide mb-0.5">
                      {a.source_domain || a.source_name} · {new Date(a.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                    <p className="text-[13px] font-medium text-navy group-hover:text-blue transition-colors line-clamp-2 mb-0">
                      {a.title}
                    </p>
                    {a.summary && (
                      <p className="text-[12px] text-slate line-clamp-2 mt-0.5 mb-0">{a.summary}</p>
                    )}
                  </div>
                  <ExternalLink size={14} className="text-slate-light group-hover:text-blue transition-colors flex-shrink-0 mt-1" />
                </a>
              ))}
            </div>
            <Link to={`/category/${derivedCategory}`} className="text-[13px] text-blue font-medium no-underline mt-3 inline-block hover:text-navy transition-colors">
              View all updates →
            </Link>
          </div>
        ) : null}

        {/* Related */}
        <div className="border-t border-fog pt-8 mb-8">
          <h3 className="font-display text-lg text-navy mb-4">Related Resources</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link to="/global-privacy-authorities" className="flex items-center gap-2 p-3 bg-card border border-fog rounded-lg hover:bg-fog transition-colors no-underline text-[13px] text-navy font-medium">
              <span className="text-blue">→</span> Global Authority Directory
            </Link>
            <Link to="/enforcement-tracker" className="flex items-center gap-2 p-3 bg-card border border-fog rounded-lg hover:bg-fog transition-colors no-underline text-[13px] text-navy font-medium">
              <span className="text-blue">→</span> Enforcement Tracker
            </Link>
            <Link to="/global-privacy-laws" className="flex items-center gap-2 p-3 bg-card border border-fog rounded-lg hover:bg-fog transition-colors no-underline text-[13px] text-navy font-medium">
              <span className="text-blue">→</span> Global Privacy Laws
            </Link>
            <Link to="/gdpr-enforcement" className="flex items-center gap-2 p-3 bg-card border border-fog rounded-lg hover:bg-fog transition-colors no-underline text-[13px] text-navy font-medium">
              <span className="text-blue">→</span> GDPR Enforcement
            </Link>
          </div>
        </div>

        {/* Premium CTA */}
        <div className="mt-12 bg-gradient-to-br from-navy to-navy-mid rounded-2xl p-6 md:p-8 text-center">
          <div className="text-[10px] font-bold tracking-widest uppercase text-sky mb-2">⭐ Premium Intelligence</div>
          <h3 className="font-display text-xl text-white mb-3">Get weekly updates on {jurisdiction.name}</h3>
          <p className="text-[13px] text-slate-light mb-5 max-w-[500px] mx-auto">Premium subscribers receive a structured weekly intelligence brief covering all developments in this jurisdiction.</p>
          <Link to="/subscribe" className="inline-block px-6 py-3 text-sm font-semibold text-navy bg-white rounded-lg shadow-eup-md hover:-translate-y-0.5 transition-all no-underline">
            View Premium Plans →
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default JurisdictionPage;
