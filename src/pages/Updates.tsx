import { useState, useEffect, useCallback, useRef } from "react";
import { Search, ExternalLink } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import AISummaryPanel from "@/components/AISummaryPanel";
import NewsfeedList from "@/components/NewsfeedList";

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

const PAGE_SIZE = 50;

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

const CATEGORY_TAG: Record<string, { label: string; textColor: string }> = {
    "eu-uk": { label: "🇪🇺 EU & UK", textColor: "text-blue" },
    "us-federal": { label: "🇺🇸 U.S. Federal", textColor: "text-navy" },
    "us-states": { label: "🗺️ U.S. States", textColor: "text-accent" },
    "enforcement": { label: "⚖️ Enforcement", textColor: "text-red-600" },
    "ai-privacy": { label: "🤖 AI & Privacy", textColor: "text-purple-600" },
    "global": { label: "🌐 Global", textColor: "text-slate" },
    "adtech": { label: "📡 AdTech", textColor: "text-orange-600" },
};

const FALLBACK_IMAGES: Record<string, string> = {
    "us-federal": "https://picsum.photos/seed/federal-law/400/200",
    "us-states": "https://picsum.photos/seed/state-capitol/400/200",
    "eu-uk": "https://picsum.photos/seed/european-union/400/200",
    "global": "https://picsum.photos/seed/global-privacy/400/200",
    "enforcement": "https://picsum.photos/seed/legal-court/400/200",
    "ai-privacy": "https://picsum.photos/seed/artificial-intelligence/400/200",
};

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

