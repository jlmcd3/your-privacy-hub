
ALTER TABLE public.article_image_pool
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('pending','approved','rejected'));

-- Backfill: anything already in pool stays approved (default handles it for existing rows in PG only when ADD COLUMN with default; safe explicit update too)
UPDATE public.article_image_pool SET approval_status = 'approved' WHERE approval_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_article_image_pool_approval ON public.article_image_pool(approval_status);

-- Admin write policies
DROP POLICY IF EXISTS "Admins manage image pool" ON public.article_image_pool;
CREATE POLICY "Admins manage image pool"
  ON public.article_image_pool
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
