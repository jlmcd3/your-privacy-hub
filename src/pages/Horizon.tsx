import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
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

// Render [E#] / [U#] citation tags as inline pills.
// [E#] tags deep-link to enforcement intelligence; [U#] tags are stylistic only.
function renderCitations(text: string) {
  const parts = text.split(/(\[(?:E|U)\d+(?:,\s*(?:E|U)?\d+)*\])/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[((?:E|U)\d+(?:,\s*(?:E|U)?\d+)*)\]$/);
    if (!m) return <span key={i}>{part}</span>;
    const isEnforcement = /E\d/.test(m[1]);
    if (isEnforcement) {
      return (
        <Link
          key={i}
          to="/enforcement-intelligence"
          className="inline-block mx-0.5 px-1.5 py-0 text-[10px] font-mono font-semibold rounded border border-amber-300 bg-amber-50 text-amber-900 no-underline hover:bg-amber-100 transition-colors align-middle"
          title="View underlying enforcement actions"
        >
          {part}
        </Link>
      );
    }
    return (
      <span
        key={i}
        className="inline-block mx-0.5 px-1.5 py-0 text-[10px] font-mono font-semibold rounded border border-silver/60 bg-fog text-slate align-middle"
        title="Recent regulatory update signal"
      >
        {part}
      </span>
    );
  });
}

export default function Horizon() {
  const [items, setItems] = useState<HorizonItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("horizon_intelligence")
      .select(
        "id, week_of, jurisdiction, sector, anticipated_development, confidence, timeline_label, source_signal, recommended_action"
      )
      .order("week_of", { ascending: false })
      .limit(60)
      .then(({ data }) => {
        setItems((data as HorizonItem[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>Regulatory Horizon | Anticipated Privacy Developments — EndUserPrivacy</title>
        <meta
          name="description"
          content="Forward-looking intelligence on anticipated privacy law and enforcement developments worldwide. Updated weekly."
        />
      </Helmet>
      <Navbar />

      <header className="bg-gradient-to-br from-navy to-steel text-white py-12 px-4">
        <div className="max-w-[1080px] mx-auto">
          <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-3">
            ⏱ Forward-looking intelligence
          </div>
          <h1 className="font-display font-bold text-[32px] md:text-[40px] leading-tight mb-3">
            Regulatory Horizon
          </h1>
          <p className="text-blue-100 text-[15px] leading-relaxed max-w-2xl">
            What's coming next. Anticipated privacy regulations, enforcement
            shifts, and policy signals — synthesized from primary regulator
            output and updated weekly.
          </p>
        </div>
      </header>

      <main className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
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

        {loading ? (
          <div className="text-center py-16 text-slate">Loading horizon signals…</div>
        ) : items.length === 0 ? (
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
            {items.map((item) => (
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
