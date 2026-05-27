
-- Stage 1.1: New columns on enforcement_actions
ALTER TABLE public.enforcement_actions
  ADD COLUMN IF NOT EXISTS regulator_canonical text,
  ADD COLUMN IF NOT EXISTS ingestion_method text,
  ADD COLUMN IF NOT EXISTS ingestion_strategy_used text,
  ADD COLUMN IF NOT EXISTS ingestion_run_id uuid,
  ADD COLUMN IF NOT EXISTS regulator_profile_version text,
  ADD COLUMN IF NOT EXISTS source_document_hash_at_ingest text,
  ADD COLUMN IF NOT EXISTS ingestion_confidence text,
  ADD COLUMN IF NOT EXISTS fine_amount_local text,
  ADD COLUMN IF NOT EXISTS fine_currency text;
-- fine_eur_equivalent already exists per schema check; skip.

-- Constraint for ingestion_confidence values
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'enforcement_actions_ingestion_confidence_check') THEN
    ALTER TABLE public.enforcement_actions
      ADD CONSTRAINT enforcement_actions_ingestion_confidence_check
      CHECK (ingestion_confidence IS NULL OR ingestion_confidence IN ('high','medium','low'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ea_canonical_date
  ON public.enforcement_actions (regulator_canonical, decision_date);
CREATE INDEX IF NOT EXISTS idx_ea_legacy_version
  ON public.enforcement_actions (legacy_enrichment_version);
CREATE INDEX IF NOT EXISTS idx_ea_law_sector
  ON public.enforcement_actions (law, sector);

-- Stage 1.2: ingestion_runs
CREATE TABLE IF NOT EXISTS public.ingestion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regulator_canonical text NOT NULL,
  strategy_method text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  rows_discovered integer DEFAULT 0,
  rows_matched_legacy integer DEFAULT 0,
  rows_inserted_new integer DEFAULT 0,
  rows_updated integer DEFAULT 0,
  rows_skipped integer DEFAULT 0,
  rows_failed integer DEFAULT 0,
  llm_calls_made integer DEFAULT 0,
  llm_cost_usd numeric(8,4) DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  notes text
);
GRANT ALL ON public.ingestion_runs TO service_role;
GRANT SELECT ON public.ingestion_runs TO authenticated;
ALTER TABLE public.ingestion_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins view ingestion runs" ON public.ingestion_runs;
CREATE POLICY "Admins view ingestion runs" ON public.ingestion_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Stage 1.3: regulator_profiles
CREATE TABLE IF NOT EXISTS public.regulator_profiles (
  canonical_name text PRIMARY KEY,
  profile_version text NOT NULL DEFAULT '1.0',
  jurisdiction text NOT NULL,
  regulatory_family text[] NOT NULL DEFAULT '{}',
  law_canonical text NOT NULL,
  default_language text NOT NULL,
  date_formats text[] NOT NULL DEFAULT '{}',
  case_reference_pattern text,
  currency_code text NOT NULL DEFAULT 'EUR',
  fetch_user_agent_strategy text NOT NULL DEFAULT 'browser_first',
  fetch_rate_limit_ms integer NOT NULL DEFAULT 2000,
  requires_js_render boolean NOT NULL DEFAULT false,
  respect_robots_txt boolean NOT NULL DEFAULT true,
  strategy_stack jsonb NOT NULL DEFAULT '[]'::jsonb,
  field_recipes jsonb NOT NULL DEFAULT '{}'::jsonb,
  llm_extraction_model text NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
  coverage_assessment text,
  known_issues text[],
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.regulator_profiles TO service_role;
GRANT SELECT ON public.regulator_profiles TO authenticated;
ALTER TABLE public.regulator_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins view regulator profiles" ON public.regulator_profiles;
CREATE POLICY "Admins view regulator profiles" ON public.regulator_profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
