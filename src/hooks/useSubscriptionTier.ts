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
  /** Four-way granular split for the free-run pool system.
   *  Returns "free" while the user is in a trial period (`isInTrial === true`)
   *  so trial users get a zero-sized free-run pool. */
  granularTier: GranularTier;
  /** True if user has an active paid subscription (any tier).
   *  Remains true during trial — gates intelligence content, not tool benefits. */
  isPremium: boolean;
  /** True only for annual / annual_founding subscribers whose trial is over.
   *  Drives RoPA / US Notice / EU Notice "included free" gating. */
  hasToolAccess: boolean;
  /** True for monthly subscribers — intelligence only, no tool access. */
  isIntelligenceOnly: boolean;
  /** True if the user has a Professional plan (any cadence). */
  isPro: boolean;
  /** True while the Stripe trial period is still in the future. */
  isInTrial: boolean;
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
 * Trial enforcement: `isInTrial` collapses `hasToolAccess` to `false` and
 * `granularTier` to `"free"`. This is the only place trial restrictions
 * are applied — every downstream consumer (tool access gates, free-run
 * pool, pricing) inherits the restriction automatically.
 *
 * Tier mapping (post-trial):
 *   annual_founding → hasToolAccess = true (legacy alias for annual)
 *   annual          → hasToolAccess = true
 *   monthly         → hasToolAccess = false (intelligence only)
 *   free            → hasToolAccess = false
 *
 * Use hasToolAccess to gate tool generation, not isPremium.
 * Use isPremium to gate intelligence content (trial users see it).
 * Use granularTier for free-run pool lookups (FREE_RUN_POOL_SIZES).
 */
export function useSubscriptionTier(): SubscriptionTierState {
  const { user, loading: authLoading } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier | null>(null);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [trialEnd, setTrialEnd] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    if (!user) {
      setTier("free");
      setIsPro(false);
      setTrialEnd(null);
      return;
    }

    supabase
      .from("profiles")
      .select("is_premium, is_pro, subscription_type, stripe_trial_end")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        const subType = (data as any)?.subscription_type as string | null;
        const isPrem = data?.is_premium === true || data?.is_pro === true;
        const proFlag = data?.is_pro === true;
        setIsPro(proFlag);
        setTrialEnd(((data as any)?.stripe_trial_end as string | null) ?? null);

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
  const isInTrial = !!trialEnd && new Date(trialEnd) > new Date();
  const isPremium = resolvedTier !== "free";
  // Trial users do NOT receive tool benefits, even on the annual plan.
  const hasToolAccess =
    !isInTrial &&
    (resolvedTier === "annual" || resolvedTier === "annual_founding");
  // Trial users get a zero-sized free-run pool by collapsing to "free".
  const granularTier = isInTrial ? "free" : toGranularTier(resolvedTier, isPro);

  return {
    tier: resolvedTier,
    granularTier,
    isPremium,
    hasToolAccess,
    isIntelligenceOnly: resolvedTier === "monthly",
    isPro,
    isInTrial,
    isFoundingSubscriber: false,
    isLoading: authLoading || tier === null,
    user,
  };
}
