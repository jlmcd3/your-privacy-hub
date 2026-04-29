ALTER TABLE public.updates
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_updates_is_hidden ON public.updates (is_hidden) WHERE is_hidden = false;