import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Globe2, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Tracks whether this is at least the second visit to a route. */
function useIsSecondVisit(key: string): boolean {
  const [isSecond, setIsSecond] = useState(false);
  useEffect(() => {
    try {
      const k = `visit_count:${key}`;
      const n = parseInt(localStorage.getItem(k) || "0", 10) + 1;
      localStorage.setItem(k, String(n));
      setIsSecond(n >= 2);
    } catch {
      setIsSecond(false);
    }
  }, [key]);
  return isSecond;
}

function useDismissed(key: string): [boolean, () => void] {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(key) === "1");
    } catch {
      /* ignore */
    }
  }, [key]);
  return [
    dismissed,
    () => {
      try {
        localStorage.setItem(key, "1");
      } catch {
        /* ignore */
      }
      setDismissed(true);
    },
  ];
}

interface CrossToolPromptProps {
  /** Unique route key to count visits, e.g. "/ropa/documents". */
  visitKey: string;
  /** localStorage key for dismissal. */
  dismissKey: string;
  icon?: React.ReactNode;
  title: string;
  body: string;
  ctaLabel: string;
  ctaTo: string;
  /** When false, the prompt never renders (e.g. data already exists). */
  enabled: boolean;
}

export function CrossToolPrompt({
  visitKey,
  dismissKey,
  icon,
  title,
  body,
  ctaLabel,
  ctaTo,
  enabled,
}: CrossToolPromptProps) {
  const isSecondVisit = useIsSecondVisit(visitKey);
  const [dismissed, dismiss] = useDismissed(dismissKey);
  if (!enabled || !isSecondVisit || dismissed) return null;
  return (
    <div className="mb-4 bg-card border border-brand-cloud rounded-xl p-4 flex items-start gap-3 shadow-eup-sm">
      <div className="text-brand-teal-text mt-0.5">{icon ?? <Globe2 className="w-5 h-5" />}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-brand-navy">{title}</p>
        <p className="text-xs text-slate mt-0.5">{body}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to={ctaTo}>{ctaLabel}</Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Not now
          </Button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-slate hover:text-brand-navy bg-transparent border-none"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export interface RelatedToolChip {
  label: string;
  to: string;
  icon?: React.ReactNode;
}

export function RelatedToolsChips({ tools }: { tools: RelatedToolChip[] }) {
  if (!tools.length) return null;
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-slate">Related:</span>
      {tools.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-brand-cloud bg-card text-brand-navy hover:bg-brand-cloud/40 no-underline"
        >
          {t.icon ?? <FileText className="w-3.5 h-3.5" />}
          {t.label}
        </Link>
      ))}
    </div>
  );
}
