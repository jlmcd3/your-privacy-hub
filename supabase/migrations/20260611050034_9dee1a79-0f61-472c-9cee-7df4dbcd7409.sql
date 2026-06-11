CREATE TABLE public.research_freshness_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug text NOT NULL,
  feed_category text NOT NULL,
  page_last_updated date,
  new_articles_count integer NOT NULL DEFAULT 0,
  top_headlines jsonb NOT NULL DEFAULT '[]'::jsonb,
  flagged boolean NOT NULL DEFAULT false,
  checked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT research_freshness_flags_page_slug_key UNIQUE (page_slug)
);

GRANT SELECT ON public.research_freshness_flags TO authenticated;
GRANT ALL ON public.research_freshness_flags TO service_role;

ALTER TABLE public.research_freshness_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read research freshness flags"
  ON public.research_freshness_flags
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages research freshness flags"
  ON public.research_freshness_flags
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);