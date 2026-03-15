CREATE TABLE IF NOT EXISTS public.updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text,
  url text UNIQUE NOT NULL,
  source_name text,
  source_domain text,
  image_url text,
  category text NOT NULL DEFAULT 'global',
  regulator text,
  published_at timestamptz NOT NULL DEFAULT now(),
  is_premium boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read updates"
  ON public.updates FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role manages updates"
  ON public.updates FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS updates_published_at_idx ON public.updates (published_at DESC);
CREATE INDEX IF NOT EXISTS updates_category_idx ON public.updates (category);