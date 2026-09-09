// Server-side "is this caller an entitled subscriber right now" gate for the
// SUBSCRIPTION-ONLY products (US / EU Privacy Notice builders).
//
// 2026-09-09 (CEO): these products are included with an active paid
// subscription. A TRIAL is not a paid subscription — a trial user may not
// generate them for free. Mirrors `hasToolAccess` in
// src/hooks/useSubscriptionTier.ts (isPremium && !isInTrial), which the UI
// already enforces; this closes the same rule on the server.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isTrialing } from "./trial.ts";

export interface SubscriberGateResult {
  ok: boolean;
  reason?: "no_user" | "not_subscribed" | "trial_not_entitled";
}

export async function requireActiveSubscriber(
  admin: SupabaseClient,
  userId: string | null | undefined,
): Promise<SubscriberGateResult> {
  if (!userId) return { ok: false, reason: "no_user" };

  const { data: profile } = await admin
    .from("profiles")
    .select("is_premium, is_pro, subscription_type, stripe_trial_end")
    .eq("id", userId)
    .maybeSingle();

  const subType = (profile as { subscription_type?: string | null } | null)?.subscription_type ?? null;
  const subscribed =
    (profile as { is_premium?: boolean } | null)?.is_premium === true ||
    (profile as { is_pro?: boolean } | null)?.is_pro === true ||
    subType === "monthly" ||
    subType === "annual" ||
    subType === "annual_founding";

  if (!subscribed) return { ok: false, reason: "not_subscribed" };
  if (isTrialing(profile as { stripe_trial_end?: string | null })) {
    return { ok: false, reason: "trial_not_entitled" };
  }
  return { ok: true };
}
