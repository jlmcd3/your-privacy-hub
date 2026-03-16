CREATE TABLE IF NOT EXISTS public.weekly_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_label text NOT NULL,
  headline text NOT NULL,
  executive_summary text NOT NULL,
  us_federal text,
  us_states text,
  eu_uk text,
  global_developments text,
  enforcement_table jsonb,
  trend_signal text,
  why_this_matters text,
  article_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Premium users can read briefs"
  ON public.weekly_briefs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manages briefs"
  ON public.weekly_briefs FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS weekly_briefs_published_at_idx
  ON public.weekly_briefs (published_at DESC);