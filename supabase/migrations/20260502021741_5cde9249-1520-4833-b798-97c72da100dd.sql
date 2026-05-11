-- Tracking table to rate-limit "new state law activated" notifications:
-- one row per (client_id, state_code) so each client receives at most one
-- notification per newly-activated state.
CREATE TABLE IF NOT EXISTS public.us_state_law_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  state_code text NOT NULL,
  user_id uuid,
  recipient_email text NOT NULL,
  delivery_status text NOT NULL DEFAULT 'sent',
  resend_message_id text,
  error text,
  notified_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT us_state_law_notifications_unique UNIQUE (client_id, state_code)
);

CREATE INDEX IF NOT EXISTS idx_us_state_law_notifications_state
  ON public.us_state_law_notifications (state_code);

ALTER TABLE public.us_state_law_notifications ENABLE ROW LEVEL SECURITY;

-- Service-role only — clients have no direct access (similar to renewal_notifications).
DROP POLICY IF EXISTS "service_role_manages_us_state_law_notifications"
  ON public.us_state_law_notifications;
CREATE POLICY "service_role_manages_us_state_law_notifications"
  ON public.us_state_law_notifications
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "no_client_access_us_state_law_notifications"
  ON public.us_state_law_notifications;
CREATE POLICY "no_client_access_us_state_law_notifications"
  ON public.us_state_law_notifications
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING (false);