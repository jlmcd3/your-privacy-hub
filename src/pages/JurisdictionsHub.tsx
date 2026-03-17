import { Helmet } from "react-helmet-async";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GlobalPrivacyMap from "@/components/map/GlobalPrivacyMap";

export default function JurisdictionsHub() {
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
                  { color: "#0d2240", border: "2px solid #3b5278", num: "42",   label: "Comprehensive laws" },
                  { color: "#1d4ed8", border: "none",               num: "14",  label: "Sector-specific" },
                  { color: "#38bdf8", border: "none",               num: "12",  label: "Partial coverage" },
                  { color: "#93c5fd", border: "none",               num: "9",   label: "Proposed / In progress" },
                  { color: "#c8d8e8", border: "1px solid #94a3b8",  num: "250+",label: "Regulators tracked" },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-sm flex-shrink-0"
                      style={{ background: stat.color, border: stat.border }}
                    />
                    <div>
                      <div className="font-bold text-white text-lg leading-none">{stat.num}</div>
                      <div className="text-blue-300 text-[11px]">{stat.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Map section */}
          <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
            <GlobalPrivacyMap />
          </div>

          {/* Recently updated strip */}
          <div className="border-t border-fog bg-white">
            <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-6">
              <h2 className="font-bold text-navy text-sm uppercase tracking-wider mb-4">
                🕐 Recently Updated Jurisdictions
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                {[
                  { flag: "🇫🇷", name: "France", update: "Clearview AI €20M fine", days: "2 days ago" },
                  { flag: "🇬🇧", name: "UK", update: "DUAA provisions in force", days: "5 days ago" },
                  { flag: "🇮🇳", name: "India", update: "DPDP rules draft released", days: "1 week ago" },
                  { flag: "🇦🇺", name: "Australia", update: "Clinical Labs AUD 5.8M fine", days: "1 week ago" },
                  { flag: "🇺🇸", name: "US Federal", update: "FTC AI commercial practices", days: "10 days ago" },
                ].map((item) => (
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
