import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Copy, Check, FlaskConical, Lock, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useSubscriberContext } from "@/hooks/useSubscriberContext";
import { generateResearchInvestigationPrompt } from "@/lib/generateResearchInvestigationPrompt";

interface Headline {
  title: string;
  source_article_id: string | null;
  why_it_matters: string;
}

interface ResearchSynthesisBlockProps {
  sectionKey: string;
  promoteHeading?: boolean;
  /** Render a tight one-line "What changed" pullquote instead of the full tiered card. */
  compact?: boolean;
  /** Called once the synthesis row is loaded, exposing freshness metadata. */
  onLoaded?: (info: { generated_at: string; article_count: number }) => void;
}

export function ResearchSynthesisBlock({ sectionKey, promoteHeading, compact, onLoaded }: ResearchSynthesisBlockProps) {
  const [data, setData] = useState<{
    synthesis_text: string;
    generated_at: string;
    article_count: number;
    section_heading: string;
    headlines: Headline[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { isPremium } = useSubscriptionTier();
  const {
    context: subscriberContext,
    loading: contextLoading,
    error: contextError,
  } = useSubscriberContext();
  const [promptError, setPromptError] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    supabase
      .from("research_syntheses")
      .select("synthesis_text, generated_at, article_count, section_heading, headlines")
      .eq("section_key", sectionKey)
      .single()
      .then(({ data: row }) => {
        if (row) {
          setData({
            synthesis_text: row.synthesis_text ?? "",
            generated_at: row.generated_at ?? "",
            article_count: row.article_count ?? 0,
            section_heading: row.section_heading ?? "",
            headlines: Array.isArray(row.headlines) ? (row.headlines as unknown as Headline[]) : [],
          });
          onLoaded?.({
            generated_at: row.generated_at ?? "",
            article_count: row.article_count ?? 0,
          });
        }
        setLoading(false);
      });
  }, [sectionKey]);

  if (loading || !data) return null;

  const updatedDate = data.generated_at
    ? new Date(data.generated_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const personalized = !!(subscriberContext?.role || subscriberContext?.industries?.length);
  const isAnon = !user;
  const isFreeRegistered = !!user && !isPremium;
  const hasHeadlines = data.headlines && data.headlines.length > 0;

  const containerStyle = {
    borderLeft: "3px solid hsl(var(--cobalt))",
    background: "hsl(210 52% 97%)",
    padding: "1rem 1.25rem",
  } as const;

  if (compact) {
    if (!hasHeadlines) return null;
    const topHeadline = data.headlines[0];
    return (
      <div
        className="mt-6 mb-2 rounded-r"
        style={{ borderLeft: "3px solid hsl(var(--cobalt))", background: "hsl(210 52% 97%)", padding: "0.625rem 1rem" }}
      >
        <p className="text-meta" style={{ lineHeight: 1.5 }}>
          <span className="text-eyebrow mr-2" style={{ color: "hsl(var(--cobalt))" }}>
            {`Intelligence context${updatedDate ? ` · updated ${updatedDate}` : ""}`}
          </span>
          <span className="text-brand-navy font-semibold">{topHeadline.title}</span>
          {!isAnon && topHeadline.why_it_matters && (
            <span className="text-slate"> — {topHeadline.why_it_matters}</span>
          )}
        </p>
      </div>
    );
  }

  return (
    <>
      {(() => {
        const collapsed = promoteHeading && !expanded;
        return (
      <div
        id={promoteHeading ? "page-recent-developments-panel" : undefined}
        className={`mt-6 mb-2 rounded-r-lg relative ${collapsed ? "overflow-hidden" : ""}`}
        style={collapsed ? { ...containerStyle, maxHeight: "9.5rem" } : containerStyle}
      >
        {promoteHeading && (
          <h2 className="font-display text-brand-navy leading-tight mb-3" style={{ fontSize: "clamp(1.25rem, 2.4vw, 1.6rem)", fontWeight: 400 }}>
            Last 30 Days
          </h2>
        )}
        {!promoteHeading && (
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(var(--cobalt))" }} />
            <span className="text-eyebrow" style={{ color: "hsl(var(--cobalt))" }}>
              Last 30 Days
            </span>
          </div>
        )}

      {/* ANONYMOUS: headlines list only (no links, no why-it-matters), CTA to sign up */}
      {isAnon && (
        <>
          {hasHeadlines ? (
            <ul className="space-y-2 text-body text-gray-700" style={{ lineHeight: "1.5" }}>
              {data.headlines.map((h, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-gray-400 flex-shrink-0">•</span>
                  <span>{h.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-gray-600 italic">
              Sign in to see what's moving in this area over the last 30 days.
            </p>
          )}
          <p className="text-meta mt-3">
            <Link to="/signup" className="font-semibold hover:underline" style={{ color: "hsl(var(--cobalt))" }}>
              Create a free account →
            </Link>{" "}
            <span className="text-gray-500">to see why each of these matters for compliance.</span>
          </p>
        </>
      )}

      {/* FREE REGISTERED: headlines + one-line why_it_matters, no links, upsell CTA */}
      {isFreeRegistered && (
        <>
          {hasHeadlines ? (
            <ul className="space-y-3 text-body text-gray-700" style={{ lineHeight: "1.55" }}>
              {data.headlines.map((h, i) => (
                <li key={i}>
                  <p className="font-semibold text-gray-800">{h.title}</p>
                  {h.why_it_matters && (
                    <p className="text-meta text-gray-600 mt-0.5">{h.why_it_matters}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-body text-gray-700 space-y-3" style={{ lineHeight: "1.65" }}>
              {data.synthesis_text
                .split("\n\n")
                .slice(0, 1)
                .map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-gray-200 flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-500" />
            <p className="text-meta text-gray-600">
              <Link to="/subscribe" className="font-semibold hover:underline" style={{ color: "hsl(var(--cobalt))" }}>
                Subscribe
              </Link>{" "}
              to unlock the full analysis, source links, and a personalized "Investigate further" prompt for this topic.
            </p>
          </div>
        </>
      )}

      {/* PAID: full synthesis prose + Investigate further */}
      {isPremium && (
        <>
          <div className="text-body text-gray-700 space-y-3" style={{ lineHeight: "1.65" }}>
            {data.synthesis_text.split("\n\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          {updatedDate && (
            <p className="text-meta text-gray-400 mt-3">
              Updated {updatedDate}
              {data.article_count > 0 && ` · based on ${data.article_count} monitored sources`}
            </p>
          )}

          <div className="mt-4 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setPromptOpen(!promptOpen)}
              className="flex items-center gap-1.5 text-xs font-semibold hover:underline transition-colors"
              style={{ color: "hsl(var(--cobalt))" }}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              Investigate further
              {personalized && " — personalized for your profile"}
              <span className={`transition-transform ${promptOpen ? "rotate-180" : ""}`}>▾</span>
            </button>

            {promptOpen && contextLoading && (
              <div className="mt-3 flex items-center gap-2 text-meta text-gray-500">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Loading your profile to personalize this prompt…
              </div>
            )}

            {promptOpen && !contextLoading && (() => {
              const headingFromKey = (key: string) => {
                const tail = key.includes("__") ? key.split("__").slice(1).join("__") : key;
                const ACRONYMS = new Set([
                  "ai", "eu", "uk", "us", "gdpr", "ccpa", "cppa", "hipaa", "ftc",
                  "dpa", "dpf", "tia", "bipa", "hbr", "apac", "latam", "mea",
                ]);
                return tail
                  .split(/[_\s-]+/)
                  .filter(Boolean)
                  .map((w) =>
                    ACRONYMS.has(w.toLowerCase())
                      ? w.toUpperCase()
                      : w.charAt(0).toUpperCase() + w.slice(1)
                  )
                  .join(" ") || "This topic";
              };
              const sectionHeading =
                data.section_heading?.trim() || headingFromKey(sectionKey);

              let prompt = "";
              try {
                prompt = generateResearchInvestigationPrompt(
                  sectionHeading,
                  data.synthesis_text,
                  subscriberContext ?? {}
                );
                if (promptError) setPromptError(null);
              } catch (e: any) {
                const msg = e?.message ?? "Unable to assemble the investigation prompt.";
                if (promptError !== msg) setPromptError(msg);
                return (
                  <div className="mt-3 p-3 bg-white border border-gray-200 rounded text-meta text-gray-600">
                    <p className="font-semibold text-gray-700 mb-1">Couldn't build the prompt</p>
                    <p>{msg} Try refreshing the page; if it persists, the synthesis text may be missing.</p>
                  </div>
                );
              }

              const handleCopy = async () => {
                try {
                  await navigator.clipboard.writeText(prompt);
                } catch {
                  const el = document.createElement("textarea");
                  el.value = prompt;
                  document.body.appendChild(el);
                  el.select();
                  document.execCommand("copy");
                  document.body.removeChild(el);
                }
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              };
              return (
                <div className="mt-3 space-y-2">
                  {contextError && (
                    <p className="text-meta text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                      Couldn't load your profile — showing a generic version. You can still copy and personalize manually.
                    </p>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-meta text-gray-500 flex-1">
                      {personalized
                        ? "Pre-loaded with your role and jurisdiction profile. Fill in the organization context before sending."
                        : "Copy into Claude, ChatGPT, or any AI assistant. Fill in the organization context section before sending."}
                    </p>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 flex-shrink-0"
                      style={{ color: "hsl(var(--cobalt))" }}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy prompt
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-meta whitespace-pre-wrap font-mono p-3 bg-white border border-gray-200 rounded text-gray-700 max-h-96 overflow-auto">
                    {prompt}
                  </pre>
                  <p className="text-meta text-gray-400">
                    {personalized
                      ? "Personalized from your brief preferences · no additional AI call"
                      : "Assembled from section intelligence · no additional AI call"}
                  </p>
                </div>
              );
            })()}
          </div>
        </>
      )}
      {promoteHeading && collapsed && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
            style={{ background: "linear-gradient(to bottom, transparent, hsl(210 52% 97%))" }}
          />
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-expanded={false}
            aria-controls="page-recent-developments-panel"
            className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold hover:underline"
            style={{ color: "hsl(var(--cobalt))" }}
          >
            Show more
            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </>
      )}
      {promoteHeading && expanded && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          aria-expanded={true}
          aria-controls="page-recent-developments-panel"
          className="mt-3 flex items-center gap-1.5 text-xs font-semibold hover:underline"
          style={{ color: "hsl(var(--cobalt))" }}
        >
          Show less
          <ChevronDown className="w-3.5 h-3.5 rotate-180" aria-hidden="true" />
        </button>
      )}
    </div>
        );
      })()}
    </>
  );
}
