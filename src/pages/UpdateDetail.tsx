import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const UpdateDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Update | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default UpdateDetail;
