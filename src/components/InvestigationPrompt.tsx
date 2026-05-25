import { useState } from 'react';
import { Copy, Check, FlaskConical } from 'lucide-react';
import { ArticleItem } from '@/components/ArticleCard';
import { generateInvestigationPrompt } from '@/lib/generateInvestigationPrompt';

interface InvestigationPromptProps {
  item: ArticleItem;
}

export function InvestigationPrompt({ item }: InvestigationPromptProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const prompt = generateInvestigationPrompt(item);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = prompt;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
          <FlaskConical className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <span className="text-body font-semibold text-gray-900">
            Investigate further
          </span>
          <span className="text-xs text-gray-500 truncate hidden sm:inline">
            — AI prompt pre-built from this article
          </span>
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
          {/* Header row with copy button */}
          <div className="flex items-start justify-between gap-2 mt-2">
            <p className="text-xs text-gray-600 leading-relaxed">
              Copy this prompt into Claude, ChatGPT, or any AI assistant.
              Fill in the organization context section before sending.
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
            {prompt}
          </pre>

          {/* Footer note */}
          <p className="mt-2 text-[11px] text-gray-500">
            Generated from article intelligence data · no additional AI call
          </p>
        </div>
      )}
    </div>
  );
}
