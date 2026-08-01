ALTER TABLE public.enforcement_actions
  ADD COLUMN IF NOT EXISTS instrument_class TEXT,
  ADD COLUMN IF NOT EXISTS instrument_class_extraction_method TEXT;

CREATE INDEX IF NOT EXISTS enforcement_actions_instrument_class_idx
  ON public.enforcement_actions (instrument_class);

CREATE TABLE IF NOT EXISTS public.verification_sweep_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sweep_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  batch_index INTEGER,
  start_after_id TEXT,
  last_id TEXT,
  processed INTEGER NOT NULL DEFAULT 0,
  verified INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  requires_review INTEGER NOT NULL DEFAULT 0,
  skipped_short_doc INTEGER NOT NULL DEFAULT 0,
  batch_cost_usd NUMERIC NOT NULL DEFAULT 0,
  cumulative_cost_usd NUMERIC NOT NULL DEFAULT 0,
  budget_cap_usd NUMERIC,
  halted_reason TEXT,
  failure_reasons JSONB,
  tokens JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS verification_sweep_ledger_sweep_idx
  ON public.verification_sweep_ledger (sweep_id, created_at DESC);

GRANT ALL ON public.verification_sweep_ledger TO service_role;

ALTER TABLE public.verification_sweep_ledger ENABLE ROW LEVEL SECURITY;