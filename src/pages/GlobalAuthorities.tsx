import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import { slugify } from "@/lib/utils";
import globalAuthorities from "@/data/global_privacy_authorities.json";

type Entry = {
  id: string;
  country: string;
  slug?: string;
  authority_name: string;
  authority_abbreviation?: string;
  primary_legislation?: string;
  legislation_abbreviation?: string;
  website?: string;
  complaint_portal?: string | null;
  notes?: string;
  monitoring_tier?: number;
};

type RegionGroup = "Europe" | "Americas" | "Asia-Pacific" | "Other";

const REGION_GROUP: Record<string, RegionGroup> = {
  "European Union": "Europe",
  "United Kingdom": "Europe",
  "Canada": "Americas",
  "Latin America": "Americas",
  "Asia-Pacific": "Asia-Pacific",
  "Middle East & Africa": "Other",
  "Other Notable Jurisdictions": "Other",
};

const REGION_FLAG: Record<RegionGroup, string> = {
  Europe: "🇪🇺",
  Americas: "🌎",
  "Asia-Pacific": "🌏",
  Other: "🌍",
};

const FILTERS: ("All" | RegionGroup)[] = ["All", "Europe", "Americas", "Asia-Pacific", "Other"];

// Activity derived from monitoring_tier (Tier 1 = High enforcement volume, 2 = Medium, 3 = Low).
function activityFor(tier?: number): { level: "High" | "Medium" | "Low"; rank: number; cls: string } {
  if (tier === 1) return { level: "High", rank: 3, cls: "bg-emerald-100 text-emerald-800 border-emerald-300" };
  if (tier === 2) return { level: "Medium", rank: 2, cls: "bg-amber-100 text-amber-800 border-amber-300" };
  return { level: "Low", rank: 1, cls: "bg-slate-100 text-slate-700 border-slate-300" };
}

type FlatEntry = Entry & { regionGroup: RegionGroup; originRegion: string };

const ALL_ENTRIES: FlatEntry[] = (globalAuthorities as any[]).flatMap((region: any) =>
  region.entries.map((e: Entry) => ({
    ...e,
    originRegion: region.region,
    regionGroup: REGION_GROUP[region.region] || "Other",
  }))
);

const GlobalAuthorities = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"All" | RegionGroup>("All");

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: ALL_ENTRIES.length };
    for (const f of FILTERS) if (f !== "All") c[f] = ALL_ENTRIES.filter((e) => e.regionGroup === f).length;
    return c;
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return ALL_ENTRIES
      .filter((e) => (filter === "All" ? true : e.regionGroup === filter))
      .filter((e) => {
        if (!q) return true;
        return (
          e.authority_name.toLowerCase().includes(q) ||
          e.country.toLowerCase().includes(q) ||
          (e.authority_abbreviation || "").toLowerCase().includes(q) ||
          (e.primary_legislation || "").toLowerCase().includes(q) ||
          (e.legislation_abbreviation || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const ra = activityFor(a.monitoring_tier).rank;
        const rb = activityFor(b.monitoring_tier).rank;
        if (rb !== ra) return rb - ra;
        return a.authority_name.localeCompare(b.authority_name);
      });
  }, [searchTerm, filter]);

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Helmet>
        <title>Global Privacy Authority Directory | EndUserPrivacy.com</title>
        <meta
          name="description"
          content="Searchable directory of data protection authorities across the world, ranked by enforcement activity. Find DPA contacts, complaint portals, and legislation."
        />
      </Helmet>
      <Navbar />
      <header className="bg-slate-900 text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            🌐 Authority Directory
          </span>
          <h1 className="font-serif text-white mb-3">Global Privacy Authorities</h1>
          <p className="text-slate-300 text-lg max-w-3xl">
            {ALL_ENTRIES.length} data protection authorities worldwide, ranked by enforcement activity. Search by name,
            country, or acronym, and jump directly to each authority's complaint portal.
          </p>
        </div>
      </header>

      <AdBanner variant="leaderboard" className="mt-6" />

      {/* Sticky filter + search bar */}
      <div className="sticky top-0 z-30 bg-brand-cloud/95 backdrop-blur border-b border-brand-cloud">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs font-semibold tracking-wide uppercase px-3 py-1.5 rounded-full border transition-colors ${
                    active
                      ? "bg-brand-navy text-white border-brand-navy"
                      : "bg-card text-slate border-silver hover:border-brand-navy/40"
                  }`}
                >
                  {f === "All" ? "All" : `${REGION_FLAG[f as RegionGroup]} ${f}`}
                  <span className={`ml-1.5 text-[10px] ${active ? "text-white/80" : "text-brand-mist"}`}>
                    {counts[f] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative w-full lg:max-w-[360px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-mist w-4 h-4" />
            <input
              className="w-full py-2 pl-10 pr-10 text-sm border border-silver rounded-lg bg-card text-brand-navy outline-none focus:border-brand-teal transition-colors"
              placeholder="Search ICO, CNIL, country, legislation…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-brand-mist hover:text-brand-navy hover:bg-brand-cloud transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-slate uppercase tracking-wider font-semibold">
            {filtered.length} {filtered.length === 1 ? "authority" : "authorities"} · sorted by enforcement activity
          </p>
          <div className="flex items-center gap-3 text-[11px] text-slate">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> High
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Medium
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400" /> Low
            </span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-card border border-brand-cloud rounded-xl p-10 text-center text-slate">
            No authorities match your search.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((entry) => {
              const activity = activityFor(entry.monitoring_tier);
              return (
                <div
                  key={entry.id}
                  className="bg-card border border-brand-cloud rounded-xl p-5 shadow-eup-sm flex flex-col gap-3 hover:border-brand-navy/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-slate font-semibold">
                        {REGION_FLAG[entry.regionGroup]} {entry.country}
                      </div>
                      <Link
                        to={`/jurisdiction/${entry.slug || slugify(entry.country)}`}
                        className="block mt-1 text-sm font-semibold text-brand-navy hover:text-brand-teal no-underline"
                      >
                        {entry.authority_name}
                      </Link>
                      {entry.authority_abbreviation && (
                        <div className="text-[11px] text-slate mt-0.5">{entry.authority_abbreviation}</div>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full border ${activity.cls}`}
                      title="Enforcement activity derived from monitoring tier"
                    >
                      {activity.level}
                    </span>
                  </div>

                  {entry.primary_legislation && (
                    <div className="text-xs text-slate">
                      <span className="text-brand-mist">Law: </span>
                      {entry.primary_legislation}
                      {entry.legislation_abbreviation && (
                        <span className="text-brand-mist"> ({entry.legislation_abbreviation})</span>
                      )}
                    </div>
                  )}

                  <div className="mt-auto pt-3 border-t border-brand-cloud flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
                    {entry.website && (
                      <a
                        href={entry.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-teal hover:underline no-underline"
                      >
                        Website ↗
                      </a>
                    )}
                    {entry.complaint_portal ? (
                      <a
                        href={entry.complaint_portal}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-teal hover:underline no-underline font-medium"
                      >
                        File complaint / notify ↗
                      </a>
                    ) : (
                      <span className="text-brand-mist">No public complaint portal</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default GlobalAuthorities;
