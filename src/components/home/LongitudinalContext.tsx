import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Globe, Building2, ArrowRight } from "lucide-react";

interface LongitudinalSignal {
  id: string;
  topic_area: string;
  period_days: number;
  period_start: string;
  period_end: string;
  summary: string | null;
  key_observations: string[];
  jurisdictions_active: string[];
  sectors_affected: string[];
  article_count: number | null;
  generated_at: string;
}

const DIRECTION_LABELS: Record<string, { label: string; color: string }> = {
  Intensifying: { label: "Intensifying", color: "text-red-700 bg-red-50 border-red-200" },
  Stable: { label: "Stable", color: "text-blue-700 bg-blue-50 border-blue-200" },
  Cooling: { label: "Cooling", color: "text-green-700 bg-green-50 border-green-200" },
  Mixed: { label: "Mixed", color: "text-amber-700 bg-amber-50 border-amber-200" },
};

const TOPIC_LABELS: Record<string, string> = {
  "children-privacy": "Children's Privacy",
  biometric: "Biometric Data",
  adtech: "AdTech & Tracking",
  "ai-governance": "AI Governance",
  "health-data": "Health Data Privacy",
  "cross-border": "Cross-Border Transfers",
  enforcement: "Enforcement Trends",
};

interface LongitudinalContextProps {
  topicArea?: string;
}

export default function LongitudinalContext({ topicArea }: LongitudinalContextProps) {
  const [signal, setSignal] = useState<LongitudinalSignal | null>(null);

  useEffect(() => {
    let query = supabase
      .from("longitudinal_signals")
      .select("*")
      .order("generated_at", { ascending: false })
      .limit(1);

    if (topicArea) {
      query = query.eq("topic_area", topicArea);
    }

    query.single().then(({ data }) => {
      if (data) {
        setSignal(data as unknown as LongitudinalSignal);
      }
    });
  }, [topicArea]);

  if (!signal) return null;

  const observations = Array.isArray(signal.key_observations)
    ? signal.key_observations
    : [];

  const topicLabel = TOPIC_LABELS[signal.topic_area] || signal.topic_area.replace(/-/g, " ");

  return (
    <div className="rounded-xl border border-fog bg-white p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-steel" />
          <h3 className="font-display font-bold text-[15px] text-navy">
            {signal.period_days}-Day Context: {topicLabel}
          </h3>
        </div>
        <span className="text-[10px] text-slate bg-fog px-2 py-0.5 rounded-full">
          {new Date(signal.period_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {" – "}
          {new Date(signal.period_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>

      {/* Summary */}
      {signal.summary && (
        <p className="text-[13px] text-slate leading-relaxed mb-4">
          {signal.summary}
        </p>
      )}

      {/* Key observations */}
      {observations.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-navy mb-2">
            Key Observations
          </p>
          <ul className="space-y-1.5">
            {observations.map((obs, i) => (
              <li key={i} className="flex gap-2 text-[12px] text-slate leading-relaxed">
                <ArrowRight className="w-3 h-3 text-steel flex-shrink-0 mt-0.5" />
                <span>{obs}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-fog">
        {signal.jurisdictions_active && signal.jurisdictions_active.length > 0 && (
          <div className="flex items-center gap-1">
            <Globe className="w-3 h-3 text-slate-light" />
            <span className="text-[11px] text-slate">
              {signal.jurisdictions_active.slice(0, 4).join(", ")}
              {signal.jurisdictions_active.length > 4 && ` +${signal.jurisdictions_active.length - 4}`}
            </span>
          </div>
        )}
        {signal.sectors_affected && signal.sectors_affected.length > 0 && (
          <div className="flex items-center gap-1">
            <Building2 className="w-3 h-3 text-slate-light" />
            <span className="text-[11px] text-slate">
              {signal.sectors_affected.slice(0, 3).join(", ")}
              {signal.sectors_affected.length > 3 && ` +${signal.sectors_affected.length - 3}`}
            </span>
          </div>
        )}
        {signal.article_count && (
          <span className="text-[10px] text-slate-light ml-auto">
            Based on {signal.article_count} articles
          </span>
        )}
      </div>
    </div>
  );
}
