import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import PremiumGate from "@/components/PremiumGate";
import { AD_SLOTS, GOOGLE_AD_CLIENT } from "@/config/adSlots";

interface HorizonItem {
  id: string;
  week_of: string;
  jurisdiction: string | null;
  sector: string | null;
  anticipated_development: string;
  confidence: string | null;
  timeline_label: string | null;
  source_signal: string | null;
  recommended_action: string | null;
}

interface WatchItem {
  type: string;
  slug: string;
  label: string;
}

const confidenceStyle = (c?: string | null) => {
  switch ((c ?? "").toLowerCase()) {
    case "high":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "medium":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "low":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-fog text-slate border-silver";
  }
};

const norm = (s?: string | null) =>
  (s ?? "").toLowerCase().trim().replace(/[\s_]+/g, "-");

function matchesWatchlist(item: HorizonItem, watch: WatchItem[]): boolean {
  if (watch.length === 0) return true;
  const itemJur = norm(item.jurisdiction);
  const itemSec = norm(item.sector);
  const itemText = `${item.anticipated_development} ${item.source_signal ?? ""}`.toLowerCase();
  return watch.some((w) => {
    const slug = norm(w.slug);
    const label = w.label.toLowerCase();
    if (!slug && !label) return false;
    if (w.type === "jurisdiction") {
      return (
        (itemJur && (itemJur.includes(slug) || itemJur.includes(label))) ||
        (slug && itemText.includes(slug.replace(/-/g, " "))) ||
        (label && itemText.includes(label))
      );
    }
    // topic / sector
    return (
      (itemSec && (itemSec.includes(slug) || itemSec.includes(label))) ||
      (slug && itemText.includes(slug.replace(/-/g, " "))) ||
      (label && itemText.includes(label))
    );
  });
}

