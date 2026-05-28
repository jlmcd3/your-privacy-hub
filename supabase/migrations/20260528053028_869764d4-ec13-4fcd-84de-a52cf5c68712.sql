-- Step 1: Reset the 20 mis-tagged AEPD rows back to pending_discovery so Path A picks them up.
UPDATE public.enforcement_actions
SET primary_source_status = 'pending_discovery',
    primary_source_url_discovered_at = NULL
WHERE primary_source_status = 'discovered_no_link'
  AND legacy_enrichment_version = 1
  AND (
    regulator IN ('Agencia Española de Protección de Datos (AEPD)', 'Spanish Data Protection Authority (aepd)', 'AEPD')
    OR regulator_canonical IN ('Agencia Española de Protección de Datos (AEPD)', 'Spanish Data Protection Authority (aepd)', 'AEPD')
  );

-- Step 2: Flag the AEPD homepage URL row(s) as manual_review_homepage so they don't get promoted.
-- Extend the check constraint to allow the new status value.
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
    'skipped_no_summary_url',
    'not_applicable'
  ));

UPDATE public.enforcement_actions
SET primary_source_status = 'manual_review_homepage'
WHERE legacy_enrichment_version = 1
  AND primary_source_status = 'pending_discovery'
  AND (
    regulator IN ('Agencia Española de Protección de Datos (AEPD)', 'Spanish Data Protection Authority (aepd)', 'AEPD')
    OR regulator_canonical IN ('Agencia Española de Protección de Datos (AEPD)', 'Spanish Data Protection Authority (aepd)', 'AEPD')
  )
  AND legacy_summary_url IS NOT NULL
  AND legacy_summary_url !~* '\.pdf($|\?)'
  AND legacy_summary_url ~* '^https?://(www\.)?aepd\.es(/|$)';

-- Step 3: Path A promotion — direct AEPD PDF URLs → pending_fetch.
UPDATE public.enforcement_actions
SET primary_source_url = legacy_summary_url,
    primary_source_url_discovered_at = now(),
    primary_source_status = 'pending_fetch'
WHERE legacy_enrichment_version = 1
  AND primary_source_status = 'pending_discovery'
  AND (
    regulator IN ('Agencia Española de Protección de Datos (AEPD)', 'Spanish Data Protection Authority (aepd)', 'AEPD')
    OR regulator_canonical IN ('Agencia Española de Protección de Datos (AEPD)', 'Spanish Data Protection Authority (aepd)', 'AEPD')
  )
  AND legacy_summary_url IS NOT NULL
  AND legacy_summary_url ~* '\.pdf($|\?)'
  AND lower(split_part(split_part(legacy_summary_url, '://', 2), '/', 1)) IN ('aepd.es', 'www.aepd.es');
