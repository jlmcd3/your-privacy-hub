import { supabase } from '@/integrations/supabase/client';
import { isConvenienceTool, getFreeRunPoolSize } from '@/config/pricing';

export interface FreeRunStatus {
  hasFreeRun: boolean;
  runsUsed:   number;
  poolSize:   number;
  reason:     string;
}

/**
 * Check whether the current user has a free Convenience Tool run available
 * this calendar month, based on their subscription tier pool.
 *
 * Pool sizes (from pricing.ts FREE_RUN_POOL_SIZES):
 *   intel_monthly: 1   intel_annual: 5
 *   pro_monthly:   3   pro_annual:  10
 *
 * Smart Tools are never eligible — isConvenienceTool() gates access.
 * Pool resets on the 1st of each calendar month. No carry-over.
 */
export async function checkFreeConvenienceRun(
  userId:  string,
  toolKey: string,
): Promise<FreeRunStatus> {
  if (!isConvenienceTool(toolKey)) {
    return {
      hasFreeRun: false, runsUsed: 0, poolSize: 0,
      reason: 'Smart Tools are not eligible for free runs.',
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_type, is_premium, is_pro, free_convenience_runs_used, free_runs_reset_date')
    .eq('id', userId)
    .single();

  if (!profile) {
    return { hasFreeRun: false, runsUsed: 0, poolSize: 0, reason: 'Profile not found.' };
  }

  const p = profile as any;
  const subType: string | null = p.subscription_type ?? null;
  const isPro: boolean = p.is_pro === true;
  // Map profile fields to a granular pool key. If subscription_type is set,
  // trust it directly (FREE_RUN_POOL_SIZES knows the legacy aliases).
  const tier = subType ?? (isPro ? 'pro_annual' : 'free');

  const poolSize = getFreeRunPoolSize(tier);
  if (poolSize === 0) {
    return {
      hasFreeRun: false, runsUsed: 0, poolSize: 0,
      reason: 'No free runs available for this subscription tier.',
    };
  }

  // Reset counter if we're in a new calendar month
  const resetDate = p.free_runs_reset_date ? new Date(p.free_runs_reset_date) : new Date(0);
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let runsUsed: number = p.free_convenience_runs_used ?? 0;

  if (resetDate < firstOfMonth) {
    await supabase
      .from('profiles')
      .update(({
        free_convenience_runs_used: 0,
        free_runs_reset_date: firstOfMonth.toISOString().split('T')[0],
      })
      .eq('id', userId);
    runsUsed = 0;
  }

  if (runsUsed >= poolSize) {
    return {
      hasFreeRun: false, runsUsed, poolSize,
      reason: `Free run pool exhausted (${runsUsed}/${poolSize} used this month).`,
    };
  }

  return {
    hasFreeRun: true, runsUsed, poolSize,
    reason: `Free run available (${runsUsed}/${poolSize} used this month).`,
  };
}

/** Consume one free run from the pool for this user. */
export async function consumeFreeConvenienceRun(userId: string): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('free_convenience_runs_used')
    .eq('id', userId)
    .single();

  const current = (profile as any)?.free_convenience_runs_used ?? 0;

  await supabase
    .from('profiles')
    .update({ free_convenience_runs_used: current + 1 })
    .eq('id', userId);
}

/** Get remaining free runs for display in UI. Returns { used, total, resetDate }. */
export async function getFreeRunPoolStatus(
  userId: string,
  tier:   string,
): Promise<{ used: number; total: number; resetDate: string | null }> {
  const total = getFreeRunPoolSize(tier);
  if (total === 0) return { used: 0, total: 0, resetDate: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('free_convenience_runs_used, free_runs_reset_date')
    .eq('id', userId)
    .single();

  if (!profile) return { used: 0, total, resetDate: null };

  const p = profile as any;
  const resetDate = p.free_runs_reset_date as string | null;
  const resetDt = resetDate ? new Date(resetDate) : new Date(0);
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // If counter is stale, effective used = 0
  const used = resetDt < firstOfMonth ? 0 : (p.free_convenience_runs_used ?? 0);

  const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextResetStr = nextReset.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return { used, total, resetDate: nextResetStr };
}
