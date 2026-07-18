
UPDATE public.report_translations
SET status = 'translating',
    error_message = NULL,
    resume_count = 0,
    slice_count = 0,
    consecutive_stall_kicks = 0,
    last_kick_chunks_done = 35,
    last_progress_at = now()
WHERE id = '4e2eafa5-52f5-4c6d-a963-1408c8a8c12e';
