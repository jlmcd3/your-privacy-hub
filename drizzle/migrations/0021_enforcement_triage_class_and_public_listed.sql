ALTER TABLE public.enforcement_actions
  ADD COLUMN IF NOT EXISTS triage_class text,
  ADD COLUMN IF NOT EXISTS triage_reason text,
  ADD COLUMN IF NOT EXISTS triage_at timestamptz,
  ADD COLUMN IF NOT EXISTS public_listed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cleanup_version smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cleanup_last_error text;

CREATE INDEX IF NOT EXISTS enforcement_actions_triage_class_idx
  ON public.enforcement_actions (triage_class);

CREATE INDEX IF NOT EXISTS enforcement_actions_cleanup_queue_idx
  ON public.enforcement_actions (cleanup_version, triage_class)
  WHERE cleanup_version = 0;

CREATE INDEX IF NOT EXISTS enforcement_actions_public_listed_idx
  ON public.enforcement_actions (public_listed)
  WHERE public_listed = true;

-- Admin worklist: expose triage class alongside the existing flag fields.
DROP FUNCTION IF EXISTS public.list_flagged_enforcement_actions(integer, integer);

CREATE OR REPLACE FUNCTION public.list_flagged_enforcement_actions(
  _limit integer DEFAULT 200,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  subject text,
  regulator text,
  jurisdiction text,
  decision_date date,
  case_reference text,
  source_url text,
  quality_flags text[],
  quality_flagged_at timestamptz,
  triage_class text,
  triage_reason text,
  public_listed boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ea.id, ea.subject, ea.regulator, ea.jurisdiction, ea.decision_date,
         ea.case_reference, ea.source_url, ea.quality_flags, ea.quality_flagged_at,
         ea.triage_class, ea.triage_reason, ea.public_listed
  FROM public.enforcement_actions ea
  WHERE ea.quality_flags IS NOT NULL
    AND array_length(ea.quality_flags, 1) > 0
    AND public.has_role(auth.uid(), 'admin')
  ORDER BY ea.quality_flagged_at DESC NULLS LAST, ea.created_at DESC
  LIMIT COALESCE(_limit, 200) OFFSET COALESCE(_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION public.list_flagged_enforcement_actions(integer, integer) TO authenticated;