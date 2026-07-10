INSERT INTO public.quality_loop2_notes (kind, note)
SELECT 'clean_window_exclusion',
  format(
    'CHAIN EXTENSION (recorded 2026-07-10) — extends head 4fadfb76-f1d4-419b-bed7-ee0237cd76df. Additional windows excluded as test-generated, all times UTC: (11) Final pre-launch QL2 sweep, run %s — %s to %s, including its stress-batch fixture generation and all assessments, documents, and PDFs created in that window. (12) Residual sample regeneration — cppa_cyber/us sample PDF re-render, 2026-07-10 05:28-05:31. (13) FSOR voice-fix verification loads on the live samples pages, 2026-07-10 05:24-05:27 (page views only; no rows generated). This entry completes the PENDING item (10) of the head note. Chain rule unchanged: extend by full uuid, never fork. Current head after this insert: THIS row''s uuid.',
    id,
    to_char(started_at, 'YYYY-MM-DD HH24:MI'),
    to_char(completed_at, 'YYYY-MM-DD HH24:MI')
  )
FROM public.quality_loop2_runs
WHERE status = 'complete' AND completed_at > '2026-07-10 05:00:00+00'
ORDER BY completed_at DESC
LIMIT 1
RETURNING id, created_at, note;