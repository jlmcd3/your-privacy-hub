-- EUP Pricing Prompt 1: per-subscriber free-run pool counter + biometric one-time-run flag
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_convenience_runs_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_runs_reset_date DATE,
  ADD COLUMN IF NOT EXISTS biometric_free_run_claimed BOOLEAN NOT NULL DEFAULT false;

-- Initialize the reset date for all existing profiles to the start of the current month
UPDATE public.profiles
SET free_runs_reset_date = date_trunc('month', now())::date
WHERE free_runs_reset_date IS NULL;