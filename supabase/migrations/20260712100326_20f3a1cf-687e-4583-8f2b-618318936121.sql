
-- 1) admin_action_log: append-only ledger of admin operator actions
CREATE TABLE public.admin_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL,
  action text NOT NULL,
  target_table text,
  target_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  ok boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_action_log TO authenticated;
GRANT ALL ON public.admin_action_log TO service_role;
ALTER TABLE public.admin_action_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read action log" ON public.admin_action_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- No INSERT policy for clients; edge functions insert via service_role.
CREATE INDEX admin_action_log_created_idx ON public.admin_action_log (created_at DESC);
CREATE INDEX admin_action_log_actor_idx ON public.admin_action_log (actor_user_id, created_at DESC);

-- 2) cppa_assessments status: widen to include 'refunded' (plus existing runtime values
--    already referenced by result-page isTerminal sets that had drifted from the CHECK).
ALTER TABLE public.cppa_assessments DROP CONSTRAINT IF EXISTS cppa_assessments_status_check;
ALTER TABLE public.cppa_assessments ADD CONSTRAINT cppa_assessments_status_check
  CHECK (status = ANY (ARRAY[
    'pending','processing','complete','error',
    'refunded','failed','failed_resolved'
  ]));

-- 3) Environment column on order-carrying tables — refund path resolves env from the ROW,
--    not from key-presence in the runtime. Backfill from stripe_session_id prefix
--    (cs_test_* = sandbox, cs_live_* = live); leave null when indeterminate.
ALTER TABLE public.registration_orders ADD COLUMN IF NOT EXISTS stripe_env text;
UPDATE public.registration_orders
  SET stripe_env = CASE
    WHEN stripe_session_id LIKE 'cs_test_%' THEN 'sandbox'
    WHEN stripe_session_id LIKE 'cs_live_%' THEN 'live'
    ELSE stripe_env
  END
  WHERE stripe_env IS NULL;
ALTER TABLE public.registration_orders
  ADD CONSTRAINT registration_orders_env_check
  CHECK (stripe_env IS NULL OR stripe_env IN ('sandbox','live'));

ALTER TABLE public.cppa_assessments ADD COLUMN IF NOT EXISTS stripe_env text;
ALTER TABLE public.cppa_assessments
  ADD CONSTRAINT cppa_assessments_env_check
  CHECK (stripe_env IS NULL OR stripe_env IN ('sandbox','live'));

-- 4) user_events traffic capture: page_view + geo. RAW IP is NEVER persisted; only the
--    country/region derived from the request header. Text nullable so absence is safe.
ALTER TABLE public.user_events ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.user_events ADD COLUMN IF NOT EXISTS region text;

-- 13-month prune (retention hygiene for launch-week traffic capture).
CREATE OR REPLACE FUNCTION public.prune_old_user_events()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.user_events WHERE created_at < now() - interval '13 months';
$$;

-- Schedule the prune monthly if pg_cron is available. Guarded so migrations
-- don't fail on environments without the extension.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'prune-user-events-monthly';
    PERFORM cron.schedule(
      'prune-user-events-monthly',
      '15 3 1 * *',
      $c$ SELECT public.prune_old_user_events(); $c$
    );
  END IF;
END $$;
