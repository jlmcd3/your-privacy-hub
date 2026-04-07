import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface TrendReport {
  id: string;
  date: string;
  top_trends: Array<{
    title: string;
    summary: string;
    evidence_count: number;
    jurisdictions: string[];
    industries: string[];
  }>;
  emerging_risks: Array<{
    title: string;
    summary: string;
    risk_level: string;
    affected_industries: string[];
  }>;
  regulatory_patterns: Array<{
    pattern: string;
    description: string;
    evidence: string;
  }>;
  affected_industries: string[];
  jurisdictions: string[];
  confidence_score: number;
}

interface WeeklyBrief {
  id: string;
  week_label: string;
  headline: string;
  executive_summary: string;
  published_at: string;
}

export default function ThisWeekInPrivacy() {
  const [report, setReport] = useState<TrendReport | null>(null);
  const [brief, setBrief] = useState<WeeklyBrief | null>(null);

  useEffect(() => {
    // Try trend_reports first, fallback to weekly_briefs
    supabase
      .from("trend_reports")
      .select("id, date, top_trends, emerging_risks, regulatory_patterns, affected_industries, jurisdictions, confidence_score")
      .order("date", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setReport(data as unknown as TrendReport);
        } else {
          // Fallback to weekly_briefs
          supabase
            .from("weekly_briefs")
            .select("id, week_label, headline, executive_summary, published_at")
            .order("published_at", { ascending: false })
            .limit(1)
            .single()
            .then(({ data: briefData }) => {
              if (briefData) setBrief(briefData as WeeklyBrief);
            });
        }
      });
  }, []);

  // Render from trend_reports
  if (report) {
    const trends = (report.top_trends || []).slice(0, 3);
    const headline = trends[0]?.title || "Privacy Intelligence Synthesis";

    return (
      <div className="bg-gradient-to-br from-navy to-steel rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
            ✨TOP PRIVACY NEWS THIS WEEK
          </span>
          <span className="text-[10px] text-blue-200 bg-white/10 px-2 py-0.5 rounded-full">
            {report.date}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-blue-300 bg-white/10 px-2 py-0.5 rounded-full ml-auto">
            AI Synthesis
          </span>
        </div>

        <h2 className="font-display font-bold text-[18px] md:text-[20px] leading-snug mb-3">
          {headline}
        </h2>

        {trends.length > 0 && (
          <ul className="space-y-2 mb-4 list-none p-0 m-0">
            {trends.map((t, i) => (
              <li key={i} className="flex gap-2 text-[13px] text-blue-100 leading-relaxed">
                <span className="text-amber-400 flex-shrink-0">•</span>
                <span>
                  <strong className="text-white">{t.title}:</strong> {t.summary}
                </span>
              </li>
            ))}
          </ul>
        )}

        <Link
          to="/sample-brief"
          className="inline-block text-[12px] font-semibold text-navy bg-white hover:bg-white/90 px-4 py-2 rounded-lg no-underline transition-colors"
        >
          Read Full Brief →
        </Link>
      </div>
    );
  }

  // Fallback: render from weekly_briefs
  if (!brief) return null;

  const bullets = brief.executive_summary
    ? brief.executive_summary
        .split(/\n|(?<=\.)\s+(?=[A-Z])/)
        .map((s) => s.trim())
        .filter((s) => s.length > 10)
        .slice(0, 3)
    : [];

  return (
    <div className="bg-gradient-to-br from-navy to-steel rounded-2xl p-6 text-white mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
          ✨TOP PRIVACY NEWS THIS WEEK
        </span>
        {brief.week_label && (
          <span className="text-[10px] text-blue-200 bg-white/10 px-2 py-0.5 rounded-full">
            {brief.week_label}
          </span>
        )}
        <span className="text-[9px] font-bold uppercase tracking-wider text-blue-300 bg-white/10 px-2 py-0.5 rounded-full ml-auto">
          AI Synthesis
        </span>
      </div>

      <h2 className="font-display font-bold text-[18px] md:text-[20px] leading-snug mb-3">
        {brief.headline}
      </h2>

      {bullets.length > 0 && (
        <ul className="space-y-2 mb-4 list-none p-0 m-0">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-[13px] text-blue-100 leading-relaxed">
              <span className="text-amber-400 flex-shrink-0">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      <Link
        to="/sample-brief"
        className="inline-block text-[12px] font-semibold text-navy bg-white hover:bg-white/90 px-4 py-2 rounded-lg no-underline transition-colors"
      >
        Read Full Brief →
      </Link>
    </div>
  );
}