export default function Horizon() {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const [items, setItems] = useState<HorizonItem[]>([]);
  const [watch, setWatch] = useState<WatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMine, setFilterMine] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const horizonReq = supabase
        .from("horizon_intelligence")
        .select(
          "id, week_of, jurisdiction, sector, anticipated_development, confidence, timeline_label, source_signal, recommended_action"
        )
        .order("week_of", { ascending: false })
        .limit(60);

      // Only Intelligence subscribers get personalized watchlist filtering on this page
      const watchReq = user && isPremium
        ? (supabase as any)
            .from("user_watchlist")
            .select("type, slug, label")
            .eq("user_id", user.id)
        : Promise.resolve({ data: [] });

      const [{ data: horizonData }, { data: watchData }] = await Promise.all([
        horizonReq,
        watchReq,
      ]);

      if (cancelled) return;
      setItems((horizonData as HorizonItem[]) ?? []);
      setWatch((watchData as WatchItem[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isPremium]);

  const hasWatchlist = isPremium && watch.length > 0;

  const visibleItems = useMemo(() => {
    if (!isPremium || !filterMine || !hasWatchlist) return items;
    const filtered = items.filter((i) => matchesWatchlist(i, watch));
    // Fall back to global if filter empties the page
    return filtered.length > 0 ? filtered : items;
  }, [items, watch, filterMine, hasWatchlist, isPremium]);

  const filteredEmpty =
    isPremium &&
    filterMine &&
    hasWatchlist &&
    items.length > 0 &&
    items.filter((i) => matchesWatchlist(i, watch)).length === 0;

  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>Enforcement Forecast Intelligence | Anticipated Privacy Developments — EndUserPrivacy</title>
        <meta
          name="description"
          content="Forward-looking intelligence on anticipated privacy law and enforcement developments — filtered to the jurisdictions and topics you follow. Updated weekly."
        />
      </Helmet>
      <Navbar />

      <header className="bg-gradient-to-br from-navy to-steel text-white py-12 px-4">
        <div className="max-w-[1080px] mx-auto">
          <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-3">
            ⏱ Forward-looking intelligence
          </div>
          <h1 className="font-display font-bold text-[32px] md:text-[40px] leading-tight mb-3">
            Enforcement Forecast Intelligence
          </h1>
          <p className="text-blue-100 text-[15px] leading-relaxed max-w-2xl">
            What's coming next. Anticipated privacy regulations, enforcement
            shifts, and policy signals — synthesized from primary regulator
            output and updated weekly.
            {isPremium
              ? hasWatchlist
                ? " Filtered to the jurisdictions and topics you follow."
                : " Add jurisdictions and topics to your watchlist on your dashboard to personalize this view."
              : " Intelligence subscribers can filter this feed to the jurisdictions and topics they follow."}
          </p>
        </div>
      </header>

      <main className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Watchlist controls */}
        {hasWatchlist && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-fog bg-card px-4 py-3">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-light">
                Following
              </span>
              {watch.slice(0, 6).map((w) => (
                <span
                  key={`${w.type}-${w.slug}`}
                  className="text-[11px] font-medium text-navy bg-fog border border-silver/60 px-2 py-0.5 rounded-full"
                >
                  {w.label}
                </span>
              ))}
              {watch.length > 6 && (
                <span className="text-[11px] text-slate-light">
                  +{watch.length - 6} more
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setFilterMine((v) => !v)}
              className="text-[12px] font-semibold text-primary hover:underline bg-transparent border-none cursor-pointer"
            >
              {filterMine ? "Show all signals →" : "Filter to my watchlist →"}
            </button>
          </div>
        )}

        {filteredEmpty && (
          <div className="mb-6 rounded-lg border border-fog bg-card px-4 py-3 text-sm text-slate">
            No signals matched your watchlist this period — showing all global signals instead.
          </div>
        )}

        {/* Companion card → Enforcement Intelligence */}
        <Link
          to="/enforcement-intelligence"
          className="group mb-8 flex items-center justify-between gap-4 rounded-lg border border-fog bg-card px-4 py-3 no-underline transition-colors hover:border-silver"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-navy">Evidence view</span>
            <span className="text-sm text-slate truncate">
              <span className="font-semibold text-navy">Enforcement Intelligence</span>
              <span className="text-slate-light"> — Verified cases underlying these forecasts</span>
            </span>
          </div>
          <span className="text-sm text-slate-light group-hover:text-navy transition-colors shrink-0">→</span>
        </Link>

        {/* Action card → Registration Manager */}
        <Link
          to="/registration-manager"
          className="group mb-8 flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 no-underline transition-colors hover:border-amber-300"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-800">Act on signals</span>
            <span className="text-sm text-slate truncate">
              <span className="font-semibold text-navy">Your Registration Filings</span>
              <span className="text-slate-light"> — Get ahead of upcoming filing & DPO obligations</span>
            </span>
          </div>
          <span className="text-sm text-amber-700 group-hover:text-amber-900 transition-colors shrink-0">→</span>
        </Link>

        {loading ? (
          <div className="text-center py-16 text-slate">Loading horizon signals…</div>
        ) : visibleItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate text-[14px] mb-3">
              No horizon signals published yet. Check back next week.
            </p>
            <Link to="/updates" className="text-blue text-[13px] font-medium no-underline">
              Browse latest regulatory updates →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {visibleItems.map((item) => (
              <article
                key={item.id}
                className="bg-card border border-fog rounded-2xl p-5 hover:border-silver transition-colors"
              >
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {item.timeline_label && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-navy bg-fog border border-silver/60 px-2 py-0.5 rounded">
                      {item.timeline_label}
                    </span>
                  )}
                  {item.jurisdiction && (
                    <span className="text-[11px] font-medium text-slate">
                      {item.jurisdiction}
                    </span>
                  )}
                  {item.sector && (
                    <span className="text-[11px] text-slate-light">· {item.sector}</span>
                  )}
                  {item.confidence && (
                    <span
                      className={`ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full ${confidenceStyle(item.confidence)}`}
                    >
                      {item.confidence} confidence
                    </span>
                  )}
                </div>
                <h2 className="font-display font-bold text-navy text-[18px] leading-snug mb-2">
                  {item.anticipated_development}
                </h2>
                {item.source_signal && (
                  <p className="text-[13px] text-slate leading-relaxed mb-2">
                    <span className="font-semibold text-navy">Source signal: </span>
                    {item.source_signal}
                  </p>
                )}
                {item.recommended_action && (
                  <p className="text-[13px] text-slate leading-relaxed">
                    <span className="font-semibold text-navy">Recommended action: </span>
                    {item.recommended_action}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}

        <div className="mt-10">
          <AdBanner
            variant="leaderboard"
            adSlot={AD_SLOTS.home_bottom_leaderboard.id}
            googleAdClient={GOOGLE_AD_CLIENT}
            googleAdSlot={AD_SLOTS.home_bottom_leaderboard.googleAdSlot}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
