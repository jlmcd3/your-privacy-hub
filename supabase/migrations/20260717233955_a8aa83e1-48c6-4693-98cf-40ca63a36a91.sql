DELETE FROM public.quality_batch_log
WHERE id = 'f01c84bb-c293-4573-8bca-3e0aac9ca118'
  AND run_id = '3abe5259-d353-45fe-b1eb-2eb3bd2cc3b5'
  AND message LIKE 'pdf_export_done:%backfilled_from_row_presence%';