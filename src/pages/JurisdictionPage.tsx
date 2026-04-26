import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { stripHtml, normalizeTitle } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import globalAuthorities from "@/data/global_privacy_authorities.json";
import usStates from "@/data/us_state_privacy_authorities.json";

// Build jurisdiction data from JSON
const buildJurisdictionData = () => {
  const jurisdictions: Record<string, {
    name: string;
    region: string;
    flag: string;
    overview: string;
    authorities: { name: string; abbreviation?: string; website: string; complaint_portal?: string; legislation?: string; statute_status?: string; effective_date?: string; notes?: string; stateName?: string }[];
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
      stateSlug: s.slug,
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
  const staticJurisdiction = slug ? allJurisdictions[slug] : null;
  const [dbFallback, setDbFallback] = useState<any>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const jurisdiction = staticJurisdiction || dbFallback;

  const [directRecent, setDirectRecent] = useState<any[]>([]);
  const [regionalRecent, setRegionalRecent] = useState<any[]>([]);
  const [archive, setArchive] = useState<any[]>([]);
  const [devLoading, setDevLoading] = useState(true);
  const [showRegional, setShowRegional] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const derivedCategory = jurisdiction ? deriveCategory(jurisdiction) : "global";

  // Fallback: if slug isn't in static data, fetch from DB jurisdictions table
  useEffect(() => {
    if (staticJurisdiction || !slug) {
      setDbFallback(null);
      return;
    }
    setFallbackLoading(true);
    setDbFallback(null);
    (supabase as any)
      .from("jurisdictions")
      .select("name, slug, region, law_name, dpa_name, law_status, dla_piper_url")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          const regionFlags: Record<string, string> = {
            "EU & UK": "🇪🇺", "Americas": "🌎", "Asia Pacific": "🌏",
            "Middle East & Africa": "🌍", "Other": "🌐",
          };
          setDbFallback({
            name: data.name,
            region: data.region || "Global",
            flag: regionFlags[data.region] || "🌐",
            overview: `${data.name} privacy regulation${
              data.law_name ? ` is governed by ${data.law_name}` : " is tracked in our global directory"
            }${data.dpa_name ? `, with ${data.dpa_name} as the primary regulatory authority` : ""}.`,
            authorities: data.dpa_name
              ? [{
                  name: data.dpa_name,
                  website: data.dla_piper_url || "",
                  legislation: data.law_name,
                }]
              : [],
          });
        }
        setFallbackLoading(false);
      });
  }, [slug, staticJurisdiction]);


  useEffect(() => {
    if (!jurisdiction) return;
    setDevLoading(true);
    setShowRegional(false);
    setShowArchive(false);

    (async () => {
      const name = jurisdiction.name;
      const nameLower = name.toLowerCase();
      const authorityTerms = jurisdiction.authorities
        .map((a: any) => a.abbreviation?.toLowerCase()).filter(Boolean) as string[];
      const allTerms = [nameLower, ...authorityTerms];

      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const select = "id,title,summary,url,source_domain,source_name,image_url,category,published_at,direct_jurisdictions,affected_jurisdictions";

      // Tier 1: enriched-direct (last 90d)
      const directQ = (supabase as any)
        .from("updates").select(select)
        .contains("direct_jurisdictions", [name])
        .gte("published_at", ninetyDaysAgo)
        .order("published_at", { ascending: false })
        .limit(20);

      // Tier 2: enriched-affected only (last 90d)
      const affectedQ = (supabase as any)
        .from("updates").select(select)
        .contains("affected_jurisdictions", [name])
        .gte("published_at", ninetyDaysAgo)
        .order("published_at", { ascending: false })
        .limit(20);

      // Keyword fallback pool (for unenriched + archive). Scoped to category bucket.
      const kwPoolQ = (supabase as any)
        .from("updates").select(select)
        .eq("category", derivedCategory)
        .order("published_at", { ascending: false })
        .limit(120);

      const [{ data: directData }, { data: affectedData }, { data: poolData }] =
        await Promise.all([directQ, affectedQ, kwPoolQ]);

      const matchesKeyword = (a: any) => {
        const text = ((a.title || "") + " " + (a.summary || "")).toLowerCase();
        return allTerms.some(t => t && text.includes(t));
      };

      const seen = new Set<string>();
      const direct: any[] = [];
      const regional: any[] = [];
      const archiveList: any[] = [];
      const ninetyMs = Date.now() - 90 * 24 * 60 * 60 * 1000;

      const pushUnique = (bucket: any[], a: any) => {
        if (!seen.has(a.id)) { seen.add(a.id); bucket.push(a); }
      };

      (directData || []).forEach((a: any) => pushUnique(direct, a));

      (affectedData || []).forEach((a: any) => {
        if (!seen.has(a.id)) pushUnique(regional, a);
      });

      // Keyword pass over the broader pool (catches unenriched articles)
      (poolData || []).forEach((a: any) => {
        if (seen.has(a.id)) return;
        if (!matchesKeyword(a)) return;
        const ts = new Date(a.published_at).getTime();
        const isDirectByEnrichment = a.direct_jurisdictions?.includes?.(name);
        const isAffectedByEnrichment = a.affected_jurisdictions?.includes?.(name);
        if (ts >= ninetyMs) {
          if (isAffectedByEnrichment && !isDirectByEnrichment) pushUnique(regional, a);
          else pushUnique(direct, a);
        } else {
          pushUnique(archiveList, a);
        }
      });

      // Also consider direct-enriched older items as archive (separate small fetch)
      const { data: oldDirect } = await (supabase as any)
        .from("updates").select(select)
        .contains("direct_jurisdictions", [name])
        .lt("published_at", ninetyDaysAgo)
        .order("published_at", { ascending: false })
        .limit(20);
      (oldDirect || []).forEach((a: any) => pushUnique(archiveList, a));

      const sortByDate = (arr: any[]) =>
        arr.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

      setDirectRecent(sortByDate(direct).slice(0, 8));
      setRegionalRecent(sortByDate(regional).slice(0, 10));
      setArchive(sortByDate(archiveList).slice(0, 20));
      setDevLoading(false);

      // Translate non-English titles in the visible direct tier
      const visibleDirect = sortByDate(direct).slice(0, 8);
      const nonEnglish = visibleDirect.filter((a: any) =>
        isLikelyNonEnglish(a.title + " " + (a.summary || ""))
      );
      if (nonEnglish.length > 0) {
        try {
          const { data: translated } = await supabase.functions.invoke("translate-articles", {
            body: { articles: nonEnglish.map((a: any) => ({ id: a.id, title: a.title, summary: a.summary })) },
          });
          if (translated?.articles) {
            const tMap = new Map(translated.articles.map((t: any) => [t.id, t]));
            setDirectRecent(prev => prev.map((a: any) =>
              tMap.has(a.id) ? { ...a, ...(tMap.get(a.id) as any) } : a
            ));
          }
        } catch (e) {
          console.error("Translation failed:", e);
        }
      }
    })();
  }, [jurisdiction, derivedCategory]);

  if (!jurisdiction) {
    if (fallbackLoading) {
      return (
        <div className="min-h-screen bg-paper">
          <Navbar />
          <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            <p className="text-slate">Loading jurisdiction…</p>
          </div>
          <Footer />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-paper">
        <Navbar />
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
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
      <Navbar />
      <div className="bg-gradient-to-br from-navy-mid to-navy-light py-6 md:py-8 px-4 md:px-8">
        <div className="max-w-[860px] mx-auto">
          <div className="inline-flex items-center gap-1.5 text-blue-300 text-xs font-bold uppercase tracking-widest mb-2">
            <span>🌐</span>
            <span>Jurisdiction Profile</span>
          </div>
          <h1 className="font-display text-[28px] md:text-[40px] text-white mb-2">{jurisdiction.name}</h1>
          <p className="text-sm text-slate-light">Region: {jurisdiction.region} · {jurisdiction.authorities.length} regulatory {jurisdiction.authorities.length === 1 ? "authority" : "authorities"}</p>
        </div>
      </div>

      <AdBanner variant="leaderboard" adSlot="eup-jurisdiction-top" className="py-5" />

      <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
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
                      <Link to={`/jurisdiction/${(auth as any).stateSlug}`} className="hover:underline">
                        {(auth as any).stateName}
                      </Link>
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

        {/* Recent Developments — tiered by relevance */}
        {(() => {
          const ArticleRow = ({ a, tag }: { a: any; tag?: string }) => (
            <a
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-3 p-3 bg-card border border-fog rounded-xl hover:border-silver transition-all no-underline group"
            >
              {a.image_url && (
                <img src={a.image_url} alt="" className="w-[60px] h-[60px] rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold uppercase text-slate tracking-wide mb-0.5 flex items-center gap-2 flex-wrap">
                  <span>{a.source_domain || a.source_name}</span>
                  {a.wasTranslated && <span className="text-[10px] text-slate/60 normal-case">🌐 Translated</span>}
                  {tag && (
                    <span className="text-[9px] bg-fog text-slate-light px-1.5 py-0.5 rounded-full normal-case font-normal">{tag}</span>
                  )}
                  <span>·</span>
                  <span>{new Date(a.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                <p className="text-[13px] font-medium text-navy group-hover:text-blue transition-colors line-clamp-2 mb-0">
                  {normalizeTitle(a.title)}
                </p>
                {a.summary && (
                  <p className="text-[12px] text-slate line-clamp-3 mt-0.5 mb-0">{stripHtml(a.summary)}</p>
                )}
              </div>
              <ExternalLink size={14} className="text-slate-light group-hover:text-blue transition-colors flex-shrink-0 mt-1" />
            </a>
          );

          if (devLoading) {
            return (
              <div className="mb-10">
                <h2 className="font-display text-[20px] text-navy mb-1">Recent Developments</h2>
                <p className="text-sm text-slate mb-4">Top stories relevant to {jurisdiction.name}</p>
                <div className="flex flex-col gap-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
                </div>
              </div>
            );
          }

          const hasDirect = directRecent.length > 0;
          const hasRegional = regionalRecent.length > 0;
          const hasArchive = archive.length > 0;

          return (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display text-[20px] text-navy">
                  {hasDirect ? `Recent developments — ${jurisdiction.name}` : "Recent Developments"}
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">Live</span>
              </div>

              {hasDirect ? (
                <>
                  <p className="text-sm text-slate mb-4">
                    Articles from the last 90 days that directly cover {jurisdiction.name}.
                  </p>
                  <div className="space-y-2">
                    {directRecent.map((a) => <ArticleRow key={a.id} a={a} />)}
                  </div>
                </>
              ) : (
                <div className="bg-card border border-fog rounded-2xl p-6 mt-2">
                  <h3 className="font-display text-[18px] text-navy mb-2">No recent direct coverage of {jurisdiction.name}</h3>
                  <p className="text-[13px] text-slate leading-relaxed mb-4">
                    We haven't picked up jurisdiction-specific news in the last 90 days. This usually means the regulator hasn't
                    published high-profile actions recently — not that nothing is happening. Try the options below.
                  </p>
                  <div className="flex flex-wrap gap-3 text-[12px] font-medium">
                    {hasRegional && (
                      <button onClick={() => setShowRegional(true)} className="text-blue hover:underline">
                        See {regionalRecent.length} regional / spillover {regionalRecent.length === 1 ? "article" : "articles"} ↓
                      </button>
                    )}
                    {hasArchive && (
                      <button onClick={() => setShowArchive(true)} className="text-blue hover:underline">
                        Browse earlier coverage ↓
                      </button>
                    )}
                    {jurisdiction.authorities[0]?.website && (
                      <a href={jurisdiction.authorities[0].website} target="_blank" rel="noopener noreferrer" className="text-blue hover:underline">
                        Visit {jurisdiction.authorities[0].abbreviation || "regulator"} site ↗
                      </a>
                    )}
                  </div>
                </div>
              )}

              {hasRegional && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowRegional((v) => !v)}
                    className="w-full flex items-center justify-between text-left py-2 border-t border-fog hover:text-blue transition-colors"
                  >
                    <div>
                      <span className="font-display text-[16px] text-navy">Also relevant to {jurisdiction.name}</span>
                      <p className="text-[11.5px] text-slate-light mt-0.5">
                        Regional or cross-border developments that may affect {jurisdiction.name} ({regionalRecent.length})
                      </p>
                    </div>
                    <span className="text-slate text-sm">{showRegional ? "−" : "+"}</span>
                  </button>
                  {showRegional && (
                    <div className="space-y-2 mt-3">
                      {regionalRecent.map((a) => <ArticleRow key={a.id} a={a} tag="Regional" />)}
                    </div>
                  )}
                </div>
              )}

              {hasArchive && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowArchive((v) => !v)}
                    className="w-full flex items-center justify-between text-left py-2 border-t border-fog hover:text-blue transition-colors"
                  >
                    <div>
                      <span className="font-display text-[16px] text-navy">Earlier coverage</span>
                      <p className="text-[11.5px] text-slate-light mt-0.5">
                        Older than 90 days ({archive.length})
                      </p>
                    </div>
                    <span className="text-slate text-sm">{showArchive ? "−" : "+"}</span>
                  </button>
                  {showArchive && (
                    <div className="space-y-2 mt-3">
                      {archive.map((a) => <ArticleRow key={a.id} a={a} tag="Archive" />)}
                    </div>
                  )}
                </div>
              )}

              {(hasDirect || hasRegional || hasArchive) && (
                <div className="flex items-center justify-end mt-4 pt-3 border-t border-fog">
                  <Link to={`/category/${derivedCategory}`} className="text-[13px] text-blue font-semibold no-underline hover:text-navy transition-colors">
                    View all {categoryLabel} updates →
                  </Link>
                </div>
              )}
            </div>
          );
        })()}

        {/* Related */}
        <div className="border-t border-fog pt-8 mb-8">
          <h3 className="font-display text-lg text-navy mb-4">Related Resources</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(() => {
              const isEU = derivedCategory === "eu-uk";
              const isUS = derivedCategory === "us-federal" || jurisdiction.region === "United States";
              const resources: { icon: string; iconImage?: string; label: string; href: string }[] = [];

              if (isUS) {
                resources.push({ icon: "", iconImage: "/us-flag.svg", label: "U.S. Privacy Laws", href: "/us-privacy-laws" });
                resources.push({ icon: "🏛️", label: "U.S. State Authorities", href: "/us-state-privacy-authorities" });
              }
              if (isEU) {
                resources.push({ icon: "⚖️", label: "GDPR & UK", href: "/gdpr-enforcement" });
              }

              resources.push({ icon: "🌐", label: "Global Privacy Laws", href: "/global-privacy-laws" });
              resources.push({ icon: "🌍", label: "Global Privacy Authorities", href: "/global-privacy-authorities" });
              resources.push({ icon: "📊", label: "Enforcement Tracker", href: "/enforcement-tracker" });
              resources.push({ icon: "👁️", label: "Biometric Data", href: "/biometric-privacy" });
              resources.push({ icon: "🌐", label: "Data Transfers", href: "/cross-border-transfers" });
              resources.push({ icon: "🤖", label: "AI Privacy Regulations", href: "/ai-privacy-regulations" });

              return resources.slice(0, 6).map((r) => (
                <Link
                  key={r.label}
                  to={r.href}
                  className="flex items-center gap-2.5 p-3 bg-card border border-fog rounded-lg hover:bg-fog transition-colors no-underline text-[13px] text-navy font-medium"
                >
                  {r.iconImage ? (
                    <img src={r.iconImage} alt="" className="w-4 h-3 object-cover rounded-[2px]" />
                  ) : (
                    <span className="text-base">{r.icon}</span>
                  )}
                  <span>{r.label}</span>
                </Link>
              ));
            })()}
          </div>
        </div>

        <AdBanner variant="leaderboard" adSlot="eup-jurisdiction-bottom" className="py-4" />

        {/* Premium CTA */}
        <div className="mt-12 bg-gradient-to-br from-navy to-navy-mid rounded-2xl p-6 md:p-8 text-center">
          <div className="text-[10px] font-bold tracking-widest uppercase text-sky mb-2">⭐ Intelligence Intelligence</div>
          <h3 className="font-display text-xl text-white mb-3">Get weekly updates on {jurisdiction.name}</h3>
          <p className="text-[13px] text-slate-light mb-2 max-w-[500px] mx-auto">
            Intelligence subscribers receive the weekly Intelligence Brief covering all global developments.
          </p>
          <p className="text-[12px] text-sky mb-5 max-w-[500px] mx-auto">
            ✦ Intelligence subscribers get a brief tailored specifically to their industry and chosen jurisdictions — including {jurisdiction.name}.
          </p>
          <Link to="/subscribe" className="inline-block px-6 py-3 text-sm font-semibold text-navy bg-white rounded-lg shadow-eup-md hover:-translate-y-0.5 transition-all no-underline">
            Get full intelligence — $39/month →
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
