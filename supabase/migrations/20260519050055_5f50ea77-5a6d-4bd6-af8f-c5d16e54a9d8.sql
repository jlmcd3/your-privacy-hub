-- ============================================================
-- PRICING V2 MIGRATION
-- Founding subscriber programme + Professional annual +
-- free convenience run tracking per client
-- ============================================================

-- Founding subscriber flag on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS founding_subscriber        boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS founding_subscriber_set_at timestamptz,
  ADD COLUMN IF NOT EXISTS professional_annual        boolean     DEFAULT false;

-- Free convenience tool run tracking on professional_clients
ALTER TABLE professional_clients
  ADD COLUMN IF NOT EXISTS free_run_used_this_month boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS free_run_reset_date      date    DEFAULT CURRENT_DATE;

-- Index: fast lookup of founding subscribers
CREATE INDEX IF NOT EXISTS idx_profiles_founding
  ON profiles(founding_subscriber)
  WHERE founding_subscriber = true;

-- Trigger: auto-set founding_subscriber on first paid upgrade
CREATE OR REPLACE FUNCTION set_founding_subscriber()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF  NEW.subscription_tier  IN ('intelligence', 'professional')
  AND (OLD.subscription_tier IS NULL OR OLD.subscription_tier = 'free')
  AND NOW() < '2026-11-19 23:59:59+00'::timestamptz
  AND (NEW.founding_subscriber IS NULL OR NEW.founding_subscriber = false)
  THEN
    NEW.founding_subscriber        := true;
    NEW.founding_subscriber_set_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_founding_subscriber ON profiles;
CREATE TRIGGER trg_founding_subscriber
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_founding_subscriber();