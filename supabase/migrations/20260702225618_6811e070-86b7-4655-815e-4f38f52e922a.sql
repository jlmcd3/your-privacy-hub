UPDATE public.static_stress_jobs
SET status = 'cancelled'
WHERE status = 'running'
  AND created_at < now() - interval '30 minutes';