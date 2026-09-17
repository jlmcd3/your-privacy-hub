CREATE OR REPLACE FUNCTION public.dismiss_drift_reminder(reminder_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.cppa_drift_reminders
     SET dismissed_at = now()
   WHERE id = reminder_id
     AND user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reminder not found or not owned by caller';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_registration_renewal_reminders(order_id uuid, enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.registration_orders
     SET renewal_reminders_enabled = enabled
   WHERE id = order_id
     AND user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or not owned by caller';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.dismiss_drift_reminder(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.set_registration_renewal_reminders(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dismiss_drift_reminder(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_registration_renewal_reminders(uuid, boolean) TO authenticated;