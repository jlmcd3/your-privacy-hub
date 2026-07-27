ALTER TABLE public.quality_batch_runs
  ADD COLUMN IF NOT EXISTS declared_count integer,
  ADD COLUMN IF NOT EXISTS actual_count integer;
COMMENT ON COLUMN public.quality_batch_runs.declared_count IS
  '§16.n born-state: expected total docs at batch insert (tools * batch_size). NULL for historical rows (pre-2026-07-27); exempt from conformance assertion.';
COMMENT ON COLUMN public.quality_batch_runs.actual_count IS
  '§16.n terminal-state: observed complete docs at markTerminalAll. Conformance requires declared_count = actual_count when status = complete.';