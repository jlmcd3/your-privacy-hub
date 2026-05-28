UPDATE public.enforcement_actions
SET primary_source_status = 'pending_fetch'
WHERE legacy_enrichment_version = 2
  AND primary_source_status = 'fetch_timeout'
  AND (lower(coalesce(regulator,'')) LIKE '%ftc%' OR lower(coalesce(regulator_canonical,'')) LIKE '%ftc%');