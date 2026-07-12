ALTER TABLE public.li_assessments
  ADD COLUMN IF NOT EXISTS supplemental_responses jsonb,
  ADD COLUMN IF NOT EXISTS supplemental_context text;