import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, TrendingUp, Shield } from "lucide-react";

interface EnforcementPattern {
  pattern: string;
  description: string;
  regulators?: string[];
  sectors_targeted?: string[];
  signal_strength?: string;
  example?: string;
}

const SIGNAL_COLORS: Record<string, string> = {
  Strong: "bg-red-100 text-red-800 border-red-200",
  Moderate: "bg-amber-100 text-amber-800 border-amber-200",
  Emerging: "bg-blue-100 text-blue-700 border-blue-200",
};

const SIGNAL_ICONS: Record<string, typeof AlertTriangle> = {
  Strong: AlertTriangle,
  Moderate: TrendingUp,
  Emerging: Shield,
};

export default function PatternSignalCards() {
  const [patterns, setPatterns] = useState<EnforcementPattern[]>([]);
  const [reportDate, setReportDate] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("trend_reports")
      .select("enforcement_patterns, date")
      .order("date", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data?.enforcement_patterns) {
          const parsed = data.enforcement_patterns as unknown as EnforcementPattern[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPatterns(parsed);
            setReportDate(data.date);
          }
        }
      });
  }, []);

  if (patterns.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] text-brand-navy">
          Enforcement Pattern Signals
        </h3>
        {reportDate && (
          <span className="text-meta text-slate bg-brand-cloud px-2 py-0.5 rounded-full">
            {new Date(reportDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {patterns.slice(0, 3).map((p, i) => {
          const strength = p.signal_strength || "Emerging";
          const colorClass = SIGNAL_COLORS[strength] || SIGNAL_COLORS.Emerging;
          const Icon = SIGNAL_ICONS[strength] || Shield;

          return (
            <div
              key={i}
              className="rounded-xl border border-brand-cloud bg-white p-4 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 text-eyebrow px-2 py-0.5 rounded-full border ${colorClass}`}
                >
                  <Icon className="w-3 h-3" />
                  {strength}
                </span>
              </div>
              <h4 className="font-bold text-sm text-brand-navy leading-snug">
                {p.pattern}
              </h4>
              <p className="text-meta text-slate leading-relaxed line-clamp-3 flex-1">
                {p.description}
              </p>
              {p.sectors_targeted && p.sectors_targeted.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {p.sectors_targeted.slice(0, 3).map((s) => (
                    <span
                      key={s}
                      className="text-meta font-medium text-slate bg-brand-cloud px-1.5 py-0.5 rounded"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
              {p.example && (
                <p className="text-meta text-brand-mist italic leading-snug line-clamp-2 border-t border-brand-cloud pt-2 mt-auto">
                  {p.example}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
