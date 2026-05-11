UPDATE public.ingestion_runs
SET status = 'error',
    finished_at = now(),
    error_message = COALESCE(error_message, 'Auto-reaped: stuck in running state; function likely exceeded wall-clock limit before finishRun() could record completion.')
WHERE status = 'running'
  AND run_at < now() - interval '10 minutes';