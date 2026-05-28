-- 1) Extend the status check constraint.
ALTER TABLE public.enforcement_actions
  DROP CONSTRAINT IF EXISTS enforcement_actions_primary_source_status_check;

ALTER TABLE public.enforcement_actions
  ADD CONSTRAINT enforcement_actions_primary_source_status_check
  CHECK (primary_source_status IN (
    'pending_discovery',
    'pending_fetch',
    'discovered_no_link',
    'discovered_aggregator_only',
    'fetch_error_summary',
    'fetch_error_source',
    'extracted_verbatim',
    'extracted_unverified',
    'manual_review_homepage',
    'deferred_gdprhub_anubis',
    'skipped_no_summary_url',
    'not_applicable'
  ));

-- 2) Reset AEPD "other" rows (non-aepd, non-gdprhub URLs) back to pending_discovery
--    before applying the gdprhub deferral, so they don't accidentally inherit it.
UPDATE public.enforcement_actions
SET primary_source_status = 'pending_discovery',
    primary_source_url_discovered_at = NULL
WHERE legacy_enrichment_version = 1
  AND primary_source_status IN ('discovered_no_link', 'discovered_aggregator_only')
  AND (
    regulator IN ('Agencia Española de Protección de Datos (AEPD)','Spanish Data Protection Authority (aepd)','AEPD')
    OR regulator_canonical IN ('Agencia Española de Protección de Datos (AEPD)','Spanish Data Protection Authority (aepd)','AEPD')
  )
  AND COALESCE(legacy_summary_url, '') NOT ILIKE '%gdprhub.eu%';

-- 3) Defer all GDPRhub-hosted rows corpus-wide (AEPD + others).
UPDATE public.enforcement_actions
SET primary_source_status = 'deferred_gdprhub_anubis',
    primary_source_url = NULL,
    primary_source_url_discovered_at = NULL
WHERE legacy_enrichment_version = 1
  AND legacy_summary_url ILIKE '%gdprhub.eu%'
  AND primary_source_status IN ('pending_discovery', 'discovered_no_link', 'discovered_aggregator_only', 'fetch_error_summary');
