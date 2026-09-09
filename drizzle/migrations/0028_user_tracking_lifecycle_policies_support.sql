-- Policy document versions library
CREATE TABLE public.policy_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('privacy_policy','privacy_notice','terms_of_service')),
  version TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  body TEXT NOT NULL DEFAULT '',
  summary TEXT,
  published_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kind, version)
);
GRANT SELECT, INSERT ON public.policy_documents TO authenticated;
GRANT ALL ON public.policy_documents TO service_role;
ALTER TABLE public.policy_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read policy documents" ON public.policy_documents
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Admins insert policy documents" ON public.policy_documents
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_policy_documents_kind_published ON public.policy_documents (kind, published_at DESC);

-- Account lifecycle events
CREATE TABLE public.account_lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('registered','trial_started','subscribed','cancelled','reactivated','terminated')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'app',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.account_lifecycle_events TO authenticated;
GRANT ALL ON public.account_lifecycle_events TO service_role;
ALTER TABLE public.account_lifecycle_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read lifecycle events" ON public.account_lifecycle_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE INDEX idx_lifecycle_user ON public.account_lifecycle_events (user_id, occurred_at DESC);
CREATE UNIQUE INDEX idx_lifecycle_unique_event ON public.account_lifecycle_events (user_id, event_type, occurred_at);

-- Support messages
CREATE TABLE public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_id UUID,
  subject TEXT,
  body TEXT NOT NULL DEFAULT '',
  channel TEXT NOT NULL DEFAULT 'email',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  notes TEXT
);
GRANT SELECT, INSERT, UPDATE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read support messages" ON public.support_messages
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Admins write support messages" ON public.support_messages
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update support messages" ON public.support_messages
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_support_messages_email ON public.support_messages (lower(email));

-- Additive profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS termination_reason TEXT,
  ADD COLUMN IF NOT EXISTS first_subscribed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_privacy_policy_id UUID,
  ADD COLUMN IF NOT EXISTS accepted_privacy_notice_id UUID,
  ADD COLUMN IF NOT EXISTS accepted_terms_id UUID,
  ADD COLUMN IF NOT EXISTS marketing_opt_out BOOLEAN NOT NULL DEFAULT false;

UPDATE public.profiles SET registered_at = created_at WHERE registered_at IS NULL;

INSERT INTO public.account_lifecycle_events (user_id, event_type, occurred_at, source)
SELECT p.id, 'registered', p.created_at, 'backfill' FROM public.profiles p
ON CONFLICT DO NOTHING;

-- Admin master people list (security definer: joins auth.users for the email)
CREATE OR REPLACE FUNCTION public.admin_list_people()
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
  last_sign_in_at TIMESTAMPTZ
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
    u.last_sign_in_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
$$;
REVOKE ALL ON FUNCTION public.admin_list_people() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_people() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_people() TO service_role;

-- Backfill subscription dates where Stripe data already tells us
UPDATE public.profiles p
SET first_subscribed_at = COALESCE(p.first_subscribed_at, e.stripe_subscription_created_at)
FROM public.user_entitlements e
WHERE e.user_id = p.id AND e.stripe_subscription_created_at IS NOT NULL;