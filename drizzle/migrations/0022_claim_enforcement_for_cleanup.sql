CREATE OR REPLACE FUNCTION public.claim_enforcement_for_cleanup(_limit integer DEFAULT 20)
RETURNS TABLE(
  id uuid,
  regulator text,
  jurisdiction text,
  subject text,
  law text,
  violation text,
  decision_date date,
  case_reference text,
  doc_text text
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
    WHERE ea.cleanup_version = 0
      AND ea.triage_class IN ('enrichable_full', 'enrichable_partial')
    ORDER BY ea.triage_class, ea.created_at DESC
    LIMIT GREATEST(COALESCE(_limit, 20), 1)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.enforcement_actions ea
  SET cleanup_version = -1
  FROM claimed
  WHERE ea.id = claimed.id
  RETURNING
    ea.id,
    ea.regulator,
    ea.jurisdiction,
    ea.subject,
    ea.law,
    ea.violation,
    ea.decision_date,
    ea.case_reference,
    LEFT(COALESCE(NULLIF(ea.source_document_text, ''), ea.raw_text, ''), 24000);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_enforcement_for_cleanup(integer) FROM PUBLIC, anon, authenticated;