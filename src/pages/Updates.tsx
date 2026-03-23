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

const CATEGORY_TAG: Record<string, { label: string; classes: string }> = {
    "eu-uk": { label: "🇪🇺 EU & UK", classes: "bg-blue/10 text-blue" },
    "us-federal": { label: "🇺🇸 U.S. Federal", classes: "bg-navy/10 text-navy" },
    "us-states": { label: "🗺️ U.S. States", classes: "bg-accent/10 text-accent" },
    "enforcement": { label: "⚖️ Enforcement", classes: "bg-red-50 text-red-600" },
    "ai-privacy": { label: "🤖 AI & Privacy", classes: "bg-purple-50 text-purple-600" },
    "global": { label: "🌐 Global", classes: "bg-fog text-slate" },
    "adtech": { label: "📡 AdTech", classes: "bg-orange-50 text-orange-600" },
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

    const buildQuery = useCallback((offset: number) => {
        let q = supabase
            .from("updates")
            .select("*")
            .order("published_at", { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1);
        return q;
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
                    <div className="flex flex-wrap gap-2 mb-6">
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

                <AdBanner />

                {/* Newsfeed */}
                <NewsfeedList
                    articles={filtered}
                    isLoading={loading || loadingMore}
                    hasMore={hasMore}
                    onLoadMore={handleLoadMore}
                    renderArticle={(article, i) => {
                        const t = tag(article.category || "global");
                        return (
                            <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex gap-4 p-4 border-b border-border hover:bg-muted/40 transition-colors group"
                            >
                                {article.image_url && (
                                    <img
                                        src={article.image_url}
                                        alt=""
                                        className="w-24 h-16 object-cover rounded-md flex-shrink-0 hidden sm:block"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = FALLBACK_IMAGES[article.category || "global"] || "";
                                        }}
                                    />
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.classes}`}>
                                            {t.label}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                            {formatDate(article.published_at || "")}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-semibold text-foreground group-hover:text-blue leading-snug line-clamp-2">
                                        {article.title}
                                        <ExternalLink className="inline w-3 h-3 ml-1 opacity-0 group-hover:opacity-50" />
                                    </h3>
                                    {article.summary && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{article.summary}</p>
                                    )}
                                    {article.source_name && (
                                        <span className="text-[10px] text-muted-foreground mt-1 inline-block">
                                            {article.source_name}
                                        </span>
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
