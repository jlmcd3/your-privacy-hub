ALTER TABLE public.enforcement_actions
  ADD COLUMN IF NOT EXISTS review_reason text;

COMMENT ON COLUMN public.enforcement_actions.review_reason IS
  'Item 334: why a row sits in requires_review. ''corpus_defect_subject'' = mechanical corpus defect found by subject_quality_precheck (not a genuine legal review item); ''verification_uncertain'' = model-driven routing; NULL = unspecified/genuine.';

CREATE INDEX IF NOT EXISTS idx_enforcement_actions_review_reason
  ON public.enforcement_actions (review_reason)
  WHERE review_reason IS NOT NULL;

UPDATE public.enforcement_actions ea
SET review_reason = 'corpus_defect_subject'
WHERE ea.verification_status = 'requires_review'
  AND ea.review_reason IS NULL
  AND EXISTS (
    SELECT 1 FROM public.verification_results vr
    WHERE vr.enforcement_action_id = ea.id
      AND vr.check_name = 'subject_quality_precheck'
      AND vr.verdict = 'fail'
  );