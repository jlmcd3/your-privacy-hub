import { Link } from "react-router-dom";
import { ExternalLink, Newspaper } from "lucide-react";
import BriefBuilder from "@/components/subscribe/BriefBuilder";
import { fmtDate } from "@/lib/dates";
import { normalizeTitle } from "@/lib/utils";
import { categoryClass, categoryLabel, CATEGORY_BADGE_CLASS } from "@/config/categories";
import type { ArticleItem } from "@/components/ArticleCard";

interface IntelligencePanelProps {
  selectedArticle: ArticleItem | null;
  isPremium: boolean;
  isAuthenticated: boolean;
  /** Force tier display regardless of auth — used on the homepage to demo each tier per slot. */
  forceTier?: "anonymous" | "free" | "paid";
}

export function IntelligencePanel({
  selectedArticle,
  isPremium,
  isAuthenticated,
  forceTier,
}: IntelligencePanelProps) {
  const tier = forceTier ?? (isPremium ? "paid" : isAuthenticated ? "free" : "anonymous");

  const actionProse = (() => {
    const items = selectedArticle?.action_items ?? [];
    if (!items.length) return null;
    const s = items.slice(0, 2).map((a) => a.action).filter(Boolean).join(". ");
    return s ? s + "." : null;
  })();

  const watchProse = (() => {
    const signals = selectedArticle?.related_signals ?? [];
    if (!signals.length) return null;
    const labels = signals.map((s) => s.label).filter(Boolean).join("; ");
    return labels ? `Watch: ${labels}.` : null;
  })();

  if (tier === "anonymous") {
    const jur = selectedArticle?.jurisdiction ?? "";
    const cat = selectedArticle?.category ?? "";
    const preParams = new URLSearchParams();
    if (jur) preParams.set("pre_jurisdiction", jur);
    if (cat) preParams.set("pre_topic", cat);
    const hasSeed = preParams.toString().length > 0;

    return (
      <div className="bg-card border border-brand-cloud rounded-xl overflow-hidden">
        <div className="bg-brand-navy px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-teal mb-0.5">
            Privacy Intelligence Brief
          </p>
          <h3 className="text-[17px] text-white leading-snug">
            Build your sample brief
          </h3>
          <p className="text-[12px] text-blue-200/80 mt-1">
            See what lands in your inbox every Monday.
          </p>
        </div>

        {hasSeed && selectedArticle && (
          <div className="px-4 py-2.5 bg-brand-teal/10 border-b border-brand-cloud flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-teal flex-shrink-0" />
            <p className="text-[11px] text-brand-navy/80">
              Context pre-loaded: {selectedArticle.jurisdiction || selectedArticle.category}
            </p>
          </div>
        )}

        <div className="px-4 py-4">
          <BriefBuilder />
        </div>
      </div>
    );
  }

  if (!selectedArticle) {
    return (
      <div className="bg-card border border-brand-cloud rounded-xl p-6 text-center">
        <Newspaper className="w-8 h-8 text-slate/30 mx-auto mb-3" />
        <p className="text-sm font-medium text-brand-navy mb-1">
          Select an article
        </p>
        <p className="text-[12px] text-slate leading-relaxed">
          Click any article in the feed to see{" "}
          {tier === "paid"
            ? "the full intelligence analysis"
            : "the analysis for your tier"}
          .
        </p>
      </div>
    );
  }

  const ArticleHeader = () => (
    <div className="pb-3 mb-3 border-b border-brand-cloud">
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {selectedArticle.source_name && (
          <span className="text-[11px] font-semibold text-slate uppercase tracking-wide">
            {selectedArticle.source_name}
          </span>
        )}
        {selectedArticle.published_at && (
          <span className="text-[11px] text-brand-mist">
            {fmtDate(selectedArticle.published_at)}
          </span>
        )}
        {selectedArticle.category && (
          <span className={`${CATEGORY_BADGE_CLASS} ${categoryClass(selectedArticle.category)}`}>
            {categoryLabel(selectedArticle.category)}
          </span>
        )}
        {selectedArticle.attention_level === "WATCH CLOSELY" && (
          <span className="text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200">
            Watch Closely
          </span>
        )}
      </div>
      {selectedArticle.source_url ? (
        <a
          href={selectedArticle.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-display text-[18px] font-bold text-brand-navy hover:text-brand-teal leading-snug block no-underline transition-colors"
        >
          {normalizeTitle(selectedArticle.title)}
          <ExternalLink className="w-3 h-3 inline ml-1 opacity-40 flex-shrink-0" />
        </a>
      ) : (
        <p className="font-display text-[18px] font-bold text-brand-navy leading-snug">
          {normalizeTitle(selectedArticle.title)}
        </p>
      )}
    </div>
  );

  if (tier === "free") {
    const why =
      selectedArticle.ai_summary?.why_it_matters ??
      selectedArticle.why_it_matters_short ??
      selectedArticle.ai_summary?.why_it_matters_short;

    return (
      <div className="bg-card border border-brand-cloud rounded-xl p-4">
        <ArticleHeader />
        {why ? (
          <p className="text-sm text-slate leading-relaxed mb-3">{why}</p>
        ) : (
          <p className="text-sm text-slate/50 italic mb-3">
            Analysis not yet available for this article.
          </p>
        )}
        <div className="rounded-lg bg-brand-cloud border border-brand-cloud px-3 py-2.5">
          <p className="text-[12px] text-slate/70 italic leading-relaxed">
            Platform subscribers see what to do about this and what to watch for
            next.{" "}
            <Link
              to="/subscribe"
              className="text-brand-teal font-semibold no-underline hover:underline"
            >
              See Platform →
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const why =
    selectedArticle.ai_summary?.why_it_matters ??
    selectedArticle.why_it_matters_short;
  const impact = selectedArticle.ai_summary?.compliance_impact;

  return (
    <div className="bg-card border border-brand-cloud rounded-xl p-4">
      <ArticleHeader />
      <div className="space-y-2.5">
        {why && (
          <p className="text-sm text-slate leading-relaxed">{why}</p>
        )}
        {impact && (
          <p className="text-sm text-slate leading-relaxed">{impact}</p>
        )}
        {(actionProse || watchProse) && (
          <p className="text-sm text-slate leading-relaxed">
            {actionProse}
            {actionProse && watchProse && " "}
            {watchProse && <span className="italic">{watchProse}</span>}
          </p>
        )}
        {!why && !impact && !actionProse && !watchProse && (
          <p className="text-sm text-slate/50 italic">
            Full analysis not yet available for this article.
          </p>
        )}
      </div>
    </div>
  );
}

export default IntelligencePanel;
