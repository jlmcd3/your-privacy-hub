import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";

interface ToolAccessConfig {
  /** null = free for everyone (non-subscribers); otherwise standalone price in dollars */
  standalonePrice: number | null;
  /**
   * Per-use rate for ANY active subscriber (v9: monthly or annual,
   * Intelligence or Professional). null = included (free) for subscribers.
   * Non-subscribers always pay standalonePrice.
   */
  subscriberPrice: number | null;
  /** Optional: max number of free jurisdictions for freemium tools */
  freeJurisdictionLimit?: number;
  /**
   * CPPA tools remain paid for everyone, but subscribers get the discounted
   * subscriberPrice. Set true to use that semantic; default false (standard
   * tool: subscriber = included free OR subscriberPrice, non-sub = standalonePrice).
   */
  isCppa?: boolean;
}

/**
 * v9 access tier resolution:
 *
 *   Any active subscription (monthly or annual, post-trial)
 *     → effectivePrice = subscriberPrice (often 0 / null = included)
 *   Free / trial / canceled
 *     → effectivePrice = standalonePrice
 *
 * `isPremium` is preserved for backwards compatibility and now mirrors
 * `hasToolAccess` (any active subscription, post-trial).
 */
export function useToolAccess(config: ToolAccessConfig) {
  const { user, hasToolAccess, isLoading, tier } = useSubscriptionTier();

  const effectivePrice = hasToolAccess ? config.subscriberPrice : config.standalonePrice;

  const isFreeForUser = effectivePrice === null || effectivePrice === 0;

  const priceLabel = isFreeForUser
    ? "Generate — Included in your plan"
    : `Generate — $${effectivePrice}`;

  return {
    user,
    /** v9: any active subscription, post-trial. */
    isPremium: hasToolAccess,
    /** v9: any active subscription, post-trial. */
    hasToolAccess,
    /** Convenience flag — true for monthly Intelligence subscribers only. */
    isMonthlyIntelligence: tier === "monthly",
    isLoading,
    effectivePrice,
    isFreeForUser,
    priceLabel,
    standalonePrice: config.standalonePrice,
    subscriberPrice: config.subscriberPrice,
    freeJurisdictionLimit: config.freeJurisdictionLimit,
  };
}
