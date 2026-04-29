ALTER TABLE public.updates
  ADD COLUMN IF NOT EXISTS why_it_matters_short text,
  ADD COLUMN IF NOT EXISTS related_signals jsonb DEFAULT '[]'::jsonb;