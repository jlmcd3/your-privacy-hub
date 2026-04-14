import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, ExternalLink } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import EmailSignup from "@/components/EmailSignup";
import EnforcementCharts from "@/components/enforcement/EnforcementCharts";
import EnforcementPatternIntelligence from "@/components/enforcement/EnforcementPatternIntelligence";

interface EnforcementAction {
  id: string;
  etid: string | null;
  regulator: string;
  subject: string | null;
  jurisdiction: string;
  violation: string | null;
  law: string | null;
  fine_amount: string | null;
  fine_eur: number | null;
  decision_date: string | null;
  source_url: string | null;
  sector: string | null;
  action_type: string | null;
}

const FILTER_PILLS = [
  { key: "all", label: "All" },
  { key: "eu", label: "🇪🇺 EU/GDPR" },
  { key: "us-federal", label: "🇺🇸 US Federal" },
  { key: "us-states", label: "🗺️ US States" },
  { key: "global", label: "🌐 Global" },
];

const JURISDICTION_OPTIONS = [
  { key: "all", label: "All Jurisdictions" },
  { key: "eu", label: "🇪🇺 EU" },
  { key: "uk", label: "🇬🇧 UK" },
  { key: "us", label: "🇺🇸 United States" },
  { key: "brazil", label: "🇧🇷 Brazil" },
  { key: "south-korea", label: "🇰🇷 South Korea" },
  { key: "china", label: "🇨🇳 China" },
  { key: "japan", label: "🇯🇵 Japan" },
  { key: "india", label: "🇮🇳 India" },
  { key: "canada", label: "🇨🇦 Canada" },
  { key: "australia", label: "🇦🇺 Australia" },
  { key: "other", label: "🌐 Other" },
];

function matchJurisdiction(action: EnforcementAction, key: string): boolean {
  if (key === "all") return true;
  const j = (action.jurisdiction || "").toLowerCase();
  if (key === "eu") return j.includes("eu") && !j.includes("uk");
  if (key === "uk") return j.includes("uk");
  if (key === "us") return j.includes("u.s.") || j.includes("federal");
  if (key === "brazil") return j.includes("brazil");
  if (key === "south-korea") return j.includes("korea");
  if (key === "china") return j.includes("china");
  if (key === "japan") return j.includes("japan");
  if (key === "india") return j.includes("india");
  if (key === "canada") return j.includes("canada");
  if (key === "australia") return j.includes("australia");
  if (key === "other") {
    return !["eu", "uk", "u.s.", "federal", "brazil", "korea", "china", "japan", "india", "canada", "australia"]
      .some((k) => j.includes(k));
  }
  return true;
}

function matchFilter(action: EnforcementAction, key: string): boolean {
  if (key === "all") return true;
  const j = (action.jurisdiction || "").toLowerCase();
  const l = (action.law || "").toLowerCase();
  if (key === "eu") return j.includes("eu") || j.includes("uk") || l.includes("gdpr");
  if (key === "us-federal") return j.includes("federal") || l.includes("ftc");
  if (key === "us-states") return j.includes("u.s. —") && !j.includes("federal");
  if (key === "global") return !j.includes("eu") && !j.includes("uk") && !j.includes("u.s.");
  return true;
}

const EnforcementTrackerPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [actions, setActions] = useState<EnforcementAction[]>([]);
  const [liveArticles, setLiveArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [jurisdictionFilter, setJurisdictionFilter] = useState("all");

  useEffect(() => {
    async function load() {
      const [actionsRes, articlesRes] = await Promise.all([
        supabase.from("enforcement_actions").select("*").order("decision_date", { ascending: false }),
        supabase.from("updates").select("id,title,url,source_name,image_url,published_at").eq("category", "enforcement").order("published_at", { ascending: false }).limit(20),
      ]);
      setActions((actionsRes.data as EnforcementAction[]) || []);
      setLiveArticles(articlesRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = actions
    .filter((a) => matchFilter(a, activeFilter))
    .filter((a) => matchJurisdiction(a, jurisdictionFilter))
    .filter((a) =>
      !searchTerm || [a.regulator, a.subject, a.jurisdiction, a.violation, a.law, a.fine_amount]
        .some((v) => v?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  // Stats
  const totalActions = actions.length;
  const totalFinesEur = actions.reduce((sum, a) => sum + (a.fine_eur || 0), 0);
  const regulatorCounts = actions.reduce((acc, a) => { acc[a.regulator] = (acc[a.regulator] || 0) + 1; return acc; }, {} as Record<string, number>);
  const topRegulator = Object.entries(regulatorCounts).sort((a, b) => b[1] - a[1])[0];

  // Top 5 regulators for bar chart
  const topRegulators = Object.entries(regulatorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxCount = topRegulators[0]?.[1] || 1;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Privacy Enforcement Tracker 2026 — Live GDPR Fines &amp; US Cases | EndUserPrivacy</title>
        <meta name="description" content="Live database of GDPR fines, FTC enforcement actions, US state AG cases, and global privacy penalties. Updated daily from 119 regulators." />
        <script type="application/ld+json">{`{"@context":"https://schema.org","@type":"Dataset","name":"Privacy Enforcement Tracker","description":"Live database of global privacy enforcement actions, GDPR fines, and US regulatory cases","url":"https://enduserprivacy.com/enforcement-tracker","publisher":{"@type":"Organization","name":"EndUserPrivacy"}}`}</script>
      </Helmet>
      <Navbar />
      <div className="bg-gradient-to-br from-navy-mid to-navy-light py-12 px-8">
        <div className="max-w-[1280px] mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-sky mb-4 bg-sky/10 px-3 py-1.5 rounded-full border border-sky/20">
            ⚖️ Enforcement Database
          </div>
          <h1 className="font-display text-[36px] text-white mb-3">Enforcement Tracker</h1>
          <p className="text-base text-slate-light max-w-[700px]">
            Live enforcement tracking across 119+ regulatory authorities — updated as actions are confirmed.
          </p>
        </div>
      </div>

      <AdBanner variant="leaderboard" adSlot="eup-enforcement-top" className="py-3 hidden" />

      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-10">
        {/* Stats summary header */}
        {actions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-fog rounded-xl p-4 text-center">
              <div className="font-display text-[32px] font-bold text-navy">{actions.length}</div>
              <div className="text-[12px] text-slate mt-1">Actions tracked</div>
            </div>
            <div className="bg-card border border-fog rounded-xl p-4 text-center">
              <div className="font-display text-[32px] font-bold text-navy">
                {Object.entries(
                  actions.reduce((acc, a) => {
                    const key = a.jurisdiction || 'Other';
                    acc[key] = (acc[key] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).sort(([,a],[,b]) => b - a)[0]?.[0]?.split(' — ')[0] || '—'}
              </div>
              <div className="text-[12px] text-slate mt-1">Most active jurisdiction</div>
            </div>
            <div className="bg-card border border-fog rounded-xl p-4 text-center">
              <div className="font-display text-[32px] font-bold text-navy">
                {actions.filter(a => a.fine_eur).sort((a, b) => (b.fine_eur || 0) - (a.fine_eur || 0))[0]?.fine_amount || '—'}
              </div>
              <div className="text-[12px] text-slate mt-1">Largest tracked fine</div>
            </div>
          </div>
        )}

        {/* Enforcement Pattern Intelligence */}
        <EnforcementPatternIntelligence />

        {/* Search & filters */}
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center mb-6">
          <div className="relative flex-1 max-w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              className="w-full py-2 pl-10 pr-4 text-sm border border-border rounded-lg bg-background text-foreground outline-none focus:border-primary transition-colors"
              placeholder="Search enforcement actions…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {FILTER_PILLS.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all cursor-pointer bg-transparent ${
                  activeFilter === f.key
                    ? "bg-primary/10 text-primary border-primary/25 font-semibold"
                    : "text-muted-foreground border-border hover:border-primary/20"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <select
            value={jurisdictionFilter}
            onChange={(e) => setJurisdictionFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary transition-colors cursor-pointer"
          >
            {JURISDICTION_OPTIONS.map((j) => (
              <option key={j.key} value={j.key}>{j.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="ml-auto text-xs font-medium text-primary hover:text-primary/80 bg-transparent border border-primary/20 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
          >
            + Submit an Action
          </button>
        </div>

        <div className="text-xs text-muted-foreground mb-3">{filtered.length} actions</div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
             <table className="w-full border-collapse">
              <thead className="bg-muted">
                <tr>
                  {["Regulator", "Company", "Jurisdiction", "Violation", "Fine", "Date", "Source"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground text-left border-b border-border">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="px-4 py-3 border-b border-border"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-foreground border-b border-border">{row.regulator}</td>
                      <td className="px-4 py-3 text-sm text-foreground font-medium border-b border-border">{row.subject}</td>
                      <td className="px-4 py-3 text-sm text-foreground border-b border-border">{row.jurisdiction}</td>
                      <td className="px-4 py-3 text-sm text-foreground border-b border-border max-w-[300px] truncate">{row.violation}</td>
                      <td className="px-4 py-3 font-semibold text-destructive text-sm border-b border-border">{row.fine_amount}</td>
                      <td className="px-4 py-3 text-sm text-foreground border-b border-border whitespace-nowrap">
                        {row.decision_date ? new Date(row.decision_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm border-b border-border">
                        {row.source_url ? (
                          <a
                            href={row.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm inline-flex items-center gap-1 no-underline"
                          >
                            View ↗
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats cards */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 mt-8">
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Actions</p>
              <p className="text-3xl font-bold text-foreground">{totalActions}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Fines (EUR)</p>
              <p className="text-3xl font-bold text-foreground">€{(totalFinesEur / 1_000_000).toFixed(1)}M</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Most Active Regulator</p>
              <p className="text-xl font-bold text-foreground">{topRegulator?.[0] || "—"}</p>
              <p className="text-xs text-muted-foreground">{topRegulator?.[1] === 1 ? "1 action" : `${topRegulator?.[1] || 0} actions`}</p>
            </div>
          </div>
        )}

        {/* Top regulators bar chart */}
        {!loading && topRegulators.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 mb-8">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Top Regulators by Number of Actions</p>
            <div className="space-y-2">
              {topRegulators.map(([name, count]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-xs text-foreground w-[160px] truncate font-medium">{name}</span>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Premium CTA */}
        <div className="p-7 mt-6 bg-card border border-border rounded-xl text-center">
          <div className="text-[10px] font-bold tracking-widest uppercase text-primary mb-2">⭐ Premium Intelligence</div>
          <p className="text-foreground font-semibold text-[15px] mb-1">Get full enforcement analysis every Monday</p>
          <p className="text-muted-foreground text-sm mb-4">Premium subscribers receive enforcement insights with AI-synthesized compliance implications.</p>
          <Link to="/subscribe" className="inline-block px-6 py-2.5 text-sm font-semibold text-primary-foreground bg-primary rounded-lg hover:opacity-90 transition-all no-underline">
            View Premium Plans →
          </Link>
        </div>

        {/* Live enforcement news */}
        {liveArticles.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="font-display text-xl text-foreground">Latest Enforcement News</h2>
              <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">Live</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveArticles.map((a: any) => (
                <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all no-underline">
                  {a.image_url && <img src={a.image_url} alt="" className="w-20 h-14 object-cover rounded-lg flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                      {a.source_name} · {new Date(a.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">{a.title}</p>
                  </div>
                  <ExternalLink size={12} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                </a>
              ))}
            </div>
          </div>
        )}

        <EnforcementCharts />

        <div className="mt-8">
          <EmailSignup variant="card" />
        </div>

        <AdBanner variant="inline" adSlot="eup-enforcement-mid" className="py-3" />
      </div>

      {/* Submit Modal */}
      {showSubmitModal && <SubmitModal onClose={() => setShowSubmitModal(false)} />}

      <Footer />
    </div>
  );
};

const SubmitModal = ({ onClose }: { onClose: () => void }) => {
  const [form, setForm] = useState({ regulator: "", subject: "", jurisdiction: "", violation: "", law: "", fine_amount: "", source_url: "", submitted_by: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await supabase.from("enforcement_submissions").insert(form);
    setSubmitting(false);
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-foreground mb-4">Submit an Enforcement Action</h3>
        {done ? (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">✓</p>
            <p className="font-semibold text-foreground">Thank you! Submission received for review.</p>
            <button onClick={onClose} className="mt-4 text-sm text-primary cursor-pointer bg-transparent border-none">Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {[
              { key: "regulator", label: "Regulator", required: true },
              { key: "subject", label: "Company/Subject" },
              { key: "jurisdiction", label: "Jurisdiction", required: true },
              { key: "violation", label: "Violation" },
              { key: "law", label: "Law" },
              { key: "fine_amount", label: "Fine Amount" },
              { key: "source_url", label: "Source URL" },
              { key: "submitted_by", label: "Your Email (optional)" },
            ].map((field) => (
              <div key={field.key}>
                <label className="text-xs font-medium text-muted-foreground block mb-1">{field.label}</label>
                <input
                  type="text"
                  required={field.required}
                  value={(form as any)[field.key]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 text-sm font-semibold text-primary-foreground bg-primary rounded-lg hover:opacity-90 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {submitting ? "Submitting…" : "Submit for Review"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default EnforcementTrackerPage;