
-- Atomic commit RPC for EU notice generation.
-- Locks the session row, validates status and version, marks prior current
-- docs not-current, inserts new doc rows, and updates the session — all in
-- one transaction. Storage uploads still happen out-of-band in the edge
-- function, but DB state changes commit atomically.

CREATE OR REPLACE FUNCTION public.commit_eu_notice_generation(
  _session_id uuid,
  _expected_status text[],
  _new_version int,
  _docs jsonb,
  _generated_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _session record;
  _doc jsonb;
  _existing_count int;
BEGIN
  -- Lock the session row to serialise concurrent generations.
  SELECT id, client_id, status, version_number
    INTO _session
    FROM public.eu_notice_sessions
   WHERE id = _session_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (_session.status = ANY(_expected_status)) THEN
    RAISE EXCEPTION 'invalid_status:%', _session.status USING ERRCODE = 'P0001';
  END IF;

  -- Refuse if version already taken (concurrent commit beat us).
  SELECT count(*) INTO _existing_count
    FROM public.eu_notice_documents
   WHERE session_id = _session_id
     AND version_number = _new_version;

  IF _existing_count > 0 THEN
    RAISE EXCEPTION 'version_collision:%', _new_version USING ERRCODE = 'P0001';
  END IF;

  -- Mark prior current docs not-current.
  UPDATE public.eu_notice_documents
     SET is_current = false
   WHERE session_id = _session_id
     AND is_current = true;

  -- Insert each new doc row.
  FOR _doc IN SELECT * FROM jsonb_array_elements(_docs) LOOP
    INSERT INTO public.eu_notice_documents (
      session_id, client_id, framework_code, is_combined,
      version_number, document_format, file_path, file_size_bytes,
      is_current, generated_at
    ) VALUES (
      _session_id,
      _session.client_id,
      _doc->>'framework_code',
      COALESCE((_doc->>'is_combined')::boolean, false),
      _new_version,
      COALESCE(_doc->>'document_format', 'html'),
      _doc->>'file_path',
      NULLIF(_doc->>'file_size_bytes','')::int,
      true,
      _generated_at
    );
  END LOOP;

  -- Bump the session.
  UPDATE public.eu_notice_sessions
     SET status = 'generated',
         version_number = _new_version,
         completed_at = _generated_at,
         last_activity_at = _generated_at,
         updated_at = now()
   WHERE id = _session_id;

  RETURN jsonb_build_object(
    'ok', true,
    'session_id', _session_id,
    'version', _new_version,
    'inserted', jsonb_array_length(_docs)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.commit_eu_notice_generation(uuid, text[], int, jsonb, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commit_eu_notice_generation(uuid, text[], int, jsonb, timestamptz) TO service_role;
