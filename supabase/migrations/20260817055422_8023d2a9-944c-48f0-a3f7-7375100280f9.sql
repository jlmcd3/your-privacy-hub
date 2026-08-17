ALTER TABLE public.quality_batch_runs
  ADD COLUMN IF NOT EXISTS pins_mode text NOT NULL DEFAULT 'seed';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quality_batch_runs_pins_mode_check'
  ) THEN
    ALTER TABLE public.quality_batch_runs
      ADD CONSTRAINT quality_batch_runs_pins_mode_check
      CHECK (pins_mode IN ('only','seed','none'));
  END IF;
END $$;

COMMENT ON COLUMN public.quality_batch_runs.pins_mode IS
  'PROMPT 12G: only | seed | none. Supersedes pinned_only (pinned_only=true maps to only).';
COMMENT ON COLUMN public.quality_batch_runs.pinned_only IS
  'SUPERSEDED by pins_mode (PROMPT 12G). Kept for legacy rows: true maps to pins_mode=only.';

UPDATE public.quality_batch_runs SET pins_mode = 'only' WHERE pinned_only = true AND pins_mode = 'seed';