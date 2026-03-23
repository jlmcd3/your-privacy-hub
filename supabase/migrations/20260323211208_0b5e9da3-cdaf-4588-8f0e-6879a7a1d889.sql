-- Create trend_reports table
CREATE TABLE IF NOT EXISTS public.trend_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  period TEXT NOT NULL DEFAULT 'weekly',
  top_trends JSONB NOT NULL DEFAULT '[]'::jsonb,
  emerging_risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  affected_industries JSONB NOT NULL DEFAULT '[]'::jsonb,
  jurisdictions JSONB NOT NULL DEFAULT '[]'::jsonb,
  regulatory_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_score FLOAT NOT NULL DEFAULT 0.0,
  article_count INTEGER NOT NULL DEFAULT 0,
  source_article_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast latest-report queries
CREATE INDEX idx_trend_reports_date ON public.trend_reports(date DESC);
CREATE INDEX idx_trend_reports_period ON public.trend_reports(period, date DESC);

-- Unique constraint for upsert
CREATE UNIQUE INDEX idx_trend_reports_date_period ON public.trend_reports(date, period);

-- Enable RLS
ALTER TABLE public.trend_reports ENABLE ROW LEVEL SECURITY;

-- Public read (anyone can see trend reports)
CREATE POLICY "trend_reports_public_read"
  ON public.trend_reports FOR SELECT TO anon, authenticated
  USING (true);

-- Only service role can insert/update (edge functions)
CREATE POLICY "trend_reports_service_insert"
  ON public.trend_reports FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "trend_reports_service_update"
  ON public.trend_reports FOR UPDATE TO service_role
  USING (true);