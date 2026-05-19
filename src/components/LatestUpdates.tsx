import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { type ArticleItem } from "@/components/ArticleCard";
import { TieredFeed } from "@/components/TieredFeed";
import { ArrowRight } from "lucide-react";

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
  why_it_matters_short?: string | null;
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
          .select("id,title,summary,url,source_name,source_domain,image_url,published_at,category,regulator,is_premium,ai_summary,why_it_matters_short,topic_tags,attention_level,affected_sectors,regulatory_theory,related_development,enrichment_version")
          .eq("is_hidden", false)
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

  // Tiered access: Pro = unlimited, logged in = 21 days, anonymous = 15 articles
  const now = new Date();
  const twentyOneDaysAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);

  // Filter out articles marked as skipped/irrelevant by AI
  let visibleUpdates = updates.filter(u => !u.ai_summary?.skipped);
  if (!isPro && user) {
    visibleUpdates = visibleUpdates.filter(u => new Date(u.published_at) >= twentyOneDaysAgo);
  }

  const filtered = useMemo(() => visibleUpdates, [visibleUpdates]);

  // Map updates → ArticleItem (ensure source_url is set so newsfeed cards link out)
  const articlesForFeed: ArticleItem[] = useMemo(
    () => filtered.map(u => ({ ...u, source_url: (u as any).source_url || u.url } as unknown as ArticleItem)),
    [filtered]
  );

  return (
    <section className="pt-0 pb-10 md:pb-16 bg-paper">
      <div className="mx-auto">
        <div className="bg-card border border-fog rounded-2xl overflow-hidden shadow-eup-sm">
          {/* Dark header bar */}
          <div className="px-4 md:px-6 py-4 md:py-5 bg-navy flex flex-col gap-3">
            <div>
              <h2 className="text-white tracking-tight font-sans">
                Privacy Intelligence Feed
              </h2>
              <p className="text-[12px] text-slate-light">
                Updated daily and analyzed for key takeaways.{" "}
              </p>
            </div>

            {/* Single CTA: filter your feed by region & topic → /updates */}
            <Link
              to="/updates"
              className="group block rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/15 hover:border-white/25 transition-all px-3 py-3 no-underline"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-[12px] font-semibold text-white">
                  Select your article feed by region and subject matter
                </p>
                <span className="flex items-center gap-1 text-[11px] font-medium text-sky group-hover:text-white whitespace-nowrap transition-colors">
                  Open feed <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <div className="flex gap-1.5 flex-wrap items-center">
                {LOCATION_FILTERS.map((f) => (
                  <span
                    key={f.key}
                    className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-white/[0.06] text-slate-light border border-white/10"
                  >
                    {f.label}
                  </span>
                ))}
                <span className="w-px h-4 bg-white/20 mx-0.5" />
                {TOPIC_FILTERS.map((f) => (
                  <span
                    key={f.key}
                    className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-white/[0.06] text-slate-light border border-white/10"
                  >
                    {f.label}
                  </span>
                ))}
              </div>
            </Link>
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
                    previewCount={1}
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
