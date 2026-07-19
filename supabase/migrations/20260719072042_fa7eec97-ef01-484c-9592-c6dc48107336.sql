
ALTER TABLE public.state_law_review_log DROP CONSTRAINT IF EXISTS state_law_review_log_status_check;
ALTER TABLE public.state_law_review_log ADD CONSTRAINT state_law_review_log_status_check
  CHECK (status = ANY (ARRAY['ok'::text, 'needs_update'::text, 'material_change'::text]));

GRANT SELECT ON public.state_law_review_log TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.state_law_review_log TO authenticated;
GRANT ALL ON public.state_law_review_log TO service_role;
