UPDATE long_running_jobs
SET status='error', error='Killed by edge runtime during baseline phase (no progress beyond baseline). Marked failed so the admin UI spinner clears.', completed_at=now(), updated_at=now()
WHERE kind='improve-prompt'
  AND tool='biometric-checker'
  AND status='running'
  AND updated_at < now() - interval '2 minutes';