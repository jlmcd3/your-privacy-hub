import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import AISummaryPanel from "@/components/AISummaryPanel";
import NewsfeedList from "@/components/NewsfeedList";
import { ExternalLink } from "lucide-react";

interface Update {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  source_name: string | null;
  source_domain: string | null;
  image_url: string | null;
  category: string;
  regulator: string | null;
  published_at: string;
  is_premium: boolean;
  ai_summary?: any;
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "us-federal", label: "🇺🇸 U.S. Federal" },
  { key: "us-states", label: "🗺️ U.S. States" },
  { key: "eu-uk", label: "🇪🇺 EU & UK" },
  { key: "global", label: "🌐 Global" },
  { key: "enforcement", label: "⚖️ Enforcement" },
  { key: "ai-privacy", label: "🤖 AI & Privacy" },
];

const DATE_RANGES = [
  { key: "7", label: "Last 7 days" },
  { key: "30", label: "Last 30 days" },
  { key: "90", label: "Last 90 days" },
  { key: "all", label: "All" },
];

const CATEGORY_TAG: Record<string, { label: string; classes: string }> = {
  "eu-uk":       { label: "🇪🇺 EU & UK",      classes: "bg-blue/10 text-blue" },
  "us-federal":  { label: "🇺🇸 U.S. Federal", classes: "bg-navy/10 text-navy" },
  "us-states":   { label: "🗺️ U.S. States",   classes: "bg-accent/10 text-accent" },
  "enforcement": { label: "⚖️ Enforcement",   classes: "bg-red-50 text-red-600" },
  "ai-privacy":  { label: "🤖 AI & Privacy",  classes: "bg-purple-50 text-purple-600" },
  "global":      { label: "🌐 Global",         classes: "bg-fog text-slate" },
  "adtech":      { label: "📡 AdTech",         classes: "bg-orange-50 text-orange-600" },
};

