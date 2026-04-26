-- Phase 1: additive parity + idempotent re-backfill. Fully reversible.

ALTER TABLE public.email_signups
  ADD COLUMN IF NOT EXISTS confirmed BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMP WITH TIME ZONE;

-- Catch up any rows added to email_subscribers since the original backfill
INSERT INTO public.email_signups (email, source, confirmed, subscribed_at, unsubscribed_at, created_at)
SELECT
  es.email,
  es.source,
  COALESCE(es.confirmed, true),
  es.subscribed_at,
  es.unsubscribed_at,
  COALESCE(es.subscribed_at, now())
FROM public.email_subscribers es
ON CONFLICT (lower(email)) DO NOTHING;