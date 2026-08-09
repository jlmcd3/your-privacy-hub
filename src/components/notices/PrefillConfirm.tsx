import { CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PrefillProposal } from "@/data/notice-prefill";

/**
 * INTAKE-2 — prefill-confirm card.
 *
 * Shown in place of a blank input when an earlier answer already supplies the
 * fact this question asks for. Confirming persists the proposed value under
 * this question's own key; declining reveals the normal input unchanged.
 */
export function PrefillConfirm({
  proposal,
  displayValue,
  onConfirm,
  onDecline,
  confirmLabel = "Yes — use this answer",
  declineLabel = "No — I'll answer this one",
}: {
  proposal: PrefillProposal;
  displayValue: string;
  onConfirm: () => void;
  onDecline: () => void;
  confirmLabel?: string;
  declineLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
      <p className="text-sm text-foreground flex items-start gap-2">
        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-brand-teal" aria-hidden />
        <span>{proposal.lead}</span>
      </p>
      <p className="text-sm">
        <span className="text-muted-foreground">Our suggested answer: </span>
        <span className="font-medium text-foreground">{displayValue}</span>
      </p>
      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
        <span>{proposal.note}</span>
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" size="sm" onClick={onConfirm} className="min-h-[40px]">
          {confirmLabel}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDecline} className="min-h-[40px]">
          {declineLabel}
        </Button>
      </div>
    </div>
  );
}
