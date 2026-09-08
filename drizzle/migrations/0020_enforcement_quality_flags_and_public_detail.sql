ALTER TABLE public.enforcement_actions
  ADD COLUMN IF NOT EXISTS quality_flags text[],
  ADD COLUMN IF NOT EXISTS quality_flagged_at timestamptz;

CREATE OR REPLACE FUNCTION public.get_enforcement_action_public(_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(x) FROM (
    SELECT
      e.id, e.etid, e.regulator, e.subject, e.jurisdiction, e.decision_date,
      e.fine_amount, e.fine_eur, e.fine_eur_equivalent, e.law, e.violation,
      e.source_url, e.case_reference, e.source_database, e.industry_sector,
      e.company_type, e.data_categories, e.violation_types, e.tool_relevance,
      e.key_compliance_failure, e.preventive_measures, e.precedent_significance,
      e.breach_related, e.biometric_related, e.dpa_related, e.quality_flags
    FROM public.enforcement_actions e
    WHERE e.id = _id
      AND (e.verification_status IS DISTINCT FROM 'rejected')
      AND (e.verification_status IS DISTINCT FROM 'requires_review')
  ) x;
$$;

GRANT EXECUTE ON FUNCTION public.get_enforcement_action_public(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.list_flagged_enforcement_actions(_limit integer DEFAULT 500, _offset integer DEFAULT 0)
RETURNS TABLE(
  id uuid, subject text, regulator text, jurisdiction text,
  decision_date date, case_reference text, source_url text,
  quality_flags text[], quality_flagged_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.subject, e.regulator, e.jurisdiction, e.decision_date,
         e.case_reference, e.source_url, e.quality_flags, e.quality_flagged_at
  FROM public.enforcement_actions e
  WHERE e.quality_flags IS NOT NULL
    AND array_length(e.quality_flags, 1) > 0
    AND public.has_role(auth.uid(), 'admin')
  ORDER BY e.decision_date DESC NULLS LAST
  LIMIT _limit OFFSET _offset;
$$;

GRANT EXECUTE ON FUNCTION public.list_flagged_enforcement_actions(integer, integer) TO authenticated;
