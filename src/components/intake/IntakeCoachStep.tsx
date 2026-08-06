// ITEM 381 — INTAKE COMPLETENESS COACH, LAYER 1: the review step.
//
// Advisory only. It never blocks, never writes into a field, and never calls a
// model or an API — every line it shows is derived in the browser from the
// customer's own answers by src/lib/intakeCoach/buildCoach.ts.

import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { buildCoach, COACH_COPY } from "@/lib/intakeCoach/buildCoach";
import type { CoachContract } from "@/lib/intakeCoach/askedKeys";
import type { CoachProduct } from "@/lib/intakeCoach/thinSpots";

interface Props {
  open: boolean;
  product: CoachProduct;
  contract: CoachContract;
  intake: unknown;
  /** Advisory footer action — continues to checkout unchanged. */
  onContinue: () => void;
  onClose: () => void;
}

function jumpTo(selector: string, onClose: () => void) {
  onClose();
  window.setTimeout(() => {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable = el.querySelector("input, textarea, select") as HTMLElement | null;
    focusable?.focus({ preventScroll: true });
  }, 60);
}

const IntakeCoachStep = ({ open, product, contract, intake, onContinue, onClose }: Props) => {
  const result = useMemo(
    () => (open ? buildCoach(product, contract, intake) : null),
    [open, product, contract, intake],
  );
  if (!result) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{COACH_COPY.heading}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{COACH_COPY.intro}</p>

        {/* 3-stat strip */}
        <div className="grid grid-cols-3 gap-3" data-testid="coach-stats">
          <div className="rounded-md border bg-muted/40 px-3 py-2">
            <div className="text-lg font-semibold text-[hsl(var(--brand-navy))]">
              {result.stats.answered} / {result.stats.asked}
            </div>
            <div className="text-meta text-muted-foreground">{COACH_COPY.statAnswered}</div>
          </div>
          <div className="rounded-md border bg-muted/40 px-3 py-2">
            <div className="text-lg font-semibold text-[hsl(var(--brand-navy))]">{result.stats.toStrengthen}</div>
            <div className="text-meta text-muted-foreground">{COACH_COPY.statStrengthen}</div>
          </div>
          <div className="rounded-md border bg-muted/40 px-3 py-2">
            <div className="text-lg font-semibold text-[hsl(var(--brand-navy))]">{result.stats.alreadyStrong}</div>
            <div className="text-meta text-muted-foreground">{COACH_COPY.statStrong}</div>
          </div>
        </div>

        {/* Strengthen cards */}
        {result.cards.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[hsl(var(--brand-navy))]">{COACH_COPY.cardsHeading}</h3>
            {result.cards.map((card) => (
              <div key={card.key} className="rounded-md border p-3 space-y-2" data-testid="coach-card">
                <div className="text-sm font-semibold">{card.title}</div>
                {card.excerpt ? (
                  <p className="text-meta text-muted-foreground italic">“{card.excerpt}”</p>
                ) : null}
                {card.details?.length ? (
                  <div>
                    <div className="text-meta font-semibold">{COACH_COPY.detailsLabel}</div>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                      {card.details.map((d) => <li key={d}>{d}</li>)}
                    </ul>
                  </div>
                ) : null}

                <div>
                  <div className="text-meta font-semibold">{COACH_COPY.consequenceLabel}</div>
                  <p className="text-sm text-muted-foreground">{card.consequence}</p>
                </div>
                <div>
                  <div className="text-meta font-semibold">{COACH_COPY.adviceLabel}</div>
                  <p className="text-sm text-muted-foreground">{card.advice}</p>
                </div>
                <button
                  type="button"
                  className="text-sm font-medium text-[hsl(var(--brand-teal))] underline underline-offset-2"
                  onClick={() => jumpTo(card.jumpSelector, onClose)}
                >
                  {COACH_COPY.jumpLabel}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{COACH_COPY.noCards}</p>
        )}

        {/* Already strong */}
        {result.alreadyStrong.length > 0 ? (
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[hsl(var(--brand-navy))]">{COACH_COPY.strongHeading}</h3>
            <p className="text-meta text-muted-foreground">{COACH_COPY.strongIntro}</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {result.alreadyStrong.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <p className="text-meta text-muted-foreground">{COACH_COPY.footer}</p>
          <Button onClick={onContinue}>{COACH_COPY.continueLabel}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IntakeCoachStep;
