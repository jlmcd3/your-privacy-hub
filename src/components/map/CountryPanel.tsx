import { X, ExternalLink } from "lucide-react";
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
    <div className="w-[300px] flex-shrink-0 bg-card rounded-2xl border border-fog shadow-eup-md p-6 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-3xl mb-2">{j.flag}</div>
          <h2 className="font-display font-bold text-navy text-lg leading-tight">{j.name}</h2>
          <span
            className="inline-block mt-2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
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
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-fog hover:bg-blue/10 transition-colors border-none cursor-pointer text-slate"
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
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-light mb-1">
            {label}
          </div>
          <div className="text-navy text-[13px] leading-snug">{value}</div>
        </div>
      ))}

      <div className="mb-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-light mb-2">
          Consumer Rights
        </div>
        <ul className="space-y-1.5">
          {j.rights.map((r, i) => (
            <li key={i} className="flex gap-2 text-[12px] text-navy leading-snug">
              <span className="text-accent font-bold flex-shrink-0">✓</span>
              {r}
            </li>
          ))}
        </ul>
      </div>

      {j.fines.length > 0 && (
        <div className="mb-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-light mb-2">
            Recent Enforcement
          </div>
          <div className="space-y-1.5">
            {j.fines.map((f, i) => (
              <div
                key={i}
                className="bg-orange-50 border-l-[3px] border-orange-400 px-3 py-2 rounded-r-lg text-[11px] text-orange-800 leading-snug"
              >
                ⚖️ {f}
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        to={`/jurisdiction/${j.slug}`}
        className="flex items-center justify-center gap-2 w-full bg-gradient-to-br from-navy to-blue text-white font-bold text-[13px] py-3 rounded-xl no-underline hover:opacity-90 transition-all"
      >
        Full {j.name} Profile
        <ExternalLink className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
