CREATE OR REPLACE FUNCTION public.protect_registration_order_payment_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Service role (edge functions / reaper) bypasses column locks
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Admins bypass column locks
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Block changes to any sensitive column by end users
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.fulfillment_status IS DISTINCT FROM OLD.fulfillment_status
     OR NEW.amount_cents IS DISTINCT FROM OLD.amount_cents
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id
     OR NEW.stripe_session_id IS DISTINCT FROM OLD.stripe_session_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.tier IS DISTINCT FROM OLD.tier
     OR NEW.jurisdictions IS DISTINCT FROM OLD.jurisdictions
     OR NEW.organization_snapshot IS DISTINCT FROM OLD.organization_snapshot
     OR NEW.assessment_id IS DISTINCT FROM OLD.assessment_id
     OR NEW.documents_generated_at IS DISTINCT FROM OLD.documents_generated_at
     OR NEW.filed_at IS DISTINCT FROM OLD.filed_at
     OR NEW.next_renewal_at IS DISTINCT FROM OLD.next_renewal_at
     OR NEW.delivery_email IS DISTINCT FROM OLD.delivery_email
  THEN
    RAISE EXCEPTION 'Not allowed to modify protected order fields';
  END IF;

  RETURN NEW;
END;
$function$;