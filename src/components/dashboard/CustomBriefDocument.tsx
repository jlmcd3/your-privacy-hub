import { Link } from "react-router-dom";
import { CitedParagraphs } from "@/components/brief/CitedText";
import { SourcesList } from "@/components/brief/SourcesList";
import type { SourceMap } from "@/components/brief/CitedText";
import { formatFilterLabel } from "@/lib/filterLabels";

interface TopEnforcementSignal {
  id: string;
  regulator: string;
  jurisdiction: string;
  subject: string | null;
  summary: string | null;
  fine: string | null;
  fine_eur_equivalent: number | null;
  decision_date: string | null;
  precedent_significance: number | null;
  sector: string | null;
  violation_types: string[] | null;
  source_url: string | null;
}

interface Props {
  customBrief: any;
  sourceMap: SourceMap;
  /** When true, skip the dark gradient document header (used when an outer accordion already shows the title). */
  hideHeader?: boolean;
  /** @deprecated Briefs are immutable. Edit preferences from the dashboard or /brief-preferences. */
  showEditPreferencesLink?: boolean;
  /** Optional Top 10 enforcement signals rendered as the FINAL section of the brief document. */
  topEnforcementSignals?: TopEnforcementSignal[] | null;
}

/** Pretty-print a slug list, capping the visible count so the header stays tidy. */
function summarizeList(values: unknown, max = 4): { visible: string[]; extra: number } {
  const arr = Array.isArray(values) ? values.filter(Boolean).map(String) : [];
  const labels = arr.map(formatFilterLabel);
  return {
    visible: labels.slice(0, max),
    extra: Math.max(0, labels.length - max),
  };
}

/**
 * Renders a personalized "custom_briefs" document. Briefs are immutable
 * artifacts — there is no edit affordance inside the document itself.
 * The header surfaces the actual preferences (industries / jurisdictions /
 * topics / role) the brief was generated for, so subscribers can tell at a
 * glance which of their criteria shaped this week's analysis.
 */
