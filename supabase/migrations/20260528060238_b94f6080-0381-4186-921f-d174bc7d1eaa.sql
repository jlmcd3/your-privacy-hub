ALTER TABLE public.enforcement_actions
  ADD COLUMN IF NOT EXISTS statutory_provisions_evidence jsonb;

COMMENT ON COLUMN public.enforcement_actions.statutory_provisions_evidence IS
  'Per-provision audit trail. Array of {provision, evidence_quote, verified, source_lang}. evidence_quote is a verbatim substring of source_document_text in the regulator''s original language. Written only when primary_source_status = ''extracted_verbatim''.';

CREATE INDEX IF NOT EXISTS idx_enforcement_actions_stat_evidence
  ON public.enforcement_actions USING gin (statutory_provisions_evidence);