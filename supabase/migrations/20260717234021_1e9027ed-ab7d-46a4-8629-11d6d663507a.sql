DELETE FROM public.quality_batch_log
WHERE id = '8fe11874-ca7a-40ed-b406-857c35aafee8'
  AND run_id = '3abe5259-d353-45fe-b1eb-2eb3bd2cc3b5'
  AND message LIKE 'pdf_export_done:%backfilled_from_row_presence%';