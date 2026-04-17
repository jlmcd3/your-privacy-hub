import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ToolAccessConfig {
  /** null = free for everyone (non-subscribers); otherwise standalone price in dollars */
  standalonePrice: number | null;
  /** null = free for subscribers; otherwise per-use subscriber price in dollars */
  subscriberPrice: number | null;
  /** Optional: max number of free jurisdictions for freemium tools (e.g. Biometric Checker) */
  freeJurisdictionLimit?: number;
}

/**
 * Determines access tier and effective price for a paid tool.
 *
 * Returns the price the current viewer pays, whether they're a subscriber,
 * a CTA-ready label, and helpers for freemium gating.
 */
export function useToolAccess(config: ToolAccessConfig) {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setIsPremium(false);
      return;
    }
    supabase
      .from("profiles")
      .select("is_premium, is_pro")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        setIsPremium(data?.is_premium === true || data?.is_pro === true);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isLoading = isPremium === null;

  // Price the current user pays
  const effectivePrice = isPremium ? config.subscriberPrice : config.standalonePrice;

  // True if user pays nothing (free for all, or free for this subscriber)
  const isFreeForUser = effectivePrice === null || effectivePrice === 0;

  const priceLabel = isFreeForUser ? "Generate — Free" : `Generate — $${effectivePrice}`;

  return {
    user,
    isPremium,
    isLoading,
    effectivePrice,
    isFreeForUser,
    priceLabel,
    standalonePrice: config.standalonePrice,
    subscriberPrice: config.subscriberPrice,
    freeJurisdictionLimit: config.freeJurisdictionLimit,
  };
}
