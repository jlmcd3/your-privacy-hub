
ALTER TABLE public.redeploy_queue DROP CONSTRAINT redeploy_queue_requested_by_fkey;
ALTER TABLE public.redeploy_queue
  ADD CONSTRAINT redeploy_queue_requested_by_fkey
  FOREIGN KEY (requested_by) REFERENCES auth.users(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_enforcement_actions_per_case_url
  ON public.enforcement_actions (regulator, source_url)
  WHERE source_url IS NOT NULL AND regulator IN ('FTC','HHS OCR');
