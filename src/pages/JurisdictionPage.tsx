import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ExternalLink, BarChart3, Bot, Eye, Globe, Landmark, Scale, Star } from 'lucide-react';
import { Helmet } from "react-helmet-async";
import { stripHtml, normalizeTitle } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SourceMethodology from "@/components/research/SourceMethodology";
import { TieredFeed } from "@/components/TieredFeed";
import { useAuth } from "@/hooks/useAuth";
import globalAuthorities from "@/data/global_privacy_authorities.json";
import usStates from "@/data/us_state_privacy_authorities.json";
import { INTELLIGENCE_PRICING } from "@/config/pricing";
import { useStateLawOverrides } from "@/hooks/useStateLawOverrides";

// Build jurisdiction data from JSON
const buildJurisdictionData = () => {
  const jurisdictions: Record<string, {
    name: string;
    region: string;
    flag: string;
    overview: string;
    authorities: { name: string; abbreviation?: string; website: string; complaint_portal?: string; legislation?: string; statute_url?: string; statute_status?: string; effective_date?: string; regulations_name?: string; regulations_url?: string; notes?: string; stateName?: string }[];
  }> = {};

  const regionFlags: Record<string, string> = {
    "European Union": "🇪🇺", "United Kingdom": "🇬🇧", "Canada": "🇨🇦",
    "Asia-Pacific": "", "Latin America": "", "Middle East & Africa": "", "Other Notable": "",
  };

  (globalAuthorities as any[]).forEach((region: any) => {
    region.entries.forEach((entry: any) => {
      const slug = entry.country.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      if (!jurisdictions[slug]) {
        jurisdictions[slug] = {
          name: entry.country,
          region: region.region,
          flag: regionFlags[region.region] || "",
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
      statute_url: s.statute_url,
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
        (s.statute_name ? "" : " No comprehensive privacy law has been enacted as of 2026."),
      authorities: [{
        name: s.authority_name,
        abbreviation: s.authority_type,
        website: s.website,
        complaint_portal: s.complaint_portal,
        legislation: s.statute_name,
        statute_url: s.statute_url,
        statute_status: s.statute_status,
        effective_date: s.effective_date,
        regulations_name: s.regulations_name,
        regulations_url: s.regulations_url,
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
  const { user } = useAuth();
  const baseJurisdiction = slug ? allJurisdictions[slug] : null;
  const overrides = useStateLawOverrides();
  const staticJurisdiction = (() => {
    if (!baseJurisdiction || !slug) return baseJurisdiction;
    const ov = overrides.get(slug);
    if (!ov) return baseJurisdiction;
    return {
      ...baseJurisdiction,
      authorities: baseJurisdiction.authorities.map((a, i) =>
        i === 0
          ? {
              ...a,
              name: ov.authority_name || a.name,
              legislation: ov.statute_name || a.legislation,
              statute_url: ov.statute_url || (a as any).statute_url,
              statute_status: ov.statute_status || (a as any).statute_status,
              effective_date: ov.effective_date || (a as any).effective_date,
            }
          : a,
      ),
    };
  })();
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
            "EU & UK": "🇪🇺", "Americas": "", "Asia Pacific": "",
            "Middle East & Africa": "", "Other": "",
          };
          setDbFallback({
            name: data.name,
            region: data.region || "Global",
            flag: regionFlags[data.region] || "",
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
      // Enrichment arrays store lowercase kebab-case slugs (e.g. "california",
      // "united-kingdom", "us-federal"), so we must match against the slug —
      // not the display name — for `direct_jurisdictions` / `affected_jurisdictions`.
      const enrichmentSlug = nameLower.replace(/\s+/g, "-");
      const ENRICHMENT_ALIASES: Record<string, string[]> = {
        "european-union": ["eu"],
        "united-states": ["us-federal", "us"],
        "united-kingdom": ["uk"],
      };
      const aliases = ENRICHMENT_ALIASES[enrichmentSlug] ?? [];
      const enrichmentMatchValues = Array.from(
        new Set([enrichmentSlug, nameLower, name, ...aliases])
      );
      const authorityTerms = jurisdiction.authorities
        .map((a: any) => a.abbreviation?.toLowerCase()).filter(Boolean) as string[];
      const allTerms = [nameLower, ...authorityTerms];

      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const select = "id,title,summary,url,source_domain,source_name,image_url,category,published_at,direct_jurisdictions,affected_jurisdictions,attention_level,affected_sectors,regulatory_theory,related_development,enrichment_version,why_it_matters_short,related_signals,action_items,ai_summary";

      // Tier 1: enriched-direct (last 90d) — match against any slug variant
      const directQ = (supabase as any)
        .from("updates").select(select)
        .eq("is_hidden", false)
        .overlaps("direct_jurisdictions", enrichmentMatchValues)
        .gte("published_at", ninetyDaysAgo)
        .order("published_at", { ascending: false })
        .limit(20);

      // Tier 2: enriched-affected only (last 90d)
      const affectedQ = (supabase as any)
        .from("updates").select(select)
        .eq("is_hidden", false)
        .overlaps("affected_jurisdictions", enrichmentMatchValues)
        .gte("published_at", ninetyDaysAgo)
        .order("published_at", { ascending: false })
        .limit(20);

      // Keyword fallback pool (for unenriched + archive). Scoped to category bucket.
      const kwPoolQ = (supabase as any)
        .from("updates").select(select)
        .eq("is_hidden", false)
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
        const matchesEnrichment = (arr: any) =>
          Array.isArray(arr) && arr.some((v: any) => enrichmentMatchValues.includes(v));
        const isDirectByEnrichment = matchesEnrichment(a.direct_jurisdictions);
        const isAffectedByEnrichment = matchesEnrichment(a.affected_jurisdictions);
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
        .eq("is_hidden", false)
        .overlaps("direct_jurisdictions", enrichmentMatchValues)
        .lt("published_at", ninetyDaysAgo)
        .order("published_at", { ascending: false })
        .limit(20);
      (oldDirect || []).forEach((a: any) => pushUnique(archiveList, a));

      const sortByDate = (arr: any[]) =>
        arr.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

      const sortedDirect = sortByDate(direct).slice(0, 8);
      const sortedRegional = sortByDate(regional).slice(0, 10);
      setDirectRecent(sortedDirect);
      setRegionalRecent(sortedRegional);
      setArchive(sortByDate(archiveList).slice(0, 20));
      // Auto-expand "Also relevant" when there's no direct coverage
      setShowRegional(sortedDirect.length === 0 && sortedRegional.length > 0);
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
        <div className="min-h-screen bg-brand-cloud">
          <Navbar />
          <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            <p className="text-slate">Loading jurisdiction…</p>
          </div>
          <Footer />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-brand-cloud">
        <Navbar />
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="font-display text-brand-navy mb-4">Jurisdiction Not Found</h1>
          <p className="text-slate mb-6">The jurisdiction you're looking for is not yet in our database.</p>
          <Link to="/global-privacy-authorities" className="text-brand-teal-text hover:underline">Browse all jurisdictions →</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const categoryLabel = derivedCategory === "eu-uk" ? "EU & UK" :
    derivedCategory === "us-federal" ? "U.S. Federal" : "Global";

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Helmet>
        <title>{jurisdiction.name} Privacy Law & Regulatory Updates | End User Privacy</title>
        <meta name="description" content={`Privacy regulations, data protection authorities, and enforcement updates for ${jurisdiction.name}. Monitor regulatory developments across ${jurisdiction.name}'s privacy authorities.`} />
        <link rel="canonical" href={`https://enduserprivacy.com/jurisdiction/${slug}`} />
        <meta property="og:title" content={`${jurisdiction.name} Privacy Law & Regulatory Updates`} />
        <meta property="og:description" content={`Privacy regulations, data protection authorities, and enforcement updates for ${jurisdiction.name}.`} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: `${jurisdiction.name} Data Privacy Law & Regulator Guide`,
          description: jurisdiction.overview,
          publisher: { "@type": "Organization", name: "End User Privacy" },
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://enduserprivacy.com/" },
            { "@type": "ListItem", position: 2, name: "Global Privacy Laws", item: "https://enduserprivacy.com/global-privacy-laws" },
            { "@type": "ListItem", position: 3, name: jurisdiction.name, item: `https://enduserprivacy.com/jurisdiction/${slug}` },
          ],
        })}</script>
      </Helmet>
      <Navbar />
      {(() => {
        const isUSState = jurisdiction.region === "United States" && slug !== "united-states";
        const crumbHref = isUSState ? "/us-privacy-laws" : "/global-privacy-laws";
        const crumbLabel = isUSState ? "U.S. Privacy Laws" : "Global Privacy Laws";
        return (
          <nav aria-label="Breadcrumb" className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 text-sm text-slate">
            <Link to={crumbHref} className="text-brand-teal-text hover:underline no-underline">{crumbLabel}</Link>
            <span className="mx-2 text-brand-mist">›</span>
            <span className="text-brand-navy">{jurisdiction.name}</span>
          </nav>
        );
      })()}
      <div className="bg-gradient-to-br from-brand-ocean to-brand-slate-teal py-6 md:py-8 px-4 md:px-8">
        <div className="max-w-[860px] mx-auto">
          <div className="inline-flex items-center gap-1.5 text-blue-300 text-xs font-bold uppercase tracking-widest mb-2">
            <span><Globe aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /></span>
            <span>Jurisdiction Profile</span>
          </div>
          <h1 className="font-display text-white mb-2">{jurisdiction.name}</h1>
          <p className="text-sm text-brand-mist">Region: {jurisdiction.region} · {jurisdiction.authorities.length} regulatory {jurisdiction.authorities.length === 1 ? "authority" : "authorities"}</p>
        </div>
      </div>


      <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Overview */}
        <div className="bg-card border border-brand-cloud rounded-2xl p-5 md:p-8 shadow-eup-sm mb-8">
          <h2 className="font-display text-brand-navy mb-3">Overview</h2>
          <p className="text-sm text-slate leading-relaxed">{jurisdiction.overview}</p>
        </div>

        {/* Authorities */}
        <h2 className="font-display text-brand-navy mb-4">Regulatory Authorities</h2>
        <div className="space-y-4 mb-10">
          {jurisdiction.authorities.map((auth, i) => (
            <div key={i} className="bg-card border border-brand-cloud rounded-xl p-5 shadow-eup-sm">
              {(auth as any).stateName ? (
                <>
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <h3 className="leading-tight text-brand-navy">
                      <Link to={`/jurisdiction/${(auth as any).stateSlug}`} className="hover:underline">
                        {(auth as any).stateName}
                      </Link>
                    </h3>
                    {(auth as any).statute_status && (
                      <span className={`text-eyebrow px-2.5 py-1 rounded-full border ${
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
                  <p className="text-meta font-medium text-slate mb-2">{auth.name}</p>
                </>
              ) : (
                <>
                  <h3 className="leading-tight text-brand-navy mb-1">{auth.name}</h3>
                  {auth.abbreviation && <span className="text-meta text-slate">{auth.abbreviation}</span>}
                </>
              )}
              {auth.legislation && (
                <div className="text-meta text-slate mt-1">
                  <span className="font-semibold text-brand-navy">Statute: </span>{" "}
                  {auth.statute_url ? (
                    <a
                      href={auth.statute_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-teal-text hover:underline no-underline font-medium inline-flex items-center gap-1"
                    >
                      {auth.legislation}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span>{auth.legislation}</span>
                  )}
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
                <p className="text-xs text-slate/75 leading-relaxed mt-2 italic">
                  {(auth as any).notes}
                </p>
              )}
              <div className="mt-3 flex gap-4 flex-wrap">
                <a href={auth.website} target="_blank" rel="noopener noreferrer" className="text-meta font-medium text-brand-teal-text hover:underline no-underline">Official Website ↗</a>
                {(auth as any).regulations_url && (
                  <a href={(auth as any).regulations_url} target="_blank" rel="noopener noreferrer" className="text-meta font-medium text-brand-teal-text hover:underline no-underline">{(auth as any).regulations_name || "Regulations"} ↗</a>
                )}
                {auth.complaint_portal && (
                  <a href={auth.complaint_portal} target="_blank" rel="noopener noreferrer" className="text-meta font-medium text-brand-teal-text hover:underline no-underline">Complaint Portal ↗</a>
                )}
              </div>
            </div>
          ))}
        </div>


        {/* Compliance tools — only for jurisdictions with an enacted law */}
        {(() => {
          const isUSState = jurisdiction.region === "United States" && slug !== "united-states";
          const firstAuth: any = jurisdiction.authorities[0] || {};
          const usEnacted = isUSState && firstAuth.statute_status === "Enacted";
          const statuteText = (firstAuth.legislation || "").toLowerCase();
          const isGdprAligned =
            !isUSState &&
            (derivedCategory === "eu-uk" || statuteText.includes("gdpr")) &&
            !!firstAuth.legislation;

          if (!usEnacted && !isGdprAligned) return null;

          type Tool = { label: string; desc: string; href: string };
          const tools: Tool[] = [];
          if (usEnacted) {
            tools.push({
              label: "GDPR Governance Assessment",
              desc: "Assess your organisation's privacy programme posture.",
              href: "/governance-assessment",
            });
            tools.push({
              label: "US Privacy Notice Generator",
              desc: `Generate a privacy notice that complies with ${jurisdiction.name} and other applicable state laws.`,
              href: "/us-notices",
            });
            if (slug === "california") {
              tools.push({
                label: "CPPA Scope Checker",
                desc: "Find out whether CPPA audit obligations apply to your business.",
                href: "/cppa-scope-checker",
              });
              tools.push({
                label: "CPPA Risk Assessment",
                desc: "Build a CPPA-ready privacy risk assessment.",
                href: "/cppa-risk-assessment",
              });
            }
          } else if (isGdprAligned) {
            tools.push({
              label: "EU & Global Privacy Notice Generator",
              desc: "Generate a GDPR-compliant privacy notice under Article 13/14.",
              href: "/eu-notices",
            });
            tools.push({
              label: "Legitimate Interest Assessment",
              desc: "Document your legitimate interest basis before you rely on it.",
              href: "/li-assessment",
            });
            tools.push({
              label: "Impact Assessment Builder",
              desc: "Build a Data Protection Impact Assessment under Article 35.",
              href: "/dpia-framework",
            });
          }

          return (
            <div className="mb-10">
              <h2 className="font-display text-brand-navy mb-4">
                Compliance tools for {jurisdiction.name}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tools.map((t) => (
                  <Link
                    key={t.href}
                    to={t.href}
                    className="group block p-4 bg-brand-mist/5 border border-brand-mist/30 rounded-xl hover:border-brand-teal hover:bg-brand-mist/10 transition-colors no-underline"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-display text-[15px] text-brand-navy">{t.label}</span>
                      <span className="text-brand-teal-text group-hover:translate-x-0.5 transition-transform">→</span>
                    </div>
                    <p className="text-xs text-slate leading-snug">{t.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Top Premium CTA — anonymous only, high-intent SEO traffic */}
        {!user && (
          <div className="mb-8 bg-gradient-to-br from-brand-navy to-brand-ocean rounded-2xl p-6 md:p-7 text-center">
            <div className="text-eyebrow text-brand-mist mb-2">⭐ Intelligence</div>
            <h3 className="text-white mb-3">
              Monitor {jurisdiction.name} — get weekly intelligence alerts →
            </h3>
            <p className="text-sm text-brand-mist mb-4 max-w-[500px] mx-auto">
              Tailored weekly briefs covering {jurisdiction.name} regulators, enforcement, and cross-border signals.
            </p>
            <Link
              to="/subscribe"
              className="inline-block px-5 py-2.5 text-sm font-semibold text-brand-navy bg-white rounded-lg shadow-eup-md hover:-translate-y-0.5 transition-all no-underline"
            >
              Get full intelligence — {`${INTELLIGENCE_PRICING.monthly()}`} →
            </Link>
          </div>
        )}

        {/* Recent Developments — tier-aware (Intelligence Cards for premium, why-it-matters for registered) */}
        {(() => {
          if (devLoading) {
            return (
              <div className="mb-10">
                <h2 className="font-display text-brand-navy mb-1">Recent Developments</h2>
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
                <h2 className="font-display text-brand-navy">
                  {hasDirect ? `Recent developments — ${jurisdiction.name}` : "Recent Developments"}
                </h2>
                <span className="text-eyebrow text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">Live</span>
              </div>

              {hasDirect ? (
                <>
                  <p className="text-sm text-slate mb-4">
                    Articles from the last 90 days that directly cover {jurisdiction.name}.
                  </p>
                  <TieredFeed articles={directRecent as any} showSeeAll={false} />
                </>
              ) : (
                <div className="bg-card border border-brand-cloud rounded-2xl p-6 mt-2">
                  <h3 className="text-brand-navy mb-2">No recent direct coverage of {jurisdiction.name}</h3>
                  <p className="text-sm text-slate leading-relaxed mb-4">
                    We haven't picked up jurisdiction-specific news in the last 90 days. This usually means the regulator hasn't
                    published high-profile actions recently — not that nothing is happening. Try the options below.
                  </p>
                  <div className="flex flex-wrap gap-3 text-meta font-medium">
                    {hasRegional && (
                      <button onClick={() => setShowRegional(true)} className="text-brand-teal-text hover:underline">
                        See {regionalRecent.length} regional / spillover {regionalRecent.length === 1 ? "article" : "articles"} ↓
                      </button>
                    )}
                    {hasArchive && (
                      <button onClick={() => setShowArchive(true)} className="text-brand-teal-text hover:underline">
                        Browse earlier coverage ↓
                      </button>
                    )}
                    {jurisdiction.authorities[0]?.website && (
                      <a href={jurisdiction.authorities[0].website} target="_blank" rel="noopener noreferrer" className="text-brand-teal-text hover:underline">
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
                    className="w-full flex items-center justify-between text-left py-2 border-t border-brand-cloud hover:text-brand-teal-text transition-colors"
                  >
                    <div>
                      <span className="font-display text-base text-brand-navy">Also relevant to {jurisdiction.name}</span>
                      <p className="text-xs text-brand-mist mt-0.5">
                        Regional or cross-border developments that may affect {jurisdiction.name} ({regionalRecent.length})
                      </p>
                    </div>
                    <span className="text-slate text-sm">{showRegional ? "−" : "+"}</span>
                  </button>
                  {showRegional && (
                    <div className="mt-3">
                      <TieredFeed articles={regionalRecent as any} showSeeAll={false} />
                    </div>
                  )}
                </div>
              )}

              {hasArchive && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowArchive((v) => !v)}
                    className="w-full flex items-center justify-between text-left py-2 border-t border-brand-cloud hover:text-brand-teal-text transition-colors"
                  >
                    <div>
                      <span className="font-display text-base text-brand-navy">Earlier coverage</span>
                      <p className="text-xs text-brand-mist mt-0.5">
                        Older than 90 days ({archive.length})
                      </p>
                    </div>
                    <span className="text-slate text-sm">{showArchive ? "−" : "+"}</span>
                  </button>
                  {showArchive && (
                    <div className="mt-3">
                      <TieredFeed articles={archive as any} showSeeAll={false} />
                    </div>
                  )}
                </div>
              )}

              {(hasDirect || hasRegional || hasArchive) && (
                <div className="flex items-center justify-end mt-4 pt-3 border-t border-brand-cloud">
                  <Link to={`/category/${derivedCategory}`} className="text-sm text-brand-teal-text font-semibold no-underline hover:text-brand-navy transition-colors">
                    View all {categoryLabel} updates →
                  </Link>
                </div>
              )}
            </div>
          );
        })()}

        {/* Related */}
        <div className="border-t border-brand-cloud pt-8 mb-8">
          <h3 className="text-brand-navy mb-4">Related Resources</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(() => {
              const isEU = derivedCategory === "eu-uk";
              const isUS = derivedCategory === "us-federal" || jurisdiction.region === "United States";
              const resources: { icon: React.ReactNode; iconImage?: string; label: string; href: string }[] = [];
              const rIcon = "w-4 h-4 text-brand-teal";

              if (isUS) {
                resources.push({ icon: null, iconImage: "/us-flag.svg", label: "U.S. Privacy Laws", href: "/us-privacy-laws" });
                resources.push({ icon: <Landmark aria-hidden="true" strokeWidth={1.75} className={rIcon} />, label: "U.S. State Authorities", href: "/us-state-privacy-authorities" });
              }
              if (isEU) {
                resources.push({ icon: <Scale aria-hidden="true" strokeWidth={1.75} className={rIcon} />, label: "GDPR & UK", href: "/gdpr-enforcement" });
              }

              resources.push({ icon: <Globe aria-hidden="true" strokeWidth={1.75} className={rIcon} />, label: "Global Privacy Laws", href: "/global-privacy-laws" });
              resources.push({ icon: <Globe aria-hidden="true" strokeWidth={1.75} className={rIcon} />, label: "Global Privacy Authorities", href: "/global-privacy-authorities" });
              resources.push({ icon: <BarChart3 aria-hidden="true" strokeWidth={1.75} className={rIcon} />, label: "Enforcement Tracker", href: "/enforcement-tracker" });
              resources.push({ icon: <Eye aria-hidden="true" strokeWidth={1.75} className={rIcon} />, label: "Biometric Data", href: "/biometric-privacy" });
              resources.push({ icon: <Globe aria-hidden="true" strokeWidth={1.75} className={rIcon} />, label: "Data Transfers", href: "/cross-border-transfers" });
              resources.push({ icon: <Bot aria-hidden="true" strokeWidth={1.75} className={rIcon} />, label: "AI Privacy Regulations", href: "/ai-privacy-regulations" });

              return resources.slice(0, 6).map((r) => (
                <Link
                  key={r.label}
                  to={r.href}
                  className="flex items-center gap-2.5 p-3 bg-card border border-brand-cloud rounded-lg hover:bg-brand-cloud transition-colors no-underline text-sm text-brand-navy font-medium"
                >
                  {r.iconImage ? (
                    <img src={r.iconImage} alt="" className="w-4 h-3 object-cover rounded-[2px]" />
                  ) : (
                    r.icon
                  )}
                  <span>{r.label}</span>
                </Link>
              ));
            })()}
          </div>
        </div>


        {/* Premium CTA */}
        <div className="mt-12 bg-gradient-to-br from-brand-navy to-brand-ocean rounded-2xl p-6 md:p-8 text-center">
          <div className="text-eyebrow text-brand-mist mb-2">⭐ Intelligence</div>
          <h3 className="text-white mb-3">Get weekly updates on {jurisdiction.name}</h3>
          <p className="text-sm text-brand-mist mb-2 max-w-[500px] mx-auto">
            Intelligence subscribers receive the weekly Privacy Intelligence Report covering all global developments.
          </p>
          <p className="text-meta text-brand-mist mb-5 max-w-[500px] mx-auto">
            <Star aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Intelligence subscribers get a brief tailored specifically to their industry and chosen jurisdictions — including {jurisdiction.name}.
          </p>
          <Link to="/subscribe" className="inline-block px-6 py-3 text-sm font-semibold text-brand-navy bg-white rounded-lg shadow-eup-md hover:-translate-y-0.5 transition-all no-underline">
            Get full intelligence — {`${INTELLIGENCE_PRICING.monthly()}`} →
          </Link>
          <p className="mt-3 text-brand-mist text-meta">
            Not sure yet?{" "}
            <Link to="/#brief" className="text-brand-mist hover:text-white transition-colors no-underline underline underline-offset-2">
              See a sample brief first →
            </Link>
          </p>
        </div>
        <div className="mt-10">
          <SourceMethodology />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default JurisdictionPage;
