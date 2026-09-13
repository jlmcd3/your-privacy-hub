-- /all-ptest scoring. All columns are additive and nullable, so existing
-- batches keep working and simply show no score.

ALTER TABLE public.ptest_reviews
  ADD COLUMN IF NOT EXISTS dimension_scores jsonb,
  ADD COLUMN IF NOT EXISTS overall_score numeric,
  ADD COLUMN IF NOT EXISTS derived_score numeric,
  ADD COLUMN IF NOT EXISTS score_source text,
  ADD COLUMN IF NOT EXISTS score_notes text;

ALTER TABLE public.ptest_arbitrations
  ADD COLUMN IF NOT EXISTS agreed_score numeric,
  ADD COLUMN IF NOT EXISTS score_notes text;

ALTER TABLE public.ptest_batches
  ADD COLUMN IF NOT EXISTS scores jsonb,
  ADD COLUMN IF NOT EXISTS batch_mean numeric;