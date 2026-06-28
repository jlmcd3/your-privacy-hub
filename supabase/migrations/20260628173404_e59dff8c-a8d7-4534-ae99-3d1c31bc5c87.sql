UPDATE public.quality_runs
SET status = 'cancelled',
    cancel_requested = true,
    completed_at = COALESCE(completed_at, now()),
    error = COALESCE(error, 'Manually stopped by admin')
WHERE status IN ('running', 'pending', 'queued', 'in_progress');