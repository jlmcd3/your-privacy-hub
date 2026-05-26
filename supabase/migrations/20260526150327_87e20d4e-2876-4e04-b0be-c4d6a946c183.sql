
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
    source_url IS NOT NULL AND source_url <> ''
    AND statutory_provisions_extraction_method IN ('regex_high_confidence','pattern_per_regulator')
    AND COALESCE(array_length(statutory_provisions, 1), 0) >= 1
    AND key_compliance_failure IS NOT NULL AND key_compliance_failure <> ''
    AND law IS NOT NULL AND law <> ''
  )
  WHERE memo_eligible IS DISTINCT FROM (
    source_url IS NOT NULL AND source_url <> ''
    AND statutory_provisions_extraction_method IN ('regex_high_confidence','pattern_per_regulator')
    AND COALESCE(array_length(statutory_provisions, 1), 0) >= 1
    AND key_compliance_failure IS NOT NULL AND key_compliance_failure <> ''
    AND law IS NOT NULL AND law <> ''
  );
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$function$;
