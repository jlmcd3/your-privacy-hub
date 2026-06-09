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
          // v9 Prompt 2.1: anon-safe teaser view (base weekly_briefs is premium-only).
          (supabase as any)
            .from("weekly_briefs_teaser")
            .select("id, week_label, headline, teaser, published_at")
            .order("published_at", { ascending: false })
            .limit(1)
            .maybeSingle()
            .then(({ data: briefData }: any) => {
              if (briefData) {
                setBrief({
                  id: briefData.id,
                  week_label: briefData.week_label,
                  headline: briefData.headline,
                  executive_summary: briefData.teaser ?? "",
                  published_at: briefData.published_at,
                });
              }
            });
        }
      });
  }, []);

  // Render from trend_reports
  if (report) {
    const trends = (report.top_trends || []).slice(0, 3);
    const headline = trends[0]?.title || "Privacy Intelligence Synthesis";

    return (
      <div className="bg-gradient-to-br from-brand-navy to-brand-steel rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-display text-white">
            This Week in Privacy
          </h2>
          <span className="text-meta text-blue-200 bg-white/10 px-2 py-0.5 rounded-full ml-auto">
            {report.date}
          </span>
        </div>

        <h2 className="font-display leading-snug mb-3">
          {headline}
        </h2>

        {trends.length > 0 && (
          <ul className="space-y-2 mb-4 list-none p-0 m-0">
            {trends.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm text-blue-100 leading-relaxed">
                <span className="text-amber-400 flex-shrink-0">•</span>
                <span>
                  <strong className="text-white">{t.title}:</strong> {t.summary}
                </span>
              </li>
            ))}
          </ul>
        )}

        <Link
          to="/#brief"
          className="inline-block text-meta font-semibold text-brand-navy bg-white hover:bg-white/90 px-4 py-2 rounded-lg no-underline transition-colors"
        >
          Read this week's brief →
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
    <div className="bg-gradient-to-br from-brand-navy to-brand-steel rounded-2xl p-6 text-white mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-display text-white">
          This Week in Privacy
        </h2>
        {brief.week_label && (
          <span className="text-meta text-blue-200 bg-white/10 px-2 py-0.5 rounded-full ml-auto">
            {brief.week_label}
          </span>
        )}
      </div>

      <h2 className="font-display leading-snug mb-3">
        {brief.headline}
      </h2>

      {bullets.length > 0 && (
        <ul className="space-y-2 mb-4 list-none p-0 m-0">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm text-blue-100 leading-relaxed">
              <span className="text-amber-400 flex-shrink-0">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      <Link
        to="/#brief"
        className="inline-block text-meta font-semibold text-brand-navy bg-white hover:bg-white/90 px-4 py-2 rounded-lg no-underline transition-colors"
      >
        Read this week's brief →
      </Link>
    </div>
  );
}
