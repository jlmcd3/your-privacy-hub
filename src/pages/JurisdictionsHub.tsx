import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GlobalPrivacyMap from "@/components/map/GlobalPrivacyMap";

// Map ingestion codes (used in updates.direct_jurisdictions) to jurisdiction page slugs + display
const JURISDICTION_META: Record<string, { slug: string; name: string; flag: string }> = {
  eu: { slug: "european-union", name: "European Union", flag: "🇪🇺" },
  "european-union": { slug: "european-union", name: "European Union", flag: "🇪🇺" },
  uk: { slug: "united-kingdom", name: "United Kingdom", flag: "🇬🇧" },
  "united-kingdom": { slug: "united-kingdom", name: "United Kingdom", flag: "🇬🇧" },
  us: { slug: "united-states", name: "United States", flag: "🇺🇸" },
  "united-states": { slug: "united-states", name: "United States", flag: "🇺🇸" },
  france: { slug: "france", name: "France", flag: "🇫🇷" },
  germany: { slug: "germany", name: "Germany", flag: "🇩🇪" },
  italy: { slug: "italy", name: "Italy", flag: "🇮🇹" },
  spain: { slug: "spain", name: "Spain", flag: "🇪🇸" },
  ireland: { slug: "ireland", name: "Ireland", flag: "🇮🇪" },
  netherlands: { slug: "netherlands", name: "Netherlands", flag: "🇳🇱" },
  belgium: { slug: "belgium", name: "Belgium", flag: "🇧🇪" },
  poland: { slug: "poland", name: "Poland", flag: "🇵🇱" },
  denmark: { slug: "denmark", name: "Denmark", flag: "🇩🇰" },
  sweden: { slug: "sweden", name: "Sweden", flag: "🇸🇪" },
  norway: { slug: "norway", name: "Norway", flag: "🇳🇴" },
  india: { slug: "india", name: "India", flag: "🇮🇳" },
  australia: { slug: "australia", name: "Australia", flag: "🇦🇺" },
  canada: { slug: "canada", name: "Canada", flag: "🇨🇦" },
  brazil: { slug: "brazil", name: "Brazil", flag: "🇧🇷" },
  japan: { slug: "japan", name: "Japan", flag: "🇯🇵" },
  china: { slug: "china", name: "China", flag: "🇨🇳" },
  singapore: { slug: "singapore", name: "Singapore", flag: "🇸🇬" },
  "south-korea": { slug: "south-korea", name: "South Korea", flag: "🇰🇷" },
};

function relativeDays(published: string): string {
  const diff = Date.now() - new Date(published).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
}


type RecentItem = {
  id: string;
  slug: string;
  flag: string;
  name: string;
  update: string;
  fullTitle: string;
  days: string;
  source_url: string | null;
};

