
ALTER TABLE public.weekly_briefs
  ADD COLUMN IF NOT EXISTS ai_governance text,
  ADD COLUMN IF NOT EXISTS biometric_data text,
  ADD COLUMN IF NOT EXISTS privacy_litigation text,
  ADD COLUMN IF NOT EXISTS enforcement_trends text,
  ADD COLUMN IF NOT EXISTS source_map jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS verification_report jsonb;
