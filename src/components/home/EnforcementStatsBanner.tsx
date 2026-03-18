import { Link } from "react-router-dom";

interface StatItem {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

const STATS: StatItem[] = [
  { label: "Enforcement actions tracked", value: "Live", sub: "updated from 119 regulators", color: "text-accent-light" },
  { label: "Regulators monitored", value: "119", sub: "global DPAs + US state AGs", color: "text-blue-400" },
  { label: "Jurisdictions covered", value: "150+", sub: "with full profiles", color: "text-green-400" },
  { label: "Intelligence brief", value: "Weekly", sub: "every Monday morning", color: "text-amber-400" },
];

export default function EnforcementStatsBanner() {
  return (
    <div className="bg-navy rounded-2xl p-5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider">
          📊 Live Enforcement Snapshot
        </h3>
        <Link
          to="/enforcement-tracker"
          className="text-blue-300 text-xs font-medium no-underline hover:text-white transition-colors"
        >
          Full tracker →
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="bg-white/5 rounded-xl p-4">
            <div className={`font-display font-bold text-2xl mb-1 ${s.color ?? "text-white"}`}>
              {s.value}
            </div>
            <div className="text-white/80 text-xs font-medium leading-tight">{s.label}</div>
            {s.sub && <div className="text-white/40 text-[10px] mt-0.5">{s.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
