import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

const lawChips = ["GDPR", "CCPA", "LGPD", "UK GDPR", "EU AI Act"];
const topicChips = [
  { label: "Enforcement fines", href: "/category/enforcement" },
  { label: "AI regulation", href: "/topics/ai-governance" },
  { label: "Data transfers", href: "/topics/data-transfers" },
  { label: "Children's privacy", href: "/topics/children-privacy" },
];

const SearchBar = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearch = (term: string) => {
    setQuery(term);
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="py-4 md:py-5 px-4 md:px-8 bg-card border-b border-fog">
      <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full sm:max-w-[560px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-light w-4 h-4 pointer-events-none" />
          <input
            className="w-full py-2.5 pl-10 pr-4 text-sm font-body border border-silver rounded-lg bg-paper text-navy outline-none focus:border-blue focus:shadow-[0_0_0_3px_rgba(59,130,196,0.12)] focus:bg-card transition-all"
            type="text"
            placeholder="Search regulators, jurisdictions, laws, enforcement actions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="flex gap-1.5 items-center flex-wrap">
          <span className="text-[10px] text-slate/60 font-semibold tracking-wider uppercase">Laws</span>
          {lawChips.map((label) => (
            <span
              key={label}
              onClick={() => handleSearch(label)}
              className="text-[12px] font-medium text-slate bg-fog px-2.5 py-1 rounded-full border border-fog cursor-pointer hover:bg-navy hover:text-white transition-all whitespace-nowrap"
            >
              {label}
            </span>
          ))}
          <div className="w-px h-4 bg-fog mx-1" />
          <span className="text-[10px] text-slate/60 font-semibold tracking-wider uppercase">Topics</span>
          {topicChips.map((chip) => (
            <span
              key={chip.label}
              onClick={() => navigate(chip.href)}
              className="text-[12px] font-medium text-slate bg-fog px-2.5 py-1 rounded-full border border-fog cursor-pointer hover:bg-navy hover:text-white transition-all whitespace-nowrap"
            >
              {chip.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
