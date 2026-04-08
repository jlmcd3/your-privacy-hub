import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import NewsfeedList from "@/components/NewsfeedList";
import { ArticleCard, type ArticleItem } from "@/components/ArticleCard";
import { Link } from "react-router-dom";

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
  { key: "all", label: "All" },
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
  const [activeFilter, setActiveFilter] = useState("all");
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
          .select("id,title,summary,url,category,regulator,published_at,source_name,source_domain,ai_summary,topic_tags")
          .order("published_at", { ascending: false })
          .limit(50);

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

  // Tiered access: Pro = unlimited, logged in = 21 days, anonymous = 15 articles
  const now = new Date();
  const twentyOneDaysAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);

  let visibleUpdates = updates;
  if (!isPro && user) {
    visibleUpdates = updates.filter(u => new Date(u.published_at) >= twentyOneDaysAgo);
  }

  const filtered =
    activeFilter === "all"
      ? visibleUpdates
      : visibleUpdates.filter((u) => {
          // Match against category or topic_tags
          if (u.category === activeFilter) return true;
          if ((u as any).topic_tags?.includes(activeFilter)) return true;
          return false;
        });

  // Anonymous limit
  const FREE_LIMIT = 15;
  const showPaywall = !user && filtered.length > FREE_LIMIT;
  const displayArticles = !user ? filtered.slice(0, FREE_LIMIT) : filtered;

  return (
    <section className="pt-5 pb-10 md:pt-8 md:pb-16 px-4 md:px-8 bg-paper">
      <div className="max-w-[1280px] mx-auto">
        <div className="bg-card border border-fog rounded-2xl overflow-hidden shadow-eup-sm">
          {/* Dark header bar */}
          <div className="px-4 md:px-6 py-4 md:py-5 bg-navy flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-4 justify-between w-full sm:w-auto">
              <div>
                <h2 className="font-display text-[16px] text-white tracking-tight">
                  Latest Privacy Updates
                </h2>
                <p className="text-[12px] text-slate-light">
                  Updated daily · AI-summarized
                </p>
              </div>
              <a href="/updates" className="text-[12px] font-medium text-sky hover:text-white transition-colors no-underline whitespace-nowrap sm:ml-4">View all →</a>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {LOCATION_FILTERS.map((f) => (
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
              {/* Divider between location and topic filters */}
              <span className="w-px h-5 bg-white/20 mx-1" />
              {TOPIC_FILTERS.map((f) => (
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
          </div>

          {/* Cards */}
          <div className="px-4 md:px-6 py-4">
            {loading
              ? <div className="gap-3 flex flex-col">{[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}</div>
              : displayArticles.length === 0
                ? (
                  <p className="text-center text-sm text-slate py-8">
                    No updates found for this filter.
                  </p>
                )
                : (
                  <>
                    <NewsfeedList
                      articles={displayArticles}
                      renderArticle={(u) => (
                        <ArticleCard
                          key={u.id}
                          item={{...u, source_url: u.url} as unknown as ArticleItem}
                          variant='full'
                        />
                      )}
                    />

                    {/* Paywall for anonymous users */}
                    {showPaywall && (
                      <div className="mt-6 bg-gradient-to-br from-navy to-steel rounded-2xl p-8 text-center">
                        <h3 className="font-display font-bold text-white text-[20px] mb-2">
                          Continue reading with a free account
                        </h3>
                        <p className="text-blue-200 text-[14px] mb-6 max-w-md mx-auto">
                          Free accounts get 3 weeks of daily updates. Pro subscribers get the full archive.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <Link
                            to="/signup"
                            className="bg-white text-navy font-bold text-[14px] py-3 px-8 rounded-xl no-underline hover:opacity-90 transition-all"
                          >
                            Create free account
                          </Link>
                          <Link
                            to="/subscribe"
                            className="bg-amber-500 text-white font-bold text-[14px] py-3 px-8 rounded-xl no-underline hover:opacity-90 transition-all"
                          >
                            Get Premium
                          </Link>
                        </div>
                      </div>
                    )}
                  </>
                )
            }
          </div>
        </div>
      </div>
    </section>
  );
};

export default LatestUpdates;
