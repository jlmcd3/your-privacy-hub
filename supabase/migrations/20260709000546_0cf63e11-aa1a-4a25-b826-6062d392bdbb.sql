
-- 1. user_entitlements
CREATE TABLE public.user_entitlements (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  environment text NOT NULL CHECK (environment IN ('sandbox','live')),
  is_premium boolean NOT NULL DEFAULT false,
  is_pro boolean NOT NULL DEFAULT false,
  subscription_type text,
  stripe_subscription_id text,
  subscription_end_date timestamptz,
  stripe_trial_end timestamptz,
  payment_failed boolean NOT NULL DEFAULT false,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, environment)
);

GRANT SELECT ON public.user_entitlements TO authenticated;
GRANT ALL ON public.user_entitlements TO service_role;

ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own entitlements"
  ON public.user_entitlements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Backfill live entitlements from profiles
INSERT INTO public.user_entitlements (
  user_id, environment, is_premium, is_pro, subscription_type,
  stripe_subscription_id, subscription_end_date, stripe_trial_end,
  payment_failed, cancel_at_period_end, updated_at
)
SELECT
  id, 'live',
  COALESCE(is_premium, false),
  COALESCE(is_pro, false),
  subscription_type,
  stripe_subscription_id,
  subscription_end_date,
  stripe_trial_end,
  COALESCE(payment_failed, false),
  COALESCE(cancel_at_period_end, false),
  COALESCE(updated_at, now())
FROM public.profiles
WHERE COALESCE(is_premium, false)
   OR COALESCE(is_pro, false)
   OR subscription_type IS NOT NULL
   OR stripe_subscription_id IS NOT NULL
   OR subscription_end_date IS NOT NULL
   OR stripe_trial_end IS NOT NULL
   OR COALESCE(payment_failed, false)
   OR COALESCE(cancel_at_period_end, false)
ON CONFLICT (user_id, environment) DO NOTHING;

-- 3. environment column on annual_tool_credits & assessment_purchases
ALTER TABLE public.annual_tool_credits
  ADD COLUMN environment text NOT NULL DEFAULT 'live'
    CHECK (environment IN ('sandbox','live'));

ALTER TABLE public.assessment_purchases
  ADD COLUMN environment text NOT NULL DEFAULT 'live'
    CHECK (environment IN ('sandbox','live'));

CREATE INDEX idx_annual_tool_credits_env ON public.annual_tool_credits(user_id, environment);
CREATE INDEX idx_assessment_purchases_env ON public.assessment_purchases(user_id, environment);
