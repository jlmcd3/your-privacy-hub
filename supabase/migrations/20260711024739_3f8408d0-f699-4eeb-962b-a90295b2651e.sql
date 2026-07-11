
-- =========================================================
-- 1) Column-lock triggers for purchase/report tables
-- =========================================================

-- Tables with the full set of monetization columns.
CREATE OR REPLACE FUNCTION public.lock_purchase_columns_full()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only constrain end-user (authenticated) writes; server-side writes go
  -- through service_role and must remain unrestricted.
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;
  NEW.user_id                  := OLD.user_id;
  NEW.status                   := OLD.status;
  NEW.stripe_payment_intent_id := OLD.stripe_payment_intent_id;
  NEW.purchase_price_cents     := OLD.purchase_price_cents;
  NEW.is_subscriber_credit     := OLD.is_subscriber_credit;
  NEW.purchased_as_standalone  := OLD.purchased_as_standalone;
  NEW.report_data              := OLD.report_data;
  RETURN NEW;
END;
$$;

-- cppa_assessments has a slimmer column set (no is_subscriber_credit /
-- purchased_as_standalone), so it needs its own trigger fn.
CREATE OR REPLACE FUNCTION public.lock_purchase_columns_cppa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;
  NEW.user_id                  := OLD.user_id;
  NEW.status                   := OLD.status;
  NEW.stripe_payment_intent_id := OLD.stripe_payment_intent_id;
  NEW.purchase_price_cents     := OLD.purchase_price_cents;
  NEW.report_data              := OLD.report_data;
  RETURN NEW;
END;
$$;

-- Attach triggers (drop-if-exists first so migration is idempotent).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'biometric_assessments','dpa_documents','dpia_frameworks',
    'governance_assessments','ir_playbooks','li_assessments'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS lock_purchase_cols ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER lock_purchase_cols BEFORE UPDATE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.lock_purchase_columns_full()', t);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS lock_purchase_cols ON public.cppa_assessments;
CREATE TRIGGER lock_purchase_cols BEFORE UPDATE ON public.cppa_assessments
FOR EACH ROW EXECUTE FUNCTION public.lock_purchase_columns_cppa();

-- =========================================================
-- 2) registration_orders billing-field lock
-- =========================================================
CREATE OR REPLACE FUNCTION public.lock_registration_order_billing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;
  NEW.user_id                  := OLD.user_id;
  NEW.payment_status           := OLD.payment_status;
  NEW.fulfillment_status       := OLD.fulfillment_status;
  NEW.amount_cents             := OLD.amount_cents;
  NEW.stripe_payment_intent_id := OLD.stripe_payment_intent_id;
  NEW.stripe_session_id        := OLD.stripe_session_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_registration_billing ON public.registration_orders;
CREATE TRIGGER lock_registration_billing BEFORE UPDATE ON public.registration_orders
FOR EACH ROW EXECUTE FUNCTION public.lock_registration_order_billing();

-- =========================================================
-- 3) email_signups: tighten anon insert + revoke write privs
-- =========================================================
DROP POLICY IF EXISTS "Anyone can sign up" ON public.email_signups;
CREATE POLICY "Anyone can sign up"
ON public.email_signups
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND char_length(email) <= 254
  AND unsubscribed_at IS NULL
  AND confirmed = true  -- must equal column default; blocks pre-confirming arbitrary values
  AND (source IS NULL OR (char_length(source) <= 64 AND source ~ '^[a-zA-Z0-9_-]+$'))
);

-- Anon/authenticated should never be able to UPDATE or DELETE signups from the client.
REVOKE UPDATE, DELETE ON public.email_signups FROM anon, authenticated;
