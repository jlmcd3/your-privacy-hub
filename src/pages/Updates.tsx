import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import NewsfeedList from "@/components/NewsfeedList";
import { ArticleCard, type ArticleItem } from "@/components/ArticleCard";

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
    attention_level?: string | null;
    affected_sectors?: string[] | null;
    regulatory_theory?: string | null;
    related_development?: string | null;
    enrichment_version?: number | null;
}

const PAGE_SIZE = 50;

const LOCATION_FILTERS = [
  { key: "all", label: "All" },
  { key: "us-federal", label: "🇺🇸 U.S. Federal" },
  { key: "us-states", label: "🗺️ U.S. States" },
  { key: "eu-uk", label: "🇪🇺 EU & UK" },
  { key: "global", label: "🌐 Global" },
];

interface TopicFilter {
  key: string;
  label: string;
  match: 'category' | 'keyword';
  terms?: string[];
}

const TOPIC_FILTERS: TopicFilter[] = [
  { key: "enforcement", label: "⚖️ Enforcement", match: 'category' },
  { key: "ai-privacy", label: "🤖 AI & Privacy", match: 'category' },
  { key: "adtech", label: "📡 AdTech & Advertising", match: 'category' },
  { key: "health-hipaa", label: "🏥 Health & HIPAA", match: 'keyword', terms: ['HIPAA', 'health', 'medical'] },
  { key: "children-privacy", label: "👶 Children's Privacy", match: 'keyword', terms: ['children', 'COPPA', 'minor', 'age verification'] },
  { key: "data-breaches", label: "🔒 Data Breaches", match: 'keyword', terms: ['breach', 'data breach', 'incident'] },
  { key: "cross-border", label: "🌐 Cross-Border Transfers", match: 'keyword', terms: ['transfer', 'SCC', 'adequacy', 'DPF'] },
  { key: "biometric-data", label: "🧬 Biometric Data", match: 'keyword', terms: ['biometric', 'facial', 'BIPA', 'fingerprint'] },
  { key: "employee-privacy", label: "💼 Employee Privacy", match: 'keyword', terms: ['employee', 'workplace', 'worker', 'HR'] },
  { key: "cookie-consent", label: "🍪 Cookie Consent", match: 'keyword', terms: ['cookie', 'consent', 'TCF', 'ePrivacy'] },
];

const ENRICHMENT_FILTERS = [
  { key: "enriched", label: "✨ Enriched" },
  { key: "pending", label: "⏳ Pending" },
];

const DATE_RANGES = [
  { key: "7", label: "Last 7 days" },
  { key: "30", label: "Last 30 days" },
  { key: "90", label: "Last 90 days" },
  { key: "all", label: "All" },
];


function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

