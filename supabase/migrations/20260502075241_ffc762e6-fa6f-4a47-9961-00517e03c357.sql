
-- Bills table
CREATE TABLE public.legislation_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,                 -- e.g. 'us-congress', 'eu-eurlex', 'uk-parliament'
  external_id TEXT NOT NULL,            -- source-native bill identifier
  jurisdiction TEXT NOT NULL,           -- display name, e.g. 'United States'
  iso2 TEXT,                            -- 2-letter code, e.g. 'US', 'GB', 'EU'
  jurisdiction_slug TEXT,               -- maps to /jurisdiction/:slug when one exists
  region TEXT,                          -- 'Americas' | 'Europe' | 'Asia-Pacific' | etc.
  bill_name TEXT NOT NULL,
  bill_number TEXT,
  stage TEXT NOT NULL,                  -- 'enacted' | 'passed' | 'committee' | 'introduced' | 'proposed' | 'withdrawn'
  summary TEXT,
  key_provisions TEXT[] DEFAULT '{}',
  source_url TEXT,
  source_name TEXT,                     -- human-readable, e.g. 'Congress.gov'
  introduced_at DATE,
  source_last_action_at DATE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'stale' | 'withdrawn'
  raw_payload JSONB,
  matched_keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT legislation_bills_source_external_unique UNIQUE (source, external_id)
);

CREATE INDEX idx_legislation_bills_status ON public.legislation_bills(status);
CREATE INDEX idx_legislation_bills_region ON public.legislation_bills(region);
CREATE INDEX idx_legislation_bills_stage ON public.legislation_bills(stage);
CREATE INDEX idx_legislation_bills_jurisdiction ON public.legislation_bills(jurisdiction);
CREATE INDEX idx_legislation_bills_last_seen ON public.legislation_bills(last_seen_at DESC);

ALTER TABLE public.legislation_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active legislation bills"
  ON public.legislation_bills
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('active', 'stale'));

CREATE POLICY "Service role manages legislation bills"
  ON public.legislation_bills
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_legislation_bills_updated_at
  BEFORE UPDATE ON public.legislation_bills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Ingestion run log
CREATE TABLE public.legislation_ingestion_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'running',  -- 'running' | 'success' | 'partial' | 'failed'
  fetched INTEGER NOT NULL DEFAULT 0,
  inserted INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL DEFAULT 0,
  unchanged INTEGER NOT NULL DEFAULT 0,
  rejected INTEGER NOT NULL DEFAULT 0,
  rejected_samples JSONB DEFAULT '[]'::jsonb, -- [{title, reason}]
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_legislation_runs_source ON public.legislation_ingestion_runs(source, started_at DESC);
CREATE INDEX idx_legislation_runs_started ON public.legislation_ingestion_runs(started_at DESC);

ALTER TABLE public.legislation_ingestion_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read legislation ingestion runs"
  ON public.legislation_ingestion_runs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages legislation ingestion runs"
  ON public.legislation_ingestion_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
