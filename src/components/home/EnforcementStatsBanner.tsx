import { Link } from "react-router-dom";

interface StatItem {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

const STATS: StatItem[] = [
  { label: "Enforcement actions tracked", value: "Live", sub: "updated from 119 regulators", color: "text-accent" },
  { label: "Regulators monitored", value: "119", sub: "global DPAs + US state AGs", color: "text-blue" },
  { label: "Jurisdictions covered", value: "150+", sub: "with full profiles", color: "text-accent" },
  { label: "Intelligence brief", value: "Weekly", sub: "every Monday morning", color: "text-gold" },
];

export default function EnforcementStatsBanner() {
  return (
    <div className="bg-card border border-fog rounded-2xl p-5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-navy font-bold text-sm uppercase tracking-wider">
          📊 Live Enforcement Snapshot
        </h3>
        <Link
          to="/enforcement-tracker"
          className="text-blue text-xs font-medium no-underline hover:text-navy transition-colors"
        >
          Full tracker →
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="bg-fog rounded-xl p-4">
            <div className={`font-display font-bold text-2xl mb-1 ${s.color ?? "text-navy"}`}>
              {s.value}
            </div>
            <div className="text-navy/80 text-xs font-medium leading-tight">{s.label}</div>
            {s.sub && <div className="text-slate text-[10px] mt-0.5">{s.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
