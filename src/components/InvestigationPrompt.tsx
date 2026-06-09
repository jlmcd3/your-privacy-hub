import { useState } from 'react';
import { Copy, Check, FlaskConical, Loader2 } from 'lucide-react';
import { ArticleItem } from '@/components/ArticleCard';
import { generatePersonalizedInvestigationPrompt } from '@/lib/generateInvestigationPrompt';
import { useSubscriberContext } from '@/hooks/useSubscriberContext';

interface InvestigationPromptProps {
  item: ArticleItem;
}

export function InvestigationPrompt({ item }: InvestigationPromptProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch subscriber context (role, industries, jurisdictions, topics, watchlist).
  // `context` is null while loading or for non-premium users.
  const { context, loading } = useSubscriberContext();

  // When context is null the generator falls back to the article-only prompt
  // with the static placeholder. Once context resolves the component
  // re-renders with the personalised version.
  const prompt = generatePersonalizedInvestigationPrompt(item, context ?? undefined);

  const personalised = !!(
    context &&
    (context.role ||
      (context.industries?.length ?? 0) > 0 ||
      (context.jurisdictions?.length ?? 0) > 0 ||
      (context.topics?.length ?? 0) > 0 ||
      (context.watchlist?.length ?? 0) > 0)
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const el = document.createElement('textarea');
      el.value = prompt;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-3 border border-silver rounded-lg bg-white">
      {/* Toggle row */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-brand-cloud/60 rounded-t-lg transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 min-w-0">
          <FlaskConical className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
          <span className="text-[13px] font-semibold text-gray-900">
            Investigate further
          </span>

          {loading ? (
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-gray-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              personalising…
            </span>
          ) : (
            <span className="text-[11px] text-gray-500 truncate hidden sm:inline">
              {personalised
                ? '— AI prompt tailored to your profile'
                : '— AI prompt pre-built from this article'}
            </span>
          )}
        </span>
        <span
          className="text-gray-500 text-sm transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ▾
        </span>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-silver">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mt-2">
            <p className="text-xs text-gray-600 leading-relaxed">
              Copy this prompt into Claude, ChatGPT, or any AI assistant.
              {!loading && !personalised && (
                <span className="block mt-0.5 text-indigo-600">
                  Set your{' '}
                  <a href="/brief-preferences" className="underline hover:no-underline">
                    preferences
                  </a>{' '}
                  and{' '}
                  <a href="/watchlist" className="underline hover:no-underline">
                    watchlist
                  </a>{' '}
                  to personalise this prompt automatically.
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCopy();
              }}
              className="flex-shrink-0 ml-3 flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors"
              style={{
                background: copied ? '#ECFDF5' : '#EEF2FF',
                color: copied ? '#065F46' : '#4338CA',
              }}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy prompt
                </>
              )}
            </button>
          </div>

          {/* Prompt display */}
          <pre
            onClick={(e) => e.stopPropagation()}
            className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-gray-50 border border-silver p-3 text-xs text-gray-800 font-mono leading-relaxed"
          >
            {loading ? 'Assembling your personalised prompt…' : prompt}
          </pre>

          {/* Footer note */}
          <p className="mt-2 text-[11px] text-gray-500">
            {loading
              ? 'Loading your profile…'
              : personalised
                ? 'Personalised from your profile and watchlist · no AI call'
                : 'Generated from article intelligence · no AI call'}
          </p>
        </div>
      )}
    </div>
  );
}
