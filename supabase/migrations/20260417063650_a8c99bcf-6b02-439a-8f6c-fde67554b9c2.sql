-- Prompt 1: Add intelligence fields to enforcement_actions
ALTER TABLE public.enforcement_actions
  ADD COLUMN IF NOT EXISTS source_database text,
  ADD COLUMN IF NOT EXISTS data_categories text[],
  ADD COLUMN IF NOT EXISTS violation_types text[],
  ADD COLUMN IF NOT EXISTS industry_sector text,
  ADD COLUMN IF NOT EXISTS company_type text,
  ADD COLUMN IF NOT EXISTS key_compliance_failure text,
  ADD COLUMN IF NOT EXISTS preventive_measures text,
  ADD COLUMN IF NOT EXISTS tool_relevance text[],
  ADD COLUMN IF NOT EXISTS breach_related boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS biometric_related boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS dpa_related boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS precedent_significance smallint,
  ADD COLUMN IF NOT EXISTS enrichment_version smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS raw_text text,
  ADD COLUMN IF NOT EXISTS fine_eur_equivalent numeric(14,2);

-- Note: source_url, fine_eur, etid, jurisdiction, regulator, sector, action_type already exist.

-- Indexes for retrieval tool (Prompt 8)
CREATE INDEX IF NOT EXISTS idx_enforcement_enrichment_version ON public.enforcement_actions (enrichment_version);
CREATE INDEX IF NOT EXISTS idx_enforcement_tool_relevance ON public.enforcement_actions USING GIN (tool_relevance);
CREATE INDEX IF NOT EXISTS idx_enforcement_data_categories ON public.enforcement_actions USING GIN (data_categories);
CREATE INDEX IF NOT EXISTS idx_enforcement_biometric ON public.enforcement_actions (biometric_related) WHERE biometric_related = true;
CREATE INDEX IF NOT EXISTS idx_enforcement_source_url ON public.enforcement_actions (source_url);
CREATE INDEX IF NOT EXISTS idx_enforcement_etid ON public.enforcement_actions (etid);
CREATE INDEX IF NOT EXISTS idx_enforcement_significance_date ON public.enforcement_actions (precedent_significance DESC, decision_date DESC);

-- Cache table for Prompt 8 retrieval API
CREATE TABLE IF NOT EXISTS public.enforcement_context_cache (
  cache_key text PRIMARY KEY,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enforcement_context_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages enforcement_context_cache"
  ON public.enforcement_context_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_enforcement_context_cache_created ON public.enforcement_context_cache (created_at);