import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, AlertTriangle, TrendingUp, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface EnforcementPattern {
  pattern: string;
  description: string;
  regulators?: string[];
  sectors_targeted?: string[];
  signal_strength?: string;
  example?: string;
}

const SIGNAL_COLORS: Record<string, { badge: string; border: string }> = {
  Strong: {
    badge: "bg-red-100 text-red-800 border-red-200",
    border: "border-l-red-400",
  },
  Moderate: {
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    border: "border-l-amber-400",
  },
  Emerging: {
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    border: "border-l-blue-400",
  },
};

const SIGNAL_ICONS: Record<string, typeof AlertTriangle> = {
  Strong: AlertTriangle,
  Moderate: TrendingUp,
  Emerging: Shield,
};

export default function EnforcementPatternIntelligence() {
  const [patterns, setPatterns] = useState<EnforcementPattern[]>([]);
  const [reportDate, setReportDate] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

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
            setPatterns(parsed.slice(0, 3));
            setReportDate(data.date);
          }
        }
      });
  }, []);

  if (patterns.length === 0) return null;

  const toggle = (i: number) =>
    setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <div className="bg-muted/50 rounded-2xl px-4 md:px-6 py-6 mb-6">
      <div className="mb-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
          Enforcement Pattern Intelligence
        </p>
        <p className="text-[11px] text-muted-foreground">
          Updated weekly · Based on actions in this tracker
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {patterns.map((p, i) => {
          const strength = p.signal_strength || "Emerging";
          const colors = SIGNAL_COLORS[strength] || SIGNAL_COLORS.Emerging;
          const Icon = SIGNAL_ICONS[strength] || Shield;
          const isOpen = !!expanded[i];

          return (
            <div
              key={i}
              className={`bg-white border border-border rounded-xl border-l-4 ${colors.border} overflow-hidden`}
            >
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left bg-transparent cursor-pointer border-none"
              >
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex-shrink-0 ${colors.badge}`}
                >
                  <Icon className="w-3 h-3" />
                  {strength}
                </span>
                <span className="font-display font-bold text-[13px] text-foreground leading-snug flex-1 min-w-0">
                  {p.pattern}
                </span>
                {reportDate && (
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:inline">
                    {new Date(reportDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-0 border-t border-border">
                  <p className="text-[12px] text-muted-foreground leading-relaxed mt-3">
                    {p.description}
                  </p>
                  {p.sectors_targeted && p.sectors_targeted.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {p.sectors_targeted.map((s) => (
                        <span
                          key={s}
                          className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  {p.example && (
                    <p className="text-[11px] text-muted-foreground/70 italic leading-snug mt-2">
                      {p.example}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground mt-4">
        Full pattern analysis, written for your industry and jurisdictions — in
        the weekly Intelligence Brief.{" "}
        <Link
          to="/sample-brief"
          className="text-primary font-medium no-underline hover:underline"
        >
          See a sample →
        </Link>
      </p>
    </div>
  );
}
