ALTER TABLE public.li_assessments ADD COLUMN IF NOT EXISTS preview_assessment_id TEXT;

COMMENT ON COLUMN public.li_assessments.preview_assessment_id IS 'V3 LIA: id of the free-preview li_assessments row this paid row was upgraded from. Lets intake-time readings keyed on the preview row be found by run-li-assessment without client re-keying.';

CREATE INDEX IF NOT EXISTS li_assessments_preview_assessment_id_idx
  ON public.li_assessments (preview_assessment_id)
  WHERE preview_assessment_id IS NOT NULL;