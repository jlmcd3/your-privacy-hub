import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AISummaryPanel from "@/components/AISummaryPanel";
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

const TOPIC_META: Record<string, { name: string; icon: string; description: string; related: string[] }> = {
  "ai-governance": {
    name: "AI Governance & Regulation",
    icon: "🤖",
    description: "Regulatory developments governing artificial intelligence, including the EU AI Act, algorithmic accountability laws, automated decision-making regulations, and AI training data guidance worldwide.",
    related: ["biometric-data", "children-privacy", "data-transfers"],
  },
  "data-breaches": {
    name: "Data Breach & Incident Response",
    icon: "🔓",
    description: "Data breach notification requirements, incident response regulations, ransomware policy developments, and enforcement actions related to security failures and unauthorized data access.",
    related: ["ai-governance", "adtech", "data-transfers"],
  },
  "biometric-data": {
    name: "Biometric & Facial Recognition Law",
    icon: "👁️",
    description: "Laws and enforcement actions governing biometric identifiers including facial recognition, fingerprint scanning, iris recognition, and voiceprint technology across global jurisdictions.",
    related: ["ai-governance", "children-privacy", "adtech"],
  },
  "data-transfers": {
    name: "Cross-Border Data Transfers",
    icon: "🌐",
    description: "International data transfer mechanisms including adequacy decisions, Standard Contractual Clauses (SCCs), Binding Corporate Rules (BCRs), and data localization requirements worldwide.",
    related: ["ai-governance", "data-breaches", "adtech"],
  },
  "children-privacy": {
    name: "Children's Privacy & Age Verification",
    icon: "👶",
    description: "Regulations protecting children's data including COPPA enforcement, age verification requirements, age-appropriate design codes, and restrictions on targeted advertising to minors.",
    related: ["ai-governance", "biometric-data", "adtech"],
  },
  "adtech": {
    name: "AdTech, Cookies & Consent",
    icon: "🍪",
    description: "Regulatory developments affecting advertising technology, cookie consent requirements, real-time bidding scrutiny, consent management platforms, and the deprecation of third-party cookies.",
    related: ["children-privacy", "data-transfers", "biometric-data"],
  },
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
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

const TopicHub = () => {
  const { slug } = useParams<{ slug: string }>();
  const meta = slug ? TOPIC_META[slug] : null;
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    async function load() {
      const { data } = await supabase
        .from("updates")
        .select("*")
        .contains("topic_tags", [slug!])
        .order("published_at", { ascending: false })
        .limit(30);
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
          <h1 className="text-2xl font-bold text-foreground mb-4">Topic Not Found</h1>
          <Link to="/" className="text-primary hover:underline">Return to homepage →</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const relatedTopics = meta.related
    .map((r) => TOPIC_META[r] ? { slug: r, ...TOPIC_META[r] } : null)
    .filter(Boolean) as { slug: string; name: string; icon: string }[];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Topbar />
      <Navbar />

      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
          <p className="text-sm font-medium text-muted-foreground mb-2">{meta.icon} Topic Hub</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3">{meta.name}</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">{meta.description}</p>
          {!loading && (
            <p className="mt-4 text-xs text-muted-foreground">
              {updates.length} article{updates.length !== 1 ? "s" : ""} · Updated daily
            </p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 grid md:grid-cols-[1fr_280px] gap-8 flex-1">
        {/* Article list */}
        <div className="space-y-4">
          {loading && [...Array(6)].map((_, i) => <SkeletonCard key={i} />)}

          {!loading && updates.map((u) => (
            <a
              key={u.id}
              href={u.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex gap-4 p-4 md:p-5 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-md hover:-translate-y-px transition-all no-underline cursor-pointer"
            >
              <div className="w-28 h-20 md:w-36 md:h-24 rounded-lg overflow-hidden shrink-0 bg-muted">
                <img
                  src={u.image_url || FALLBACK_IMAGES[u.category] || FALLBACK_IMAGES["global"]}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGES[u.category] || FALLBACK_IMAGES["global"]; }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 flex-wrap">
                  <span className="font-medium text-foreground/70">{u.source_domain || u.source_name}</span>
                  <span>·</span>
                  <span>{formatDate(u.published_at)}</span>
                </div>
                <h3 className="text-sm md:text-base font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {u.title}
                </h3>
                {u.summary && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{u.summary}</p>
                )}
                <AISummaryPanel summary={u.ai_summary || null} />
              </div>
              <div className="hidden md:flex items-center text-muted-foreground group-hover:text-primary transition-colors">
                <ExternalLink className="w-4 h-4" />
              </div>
            </a>
          ))}

          {!loading && updates.length === 0 && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📭</p>
              <p className="font-semibold text-foreground">No articles yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Articles tagged with this topic will appear here as they are ingested daily.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="hidden md:block space-y-6">
          {/* Related topics */}
          <div className="border border-border rounded-xl p-5 bg-card">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Related Topics</p>
            <div className="space-y-2">
              {relatedTopics.map((t) => (
                <Link
                  key={t.slug}
                  to={`/topics/${t.slug}`}
                  className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors no-underline"
                >
                  <span>{t.icon}</span>
                  <span>{t.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Premium CTA */}
          <div className="border border-border rounded-xl p-5 bg-card">
            <p className="text-xs font-semibold text-primary mb-2">⭐ Premium Intelligence</p>
            <p className="text-sm font-bold text-foreground mb-2">
              Get {meta.name} updates in your weekly brief
            </p>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Premium subscribers receive structured weekly intelligence with AI analysis across all topics.
            </p>
            <Link
              to="/subscribe"
              className="block text-center text-xs font-semibold text-primary-foreground bg-primary rounded-lg py-2 hover:opacity-90 transition-opacity"
            >
              View Premium Plans →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-8">
        <EmailSignup variant="card" />
      </div>

      <Footer />
    </div>
  );
};

export default TopicHub;