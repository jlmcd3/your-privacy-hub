import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { INTELLIGENCE_PRICING } from "@/config/pricing";

interface BriefPreview {
  week_label: string;
  headline: string;
  executive_summary: string;
  article_count: number;
}

const WeeklyBriefTeaser = () => {
  const { isPremium, isLoading } = usePremiumStatus();
  const [brief, setBrief] = useState<BriefPreview | null>(null);

  useEffect(() => {
    async function load() {
      // v9 Prompt 2.1: read from the public teaser view (anon-safe).
      // The base `weekly_briefs` table is now premium-only.
      const { data } = await (supabase as any)
        .from("weekly_briefs_teaser")
        .select("week_label, headline, teaser, article_count")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setBrief({
          week_label: data.week_label,
          headline: data.headline,
          executive_summary: data.teaser ?? "",
          article_count: data.article_count ?? 0,
        });
      }
    }
    load();
  }, []);

  const teaserText = brief?.executive_summary
    ? brief.executive_summary.split(". ").slice(0, 2).join(". ") + "…"
    : null;

  if (isLoading || isPremium) return null;

  return (
    <section className="py-10 md:py-14 px-4 md:px-8 bg-brand-cloud">
      <div className="max-w-[1280px] mx-auto">

        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display tracking-tight text-brand-navy">
              This Week's Weekly Brief
            </h2>
            <p className="text-sm text-slate mt-1">
              Synthesized from {brief?.article_count ?? "—"} regulatory updates ·
              8 sections · Published every Monday · <strong>Intelligence subscribers</strong>
              <span className="block text-[11px] text-brand-steel mt-1">
                Different from the free Monday Privacy Intelligence Report, which is a filtered headline digest.
              </span>
            </p>
          </div>
          <Link
            to="/#brief"
            className="text-sm font-medium text-brand-teal-text hover:underline no-underline hidden sm:block"
          >
            See a sample report →
          </Link>
        </div>

        {/* Brief card — fully open, no paywall */}
        <div className="bg-gradient-to-br from-[#0A1929] to-brand-navy rounded-2xl overflow-hidden border border-brand-slate-teal">

          {/* Header */}
          <div className="p-6 md:p-8 border-b border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11px] font-bold tracking-widest uppercase text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full">
                ⭐ Privacy Intelligence Report
              </span>
              {brief?.week_label && (
                <span className="text-[11px] text-slate ml-auto">{brief.week_label}</span>
              )}
            </div>
            <h3 className="text-[17px] text-white leading-snug mb-4">
              {brief?.headline ?? "This week's report is being prepared…"}
            </h3>
            {teaserText && (
              <p className="text-sm text-brand-mist leading-relaxed mb-5">
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
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/[0.08] border border-white/10 text-white/70"
                >
                  {s}
                </span>
              ))}
            </div>
            <Link
              to="/#brief"
              className="inline-flex items-center gap-2 bg-white text-brand-navy font-bold text-sm px-6 py-2.5 rounded-xl no-underline hover:opacity-90 transition-all"
            >
              See a sample report →
            </Link>
          </div>

          {/* Pro upgrade strip — clearly separated, additive not gating */}
          <div className="px-6 md:px-8 py-5 bg-white/[0.03] flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-[12px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                ⭐ Intelligence — {`${INTELLIGENCE_PRICING.monthly()}`}
              </p>
              <p className="text-sm text-brand-mist leading-snug">
                The full Privacy Intelligence Report, re-analyzed every Monday for your industry,
                your jurisdictions, and your compliance priorities.
                <span className="text-white"> Sector-specific context. Priorities. Action items.</span>
              </p>
            </div>
            <Link
              to="/subscribe"
              className="flex-shrink-0 bg-amber-500 hover:bg-amber-400 text-brand-navy font-bold text-sm px-5 py-2.5 rounded-xl no-underline transition-all text-center"
            >
              Get Intelligence →
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
};

export default WeeklyBriefTeaser;
