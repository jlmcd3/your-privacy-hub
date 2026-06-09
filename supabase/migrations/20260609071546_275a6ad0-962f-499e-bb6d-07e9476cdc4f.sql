ALTER TABLE public.cppa_assessments
  ADD COLUMN IF NOT EXISTS obligation_snapshot jsonb;

COMMENT ON COLUMN public.cppa_assessments.obligation_snapshot IS
  'Frozen snapshot at assessment time: { authorities: [{citation, version, authority_weight, effective_date, official_url, title, status}], fsor: [{id, regulation_citation, page_ref}], captured_at, corpus_version }. Ensures the report is reproducible against the exact regulatory state used.';

CREATE INDEX IF NOT EXISTS cppa_assessments_has_snapshot_idx
  ON public.cppa_assessments ((obligation_snapshot IS NOT NULL));