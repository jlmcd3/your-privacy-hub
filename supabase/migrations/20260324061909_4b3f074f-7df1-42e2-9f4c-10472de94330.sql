ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bonus_report_credits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_reports_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reports_reset_date date DEFAULT CURRENT_DATE;