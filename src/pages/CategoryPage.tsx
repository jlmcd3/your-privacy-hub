import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ExternalLink, Sparkles, Lock } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { stripHtml, normalizeTitle } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import AISummaryPanel from "@/components/AISummaryPanel";
import NewsfeedList from "@/components/NewsfeedList";
import EmailSignup from "@/components/EmailSignup";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";

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
  ai_summary?: any;
}

const categoryMeta: Record<string, { title: string; icon: string; description: string }> = {
  "us-federal": {
    title: "U.S. Federal",
    icon: "🇺🇸",
    description: "Federal privacy regulatory updates from the FTC, HHS, FCC, CFPB, and other federal agencies. Covers COPPA, HIPAA, FTC enforcement actions, and federal privacy bill activity.",
  },
  "us-states": {
    title: "U.S. States",
    icon: "🗺️",
    description: "State-level privacy regulatory updates covering all 50 states. Includes new legislation, enforcement actions by state attorneys general, and regulatory guidance from state privacy agencies.",
  },
  "eu-uk": {
    title: "EU & UK",
    icon: "🇪🇺",
    description: "Privacy regulatory updates from EU member state DPAs, the EDPB, and the UK's ICO. Covers GDPR enforcement, guidance, and regulatory developments across the European Economic Area.",
  },
  "global": {
    title: "Global",
    icon: "🌐",
    description: "Privacy regulatory developments from jurisdictions outside the U.S. and EU, including Asia-Pacific, Latin America, Middle East, and Africa. Covers new legislation, enforcement, and cross-border transfer developments.",
  },
  "enforcement": {
    title: "Enforcement Actions",
    icon: "⚖️",
    description: "Privacy enforcement actions worldwide including fines, sanctions, orders, and settlements from all monitored regulators. The definitive source for global privacy enforcement intelligence.",
  },
  "ai-privacy": {
    title: "AI & Privacy",
    icon: "🤖",
    description: "Regulatory developments at the intersection of artificial intelligence and data privacy. Covers the EU AI Act, automated decision-making regulations, AI training data guidance, and biometric data processing.",
  },
  "adtech": {
    title: "AdTech & Advertising Privacy",
    icon: "📡",
    description: "Regulatory intelligence on advertising technology, cookie consent, behavioral targeting, programmatic advertising, the IAB TCF, and FTC commercial surveillance enforcement.",
  },
};

