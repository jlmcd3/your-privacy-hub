
-- redeploy_queue: durable marker rows written by admin-redeploy when the two-source
-- conflict gate is clear (or typed-override). A human courier or later live-deploy
-- upgrade executes and marks status='executed'.
CREATE TABLE IF NOT EXISTS public.redeploy_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','executed','cancelled')),
  override_used BOOLEAN NOT NULL DEFAULT false,
  conflicts JSONB NOT NULL DEFAULT '[]'::jsonb,
  executed_at TIMESTAMPTZ,
  executed_note TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.redeploy_queue TO authenticated;
GRANT ALL    ON public.redeploy_queue TO service_role;
ALTER TABLE public.redeploy_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view redeploy queue"
  ON public.redeploy_queue FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Writes/updates come only from service_role (edge functions). No client policy.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_redeploy_queue_updated_at ON public.redeploy_queue;
CREATE TRIGGER trg_redeploy_queue_updated_at
  BEFORE UPDATE ON public.redeploy_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_redeploy_queue_status_time
  ON public.redeploy_queue(status, requested_at DESC);

-- Instrument-epoch stamps on batch tables.
ALTER TABLE public.quality_batch_runs
  ADD COLUMN IF NOT EXISTS instrument_version TEXT NULL;
ALTER TABLE public.quality_batch_baselines
  ADD COLUMN IF NOT EXISTS instrument_version TEXT NULL;
