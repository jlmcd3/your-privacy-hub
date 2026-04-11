
-- PART A: Add columns to the updates table
ALTER TABLE public.updates ADD COLUMN IF NOT EXISTS enrichment_version integer DEFAULT 0;
ALTER TABLE public.updates ADD COLUMN IF NOT EXISTS regulatory_theory text;
ALTER TABLE public.updates ADD COLUMN IF NOT EXISTS affected_sectors text[];
ALTER TABLE public.updates ADD COLUMN IF NOT EXISTS related_development text;
ALTER TABLE public.updates ADD COLUMN IF NOT EXISTS attention_level text;
ALTER TABLE public.updates ADD COLUMN IF NOT EXISTS key_date date;

CREATE INDEX IF NOT EXISTS idx_updates_attention_level ON public.updates (attention_level);
CREATE INDEX IF NOT EXISTS idx_updates_enrichment_version ON public.updates (enrichment_version);

-- PART B: Add column to trend_reports table
ALTER TABLE public.trend_reports ADD COLUMN IF NOT EXISTS enforcement_patterns jsonb;

-- PART C: Create longitudinal_signals table
CREATE TABLE IF NOT EXISTS public.longitudinal_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at timestamptz NOT NULL DEFAULT now(),
  topic_area text NOT NULL,
  period_days integer NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  summary text,
  key_observations jsonb,
  jurisdictions_active text[],
  sectors_affected text[],
  article_count integer,
  source_article_ids uuid[]
);

CREATE INDEX IF NOT EXISTS idx_longitudinal_topic ON public.longitudinal_signals (topic_area, generated_at DESC);

ALTER TABLE public.longitudinal_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read longitudinal_signals"
  ON public.longitudinal_signals FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role manages longitudinal_signals"
  ON public.longitudinal_signals FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- PART D: Regulatory knowledge graph tables
CREATE TABLE IF NOT EXISTS public.regulatory_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  name text NOT NULL,
  jurisdiction text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.regulatory_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read regulatory_entities"
  ON public.regulatory_entities FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role manages regulatory_entities"
  ON public.regulatory_entities FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.entity_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entity_id uuid REFERENCES public.regulatory_entities(id),
  to_entity_id uuid REFERENCES public.regulatory_entities(id),
  relationship text NOT NULL,
  source_article uuid REFERENCES public.updates(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.entity_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read entity_relationships"
  ON public.entity_relationships FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role manages entity_relationships"
  ON public.entity_relationships FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
