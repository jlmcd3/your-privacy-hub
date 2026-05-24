-- 1. Add policies to regulatory_drift_alerts (admin-only)
CREATE POLICY "Admins can view drift alerts"
  ON public.regulatory_drift_alerts
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update drift alerts"
  ON public.regulatory_drift_alerts
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages drift alerts"
  ON public.regulatory_drift_alerts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Switch security definer view to security invoker
ALTER VIEW public.free_user_upgrade_signals SET (security_invoker = true);

-- 3. Revoke EXECUTE from anon/authenticated for internal-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.get_cron_jobs() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.commit_eu_notice_generation(uuid, text[], integer, jsonb, timestamptz) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_client() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_enforcement_for_enrichment(integer, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_founding_subscriber() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_research_syntheses_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_personal_client_delete() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.normalize_email_signup() FROM anon, authenticated, PUBLIC;