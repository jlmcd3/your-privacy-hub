
CREATE TABLE IF NOT EXISTS public.processed_stripe_events (
  event_id     text NOT NULL,
  phase        text NOT NULL DEFAULT 'handled',
  event_type   text,
  environment  text,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, phase)
);
GRANT ALL ON public.processed_stripe_events TO service_role;
ALTER TABLE public.processed_stripe_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='processed_stripe_events' AND policyname='service_role manages processed_stripe_events') THEN
    CREATE POLICY "service_role manages processed_stripe_events"
      ON public.processed_stripe_events FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_assessment_purchases_intent_assessment
  ON public.assessment_purchases (stripe_payment_intent_id, assessment_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
