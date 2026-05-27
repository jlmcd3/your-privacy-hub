
ALTER TABLE public.ingestion_runs
  ADD COLUMN IF NOT EXISTS regulator_canonical text,
  ADD COLUMN IF NOT EXISTS strategy_method text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rows_discovered integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rows_matched_legacy integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rows_inserted_new integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rows_failed integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS llm_calls_made integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS llm_cost_usd numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS errors jsonb DEFAULT '[]'::jsonb;
