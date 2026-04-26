import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { type ArticleItem } from "@/components/ArticleCard";
import { TieredFeed } from "@/components/TieredFeed";
import { Search, X } from "lucide-react";

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
  topic_tags?: string[];
  attention_level?: string;
  affected_sectors?: string[];
  regulatory_theory?: string;
  related_development?: string;
}

const FALLBACK_UPDATES: Update[] = [
  {
    id: "1",
    title: "EDPB Adopts Binding Guidance on Personal Data Use in AI Model Training",
    summary: "EDPB Opinion 28/2026 establishes that training LLMs on scraped personal data without a valid legal basis constitutes a GDPR violation.",
    url: "https://edpb.europa.eu",
    source_name: "EDPB",
    source_domain: "edpb.europa.eu",
    image_url: null,
    category: "eu-uk",
    regulator: "European Data Protection Board",
    published_at: new Date("2026-03-10").toISOString(),
    is_premium: false,
  },
  {
    id: "2",
    title: "Texas AG Files First TDPSA Enforcement Action Against Data Broker",
    summary: "Texas AG filed suit against a national data broker for selling sensitive personal data without required consumer consent.",
    url: "https://texasattorneygeneral.gov",
    source_name: "Texas AG",
    source_domain: "texasattorneygeneral.gov",
    image_url: null,
    category: "enforcement",
    regulator: "Texas Attorney General",
    published_at: new Date("2026-03-09").toISOString(),
    is_premium: false,
  },
  {
    id: "3",
    title: "ICO Publishes Updated Guidance on Biometric Data in Workplace AI Systems",
    summary: "ICO guidance clarifies that biometric data processed by workplace AI systems is special category data requiring explicit consent.",
    url: "https://ico.org.uk",
    source_name: "ICO",
    source_domain: "ico.org.uk",
    image_url: null,
    category: "ai-privacy",
    regulator: "UK Information Commissioner's Office",
    published_at: new Date("2026-03-08").toISOString(),
    is_premium: false,
  },
  {
    id: "4",
    title: "CPPA Approves Final Automated Decisionmaking Regulations",
    summary: "CPPA board approved final ADMT regulations requiring businesses to provide pre-use notices for automated decisionmaking.",
    url: "https://cppa.ca.gov",
    source_name: "CPPA",
    source_domain: "cppa.ca.gov",
    image_url: null,
    category: "us-states",
    regulator: "California Privacy Protection Agency",
    published_at: new Date("2026-03-07").toISOString(),
    is_premium: false,
  },
  {
    id: "5",
    title: "FTC Proposes Rule Expanding Children's Privacy Protections Under COPPA",
    summary: "FTC proposed rule would require verifiable parental consent for targeted advertising directed at children under 16.",
    url: "https://ftc.gov",
    source_name: "FTC",
    source_domain: "ftc.gov",
    image_url: null,
    category: "us-federal",
    regulator: "Federal Trade Commission",
    published_at: new Date("2026-03-06").toISOString(),
    is_premium: false,
  },
  {
    id: "6",
    title: "ANPD Issues Guidance on International Data Transfers Under LGPD",
    summary: "ANPD published Resolution No. 19 establishing standard contractual clauses for cross-border data transfers.",
    url: "https://gov.br/anpd",
    source_name: "ANPD",
    source_domain: "gov.br",
    image_url: null,
    category: "global",
    regulator: "Brazil ANPD",
    published_at: new Date("2026-03-05").toISOString(),
    is_premium: false,
  },
];

const LOCATION_FILTERS = [
  { key: "us-federal", label: "🇺🇸 U.S. Federal" },
  { key: "us-states", label: "🗺️ U.S. States" },
  { key: "eu-uk", label: "🇪🇺 EU & UK" },
  { key: "global", label: "🌐 Global" },
];

const TOPIC_FILTERS = [
  { key: "enforcement", label: "⚖️ Enforcement" },
  { key: "ai-privacy", label: "🤖 AI & Privacy" },
  { key: "adtech", label: "📡 AdTech & Advertising" },
  { key: "health-hipaa", label: "🏥 Health & HIPAA" },
  { key: "children-privacy", label: "👶 Children's Privacy" },
  { key: "data-breaches", label: "🔒 Data Breaches" },
  { key: "cross-border", label: "🌐 Cross-Border Transfers" },
  { key: "biometric-data", label: "🧬 Biometric Data" },
  { key: "employee-privacy", label: "💼 Employee Privacy" },
  { key: "cookie-consent", label: "🍪 Cookie Consent" },
];

const SkeletonCard = () => (
  <div className="flex gap-4 p-4 bg-card border border-fog rounded-2xl animate-pulse">
    <div className="flex-1 space-y-2">
      <div className="h-3 w-1/3 bg-muted rounded" />
      <div className="h-4 w-full bg-muted rounded" />
      <div className="h-3 w-2/3 bg-muted rounded" />
    </div>
  </div>
);

