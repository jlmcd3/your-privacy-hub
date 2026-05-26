
-- Allow 'no_pattern_found' on the statutory_provisions_extraction_method column
ALTER TABLE public.enforcement_actions
  DROP CONSTRAINT IF EXISTS enforcement_actions_extraction_method_chk;

ALTER TABLE public.enforcement_actions
  ADD CONSTRAINT enforcement_actions_extraction_method_chk
    CHECK (statutory_provisions_extraction_method IN (
      'none','regex_high_confidence','regex_low_confidence',
      'pattern_per_regulator','verified_from_source','manual','no_pattern_found'
    ));

-- Error log for extraction failures
CREATE TABLE IF NOT EXISTS public.corpus_extraction_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enforcement_action_id uuid REFERENCES public.enforcement_actions(id) ON DELETE CASCADE,
  stage text NOT NULL,
  error_message text NOT NULL,
  details jsonb,
  ran_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.corpus_extraction_errors TO service_role;

ALTER TABLE public.corpus_extraction_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY corpus_extraction_errors_service_all
  ON public.corpus_extraction_errors
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY corpus_extraction_errors_admin_read
  ON public.corpus_extraction_errors
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS corpus_extraction_errors_ran_at_idx
  ON public.corpus_extraction_errors (ran_at DESC);

-- Interim Memo-eligibility recompute (Prompt 3.3)
CREATE OR REPLACE FUNCTION public.recompute_memo_eligible_interim()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  );
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_memo_eligible_interim() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_memo_eligible_interim() TO authenticated;
