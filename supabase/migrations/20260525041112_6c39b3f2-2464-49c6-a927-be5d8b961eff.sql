
-- Prevent end users from modifying payment / fulfillment / amount columns on their own registration_orders rows.
-- Service role bypasses RLS and triggers (when SECURITY DEFINER or default), so edge functions are unaffected.
-- Admins keep full access via existing admin policy plus role check below.

CREATE OR REPLACE FUNCTION public.protect_registration_order_payment_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow admins to update any field
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Block changes to payment/fulfillment/amount/stripe fields by end users
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.fulfillment_status IS DISTINCT FROM OLD.fulfillment_status
     OR NEW.amount_cents IS DISTINCT FROM OLD.amount_cents
     OR NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id
     OR NEW.stripe_session_id IS DISTINCT FROM OLD.stripe_session_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
  THEN
    RAISE EXCEPTION 'Not allowed to modify payment or fulfillment fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_registration_order_payment_fields ON public.registration_orders;

CREATE TRIGGER trg_protect_registration_order_payment_fields
BEFORE UPDATE ON public.registration_orders
FOR EACH ROW
EXECUTE FUNCTION public.protect_registration_order_payment_fields();
