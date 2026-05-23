import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionTier = "free" | "monthly" | "annual" | "annual_founding";

export interface SubscriptionTierState {
  tier: SubscriptionTier;
  /** True if user has an active paid subscription (any tier). */
  isPremium: boolean;
  /** True only for annual or annual_founding — the user gets IR Playbook and Biometric included; all other tools are per-run. */
  hasToolAccess: boolean;
  /** True for monthly subscribers — intelligence only, no tool access. */
  isIntelligenceOnly: boolean;
  /**
   * Retired program — always `false`. Field retained for backwards
   * compatibility with older callers that destructure it.
   */
  isFoundingSubscriber: boolean;
  isLoading: boolean;
  user: ReturnType<typeof useAuth>["user"];
}

/**
 * Single source of truth for subscription tier.
 *
 * Tier mapping:
 *   annual_founding → hasToolAccess = true (legacy alias for annual)
 *   annual          → hasToolAccess = true
 *   monthly         → hasToolAccess = false (intelligence only)
 *   free            → hasToolAccess = false
 *
 * Use hasToolAccess to gate tool generation, not isPremium.
 * Use isPremium to gate intelligence content.
 *
 * NOTE: the "founding subscriber" discount has been retired. The
 * `isFoundingSubscriber` field is permanently `false` and the
 * `annual_founding` tier is treated identically to `annual`.
 */
export function useSubscriptionTier(): SubscriptionTierState {
  const { user, loading: authLoading } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    if (!user) {
      setTier("free");
      return;
    }

    supabase
      .from("profiles")
      .select("is_premium, is_pro, subscription_type")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        const subType = (data as any)?.subscription_type as string | null;
        const isPrem = data?.is_premium === true || data?.is_pro === true;

        if (subType === "annual_founding" || subType === "annual") {
          setTier(subType as SubscriptionTier);
        } else if (subType === "monthly") {
          setTier("monthly");
        } else if (isPrem) {
          // Legacy is_premium subscribers without subscription_type set —
          // treat as annual (grandfathered access, most permissive).
          setTier("annual");
        } else {
          setTier("free");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const resolvedTier: SubscriptionTier = tier ?? "free";
  const hasToolAccess =
    resolvedTier === "annual" || resolvedTier === "annual_founding";
  const isPremium = resolvedTier !== "free";

  return {
    tier: resolvedTier,
    isPremium,
    hasToolAccess,
    isIntelligenceOnly: resolvedTier === "monthly",
    isFoundingSubscriber: false,
    isLoading: authLoading || tier === null,
    user,
  };
}