const LatestUpdates = () => {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLocations, setActiveLocations] = useState<Set<string>>(new Set());
  const [activeTopics, setActiveTopics] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .single()
      .then(({ data }: any) => {
        if (data?.is_premium) setIsPro(true);
      });
  }, [user]);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await (supabase as any)
          .from("updates")
          .select("id,title,summary,url,source_name,source_url,source_domain,image_url,published_at,category,regulator,is_premium,ai_summary,topic_tags,attention_level,affected_sectors,regulatory_theory,related_development,enrichment_version")
          .order("published_at", { ascending: false })
          .limit(20);

        if (!error && data && data.length > 0) {
          setUpdates(data as Update[]);
        } else {
          setUpdates(FALLBACK_UPDATES);
        }
      } catch {
        setUpdates(FALLBACK_UPDATES);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const toggleLocation = (key: string) => {
    setActiveLocations((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleTopic = (key: string) => {
    setActiveTopics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const hasActiveFilters = activeLocations.size > 0 || activeTopics.size > 0 || searchTerm.length > 0;

  const clearAll = () => {
    setActiveLocations(new Set());
    setActiveTopics(new Set());
    setSearchTerm("");
  };

  // Tiered access: Pro = unlimited, logged in = 21 days, anonymous = 15 articles
  const now = new Date();
  const twentyOneDaysAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);

  // Filter out articles marked as skipped/irrelevant by AI
  let visibleUpdates = updates.filter(u => !u.ai_summary?.skipped);
  if (!isPro && user) {
    visibleUpdates = visibleUpdates.filter(u => new Date(u.published_at) >= twentyOneDaysAgo);
  }

  const filtered = useMemo(() => {
    let result = visibleUpdates;

    // Location filter (OR within group)
    if (activeLocations.size > 0) {
      result = result.filter((u) => activeLocations.has(u.category));
    }

    // Topic filter (OR within group)
    if (activeTopics.size > 0) {
      result = result.filter((u) => {
        if (activeTopics.has(u.category)) return true;
        if (u.topic_tags?.some((t) => activeTopics.has(t))) return true;
        return false;
      });
    }

    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((u) => {
        const fields = [
          u.title,
          u.summary,
          u.regulator,
          u.source_name,
          u.category,
          u.regulatory_theory,
          u.related_development,
          u.attention_level,
          ...(u.topic_tags || []),
          ...(u.affected_sectors || []),
        ];
        return fields.some((f) => f?.toLowerCase().includes(q));
      });
    }

    return result;
  }, [visibleUpdates, activeLocations, activeTopics, searchTerm]);

  // Map updates → ArticleItem (ensure source_url is set so newsfeed cards link out)
  const articlesForFeed: ArticleItem[] = useMemo(
    () => filtered.map(u => ({ ...u, source_url: (u as any).source_url || u.url } as unknown as ArticleItem)),
    [filtered]
  );

  return (
    <section className="pt-5 pb-10 md:pt-8 md:pb-16 bg-paper py-0">
      <div className="mx-auto">
        <div className="bg-card border border-fog rounded-2xl overflow-hidden shadow-eup-sm">
          {/* Dark header bar */}
          <div className="px-4 md:px-6 py-4 md:py-5 bg-navy flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white tracking-tight text-2xl font-sans font-semibold">
                  Latest Privacy Updates
                </h2>
                <p className="text-[12px] text-slate-light">
                  Updated daily and analyzed for key takeaways.{" "}
                </p>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearAll}
                  className="text-[11px] text-sky hover:text-white bg-white/10 border border-white/15 rounded-full px-3 py-1 cursor-pointer transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear filters
                </button>
              )}
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Find the latest news on jurisdictions, privacy topics, and enforcement actions."
                className="w-full py-2 pl-10 pr-4 text-[13px] rounded-lg bg-white/10 border border-white/15 text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap items-center">
              {LOCATION_FILTERS.map((f) => (
                <span
                  key={f.key}
                  onClick={() => toggleLocation(f.key)}
                  className={`px-3 py-1.5 text-[12px] font-medium rounded-full border transition-all cursor-pointer ${
                    activeLocations.has(f.key)
                      ? "bg-white/15 text-white border-white/20 font-semibold"
                      : "bg-white/[0.05] text-slate-light border-white/10 hover:bg-white/10"
                  }`}
                >
                  {f.label}
                </span>
              ))}
              <span className="w-px h-5 bg-white/20 mx-1" />
              {TOPIC_FILTERS.map((f) => (
                <span
                  key={f.key}
                  onClick={() => toggleTopic(f.key)}
                  className={`px-3 py-1.5 text-[12px] font-medium rounded-full border transition-all cursor-pointer ${
                    activeTopics.has(f.key)
                      ? "bg-white/15 text-white border-white/20 font-semibold"
                      : "bg-white/[0.05] text-slate-light border-white/10 hover:bg-white/10"
                  }`}
                >
                  {f.label}
                </span>
              ))}
              <a href="/updates" className="text-[12px] font-medium text-sky hover:text-white transition-colors no-underline whitespace-nowrap ml-2">View all →</a>
            </div>
          </div>

          {/* Cards */}
          <div className="px-4 md:px-6 py-4">
            {loading
              ? <div className="gap-3 flex flex-col">{[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}</div>
              : articlesForFeed.length === 0
                ? (
                  <p className="text-center text-sm text-slate py-8">
                    No updates found for this filter.
                  </p>
                )
                : (
                  <TieredFeed
                    articles={articlesForFeed}
                    paginated={false}
                    newsfeedCap={12}
                    previewCount={3}
                    seeAllHref="/updates"
                    showSeeAll={true}
                  />
                )
            }
          </div>
        </div>
      </div>
    </section>
  );
};

export default LatestUpdates;
