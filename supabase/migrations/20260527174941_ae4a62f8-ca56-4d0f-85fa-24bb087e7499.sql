
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
  SET memo_eligible = COALESCE(
    (
      legacy_enrichment_version IS DISTINCT FROM 1
      AND key_compliance_failure IS NOT NULL AND key_compliance_failure <> ''
      AND source_url IS NOT NULL AND source_url <> ''
    )
    OR (primary_source_status = 'extracted_verbatim'),
    false
  )
  WHERE memo_eligible IS DISTINCT FROM COALESCE(
    (
      legacy_enrichment_version IS DISTINCT FROM 1
      AND key_compliance_failure IS NOT NULL AND key_compliance_failure <> ''
      AND source_url IS NOT NULL AND source_url <> ''
    )
    OR (primary_source_status = 'extracted_verbatim'),
    false
  );
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$function$;
