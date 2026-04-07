import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Shield, Scale, Newspaper, Lock, Zap } from "lucide-react";
import SpinTheGlobe from "@/components/globe/SpinTheGlobe";

const panels = [
  {
    title: "Intelligence",
    icon: Shield,
    gradient: "from-indigo-600/20 to-purple-700/20",
    border: "border-indigo-400/20",
    accent: "text-indigo-300",
    items: [
      { label: "Enforcement Tracker", href: "/enforcement-tracker", badge: "LIVE" },
      { label: "Weekly Brief", href: "/subscribe", badge: "PRO" },
      { label: "Deep Analysis", href: "/subscribe", badge: "PRO" },
      { label: "Custom Alerts", href: "/subscribe", badge: "PRO" },
    ],
  },
  {
    title: "Laws & Frameworks",
    icon: Scale,
    gradient: "from-emerald-600/20 to-teal-700/20",
    border: "border-emerald-400/20",
    accent: "text-emerald-300",
    items: [
      { label: "Global Privacy Laws", href: "/global-privacy-laws" },
      { label: "US State Laws", href: "/us-state-privacy-laws" },
      { label: "GDPR Enforcement", href: "/gdpr-enforcement" },
      { label: "AI Regulations", href: "/ai-privacy-regulations" },
    ],
  },
  {
    title: "Latest News",
    icon: Newspaper,
    gradient: "from-sky-600/20 to-blue-700/20",
    border: "border-sky-400/20",
    accent: "text-sky-300",
    items: [
      { label: "EU & UK Updates", href: "/category/eu-uk" },
      { label: "U.S. Federal", href: "/category/us-federal" },
      { label: "Enforcement Actions", href: "/category/enforcement" },
      { label: "AI & Privacy", href: "/category/ai-privacy" },
    ],
  },
];

export default function SearchFirstHero() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (query.trim()) {
      navigate(`/updates?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="bg-gradient-to-br from-navy via-navy-mid to-navy-light border-b border-white/10 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* Top: headline + search */}
        <div className="text-center mb-6">
          <h1 className="font-display font-bold text-white text-[20px] md:text-[26px] leading-tight mb-1.5">
            Make sense of global privacy law in minutes, not hours
          </h1>
          <p className="text-blue-200/70 text-[12px] mb-4">
            119 regulators · 150+ jurisdictions · AI-powered analysis
          </p>
          <div className="flex gap-2 max-w-lg mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search: GDPR fines… AI Act… California…"
                className="w-full pl-9 pr-4 py-2 text-[13px] rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 outline-none focus:border-sky transition-colors"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 text-[13px] font-bold text-navy bg-white rounded-lg hover:bg-white/90 transition-colors flex-shrink-0 cursor-pointer border-none"
            >
              Search
            </button>
          </div>
        </div>

        {/* Four-panel grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {panels.map((panel) => {
            const Icon = panel.icon;
            return (
              <div
                key={panel.title}
                className={`bg-gradient-to-b ${panel.gradient} backdrop-blur-sm border ${panel.border} rounded-xl p-4 flex flex-col`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`w-4 h-4 ${panel.accent}`} />
                  <span className={`text-[13px] font-bold uppercase tracking-wider ${panel.accent}`}>
                    {panel.title}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  {panel.items.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="flex items-center justify-between text-[12px] text-white/80 hover:text-white bg-white/5 hover:bg-white/10 rounded-md px-2.5 py-1.5 transition-colors no-underline group"
                    >
                      <span>{item.label}</span>
                      {"badge" in item && item.badge && (
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            item.badge === "LIVE"
                              ? "bg-green-500/20 text-green-400"
                              : item.badge === "PRO"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-sky-500/20 text-sky-300"
                          }`}
                        >
                          {item.badge === "PRO" && <Lock className="w-2.5 h-2.5 inline mr-0.5 -mt-px" />}
                          {item.badge === "LIVE" && <Zap className="w-2.5 h-2.5 inline mr-0.5 -mt-px" />}
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Panel 4: Globe */}
          <div className="hidden md:flex bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-4 flex-col items-center justify-center">
            <SpinTheGlobe compact />
          </div>
        </div>

        {/* Bottom CTA row */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
          <Link
            to="/get-intelligence"
            className="inline-flex items-center gap-2 bg-amber-400 text-navy font-bold text-[13px] px-5 py-2.5 rounded-xl hover:bg-amber-300 transition-colors no-underline"
          >
            Get Your Privacy Intelligence →
          </Link>
          <Link
            to="/sample-brief"
            className="text-[13px] font-semibold text-blue-200 hover:text-white transition-colors no-underline"
          >
            See a sample brief →
          </Link>
        </div>
      </div>
    </div>
  );
}
