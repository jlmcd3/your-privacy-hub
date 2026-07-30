GRANT SELECT ON public.replay_harness_jobs TO authenticated;
GRANT SELECT ON public.replay_harness_results TO authenticated;

CREATE POLICY "Admin read harness jobs" ON public.replay_harness_jobs
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin read harness results" ON public.replay_harness_results
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.admin_replay_fetch_legacy_doc(p_doc_id uuid)
RETURNS TABLE (id uuid, intake_data jsonb, report_data jsonb)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = quality_archive, public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT a.id, a.intake_data, a.report_data
  FROM quality_archive.cppa_assessments a
  WHERE a.id = p_doc_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_replay_fetch_legacy_doc(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_replay_fetch_legacy_doc(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_replay_fetch_legacy_doc(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_replay_fetch_legacy_doc(uuid) TO service_role;