
-- 1) cppa_fsor_commentary: remove broad authenticated read access
DROP POLICY IF EXISTS "Authenticated can read FSOR commentary" ON public.cppa_fsor_commentary;

-- 2) weekly_briefs: remove permissive 'true' SELECT that bypasses premium gating
DROP POLICY IF EXISTS "Premium users can read briefs" ON public.weekly_briefs;

-- 3) registration_orders: restrict client UPDATE to non-sensitive fields via column grants
REVOKE UPDATE ON public.registration_orders FROM authenticated;
GRANT UPDATE (renewal_reminders_enabled, renewal_reminder_email, delivery_email)
  ON public.registration_orders TO authenticated;

-- 4) profiles: extend WITH CHECK to lock every billing/subscription column
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND NOT (is_premium                  IS DISTINCT FROM (SELECT p.is_premium                  FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (stripe_customer_id          IS DISTINCT FROM (SELECT p.stripe_customer_id          FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (payment_failed              IS DISTINCT FROM (SELECT p.payment_failed              FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (subscription_end_date       IS DISTINCT FROM (SELECT p.subscription_end_date       FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (is_pro                      IS DISTINCT FROM (SELECT p.is_pro                      FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (stripe_price_id             IS DISTINCT FROM (SELECT p.stripe_price_id             FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (subscription_plan           IS DISTINCT FROM (SELECT p.subscription_plan           FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (subscription_interval       IS DISTINCT FROM (SELECT p.subscription_interval       FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (subscription_type           IS DISTINCT FROM (SELECT p.subscription_type           FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (subscription_tier           IS DISTINCT FROM (SELECT p.subscription_tier           FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (founding_subscriber         IS DISTINCT FROM (SELECT p.founding_subscriber         FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (founding_subscriber_set_at  IS DISTINCT FROM (SELECT p.founding_subscriber_set_at  FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (professional_annual         IS DISTINCT FROM (SELECT p.professional_annual         FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (cancel_at_period_end        IS DISTINCT FROM (SELECT p.cancel_at_period_end        FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (stripe_subscription_id      IS DISTINCT FROM (SELECT p.stripe_subscription_id      FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (stripe_trial_end            IS DISTINCT FROM (SELECT p.stripe_trial_end            FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (bonus_report_credits        IS DISTINCT FROM (SELECT p.bonus_report_credits        FROM public.profiles p WHERE p.id = auth.uid()))
);
