/**
 * Annual Tool Credit — v9 Layer 3 (June 2026 update).
 *
 * Annual subscribers receive free Smart Tool runs per subscription year,
 * redeemable on Governance, LIA, or DPIA only (see
 * ANNUAL_CREDIT_ELIGIBLE_KEYS in src/config/pricing.ts). Grant size depends
 * on tier: Intelligence annual = 1 credit/yr; Professional annual = 3
 * credits/yr.
 *
 * Credits are stored in `public.annual_tool_credits`. A credit is available
 * when its `redeemed_at` is NULL. Redemption happens server-side in the
 * `create-tool-checkout` edge function (`redeem_annual_credit` flow).
 *
 * The client lib is read-only — never mutate the table from the browser.
 */
import { supabase } from '@/integrations/supabase/client';
import { ANNUAL_CREDIT_ELIGIBLE_KEYS } from '@/config/pricing';

export interface AnnualCreditStatus {
  /** True when an unredeemed credit exists for this user/client cycle. */
  hasCredit: boolean;
  /** ID of the unredeemed credit row, if any (passed to checkout for redemption). */
  creditId: string | null;
  /** Current cycle start date (ISO) of the available credit. */
  cycleStart: string | null;
}

/**
 * Check whether a given tool key is eligible for annual-credit redemption.
 * Accepts snake_case (governance, lia, dpia) — the only eligible keys.
 */
export function isAnnualCreditEligible(toolKey: string): boolean {
  return (ANNUAL_CREDIT_ELIGIBLE_KEYS as readonly string[]).includes(toolKey);
}

/**
 * Read the user's available annual credit (optionally scoped to a client).
 * Returns the most recently granted unredeemed credit, if any.
 */
export async function getAvailableAnnualCredit(
  userId:    string,
  clientId?: string | null,
): Promise<AnnualCreditStatus> {
  let q = supabase
    .from('annual_tool_credits')
    .select('id, cycle_start')
    .eq('user_id', userId)
    .is('redeemed_at', null)
    .order('cycle_start', { ascending: false })
    .limit(1);

  if (clientId) {
    q = q.eq('client_id', clientId);
  } else {
    q = q.is('client_id', null);
  }

  const { data, error } = await q.maybeSingle();
  if (error || !data) {
    return { hasCredit: false, creditId: null, cycleStart: null };
  }
  return { hasCredit: true, creditId: data.id, cycleStart: data.cycle_start };
}