const FALLBACK_IMAGES: Record<string, string> = {
  "us-federal":  "https://picsum.photos/seed/federal-law/400/200",
  "us-states":   "https://picsum.photos/seed/state-capitol/400/200",
  "eu-uk":       "https://picsum.photos/seed/european-union/400/200",
  "global":      "https://picsum.photos/seed/global-privacy/400/200",
  "enforcement": "https://picsum.photos/seed/legal-court/400/200",
  "ai-privacy":  "https://picsum.photos/seed/artificial-intelligence/400/200",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const Updates = () => {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [sourcePills, setSourcePills] = useState<string[]>([]);
  const [activeSource, setActiveSource] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("updates")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(200);
      const articles = (data as Update[]) || [];
      setUpdates(articles);

      // Extract top source domains
      const domainCounts: Record<string, number> = {};
      articles.forEach((a) => {
        const d = a.source_domain;
        if (d) domainCounts[d] = (domainCounts[d] || 0) + 1;
      });
      const topDomains = Object.entries(domainCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([d]) => d);
      setSourcePills(topDomains);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = updates.filter((u) => {
    if (activeFilter !== "all" && u.category !== activeFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!u.title.toLowerCase().includes(q) && !(u.summary || "").toLowerCase().includes(q)) return false;
    }
    if (dateRange !== "all") {
      const days = parseInt(dateRange);
      const cutoff = Date.now() - days * 86400000;
      if (new Date(u.published_at).getTime() < cutoff) return false;
    }
    if (activeSource && u.source_domain !== activeSource) return false;
    return true;
  });

  const tag = (cat: string) => CATEGORY_TAG[cat] || CATEGORY_TAG["global"];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Privacy Regulatory Updates | EndUserPrivacy</title>
        <meta name="description" content="Daily intelligence from 119 monitored regulatory sources — filtered by jurisdiction, topic, date, and source." />
      </Helmet>
      <Topbar />
      <Navbar />

      <section className="bg-gradient-to-br from-navy via-navy to-navy/90 py-14 px-4 md:px-8">
        <div className="max-w-[1280px] mx-auto text-center">
          <h1 className="font-display text-[28px] md:text-[36px] tracking-tight text-white mb-3">
            Privacy Regulatory Updates
          </h1>
          <p className="text-[15px] text-white/70 max-w-2xl mx-auto">
            Daily intelligence from 119 monitored regulatory sources — filtered by jurisdiction and topic.
          </p>
        </div>
      </section>

      <AdBanner variant="leaderboard" adSlot="eup-updates-top" className="py-3 bg-paper" />

      <section className="pt-5 pb-10 md:pt-8 md:pb-16 px-4 md:px-8 bg-paper">
        <div className="max-w-[1280px] mx-auto">
          <div className="bg-card border border-fog rounded-2xl overflow-hidden shadow-eup-sm">
            {/* Header with filters */}
            <div className="px-4 md:px-6 py-4 md:py-5 bg-navy">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4 justify-between w-full">
                  <div>
                    <h2 className="font-display text-[16px] text-white tracking-tight">Latest Privacy Updates</h2>
                    <p className="text-[12px] text-slate-light">Updated daily · AI-summarized</p>
                  </div>
                </div>

                {/* Search bar */}
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
                  <input
                    className="w-full py-2 pl-10 pr-4 text-[13px] border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/40 outline-none focus:border-sky transition-colors"
                    placeholder="Search articles…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Category filters */}
                <div className="flex gap-2 flex-wrap items-center">
                  {FILTERS.map((f) => (
                    <span
                      key={f.key}
                      onClick={() => setActiveFilter(f.key)}
                      className={`px-3 py-1.5 text-[12px] font-medium rounded-full border transition-all cursor-pointer ${
                        activeFilter === f.key
                          ? "bg-white/15 text-white border-white/20 font-semibold"
                          : "bg-white/[0.05] text-slate-light border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {f.label}
                    </span>
                  ))}
                </div>

                {/* Date range + source filters */}
                <div className="flex gap-2 flex-wrap items-center">
                  {DATE_RANGES.map((d) => (
                    <span
                      key={d.key}
                      onClick={() => setDateRange(d.key)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all cursor-pointer ${
                        dateRange === d.key
                          ? "bg-sky/20 text-sky border-sky/30 font-semibold"
                          : "bg-white/[0.05] text-white/50 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {d.label}
                    </span>
                  ))}
                  <span className="text-white/20 text-[10px]">|</span>
                  {sourcePills.map((s) => (
                    <span
                      key={s}
                      onClick={() => setActiveSource(activeSource === s ? null : s)}
                      className={`px-2.5 py-1 text-[10px] font-medium rounded-full border transition-all cursor-pointer ${
                        activeSource === s
                          ? "bg-accent/20 text-accent-light border-accent/30 font-semibold"
                          : "bg-white/[0.05] text-white/40 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Cards */}
            <div className="px-4 md:px-6 py-4">
              <div className="text-[11px] text-slate mb-3">{filtered.length} articles</div>
              {loading ? (
                <div className="gap-3 flex flex-col">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex gap-4 p-4 bg-card border border-fog rounded-2xl animate-pulse">
                      <div className="w-[100px] h-[68px] rounded-lg bg-muted flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-1/3 bg-muted rounded" />
                        <div className="h-4 w-full bg-muted rounded" />
                        <div className="h-3 w-2/3 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-sm text-slate py-8">No updates found for these filters.</p>
              ) : (
                <NewsfeedList
                  articles={filtered}
                  renderArticle={(u) => (
                    <a
                      key={u.id}
                      href={u.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex gap-4 p-4 bg-card border border-fog rounded-2xl hover:border-silver hover:shadow-eup-sm hover:-translate-y-px transition-all no-underline cursor-pointer"
                    >
                      <div className="w-[100px] h-[68px] flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                        <img
                          src={u.image_url || FALLBACK_IMAGES[u.category] || FALLBACK_IMAGES["global"]}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = FALLBACK_IMAGES[u.category] || FALLBACK_IMAGES["global"];
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-[11px] font-semibold text-slate uppercase tracking-wide">
                            {u.source_domain || u.source_name}
                          </span>
                          <span className="text-silver text-[10px]">·</span>
                          <span className="text-[11px] text-slate/70">{formatDate(u.published_at)}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${tag(u.category).classes}`}>
                            {tag(u.category).label}
                          </span>
                        </div>
                        <h3 className="font-display text-[14px] leading-snug text-navy group-hover:text-blue transition-colors mb-1.5 line-clamp-2">
                          {u.title}
                        </h3>
                        {u.summary && (
                          <p className="text-[12px] text-slate leading-relaxed line-clamp-2">{u.summary}</p>
                        )}
                        <AISummaryPanel summary={u.ai_summary || null} />
                      </div>
                      <div className="flex-shrink-0 pt-1">
                        <ExternalLink size={13} className="text-slate/40 group-hover:text-blue transition-colors" />
                      </div>
                    </a>
                  )}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <AdBanner variant="leaderboard" adSlot="eup-updates-bottom" className="py-3 bg-paper" />
      <Footer />
    </div>
  );
};

export default Updates;
