
-- Explicit deny policies for internal-only tables (satisfies "RLS enabled no policy" linter)
CREATE POLICY "No client access to monitoring log"
  ON public.jurisdiction_monitoring_log FOR SELECT TO anon, authenticated USING (false);

CREATE POLICY "No client access to renewal notifications"
  ON public.renewal_notifications FOR SELECT TO anon, authenticated USING (false);

CREATE POLICY "No client access to audit log"
  ON public.registration_audit_log FOR SELECT TO anon, authenticated USING (false);

-- Tighten assessment INSERT: anonymous must leave user_id NULL; authenticated must set their own
DROP POLICY "Anyone can create an assessment" ON public.registration_assessments;

CREATE POLICY "Anonymous can create assessment with null user_id"
  ON public.registration_assessments FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Authenticated can create own assessment"
  ON public.registration_assessments FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
