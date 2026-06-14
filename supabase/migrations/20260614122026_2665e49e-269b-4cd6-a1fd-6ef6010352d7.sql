CREATE TABLE IF NOT EXISTS public.upsell_events (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  triggered_by_tool           text NOT NULL,
  triggered_by_assessment_id  text,
  product                     text NOT NULL,
  reason                      text NOT NULL,
  urgency                     text NOT NULL DEFAULT 'medium',
  email_sent_at               timestamptz,
  in_app_shown_at             timestamptz,
  dismissed_at                timestamptz,
  last_triggered_at           timestamptz NOT NULL DEFAULT now(),
  created_at                  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.upsell_events TO authenticated;
GRANT ALL ON public.upsell_events TO service_role;

ALTER TABLE public.upsell_events ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS upsell_events_user_product_idx
  ON upsell_events (user_id, product);

CREATE INDEX IF NOT EXISTS upsell_events_user_id_idx   ON upsell_events (user_id);
CREATE INDEX IF NOT EXISTS upsell_events_created_at_idx ON upsell_events (created_at DESC);

CREATE POLICY "upsell_events_select_own"
  ON upsell_events FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "upsell_events_insert_own"
  ON upsell_events FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "upsell_events_update_own"
  ON upsell_events FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE upsell_events IS
  'Cross-sell recommendations triggered by completed tool runs. One row per (user, product). Email cooldown = 30 days (enforced in trigger-upsell).';
