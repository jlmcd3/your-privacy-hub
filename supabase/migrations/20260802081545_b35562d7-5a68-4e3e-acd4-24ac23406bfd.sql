ALTER TABLE public.edpb_oss_decisions
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS pdf_fetch_status text,
  ADD COLUMN IF NOT EXISTS pdf_fetch_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pdf_fetch_error text,
  ADD COLUMN IF NOT EXISTS pdf_fetched_at timestamptz;

ALTER TABLE public.edpb_oss_decisions
  DROP CONSTRAINT IF EXISTS edpb_oss_decisions_source_type_chk;
ALTER TABLE public.edpb_oss_decisions
  ADD CONSTRAINT edpb_oss_decisions_source_type_chk
  CHECK (source_type IS NULL OR source_type IN ('regulator_primary','regulator_press','third_party_tracker','third_party_commentary'));

UPDATE public.edpb_oss_decisions SET source_type = 'regulator_primary' WHERE source_type IS NULL;

CREATE INDEX IF NOT EXISTS edpb_oss_backfill_idx
  ON public.edpb_oss_decisions (pdf_fetch_attempts)
  WHERE doc_type = 'oss_decision' AND source_document_text IS NULL AND decision_pdf_url IS NOT NULL;