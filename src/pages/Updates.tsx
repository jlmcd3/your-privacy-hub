import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import { type ArticleItem } from "@/components/ArticleCard";

import { TieredFeed } from "@/components/TieredFeed";
import { useAuth } from "@/hooks/useAuth";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { FILTER_LABELS, formatFilterLabel } from "@/lib/filterLabels";

interface Update {
    id: string;
    title: string;
    summary: string | null;
    url: string;
    direct_jurisdictions?: string[] | null;
    affected_jurisdictions?: string[] | null;
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
  { key: "all", label: "All Jurisdictions" },
  { key: "us-federal", label: "U.S. Federal" },
  { key: "us-states", label: "U.S. States" },
  { key: "eu-uk", label: "EU & UK" },
  { key: "global", label: "Rest of World" },
];

interface TopicFilter {
  key: string;
  label: string;
  match: 'category' | 'keyword';
  terms?: string[];
}

const TOPIC_FILTERS: TopicFilter[] = [
  { key: "all", label: "All Topics", match: 'category' },
  { key: "enforcement", label: "Enforcement", match: 'category' },
  { key: "ai-privacy", label: "AI & Privacy", match: 'category' },
  { key: "adtech", label: "AdTech & Advertising", match: 'category' },
  { key: "health-hipaa", label: "Health & HIPAA", match: 'keyword', terms: ['HIPAA', 'health', 'medical'] },
  { key: "children-privacy", label: "Children's Privacy", match: 'keyword', terms: ['children', 'COPPA', 'minor', 'age verification'] },
  { key: "data-breaches", label: "Data Breaches", match: 'keyword', terms: ['breach', 'data breach', 'incident'] },
  { key: "cross-border", label: "Cross-Border Transfers", match: 'keyword', terms: ['transfer', 'SCC', 'adequacy', 'DPF'] },
  { key: "biometric-data", label: "Biometric Data", match: 'keyword', terms: ['biometric', 'facial', 'BIPA', 'fingerprint'] },
  { key: "employee-privacy", label: "Employee Privacy", match: 'keyword', terms: ['employee', 'workplace', 'worker', 'HR'] },
  { key: "cookie-consent", label: "Cookie Consent", match: 'keyword', terms: ['cookie', 'consent', 'TCF', 'ePrivacy'] },
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

// Slug → label map lives in src/lib/filterLabels.ts (imported above).

function relativeFromNow(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function lastIngestionLabel(items: Update[]): string {
  const latest = items[0]?.published_at;
  if (!latest) return 'Privacy Intelligence Feed';
  const d = new Date(latest).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `Privacy Intelligence Feed through ${d}`;
}


const Updates = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [updates, setUpdates] = useState<Update[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(0);
    const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
    const [dateRange, setDateRange] = useState("all");
    const [sourcePills, setSourcePills] = useState<string[]>([]);
    const [activeSource, setActiveSource] = useState<string | null>(null);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const [activeSectors, setActiveSectors] = useState<string[]>([]);
    const { user } = useAuth();
    const { isPremium } = usePremiumStatus();

    const [showFilterGate, setShowFilterGate] = useState<string | null>(null);

    const activeRegion = searchParams.get("region") || "all";
    const activeTopic = searchParams.get("topic") || "all";

    // Independent setters: region and topic are additive in the URL.
    const selectRegion = useCallback((key: string) => {
        const next = new URLSearchParams(searchParams);
        if (!key || key === "all") next.delete("region");
        else next.set("region", key);
        setSearchParams(next);
    }, [searchParams, setSearchParams]);

    const selectTopic = useCallback((key: string) => {
        const next = new URLSearchParams(searchParams);
        if (!key || key === "all") next.delete("topic");
        else next.set("topic", key);
        setSearchParams(next);
    }, [searchParams, setSearchParams]);

    const handleGatedFilterClick = (filterLabel: string, action: () => void) => {
      if (!user) {
        setShowFilterGate(filterLabel);
        setTimeout(() => setShowFilterGate(null), 4000);
      } else {
        action();
      }
    };

    // AI summary filter state
    const [urgencyFilter, setUrgencyFilter] = useState("all");
    const [legalWeightFilter, setLegalWeightFilter] = useState("all");
    const [crossJurisdictionOnly, setCrossJurisdictionOnly] = useState(false);

    const topicFilter = searchParams.get("topic");
    const regionFilter = searchParams.get("region");


    // Debounce search term so each keystroke doesn't hit the DB
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
        return () => clearTimeout(t);
    }, [searchTerm]);

    const buildQuery = useCallback((offset: number, q: string) => {
        let query = supabase
            .from("updates")
            .select("*")
            .eq("is_hidden", false);

        if (q && q.length >= 2) {
            // Escape commas/parens that would break PostgREST `or` syntax
            const safe = q.replace(/[,()]/g, " ");
            const like = `%${safe}%`;
            query = query.or(
                [
                    `title.ilike.${like}`,
                    `summary.ilike.${like}`,
                    `regulator.ilike.${like}`,
                    `regulatory_theory.ilike.${like}`,
                    `related_development.ilike.${like}`,
                ].join(",")
            );
        }

        return query
            .order("published_at", { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1);
    }, []);

    const loadPage = useCallback(async (offset: number, replace: boolean) => {
        if (offset === 0) setLoading(true);
        else setLoadingMore(true);

        const { data, error } = await buildQuery(offset, debouncedSearch);
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

    // Sync search term to URL (preserve topic/region params)
    useEffect(() => {
        const next: Record<string, string> = {};
        if (searchTerm) next.q = searchTerm;
        if (topicFilter) next.topic = topicFilter;
        if (regionFilter) next.region = regionFilter;
        setSearchParams(next, { replace: true });
    }, [searchTerm, topicFilter, regionFilter, setSearchParams]);

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
        // Region filter
        if (activeRegion !== "all" && u.category !== activeRegion) return false;

        // Topic filter (independent / additive with region)
        if (activeTopic !== "all") {
            const t = TOPIC_FILTERS.find(f => f.key === activeTopic);
            if (t) {
                if (t.match === 'category' && u.category !== t.key) return false;
                if (t.match === 'keyword' && t.terms) {
                    const terms = t.terms.map(x => x.toLowerCase());
                    const text = (u.title + ' ' + (u.summary || '')).toLowerCase();
                    if (!terms.some(term => text.includes(term))) return false;
                }
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
        // (Attention filter removed)
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

    const hasActiveFilters = activeSectors.length > 0 || urgencyFilter !== "all" || legalWeightFilter !== "all" || crossJurisdictionOnly;

    const clearAllFilters = () => {
        setActiveSectors([]);
        setUrgencyFilter("all");
        setLegalWeightFilter("all");
        setCrossJurisdictionOnly(false);
        setActiveSource(null);
        setSearchTerm("");
        setDateRange("all");
        const next = new URLSearchParams(searchParams);
        next.delete("region");
        next.delete("topic");
        setSearchParams(next);
    };

    const hasJurisdictionOrTopic = activeRegion !== "all" || activeTopic !== "all";

    const articlesForFeed = filtered.map((a) => ({
        ...a,
        source_url: (a as any).source_url || a.url,
        jurisdiction: a.direct_jurisdictions?.[0] ?? a.affected_jurisdictions?.[0] ?? null,
    } as unknown as ArticleItem));

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Helmet>
                <title>Privacy Intelligence Feed | End User Privacy</title>
                <meta name="description" content="Daily intelligence from 119 monitored regulatory sources — filtered by jurisdiction, topic, date, and source." />
            </Helmet>
            <Navbar />

            <div className="px-4 sm:px-6 py-5 border-b border-fog bg-card">
                <div className="max-w-[1280px] mx-auto">
                    {(topicFilter || regionFilter) && (
                        <div className="mb-1">
                            <Link to="/updates" className="text-[11px] text-slate hover:text-navy transition-colors no-underline">
                                ← Back to all updates
                            </Link>
                        </div>
                    )}
                    <h1 className="font-display text-[24px] font-bold text-navy leading-tight m-0">
                        {regionFilter
                            ? formatFilterLabel(regionFilter)
                            : topicFilter
                                ? formatFilterLabel(topicFilter)
                                : "Privacy Intelligence Feed"}
                    </h1>
                    <p className="text-sm text-slate mt-0.5">
                        {updates[0]?.published_at
                            ? `Through ${formatDate(updates[0].published_at)} · Updated daily`
                            : "Updated daily"}
                    </p>
                </div>
            </div>

            {/* Jurisdiction subnav (pill style) */}
            <div className="border-b border-border bg-card">
                <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-3">
                    <div className="flex items-center gap-3 overflow-x-auto pl-6">
                        <span className="text-eyebrow text-muted-foreground whitespace-nowrap">Jurisdiction</span>
                        {LOCATION_FILTERS.map((f) => {
                            const isActive = activeRegion === f.key;
                            return (
                                <button
                                    key={f.key}
                                    onClick={() => selectRegion(f.key)}
                                    className={`text-sm font-medium cursor-pointer transition-colors whitespace-nowrap bg-transparent border-0 px-1 ${
                                        isActive
                                            ? "text-foreground border-b-2 border-[hsl(var(--cobalt))] pb-0.5"
                                            : "text-slate hover:text-foreground"
                                    }`}
                                >
                                    {f.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="max-w-[1280px] mx-auto w-full px-4 md:px-8 py-8 grid grid-cols-1 md:grid-cols-[160px_1fr] xl:grid-cols-[180px_1fr] gap-6 items-start">
                {/* Left: Topics sidebar */}
                <aside className="hidden md:block">
                    <div className="sticky top-20 bg-card rounded-lg p-3">
                        <h3 className="text-eyebrow text-muted-foreground mb-3 px-3">Topics</h3>
                        <nav className="flex flex-col">
                            {TOPIC_FILTERS.map((t) => {
                                const isActive = activeTopic === t.key;
                                return (
                                    <button
                                        key={t.key}
                                        onClick={() => selectTopic(t.key)}
                                        className={`text-left text-sm px-3 py-2 transition-colors border-l-2 ${
                                            isActive
                                                ? "border-[hsl(var(--cobalt))] text-foreground font-medium bg-muted/40"
                                                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20"
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </aside>

                {/* Main feed column */}
                <div>
                {/* Mobile: topics as scrollable pills */}
                <div className="md:hidden -mx-4 mb-4 overflow-x-auto">
                    <div className="flex items-center gap-2 px-4">
                        {TOPIC_FILTERS.map((t) => {
                            const isActive = activeTopic === t.key;
                            return (
                                <button
                                    key={t.key}
                                    onClick={() => selectTopic(t.key)}
                                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                        isActive
                                            ? "bg-[hsl(var(--cobalt))] text-white"
                                            : "bg-muted text-foreground hover:bg-muted/80"
                                    }`}
                                >
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {hasJurisdictionOrTopic && (
                    <div className="mb-3 flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">{filtered.length} updates</span>
                        <button
                            onClick={clearAllFilters}
                            className="text-[hsl(var(--cobalt))] hover:underline font-medium"
                        >
                            Clear filters
                        </button>
                    </div>
                )}

                <Link
                  to="/get-intelligence"
                  aria-label="Get your privacy intelligence — customized and analyzed for your priorities and responsibilities"
                  className="group block bg-sky/10 hover:bg-sky/20 border border-sky/30 hover:border-sky/50 rounded-xl px-5 py-3 mb-4 transition-all no-underline text-center"
                >
                  <p className="text-sm font-semibold m-0 text-blue group-hover:text-navy transition-colors">
                    Get your privacy intelligence — customized and analyzed for your priorities and responsibilities →
                  </p>
                </Link>

                {/* Filter gate chip — anon users clicking a gated control (sector / date) */}
                {showFilterGate && !user && (
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sky-50 border border-sky-200/60 mb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                        <p className="text-sm text-navy flex-1">
                            Register free to filter by your industry and date range
                        </p>
                        <Link
                            to="/signup"
                            className="text-[11px] px-3 py-1 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-500 transition-colors whitespace-nowrap no-underline"
                        >
                            Register free →
                        </Link>
                        <button
                            onClick={() => setShowFilterGate(null)}
                            className="text-slate-400 hover:text-slate-600 text-[16px] leading-none"
                            aria-label="Dismiss"
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* Faceted Filters: Sectors + Attention Level */}
                {availableSectors.length > 0 && (
                    <div className="flex flex-col gap-2 mb-4 px-3 py-2.5 bg-muted/30 rounded-xl border border-border">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-eyebrow text-muted-foreground mr-1">Sectors:</span>
                            {availableSectors.slice(0, 8).map(([sector, count]) => (
                                <button
                                    key={sector}
                                    onClick={() => handleGatedFilterClick(`Sector: ${sector}`, () => toggleSector(sector))}
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                                        activeSectors.includes(sector)
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-foreground hover:bg-muted/80"
                                    } ${!user ? "opacity-50 cursor-default" : ""}`}
                                >
                                    {sector} <span className="opacity-60">({count})</span>
                                </button>
                            ))}
                            {activeSectors.length > 0 && (
                                <button
                                    onClick={() => setActiveSectors([])}
                                    className="text-[11px] text-muted-foreground hover:text-foreground ml-1"
                                >
                                    Clear sectors
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Search + date range */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search Privacy Intelligence Feed…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background"
                        />
                    </div>
                    <select
                        value={dateRange}
                        onChange={(e) => {
                            const next = e.target.value;
                            handleGatedFilterClick("Date range", () => setDateRange(next));
                        }}
                        disabled={!user}
                        className={`px-3 py-2 border border-border rounded-lg text-sm bg-background ${!user ? "opacity-50 cursor-default" : ""}`}
                    >
                        {DATE_RANGES.map((d) => (
                            <option key={d.key} value={d.key}>{d.label}</option>
                        ))}
                    </select>
                </div>

                {/* Active filter summary + clear */}
                {hasActiveFilters && (
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs text-muted-foreground">{filtered.length} results</span>
                        <button
                            onClick={clearAllFilters}
                            className="inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
                        >
                            <X className="w-3 h-3" /> Clear all filters
                        </button>
                    </div>
                )}

                <AdBanner variant="leaderboard" className="my-4" />

                {/* Free registered: subtle Pro upgrade strip */}
                {user && !isPremium && (
                    <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg mb-4">
                        Showing analysis on every update.{" "}
                        <Link to="/subscribe" className="underline font-semibold hover:text-amber-900">
                            Upgrade to Platform to unlock Action Briefs →
                        </Link>
                    </div>
                )}

                {/* Newsfeed — full cards with inline tier-appropriate enrichment */}
                <div>
                    <TieredFeed
                        articles={articlesForFeed}
                        paginated={true}
                        hasMore={hasMore}
                        onLoadMore={handleLoadMore}
                        isLoadingMore={loadingMore}
                        interleaveAds={true}
                    />
                </div>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default Updates;
