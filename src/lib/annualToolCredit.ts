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
import { ANNUAL_CREDIT_ELIGIBLE_KEYS, creditPoolForTool } from '@/config/pricing';
import { getStripeEnvironment } from '@/lib/env';


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

/** Credit pool a tool draws on. RoPA has its own flat 1/yr pool (v12). */
export type CreditPool = 'smart_tool' | 'ropa';
export { creditPoolForTool };

/**
 * Read the user's available annual credit (optionally scoped to a client).
 * Returns the most recently granted unredeemed credit, if any.
 */
export async function getAvailableAnnualCredit(
  userId:    string,
  clientId?: string | null,
  pool: CreditPool = 'smart_tool',
): Promise<AnnualCreditStatus> {
  let q = supabase
    .from('annual_tool_credits')
    .select('id, cycle_start')
    .eq('user_id', userId)
    .eq('environment', getStripeEnvironment())
    .eq('pool', pool)
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

/**
 * Count unredeemed annual credits available to a user (optionally scoped to a
 * client). Used by tool intake pages so Professional annual subscribers see
 * "3 free Smart Tool runs available" instead of "1".
 */
export async function countAvailableAnnualCredits(
  userId:    string,
  clientId?: string | null,
  pool: CreditPool = 'smart_tool',
): Promise<number> {
  let q = supabase
    .from('annual_tool_credits')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('environment', getStripeEnvironment())
    .eq('pool', pool)
    .is('redeemed_at', null);


  if (clientId) {
    q = q.eq('client_id', clientId);
  } else {
    q = q.is('client_id', null);
  }

  const { count, error } = await q;
  if (error) return 0;
  return count ?? 0;
}

/**
 * RoPA annual credit (v12, 2026-08-11). Separate pool: exactly ONE per
 * subscription year for BOTH Intelligence annual and Professional annual —
 * deliberately NOT the 1-vs-3 Smart Tool grant. Covers the first RoPA update
 * of each subscription year; later updates cost $39 (v13, ropa_annual_additional).
 */
export async function getAvailableRopaCredit(
  userId:    string,
  clientId?: string | null,
): Promise<AnnualCreditStatus> {
  return await getAvailableAnnualCredit(userId, clientId, 'ropa');
}
