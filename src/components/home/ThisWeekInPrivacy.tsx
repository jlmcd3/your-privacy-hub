import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface WeeklyBrief {
  id: string;
  week_label: string;
  headline: string;
  executive_summary: string;
  published_at: string;
}

export default function ThisWeekInPrivacy() {
  const [brief, setBrief] = useState<WeeklyBrief | null>(null);

  useEffect(() => {
    supabase
      .from("weekly_briefs")
      .select("id, week_label, headline, executive_summary, published_at")
      .order("published_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setBrief(data as WeeklyBrief);
      });
  }, []);

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
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
          ✨ This Week in Privacy
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

      {/* Headline */}
      <h2 className="font-display font-bold text-[18px] md:text-[20px] leading-snug mb-3">
        {brief.headline}
      </h2>

      {/* Intelligence bullets */}
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

      {/* CTA */}
      <Link
        to="/sample-brief"
        className="inline-block text-[12px] font-semibold text-navy bg-white hover:bg-white/90 px-4 py-2 rounded-lg no-underline transition-colors"
      >
        Read Full Brief →
      </Link>
    </div>
  );
}
