ALTER TABLE public.enforcement_actions
  ADD COLUMN IF NOT EXISTS doc_source text;

COMMENT ON COLUMN public.enforcement_actions.doc_source IS
  'Provenance of raw_text: source_document_text | source_document_cache | legacy_summary_text | fetch';

CREATE INDEX IF NOT EXISTS enforcement_actions_doc_source_idx
  ON public.enforcement_actions (doc_source);