
-- 1. assessment-reports bucket: restrict INSERT to service_role; add explicit UPDATE/DELETE for service_role
DROP POLICY IF EXISTS "Service role can upload assessment reports" ON storage.objects;

CREATE POLICY "Service role can upload assessment reports"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'assessment-reports');

CREATE POLICY "Service role can update assessment reports"
  ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'assessment-reports')
  WITH CHECK (bucket_id = 'assessment-reports');

CREATE POLICY "Service role can delete assessment reports"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'assessment-reports');

-- 2. Strengthen registration_orders protection trigger to cover all sensitive columns
CREATE OR REPLACE FUNCTION public.protect_registration_order_payment_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Admins and service role bypass column locks
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
     OR NEW.delivery_sent_at IS DISTINCT FROM OLD.delivery_sent_at
  THEN
    RAISE EXCEPTION 'Not allowed to modify protected order fields';
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. report_configs: remove anonymous insert capability (edge function uses service_role)
DROP POLICY IF EXISTS "report_configs_insert" ON public.report_configs;

CREATE POLICY "report_configs_insert"
  ON public.report_configs FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NOT NULL AND user_id = auth.uid());
