import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search } from "lucide-react";
import SpinTheGlobe from "@/components/globe/SpinTheGlobe";

export default function SearchFirstHero() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (query.trim()) {
      navigate(`/updates?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="bg-gradient-to-r from-navy via-steel to-navy border-b border-white/10 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8 md:py-10 flex items-center gap-6">
        {/* Left: text + search */}
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-white text-[22px] md:text-[28px] leading-tight mb-2">
            Make sense of global privacy law in minutes, not hours
          </h1>
          <p className="text-blue-200 text-[13px] leading-relaxed mb-5">
            119 regulators · 150+ jurisdictions · AI-powered analysis · Free weekly brief
          </p>

          {/* Search bar */}
          <div className="flex gap-2 max-w-xl mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search: GDPR fines… AI Act… California law…"
                className="w-full pl-9 pr-4 py-2.5 text-[13px] rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 outline-none focus:border-sky transition-colors"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-5 py-2.5 text-[13px] font-bold text-navy bg-white rounded-xl hover:bg-white/90 transition-colors flex-shrink-0 cursor-pointer border-none"
            >
              Search
            </button>
          </div>

          {/* Quick-explore topic chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-white/50 font-medium">Explore:</span>
            {[
              { label: "Enforcement", href: "/category/enforcement" },
              { label: "AI Privacy", href: "/category/ai-privacy" },
              { label: "US State Laws", href: "/category/us-states" },
              { label: "AdTech", href: "/category/adtech" },
              { label: "EU & UK", href: "/category/eu-uk" },
            ].map((chip) => (
              <Link
                key={chip.label}
                to={chip.href}
                className="text-[11px] font-medium text-white/80 bg-white/10 border border-white/20 rounded-full px-3 py-1 hover:bg-white/20 transition-colors no-underline"
              >
                {chip.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Spin the Globe — hidden on mobile */}
        <div className="hidden md:flex flex-col items-center flex-shrink-0">
          <SpinTheGlobe />
        </div>
      </div>
    </div>
  );
}
