import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EmailSignup from "@/components/EmailSignup";
import { ActionBrief } from "@/components/ActionBrief";
import { useUserProfile } from "@/hooks/useUserProfile";
import { ArrowLeft, ExternalLink, Tag } from "lucide-react";

interface AISummary {
  why_it_matters?: string;
  why_it_matters_short?: string;
  takeaways?: string[];
  compliance_impact?: string;
  who_should_care?: string;
  urgency?: string;
  legal_weight?: string;
  risk_level?: string;
  affected_jurisdictions?: string[] | string;
  key_date?: string;
  entities?: { regulators?: string[]; laws?: string[]; cases?: string[] };
}

interface ActionItem {
  role?: string;
  action?: string;
  timeframe?: string;
}

interface RelatedSignal {
  label?: string;
  kind?: string;
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
  // Deep analysis fields (Pro tier)
  regulatory_theory: string | null;
  related_development: string | null;
  attention_level: string | null;
  affected_sectors: string[] | null;
  action_items: ActionItem[] | null;
  related_signals: RelatedSignal[] | null;
  precedent_novelty: string | null;
}

interface RelatedUpdate {
  id: string;
  title: string;
  source_name: string | null;
  published_at: string;
}

import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/config/categories";
import { fmtDate as formatDate } from "@/lib/dates";

const ANALYSIS_FIELDS: { key: keyof AISummary; label: string }[] = [
  { key: "compliance_impact", label: "Compliance Impact" },
  { key: "who_should_care", label: "Who Should Care" },
  { key: "urgency", label: "Urgency" },
  { key: "legal_weight", label: "Legal Weight" },
  { key: "risk_level", label: "Risk Level" },
];

/**
 * Strip HTML tags and collapse whitespace from raw summary content.
 * Some ingested sources (e.g. GDPRhub MediaWiki diffs) embed HTML tables
 * and markup that would render as a wall of garbled text if shown raw.
 */
function cleanSummary(raw: string | null | undefined): string {
  if (!raw) return "";
  // Remove script/style blocks entirely
  let text = raw.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "");
  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  // Decode a handful of common HTML entities
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
  // Collapse whitespace
  return text.replace(/\s+/g, " ").trim();
}

const UpdateDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const userProfile = useUserProfile();
  const [article, setArticle] = useState<Update | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [related, setRelated] = useState<RelatedUpdate[]>([]);

  // Fire-and-forget tracking — silent on failure, never blocks UI.
  const trackEvent = async (eventType: string) => {
    if (!user?.id || !article?.id) return;
    try {
      await supabase.from("user_enrichment_events").insert({
        user_id: user.id,
        event_type: eventType,
        article_id: article.id,
        article_category: article.category ?? null,
        user_role: userProfile.action_brief_salutation ?? null,
      });
    } catch {
      /* silent */
    }
  };

  // Fetch article
  useEffect(() => {
    if (!id) return;
    (supabase as any)
      .from("updates")
      .select(
        "id, title, summary, url, category, source_name, source_domain, published_at, regulator, topic_tags, ai_summary, regulatory_theory, related_development, attention_level, affected_sectors, action_items",
      )
      .eq("id", id)
      .eq("is_hidden", false)
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

  // Fetch related articles
  useEffect(() => {
    if (!article?.topic_tags || article.topic_tags.length === 0) return;
    (supabase as any)
      .from("updates")
      .select("id, title, source_name, published_at")
      .eq("is_hidden", false)
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
  const cleanedSummary = cleanSummary(article?.summary);
  const metaDesc = ai?.why_it_matters?.slice(0, 160) || "";

  // Briefed tier — present when ungated AI enrichment exists
  const hasBriefed = Boolean(
    ai?.why_it_matters ||
    (ai?.takeaways && ai.takeaways.length > 0) ||
    ai?.compliance_impact ||
    ai?.who_should_care ||
    ai?.urgency ||
    ai?.legal_weight ||
    ai?.risk_level,
  );

  // Analyzed tier — Pro-only deep analysis
  // For signed-in users, regulatory_theory/related_development have moved to Briefed,
  // so the Analyzed section only shows attention_level + affected_sectors.
  const hasAnalyzed = user
    ? Boolean(article?.attention_level || (article?.affected_sectors && article.affected_sectors.length > 0))
    : Boolean(
        article?.regulatory_theory ||
        article?.related_development ||
        article?.attention_level ||
        (article?.affected_sectors && article.affected_sectors.length > 0),
      );

  // Track when a free registered user is shown the blurred Analyzed section.
  useEffect(() => {
    if (!user || isPremium || !article?.id || !hasAnalyzed) return;
    void trackEvent("analyzed_blur_seen");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isPremium, article?.id, hasAnalyzed]);

  return (
    <div className="min-h-screen bg-background">
      {article && (
        <Helmet>
          <title>{article.title} | End User Privacy</title>
          <meta name="description" content={metaDesc} />
        </Helmet>
      )}
      {!article && !loading && (
        <Helmet>
          <title>Article Not Found | End User Privacy</title>
        </Helmet>
      )}
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
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
              <Link
                to="/updates"
                className="no-underline hover:text-foreground transition-colors text-muted-foreground"
              >
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
            <span
              className={`inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border mb-4 ${catColor}`}
            >
              {catLabel}
            </span>

            {/* Title */}
            <h1 className="font-display text-[28px] text-foreground font-bold leading-tight mb-3">{article.title}</h1>

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

            {/* ============================================================
                SECTION 2 — BRIEFED (tiered)
                  • Anon         → why_it_matters teaser only + sign-in CTA
                  • Free signed  → why_it_matters + key takeaways + Pro CTA
                  • Pro          → all Briefed fields
                ============================================================ */}
            {hasBriefed && (
              <section aria-labelledby="section-briefed" className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Briefed</span>
                  <span className="text-[10px] text-muted-foreground/60">Summary &amp; takeaways</span>
                </div>
                <hr className="border-border mb-4" />

                {/* Anonymous: short why + first sentence teaser + hard register gate */}
                {!user && (
                  <>
                    {(ai as any)?.why_it_matters_short && (
                      <div
                        className="border-l-4 px-4 py-3 mb-3 rounded-r"
                        style={{ borderColor: '#4A6FA5', background: '#E8EEFF' }}
                      >
                        <div
                          className="text-[10px] uppercase tracking-wide font-semibold mb-1"
                          style={{ color: '#4A6FA5' }}
                        >
                          Why it matters
                        </div>
                        <p className="text-[14px] leading-relaxed text-navy">
                          {(ai as any).why_it_matters_short}
                        </p>
                      </div>
                    )}
                    {ai?.why_it_matters && (
                      <p className="text-[14px] text-muted-foreground leading-relaxed mt-3">
                        {ai.why_it_matters.split('. ')[0]}…
                      </p>
                    )}
                    <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center">
                      <p className="text-[15px] font-semibold text-foreground mb-1">
                        Create a free account to read the full analysis
                      </p>
                      <p className="text-[13px] text-muted-foreground mb-4 leading-relaxed">
                        Key takeaways, regulatory theory, compliance impact, and action intelligence — on every update.
                      </p>
                      <div className="flex gap-3 justify-center flex-wrap">
                        <Link
                          to="/signup"
                          className="text-[13px] font-semibold bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-500 transition-colors no-underline"
                        >
                          Register free →
                        </Link>
                        <Link
                          to="/subscribe"
                          className="text-[13px] font-semibold border border-border text-foreground px-4 py-2 rounded-lg hover:bg-muted transition-colors no-underline"
                        >
                          See plans →
                        </Link>
                      </div>
                    </div>
                  </>
                )}

                {/* Pro: full why_it_matters */}
                {user && isPremium && ai?.why_it_matters && (
                  <div
                    className="border-l-4 px-4 py-3 mb-5 rounded-r"
                    style={{ borderColor: '#4A6FA5', background: '#E8EEFF' }}
                  >
                    <div
                      className="text-[10px] uppercase tracking-wide font-semibold mb-1"
                      style={{ color: '#4A6FA5' }}
                    >
                      Why it matters
                    </div>
                    <p className="text-[14px] leading-relaxed text-navy">{ai.why_it_matters}</p>
                  </div>
                )}

                {/* Key takeaways — all signed-in users */}
                {user && ai?.takeaways && ai.takeaways.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-foreground font-bold text-[14px] mb-2">Key takeaways</h3>
                    <ul className="list-disc pl-5 space-y-1.5">
                      {ai.takeaways.map((item, i) => (
                        <li key={i} className="text-[14px] text-muted-foreground leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Regulatory theory & related development — Pro only */}
                {user && isPremium && (article.regulatory_theory || article.related_development) && (
                  <div className="space-y-3 mb-5">
                    {article.regulatory_theory && (
                      <div className="border border-border rounded-lg p-3">
                        <div className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1">
                          Regulatory theory
                        </div>
                        <p className="text-[14px] leading-relaxed text-foreground">{article.regulatory_theory}</p>
                      </div>
                    )}
                    {article.related_development && (
                      <div className="border border-border rounded-lg p-3">
                        <div className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1">
                          Related development
                        </div>
                        <p className="text-[14px] leading-relaxed text-foreground">{article.related_development}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Brief — signed-in users only (blurred for free, full for Pro) */}
                {user && (ai?.compliance_impact || ai?.urgency) && (
                  <div className="mb-2">
                    <ActionBrief
                      urgency={ai?.urgency ?? null}
                      who_should_care={ai?.who_should_care ?? null}
                      compliance_impact={ai?.compliance_impact ?? null}
                      action_items={article.action_items ?? null}
                      risk_level={ai?.risk_level ?? null}
                      isPremium={isPremium}
                      articleId={article.id}
                    />
                  </div>
                )}

                {/* Upgrade CTA — free signed-in only */}
                {user && !isPremium && (
                  <div className="mt-4 rounded-xl border border-blue/20 bg-white px-4 py-4 text-center">
                    <p className="text-[14px] font-semibold text-navy mb-1">
                      Upgrade to Platform for full action intelligence
                    </p>
                    <p className="text-[12px] text-slate mb-3 leading-relaxed">
                      Compliance impact, action items by role, regulatory theory, and deep analysis on every update.
                    </p>
                    <Link
                      to="/subscribe"
                      className="inline-block text-[13px] font-semibold bg-gradient-to-br from-steel to-blue text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity no-underline"
                    >
                      Upgrade to Platform →
                    </Link>
                  </div>
                )}
              </section>
            )}

            {/* ============================================================
                SECTION 3 — ANALYZED (Pro-only deep analysis)
                ============================================================ */}
            {isPremium && (
              <section aria-labelledby="section-analyzed" className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-purple-700">Analyzed</span>
                  <span className="text-[9px] bg-purple-700 text-white px-1.5 py-0.5 rounded font-semibold">PRO</span>
                  <span className="text-[10px] text-muted-foreground/60">Deep regulatory analysis</span>
                </div>
                <hr className="border-border mb-4" />

                {!hasAnalyzed ? (
                  <p className="text-[14px] italic text-muted-foreground">
                    No deep analysis available for this article yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {article.attention_level && (
                      <div className="border border-border rounded-lg p-3">
                        <div className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1">
                          Attention level
                        </div>
                        <span className="inline-block text-[12px] px-2 py-0.5 rounded bg-muted text-foreground capitalize">
                          {article.attention_level}
                        </span>
                      </div>
                    )}
                    {article.affected_sectors && article.affected_sectors.length > 0 && (
                      <div className="border border-border rounded-lg p-3">
                        <div className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1.5">
                          Affected sectors
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {article.affected_sectors.map((s) => (
                            <span
                              key={s}
                              className="text-[12px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Topic tags */}
            {article.topic_tags && article.topic_tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                {article.topic_tags.map((t) => (
                  <span
                    key={t}
                    className="font-mono-code text-[11px] bg-muted text-muted-foreground px-2.5 py-1 rounded-full"
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
                      <p className="text-[14px] text-foreground font-medium leading-snug">{r.title}</p>
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
