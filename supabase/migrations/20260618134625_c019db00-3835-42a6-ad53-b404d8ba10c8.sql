UPDATE public.quality_runs
SET status = 'error',
    error = 'Stuck in evaluating with no progress log — edge function wall-clock timeout. Cleared by admin.',
    completed_at = now()
WHERE tool = 'biometric-checker'
  AND run_number = 2
  AND status = 'evaluating';