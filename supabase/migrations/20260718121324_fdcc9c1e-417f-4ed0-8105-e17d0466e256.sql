
UPDATE public.report_translations
SET last_progress_at = now() - interval '5 minutes'
WHERE id = '4e2eafa5-52f5-4c6d-a963-1408c8a8c12e';
