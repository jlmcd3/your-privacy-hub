import { supabase } from '@/integrations/supabase/client';
import { foundingPrice, isSmartTool } from '@/config/pricing';

/** Returns true if this user is a founding subscriber */
export async function checkFoundingStatus(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('founding_subscriber')
    .eq('id', userId)
    .single();
  return (data as { founding_subscriber?: boolean } | null)?.founding_subscriber === true;
}

/**
 * Returns the effective price in cents for a tool purchase.
 * Applies founding subscriber discount if the user qualifies.
 * Returns 0 for free tools regardless of subscriber status.
 */
export async function getEffectiveToolPrice(
  toolKey: string,
  standaloneCents: number,
  userId: string | null
): Promise<{
  cents:              number;
  isFoundingDiscount: boolean;
  displaySaving:      string;
  originalCents:      number;
}> {
  if (standaloneCents === 0) {
    return { cents: 0, isFoundingDiscount: false, displaySaving: '', originalCents: 0 };
  }
  if (!userId) {
    return { cents: standaloneCents, isFoundingDiscount: false, displaySaving: '', originalCents: standaloneCents };
  }

  const isFounding = await checkFoundingStatus(userId);
  if (!isFounding) {
    return { cents: standaloneCents, isFoundingDiscount: false, displaySaving: '', originalCents: standaloneCents };
  }

  const smart      = isSmartTool(toolKey);
  const discounted = foundingPrice(standaloneCents, smart);
  const saving     = standaloneCents - discounted;
  const pct        = smart ? '20%' : '15%';

  return {
    cents:              discounted,
    isFoundingDiscount: true,
    displaySaving:      `Founding subscriber: ${pct} off (saving $${(saving / 100).toFixed(0)})`,
    originalCents:      standaloneCents,
  };
}
