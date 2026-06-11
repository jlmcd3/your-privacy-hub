import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EmailSignup from "@/components/EmailSignup";

import { useUserProfile } from "@/hooks/useUserProfile";
import { ArrowLeft, ExternalLink, Tag, Lock } from "lucide-react";
import InFeedAd from "@/components/InFeedAd";
import { getSeverityLabel } from "@/lib/severity";

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
  time_horizon?: "now" | "this_quarter" | "ongoing";
}

interface RelatedSignal {
  label?: string;
  kind?: string;
  signal?: string;
  jurisdiction?: string;
  significance?: string;
}

interface ContextualRecord {
  regulatory_theory?: string;
  precedent_novelty?: string;
  enforcement_pattern?: string;
  key_cases?: string[];
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
  affected_entities: string[] | null;
  action_items: (ActionItem | string)[] | null;
  related_signals: RelatedSignal[] | null;
  precedent_novelty: string | null;
  contextual_record: ContextualRecord | null;
  contextual_teaser: string | null;
  product_ctas: { slug: string; trigger?: string }[] | null;
}

interface RelatedUpdate {
  id: string;
  title: string;
  source_name: string | null;
  source_url: string | null;
  published_at: string;
}

import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/config/categories";
import { fmtDate as formatDate } from "@/lib/dates";


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
        "id, title, summary, url, category, source_name, source_domain, published_at, regulator, topic_tags, ai_summary, regulatory_theory, related_development, attention_level, affected_sectors, action_items, related_signals, contextual_teaser, contextual_record, source_tier, enrichment_quality",
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
      .select("id, title, source_name, source_url, published_at")
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
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
      )}
      {!article && !loading && (
        <Helmet>
          <title>Article Not Found | End User Privacy</title>
          <meta name="robots" content="noindex, nofollow" />
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
            <h1 className="font-display text-foreground mb-2">Article not found</h1>
            <p className="text-muted-foreground text-sm mb-6">
              This article may have been removed or the link is incorrect.
            </p>
            <Link
              to="/updates"
              className="inline-flex items-center gap-2 text-primary font-semibold text-sm no-underline hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Updates
            </Link>
          </div>
        )}

        {article && !loading && (
          <>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-meta text-muted-foreground mb-4">
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
              className={`inline-block text-eyebrow px-2.5 py-1 rounded-full border mb-4 ${catColor}`}
            >
              {catLabel}
            </span>

            {/* Title */}
            <h1 className="font-display text-foreground leading-tight mb-3" style={{ fontSize: 'clamp(1.333rem, 0.933rem + 2vw, 1.833rem)' }}>{article.title}</h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground mb-4">
              {article.source_name && <span>{article.source_name}</span>}
              {article.source_name && article.published_at && <span>·</span>}
              {article.published_at && <span>{formatDate(article.published_at)}</span>}
              {article.regulator && (
                <>
                  <span>·</span>
                  <span>{article.regulator}</span>
                </>
              )}
              {/* severity chip intentionally not surfaced to end users */}

              {/* Precedent novelty badge — paid only (3D) */}
              {isPremium && (() => {
                const pn = (article as any).precedent_novelty as string | null | undefined;
                if (!pn) return null;
                const map: Record<string, { label: string; className: string }> = {
                  new_theory: { label: "New legal theory", className: "bg-amber-100 text-amber-800 border border-amber-300" },
                  confirms: { label: "Confirms precedent", className: "bg-emerald-100 text-emerald-800 border border-emerald-300" },
                  reverses: { label: "Reverses prior position", className: "bg-red-100 text-red-800 border border-red-300" },
                  routine: { label: "Routine", className: "bg-slate-100 text-slate-700 border border-slate-200" },
                };
                const m = map[pn];
                return m ? (
                  <span className={`text-eyebrow px-1.5 py-0.5 rounded-md ${m.className}`}>
                    {m.label}
                  </span>
                ) : null;
              })()}
            </div>

            {/* ============================================================
                ANONYMOUS gate — show why_it_matters_short + severity (already
                in metadata) and a single locked row covering all 4 sections.
                ============================================================ */}
            {!user ? (
              <>
                {(ai?.why_it_matters_short || ai?.why_it_matters) && (
                  <div
                    className="border-l-4 px-4 py-3 mb-5 rounded-r"
                    style={{ borderColor: 'hsl(var(--cobalt))', background: 'hsl(var(--cobalt) / 0.08)' }}
                  >
                    <div className="text-meta uppercase tracking-wide font-semibold mb-1" style={{ color: 'hsl(var(--cobalt))' }}>
                      Why it matters
                    </div>
                    <p className="text-base leading-relaxed text-brand-navy">
                      {ai?.why_it_matters_short || (ai?.why_it_matters?.split('. ')[0] + '…')}
                    </p>
                  </div>
                )}
                <div className="rounded-xl border border-border bg-muted/30 p-5 flex items-start gap-3 mb-8">
                  <Lock className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground mb-1">
                      The Brief, Next Steps, Watch, and Contextual Record are available to registered users.
                    </p>
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                      Sign up free to see analysis on every update.
                    </p>
                    <Link
                      to="/signup"
                      className="inline-block text-sm font-semibold text-white px-4 py-2 rounded-lg no-underline transition-colors hover:opacity-90"
                      style={{ background: 'hsl(var(--accent))' }}
                    >
                      Sign up free →
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* ========================================================
                    SECTION 1 — THE BRIEF (free registered + paid)
                    ======================================================== */}
                <section aria-label="The Brief" className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-eyebrow" style={{ color: 'hsl(var(--cobalt))' }}>The Brief</span>
                    <span className="text-meta text-muted-foreground/60">Why it matters &amp; key takeaways</span>
                  </div>
                  <hr className="border-border mb-4" />

                  {ai?.why_it_matters && (
                    <div
                      className="border-l-4 px-4 py-3 mb-4 rounded-r"
                      style={{ borderColor: 'hsl(var(--cobalt))', background: 'hsl(var(--cobalt) / 0.08)' }}
                    >
                      <p className="text-base leading-relaxed text-brand-navy m-0">
                        {ai.why_it_matters.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ')}
                      </p>
                    </div>
                  )}

                  {ai?.takeaways && ai.takeaways.length > 0 && (
                    <ul className="list-disc pl-5 space-y-1.5 mb-4">
                      {ai.takeaways.slice(0, 2).map((item, i) => (
                        <li key={i} className="text-base text-foreground leading-relaxed">{item}</li>
                      ))}
                    </ul>
                  )}

                  {/* Entity chips + scope row */}
                  {(() => {
                    const entities = ai?.entities;
                    const chips: { label: string; tone: string }[] = [];
                    entities?.regulators?.forEach(r => chips.push({ label: r, tone: "bg-[hsl(var(--cobalt)/0.08)] text-[hsl(var(--cobalt))] border-[hsl(var(--cobalt)/0.25)]" }));
                    entities?.laws?.forEach(l => chips.push({ label: l, tone: "bg-muted text-foreground border-border" }));
                    entities?.cases?.forEach(c => chips.push({ label: c, tone: "bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] border-[hsl(var(--accent)/0.3)]" }));
                    if (chips.length === 0) return null;
                    return (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {chips.map((c, i) => (
                          <span key={i} className={`text-meta px-2 py-0.5 rounded-full border ${c.tone}`}>{c.label}</span>
                        ))}
                      </div>
                    );
                  })()}

                  {(() => {
                    const scope: { label: string; value: string }[] = [];
                    if (ai?.who_should_care) scope.push({ label: "Who should care", value: ai.who_should_care });
                    const aj = ai?.affected_jurisdictions;
                    if (aj) scope.push({ label: "Jurisdictions", value: Array.isArray(aj) ? aj.join(", ") : String(aj) });
                    if (ai?.key_date) scope.push({ label: "Key date", value: ai.key_date });
                    if (scope.length === 0) return null;
                    return (
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-meta text-muted-foreground border-t border-border pt-2">
                        {scope.map((s, i) => (
                          <span key={i}>
                            <span className="font-semibold text-foreground">{s.label}:</span> {s.value}
                          </span>
                        ))}
                      </div>
                    );
                  })()}

                  {article.affected_sectors && article.affected_sectors.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <span className="text-meta uppercase tracking-wide text-muted-foreground font-semibold mr-1 self-center">Sectors:</span>
                      {article.affected_sectors.map((s, i) => (
                        <span key={i} className="text-meta px-2 py-0.5 rounded-full bg-muted text-foreground border border-border">{s}</span>
                      ))}
                    </div>
                  )}
                </section>

                <InFeedAd />

                {/* ========================================================
                    Free registered: single locked row covering 2-4
                    ======================================================== */}
                {!isPremium && (
                  <div className="rounded-xl border border-border bg-muted/30 p-5 flex items-start gap-3 mb-8">
                    <Lock className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1">
                      {(article as any).contextual_teaser && (
                        <p className="text-sm italic text-foreground/90 mb-2 leading-relaxed">
                          {(article as any).contextual_teaser}
                        </p>
                      )}
                      <p className="text-sm font-semibold text-foreground mb-1">
                        Next Steps, Watch, and the full Contextual Record are available on the Annual Platform plan.
                      </p>
                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                        Action items by role and timeframe, related signals across the corpus, and contextual analysis.
                      </p>
                      <Link
                        to="/subscribe"
                        className="inline-block text-sm font-semibold text-white px-4 py-2 rounded-lg no-underline transition-colors"
                        style={{ background: 'hsl(var(--accent))' }}
                      >
                        Upgrade →
                      </Link>
                    </div>
                  </div>
                )}

                {/* ========================================================
                    SECTION 2 — NEXT STEPS (paid only)
                    ======================================================== */}
                {isPremium && article.action_items && article.action_items.length > 0 && (() => {
                  const items = article.action_items;
                  // Legacy: string array — show ungrouped
                  const isLegacyStrings = items.every(i => typeof i === "string");
                  if (isLegacyStrings) {
                    return (
                      <section aria-label="Next Steps" className="mt-8 pt-8 border-t border-silver mb-8">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-eyebrow" style={{ color: 'hsl(var(--accent))' }}>Action Intelligence</span>
                        </div>
                        <h2 className="font-display text-foreground mb-3">Next Steps</h2>
                        <ul className="list-disc pl-5 space-y-1.5">
                          {(items as string[]).map((s, i) => (
                            <li key={i} className="text-base text-foreground leading-relaxed">{s}</li>
                          ))}
                        </ul>
                      </section>
                    );
                  }

                  const objs = items.filter((i): i is ActionItem => typeof i === "object" && i !== null);
                  const groups: Record<"now" | "this_quarter" | "ongoing", ActionItem[]> = { now: [], this_quarter: [], ongoing: [] };
                  objs.forEach(a => {
                    const th = a.time_horizon;
                    if (th && groups[th]) { groups[th].push(a); return; }
                    // Fallback: derive from legacy timeframe
                    const tf = String(a.timeframe ?? "").toLowerCase();
                    if (tf.includes("immediate") || tf.includes("7 day") || tf.includes("now")) groups.now.push(a);
                    else if (tf.includes("quarter") || tf.includes("month")) groups.this_quarter.push(a);
                    else groups.ongoing.push(a);
                  });
                  const bands: { key: keyof typeof groups; label: string; border: string; color: string }[] = [
                    { key: "now", label: "Now", border: "border-orange-400", color: "text-orange-600" },
                    { key: "this_quarter", label: "This Quarter", border: "border-[hsl(var(--cobalt))]", color: "text-[hsl(var(--cobalt))]" },
                    { key: "ongoing", label: "Ongoing", border: "border-slate-300", color: "text-slate-600" },
                  ];
                  const activeBands = bands.filter(b => groups[b.key].length > 0);
                  if (activeBands.length === 0) return null;
                  return (
                    <section aria-label="Next Steps" className="mt-8 pt-8 border-t border-silver mb-8">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-eyebrow" style={{ color: 'hsl(var(--accent))' }}>Action Intelligence</span>
                      </div>
                      <h2 className="font-display text-foreground mb-4">Next Steps</h2>
                      <div className="space-y-4">
                        {activeBands.map(b => (
                          <div key={b.key} className={`border-l-4 ${b.border} pl-4`}>
                            <div className={`text-eyebrow uppercase tracking-wide font-semibold mb-2 ${b.color}`}>{b.label}</div>
                            <ul className="space-y-1.5">
                              {groups[b.key].map((a, i) => (
                                <li key={i} className="text-base text-foreground leading-relaxed">
                                  {a.role && <span className="inline-block text-meta font-semibold text-muted-foreground mr-2 px-1.5 py-0.5 rounded bg-muted">{a.role}</span>}
                                  {a.action}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })()}

                {/* ========================================================
                    SECTION 3 — WATCH (paid only) — related_signals
                    ======================================================== */}
                {isPremium && article.related_signals && article.related_signals.length > 0 && (
                  <section aria-label="Watch" className="mt-8 pt-8 border-t border-silver mb-8">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-eyebrow" style={{ color: 'hsl(var(--cobalt))' }}>Related Signals</span>
                    </div>
                    <h2 className="font-display text-foreground mb-3">Watch</h2>
                    <ul className="space-y-2">
                      {(article.related_signals as RelatedSignal[]).map((sig, i) => (
                        <li key={i} className="bg-muted/30 rounded-lg border border-border p-3">
                          <div className="text-base font-semibold text-foreground">{sig.signal || sig.label}</div>
                          {sig.jurisdiction && (
                            <span className="inline-block text-meta px-1.5 py-0.5 rounded bg-muted text-muted-foreground mt-1 mr-2">{sig.jurisdiction}</span>
                          )}
                          {sig.significance && (
                            <p className="text-sm text-muted-foreground mt-1 m-0">{sig.significance}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* ========================================================
                    SECTION 4 — CONTEXTUAL RECORD (paid only)
                    ======================================================== */}
                {isPremium && (() => {
                  const cr = article.contextual_record;
                  const hasAny = cr && (cr.regulatory_theory || cr.precedent_novelty || cr.enforcement_pattern || (cr.key_cases && cr.key_cases.length > 0));
                  // Legacy fallbacks
                  const legacyTheory = !cr?.regulatory_theory ? article.regulatory_theory : null;
                  const legacyDev = !cr?.precedent_novelty ? article.related_development : null;
                  return (
                    <section aria-label="Contextual Record" className="mt-8 pt-8 border-t border-silver mb-8">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-eyebrow text-brand-navy">Enforcement Corpus Intelligence</span>
                      </div>
                      <h2 className="font-display text-foreground mb-2">Contextual Record</h2>
                      <p className="italic text-sm text-muted-foreground mb-4">
                        Drawn from 3,700+ enforcement decisions. Patterns and precedents from the EUP corpus.
                      </p>
                      <div className="bg-brand-navy/[0.02] rounded-xl p-6 border border-border space-y-4">
                        {(cr?.regulatory_theory || legacyTheory) && (
                          <div>
                            <div className="text-eyebrow uppercase tracking-wide font-semibold text-muted-foreground mb-1">Regulatory Theory</div>
                            <p className="text-base leading-relaxed text-foreground m-0">{cr?.regulatory_theory || legacyTheory}</p>
                          </div>
                        )}
                        {(cr?.precedent_novelty || legacyDev) && (
                          <div>
                            <div className="text-eyebrow uppercase tracking-wide font-semibold text-muted-foreground mb-1">Precedent &amp; Novelty</div>
                            <p className="text-base leading-relaxed text-foreground m-0">{cr?.precedent_novelty || legacyDev}</p>
                          </div>
                        )}
                        {cr?.enforcement_pattern && (
                          <div>
                            <div className="text-eyebrow uppercase tracking-wide font-semibold text-muted-foreground mb-1">Enforcement Pattern</div>
                            <p className="text-base leading-relaxed text-foreground m-0">{cr.enforcement_pattern}</p>
                          </div>
                        )}
                        {cr?.key_cases && cr.key_cases.length > 0 && (
                          <div>
                            <div className="text-eyebrow uppercase tracking-wide font-semibold text-muted-foreground mb-2">Related Cases</div>
                            <div className="flex flex-wrap gap-1.5">
                              {cr.key_cases.map((c, i) => (
                                <span key={i} className="text-meta px-2 py-0.5 rounded-full bg-muted text-foreground border border-border">{c}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {!hasAny && !legacyTheory && !legacyDev && (
                          <p className="text-sm text-muted-foreground italic text-center py-6 m-0">
                            Contextual intelligence not yet generated for this article.
                          </p>
                        )}
                      </div>
                    </section>
                  );
                })()}
              </>
            )}


            {/* Topic tags */}
            {article.topic_tags && article.topic_tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                {article.topic_tags.map((t) => (
                  <span
                    key={t}
                    className="font-mono-code text-meta bg-muted text-muted-foreground px-2.5 py-1 rounded-full"
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
              className="inline-flex items-center gap-2 text-primary font-semibold text-sm no-underline hover:underline border border-border rounded-xl px-5 py-2.5 transition-colors hover:bg-muted"
            >
              Read original source <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* Related Updates */}
            {related.length > 0 && (
              <div className="mt-10">
                <h2 className="text-foreground text-[15px] mb-3">Related Updates</h2>
                <div className="space-y-3">
                  {related.map((r) => (
                    <a
                      key={r.id}
                      href={r.source_url || `/updates/${r.id}`}
                      {...(r.source_url ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="block no-underline hover:bg-muted rounded-lg p-3 -mx-3 transition-colors"
                    >
                      <p className="text-sm text-foreground font-medium leading-snug">{r.title}</p>
                      <p className="text-meta text-muted-foreground mt-0.5">
                        {r.source_name && <span>{r.source_name} · </span>}
                        {formatDate(r.published_at)}
                      </p>
                    </a>
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
