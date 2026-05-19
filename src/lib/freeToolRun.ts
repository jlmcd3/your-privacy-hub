import { supabase } from "@/integrations/supabase/client";

export type PaidTier = "intelligence" | "professional";
export type AnyTier = "free" | PaidTier;

/**
 * Check whether the current user has their 1 free tool run available this month.
 *
 * Logic:
 *  - Reads `subscription_tier`, `free_tool_run_used_this_month`,
 *    `free_tool_run_reset_date` from `profiles`.
 *  - If the reset date is in a prior calendar month, transparently resets
 *    the flag and returns `hasFreeRun: true`.
 *  - `free` tier (and unauthenticated) always returns `hasFreeRun: false`.
 *
 * Returns `{ hasFreeRun, tier }`.
 */
export async function checkFreeToolRun(userId: string): Promise<{
  hasFreeRun: boolean;
  tier: AnyTier;
}> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, free_tool_run_used_this_month, free_tool_run_reset_date")
    .eq("id", userId)
    .single();

  if (!profile) return { hasFreeRun: false, tier: "free" };

  const tier = (((profile as any).subscription_tier as string) ?? "free") as AnyTier;
  if (tier === "free") return { hasFreeRun: false, tier };

  const resetDateRaw = (profile as any).free_tool_run_reset_date as string | null;
  const resetDate = resetDateRaw ? new Date(resetDateRaw) : new Date(0);
  const now = new Date();
  const isNewMonth =
    resetDate.getFullYear() < now.getFullYear() ||
    (resetDate.getFullYear() === now.getFullYear() && resetDate.getMonth() < now.getMonth());

  if (isNewMonth) {
    await supabase
      .from("profiles")
      .update({
        free_tool_run_used_this_month: false,
        free_tool_run_reset_date: now.toISOString().split("T")[0],
      } as any)
      .eq("id", userId);
    return { hasFreeRun: true, tier };
  }

  return { hasFreeRun: !(profile as any).free_tool_run_used_this_month, tier };
}

/** Mark the user's free run as used for this month. Idempotent. */
export async function consumeFreeToolRun(userId: string): Promise<void> {
  await supabase
    .from("profiles")
    .update({ free_tool_run_used_this_month: true } as any)
    .eq("id", userId);
}
