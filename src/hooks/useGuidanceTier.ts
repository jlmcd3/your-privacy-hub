// src/hooks/useGuidanceTier.ts
// Returns the user's guidance tier for contextual intelligence features.
//
// "anonymous"  — no account. Sees citations, StatuteRail, footprint panels.
// "registered" — free account. Same as anonymous for content display.
// "paid"       — active subscription (post-trial). Additionally sees enforcement
//               signal icons (corpus-derived intelligence, proprietary).
//
// All users see the full StatuteRail including agency reasoning.
// Enforcement signals are gated to paid subscribers only.

import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";

export type GuidanceTier = "anonymous" | "registered" | "paid";

export interface GuidanceTierState {
  tier: GuidanceTier;
  /** True while auth state is loading. */
  isLoading: boolean;
}

export function useGuidanceTier(): GuidanceTierState {
  const { user, loading } = useAuth();
  const { hasToolAccess, isLoading: tierLoading } = useSubscriptionTier();

  if (loading || tierLoading) {
    return { tier: "anonymous", isLoading: true };
  }
  if (!user) {
    return { tier: "anonymous", isLoading: false };
  }
  if (hasToolAccess) {
    return { tier: "paid", isLoading: false };
  }
  return { tier: "registered", isLoading: false };
}
