import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface BriefPreview {
  week_label: string;
  headline: string;
  executive_summary: string;
  article_count: number;
}

const WeeklyBriefTeaser = () => {
  const [brief, setBrief] = useState<BriefPreview | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await (supabase as any)
        .from("weekly_briefs")
        .select("week_label, headline, executive_summary, article_count")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setBrief(data as BriefPreview);
    }
    load();
  }, []);

  const teaserText = brief?.executive_summary
    ? brief.executive_summary.split(". ").slice(0, 2).join(". ") + "…"
    : null;

  return (
    <section className="py-10 md:py-14 px-4 md:px-8 bg-paper">
      <div className="max-w-[1280px] mx-auto">

        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-[22px] md:text-[26px] tracking-tight text-navy">
              This Week's Intelligence Brief
            </h2>
            <p className="text-[13px] text-slate mt-1">
              AI-synthesized from {brief?.article_count ?? "—"} regulatory updates ·
              8 sections · Published every Monday · <strong>Free</strong>
            </p>
          </div>
          <Link
            to="/sample-brief"
            className="text-[13px] font-medium text-blue hover:underline no-underline hidden sm:block"
          >
            See a sample brief →
          </Link>
        </div>

        {/* Brief card — fully open, no paywall */}
        <div className="bg-gradient-to-br from-[#0A1929] to-navy rounded-2xl overflow-hidden border border-navy-light">

          {/* Header */}
          <div className="p-6 md:p-8 border-b border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[9px] font-bold tracking-widest uppercase text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-0.5 rounded-full">
                ✓ Free — no subscription required
              </span>
              {brief?.week_label && (
                <span className="text-[11px] text-slate ml-auto">{brief.week_label}</span>
              )}
            </div>
            <h3 className="font-display text-[17px] md:text-[20px] text-white leading-snug mb-4">
              {brief?.headline ?? "This week's brief is being prepared…"}
            </h3>
            {teaserText && (
              <p className="text-[13px] text-slate-light leading-relaxed mb-5">
                {teaserText}
              </p>
            )}
            {/* Section pills — all free */}
            <div className="flex flex-wrap gap-1.5 mb-5">
              {[
                "Executive Summary", "US Federal", "US States",
                "EU & UK", "Global", "Enforcement Table",
                "Trend Signal", "Why This Matters"
              ].map((s) => (
                <span
                  key={s}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.08] border border-white/10 text-white/70"
                >
                  {s}
                </span>
              ))}
            </div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-white text-navy font-bold text-[13px] px-6 py-2.5 rounded-xl no-underline hover:opacity-90 transition-all"
            >
              Read this week's brief →
            </Link>
          </div>

          {/* Pro upgrade strip — clearly separated, additive not gating */}
          <div className="px-6 md:px-8 py-5 bg-white/[0.03] flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-[12px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                ⭐ Premium Pro — $20/month
              </p>
              <p className="text-[13px] text-slate-light leading-snug">
                The same brief re-written specifically for your industry,
                your jurisdictions, and your compliance priorities.
                <span className="text-white"> Not filtered — actually re-analyzed for you.</span>
              </p>
            </div>
            <Link
              to="/subscribe"
              className="flex-shrink-0 bg-amber-500 hover:bg-amber-400 text-navy font-bold text-[13px] px-5 py-2.5 rounded-xl no-underline transition-all text-center"
            >
              Get your analyst →
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
};

export default WeeklyBriefTeaser;
