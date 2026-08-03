ALTER TABLE public.enforcement_actions
  ADD COLUMN IF NOT EXISTS resweep_pending boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS refetch_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refetch_last_error text,
  ADD COLUMN IF NOT EXISTS refetch_last_attempt_at timestamptz;

CREATE INDEX IF NOT EXISTS enforcement_actions_resweep_pending_idx
  ON public.enforcement_actions (id) WHERE resweep_pending;

CREATE INDEX IF NOT EXISTS enforcement_actions_refetch_priority_idx
  ON public.enforcement_actions (refetch_attempts, refetch_last_attempt_at NULLS FIRST);