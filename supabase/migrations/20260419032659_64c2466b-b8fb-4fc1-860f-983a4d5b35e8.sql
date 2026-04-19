-- 1. Add subscription_tier to profiles (interval column already exists; only add tier)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT
    CHECK (subscription_tier IN ('free','professional','grandfathered_premium'));

-- 2. horizon_intelligence
CREATE TABLE IF NOT EXISTS public.horizon_intelligence (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_of                 DATE NOT NULL,
  jurisdiction            TEXT,
  sector                  TEXT,
  anticipated_development TEXT NOT NULL,
  timeline_label          TEXT,
  confidence              TEXT CHECK (confidence IN ('high','medium','speculative')),
  source_signal           TEXT,
  recommended_action      TEXT,
  created_at              TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.horizon_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read horizon_intelligence"
  ON public.horizon_intelligence FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role manages horizon_intelligence"
  ON public.horizon_intelligence FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- 3. sponsorships
CREATE TABLE IF NOT EXISTS public.sponsorships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_name TEXT NOT NULL,
  logo_url     TEXT,
  link_url     TEXT,
  label        TEXT DEFAULT 'Sponsored by',
  placement    TEXT,
  active       BOOLEAN DEFAULT true,
  starts_at    TIMESTAMPTZ,
  ends_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sponsorships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active sponsorships"
  ON public.sponsorships FOR SELECT
  TO anon, authenticated
  USING (active = true);

CREATE POLICY "Service role manages sponsorships"
  ON public.sponsorships FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- 4. Backfill subscription_tier
UPDATE public.profiles SET subscription_tier = CASE
  WHEN subscription_plan = 'grandfathered_premium' THEN 'grandfathered_premium'
  WHEN is_premium = true OR is_pro = true THEN 'professional'
  ELSE 'free'
END WHERE subscription_tier IS NULL;