import { supabase } from '@/integrations/supabase/client';

/**
 * Founding-subscriber discount has been retired. These helpers remain as
 * no-op shims so existing call sites keep compiling — they always report
 * the standalone price and no discount.
 */

/** Always returns false — founding-subscriber program is retired. */
export async function checkFoundingStatus(_userId: string): Promise<boolean> {
  return false;
}

/**
 * Returns the standalone price for a tool. No discount is applied for any
 * tier. Returns 0 for free tools. Reads `supabase` is intentionally unused
 * but kept imported so future per-user pricing rules can be added without
 * changing the call signature.
 */
export async function getEffectiveToolPrice(
  _toolKey: string,
  standaloneCents: number,
  _userId: string | null
): Promise<{
  cents:              number;
  isFoundingDiscount: boolean;
  displaySaving:      string;
  originalCents:      number;
}> {
  void supabase; // retained import — see jsdoc above
  return {
    cents:              standaloneCents,
    isFoundingDiscount: false,
    displaySaving:      '',
    originalCents:      standaloneCents,
  };
}
