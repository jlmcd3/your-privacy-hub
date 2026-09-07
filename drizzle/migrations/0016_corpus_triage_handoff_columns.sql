ALTER TABLE public.corpus_triage_results
  ADD COLUMN IF NOT EXISTS handoff_profile_id uuid,
  ADD COLUMN IF NOT EXISTS repaired_subject text;

CREATE UNIQUE INDEX IF NOT EXISTS arp_product_source_uidx
  ON public.authority_relevance_profiles (product, source_table, source_row_id);