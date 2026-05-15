import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Copy, Check, FlaskConical } from "lucide-react";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useSubscriberContext } from "@/hooks/useSubscriberContext";
import { generateResearchInvestigationPrompt } from "@/lib/generateResearchInvestigationPrompt";

interface ResearchSynthesisBlockProps {
  sectionKey: string;
}

export function ResearchSynthesisBlock({ sectionKey }: ResearchSynthesisBlockProps) {
  const [data, setData] = useState<{
    synthesis_text: string;
    generated_at: string;
    article_count: number;
    section_heading: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const { isPremium } = usePremiumStatus();
  const {
    context: subscriberContext,
    loading: contextLoading,
    error: contextError,
  } = useSubscriberContext();
  const [promptError, setPromptError] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase
      .from("research_syntheses")
      .select("synthesis_text, generated_at, article_count, section_heading")
      .eq("section_key", sectionKey)
      .single()
      .then(({ data: row }) => {
        if (row?.synthesis_text) setData(row as any);
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

  return (
    <div
      className="mt-6 mb-2 rounded-r-lg"
      style={{
        borderLeft: "3px solid hsl(var(--cobalt))",
        background: "hsl(210 52% 97%)",
        padding: "1rem 1.25rem",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(var(--cobalt))" }} />
        <span className="text-eyebrow" style={{ color: "hsl(var(--cobalt))" }}>
          Recent Developments — Last 30 Days
        </span>
      </div>

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

      {/* Investigation prompt — paid subscribers only */}
      {isPremium && (
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
                  <p className="font-semibold text-gray-700 mb-1">Couldn’t build the prompt</p>
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
                    Couldn’t load your profile — showing a generic version. You can still copy and personalize manually.
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
      )}
    </div>
  );
}
