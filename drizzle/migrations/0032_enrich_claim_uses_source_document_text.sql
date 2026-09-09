CREATE OR REPLACE FUNCTION public.claim_enforcement_for_enrichment(_limit integer, _target_version integer)
 RETURNS TABLE(id uuid, regulator text, jurisdiction text, subject text, sector text, law text, violation text, fine_amount text, fine_eur numeric, raw_text text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT ea.id
    FROM public.enforcement_actions ea
    WHERE COALESCE(ea.enrichment_version, 0) < _target_version
      AND COALESCE(ea.enrichment_version, 0) >= 0
    ORDER BY ea.created_at DESC
    LIMIT _limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.enforcement_actions ea
  SET enrichment_version = -1
  FROM claimed
  WHERE ea.id = claimed.id
  RETURNING
    ea.id,
    ea.regulator,
    ea.jurisdiction,
    ea.subject,
    ea.sector,
    ea.law,
    ea.violation,
    ea.fine_amount,
    ea.fine_eur,
    COALESCE(NULLIF(btrim(ea.raw_text), ''), ea.source_document_text) AS raw_text;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.claim_enforcement_for_enrichment(integer, integer) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_enforcement_for_enrichment(integer, integer) TO service_role;