CREATE TABLE IF NOT EXISTS public.ingestion_alert_state (
  alert_key text PRIMARY KEY,
  last_alerted_at timestamp with time zone NOT NULL DEFAULT now(),
  last_payload jsonb
);

ALTER TABLE public.ingestion_alert_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages ingestion_alert_state"
  ON public.ingestion_alert_state
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Admins can read ingestion_alert_state"
  ON public.ingestion_alert_state
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));