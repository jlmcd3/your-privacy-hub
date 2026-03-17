const INDUSTRIES = [
  { slug: "all",          label: "All Industries",  icon: "🌐" },
  { slug: "healthcare",   label: "Healthcare",       icon: "🏥" },
  { slug: "fintech",      label: "Finance & Banking",icon: "🏦" },
  { slug: "adtech",       label: "AdTech & Media",   icon: "📱" },
  { slug: "retail",       label: "Retail & E-com",   icon: "🛒" },
  { slug: "hr",           label: "HR & Employment",  icon: "👔" },
  { slug: "saas",         label: "SaaS & Tech",      icon: "💻" },
  { slug: "ai",           label: "AI Companies",     icon: "🤖" },
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
              ? "bg-navy text-white border-navy"
              : "bg-white text-slate border-fog hover:border-navy/20"
          }`}
        >
          <span>{ind.icon}</span>
          {ind.label}
        </button>
      ))}
    </div>
  );
}
