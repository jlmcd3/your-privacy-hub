
-- Add LI columns to updates
ALTER TABLE public.updates ADD COLUMN IF NOT EXISTS li_relevant boolean DEFAULT false;
ALTER TABLE public.updates ADD COLUMN IF NOT EXISTS li_processed boolean DEFAULT false;

-- Create li_tracker_entries table
CREATE TABLE public.li_tracker_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processing_activity text NOT NULL,
  outcome text NOT NULL,
  signal_type text NOT NULL,
  dpa_source text NOT NULL,
  jurisdiction text NOT NULL,
  case_reference text,
  summary text NOT NULL,
  source_article_id uuid REFERENCES public.updates(id),
  confidence text NOT NULL DEFAULT 'medium',
  last_confirmed date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.li_tracker_entries ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for li_tracker_entries"
  ON public.li_tracker_entries FOR SELECT
  TO anon, authenticated
  USING (true);

-- Service role manages inserts/updates/deletes (no explicit policy needed as service_role bypasses RLS)

-- Create li_trend_summaries table
CREATE TABLE public.li_trend_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  summary text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.li_trend_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for li_trend_summaries"
  ON public.li_trend_summaries FOR SELECT
  TO anon, authenticated
  USING (true);
