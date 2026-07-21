import { X, ExternalLink, CheckCircle2, Scale } from 'lucide-react';
import { Link } from "react-router-dom";
import { STATUS_CONFIG } from "./MapLegend";

interface Jurisdiction {
  name: string;
  flag: string;
  status: keyof typeof STATUS_CONFIG;
  law: string;
  regulator: string;
  year?: number | null;
  region: string;
  slug: string;
  rights: string[];
  fines: string[];
}

interface CountryPanelProps {
  jurisdiction: Jurisdiction;
  onClose: () => void;
}

export default function CountryPanel({ jurisdiction: j, onClose }: CountryPanelProps) {
  const statusCfg = STATUS_CONFIG[j.status];

  return (
    <div className="w-[300px] flex-shrink-0 bg-card rounded-2xl border border-brand-cloud shadow-eup-md p-6 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-3xl mb-2">{j.flag}</div>
          <h2 className="font-display text-brand-navy leading-tight">{j.name}</h2>
          <span
            className="inline-block mt-2 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border"
            style={{
              background: `${statusCfg.color}15`,
              color: statusCfg.color,
              borderColor: `${statusCfg.color}30`,
            }}
          >
            {statusCfg.label}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-brand-cloud hover:bg-brand-teal/10 transition-colors border-none cursor-pointer text-slate"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {([
        ["Primary Law", j.law],
        ["Regulator", j.regulator],
        j.year ? ["In Force Since", String(j.year)] : null,
        ["Region", j.region],
      ].filter(Boolean) as [string, string][]).map(([label, value]) => (
        <div key={label} className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-brand-mist mb-1">
            {label}
          </div>
          <div className="text-brand-navy text-sm leading-snug">{value}</div>
        </div>
      ))}

      <div className="mb-4">
        <div className="text-[11px] font-bold uppercase tracking-widest text-brand-mist mb-2">
          Consumer Rights
        </div>
        <ul className="space-y-1.5">
          {j.rights.map((r, i) => (
            <li key={i} className="flex gap-2 text-[12px] text-brand-navy leading-snug">
              <span className="text-accent font-bold flex-shrink-0"><CheckCircle2 aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /></span>
              {r}
            </li>
          ))}
        </ul>
      </div>

      {j.fines.length > 0 && (
        <div className="mb-5">
          <div className="text-[11px] font-bold uppercase tracking-widest text-brand-mist mb-2">
            Recent Enforcement
          </div>
          <div className="space-y-1.5">
            {j.fines.map((f, i) => (
              <div
                key={i}
                className="bg-orange-50 border-l-[3px] border-orange-400 px-3 py-2 rounded-r-lg text-[11px] text-orange-800 leading-snug"
              >
                <Scale aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> {f}
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        to={`/jurisdiction/${j.slug}`}
        className="flex items-center justify-center gap-2 w-full bg-gradient-to-br from-brand-navy to-brand-teal text-white font-bold text-sm py-3 rounded-xl no-underline hover:opacity-90 transition-all"
      >
        Full {j.name} Profile
        <ExternalLink className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
