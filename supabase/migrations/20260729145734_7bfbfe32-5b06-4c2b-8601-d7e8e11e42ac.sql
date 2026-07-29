CREATE OR REPLACE FUNCTION public.replay_harness_fetch_doc(p_doc_id uuid)
RETURNS TABLE (id uuid, intake_data jsonb, report_data jsonb)
LANGUAGE sql
SECURITY DEFINER
SET search_path = quality_archive, public
AS $$
  SELECT id, intake_data, report_data
  FROM quality_archive.quality_run_documents_20260728
  WHERE id = p_doc_id AND tool = 'cppa-risk'
$$;

REVOKE ALL ON FUNCTION public.replay_harness_fetch_doc(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replay_harness_fetch_doc(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.replay_harness_fetch_doc(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.replay_harness_fetch_doc(uuid) TO service_role;