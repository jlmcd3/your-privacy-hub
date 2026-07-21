import { Link } from "react-router-dom";
import { BarChart3 } from 'lucide-react';

interface StatItem {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

const STATS: StatItem[] = [
  { label: "Actions tracked", value: "Live", sub: "Privacy regulators across the world", color: "text-accent" },
  { label: "Regulators", value: "Global", sub: "DPAs + US AGs", color: "text-brand-teal-text" },
  { label: "Jurisdictions", value: "Global", sub: "Worldwide coverage", color: "text-accent" },
  { label: "Weekly brief", value: "Free", sub: "every Monday", color: "text-brand-teal-text" },

];

export default function EnforcementStatsBanner() {
  return (
    <div className="bg-card border border-brand-cloud rounded-2xl p-5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-brand-navy uppercase tracking-wider">
          <BarChart3 aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Live Enforcement Snapshot
        </h3>
        <Link
          to="/enforcement-tracker"
          className="text-brand-teal-text text-xs font-medium no-underline hover:text-brand-navy transition-colors"
        >
          Full tracker →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="bg-brand-cloud rounded-xl p-3">
            <div className={`font-display font-bold text-2xl mb-1 ${s.color ?? "text-brand-navy"}`}>
              {s.value}
            </div>
            <div className="text-brand-navy/80 text-xs font-medium leading-tight">{s.label}</div>
            {s.sub && <div className="text-slate text-meta mt-0.5">{s.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
