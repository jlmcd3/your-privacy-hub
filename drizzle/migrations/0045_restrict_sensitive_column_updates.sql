-- 1. professional_clients: users may edit client details, never their free-run quota
REVOKE UPDATE ON public.professional_clients FROM authenticated;
GRANT UPDATE (client_name, client_matter, updated_at) ON public.professional_clients TO authenticated;
GRANT ALL ON public.professional_clients TO service_role;

-- 2. registration_orders: users may edit delivery/renewal preferences only
REVOKE UPDATE ON public.registration_orders FROM authenticated;
GRANT UPDATE (renewal_reminders_enabled, renewal_reminder_email, delivery_email, updated_at) ON public.registration_orders TO authenticated;
GRANT ALL ON public.registration_orders TO service_role;

-- 3. cppa_drift_reminders: users may only dismiss
REVOKE UPDATE ON public.cppa_drift_reminders FROM authenticated;
GRANT UPDATE (dismissed_at, updated_at) ON public.cppa_drift_reminders TO authenticated;
GRANT ALL ON public.cppa_drift_reminders TO service_role;