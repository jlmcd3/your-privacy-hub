
ALTER TABLE public.enforcement_actions
  ADD COLUMN IF NOT EXISTS primary_source_url text,
  ADD COLUMN IF NOT EXISTS primary_source_url_discovered_at timestamptz,
  ADD COLUMN IF NOT EXISTS primary_source_status text,
  ADD COLUMN IF NOT EXISTS source_document_text text,
  ADD COLUMN IF NOT EXISTS source_document_fetched_at timestamptz,
  ADD COLUMN IF NOT EXISTS legacy_summary_url text,
  ADD COLUMN IF NOT EXISTS legacy_summary_text text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'enforcement_actions_primary_source_status_check'
  ) THEN
    ALTER TABLE public.enforcement_actions
      ADD CONSTRAINT enforcement_actions_primary_source_status_check
      CHECK (primary_source_status IS NULL OR primary_source_status IN (
        'pending_discovery',
        'pending_fetch',
        'discovered_no_link',
        'discovered_aggregator_only',
        'fetched_ok',
        'fetch_404',
        'fetch_403',
        'fetch_timeout',
        'fetch_geo_blocked',
        'fetched_partial',
        'extracted_verbatim',
        'extracted_unverified'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ea_primary_source_status
  ON public.enforcement_actions (primary_source_status)
  WHERE legacy_enrichment_version = 1;

-- Track 3 two-path memo_eligible predicate.
-- Path A: per-regulator-pipeline row (non-legacy) with KCF + source_url.
-- Path B: any row Track 3 has verified against its primary source.
CREATE OR REPLACE FUNCTION public.recompute_memo_eligible_interim()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.enforcement_actions
  SET memo_eligible = (
    (
      -- Path A
      legacy_enrichment_version IS DISTINCT FROM 1
      AND key_compliance_failure IS NOT NULL AND key_compliance_failure <> ''
      AND source_url IS NOT NULL AND source_url <> ''
    )
    OR (
      -- Path B
      primary_source_status = 'extracted_verbatim'
    )
  )
  WHERE memo_eligible IS DISTINCT FROM (
    (
      legacy_enrichment_version IS DISTINCT FROM 1
      AND key_compliance_failure IS NOT NULL AND key_compliance_failure <> ''
      AND source_url IS NOT NULL AND source_url <> ''
    )
    OR (
      primary_source_status = 'extracted_verbatim'
    )
  );
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$function$;
