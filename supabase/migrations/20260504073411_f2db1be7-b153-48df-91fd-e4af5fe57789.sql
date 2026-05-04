-- Subscription tier tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_subscription_type_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_subscription_type_check
      CHECK (subscription_type IS NULL OR subscription_type IN ('monthly', 'annual', 'annual_founding'));
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS founding_subscriber BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_type
  ON public.profiles(subscription_type)
  WHERE subscription_type IS NOT NULL;

CREATE OR REPLACE VIEW public.founding_subscriber_count AS
  SELECT COUNT(*)::int AS total
  FROM public.profiles
  WHERE subscription_type = 'annual_founding'
     OR founding_subscriber = TRUE;

CREATE OR REPLACE FUNCTION public.is_founding_rate_available()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT COUNT(*) FROM public.profiles
     WHERE subscription_type = 'annual_founding'
        OR founding_subscriber = TRUE
  ) < 500;
$$;