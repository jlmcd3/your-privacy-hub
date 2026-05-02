-- Public bucket for curated article fallback images
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-images', 'article-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for the bucket
DROP POLICY IF EXISTS "Public read article-images" ON storage.objects;
CREATE POLICY "Public read article-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'article-images');

-- Image pool catalog
CREATE TABLE IF NOT EXISTS public.article_image_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  public_url text NOT NULL,
  category text,
  source text NOT NULL DEFAULT 'unsplash',
  source_id text,
  photographer_name text,
  photographer_url text,
  query text,
  width int,
  height int,
  times_used int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_article_image_pool_category ON public.article_image_pool(category);
CREATE INDEX IF NOT EXISTS idx_article_image_pool_source ON public.article_image_pool(source);

ALTER TABLE public.article_image_pool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read image pool" ON public.article_image_pool;
CREATE POLICY "Public read image pool"
  ON public.article_image_pool FOR SELECT
  USING (true);

-- Track origin of image_url on updates
ALTER TABLE public.updates
  ADD COLUMN IF NOT EXISTS image_source text;

CREATE INDEX IF NOT EXISTS idx_updates_image_source ON public.updates(image_source);