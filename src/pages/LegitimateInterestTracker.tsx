import { useEffect, useState, useMemo, Fragment } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  LI_OUTCOME_ORDER,
  stripeFor,
  accentFor,
} from "@/lib/li-outcome-palette";

const OUTCOME_ORDER = LI_OUTCOME_ORDER;

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
    <div className="min-h-screen bg-brand-cloud">
      <Helmet>
        <title>Legitimate Interest Tracker — GDPR & UK GDPR Article 6(1)(f) | End User Privacy</title>
        <meta name="description" content="Track what EU and UK data protection authorities have accepted, rejected, and conditioned under GDPR and UK GDPR legitimate interest. Updated weekly from regulatory decisions and guidance." />
      </Helmet>
      <Navbar />

      {/* Header */}
      <header className="bg-slate-900 text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            ⚖️ Intelligence Guide
          </span>
          <h1 className="font-serif text-white mb-3">Legitimate Interest Tracker</h1>
          <p className="text-slate-300 text-lg max-w-3xl">Global privacy law, tracked daily.</p>
          
        </div>
      </header>

      <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Intro + 3-Part Test */}
        <div className="mb-10">
          <p className="text-[14px] text-brand-navy leading-relaxed mb-6 max-w-[70ch]">
            Under GDPR Article 6(1)(f) and the equivalent provision of the UK GDPR, organizations may rely on legitimate interest as a lawful basis for processing — but only if they can satisfy a <strong>three-part test</strong>. This tracker compiles enforcement decisions and official guidance from EU and UK data protection authorities showing which processing activities pass or fail that test.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-3">
            {[
              { n: "01", title: "Purpose", desc: "The interest must be lawful, specific, and present — not vague or speculative." },
              { n: "02", title: "Necessity", desc: "Processing must be strictly required; no less intrusive means could achieve the same purpose." },
              { n: "03", title: "Balancing", desc: "The individual's rights, freedoms, and reasonable expectations must not override the interest." },
            ].map((step, i) => (
              <Fragment key={step.n}>
                <div className="bg-card border-t-4 border-brand-navy p-5 shadow-eup-sm rounded-md">
                  <div className="text-[11px] font-bold tracking-widest uppercase text-brand-mist mb-1">Step {step.n}</div>
                  <h3 className="text-brand-navy mb-2">{step.title}</h3>
                  <p className="text-sm text-slate leading-relaxed">{step.desc}</p>
                </div>
                {i < 2 && <span className="hidden md:flex items-center justify-center text-brand-navy/30 text-2xl" aria-hidden>→</span>}
              </Fragment>
            ))}
          </div>
        </div>

        {/* Trend summary */}
        {trendSummary && (
          <div className="bg-card border border-brand-cloud rounded-2xl p-6 md:p-8 shadow-eup-sm mb-10">
            <div className="flex items-baseline justify-between mb-5">
              <div>
                <div className="text-[11px] font-bold tracking-widest uppercase text-brand-mist mb-1">Recent Enforcement Trends</div>
                <h3 className="text-brand-navy">Where authorities are landing this period</h3>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {new Date(trendSummary.period_end).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
            </div>
            <p className="text-sm text-slate leading-relaxed mb-6">{trendSummary.summary}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-5 border-t border-brand-cloud">
              <div className="border-l-2 border-green-600 pl-4">
                <h4 className="text-[11px] font-bold mb-3 uppercase tracking-wider text-green-700">Broadly Accepted</h4>
                <div className="flex flex-wrap gap-1.5">
                  {["Fraud prevention", "Network security", "Cybersecurity threat sharing", "IT incident response"].map(t => (
                    <span key={t} className="bg-green-50 text-green-800 px-2.5 py-1 rounded text-[11px]">{t}</span>
                  ))}
                </div>
              </div>
              <div className="border-l-2 border-red-600 pl-4">
                <h4 className="text-[11px] font-bold mb-3 uppercase tracking-wider text-red-700">Consistently Rejected</h4>
                <div className="flex flex-wrap gap-1.5">
                  {["Behavioral advertising", "Cross-site tracking", "Large-scale scraping", "Location profiling", "Third-party data sales"].map(t => (
                    <span key={t} className="bg-red-50 text-red-800 px-2.5 py-1 rounded text-[11px]">{t}</span>
                  ))}
                </div>
              </div>
              <div className="border-l-2 border-amber-500 pl-4">
                <h4 className="text-[11px] font-bold mb-3 uppercase tracking-wider text-amber-700">Contested / Unsettled</h4>
                <div className="flex flex-wrap gap-1.5">
                  {["AI model training", "Child-directed analytics", "Credit reporting"].map(t => (
                    <span key={t} className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded text-[11px]">{t}</span>
                  ))}
                </div>
              </div>
            </div>
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
            {/* Enforcement decision card grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
              {filtered.map((e, idx) => (
                <Fragment key={e.id}>
                  <article className="bg-card border border-brand-cloud rounded-xl shadow-eup-sm relative overflow-hidden flex">
                    <div className={`w-1.5 flex-shrink-0 ${stripeFor(e.outcome)}`} aria-hidden />
                    <div className="p-5 flex-1 min-w-0">
                      <h3 className="text-brand-navy mb-2 leading-snug">{e.processing_activity}</h3>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className="bg-muted text-muted-foreground px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded">{e.dpa_source}</span>
                        <span className="bg-muted text-muted-foreground px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded">{e.jurisdiction}</span>
                      </div>
                      <p className="text-sm text-slate leading-relaxed mb-4">{e.summary}</p>
                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-brand-cloud">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-[11px] font-bold uppercase tracking-wider capitalize ${accentFor(e.outcome)}`}>{e.outcome}</span>
                          <span className="text-muted-foreground/40">·</span>
                          <span className={`text-[11px] text-muted-foreground truncate ${signalStyle(e.signal_type)}`}>{e.signal_type}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex-shrink-0">
                          <SourceCell sourceUrl={e.source_url} caseReference={e.case_reference} />
                        </div>
                      </div>
                    </div>
                  </article>
                </Fragment>
              ))}
            </div>
          </>
        )}

        {/* Data sourcing note */}
        <div className="bg-muted/50 rounded-xl p-5 mb-10 text-[12px] text-muted-foreground leading-relaxed">
          This tracker compiles positions drawn from EDPB guidelines and opinions, ICO guidance and enforcement decisions, national DPA enforcement decisions and guidance across EU member states, and regulatory commentary surfaced through the End User Privacy article feed. Each entry links to the primary source document where available. Positions reflect the regulatory record as of the date shown and may evolve as new decisions are issued. This is informational only and does not constitute legal advice.
        </div>

        {/* Premium upsell */}
        <div className="bg-gradient-to-br from-brand-navy to-brand-ocean rounded-2xl p-6 md:p-8 text-center">
          <div className="text-[11px] font-bold tracking-widest uppercase text-brand-mist mb-2">⭐ Intelligence Intelligence</div>
          <h3 className="text-white mb-3">Go deeper with Intelligence</h3>
          <p className="text-sm text-brand-mist mb-5 max-w-[500px] mx-auto">
            Get full intelligence for weekly analysis of enforcement trends, sector-specific LI risk assessments, and action items tailored to your industry and jurisdictions.
          </p>
          <Link to="/subscribe" className="inline-block px-6 py-3 text-sm font-semibold text-brand-navy bg-white rounded-lg shadow-eup-md hover:-translate-y-0.5 transition-all no-underline">
            Unlock Weekly Intelligence →
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default LegitimateInterestTracker;
