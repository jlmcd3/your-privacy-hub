import { Search } from "lucide-react";

const quickChips = ["GDPR", "CCPA", "AI Act", "FTC enforcement", "state privacy laws"];

const SearchBar = () => {
  return (
    <div className="py-5 px-8 bg-card border-b border-fog">
      <div className="max-w-[1280px] mx-auto flex gap-3 items-center">
        <div className="relative flex-1 max-w-[560px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-light w-4 h-4 pointer-events-none" />
          <input
            className="w-full py-2.5 pl-10 pr-4 text-sm font-body border border-silver rounded-lg bg-paper text-navy outline-none focus:border-blue focus:shadow-[0_0_0_3px_rgba(59,130,196,0.12)] focus:bg-card transition-all"
            type="text"
            placeholder="Search regulators, jurisdictions, laws, enforcement actions…"
          />
        </div>
        <div className="flex gap-1.5 items-center">
          <span className="text-[11px] text-slate-light whitespace-nowrap">Quick:</span>
          {quickChips.map((chip) => (
            <span
              key={chip}
              className="text-[11.5px] font-medium text-slate bg-fog px-2.5 py-1 rounded-full cursor-pointer hover:bg-navy hover:text-white transition-all whitespace-nowrap"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
