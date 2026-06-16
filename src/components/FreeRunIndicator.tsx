import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { isIncludedTool } from "@/config/pricing";
import {
  isAnnualCreditEligible,
  countAvailableAnnualCredits,
} from "@/lib/annualToolCredit";

interface Props {
  /** Tool key (snake_case). */
  toolKey: string;
}

/**
 * Subscription-aware status badge for tool intake pages.
 *
 * v9 three-layer model:
 *   • Layer 1 (Included tools)         → "Included with your subscription"
 *   • Layer 3 (Annual credit eligible) → "N free Smart Tool runs available
 *     this year" (1 for Intelligence annual, 3 for Professional annual)
 *   • Otherwise                        → render nothing (Layer 2 standard pricing)
 */
export default function FreeRunIndicator({ toolKey }: Props) {
  const { user } = useAuth();
  const { isPremium, isLoading } = useSubscriptionTier();
  const [credits, setCredits] = useState<number>(0);

  const eligible = isAnnualCreditEligible(toolKey);

  useEffect(() => {
    if (isLoading || !user || !isPremium || !eligible) return;
    let cancelled = false;
    countAvailableAnnualCredits(user.id).then((n) => {
      if (!cancelled) setCredits(n);
    });
    return () => { cancelled = true; };
  }, [user, isPremium, isLoading, eligible]);

  if (isLoading || !user || !isPremium) return null;

  if (isIncludedTool(toolKey)) {
    return (
      <p className="text-sm font-medium text-brand-teal">
        ✓ Included with your subscription
      </p>
    );
  }

  if (eligible && credits > 0) {
    const noun = credits === 1 ? "run" : "runs";
    return (
      <p className="text-sm font-medium text-brand-teal">
        🎁 {credits} free Smart Tool {noun} available this year — redeemable on this assessment
      </p>
    );
  }

  return null;
}
