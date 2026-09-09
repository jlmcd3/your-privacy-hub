CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND public.is_email_banned(NEW.email) THEN
    RAISE EXCEPTION 'This email address is not permitted to register.';
  END IF;
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.admin_list_people();

CREATE FUNCTION public.admin_list_people()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  status TEXT,
  registered_at TIMESTAMPTZ,
  first_subscribed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  subscription_type TEXT,
  subscription_interval TEXT,
  subscription_end_date TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  payment_failed BOOLEAN,
  marketing_opt_out BOOLEAN,
  accepted_privacy_policy_id UUID,
  accepted_privacy_notice_id UUID,
  accepted_terms_id UUID,
  last_sign_in_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  closure_type TEXT,
  purge_after TIMESTAMPTZ,
  termination_reason TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    u.email::text,
    CASE
      WHEN p.terminated_at IS NOT NULL THEN 'terminated'
      WHEN p.closed_at IS NOT NULL THEN 'closed'
      WHEN p.stripe_trial_end IS NOT NULL AND p.stripe_trial_end > now() THEN 'trialing'
      WHEN (p.is_premium OR p.is_pro) AND p.payment_failed THEN 'past_due'
      WHEN (p.is_premium OR p.is_pro) AND p.cancel_at_period_end THEN 'cancelling'
      WHEN (p.is_premium OR p.is_pro) THEN 'subscriber'
      WHEN p.cancelled_at IS NOT NULL THEN 'cancelled'
      ELSE 'registered'
    END::text,
    COALESCE(p.registered_at, p.created_at),
    p.first_subscribed_at,
    p.cancelled_at,
    p.terminated_at,
    p.stripe_trial_end,
    p.subscription_type,
    p.subscription_interval,
    p.subscription_end_date,
    p.cancel_at_period_end,
    p.payment_failed,
    p.marketing_opt_out,
    p.accepted_privacy_policy_id,
    p.accepted_privacy_notice_id,
    p.accepted_terms_id,
    u.last_sign_in_at,
    p.closed_at,
    p.closure_type,
    p.purge_after,
    p.termination_reason
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_people() TO authenticated, service_role;
