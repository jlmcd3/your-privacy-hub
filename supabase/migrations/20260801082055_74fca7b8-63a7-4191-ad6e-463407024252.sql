ALTER TABLE public.quality_batch_runs
  ADD COLUMN IF NOT EXISTS fixture_variant text,
  ADD COLUMN IF NOT EXISTS tool_variants jsonb;

ALTER TABLE public.quality_runs
  ADD COLUMN IF NOT EXISTS fixture_variant text;

ALTER TABLE public.quality_run_documents
  ADD COLUMN IF NOT EXISTS fixture_variant text;

ALTER TABLE public.quality_batch_runs
  ADD CONSTRAINT quality_batch_runs_fixture_variant_chk
  CHECK (fixture_variant IS NULL OR fixture_variant IN ('perfect','messy')) NOT VALID;

ALTER TABLE public.quality_runs
  ADD CONSTRAINT quality_runs_fixture_variant_chk
  CHECK (fixture_variant IS NULL OR fixture_variant IN ('perfect','messy')) NOT VALID;

ALTER TABLE public.quality_run_documents
  ADD CONSTRAINT quality_run_documents_fixture_variant_chk
  CHECK (fixture_variant IS NULL OR fixture_variant IN ('perfect','messy')) NOT VALID;