export default function CustomBriefDocument({ customBrief, sourceMap, hideHeader = false }: Props) {
  if (!customBrief) return null;
  const sections = customBrief.custom_sections ?? {};
  const snapshot = customBrief.preferences_snapshot ?? null;

  const industries = snapshot ? summarizeList(snapshot.industries) : { visible: [], extra: 0 };
  const jurisdictions = snapshot ? summarizeList(snapshot.jurisdictions) : { visible: [], extra: 0 };
  const topics = snapshot ? summarizeList(snapshot.topics) : { visible: [], extra: 0 };
  const role = snapshot?.role ? String(snapshot.role).replace(/_/g, " ") : null;

  const criteriaGroups: Array<{ label: string; visible: string[]; extra: number }> = [
    { label: "Industries", ...industries },
    { label: "Jurisdictions", ...jurisdictions },
    { label: "Topics", ...topics },
  ].filter(g => g.visible.length > 0);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Document header */}
      {!hideHeader && (
      <div className="bg-gradient-to-r from-brand-navy to-brand-steel px-6 py-5">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full">
            ⭐ Your Personalized Brief — {customBrief.week_label}
          </span>
          {role && (
            <span className="text-[11px] text-blue-200/80 capitalize" title="Role this brief was tailored for">
              For: {role}
            </span>
          )}
        </div>
        {sections.opening_headline && (
          <h2 className="font-display text-white leading-tight">
            {sections.opening_headline}
          </h2>
        )}
        {criteriaGroups.length > 0 && (
          <div
            className="mt-4 pt-3 border-t border-white/10 space-y-1.5"
            title="Preferences in effect when this brief was generated"
          >
            {criteriaGroups.map(group => (
              <div key={group.label} className="flex items-start gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400/90 mt-0.5">
                  {group.label}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {group.visible.map(item => (
                    <span
                      key={item}
                      className="text-[11px] text-white bg-white/10 border border-white/15 px-2 py-0.5 rounded-full"
                    >
                      {item}
                    </span>
                  ))}
                  {group.extra > 0 && (
                    <span className="text-[11px] text-blue-200/80 px-1 py-0.5">
                      +{group.extra} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}
      <div className="px-6 py-2 divide-y divide-slate-100">
        {sections.your_critical_alert && (
          <section className="py-5">
            <div className={`rounded-lg px-4 py-3 ${
              sections.your_critical_alert.startsWith("Monitor week")
                ? "bg-blue-50 border-l-4 border-blue-400"
                : "bg-red-50 border-l-4 border-red-400"
            }`}>
              <p className={`text-[11px] font-bold uppercase tracking-wider mb-1.5 ${
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
            <h3 className="text-[11px] uppercase tracking-[0.12em] text-brand-steel mb-4">This Week</h3>
            <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
              <CitedParagraphs content={sections.your_week} sourceMap={sourceMap} />
            </div>
            <SourcesList sourceMap={sourceMap} usedIn={sections.your_week} />
          </section>
        )}

        {sections.industry_intelligence && (
          <section className="py-7">
            <h3 className="text-[11px] uppercase tracking-[0.12em] text-brand-steel mb-4">Your Industry</h3>
            <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
              <CitedParagraphs content={sections.industry_intelligence} sourceMap={sourceMap} />
            </div>
            <SourcesList sourceMap={sourceMap} usedIn={sections.industry_intelligence} />
          </section>
        )}

        {sections.jurisdiction_developments && (
          <section className="py-7">
            <h3 className="text-[11px] uppercase tracking-[0.12em] text-brand-steel mb-4">Your Jurisdictions</h3>
            <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
              <CitedParagraphs content={sections.jurisdiction_developments} sourceMap={sourceMap} />
            </div>
            <SourcesList sourceMap={sourceMap} usedIn={sections.jurisdiction_developments} />
          </section>
        )}

        {sections.topic_depth && (
          <section className="py-7">
            <h3 className="text-[11px] uppercase tracking-[0.12em] text-brand-steel mb-4">Topic Focus</h3>
            <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
              <CitedParagraphs content={sections.topic_depth} sourceMap={sourceMap} />
            </div>
            <SourcesList sourceMap={sourceMap} usedIn={sections.topic_depth} />
          </section>
        )}

        {sections.enforcement_pattern_for_you && (
          <section className="py-7">
            <h3 className="text-[11px] uppercase tracking-[0.12em] text-brand-steel mb-4">Enforcement Patterns</h3>
            <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
              <CitedParagraphs content={sections.enforcement_pattern_for_you} sourceMap={sourceMap} />
            </div>
            <SourcesList sourceMap={sourceMap} usedIn={sections.enforcement_pattern_for_you} />
          </section>
        )}

        {sections.what_to_ignore && (
          <section className="py-5">
            <div className="bg-slate-50 rounded-lg px-4 py-3 border-l-2 border-slate-300">
              <h3 className="text-[11px] uppercase tracking-wider text-slate-400 mb-2">📭 What to deprioritize this week</h3>
              <div className="text-sm text-slate-500 leading-relaxed">
                <CitedParagraphs content={sections.what_to_ignore} sourceMap={sourceMap} />
              </div>
            </div>
          </section>
        )}

        {sections.continuity_from_last_week && (
          <section className="py-7">
            <h3 className="text-[11px] uppercase tracking-[0.12em] text-brand-steel mb-4">From Last Week</h3>
            <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
              <CitedParagraphs content={sections.continuity_from_last_week} sourceMap={sourceMap} />
            </div>
            <SourcesList sourceMap={sourceMap} usedIn={sections.continuity_from_last_week} />
          </section>
        )}

        {sections.your_action_items?.length > 0 && (
          <section className="py-7">
            <div className="bg-brand-navy rounded-xl p-6">
              <h3 className="text-[11px] uppercase tracking-[0.12em] text-amber-400 mb-5">🎯 Action Items</h3>
              <div className="space-y-3">
                {sections.your_action_items.map((item: any, i: number) => (
                  <div key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-brand-navy text-[11px] font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
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
              <h3 className="text-[11px] uppercase tracking-wider text-amber-700 mb-2">📅 Coming Up</h3>
              <div className="text-sm text-amber-800 leading-relaxed">
                <CitedParagraphs content={sections.look_ahead} sourceMap={sourceMap} />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
