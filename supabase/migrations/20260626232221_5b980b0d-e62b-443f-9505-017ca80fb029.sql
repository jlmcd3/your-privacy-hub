
SET session_replication_role = replica;

UPDATE public.function_runs
SET status = 'failed', finished_at = now(),
    error_message = COALESCE(error_message, 'Terminated: stuck in running state (manual sweep)')
WHERE status = 'running';

UPDATE public.registration_orders
SET fulfillment_status = 'failed', updated_at = now()
WHERE fulfillment_status IN ('generating', 'processing');

-- cppa_assessments only allows 'error'
UPDATE public.cppa_assessments
SET status = 'error', updated_at = now()
WHERE status IN ('processing', 'pending');

UPDATE public.li_assessments SET status = 'failed', updated_at = now()
WHERE status IN ('processing', 'pending');

UPDATE public.governance_assessments SET status = 'failed', updated_at = now()
WHERE status IN ('processing', 'pending');

UPDATE public.dpia_frameworks SET status = 'failed', updated_at = now()
WHERE status IN ('processing', 'pending');

UPDATE public.ir_playbooks SET status = 'failed', updated_at = now()
WHERE status IN ('processing', 'pending');

UPDATE public.biometric_assessments SET status = 'failed', updated_at = now()
WHERE status IN ('processing', 'pending');

UPDATE public.dpa_documents SET status = 'failed', updated_at = now()
WHERE status IN ('processing', 'pending');

SET session_replication_role = DEFAULT;
