DROP FUNCTION IF EXISTS public.admin_replay_fetch_legacy_doc(uuid);
CREATE OR REPLACE FUNCTION public.admin_replay_fetch_legacy_doc(p_doc_id uuid)
RETURNS TABLE (id uuid, entity_name text, sector text, intake_data jsonb, report_data jsonb)
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
  SELECT d.id,
         (d.intake_data->>'entity_name')::text,
         (d.intake_data->>'q3_sector')::text,
         d.intake_data,
         d.report_data
  FROM quality_archive.quality_run_documents_20260728 d
  WHERE d.id = p_doc_id AND d.tool = 'cppa-risk';
END;
$$;
REVOKE ALL ON FUNCTION public.admin_replay_fetch_legacy_doc(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_replay_fetch_legacy_doc(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_replay_fetch_legacy_doc(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_replay_fetch_legacy_doc(uuid) TO service_role;