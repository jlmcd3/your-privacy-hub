import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { isIncludedTool } from "@/config/pricing";
import {
  isAnnualCreditEligible,
  getAvailableAnnualCredit,
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
 *   • Layer 3 (Annual credit eligible) → "1 free Smart Tool run available this year"
 *                                        (only when the user actually has an
 *                                        unredeemed credit for the cycle)
 *   • Otherwise                        → render nothing (Layer 2 standard pricing)
 */
export default function FreeRunIndicator({ toolKey }: Props) {
  const { user } = useAuth();
  const { isSubscriber, isLoading } = useSubscriptionTier();
  const [hasCredit, setHasCredit] = useState<boolean>(false);

  const eligible = isAnnualCreditEligible(toolKey);

  useEffect(() => {
    if (isLoading || !user || !isSubscriber || !eligible) return;
    let cancelled = false;
    getAvailableAnnualCredit(user.id).then((s) => {
      if (!cancelled) setHasCredit(s.hasCredit);
    });
    return () => { cancelled = true; };
  }, [user, isSubscriber, isLoading, eligible]);

  if (isLoading || !user || !isSubscriber) return null;

  if (isIncludedTool(toolKey)) {
    return (
      <p className="text-sm font-medium text-brand-teal">
        ✓ Included with your subscription
      </p>
    );
  }

  if (eligible && hasCredit) {
    return (
      <p className="text-sm font-medium text-brand-teal">
        🎁 1 free Smart Tool run available this year — redeemable on this assessment
      </p>
    );
  }

  return null;
}
