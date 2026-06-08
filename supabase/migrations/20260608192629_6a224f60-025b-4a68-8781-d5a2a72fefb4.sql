
-- 1) Drop the anon-session-header SELECT policy on cppa_scope_checks.
-- The client-supplied 'x-cppa-session' header was used as the sole access credential,
-- meaning anyone who knew/guessed a session_id could read another anonymous user's intake.
-- This policy isn't exercised by client code; anonymous reads back are no longer supported.
DROP POLICY IF EXISTS cppa_scope_checks_select_anon_session ON public.cppa_scope_checks;

-- 2) Prevent shareable_token from being returned via the table SELECT policy.
-- Token is delivered exclusively through the get-registration-assessment edge function
-- (which runs as service_role and bypasses column grants).
REVOKE SELECT (shareable_token) ON public.registration_assessments FROM authenticated, anon;

-- 3) Add explicit deny-all (service-role-only) policies to the three admin/system tables
-- that have RLS enabled but no policies, so intent is captured in schema.
CREATE POLICY cppa_corpus_settings_service_only ON public.cppa_corpus_settings
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY cppa_ingestion_log_service_only ON public.cppa_ingestion_log
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY cppa_source_registry_service_only ON public.cppa_source_registry
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
