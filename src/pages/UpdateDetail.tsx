import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EmailSignup from "@/components/EmailSignup";
import { ArrowLeft, ExternalLink, Tag } from "lucide-react";

interface AISummary {
  why_it_matters?: string;
  takeaways?: string[];
  compliance_impact?: string;
  who_should_care?: string;
  urgency?: string;
  legal_weight?: string;
  risk_level?: string;
}

interface Update {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  category: string;
  source_name: string | null;
  source_domain: string | null;
  published_at: string;
  regulator: string | null;
  topic_tags: string[] | null;
  ai_summary: AISummary | null;
}

interface RelatedUpdate {
  id: string;
  title: string;
  source_name: string | null;
  published_at: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  enforcement: "bg-red-50 text-red-700 border-red-200",
  legislation: "bg-blue-50 text-blue-700 border-blue-200",
  guidance: "bg-emerald-50 text-emerald-700 border-emerald-200",
  opinion: "bg-purple-50 text-purple-700 border-purple-200",
  "ai-regulation": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "data-breach": "bg-orange-50 text-orange-700 border-orange-200",
  global: "bg-slate-50 text-slate-700 border-slate-200",
};

const CATEGORY_LABELS: Record<string, string> = {
  enforcement: "Enforcement",
  legislation: "Legislation",
  guidance: "Guidance",
  opinion: "Opinion",
  "ai-regulation": "AI Regulation",
  "data-breach": "Data Breach",
  global: "Global",
};

