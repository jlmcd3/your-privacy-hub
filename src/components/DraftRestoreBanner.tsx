// Shared restore-banner UI for autosaved intake drafts.
// Mirrors the banner in src/pages/CPPARiskAssessment.tsx so every tool that
// wires useToolDraft presents the same Resume / Discard affordance.
//
// LIA F01 / Governance F02 / DPIA F02 (2026-09-15): the choice about a found
// draft stays visible after the customer starts typing. Typing no longer
// overwrites the saved draft (useToolDraft saves the new answers to a
// separate row until the customer chooses), so the banner says what is
// happening and offers the three honest actions: Resume (replaces the
// current answers), Keep separate, Discard the saved draft. The page's own
// save status (saving / saved / failed) can be shown beneath it.

import { Button } from "@/components/ui/button";
import type { DraftChoice } from "@/lib/draftIdentity";

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
  /** Keep the saved draft aside and continue with the current answers as a new draft. */
  onKeepSeparate?: () => void;
  /** From useToolDraft; when "resumed" or "separate" the banner has done its job. */
  draftChoice?: DraftChoice;
  /** Optional save status line (from useToolDraft). */
  saving?: boolean;
  lastSavedAt?: Date | null;
  saveError?: string | null;
}

export default function DraftRestoreBanner({
  draftFound, touched, draftUpdatedAt, onResume, onDiscard, onKeepSeparate, draftChoice, saving, lastSavedAt, saveError,
}: DraftRestoreBannerProps) {
  const status = saveError ? (
    <p role="status" className="text-[11px] text-amber-800 dark:text-amber-300 mt-2" data-testid="draft-save-error">
      Draft not saved: {saveError}
    </p>
  ) : saving ? (
    <p role="status" className="text-[11px] text-muted-foreground mt-2">Saving draft…</p>
  ) : lastSavedAt ? (
    <p role="status" className="text-[11px] text-muted-foreground mt-2">Draft saved {formatRelativeTime(lastSavedAt)}</p>
  ) : null;

  const decided = draftChoice === "resumed" || (draftChoice === "separate" && !touched);
  if (!draftFound || decided) return status;

  const when = draftUpdatedAt ? ` from ${formatRelativeTime(draftUpdatedAt)}` : "";
  if (!touched) {
    return (
      <div>
        <div className="flex items-start justify-between gap-3 p-3 rounded-md border border-brand-teal/40 bg-[hsl(var(--cobalt)/0.06)] dark:bg-[hsl(var(--cobalt)/0.15)] text-sm" data-testid="draft-banner">
          <div className="text-foreground">You have a saved draft{when}.</div>
          <div className="flex gap-2 shrink-0 flex-wrap justify-end">
            <Button size="sm" variant="outline" onClick={onResume}>Resume draft</Button>
            {onKeepSeparate ? <Button size="sm" variant="ghost" onClick={onKeepSeparate}>Start a new draft</Button> : null}
            <Button size="sm" variant="ghost" onClick={onDiscard}>Discard</Button>
          </div>
        </div>
        {status}
      </div>
    );
  }
  // Typed before choosing: the new answers are being kept apart from the saved draft.
  return (
    <div>
      <div className="p-3 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-sm text-amber-900 dark:text-amber-200" data-testid="draft-banner-typed">
        <p>You also have a saved draft{when}. Your current answers are being saved separately; the saved draft has not been changed.</p>
        <div className="flex gap-2 flex-wrap mt-2">
          <Button size="sm" variant="outline" onClick={onResume}>Resume the saved draft (replaces your current answers)</Button>
          {onKeepSeparate ? <Button size="sm" variant="ghost" onClick={onKeepSeparate}>Keep working separately</Button> : null}
          <Button size="sm" variant="ghost" onClick={onDiscard}>Discard the saved draft</Button>
        </div>
      </div>
      {status}
    </div>
  );
}
