// Shared restore-banner UI for autosaved intake drafts.
// Mirrors the banner in src/pages/CPPARiskAssessment.tsx exactly so every
// tool that wires useToolDraft presents the same Resume / Discard affordance.

import { Button } from "@/components/ui/button";

function formatRelativeTime(d: Date): string {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

interface DraftRestoreBannerProps {
  draftFound: boolean;
  touched: boolean;
  draftUpdatedAt: Date | null;
  onResume: () => void;
  onDiscard: () => void;
}

export default function DraftRestoreBanner({
  draftFound, touched, draftUpdatedAt, onResume, onDiscard,
}: DraftRestoreBannerProps) {
  if (!draftFound || touched) return null;
  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-md border border-brand-teal/40 bg-[hsl(var(--cobalt)/0.06)] dark:bg-[hsl(var(--cobalt)/0.15)] text-sm">
      <div className="text-foreground">
        You have a saved draft{draftUpdatedAt ? ` from ${formatRelativeTime(draftUpdatedAt)}` : ""}.
      </div>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" variant="outline" onClick={onResume}>Resume draft</Button>
        <Button size="sm" variant="ghost" onClick={onDiscard}>Discard</Button>
      </div>
    </div>
  );
}
