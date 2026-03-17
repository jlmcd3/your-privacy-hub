import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GlobalPrivacyMap from "@/components/map/GlobalPrivacyMap";

export default function JurisdictionsHub() {
  const [recentUpdates, setRecentUpdates] = useState([
    { flag: "🇫🇷", name: "France", update: "Clearview AI €20M fine", days: "2 days ago" },
    { flag: "🇬🇧", name: "UK", update: "DUAA provisions in force", days: "5 days ago" },
    { flag: "🇮🇳", name: "India", update: "DPDP rules draft released", days: "1 week ago" },
    { flag: "🇦🇺", name: "Australia", update: "Clinical Labs AUD 5.8M fine", days: "1 week ago" },
    { flag: "🇺🇸", name: "US Federal", update: "FTC AI commercial practices", days: "10 days ago" },
  ]);

  useEffect(() => {
    supabase
      .from("updates")
      .select("title, category, published_at")
      .order("published_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const mapped = data.map((a: any) => ({
            flag: ({ "eu-uk": "🇪🇺", "us-federal": "🇺🇸", "us-states": "🗺️",
                    "global": "🌐", "enforcement": "⚖️", "ai-privacy": "🤖" } as Record<string, string>)[a.category] ?? "🌐",
            name: ({ "eu-uk": "EU & UK", "us-federal": "U.S. Federal", "us-states": "U.S. States",
                    "global": "Global", "enforcement": "Enforcement", "ai-privacy": "AI & Privacy" } as Record<string, string>)[a.category] ?? a.category,
            update: a.title.length > 55 ? a.title.substring(0, 52) + "…" : a.title,
            days: (() => {
              const diff = Date.now() - new Date(a.published_at).getTime();
              const days = Math.floor(diff / 86400000);
              if (days === 0) return "Today";
              if (days === 1) return "Yesterday";
              if (days < 7) return `${days} days ago`;
              return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
            })(),
          }));
          setRecentUpdates(mapped);
        }
      });
  }, []);

  return (
    <>
      <Helmet>
        <title>Global Privacy Jurisdictions Map | EndUserPrivacy</title>
        <meta
          name="description"
          content="Interactive map of global privacy and data protection laws. Click any country to explore its law, regulator, consumer rights, and recent enforcement actions."
        />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Topbar />
        <Navbar />

        <main className="flex-1">
          {/* Page header */}
          <div className="bg-navy text-white py-10 px-4">
            <div className="max-w-[1280px] mx-auto">
              <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-widest mb-3">
                <span>🌐</span> Jurisdictions
              </div>
              <h1 className="font-display font-bold text-3xl md:text-4xl text-white mb-3">
                Global Privacy Law Map
              </h1>
              <p className="text-blue-200 text-sm max-w-xl leading-relaxed">
                150+ jurisdictions tracked. Click any country on the map to explore its
                privacy law, regulator, consumer rights, and recent enforcement actions.
                Switch to Grid view to browse or filter by region.
              </p>

              <div className="flex gap-6 mt-6 flex-wrap">
                {[
                  { color: "#1a8a52", num: "46",   label: "Comprehensive laws"      },
                  { color: "#2563eb", num: "3",    label: "Sector-specific"         },
                  { color: "#38bdf8", num: "14",   label: "Partial coverage"        },
                  { color: "#d4a017", num: "7",    label: "Proposed / In progress"  },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-2.5">
                    <div
                      className="w-4 h-4 rounded flex-shrink-0"
                      style={{ background: stat.color }}
                    />
                    <div>
                      <div className="font-bold text-white text-lg leading-none">{stat.num}</div>
                      <div className="text-blue-300 text-[11px] mt-0.5">{stat.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Map section */}
          <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
            <GlobalPrivacyMap />
            <p className="text-xs text-slate-light text-center mt-3">
              Some small jurisdictions (e.g. Singapore, Luxembourg city-state areas) are
              tracked in our database but are too small to render at this map scale.
              Use Grid view or search to find them.
            </p>
          </div>

          {/* Recently updated strip — dynamic */}
          <div className="border-t border-fog bg-white">
            <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-6">
              <h2 className="font-bold text-navy text-sm uppercase tracking-wider mb-4">
                🕐 Recently Updated Jurisdictions
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                {recentUpdates.map((item) => (
                  <div
                    key={item.name}
                    className="flex-shrink-0 bg-fog rounded-xl px-4 py-3 text-xs"
                  >
                    <span className="text-base">{item.flag}</span>
                    <div className="font-bold text-navy mt-1">{item.name}</div>
                    <div className="text-slate leading-snug">{item.update}</div>
                    <div className="text-slate-light mt-0.5">{item.days}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
