ALTER TABLE public.enforcement_actions
  ADD COLUMN IF NOT EXISTS li_processed boolean NOT NULL DEFAULT false;

ALTER TABLE public.li_tracker_entries
  ADD COLUMN IF NOT EXISTS source_enforcement_id uuid;

CREATE INDEX IF NOT EXISTS idx_enforcement_actions_li_unprocessed
  ON public.enforcement_actions (decision_date DESC)
  WHERE li_processed = false;