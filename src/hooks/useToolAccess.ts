import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";

interface ToolAccessConfig {
  /** null = free for everyone (non-subscribers); otherwise standalone price in dollars */
  standalonePrice: number | null;
  /**
   * Per-use rate for ANNUAL Platform subscribers (only). null = included
   * (free) for annual subscribers. Monthly subscribers do NOT get this rate
   * — they pay standalonePrice.
   */
  subscriberPrice: number | null;
  /** Optional: max number of free jurisdictions for freemium tools */
  freeJurisdictionLimit?: number;
  /**
   * CPPA tools remain paid for everyone, but annual subscribers get the
   * subscriberPrice. Set true to use that semantic; default false (standard
   * tool: annual = included free, monthly/free = standalonePrice).
   */
  isCppa?: boolean;
}

/**
 * Determines access tier and effective price for a paid tool under the
 * New Model (Doc 4):
 *
 *   Standard tool (default):
 *     annual / annual_founding → effectivePrice = subscriberPrice (0 for IR Playbook + Biometric; standalonePrice for all others)
 *     monthly / free           → effectivePrice = standalonePrice
 *
 *   CPPA tool (isCppa = true):
 *     annual / annual_founding → effectivePrice = subscriberPrice (discounted, still paid)
 *     monthly / free           → effectivePrice = standalonePrice
 *
 * `isPremium` here is preserved for backwards compatibility with existing
 * callers, but it now means "has tool access" (annual subscriber) — NOT
 * "has any active subscription". Monthly Intelligence subscribers do not
 * get tool access and will be treated as standalone purchasers.
 */
export function useToolAccess(config: ToolAccessConfig) {
  const { user, hasToolAccess, isLoading, tier } = useSubscriptionTier();

  // Annual subscribers (incl. annual_founding) get the subscriber rate.
  // For standard tools, subscriberPrice is typically null (included free).
  // For CPPA tools, subscriberPrice is the discounted paid rate.
  const effectivePrice = hasToolAccess ? config.subscriberPrice : config.standalonePrice;

  const isFreeForUser = effectivePrice === null || effectivePrice === 0;

  const priceLabel = isFreeForUser
    ? "Generate — Included in your plan"
    : `Generate — $${effectivePrice}`;

  return {
    user,
    /** True when this user has annual-tier tool access (formerly: any premium). */
    isPremium: hasToolAccess,
    /** True only when the user is an Annual Platform subscriber. */
    hasToolAccess,
    /** True for monthly Intelligence subscribers (no tool access). */
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
