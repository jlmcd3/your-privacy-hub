-- professional_clients: split ALL policy so users can no longer UPDATE
DROP POLICY IF EXISTS "Users manage own clients" ON public.professional_clients;
CREATE POLICY "Users select own clients" ON public.professional_clients
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own clients" ON public.professional_clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own clients" ON public.professional_clients
  FOR DELETE USING (auth.uid() = user_id);

-- registration_orders: drop owner preference update policy
DROP POLICY IF EXISTS "registration_orders_owner_update_pref" ON public.registration_orders;

-- cppa_drift_reminders: drop user dismiss policy
DROP POLICY IF EXISTS "users dismiss own drift reminders" ON public.cppa_drift_reminders;

-- Remove all column-level UPDATE grants from end users
REVOKE UPDATE ON public.professional_clients FROM authenticated;
REVOKE UPDATE ON public.registration_orders FROM authenticated;
REVOKE UPDATE ON public.cppa_drift_reminders FROM authenticated;
REVOKE UPDATE ON public.professional_clients FROM anon;
REVOKE UPDATE ON public.registration_orders FROM anon;
REVOKE UPDATE ON public.cppa_drift_reminders FROM anon;

GRANT ALL ON public.professional_clients TO service_role;
GRANT ALL ON public.registration_orders TO service_role;
GRANT ALL ON public.cppa_drift_reminders TO service_role;