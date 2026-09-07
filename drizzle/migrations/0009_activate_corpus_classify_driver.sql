-- lovable-cron-fallback-reviewed: 720 runs/day; bounded two-minute batch driver, activated on operator instruction and stopped when the queue drains
CREATE TABLE IF NOT EXISTS public.internal_driver_tokens (
  name text PRIMARY KEY,
  token text NOT NULL DEFAULT gen_random_uuid()::text,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.internal_driver_tokens FROM anon, authenticated;
GRANT ALL ON public.internal_driver_tokens TO service_role;
ALTER TABLE public.internal_driver_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS internal_driver_tokens_service_all ON public.internal_driver_tokens;
CREATE POLICY internal_driver_tokens_service_all ON public.internal_driver_tokens
  FOR ALL TO service_role USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

INSERT INTO public.internal_driver_tokens (name) VALUES ('corpus-classify')
ON CONFLICT (name) DO NOTHING;

SELECT cron.unschedule('corpus-classify-driver');

SELECT cron.schedule(
  'corpus-classify-driver',
  '*/2 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/generate-corpus-relevance-profiles',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-cron', '1',
      'x-driver-token', (SELECT token FROM public.internal_driver_tokens WHERE name = 'corpus-classify' LIMIT 1),
      'Authorization', 'Bearer internal-driver'
    ),
    body := jsonb_build_object(
      'action', 'classify_from_db',
      'product', 'lia',
      'run_id', 'lia-classify-2026-09-07-r1',
      'batch_size', 6
    ),
    timeout_milliseconds := 540000
  ) AS request_id;
  $cron$
);
