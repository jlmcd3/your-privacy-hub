/**
 * usePremiumStatus — backward-compatible wrapper around useSubscriptionTier.
 * Prefer useSubscriptionTier for new code.
 * Existing callers that only check isPremium continue to work.
 */
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";

export function usePremiumStatus() {
  const { isPremium, isLoading, user, hasToolAccess, tier } =
    useSubscriptionTier();
  return { isPremium, isLoading, user, hasToolAccess, tier };
}
