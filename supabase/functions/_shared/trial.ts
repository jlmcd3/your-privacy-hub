// Shared trial predicate (2026-09-09, CEO instruction).
//
// POLICY: a user inside a Stripe trial period is NOT entitled to any
// subscriber benefit. No free generations, no annual credits, no
// subscriber-discounted rate. A trial user who wants a paid product pays
// the STANDALONE price, exactly as an unsubscribed registered user does.
//
// The trial still grants read-side access (intelligence surfaces, the
// ability to reach a paid tool's checkout) — this predicate only removes
// the money-side benefits, and mirrors `isInTrial` in
// src/hooks/useSubscriptionTier.ts, where the client already behaves this
// way. Both `profiles` and `user_entitlements` carry `stripe_trial_end`,
// written by payments-webhook from `subscription.trial_end`.

export function isTrialing(
  row: { stripe_trial_end?: string | null } | null | undefined,
): boolean {
  const end = row?.stripe_trial_end;
  if (!end) return false;
  const t = Date.parse(end);
  return Number.isFinite(t) && t > Date.now();
}