export default function JurisdictionsHub() {
  const [recentUpdates, setRecentUpdates] = useState<RecentItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  const [statusCounts, setStatusCounts] = useState({
    comprehensive: 0,
    sector: 0,
    partial: 0,
    proposed: 0,
  });

  useEffect(() => {
    // Fetch live stat counts from DB
    supabase
      .from("jurisdictions")
      .select("law_status")
      .then(({ data }) => {
        if (data && data.length > 0) {
          const counts = data.reduce((acc: any, j: any) => {
            const s = j.law_status || "none";
            acc[s] = (acc[s] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          setStatusCounts({
            comprehensive: counts["comprehensive"] || 0,
            sector: counts["sector"] || 0,
            partial: counts["partial"] || 0,
            proposed: counts["proposed"] || 0,
          });
        }
      });
  }, []);

  useEffect(() => {
    (async () => {
      setRecentLoading(true);
      const { data } = await supabase
        .from("updates")
        .select("id, title, source_url, direct_jurisdictions, published_at, ai_summary")
        .eq("is_hidden", false)
        .not("direct_jurisdictions", "is", null)
        .order("published_at", { ascending: false })
        .limit(60);
      if (!data) {
        setRecentLoading(false);
        return;
      }

      const seenIds = new Set<string>();
      const items: RecentItem[] = [];

      for (const a of data as any[]) {
        const summary = a.ai_summary;
        if (summary && typeof summary === "object" && (summary.skipped || summary.skip)) continue;
        if (seenIds.has(a.id)) continue;

        const codes: string[] = a.direct_jurisdictions ?? [];
        const firstCode = codes.find((c) => JURISDICTION_META[c?.toLowerCase?.()]);
        if (!firstCode) continue;
        const meta = JURISDICTION_META[firstCode.toLowerCase()];

        seenIds.add(a.id);
        const title: string = a.title ?? "";
        items.push({
          id: a.id,
          slug: meta.slug,
          flag: meta.flag,
          name: meta.name,
          update: title.length > 55 ? title.substring(0, 52) + "…" : title,
          fullTitle: title,
          days: relativeDays(a.published_at),
          source_url: a.source_url ?? null,
        });
        if (items.length >= 6) break;
      }

      setRecentUpdates(items);
      setRecentLoading(false);
    })();
  }, []);

  const statCards = [
    { color: "#1a8a52", num: String(statusCounts.comprehensive), label: "Comprehensive laws" },
    { color: "#2563eb", num: String(statusCounts.sector),        label: "Sector-specific" },
    { color: "#38bdf8", num: String(statusCounts.partial),       label: "Partial coverage" },
    { color: "#d4a017", num: String(statusCounts.proposed),      label: "Proposed / In progress" },
  ];

  return (
    <>
      <Helmet>
        <title>Global Privacy Law Map — 160+ Jurisdictions Tracked | End User Privacy</title>
        <meta name="description" content="Interactive map of global privacy and data protection laws. Click any country to explore its law, regulator, enforcement actions, and consumer rights. 160+ jurisdictions." />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />

        <main className="flex-1">
          {/* Page header */}
          <header className="bg-slate-900 text-white py-12">
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div>
                  <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
                    🌐 Jurisdictions
                  </span>
                  <h1 className="font-serif text-white mb-3">
                    Global Privacy Law Map
                  </h1>
                  <p className="text-slate-300 text-lg max-w-3xl leading-relaxed">
                    160+ jurisdictions tracked. Click any country on the map to explore its
                    privacy law, regulator, and recent enforcement actions.
                    Switch to Grid view to browse or filter by region.
                  </p>
                </div>

                <div className="flex flex-nowrap items-center gap-6 overflow-x-auto lg:min-w-[620px] lg:justify-end">
                  {statCards.map((stat) => (
                    <div key={stat.label} className="flex flex-shrink-0 items-center gap-2.5">
                      <div
                        className="w-4 h-4 rounded flex-shrink-0"
                        style={{ background: stat.color }}
                      />
                      <div>
                        <div className="font-bold text-white text-lg leading-none">{stat.num}</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">{stat.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </header>


          {/* Map section */}
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <GlobalPrivacyMap />
            <p className="text-xs text-slate-light text-center mt-3">
              Some small jurisdictions (e.g. Singapore, Luxembourg city-state areas) are
              tracked in our database but are too small to render at this map scale.
              Use Grid view or search to find them.
            </p>
          </div>

          {/* Recently updated strip — dynamic. Hidden when no live data. */}
          {(recentLoading || recentUpdates.length > 0) && (
            <div className="border-t border-fog bg-white">
              <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <h2 className="text-navy uppercase tracking-wider mb-4">
                  🕐 Recently Updated Jurisdictions
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                  {recentLoading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex-shrink-0 bg-fog rounded-xl px-4 py-3 w-[220px] animate-pulse"
                          aria-hidden="true"
                        >
                          <div className="h-4 w-6 bg-slate-200 rounded mb-2" />
                          <div className="h-3 w-24 bg-slate-200 rounded mb-1.5" />
                          <div className="h-3 w-40 bg-slate-200 rounded mb-1" />
                          <div className="h-2.5 w-16 bg-slate-200 rounded" />
                        </div>
                      ))
                    : recentUpdates.map((item) => (
                        <a
                          key={item.id}
                          href={item.source_url || `/updates/${item.id}`}
                          {...(item.source_url ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                          title={item.fullTitle}
                          aria-label={`${item.name}: ${item.fullTitle} (${item.days})`}
                          className="flex-shrink-0 bg-fog rounded-xl px-4 py-3 text-xs no-underline hover:shadow-eup-sm transition-all max-w-[260px]"
                        >
                          <span className="text-base" role="img" aria-label={`${item.name} flag`}>
                            {item.flag}
                          </span>
                          <div className="font-bold text-navy mt-1">{item.name}</div>
                          <div className="text-slate leading-snug">{item.update}</div>
                          <div className="text-slate-light mt-0.5">{item.days}</div>
                        </a>
                      ))}
                </div>
              </div>
            </div>
          )}

        </main>

        <Footer />
      </div>
    </>
  );
}
