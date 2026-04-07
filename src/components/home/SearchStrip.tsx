import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search } from "lucide-react";

export default function SearchStrip() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (query.trim()) {
      navigate(`/updates?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="bg-paper border-b border-fog">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display font-bold text-navy text-[20px] md:text-[24px] leading-tight mb-1.5">
            Make sense of global privacy law in minutes, not hours
          </h2>
          <p className="text-slate text-[13px] leading-relaxed mb-4">
            119 regulators · 150+ jurisdictions · AI-powered analysis · Free weekly brief
          </p>

          {/* Search bar */}
          <div className="flex gap-2 max-w-xl mx-auto mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate/40" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search: GDPR fines… AI Act… California law…"
                className="w-full pl-9 pr-4 py-2.5 text-[13px] rounded-xl bg-white border border-silver text-navy placeholder:text-slate/40 outline-none focus:border-blue transition-colors"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-5 py-2.5 text-[13px] font-bold text-white bg-steel rounded-xl hover:bg-navy-light transition-colors flex-shrink-0 cursor-pointer border-none"
            >
              Search
            </button>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-3">
            <Link
              to="/get-intelligence"
              className="inline-flex items-center gap-2 bg-amber-400 text-navy font-bold text-[13px] px-5 py-2.5 rounded-xl hover:bg-amber-300 transition-colors no-underline"
            >
              Get Your Privacy Intelligence →
            </Link>
            <Link
              to="/sample-brief"
              className="text-[13px] font-semibold text-steel hover:text-navy transition-colors no-underline"
            >
              See a sample brief →
            </Link>
          </div>

          {/* Topic chips */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] text-slate/50 font-medium">Explore:</span>
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
                className="text-[11px] font-medium text-steel bg-silver/60 border border-silver rounded-full px-3 py-1 hover:bg-silver transition-colors no-underline"
              >
                {chip.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
