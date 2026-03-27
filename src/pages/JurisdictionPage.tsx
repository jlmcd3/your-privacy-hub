import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import FollowButton from "@/components/FollowButton";
import ExportPDFButton from "@/components/jurisdiction/ExportPDFButton";
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

  // Build individual /jurisdiction/[state-slug] entries for every US state.
  // This enables the globe result links to resolve correctly.
  // All 51 entries are created (50 states + DC) so no slug ever returns "Not Found".
  (usStates as any[]).forEach((s: any) => {
    jurisdictions[s.slug] = {
      name: s.state,
      region: "United States",
      flag: "🇺🇸",
      overview: s.notes ||
        `${s.state} privacy regulation is enforced by the ${s.authority_name}.` +
        (s.statute_name ? ` The primary statute is the ${s.statute_name}.` : " No comprehensive privacy law has been enacted as of 2026."),
      authorities: [{
        name: s.authority_name,
        abbreviation: s.authority_type,
        website: s.website,
        complaint_portal: s.complaint_portal,
        legislation: s.statute_name,
        statute_status: s.statute_status,
        effective_date: s.effective_date,
        notes: s.notes,
      }],
    };
  });

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

const isLikelyNonEnglish = (text: string): boolean => {
  const lower = text.toLowerCase();
  const french = ["le ", "la ", "les ", "de ", "du ", "des ", "délibération", "données", "traitement"].filter(w => lower.includes(w)).length;
  const german = ["der ", "die ", "das ", "datenschutz", "und ", "werden"].filter(w => lower.includes(w)).length;
  const spanish = ["el ", "los ", "protección", "también", "para "].filter(w => lower.includes(w)).length;
  return french >= 3 || german >= 3 || spanish >= 3;
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
      // Fetch a larger pool so we can score relevance properly
      const { data, error } = await (supabase as any)
        .from("updates")
        .select("id,title,summary,url,source_domain,source_name,image_url,category,published_at")
        .eq("category", derivedCategory)
        .order("published_at", { ascending: false })
        .limit(60);

      if (error || !data || data.length === 0) {
        setDevArticles(null);
        setDevLoading(false);
        return;
      }

      // Build a relevance score for each article based on jurisdiction name mentions
      const name = jurisdiction.name.toLowerCase();
      const authorityTerms = jurisdiction.authorities
        .map((a: any) => a.abbreviation?.toLowerCase()).filter(Boolean) as string[];
      const allTerms = [name, ...authorityTerms];

      const scored = data.map((a: any) => {
        const text = ((a.title || "") + " " + (a.summary || "")).toLowerCase();
        const titleLower = (a.title || "").toLowerCase();
        let score = 0;
        if (allTerms.some(t => titleLower.includes(t))) score += 3;
        if (allTerms.some(t => text.includes(t))) score += 1;
        // Recency bonus: articles within 7 days get +1
        const ageMs = Date.now() - new Date(a.published_at).getTime();
        if (ageMs < 7 * 24 * 60 * 60 * 1000) score += 1;
        return { ...a, _score: score, _isExact: score >= 3 };
      });

      const sorted = scored.sort((a: any, b: any) => {
        if (b._score !== a._score) return b._score - a._score;
        return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
      });

      const top8 = sorted.slice(0, 8);
      setDevArticles(top8);
      setDevLoading(false);

      // Translate non-English articles in background
      const nonEnglish = top8.filter((a: any) =>
        isLikelyNonEnglish(a.title + " " + (a.summary || ""))
      );
      if (nonEnglish.length > 0) {
        try {
          const { data: translated } = await supabase.functions.invoke("translate-articles", {
            body: {
              articles: nonEnglish.map((a: any) => ({
                id: a.id, title: a.title, summary: a.summary,
              })),
            },
          });
          if (translated?.articles) {
            const translatedMap = new Map(
              translated.articles.map((t: any) => [t.id, t])
            );
            setDevArticles(prev =>
              prev
                ? prev.map((a: any) =>
                    translatedMap.has(a.id)
                      ? { ...a, ...(translatedMap.get(a.id) as any) }
                      : a
                  )
                : prev
            );
          }
        } catch (e) {
          console.error("Translation failed:", e);
        }
      }
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

  const categoryLabel = derivedCategory === "eu-uk" ? "EU & UK" :
    derivedCategory === "us-federal" ? "U.S. Federal" : "Global";

  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>{jurisdiction.name} Privacy Law & Regulatory Updates | EndUserPrivacy</title>
        <meta name="description" content={`Privacy regulations, data protection authorities, and enforcement updates for ${jurisdiction.name}. Monitor regulatory developments across ${jurisdiction.name}'s privacy authorities.`} />
      </Helmet>
      <Topbar />
      <Navbar />
      <div className="bg-gradient-to-br from-navy-mid to-navy-light py-10 md:py-14 px-4 md:px-8">
        <div className="max-w-[860px] mx-auto">
          <div className="inline-flex items-center gap-1.5 text-blue-300 text-xs font-bold uppercase tracking-widest mb-3">
            <span>🌐</span>
            <span>Jurisdiction Profile</span>
          </div>
          <h1 className="font-display text-[28px] md:text-[40px] text-white mb-3">{jurisdiction.name}</h1>
          <p className="text-sm text-slate-light">Region: {jurisdiction.region} · {jurisdiction.authorities.length} regulatory {jurisdiction.authorities.length === 1 ? "authority" : "authorities"}</p>
          <div className="mt-4 flex items-center gap-3">
            <FollowButton followType="jurisdiction" followKey={slug!} label={jurisdiction.name} />
            <ExportPDFButton jurisdictionName={jurisdiction.name} />
          </div>
        </div>
      </div>

      <AdBanner variant="leaderboard" adSlot="eup-jurisdiction-top" className="py-5" />

      <div className="max-w-[860px] mx-auto px-4 md:px-8 py-10">
        {/* Overview */}
        <div className="bg-card border border-fog rounded-2xl p-5 md:p-8 shadow-eup-sm mb-8">
          <h2 className="font-display text-xl text-navy mb-3">Overview</h2>
          <p className="text-[14px] text-slate leading-relaxed">{jurisdiction.overview}</p>
        </div>

        {/* Key Facts strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Region", value: jurisdiction.region, icon: "🌍" },
            { label: "Authorities", value: `${jurisdiction.authorities.length} regulator${jurisdiction.authorities.length !== 1 ? "s" : ""}`, icon: "🏛️" },
            { label: "Coverage", value: `${categoryLabel} feed`, icon: "📡" },
            { label: "Updates", value: "Daily monitoring", icon: "🔄" },
          ].map((fact) => (
            <div key={fact.label} className="bg-card border border-fog rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">{fact.icon}</div>
              <div className="text-[11px] text-slate-light uppercase tracking-wider mb-0.5">{fact.label}</div>
              <div className="text-[13px] font-bold text-navy">{fact.value}</div>
            </div>
          ))}
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

        <AdBanner variant="inline" adSlot="eup-jurisdiction-mid" className="py-4" />

        {/* Recent Developments from category */}
        {devLoading ? (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display text-[20px] text-navy">Recent Developments</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
                Live
              </span>
            </div>
            <p className="text-sm text-slate mb-4">
              Top stories relevant to {jurisdiction.name} — AI-curated from our daily monitoring
            </p>
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        ) : devArticles ? (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display text-[20px] text-navy">Recent Developments</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
                Live
              </span>
            </div>
            <p className="text-sm text-slate mb-4">
              Top stories relevant to {jurisdiction.name} — AI-curated from our daily monitoring
            </p>
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
                    <img
                      src={a.image_url}
                      alt=""
                      className="w-[60px] h-[60px] rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold uppercase text-slate tracking-wide mb-0.5 flex items-center gap-2 flex-wrap">
                      <span>{a.source_domain || a.source_name}</span>
                      {a.wasTranslated && (
                        <span className="text-[10px] text-slate/60 normal-case">🌐 Translated</span>
                      )}
                      {!a._isExact && (
                        <span className="text-[9px] bg-fog text-slate-light px-1.5 py-0.5 rounded-full normal-case font-normal">
                          Regional
                        </span>
                      )}
                      <span>·</span>
                      <span>
                        {new Date(a.published_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="text-[13px] font-medium text-navy group-hover:text-blue transition-colors line-clamp-2 mb-0">
                      {a.title}
                    </p>
                    {a.summary && (
                      <p className="text-[12px] text-slate line-clamp-2 mt-0.5 mb-0">
                        {a.summary}
                      </p>
                    )}
                  </div>
                  <ExternalLink
                    size={14}
                    className="text-slate-light group-hover:text-blue transition-colors flex-shrink-0 mt-1"
                  />
                </a>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-fog">
              <p className="text-[11px] text-slate-light">
                Showing top {devArticles.length} articles from the {categoryLabel} feed most relevant to {jurisdiction.name}
              </p>
              <Link
                to={`/category/${derivedCategory}`}
                className="text-[13px] text-blue font-semibold no-underline hover:text-navy transition-colors"
              >
                View all {categoryLabel} updates →
              </Link>
            </div>
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

        <AdBanner variant="leaderboard" adSlot="eup-jurisdiction-bottom" className="py-4" />

        {/* Premium CTA */}
        <div className="mt-12 bg-gradient-to-br from-navy to-navy-mid rounded-2xl p-6 md:p-8 text-center">
          <div className="text-[10px] font-bold tracking-widest uppercase text-sky mb-2">⭐ Premium Intelligence</div>
          <h3 className="font-display text-xl text-white mb-3">Get weekly updates on {jurisdiction.name}</h3>
          <p className="text-[13px] text-slate-light mb-2 max-w-[500px] mx-auto">
            Premium subscribers receive the weekly Intelligence Brief covering all global developments.
          </p>
          <p className="text-[12px] text-sky mb-5 max-w-[500px] mx-auto">
            ✦ Premium subscribers get a brief tailored specifically to their industry and chosen jurisdictions — including {jurisdiction.name}.
          </p>
          <Link to="/subscribe" className="inline-block px-6 py-3 text-sm font-semibold text-navy bg-white rounded-lg shadow-eup-md hover:-translate-y-0.5 transition-all no-underline">
            Get Premium — $20/month →
          </Link>
          <p className="mt-3 text-slate-light text-[12px]">
            Not sure yet?{" "}
            <Link to="/sample-brief" className="text-sky hover:text-white transition-colors no-underline underline underline-offset-2">
              See a sample brief first →
            </Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default JurisdictionPage;
