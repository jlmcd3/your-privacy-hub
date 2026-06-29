UPDATE long_running_jobs
SET result = jsonb_set(jsonb_set(result, '{idx}', '1'::jsonb), '{current}', 'null'::jsonb),
    progress = '[1/13] biometric: complete score=85.4 → next (manual unblock)'
WHERE id = 'f6009cf6-ed61-427c-b24e-9eb1164e190a' AND status = 'running';