const Updates = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [updates, setUpdates] = useState<Update[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(0);
    const [activeFilter, setActiveFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
    const [dateRange, setDateRange] = useState("all");
    const [sourcePills, setSourcePills] = useState<string[]>([]);
    const [activeSource, setActiveSource] = useState<string | null>(null);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const [activeSectors, setActiveSectors] = useState<string[]>([]);
    const [activeAttention, setActiveAttention] = useState<string | null>(null);

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

    // Sync search term to URL
    useEffect(() => {
        if (searchTerm) {
            setSearchParams({ q: searchTerm }, { replace: true });
        } else {
            setSearchParams({}, { replace: true });
        }
    }, [searchTerm, setSearchParams]);

    // Compute available sectors for faceted filtering
    const availableSectors = useMemo(() => {
        const counts: Record<string, number> = {};
        updates.forEach((u) => {
            (u.affected_sectors || []).forEach((s) => {
                counts[s] = (counts[s] || 0) + 1;
            });
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12);
    }, [updates]);

    const filtered = updates.filter((u) => {
        if (activeFilter === "enriched" && !(u.enrichment_version && u.enrichment_version > 0)) return false;
        if (activeFilter === "pending" && (u.enrichment_version && u.enrichment_version > 0)) return false;

        // Location filter
        const locationFilter = LOCATION_FILTERS.find(f => f.key === activeFilter);
        if (locationFilter && activeFilter !== "all" && u.category !== activeFilter) return false;

        // Topic filter
        const topicFilter = TOPIC_FILTERS.find(f => f.key === activeFilter);
        if (topicFilter) {
            if (topicFilter.match === 'category' && u.category !== topicFilter.key) return false;
            if (topicFilter.match === 'keyword' && topicFilter.terms) {
                const terms = topicFilter.terms.map(t => t.toLowerCase());
                const text = (u.title + ' ' + (u.summary || '')).toLowerCase();
                if (!terms.some(term => text.includes(term))) return false;
            }
        }

        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            const fields = [
                u.title,
                u.summary || "",
                u.regulatory_theory || "",
                u.related_development || "",
                u.attention_level || "",
                ...(u.affected_sectors || []),
                u.regulator || "",
                u.ai_summary?.why_it_matters || "",
            ];
            if (!fields.some(f => f.toLowerCase().includes(q))) return false;
        }
        if (dateRange !== "all") {
            const days = parseInt(dateRange);
            const cutoff = Date.now() - days * 86400000;
            if (new Date(u.published_at).getTime() < cutoff) return false;
        }
        if (activeSource && u.source_domain !== activeSource) return false;
        if (activeSectors.length > 0) {
            const sectors = u.affected_sectors || [];
            if (!activeSectors.some(s => sectors.includes(s))) return false;
        }
        if (activeAttention && u.attention_level !== activeAttention) return false;
        if (urgencyFilter !== "all" && u.ai_summary?.urgency !== urgencyFilter) return false;
        if (legalWeightFilter !== "all" && u.ai_summary?.legal_weight !== legalWeightFilter) return false;
        if (crossJurisdictionOnly && !u.ai_summary?.cross_jurisdiction_signal) return false;
        return true;
    });

    const toggleSector = (sector: string) => {
        setActiveSectors(prev =>
            prev.includes(sector) ? prev.filter(s => s !== sector) : [...prev, sector]
        );
    };

    const hasActiveFilters = activeSectors.length > 0 || activeAttention || urgencyFilter !== "all" || legalWeightFilter !== "all" || crossJurisdictionOnly;

    const clearAllFilters = () => {
        setActiveSectors([]);
        setActiveAttention(null);
        setUrgencyFilter("all");
        setLegalWeightFilter("all");
        setCrossJurisdictionOnly(false);
        setActiveSource(null);
        setActiveFilter("all");
        setSearchTerm("");
        setDateRange("all");
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Helmet>
                <title>Privacy Regulatory Updates | EndUserPrivacy</title>
                <meta name="description" content="Daily intelligence from 119 monitored regulatory sources — filtered by jurisdiction, topic, date, and source." />
            </Helmet>
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
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 mb-4
                  flex items-center justify-between flex-wrap gap-3">
                  <p className="text-[13px] text-navy font-medium">
                    Turn this week's updates into a report for your jurisdiction
                  </p>
                  <Link to="/get-intelligence"
                    className="text-[13px] font-bold text-blue hover:text-navy no-underline">
                    Get Your Privacy Intelligence →
                  </Link>
                </div>
                {/* Enrichment stats strip */}
                {(() => {
                    const enrichedCount = updates.filter(u => u.enrichment_version && u.enrichment_version > 0).length;
                    const pendingCount = updates.length - enrichedCount;
                    const pct = updates.length > 0 ? Math.round((enrichedCount / updates.length) * 100) : 0;
                    return (
                        <div className="flex items-center gap-4 mb-4 px-4 py-2.5 bg-muted/50 rounded-xl border border-border">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-semibold text-muted-foreground">Enrichment:</span>
                                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[11px] font-bold text-primary">{pct}%</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                                ✨ {enrichedCount} enriched · ⏳ {pendingCount} pending
                            </span>
                        </div>
                    );
                })()}

                {/* Filters bar */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    {FILTERS.map((f) => {
                        let count: number | null = null;
                        if (f.key === "enriched") count = updates.filter(u => u.enrichment_version && u.enrichment_version > 0).length;
                        if (f.key === "pending") count = updates.filter(u => !u.enrichment_version || u.enrichment_version === 0).length;
                        return (
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
                            {count !== null && (
                                <span className="ml-1 text-[10px] opacity-70">({count})</span>
                            )}
                        </button>
                        );
                    })}
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

                {/* Faceted Filters: Sectors + Attention Level */}
                {(availableSectors.length > 0 || updates.some(u => u.attention_level)) && (
                    <div className="flex flex-wrap items-center gap-2 mb-4 px-3 py-2.5 bg-muted/30 rounded-xl border border-border">
                        {/* Attention level */}
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mr-1">Attention:</span>
                        {["High", "Medium", "Low"].map((level) => (
                            <button
                                key={level}
                                onClick={() => setActiveAttention(activeAttention === level ? null : level)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                                    activeAttention === level
                                        ? level === "High" ? "bg-destructive text-destructive-foreground" : level === "Medium" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
                                        : "bg-muted text-foreground hover:bg-muted/80"
                                }`}
                            >
                                {level === "High" ? "🔴" : level === "Medium" ? "🟡" : "🟢"} {level}
                            </button>
                        ))}

                        {availableSectors.length > 0 && (
                            <>
                                <span className="text-border mx-1">|</span>
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mr-1">Sectors:</span>
                                {availableSectors.slice(0, 8).map(([sector, count]) => (
                                    <button
                                        key={sector}
                                        onClick={() => toggleSector(sector)}
                                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                                            activeSectors.includes(sector)
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-foreground hover:bg-muted/80"
                                        }`}
                                    >
                                        {sector} <span className="opacity-60">({count})</span>
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                )}

                {/* AI Summary Filters — only show if any articles have ai_summary */}
                {updates.some(u => u.ai_summary && !u.ai_summary.skipped) && (
                    <div className="flex flex-wrap items-center gap-3 mb-6 px-3 py-2.5 bg-navy/5 rounded-xl border border-navy/10">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">AI filters:</span>

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

                {/* Active filter summary + clear */}
                {hasActiveFilters && (
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-[12px] text-muted-foreground">{filtered.length} results</span>
                        <button
                            onClick={clearAllFilters}
                            className="inline-flex items-center gap-1 text-[12px] font-medium text-destructive hover:underline"
                        >
                            <X className="w-3 h-3" /> Clear all filters
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
                    renderArticle={(article) => (
                        <ArticleCard
                            key={article.id}
                            item={{...article, source_url: article.url} as unknown as ArticleItem}
                            variant='full'
                        />
                    )}
                />
            </div>

            <Footer />
        </div>
    );
};

export default Updates;
