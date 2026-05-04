import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionTier = "free" | "monthly" | "annual" | "annual_founding";

export interface SubscriptionTierState {
  tier: SubscriptionTier;
  /** True if user has an active paid subscription (any tier). */
  isPremium: boolean;
  /** True only for annual or annual_founding — the user gets tools included. */
  hasToolAccess: boolean;
  /** True for monthly subscribers — intelligence only, no tool access. */
  isIntelligenceOnly: boolean;
  /** True if this is a founding subscriber ($369/yr rate). */
  isFoundingSubscriber: boolean;
  isLoading: boolean;
  user: ReturnType<typeof useAuth>["user"];
}

/**
 * Single source of truth for subscription tier.
 *
 * Tier mapping:
 *   annual_founding → hasToolAccess = true, isFoundingSubscriber = true
 *   annual          → hasToolAccess = true
 *   monthly         → hasToolAccess = false (intelligence only)
 *   free            → hasToolAccess = false
 *
 * Use hasToolAccess to gate tool generation, not isPremium.
 * Use isPremium to gate intelligence content.
 */
export function useSubscriptionTier(): SubscriptionTierState {
  const { user, loading: authLoading } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier | null>(null);
  const [foundingSubscriber, setFoundingSubscriber] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    if (!user) {
      setTier("free");
      setFoundingSubscriber(false);
      return;
    }

    supabase
      .from("profiles")
      .select("is_premium, is_pro, subscription_type, founding_subscriber")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        const subType = (data as any)?.subscription_type as string | null;
        const isPrem = data?.is_premium === true || data?.is_pro === true;

        if (subType === "annual_founding") {
          setTier("annual_founding");
          setFoundingSubscriber(true);
        } else if (subType === "annual") {
          setTier("annual");
          setFoundingSubscriber((data as any)?.founding_subscriber === true);
        } else if (subType === "monthly") {
          setTier("monthly");
          setFoundingSubscriber(false);
        } else if (isPrem) {
          // Legacy is_premium subscribers without subscription_type set —
          // treat as annual (grandfathered access, most permissive).
          setTier("annual");
          setFoundingSubscriber(false);
        } else {
          setTier("free");
          setFoundingSubscriber(false);
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
    isFoundingSubscriber: foundingSubscriber,
    isLoading: authLoading || tier === null,
    user,
  };
}
