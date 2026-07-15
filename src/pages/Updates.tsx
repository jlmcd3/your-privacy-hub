import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import AdSlot from "@/components/ads/AdSlot";
import { type ArticleItem } from "@/components/ArticleCard";

import { TieredFeed } from "@/components/TieredFeed";
import { useAuth } from "@/hooks/useAuth";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { FILTER_LABELS, formatFilterLabel } from "@/lib/filterLabels";
import { containsProfanity } from "@/lib/profanityFilter";
import { toast } from "sonner";

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

    const parseMulti = (v: string | null): string[] =>
        v ? v.split(",").map(s => s.trim()).filter(Boolean) : [];

    const selectedRegions = parseMulti(searchParams.get("region"));
    const selectedTopics = parseMulti(searchParams.get("topic"));

    // Toggle membership; "all" clears the dimension.
    const toggleRegion = useCallback((key: string) => {
        const next = new URLSearchParams(searchParams);
        if (!key || key === "all") {
            next.delete("region");
            setSearchParams(next);
            return;
        }
        const cur = new Set(parseMulti(next.get("region")));
        cur.has(key) ? cur.delete(key) : cur.add(key);
        if (cur.size === 0) next.delete("region");
        else next.set("region", [...cur].join(","));
        setSearchParams(next);
    }, [searchParams, setSearchParams]);

    const toggleTopic = useCallback((key: string) => {
        const next = new URLSearchParams(searchParams);
        if (!key || key === "all") {
            next.delete("topic");
            setSearchParams(next);
            return;
        }
        const cur = new Set(parseMulti(next.get("topic")));
        cur.has(key) ? cur.delete(key) : cur.add(key);
        if (cur.size === 0) next.delete("topic");
        else next.set("topic", [...cur].join(","));
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
    }, [buildQuery, debouncedSearch]);

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

    // Filter predicates — each returns true to KEEP the row. Keyed so we can
    // selectively disable a dimension during progressive relaxation.
    type FilterKey = 'region' | 'topic' | 'search' | 'date' | 'source' | 'sector' | 'ai';
    const predicates: Record<FilterKey, (u: Update) => boolean> = {
        region: (u) => {
            if (selectedRegions.length === 0) return true;
            const regionMatches = new Set<string>([
                u.category,
                ...(u.direct_jurisdictions ?? []),
                ...(u.affected_jurisdictions ?? []),
            ].filter(Boolean) as string[]);
            return selectedRegions.some((r) => regionMatches.has(r));
        },
        topic: (u) => {
            if (selectedTopics.length === 0) return true;
            return selectedTopics.some((key) => {
                const t = TOPIC_FILTERS.find((f) => f.key === key);
                if (!t) return false;
                if (t.match === 'category') return u.category === t.key;
                if (t.match === 'keyword' && t.terms) {
                    const text = (u.title + ' ' + (u.summary || '')).toLowerCase();
                    return t.terms.some((term) => text.includes(term.toLowerCase()));
                }
                return false;
            });
        },
        search: (u) => {
            if (!searchTerm) return true;
            const q = searchTerm.toLowerCase();
            const fields = [
                u.title,
                u.summary || "",
                u.regulatory_theory || "",
                u.related_development || "",
                ...(u.affected_sectors || []),
                u.regulator || "",
                u.ai_summary?.why_it_matters || "",
            ];
            return fields.some((f) => f.toLowerCase().includes(q));
        },
        date: (u) => {
            if (dateRange === "all") return true;
            const days = parseInt(dateRange);
            const cutoff = Date.now() - days * 86400000;
            return new Date(u.published_at).getTime() >= cutoff;
        },
        source: (u) => !activeSource || u.source_domain === activeSource,
        sector: (u) => {
            if (activeSectors.length === 0) return true;
            const sectors = u.affected_sectors || [];
            return activeSectors.some((s) => sectors.includes(s));
        },
        ai: (u) => {
            if (urgencyFilter !== "all" && u.ai_summary?.urgency !== urgencyFilter) return false;
            if (legalWeightFilter !== "all" && u.ai_summary?.legal_weight !== legalWeightFilter) return false;
            if (crossJurisdictionOnly && !u.ai_summary?.cross_jurisdiction_signal) return false;
            return true;
        },
    };

    const applyFilters = (disabled: Set<FilterKey>): Update[] =>
        updates.filter((u) =>
            (Object.keys(predicates) as FilterKey[]).every(
                (k) => disabled.has(k) || predicates[k](u)
            )
        );

    const strict = applyFilters(new Set());

    // Progressive relaxation: when strict yields 0, drop filters one at a time
    // in order of "least costly to broaden". Search stays — it's user intent.
    const RELAXATION_ORDER: { key: FilterKey; label: string }[] = [
        { key: 'date', label: 'date range' },
        { key: 'sector', label: 'industry' },
        { key: 'ai', label: 'urgency / legal weight' },
        { key: 'source', label: 'source' },
        { key: 'topic', label: 'topic' },
        { key: 'region', label: 'jurisdiction' },
    ];

    let filtered = strict;
    const relaxed: string[] = [];
    if (strict.length === 0 && updates.length > 0) {
        const disabled = new Set<FilterKey>();
        for (const step of RELAXATION_ORDER) {
            // Only count it as "relaxed" if that filter was actually active
            const wasActive = (() => {
                switch (step.key) {
                    case 'date': return dateRange !== 'all';
                    case 'sector': return activeSectors.length > 0;
                    case 'ai': return urgencyFilter !== 'all' || legalWeightFilter !== 'all' || crossJurisdictionOnly;
                    case 'source': return !!activeSource;
                    case 'topic': return selectedTopics.length > 0;
                    case 'region': return selectedRegions.length > 0;
                    default: return false;
                }
            })();
            disabled.add(step.key);
            if (wasActive) relaxed.push(step.label);
            const next = applyFilters(disabled);
            if (next.length > 0) {
                filtered = next;
                break;
            }
        }
    }

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

    const hasJurisdictionOrTopic = selectedRegions.length > 0 || selectedTopics.length > 0;

    const articlesForFeed = filtered.map((a) => ({
        ...a,
        source_url: (a as any).source_url || a.url,
        jurisdiction: a.direct_jurisdictions?.[0] ?? a.affected_jurisdictions?.[0] ?? null,
    } as unknown as ArticleItem));

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Helmet>
                <title>Privacy Intelligence Feed | End User Privacy</title>
                <meta name="description" content="Daily intelligence monitored from regulatory and news sources across the world, filtered by jurisdiction, topic, date, and source." />
            </Helmet>
            <Navbar />

            <header className="bg-[#2d7a8a] text-white py-12">
                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
                    <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
                        📰 Privacy Intelligence Feed
                    </span>
                    <h1 className="font-serif text-white mb-3">
                        {selectedRegions.length === 1 && selectedTopics.length === 0
                            ? formatFilterLabel(selectedRegions[0])
                            : selectedTopics.length === 1 && selectedRegions.length === 0
                                ? formatFilterLabel(selectedTopics[0])
                                : "Privacy Intelligence Feed"}
                    </h1>
                    <p className="text-slate-300 text-lg max-w-3xl leading-relaxed">
                        Daily intelligence from regulatory and news sources across the world. Filter by jurisdiction, topic, date, and source to find what's relevant to your practice.
                    </p>
                </div>
            </header>

            {/* Jurisdiction subnav (pill style) — sticky under navbar */}
            <div className="border-b border-border bg-card sticky top-14 md:top-16 z-30">
                <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-3 md:grid md:grid-cols-[160px_1fr] xl:grid-cols-[180px_1fr] md:gap-6 md:items-center">
                    <span className="hidden md:block text-eyebrow font-bold text-foreground underline underline-offset-4 text-center">Jurisdiction</span>
                    <div className="flex items-center gap-3 overflow-x-auto">
                        <span className="md:hidden text-eyebrow font-bold text-foreground underline underline-offset-4 whitespace-nowrap">Jurisdiction</span>
                        {LOCATION_FILTERS.map((f) => {
                            const isActive = f.key === "all"
                                ? selectedRegions.length === 0
                                : selectedRegions.includes(f.key);
                            return (
                                <button
                                    key={f.key}
                                    onClick={() => toggleRegion(f.key)}
                                    aria-pressed={isActive}
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
                {/* Left: Topics sidebar — sticky under navbar + jurisdiction strip */}
                <aside className="hidden md:block sticky top-32 self-start max-h-[calc(100vh-9rem)] overflow-y-auto -mt-4">
                    <div className="bg-card rounded-lg p-3">
                        <h3 className="text-eyebrow font-bold text-foreground underline underline-offset-4 mb-3 text-center">Topics</h3>
                        <nav className="flex flex-col">
                            {TOPIC_FILTERS.map((t) => {
                                const isActive = t.key === "all"
                                    ? selectedTopics.length === 0
                                    : selectedTopics.includes(t.key);
                                return (
                                    <button
                                        key={t.key}
                                        onClick={() => toggleTopic(t.key)}
                                        aria-pressed={isActive}
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
                            const isActive = t.key === "all"
                                ? selectedTopics.length === 0
                                : selectedTopics.includes(t.key);
                            return (
                                <button
                                    key={t.key}
                                    onClick={() => toggleTopic(t.key)}
                                    aria-pressed={isActive}
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

                {isPremium ? (
                  <Link
                    to="/dashboard"
                    aria-label="View your latest Privacy Intelligence Report"
                    className="group block bg-brand-teal/10 hover:bg-brand-teal/20 border border-brand-teal/30 rounded-lg px-4 py-3 mb-4 text-sm font-semibold text-brand-teal-text text-center no-underline transition-colors"
                  >
                    View your latest Privacy Intelligence Report →
                  </Link>
                ) : (
                  <Link
                    to="/get-intelligence"
                    aria-label="Get your privacy intelligence, customized and analyzed for your priorities and responsibilities"
                    className="group block bg-brand-mist/10 hover:bg-brand-mist/20 border border-brand-mist/30 hover:border-brand-mist/50 rounded-xl px-5 py-3 mb-4 transition-all no-underline text-center"
                  >
                    <p className="text-sm font-semibold m-0 text-brand-teal-text group-hover:text-brand-navy transition-colors">
                      Get your privacy intelligence, customized and analyzed for your priorities and responsibilities →
                    </p>
                  </Link>
                )}

                {/* Filter gate chip — anon users clicking a gated control (sector / date) */}
                {showFilterGate && !user && (
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sky-50 border border-sky-200/60 mb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                        <p className="text-sm text-brand-navy flex-1">
                            Register free to filter by your industry and date range
                        </p>
                        <Link
                            to="/signup"
                            className="text-[11px] px-3 py-1 rounded-lg bg-accent text-white font-semibold hover:bg-accent-light transition-colors whitespace-nowrap no-underline"
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

                {/* Sectors faceted filter hidden for now */}

                {/* Search + date range */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search the entire Privacy Intelligence Feed…"
                            value={searchTerm}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (containsProfanity(value)) {
                                    toast.error("Search term not allowed");
                                    setSearchTerm("");
                                    return;
                                }
                                setSearchTerm(value);
                            }}
                            className="w-full pl-12 pr-12 py-3.5 border-2 border-border rounded-lg text-base bg-background shadow-sm focus:outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 transition-all placeholder:text-muted-foreground"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm("")}
                                aria-label="Clear search"
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="px-4 py-3.5 border-2 border-border rounded-lg text-base bg-background focus:outline-none focus:border-brand-teal"
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
                <AdSlot format="in-content" />


                {/* Free registered: subtle Pro upgrade strip */}
                {user && !isPremium && (
                    <div className="text-sm text-brand-navy bg-brand-teal/5 border border-brand-teal/20 px-3 py-2 rounded-lg mb-4">
                        Get a personalised Privacy Intelligence Report every Monday, written for your role, jurisdiction, and industry.{" "}
                        <Link to="/get-intelligence" className="underline font-semibold text-brand-teal-text hover:text-brand-navy">
                            Build your sample brief →
                        </Link>
                    </div>
                )}

                {/* Progressive-relaxation notice */}
                {relaxed.length > 0 && filtered.length > 0 && (
                    <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200">
                        <div className="flex-1 text-sm text-amber-900">
                            <span className="font-semibold">No exact matches</span> for your filter combination.
                            Showing the closest related updates; we relaxed{" "}
                            <span className="font-medium">{relaxed.join(", ")}</span>.
                        </div>
                        <button
                            onClick={clearAllFilters}
                            className="text-xs font-semibold text-amber-900 hover:underline whitespace-nowrap"
                        >
                            Clear filters
                        </button>
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