const FALLBACK_IMAGES: Record<string, string> = {
  "us-federal": "https://picsum.photos/seed/federal-law/400/200",
  "us-states": "https://picsum.photos/seed/state-capitol/400/200",
  "eu-uk": "https://picsum.photos/seed/european-union/400/200",
  "global": "https://picsum.photos/seed/global-privacy/400/200",
  "enforcement": "https://picsum.photos/seed/legal-court/400/200",
  "ai-privacy": "https://picsum.photos/seed/artificial-intelligence/400/200",
  "adtech": "https://picsum.photos/seed/advertising-tech/400/200",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const SkeletonCard = () => (
  <div className="flex gap-4 p-4 md:p-5 bg-card border border-border rounded-xl animate-pulse">
    <div className="w-28 h-20 md:w-36 md:h-24 rounded-lg bg-muted shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-1/3 bg-muted rounded" />
      <div className="h-4 w-3/4 bg-muted rounded" />
      <div className="h-3 w-full bg-muted rounded" />
    </div>
  </div>
);

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const meta = slug ? categoryMeta[slug] : null;
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    async function load() {
      const { data } = await supabase
        .from("updates")
        .select("*")
        .eq("category", slug!)
        .order("published_at", { ascending: false })
        .limit(50);
      setUpdates((data as Update[]) || []);
      setLoading(false);
    }
    load();
  }, [slug]);

  if (!meta) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Topbar />
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <h1 className="text-2xl font-bold text-foreground mb-4">Category Not Found</h1>
          <Link to="/" className="text-primary hover:underline">
            Return to homepage →
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{meta.title} Updates | EndUserPrivacy</title>
        <meta name="description" content={meta.description.substring(0, 155) + "…"} />
      </Helmet>
      <Topbar />
      <Navbar />

      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            {meta.icon} {({
              "enforcement": "Enforcement Intelligence",
              "us-federal": "U.S. Federal Updates",
              "us-states": "U.S. State Updates",
              "eu-uk": "EU & UK Updates",
              "global": "Global Updates",
              "ai-privacy": "AI & Privacy Updates",
            } as Record<string, string>)[slug!] || "Updates"}
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3">
            {meta.title}
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            {meta.description}
          </p>
          {!loading && (
            <p className="mt-4 text-xs text-muted-foreground">
              {updates.length} article{updates.length !== 1 ? "s" : ""} · Updated daily
            </p>
          )}
        </div>
      </div>

      <AdBanner variant="leaderboard" adSlot="eup-category-top" className="py-3" />

      <div className="max-w-5xl mx-auto px-4 py-8 grid md:grid-cols-[1fr_280px] gap-8 flex-1">
        {/* Article list */}
        <div>
          {loading && <div className="space-y-4">{[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}</div>}

          {!loading && updates.length === 0 && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📭</p>
              <p className="font-semibold text-foreground">No articles yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Articles for this category will appear here as they are fetched daily.
              </p>
            </div>
          )}

          {!loading && updates.length > 0 && (
            <NewsfeedList
              articles={updates}
              renderArticle={(u, _i, isPremium) => {
                const enriched = !!(u as any).ai_summary?.why_it_matters;
                return (
                <a
                  key={u.id}
                  href={u.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group flex gap-4 p-4 md:p-5 rounded-xl hover:shadow-md hover:-translate-y-px transition-all no-underline cursor-pointer relative ${
                    enriched
                      ? 'border-l-[3px]'
                      : 'bg-card border border-border hover:border-primary/30'
                  }`}
                  style={enriched ? { borderLeftColor: '#4A6FA5', backgroundColor: '#F0F4FF' } : undefined}
                >
                  {/* Intelligence badge */}
                  {enriched && (
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold font-sans"
                        style={{ background: '#E8EEFF', color: '#4A6FA5' }}>
                        <Sparkles className="w-3 h-3" />
                        Intelligence
                      </span>
                    </div>
                  )}
                  <div className="w-28 h-20 md:w-36 md:h-24 rounded-lg overflow-hidden shrink-0 bg-muted">
                    <img
                      src={u.image_url || FALLBACK_IMAGES[u.category] || FALLBACK_IMAGES["global"]}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          FALLBACK_IMAGES[u.category] || FALLBACK_IMAGES["global"];
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0 pr-24">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 flex-wrap">
                      <span className="font-medium text-foreground/70">
                        {u.source_domain || u.source_name}
                      </span>
                      <span>·</span>
                      <span>{formatDate(u.published_at)}</span>
                      {u.regulator && (
                        <>
                          <span>·</span>
                          <span>{u.regulator}</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-sm md:text-base font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {normalizeTitle(u.title)}
                    </h3>
                    {u.summary && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-3 leading-relaxed">
                        {stripHtml(u.summary)}
                      </p>
                    )}
                    {/* Enriched "Why it matters" with free/premium differentiation */}
                    {enriched && (
                      isPremium ? (
                        <p className="text-[13px] text-emerald-700 leading-relaxed line-clamp-2 mt-1 italic">
                          <span className="font-semibold not-italic">Why it matters:</span>{' '}
                          {stripHtml((u as any).ai_summary.why_it_matters)}
                        </p>
                      ) : (
                        <div className="mt-1 relative" onClick={(e) => e.preventDefault()}>
                          <p className="text-[13px] text-emerald-700 leading-relaxed line-clamp-2 italic">
                            <span className="font-semibold not-italic">Why it matters:</span>{' '}
                            {stripHtml((u as any).ai_summary.why_it_matters)}
                          </p>
                          <div
                            className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
                            style={{ background: 'linear-gradient(to bottom, transparent, #F0F4FF)' }}
                          />
                          <Link
                            to="/subscribe"
                            className="flex items-center gap-1.5 mt-1 text-[12px] font-semibold no-underline transition-colors"
                            style={{ color: '#4A6FA5' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Upgrade to Intelligence to read the full analysis
                          </Link>
                        </div>
                      )
                    )}
                    {!enriched && <AISummaryPanel summary={(u as any).ai_summary || null} isPremium={isPremium} />}
                  </div>
                  <div className="hidden md:flex items-center text-muted-foreground group-hover:text-primary transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </a>
                );
              }}
            />
          )}
        </div>

        {/* Premium CTA + Sidebar Ad */}
        <div className="hidden md:block">
          <div className="sticky top-24 border border-border rounded-xl p-5 bg-card">
            <p className="text-xs font-semibold text-primary mb-2">
              ⭐ Premium Intelligence
            </p>
            <p className="text-sm font-bold text-foreground mb-2">
              Get all {meta.title} updates in your weekly brief
            </p>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Premium subscribers receive a structured weekly intelligence brief with AI analysis
              across all categories.
            </p>
            <Link
              to="/subscribe"
              className="block text-center text-xs font-semibold text-primary-foreground bg-primary rounded-lg py-2 hover:opacity-90 transition-opacity"
            >
              View Premium Plans →
            </Link>
          </div>
          <div className="mt-4">
            <AdBanner variant="sidebar" adSlot="eup-category-sidebar" />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-8">
        <EmailSignup variant="card" />
      </div>

      <AdBanner variant="leaderboard" adSlot="eup-category-bottom" className="py-3" />

      <Footer />
    </div>
  );
};

export default CategoryPage;
