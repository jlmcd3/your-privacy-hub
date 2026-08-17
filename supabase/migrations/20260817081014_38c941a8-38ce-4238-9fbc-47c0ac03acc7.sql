UPDATE public.quality_runs
SET cancel_requested = true,
    status = 'cancelled',
    completed_at = now(),
    error = COALESCE(NULLIF(error,''), 'cancelled: parent batch 86bdbdd0 failed during intake generation')
WHERE id = 'c1248cb6-1821-46de-880e-89a2d60fc845'
  AND status NOT IN ('complete','cancelled','failed');

UPDATE public.quality_batch_runs
SET cancel_requested = true
WHERE id = '86bdbdd0-63e8-4715-8f91-4f4f48892b19';