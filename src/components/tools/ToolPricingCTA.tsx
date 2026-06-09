/**
 * ToolPricingCTA — shared price + subscriber-status block for tool intake pages.
 *
 * v9 three-layer model:
 *   • Layer 1 (INCLUDED_TOOL_KEYS)         → "Included with your subscription"
 *   • Layer 3 (ANNUAL_CREDIT_ELIGIBLE)     → standalone price + credit banner
 *                                            when the user has an unredeemed
 *                                            annual credit
 *   • Otherwise                            → standalone price only
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { PRICING, type ToolKey, isIncludedTool } from "@/config/pricing";
import {
  isAnnualCreditEligible,
  getAvailableAnnualCredit,
} from "@/lib/annualToolCredit";

interface Props {
  toolKey: ToolKey;
  /** Optional override label like "per assessment" / "per document". */
  unitLabel?: string;
  className?: string;
}

export default function ToolPricingCTA({ toolKey, unitLabel, className = "" }: Props) {
  const { user } = useAuth();
  const { isPremium, isLoading } = useSubscriptionTier();
  const [hasCredit, setHasCredit] = useState<boolean>(false);

  const eligible = isAnnualCreditEligible(toolKey);

  useEffect(() => {
    if (isLoading || !user || !isPremium || !eligible) return;
    let cancelled = false;
    getAvailableAnnualCredit(user.id).then((s) => {
      if (!cancelled) setHasCredit(s.hasCredit);
    });
    return () => { cancelled = true; };
  }, [user, isPremium, isLoading, eligible]);

  const tool = PRICING.tools[toolKey];
  const standaloneDollars = tool.dollars;
  const standaloneDisplay = tool.display;
  const isFreeTool = standaloneDollars === 0;
  const unit = unitLabel ? ` ${unitLabel}` : "";

  if (isFreeTool) {
    return (
      <div className={`text-sm ${className}`}>
        <span className="font-bold text-green-700">Free</span>
        <span className="text-muted-foreground"> · No account required</span>
      </div>
    );
  }

  // Layer 1 — included with any active subscription
  if (isPremium && isIncludedTool(toolKey)) {
    return (
      <div className={`text-sm ${className}`}>
        <div className="font-bold text-brand-teal">Included with your subscription</div>
        <div className="text-meta text-muted-foreground mt-1">
          Standalone price: {standaloneDisplay}{unit}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className={`text-sm text-muted-foreground ${className}`}>Loading pricing…</div>;
  }

  // Layer 3 — annual credit redeemable on this tool
  if (isPremium && eligible && hasCredit) {
    return (
      <div className={`text-sm ${className}`}>
        <div className="font-bold text-brand-navy">{standaloneDisplay}{unit}</div>
        <div className="mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md text-meta text-green-800">
          🎁 You have 1 free Smart Tool run available this year — this run will be free.
        </div>
      </div>
    );
  }

  // Standalone / Layer 2 — show price only
  return (
    <div className={`text-sm ${className}`}>
      <div className="font-bold text-brand-navy">{standaloneDisplay}{unit}</div>
    </div>
  );
}
