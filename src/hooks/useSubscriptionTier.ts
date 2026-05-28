import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionTier = "free" | "monthly" | "annual" | "annual_founding";

/**
 * Granular subscription tier for free-run pool lookup.
 * Maps to FREE_RUN_POOL_SIZES keys in pricing.ts.
 */
export type GranularTier =
  | "free"
  | "intel_monthly"
  | "intel_annual"
  | "pro_monthly"
  | "pro_annual";

/** Returns the granular tier string for FREE_RUN_POOL_SIZES lookup. */
export function toGranularTier(tier: SubscriptionTier, isPro: boolean): GranularTier {
  if (tier === "free") return "free";
  if (tier === "monthly") return isPro ? "pro_monthly" : "intel_monthly";
  if (tier === "annual" || tier === "annual_founding") return isPro ? "pro_annual" : "intel_annual";
  return "free";
}

export interface SubscriptionTierState {
  tier: SubscriptionTier;
  /** Four-way granular split for the free-run pool system. */
  granularTier: GranularTier;
  /** True if user has an active paid subscription (any tier). */
  isPremium: boolean;
  /** True only for annual or annual_founding — the user gets IR Playbook and Biometric included; all other tools are per-run. */
  hasToolAccess: boolean;
  /** True for monthly subscribers — intelligence only, no tool access. */
  isIntelligenceOnly: boolean;
  /** True if the user has a Professional plan (any cadence). */
  isPro: boolean;
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
 * Use granularTier for free-run pool lookups (FREE_RUN_POOL_SIZES).
 */
export function useSubscriptionTier(): SubscriptionTierState {
  const { user, loading: authLoading } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier | null>(null);
  const [isPro, setIsPro] = useState<boolean>(false);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    if (!user) {
      setTier("free");
      setIsPro(false);
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
        const proFlag = data?.is_pro === true;
        setIsPro(proFlag);

        if (subType === "annual_founding" || subType === "annual") {
          setTier(subType as SubscriptionTier);
        } else if (subType === "monthly") {
          setTier("monthly");
        } else if (isPrem) {
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
  const granularTier = toGranularTier(resolvedTier, isPro);

  return {
    tier: resolvedTier,
    granularTier,
    isPremium,
    hasToolAccess,
    isIntelligenceOnly: resolvedTier === "monthly",
    isPro,
    isFoundingSubscriber: false,
    isLoading: authLoading || tier === null,
    user,
  };
}