const Updates = () => {
    const [updates, setUpdates] = useState<Update[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(0);
    const [activeFilter, setActiveFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [dateRange, setDateRange] = useState("all");
    const [sourcePills, setSourcePills] = useState<string[]>([]);
    const [activeSource, setActiveSource] = useState<string | null>(null);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    // AI summary filter state
    const [urgencyFilter, setUrgencyFilter] = useState("all");
    const [legalWeightFilter, setLegalWeightFilter] = useState("all");
    const [crossJurisdictionOnly, setCrossJurisdictionOnly] = useState(false);

    const buildQuery = useCallback((offset: number) => {
        return supabase
            .from("updates")
            .select("*")
            .order("published_at", { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1);
    }, []);

    const loadPage = useCallback(async (offset: number, replace: boolean) => {
        if (offset === 0) setLoading(true);
        else setLoadingMore(true);

        const { data, error } = await buildQuery(offset);
        if (error) {
            console.error("Updates fetch error:", error);
        } else {
            const articles = (data as Update[]) || [];
            setUpdates((prev) => replace ? articles : [...prev, ...articles]);
            setHasMore(articles.length === PAGE_SIZE);
            setPage(offset);

            if (replace) {
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
            }
        }

        setLoading(false);
        setLoadingMore(false);
    }, [buildQuery]);

    useEffect(() => {
        loadPage(0, true);
    }, [loadPage]);

    useEffect(() => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
        }
        const channel = supabase
            .channel("updates-realtime")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "updates" },
                (payload) => {
                    setUpdates((prev) => [payload.new as Update, ...prev]);
                }
            )
            .subscribe();
        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleLoadMore = useCallback(() => {
        loadPage(page + PAGE_SIZE, false);
    }, [loadPage, page]);

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

        // AI summary filters
        if (urgencyFilter !== "all" && u.ai_summary?.urgency !== urgencyFilter) return false;
        if (legalWeightFilter !== "all" && u.ai_summary?.legal_weight !== legalWeightFilter) return false;
        if (crossJurisdictionOnly && !u.ai_summary?.cross_jurisdiction_signal) return false;

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
                        Daily intelligence from 119 monitored regulatory sources — filtered by jurisdiction, topic, date, and source.
                    </p>
                </div>
            </section>

            <div className="max-w-[1280px] mx-auto w-full px-4 md:px-8 py-8">
                {/* Filters bar */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setActiveFilter(f.key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                activeFilter === f.key
                                    ? "bg-navy text-white"
                                    : "bg-muted text-foreground hover:bg-muted/80"
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Search + date range */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search updates…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background"
                        />
                    </div>
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="px-3 py-2 border border-border rounded-lg text-sm bg-background"
                    >
                        {DATE_RANGES.map((d) => (
                            <option key={d.key} value={d.key}>{d.label}</option>
                        ))}
                    </select>
                </div>

                {/* Source pills */}
                {sourcePills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        <button
                            onClick={() => setActiveSource(null)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                                !activeSource ? "bg-navy text-white" : "bg-muted text-foreground"
                            }`}
                        >
                            All sources
                        </button>
                        {sourcePills.map((d) => (
                            <button
                                key={d}
                                onClick={() => setActiveSource(activeSource === d ? null : d)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                                    activeSource === d ? "bg-navy text-white" : "bg-muted text-foreground"
                                }`}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                )}

                {/* AI Summary Filters — only show if any articles have ai_summary */}
                {updates.some(u => u.ai_summary && !u.ai_summary.skipped) && (
                    <div className="flex flex-wrap items-center gap-3 mb-6 px-3 py-2.5 bg-navy/5 rounded-xl border border-navy/10">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">AI filters:</span>

                        {/* Urgency dropdown */}
                        <select
                            value={urgencyFilter}
                            onChange={e => setUrgencyFilter(e.target.value)}
                            className="text-[11px] bg-background text-foreground border border-border rounded-lg px-2.5 py-1 outline-none focus:border-sky cursor-pointer"
                        >
                            <option value="all">All urgency</option>
                            <option value="Immediate">🔴 Immediate</option>
                            <option value="This quarter">🟡 This quarter</option>
                            <option value="Monitor">🟢 Monitor</option>
                        </select>

                        {/* Legal weight dropdown */}
                        <select
                            value={legalWeightFilter}
                            onChange={e => setLegalWeightFilter(e.target.value)}
                            className="text-[11px] bg-background text-foreground border border-border rounded-lg px-2.5 py-1 outline-none focus:border-sky cursor-pointer"
                        >
                            <option value="all">All legal weight</option>
                            <option value="Binding">Binding</option>
                            <option value="Enforcement">Enforcement</option>
                            <option value="Guidance">Guidance</option>
                            <option value="Proposal">Proposal</option>
                            <option value="Commentary">Commentary</option>
                        </select>

                        {/* Cross-jurisdiction toggle */}
                        <button
                            onClick={() => setCrossJurisdictionOnly(!crossJurisdictionOnly)}
                            className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                crossJurisdictionOnly
                                    ? "bg-accent/20 text-accent border-accent/30 font-semibold"
                                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                            }`}
                        >
                            🌐 Cross-jurisdiction only
                        </button>
                    </div>
                )}

                <AdBanner />

                {/* Newsfeed */}
                <NewsfeedList
                    articles={filtered}
                    isLoading={loading || loadingMore}
                    hasMore={hasMore}
                    onLoadMore={handleLoadMore}
                    renderArticle={(article, i, isPremium) => {
                        const t = tag(article.category || "global");
                        return (
                            <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex gap-4 p-4 border-b border-border hover:bg-fog/30 transition-all no-underline cursor-pointer group"
                            >
                                {article.image_url && (
                                    <img
                                        src={article.image_url}
                                        alt=""
                                        className="w-[120px] h-[80px] object-cover rounded-md flex-shrink-0 hidden sm:block"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = FALLBACK_IMAGES[article.category || "global"] || "";
                                        }}
                                    />
                                )}
                                <div className="flex-1 min-w-0">
                                    {/* Unified metadata line */}
                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                                        <span>{article.source_domain || article.source_name}</span>
                                        <span>•</span>
                                        <span>{formatDate(article.published_at || "")}</span>
                                        <span>•</span>
                                        <span className={t.textColor}>{t.label}</span>
                                    </div>
                                    <h3 className="text-[14px] font-semibold text-foreground group-hover:text-blue transition-colors mb-1 line-clamp-2 leading-snug">
                                        {article.title}
                                        <ExternalLink className="inline w-3 h-3 ml-1 opacity-0 group-hover:opacity-50" />
                                    </h3>
                                    {article.summary && (
                                        <p className="text-xs text-muted-foreground line-clamp-2">{article.summary}</p>
                                    )}

                                    {/* AI Summary Panel (inline, compact) */}
                                    {article.ai_summary && !article.ai_summary.skipped && (
                                        <AISummaryPanel summary={article.ai_summary} compact isPremium={isPremium} />
                                    )}
                                </div>
                            </a>
                        );
                    }}
                />
            </div>

            <Footer />
        </div>
    );
};

export default Updates;
