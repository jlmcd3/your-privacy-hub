ALTER TABLE public.updates
  ADD COLUMN IF NOT EXISTS product_ctas jsonb NOT NULL DEFAULT '[]'::jsonb;