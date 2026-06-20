
-- 1. sample_reports: drop overly permissive policy
DROP POLICY IF EXISTS "public read samples with pdf" ON public.sample_reports;

-- 2. registration_orders: prevent users from mutating billing/fulfillment fields
CREATE OR REPLACE FUNCTION public.registration_orders_guard_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip guard for service_role and admins
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.amount_cents IS DISTINCT FROM OLD.amount_cents
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.stripe_session_id IS DISTINCT FROM OLD.stripe_session_id
     OR NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id
     OR NEW.fulfillment_status IS DISTINCT FROM OLD.fulfillment_status
     OR NEW.tier IS DISTINCT FROM OLD.tier
     OR NEW.jurisdictions IS DISTINCT FROM OLD.jurisdictions
     OR NEW.documents_generated_at IS DISTINCT FROM OLD.documents_generated_at
     OR NEW.filed_at IS DISTINCT FROM OLD.filed_at
     OR NEW.next_renewal_at IS DISTINCT FROM OLD.next_renewal_at
     OR NEW.delivery_sent_at IS DISTINCT FROM OLD.delivery_sent_at
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
  THEN
    RAISE EXCEPTION 'Users may not modify billing or fulfillment fields on registration_orders';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registration_orders_guard_update ON public.registration_orders;
CREATE TRIGGER trg_registration_orders_guard_update
BEFORE UPDATE ON public.registration_orders
FOR EACH ROW EXECUTE FUNCTION public.registration_orders_guard_user_update();

-- 3. user_events: restrict insert so user_id must be NULL or auth.uid()
DROP POLICY IF EXISTS "Anyone can insert events" ON public.user_events;
CREATE POLICY "Anyone can insert events"
  ON public.user_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 4. weekly_briefs_teaser: enforce security_invoker
DROP VIEW IF EXISTS public.weekly_briefs_teaser;
CREATE VIEW public.weekly_briefs_teaser
WITH (security_invoker = true) AS
SELECT id,
       week_label,
       headline,
       published_at,
       article_count,
       "left"(COALESCE(executive_summary, ''::text), 320) AS teaser
FROM public.weekly_briefs;

GRANT SELECT ON public.weekly_briefs_teaser TO anon, authenticated;
