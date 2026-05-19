import { supabase } from '@/integrations/supabase/client';
import { isConvenienceTool } from '@/config/pricing';

export interface FreeRunStatus {
  hasFreeRun: boolean;
  reason:     string;
}

/**
 * Check whether a Professional annual subscriber has a free convenience
 * tool run available for a specific client this calendar month.
 */
export async function checkFreeConvenienceRun(
  userId:   string,
  clientId: string,
  toolKey:  string
): Promise<FreeRunStatus> {

  if (!isConvenienceTool(toolKey)) {
    return { hasFreeRun: false, reason: 'Smart Tools are not eligible for free runs.' };
  }

  // Confirm Professional annual subscription
  const { data: profile } = await supabase
    .from('profiles')
    .select('professional_annual, subscription_tier')
    .eq('id', userId)
    .single();

  const p = profile as { professional_annual?: boolean; subscription_tier?: string } | null;
  if (
    !p ||
    p.subscription_tier !== 'professional' ||
    !p.professional_annual
  ) {
    return {
      hasFreeRun: false,
      reason:     'Free runs require an active Professional annual subscription.',
    };
  }

  // Check the client's monthly run record
  const { data: client } = await supabase
    .from('professional_clients')
    .select('free_run_used_this_month, free_run_reset_date')
    .eq('id', clientId)
    .eq('user_id', userId)
    .single();

  const c = client as { free_run_used_this_month?: boolean; free_run_reset_date?: string } | null;
  if (!c) {
    return { hasFreeRun: false, reason: 'Client record not found.' };
  }

  // Reset flag if we're in a new calendar month
  const resetDate = c.free_run_reset_date
    ? new Date(c.free_run_reset_date)
    : new Date(0);
  const now = new Date();
  const isNewMonth =
    resetDate.getFullYear() < now.getFullYear() ||
    resetDate.getMonth()    < now.getMonth();

  if (isNewMonth) {
    await supabase
      .from('professional_clients')
      .update({
        free_run_used_this_month: false,
        free_run_reset_date:      now.toISOString().split('T')[0],
      })
      .eq('id', clientId);
    return { hasFreeRun: true, reason: 'Free monthly run available.' };
  }

  if (c.free_run_used_this_month) {
    return {
      hasFreeRun: false,
      reason:     'Free run already used this month for this client.',
    };
  }

  return { hasFreeRun: true, reason: 'Free monthly run available.' };
}

/** Mark the free run as consumed for this client this month */
export async function consumeFreeConvenienceRun(clientId: string): Promise<void> {
  await supabase
    .from('professional_clients')
    .update({ free_run_used_this_month: true })
    .eq('id', clientId);
}
