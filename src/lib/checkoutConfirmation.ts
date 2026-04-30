import { supabase } from "@/integrations/supabase/client";

export interface PollOptions {
  /** Total time to wait before giving up. Default 30s. */
  timeoutMs?: number;
  /** Delay between attempts. Default 1.5s. */
  intervalMs?: number;
  /** Called when a poll attempt has run (post-check). */
  onAttempt?: (attempt: number) => void;
}

const DEFAULTS = { timeoutMs: 30_000, intervalMs: 1_500 };

async function poll<T>(
  check: () => Promise<T | null>,
  opts: PollOptions = {}
): Promise<T | null> {
  const { timeoutMs, intervalMs, onAttempt } = { ...DEFAULTS, ...opts };
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt += 1;
    const result = await check();
    onAttempt?.(attempt);
    if (result) return result;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}

/**
 * Polls profiles.is_premium until the webhook flips it to true.
 * Returns true if confirmed, false on timeout.
 */
export function waitForSubscriptionActive(
  userId: string,
  opts?: PollOptions
): Promise<boolean> {
  return poll(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("is_premium, is_pro")
      .eq("id", userId)
      .single();
    return data?.is_premium === true || data?.is_pro === true ? true : null;
  }, opts).then((v) => v === true);
}

/**
 * Polls assessment_purchases for a paid record matching the given assessment id.
 * Returns true if confirmed, false on timeout.
 */
export function waitForAssessmentPaid(
  assessmentId: string,
  opts?: PollOptions
): Promise<boolean> {
  return poll(async () => {
    const { data } = await supabase
      .from("assessment_purchases")
      .select("id, status")
      .eq("assessment_id", assessmentId)
      .eq("status", "paid")
      .maybeSingle();
    return data ? true : null;
  }, opts).then((v) => v === true);
}
