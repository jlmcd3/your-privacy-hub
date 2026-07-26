-- BAND-REALIGNMENT-T2 turn 2026-07-26 — finalize orphaned harness child of terminal T6 batch.
-- Row 37a242fa-... was started inside the terminal T6 batch 5332771a-... during its dpa-generator
-- window and was never reaped when the batch completed at 2026-07-26T04:55:24.686Z, leaving
-- status='running' and finished_at=NULL. Controller ruled this is NOT a live customer generation.
-- Direct UPDATE from exec psql was denied (function_runs has no UPDATE grant to the exec role);
-- migration path is required.
UPDATE public.function_runs
SET status = 'error',
    finished_at = now(),
    error_message = 'orphaned_harness_child of terminal quality_batch_runs 5332771a-522b-4a1c-be3e-a1373512ac68 (batch complete 2026-07-26T04:55:24.686Z); no customer job; finalized by BAND-REALIGNMENT-T2 turn per controller orphan pattern',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'outcome', 'orphaned_harness_child',
      'resolved_by', 'BAND-REALIGNMENT-T2-2026-07-26',
      'parent_batch', '5332771a-522b-4a1c-be3e-a1373512ac68',
      'resolved_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
WHERE id = '37a242fa-8161-4883-87c5-92097810a698'
  AND finished_at IS NULL;