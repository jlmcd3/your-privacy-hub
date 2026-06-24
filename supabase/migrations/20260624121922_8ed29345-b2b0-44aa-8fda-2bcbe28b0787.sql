
-- Cross-product retry/refund: add retry_count, last_attempt_at, last_error to
-- product tables that have a generator + status + stripe_payment_intent_id.
-- 'refunded' becomes a valid logical status value (no CHECK constraint exists
-- on these status columns, so no constraint changes are needed).

ALTER TABLE public.cppa_assessments
  ADD COLUMN IF NOT EXISTS retry_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;

ALTER TABLE public.li_assessments
  ADD COLUMN IF NOT EXISTS retry_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;

ALTER TABLE public.governance_assessments
  ADD COLUMN IF NOT EXISTS retry_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;

ALTER TABLE public.dpia_frameworks
  ADD COLUMN IF NOT EXISTS retry_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;

ALTER TABLE public.ir_playbooks
  ADD COLUMN IF NOT EXISTS retry_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;

ALTER TABLE public.biometric_assessments
  ADD COLUMN IF NOT EXISTS retry_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;

ALTER TABLE public.dpa_documents
  ADD COLUMN IF NOT EXISTS retry_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;

-- Indexes to make the sweeper cheap (covers status + retry_count predicate).
CREATE INDEX IF NOT EXISTS idx_cppa_assessments_status_retry
  ON public.cppa_assessments(status, retry_count)
  WHERE status IN ('processing','error','failed');

CREATE INDEX IF NOT EXISTS idx_li_assessments_status_retry
  ON public.li_assessments(status, retry_count)
  WHERE status IN ('processing','error','failed');

CREATE INDEX IF NOT EXISTS idx_governance_assessments_status_retry
  ON public.governance_assessments(status, retry_count)
  WHERE status IN ('processing','error','failed');

CREATE INDEX IF NOT EXISTS idx_dpia_frameworks_status_retry
  ON public.dpia_frameworks(status, retry_count)
  WHERE status IN ('processing','error','failed');

CREATE INDEX IF NOT EXISTS idx_ir_playbooks_status_retry
  ON public.ir_playbooks(status, retry_count)
  WHERE status IN ('processing','error','failed');

CREATE INDEX IF NOT EXISTS idx_biometric_assessments_status_retry
  ON public.biometric_assessments(status, retry_count)
  WHERE status IN ('processing','error','failed');

CREATE INDEX IF NOT EXISTS idx_dpa_documents_status_retry
  ON public.dpa_documents(status, retry_count)
  WHERE status IN ('processing','error','failed');
