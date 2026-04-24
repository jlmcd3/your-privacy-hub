import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Lock, X } from "lucide-react";
import { useState } from "react";

interface ArticleDrawerProps {
  article: {
    id: string;
    title: string;
    source: string;
    published_at: string;
    url?: string;
    summary?: string | null;
    urgency?: string;
    legal_weight?: string;
    ai_summary?: {
      why_it_matters?: string;
      urgency?: string;
      legal_weight?: string;
      skipped?: boolean;
    };
    attention_level?: string;
    regulatory_theory?: string;
    related_development?: string;
    affected_sectors?: string[];
    topic_tags?: string[];
  } | null;
  isOpen: boolean;
  onClose: () => void;
  userTier: "free" | "pro";
}

type Tab = "feed" | "briefed" | "analyzed";

const urgencyClasses = (level?: string) => {
  if (!level) return "";
  const v = level.toLowerCase();
  if (v === "high") return "bg-red-100 text-red-800";
  if (v === "medium") return "bg-amber-100 text-amber-800";
  if (v === "low" || v === "monitor") return "bg-green-100 text-green-800";
  return "bg-gray-100 text-gray-700";
};

export default function ArticleDrawer({ article, isOpen, onClose, userTier }: ArticleDrawerProps) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const defaultTab: Tab = article?.ai_summary?.why_it_matters ? "briefed" : "feed";
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(article?.ai_summary?.why_it_matters ? "briefed" : "feed");
      setTimeout(() => closeBtnRef.current?.focus(), 50);
    }
  }, [isOpen, article?.id]);

  const urgency = article?.urgency || article?.ai_summary?.urgency;
  const legalWeight = article?.legal_weight || article?.ai_summary?.legal_weight;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-hidden={!isOpen}
      className={`absolute top-0 right-0 h-full w-[360px] bg-white border-l border-gray-200 shadow-xl transform transition-transform duration-200 ease-out z-40 flex flex-col ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {!article ? null : (
        <>
          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-gray-200 relative">
            <button
              ref={closeBtnRef}
              onClick={onClose}
              aria-label="Close article drawer"
              className="absolute top-2 right-2 w-7 h-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 bg-transparent border-none cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 flex-wrap mb-2 pr-8">
              {urgency && (
                <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${urgencyClasses(urgency)}`}>
                  {urgency}
                </span>
              )}
              {article.source && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                  {article.source}
                </span>
              )}
              <span className="text-[10px] text-gray-400 ml-auto">
                {new Date(article.published_at).toLocaleDateString()}
              </span>
            </div>
            <h2 className="text-[14px] font-medium text-gray-900 leading-snug line-clamp-3">
              {article.title}
            </h2>
          </div>

          {/* Tabs */}
          <div className="flex items-stretch border-b border-gray-200 px-2">
            {([
              { key: "feed", label: "Feed" },
              { key: "briefed", label: "Briefed" },
              { key: "analyzed", label: "Analyzed" },
            ] as { key: Tab; label: string }[]).map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-3 py-2.5 text-[12px] bg-transparent cursor-pointer flex items-center gap-1 ${
                  activeTab === t.key
                    ? "border-b-2 border-blue-600 text-gray-900 font-medium"
                    : "text-gray-500 border-b-2 border-transparent"
                }`}
              >
                {t.label}
                {t.key === "analyzed" && (
                  <span className="text-[9px] bg-purple-700 text-purple-100 px-1 rounded font-semibold">PRO</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4 text-[13px] text-gray-800">
            {activeTab === "feed" && (
              <div className="space-y-3">
                {article.summary ? (
                  <p className="leading-relaxed whitespace-pre-line">{article.summary}</p>
                ) : (
                  <p className="italic text-gray-500">Visit the original source to read the full article.</p>
                )}
                {article.url && (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-blue-600 hover:underline text-[13px] font-medium no-underline"
                  >
                    Read original source ›
                  </a>
                )}
              </div>
            )}

            {activeTab === "briefed" && (
              <div className="space-y-4">
                {article.ai_summary?.why_it_matters && (
                  <div className="border-l-4 border-blue-600 bg-blue-50 px-4 py-3">
                    <div className="text-[10px] uppercase tracking-wide font-semibold text-blue-800 mb-1">
                      Why it matters
                    </div>
                    <p className="text-[13px] leading-relaxed text-gray-800">
                      {article.ai_summary.why_it_matters}
                    </p>
                  </div>
                )}
                {(urgency || legalWeight) && (
                  <div className="grid grid-cols-2 gap-2">
                    {urgency && (
                      <div className={`px-3 py-2 rounded ${urgencyClasses(urgency)}`}>
                        <div className="text-[10px] uppercase tracking-wide font-semibold opacity-80">Urgency</div>
                        <div className="text-[13px] font-medium capitalize">{urgency}</div>
                      </div>
                    )}
                    {legalWeight && (
                      <div className="px-3 py-2 rounded bg-gray-100 text-gray-800">
                        <div className="text-[10px] uppercase tracking-wide font-semibold opacity-70">Legal weight</div>
                        <div className="text-[13px] font-medium capitalize">{legalWeight}</div>
                      </div>
                    )}
                  </div>
                )}
                {article.affected_sectors && article.affected_sectors.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-1.5">
                      Affected sectors
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {article.affected_sectors.map((s) => (
                        <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {!article.ai_summary?.why_it_matters && !urgency && !legalWeight && (!article.affected_sectors || article.affected_sectors.length === 0) && (
                  <p className="italic text-gray-500">No briefed analysis available for this article yet.</p>
                )}
              </div>
            )}

            {activeTab === "analyzed" && (
              <div className="relative">
                <div className={userTier === "free" ? "opacity-10 pointer-events-none select-none space-y-3" : "space-y-3"}>
                  {article.regulatory_theory && (
                    <div className="border border-gray-200 rounded p-3">
                      <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-1">Regulatory theory</div>
                      <p className="text-[13px] leading-relaxed text-gray-800">{article.regulatory_theory}</p>
                    </div>
                  )}
                  {article.related_development && (
                    <div className="border border-gray-200 rounded p-3">
                      <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-1">Related development</div>
                      <p className="text-[13px] leading-relaxed text-gray-800">{article.related_development}</p>
                    </div>
                  )}
                  {article.attention_level && (
                    <div className="border border-gray-200 rounded p-3">
                      <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-1">Attention level</div>
                      <span className={`inline-block text-[11px] px-2 py-0.5 rounded ${urgencyClasses(article.attention_level)}`}>
                        {article.attention_level}
                      </span>
                    </div>
                  )}
                  {article.topic_tags && article.topic_tags.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-1.5">Topic tags</div>
                      <div className="flex flex-wrap gap-1.5">
                        {article.topic_tags.map((t) => (
                          <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {!article.regulatory_theory && !article.related_development && !article.attention_level && (!article.topic_tags || article.topic_tags.length === 0) && (
                    <p className="italic text-gray-500">No deep analysis available for this article yet.</p>
                  )}
                </div>

                {userTier === "free" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                    <div className="bg-white border border-gray-200 rounded-xl shadow-md p-5 max-w-[280px]">
                      <Lock size={20} className="mx-auto mb-2 text-purple-700" />
                      <h3 className="text-[14px] font-semibold text-gray-900 mb-1">
                        Full analysis — Pro feature
                      </h3>
                      <p className="text-[12px] text-gray-600 mb-3 leading-relaxed">
                        Regulatory theory, cross-jurisdiction signals, and action intelligence on every update.
                      </p>
                      <Link
                        to="/subscribe"
                        className="inline-block text-[12px] font-semibold bg-purple-700 text-white px-3 py-1.5 rounded no-underline hover:bg-purple-800 transition-colors"
                      >
                        See Pro plan
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