const PREMIUM_FIELDS: { key: keyof AISummary; label: string }[] = [
  { key: "compliance_impact", label: "Compliance Impact" },
  { key: "who_should_care", label: "Who Should Care" },
  { key: "urgency", label: "Urgency" },
  { key: "legal_weight", label: "Legal Weight" },
  { key: "risk_level", label: "Risk Level" },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const UpdateDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [article, setArticle] = useState<Update | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [related, setRelated] = useState<RelatedUpdate[]>([]);

  // Fetch article
  useEffect(() => {
    if (!id) return;
    (supabase as any)
      .from("updates")
      .select("id, title, summary, url, category, source_name, source_domain, published_at, regulator, topic_tags, ai_summary")
      .eq("id", id)
      .single()
      .then(({ data, error }: any) => {
        if (error || !data) {
          setNotFound(true);
        } else {
          setArticle(data as Update);
        }
        setLoading(false);
      });
  }, [id]);

  // Fetch premium status
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setIsPremium(data?.is_premium ?? false);
      });
  }, [user]);

  // Fetch related articles
  useEffect(() => {
    if (!article?.topic_tags || article.topic_tags.length === 0) return;
    (supabase as any)
      .from("updates")
      .select("id, title, source_name, published_at")
      .overlaps("topic_tags", article.topic_tags)
      .neq("id", article.id)
      .order("published_at", { ascending: false })
      .limit(5)
      .then(({ data }: any) => {
        if (data) setRelated(data as RelatedUpdate[]);
      });
  }, [article]);

  const ai = article?.ai_summary as AISummary | null;
  const catColor = CATEGORY_COLORS[article?.category || "global"] || CATEGORY_COLORS.global;
  const catLabel = CATEGORY_LABELS[article?.category || "global"] || article?.category || "Global";
  const metaDesc = ai?.why_it_matters?.slice(0, 160) || article?.summary?.slice(0, 160) || "";

  return (
    <div className="min-h-screen bg-background">
      {article && (
        <Helmet>
          <title>{article.title} | EndUserPrivacy</title>
          <meta name="description" content={metaDesc} />
        </Helmet>
      )}
      {!article && !loading && (
        <Helmet>
          <title>Article Not Found | EndUserPrivacy</title>
        </Helmet>
      )}
      <Topbar />
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-10">
        {loading && (
          <div className="space-y-4">
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
            <div className="h-8 w-full bg-muted rounded animate-pulse" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
            <div className="h-px bg-border my-6" />
            <div className="h-20 bg-muted rounded animate-pulse" />
            <div className="h-px bg-border my-6" />
            <div className="h-6 w-40 bg-muted rounded animate-pulse" />
            <div className="h-16 bg-muted rounded animate-pulse" />
          </div>
        )}

        {notFound && !loading && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">📄</p>
            <h1 className="font-display text-[22px] text-foreground mb-2">Article not found</h1>
            <p className="text-muted-foreground text-[14px] mb-6">
              This article may have been removed or the link is incorrect.
            </p>
            <Link
              to="/updates"
              className="inline-flex items-center gap-2 text-primary font-semibold text-[14px] no-underline hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Updates
            </Link>
          </div>
        )}

        {article && !loading && (
          <>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-4">
              <Link to="/updates" className="no-underline hover:text-foreground transition-colors text-muted-foreground">
                News
              </Link>
              <span>→</span>
              <Link
                to={`/updates?category=${article.category}`}
                className="no-underline hover:text-foreground transition-colors text-muted-foreground"
              >
                {catLabel}
              </Link>
              <span>→</span>
              <span className="text-foreground truncate max-w-[200px] sm:max-w-[400px]">
                {article.title.length > 60 ? article.title.slice(0, 60) + "…" : article.title}
              </span>
            </nav>

            {/* Category badge */}
            <span className={`inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border mb-4 ${catColor}`}>
              {catLabel}
            </span>

            {/* Title */}
            <h1 className="font-display text-[28px] text-foreground font-bold leading-tight mb-3">
              {article.title}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground mb-6">
              {article.source_name && <span>{article.source_name}</span>}
              {article.source_name && article.published_at && <span>·</span>}
              {article.published_at && <span>{formatDate(article.published_at)}</span>}
              {article.regulator && (
                <>
                  <span>·</span>
                  <span>{article.regulator}</span>
                </>
              )}
            </div>

            <hr className="border-border mb-6" />

            {/* Summary */}
            {article.summary && (
              <>
                <p className="text-[15px] text-muted-foreground leading-relaxed mb-6">
                  {article.summary}
                </p>
                <hr className="border-border mb-6" />
              </>
            )}

            {/* Why It Matters */}
            {ai?.why_it_matters && (
              <>
                <h2 className="text-foreground font-bold text-[16px] mb-2">Why It Matters</h2>
                <p className="text-[14px] text-muted-foreground leading-relaxed mb-6">
                  {ai.why_it_matters}
                </p>
              </>
            )}

            {/* Key Takeaways */}
            {ai?.takeaways && ai.takeaways.length > 0 && (
              <>
                <h2 className="text-foreground font-bold text-[16px] mb-2">Key Takeaways</h2>
                <ul className="list-disc pl-5 space-y-1.5 mb-6">
                  {ai.takeaways.map((item, i) => (
                    <li key={i} className="text-[14px] text-muted-foreground leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Premium-gated fields */}
            {PREMIUM_FIELDS.some(f => ai?.[f.key]) && (
              <div className="mb-6 space-y-4">
                {PREMIUM_FIELDS.map(({ key, label }) => {
                  const value = ai?.[key];
                  if (!value || typeof value !== "string") return null;
                  return (
                    <div key={key}>
                      <h3 className="text-foreground font-bold text-[14px] mb-1">{label}</h3>
                      {isPremium ? (
                        <p className="text-[14px] text-muted-foreground leading-relaxed">{value}</p>
                      ) : (
                        <div className="filter blur-sm pointer-events-none select-none">
                          <p className="text-[14px] text-muted-foreground leading-relaxed">{value}</p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {!isPremium && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                    <p className="text-[13px] font-semibold text-amber-900 mb-2">Unlock full analysis for every article</p>
                    <Link
                      to="/subscribe"
                      className="inline-block bg-amber-400 text-navy font-bold text-[13px] px-5 py-2 rounded-lg no-underline hover:bg-amber-300 transition-colors"
                    >
                      Get Intelligence — $20/month →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Topic tags */}
            {article.topic_tags && article.topic_tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                {article.topic_tags.map((t) => (
                  <span
                    key={t}
                    className="text-[11px] bg-muted text-muted-foreground px-2.5 py-1 rounded-full"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <hr className="border-border mb-6" />

            {/* Read original source */}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary font-semibold text-[14px] no-underline hover:underline border border-border rounded-xl px-5 py-2.5 transition-colors hover:bg-muted"
            >
              Read original source <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* Related Updates */}
            {related.length > 0 && (
              <div className="mt-10">
                <h2 className="font-bold text-foreground text-[15px] mb-3">Related Updates</h2>
                <div className="space-y-3">
                  {related.map((r) => (
                    <Link
                      key={r.id}
                      to={`/updates/${r.id}`}
                      className="block no-underline hover:bg-muted rounded-lg p-3 -mx-3 transition-colors"
                    >
                      <p className="text-[14px] text-foreground font-medium leading-snug">
                        {r.title}
                      </p>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        {r.source_name && <span>{r.source_name} · </span>}
                        {formatDate(r.published_at)}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Email capture for unauthenticated users */}
            {!user && (
              <div className="mt-10">
                <EmailSignup variant="strip" />
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default UpdateDetail;
