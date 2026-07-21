import { Bot, Globe, Hospital, Landmark, Laptop, Shirt, ShoppingCart, Smartphone } from 'lucide-react';
const ICN = "w-3.5 h-3.5";
const INDUSTRIES = [
  { slug: "all",          label: "All Industries",  icon: <Globe aria-hidden="true" strokeWidth={1.75} className={ICN} /> },
  { slug: "healthcare",   label: "Healthcare",       icon: <Hospital aria-hidden="true" strokeWidth={1.75} className={ICN} /> },
  { slug: "fintech",      label: "Finance & Banking",icon: <Landmark aria-hidden="true" strokeWidth={1.75} className={ICN} /> },
  { slug: "adtech",       label: "AdTech & Media",   icon: <Smartphone aria-hidden="true" strokeWidth={1.75} className={ICN} /> },
  { slug: "retail",       label: "Retail & E-com",   icon: <ShoppingCart aria-hidden="true" strokeWidth={1.75} className={ICN} /> },
  { slug: "hr",           label: "HR & Employment",  icon: <Shirt aria-hidden="true" strokeWidth={1.75} className={ICN} /> },
  { slug: "saas",         label: "SaaS & Tech",      icon: <Laptop aria-hidden="true" strokeWidth={1.75} className={ICN} /> },
  { slug: "ai",           label: "AI Companies",     icon: <Bot aria-hidden="true" strokeWidth={1.75} className={ICN} /> },
];

interface IndustryFilterProps {
  selected: string;
  onChange: (industry: string) => void;
}

export default function IndustryFilter({ selected, onChange }: IndustryFilterProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      <span className="text-[11px] font-bold text-slate uppercase tracking-wider flex-shrink-0">
        Industry:
      </span>
      {INDUSTRIES.map(ind => (
        <button
          key={ind.slug}
          onClick={() => onChange(ind.slug)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
            selected === ind.slug
              ? "bg-brand-navy text-white border-brand-navy"
              : "bg-white text-slate border-brand-cloud hover:border-brand-navy/20"
          }`}
        >
          <span>{ind.icon}</span>
          {ind.label}
        </button>
      ))}
    </div>
  );
}
