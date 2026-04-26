import { useEffect, useState, useMemo, Fragment } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import InFeedAd from "@/components/InFeedAd";
import { GOOGLE_AD_CLIENT, getAdSlot } from "@/config/adSlots";

const OUTCOME_ORDER = ["accepted", "conditional", "rejected", "contested"];

const outcomeBadge = (outcome: string) => {
  const styles: Record<string, string> = {
    accepted: "bg-green-100 text-green-800",
    conditional: "bg-amber-100 text-amber-800",
    rejected: "bg-red-100 text-red-800",
    contested: "bg-muted text-muted-foreground",
  };
  return styles[outcome] || styles.contested;
};

const signalStyle = (type: string) => {
  if (type === "Enforcement Decision" || type === "Official Guidance") return "font-bold";
  if (type === "Early Warning") return "italic";
  return "";
};

const SourceCell = ({ sourceUrl, caseReference }: { sourceUrl: string | null; caseReference: string | null }) => {
  if (sourceUrl && caseReference) {
    return (
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
      >
        {caseReference}
      </a>
    );
  }
  if (caseReference) return <span>{caseReference}</span>;
  return <span>—</span>;
};

const LegitimateInterestTracker = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [trendSummary, setTrendSummary] = useState<any>(null);
  const [outcomeFilter, setOutcomeFilter] = useState("All");
  const [signalFilter, setSignalFilter] = useState("All Signal Types");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("All Jurisdictions");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("li_tracker_entries").select("*"),
      supabase.from("li_trend_summaries").select("*").order("created_at", { ascending: false }).limit(1),
    ]).then(([entriesRes, trendRes]) => {
      if (entriesRes.data) {
        setEntries(entriesRes.data);
        const confirmed = entriesRes.data.map(d => d.last_confirmed).filter(Boolean).sort();
        if (confirmed.length) {
          setLastUpdated(new Date(confirmed[confirmed.length - 1] + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
        }
      }
      if (trendRes.data && trendRes.data.length) setTrendSummary(trendRes.data[0]);
      setLoading(false);
    });
  }, []);

  const jurisdictions = useMemo(() => {
    const set = new Set(entries.map(e => e.jurisdiction));
    return ["All Jurisdictions", ...Array.from(set).sort()];
  }, [entries]);

  const signalTypes = ["All Signal Types", "Enforcement Decision", "Official Guidance", "Regulatory Statement", "Early Warning", "Complaint Dismissed"];

  const filtered = useMemo(() => {
    let result = entries;
    if (outcomeFilter !== "All") result = result.filter(e => e.outcome === outcomeFilter.toLowerCase());
    if (signalFilter !== "All Signal Types") result = result.filter(e => e.signal_type === signalFilter);
    if (jurisdictionFilter !== "All Jurisdictions") result = result.filter(e => e.jurisdiction === jurisdictionFilter);
    return result.sort((a, b) => {
      const oi = OUTCOME_ORDER.indexOf(a.outcome) - OUTCOME_ORDER.indexOf(b.outcome);
      if (oi !== 0) return oi;
      return a.processing_activity.localeCompare(b.processing_activity);
    });
  }, [entries, outcomeFilter, signalFilter, jurisdictionFilter]);

  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>Legitimate Interest Tracker — GDPR & UK GDPR Article 6(1)(f) | EndUserPrivacy</title>
        <meta name="description" content="Track what EU and UK data protection authorities have accepted, rejected, and conditioned under GDPR and UK GDPR legitimate interest. Updated weekly from regulatory decisions and guidance." />
      </Helmet>
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-br from-navy-mid to-navy-light py-10 md:py-14 px-4 md:px-8">
        <div className="max-w-[860px] mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-sky mb-4 bg-sky/10 px-3 py-1.5 rounded-full border border-sky/20">
            ⚖️ Intelligence Guide
          </div>
          <h1 className="font-display text-[28px] md:text-[40px] text-white mb-3 leading-tight">Legitimate Interest Tracker</h1>
          <p className="text-sm md:text-base text-slate-light max-w-[700px]">Global privacy law, tracked daily.</p>
          <div className="text-[11px] text-slate-light mt-4">Last updated: {lastUpdated || "Updated regularly"}</div>
        </div>
      </div>

      <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Intro */}
        <div className="bg-card border border-fog rounded-2xl p-5 md:p-8 shadow-eup-sm mb-8">
          <p className="text-[14px] text-navy leading-relaxed">
            Under GDPR Article 6(1)(f) and the equivalent provision of the UK GDPR, organizations may process personal data without consent if they have a legitimate interest that is not overridden by the individual's rights and freedoms. Establishing this requires a three-part assessment: the interest must be lawful, specific, and present; the processing must be necessary to achieve it; and a balancing test must confirm the individual's interests do not take precedence. Data protection authorities across the EU and UK have issued enforcement decisions, official guidance, and public statements that define which processing activities are likely to pass or fail this test. This tracker compiles those positions in one place, updated weekly.
          </p>
        </div>

        {/* Trend summary */}
        {trendSummary && (
          <div className="bg-sky/5 border-l-4 border-[hsl(var(--navy))] rounded-xl p-5 mb-8">
            <div className="text-[10px] font-bold tracking-widest uppercase text-navy mb-2">Recent Trends</div>
            <p className="text-[13px] text-slate leading-relaxed">{trendSummary.summary}</p>
            <p className="text-[11px] text-muted-foreground mt-2">
              Updated {new Date(trendSummary.period_end).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
        )}

        {/* Signal type legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-6 text-[12px] text-slate">
          <span><strong>Enforcement Decision</strong> — Highest authority</span>
          <span><strong>Official Guidance</strong> — High authority</span>
          <span>Regulatory Statement — Medium</span>
          <span className="italic">Early Warning — Indicative</span>
          <span>Complaint Dismissed — Medium</span>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="flex flex-wrap gap-1.5">
            {["All", "Accepted", "Conditional", "Rejected", "Contested"].map(f => (
              <button
                key={f}
                onClick={() => setOutcomeFilter(f)}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-full border cursor-pointer transition-all bg-transparent ${
                  outcomeFilter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "text-muted-foreground border-border hover:bg-primary hover:text-primary-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <select
            value={signalFilter}
            onChange={e => setSignalFilter(e.target.value)}
            className="px-3 py-1.5 text-[12px] border border-border rounded-lg bg-background text-foreground"
          >
            {signalTypes.map(s => <option key={s}>{s}</option>)}
          </select>
          <select
            value={jurisdictionFilter}
            onChange={e => setJurisdictionFilter(e.target.value)}
            className="px-3 py-1.5 text-[12px] border border-border rounded-lg bg-background text-foreground"
          >
            {jurisdictions.map(j => <option key={j}>{j}</option>)}
          </select>
        </div>

        {/* Loading / Empty state */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading tracker data…</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-card border border-border rounded-2xl mb-10">
            <div className="animate-pulse rounded-full h-10 w-10 bg-muted mb-4 flex items-center justify-center">
              <span className="text-lg">⏳</span>
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Data is being loaded. Check back shortly.</p>
            <p className="text-xs text-muted-foreground">The tracker database is being populated.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden shadow-sm mb-10">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-muted">
                    <tr>
                      {["Processing Activity", "Outcome", "Signal Type", "Authority", "Jurisdiction", "Source"].map(h => (
                        <th key={h} className="px-3 py-3 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground text-left border-b border-border">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e, idx) => (
                      <Fragment key={e.id}>
                        <tr className="hover:bg-muted/50 transition-colors">
                          <td className="px-3 pt-3 pb-2 text-[13px] font-medium text-foreground">{e.processing_activity}</td>
                          <td className="px-3 pt-3 pb-2">
                            <span className={`text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full capitalize ${outcomeBadge(e.outcome)}`}>{e.outcome}</span>
                          </td>
                          <td className={`px-3 pt-3 pb-2 text-[12px] ${signalStyle(e.signal_type)}`}>{e.signal_type}</td>
                          <td className="px-3 pt-3 pb-2 text-[12px] text-foreground">{e.dpa_source}</td>
                          <td className="px-3 pt-3 pb-2 text-[12px] text-foreground">{e.jurisdiction}</td>
                          <td className="px-3 pt-3 pb-2 text-[11px] text-muted-foreground max-w-[140px]">
                            <SourceCell sourceUrl={e.source_url} caseReference={e.case_reference} />
                          </td>
                        </tr>
                        <tr className="hover:bg-muted/50 transition-colors">
                          <td colSpan={6} className="px-3 pt-0 pb-3 text-[12px] text-muted-foreground leading-relaxed border-b border-border">
                            {e.summary}
                          </td>
                        </tr>
                        {(idx + 1) % 8 === 0 && idx !== filtered.length - 1 && (
                          <tr>
                            <td colSpan={6} className="px-3 py-2 border-b border-border bg-muted/20">
                              <InFeedAd
                                adSlot={`li_tracker_infeed_${Math.floor(idx / 8)}`}
                                googleAdClient={GOOGLE_AD_CLIENT}
                                googleAdSlot={getAdSlot("feed_infeed_7").googleAdSlot}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3 mb-10">
              {filtered.map((e, idx) => (
                <Fragment key={e.id}>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <p className="font-bold text-[14px] text-foreground mb-2">{e.processing_activity}</p>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${outcomeBadge(e.outcome)}`}>{e.outcome}</span>
                      <span className={`text-[11px] text-muted-foreground ${signalStyle(e.signal_type)}`}>{e.signal_type} · {e.dpa_source}</span>
                    </div>
                    <p className="text-[12px] text-muted-foreground mb-1">{e.summary}</p>
                    <div className="text-[11px] text-muted-foreground">
                      <SourceCell sourceUrl={e.source_url} caseReference={e.case_reference} />
                    </div>
                  </div>
                  {(idx + 1) % 6 === 0 && idx !== filtered.length - 1 && (
                    <InFeedAd
                      adSlot={`li_tracker_infeed_m_${Math.floor(idx / 6)}`}
                      googleAdClient={GOOGLE_AD_CLIENT}
                      googleAdSlot={getAdSlot("feed_infeed_3").googleAdSlot}
                    />
                  )}
                </Fragment>
              ))}
            </div>
          </>
        )}

        {/* Data sourcing note */}
        <div className="bg-muted/50 rounded-xl p-5 mb-10 text-[12px] text-muted-foreground leading-relaxed">
          This tracker compiles positions drawn from EDPB guidelines and opinions, ICO guidance and enforcement decisions, national DPA enforcement decisions and guidance across EU member states, and regulatory commentary surfaced through the EndUserPrivacy article feed. Each entry links to the primary source document where available. Positions reflect the regulatory record as of the date shown and may evolve as new decisions are issued. This is informational only and does not constitute legal advice.
        </div>

        {/* Premium upsell */}
        <div className="bg-gradient-to-br from-navy to-navy-mid rounded-2xl p-6 md:p-8 text-center">
          <div className="text-[10px] font-bold tracking-widest uppercase text-sky mb-2">⭐ Intelligence Intelligence</div>
          <h3 className="font-display text-xl text-white mb-3">Go deeper with Intelligence</h3>
          <p className="text-[13px] text-slate-light mb-5 max-w-[500px] mx-auto">
            Get full intelligence for weekly analysis of enforcement trends, sector-specific LI risk assessments, and action items tailored to your industry and jurisdictions.
          </p>
          <Link to="/subscribe" className="inline-block px-6 py-3 text-sm font-semibold text-navy bg-white rounded-lg shadow-eup-md hover:-translate-y-0.5 transition-all no-underline">
            Unlock Weekly Intelligence →
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default LegitimateInterestTracker;
