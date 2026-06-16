// src/hooks/useGuidanceTier.ts
// Returns the user's guidance tier for contextual intelligence features.
//
// Tier 1 "anonymous"  — no account. Sees citation text only.
// Tier 2 "registered" — free account. Sees StatuteRail plain summary +
//                       regulation text. Agency reasoning section gated.
// Tier 3 "paid"       — active subscription (post-trial). Full StatuteRail
//                       including agency reasoning + enforcement signals.

import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";

export type GuidanceTier = "anonymous" | "registered" | "paid";

export interface GuidanceTierState {
  tier: GuidanceTier;
  /** True while auth state is loading — callers should render nothing. */
  isLoading: boolean;
  /** Convenience: pass directly to StatuteRail showAgencyReasoning prop. */
  showAgencyReasoning: boolean;
}

export function useGuidanceTier(): GuidanceTierState {
  const { user, loading } = useAuth();
  const { hasToolAccess, isLoading: tierLoading } = useSubscriptionTier();

  if (loading || tierLoading) {
    return { tier: "anonymous", isLoading: true, showAgencyReasoning: false };
  }
  if (!user) {
    return { tier: "anonymous", isLoading: false, showAgencyReasoning: false };
  }
  if (hasToolAccess) {
    return { tier: "paid", isLoading: false, showAgencyReasoning: true };
  }
  return { tier: "registered", isLoading: false, showAgencyReasoning: false };
}
