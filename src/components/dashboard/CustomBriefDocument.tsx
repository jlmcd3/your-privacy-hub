import { Link } from "react-router-dom";
import { CitedParagraphs } from "@/components/brief/CitedText";
import { SourcesList } from "@/components/brief/SourcesList";
import type { SourceMap } from "@/components/brief/CitedText";

interface Props {
  customBrief: any;
  sourceMap: SourceMap;
  showEditPreferencesLink?: boolean;
}

/**
 * Renders a personalized "custom_briefs" document with the same layout
 * used historically inline in the dashboard. Extracted so multiple briefs
 * (current + archived) can be rendered without duplicating markup.
 */
export default function CustomBriefDocument({ customBrief, sourceMap, showEditPreferencesLink = false }: Props) {
  if (!customBrief) return null;
  const sections = customBrief.custom_sections ?? {};

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Document header */}
      <div className="bg-gradient-to-r from-navy to-steel px-6 py-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full">
            ⭐ Your Personalized Brief — {customBrief.week_label}
          </span>
          {showEditPreferencesLink && (
            <Link to="/brief-preferences" className="text-[11px] text-blue-300 hover:text-white no-underline">
              Edit preferences →
            </Link>
          )}
        </div>
        {sections.opening_headline && (
          <h2 className="font-display text-[18px] md:text-[22px] text-white font-bold leading-tight">
            {sections.opening_headline}
          </h2>
        )}
      </div>

      {/* Section content */}
      <div className="px-6 py-2 divide-y divide-slate-100">
        {sections.your_critical_alert && (
          <section className="py-5">
            <div className={`rounded-lg px-4 py-3 ${
              sections.your_critical_alert.startsWith("Monitor week")
                ? "bg-blue-50 border-l-4 border-blue-400"
                : "bg-red-50 border-l-4 border-red-400"
            }`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                sections.your_critical_alert.startsWith("Monitor week") ? "text-blue-600" : "text-red-700"
              }`}>
                {sections.your_critical_alert.startsWith("Monitor week")
                  ? "📊 This week: monitoring mode"
                  : "⚡ Critical alert this week"}
              </p>
              <p className={`text-[14px] font-semibold leading-snug ${
                sections.your_critical_alert.startsWith("Monitor week") ? "text-blue-800" : "text-red-800"
              }`}>
                {sections.your_critical_alert}
              </p>
            </div>
          </section>
        )}

        {sections.your_week && (
          <section className="py-7">
            <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-4">This Week</h3>
            <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
              <CitedParagraphs content={sections.your_week} sourceMap={sourceMap} />
            </div>
            <SourcesList sourceMap={sourceMap} usedIn={sections.your_week} />
          </section>
        )}

        {sections.industry_intelligence && (
          <section className="py-7">
            <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-4">Your Industry</h3>
            <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
              <CitedParagraphs content={sections.industry_intelligence} sourceMap={sourceMap} />
            </div>
            <SourcesList sourceMap={sourceMap} usedIn={sections.industry_intelligence} />
          </section>
        )}

        {sections.jurisdiction_developments && (
          <section className="py-7">
            <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-4">Your Jurisdictions</h3>
            <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
              <CitedParagraphs content={sections.jurisdiction_developments} sourceMap={sourceMap} />
            </div>
            <SourcesList sourceMap={sourceMap} usedIn={sections.jurisdiction_developments} />
          </section>
        )}

        {sections.topic_depth && (
          <section className="py-7">
            <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-4">Topic Focus</h3>
            <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
              <CitedParagraphs content={sections.topic_depth} sourceMap={sourceMap} />
            </div>
            <SourcesList sourceMap={sourceMap} usedIn={sections.topic_depth} />
          </section>
        )}

        {sections.enforcement_pattern_for_you && (
          <section className="py-7">
            <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-4">Enforcement Patterns</h3>
            <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
              <CitedParagraphs content={sections.enforcement_pattern_for_you} sourceMap={sourceMap} />
            </div>
            <SourcesList sourceMap={sourceMap} usedIn={sections.enforcement_pattern_for_you} />
          </section>
        )}

        {sections.what_to_ignore && (
          <section className="py-5">
            <div className="bg-slate-50 rounded-lg px-4 py-3 border-l-2 border-slate-300">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">📭 What to deprioritize this week</h3>
              <div className="text-[13px] text-slate-500 leading-relaxed">
                <CitedParagraphs content={sections.what_to_ignore} sourceMap={sourceMap} />
              </div>
            </div>
          </section>
        )}

        {sections.continuity_from_last_week && (
          <section className="py-7">
            <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-4">From Last Week</h3>
            <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
              <CitedParagraphs content={sections.continuity_from_last_week} sourceMap={sourceMap} />
            </div>
            <SourcesList sourceMap={sourceMap} usedIn={sections.continuity_from_last_week} />
          </section>
        )}

        {sections.your_action_items?.length > 0 && (
          <section className="py-7">
            <div className="bg-navy rounded-xl p-6">
              <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-amber-400 mb-5">🎯 Action Items</h3>
              <div className="space-y-3">
                {sections.your_action_items.map((item: any, i: number) => (
                  <div key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-navy text-[11px] font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          item.priority === "Immediate"
                            ? "bg-red-500/20 text-red-300 border border-red-400/30"
                            : item.priority?.includes("quarter")
                            ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                            : "bg-blue-500/20 text-blue-300 border border-blue-400/30"
                        }`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-[14px] text-white font-medium mb-0.5">{item.action}</p>
                      <p className="text-[12px] text-blue-200">{item.why_now}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {sections.look_ahead && (
          <section className="py-5">
            <div className="bg-amber-50 rounded-lg px-4 py-3 border-l-2 border-amber-400">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-2">📅 Coming Up</h3>
              <div className="text-[13px] text-amber-800 leading-relaxed">
                <CitedParagraphs content={sections.look_ahead} sourceMap={sourceMap} />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
