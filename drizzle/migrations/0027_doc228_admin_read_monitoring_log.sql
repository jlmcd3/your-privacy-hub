DROP POLICY IF EXISTS "No client access to monitoring log" ON public.jurisdiction_monitoring_log;

CREATE POLICY "Admins can read monitoring log"
  ON public.jurisdiction_monitoring_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.jurisdiction_monitoring_log TO authenticated;
GRANT ALL ON public.jurisdiction_monitoring_log TO service_role;