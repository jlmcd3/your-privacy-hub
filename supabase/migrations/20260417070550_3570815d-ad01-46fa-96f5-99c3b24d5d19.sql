CREATE OR REPLACE FUNCTION public.claim_enforcement_for_enrichment(_limit int, _target_version int)
RETURNS TABLE (
  id uuid,
  regulator text,
  jurisdiction text,
  subject text,
  sector text,
  law text,
  violation text,
  fine_amount text,
  fine_eur numeric,
  raw_text text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT ea.id
    FROM public.enforcement_actions ea
    WHERE COALESCE(ea.enrichment_version, 0) < _target_version
      AND COALESCE(ea.enrichment_version, 0) >= 0  -- skip rows marked in-progress (-1)
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
    ea.raw_text;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_enforcement_for_enrichment(int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_enforcement_for_enrichment(int, int) TO service_role;