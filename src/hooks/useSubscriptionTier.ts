import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/env";


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
 * Single source of truth for subscription tier (v9 model).
 *
 * `hasToolAccess` = ANY active subscription (monthly or annual, Intelligence
 * or Professional) post-trial. Layer-1 tools (RoPA, US/EU Notices, IR,
 * Biometric, DPA) are included with any active subscription under v9 — this
 * field gates their UI surfaces. Annual-only benefits (the Smart Tool
 * credit) check `tier === "annual" || tier === "annual_founding"` directly.
 *
 * Trial enforcement: `isInTrial` collapses `hasToolAccess` to `false`. Every
 * downstream consumer inherits that automatically.
 *
 * Tier resolution rules (defensive against stale Stripe state):
 *   - If neither `is_premium` nor `is_pro` is true → tier `"free"` regardless
 *     of `subscription_type` (closes the canceled-subscriber loophole).
 *   - If premium with a NULL `subscription_type` → treat as `"monthly"`
 *     (least privilege) and warn so missing types surface in testing.
 *   - `"pro_monthly"` / `"pro_annual"` map to monthly/annual tier with
 *     `isPro=true` even if the `is_pro` profile flag lags behind.
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

    // ENT-1: entitlements are env-scoped. Read user_entitlements for the
    // build's Stripe environment; if there is no row (e.g. a legacy user
    // whose live entitlement pre-dates the backfill, or a rollout race),
    // fall back to the profiles row for safety.
    const clientEnv = getStripeEnvironment();

    const resolveFromRow = (data: any) => {
      if (cancelled) return;
      const subType = (data?.subscription_type ?? null) as string | null;
      const isPrem = data?.is_premium === true || data?.is_pro === true;
      const proFlag =
        data?.is_pro === true ||
        subType === "pro_monthly" ||
        subType === "pro_annual";
      setIsPro(proFlag);
      setTrialEnd((data?.stripe_trial_end as string | null) ?? null);

      if (!isPrem) {
        setTier("free");
        return;
      }
      if (subType === "annual_founding" || subType === "annual") {
        setTier(subType as SubscriptionTier);
      } else if (subType === "pro_annual") {
        setTier("annual");
      } else if (subType === "monthly" || subType === "pro_monthly") {
        setTier("monthly");
      } else {
        // eslint-disable-next-line no-console
        console.warn(
          `useSubscriptionTier: premium user ${user.id} has subscription_type=${subType ?? "null"}; defaulting to monthly.`,
        );
        setTier("monthly");
      }
    };

    (async () => {
      const { data: entRow } = await (supabase as any)
        .from("user_entitlements")
        .select("is_premium, is_pro, subscription_type, stripe_trial_end")
        .eq("user_id", user.id)
        .eq("environment", clientEnv)
        .maybeSingle();


      if (cancelled) return;
      if (entRow) {
        resolveFromRow(entRow);
        return;
      }

      // Fallback: rollout safety only. profiles is legacy live state.
      const { data: profRow } = await supabase
        .from("profiles")
        .select("is_premium, is_pro, subscription_type, stripe_trial_end")
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      // In sandbox builds we must NOT surface live profile entitlement as
      // sandbox entitlement — that would re-open the contamination hole.
      if (clientEnv === "sandbox") {
        resolveFromRow({});
        return;
      }
      resolveFromRow(profRow);
    })();


    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const resolvedTier: SubscriptionTier = tier ?? "free";
  const isInTrial = !!trialEnd && new Date(trialEnd) > new Date();
  const isPremium = resolvedTier !== "free";
  // v9: included = ANY active subscription, post-trial.
  const hasToolAccess = isPremium && !isInTrial;
  const granularTier = isInTrial ? "free" : toGranularTier(resolvedTier, isPro);

  return {
    tier: resolvedTier,
    granularTier,
    isPremium,
    hasToolAccess,
    isIntelligenceOnly: resolvedTier === "monthly" && !isPro,
    isPro,
    isInTrial,
    isFoundingSubscriber: false,
    isLoading: authLoading || tier === null,
    user,
  };
}
