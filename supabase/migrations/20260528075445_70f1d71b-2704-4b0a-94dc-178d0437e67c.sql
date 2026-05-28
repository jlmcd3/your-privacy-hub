ALTER TABLE public.enforcement_actions
  DROP CONSTRAINT IF EXISTS enforcement_actions_primary_source_status_check;

ALTER TABLE public.enforcement_actions
  ADD CONSTRAINT enforcement_actions_primary_source_status_check
  CHECK (primary_source_status = ANY (ARRAY[
    'pending_discovery',
    'pending_fetch',
    'discovered_no_link',
    'discovered_aggregator_only',
    'fetch_error_summary',
    'fetch_error_source',
    'fetch_404',
    'fetch_403',
    'fetch_timeout',
    'fetched_partial',
    'extracted_verbatim',
    'extracted_unverified',
    'manual_review_homepage',
    'deferred_gdprhub_anubis',
    'skipped_no_summary_url',
    'not_applicable'
  ]));