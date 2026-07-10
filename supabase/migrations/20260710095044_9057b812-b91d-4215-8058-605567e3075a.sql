
-- ================================================================
-- SECURITY HARDENING 2026-07-10 (courier)
-- Fix 8 CRITICAL privilege-escalation findings by locking billing/status
-- columns to service_role writes on all paywalled product tables.
-- Add edge rate-limit infrastructure.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Paywall column lock (billing/status → service_role only)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lock_paywall_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  locked_cols text[] := ARRAY[
    'status',
    'purchase_price_cents',
    'purchased_as_standalone',
    'is_subscriber_credit',
    'stripe_payment_intent_id',
    'stage',
    'payment_status',
    'fulfillment_status',
    'amount_cents'
  ];
  col text;
  o jsonb := to_jsonb(OLD);
  n jsonb := to_jsonb(NEW);
BEGIN
  -- service_role bypass (Stripe webhooks + admin edge functions)
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;
  FOREACH col IN ARRAY locked_cols LOOP
    IF (o ? col) AND (n ? col) AND (o -> col) IS DISTINCT FROM (n -> col) THEN
      RAISE EXCEPTION 'Column % on % is read-only for role %', col, TG_TABLE_NAME, current_user
        USING ERRCODE = '42501';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.lock_paywall_columns() FROM PUBLIC, anon, authenticated;

-- Attach BEFORE UPDATE trigger on all 8 vulnerable tables
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'biometric_assessments',
    'dpa_documents',
    'dpia_frameworks',
    'governance_assessments',
    'ir_playbooks',
    'li_assessments',
    'cppa_assessments',
    'registration_orders'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_lock_paywall_columns ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_lock_paywall_columns
         BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.lock_paywall_columns()',
      t
    );
  END LOOP;
END $$;

-- ----------------------------------------------------------------
-- 2. Edge rate-limit infrastructure (fixed-window, service-role only)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  bucket_key   text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  hits         int NOT NULL DEFAULT 0
);
GRANT ALL ON public.edge_rate_limits TO service_role;
ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: service_role bypasses RLS; anon/authenticated have no grants → no access.

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  _key text,
  _window_seconds int,
  _max int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  now_ts timestamptz := now();
  new_hits int;
BEGIN
  INSERT INTO public.edge_rate_limits (bucket_key, window_start, hits)
    VALUES (_key, now_ts, 1)
  ON CONFLICT (bucket_key) DO UPDATE SET
    hits = CASE
      WHEN public.edge_rate_limits.window_start < now_ts - make_interval(secs => _window_seconds)
        THEN 1
      ELSE public.edge_rate_limits.hits + 1
    END,
    window_start = CASE
      WHEN public.edge_rate_limits.window_start < now_ts - make_interval(secs => _window_seconds)
        THEN now_ts
      ELSE public.edge_rate_limits.window_start
    END
  RETURNING hits INTO new_hits;
  RETURN new_hits <= _max;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_rate_limit(text,int,int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text,int,int) TO service_role;
