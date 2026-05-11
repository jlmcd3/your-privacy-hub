DROP POLICY IF EXISTS "Owners can read their own us-notice files" ON storage.objects;
DROP POLICY IF EXISTS "Service role manages us-notice files" ON storage.objects;
DROP POLICY IF EXISTS "us_notices_service_all" ON storage.objects;
DROP POLICY IF EXISTS "us_notices_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "us_notices_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "us_notices_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "us_notices_owner_delete" ON storage.objects;

CREATE POLICY "us_notices_service_all" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'us-notices')
  WITH CHECK (bucket_id = 'us-notices');

CREATE POLICY "us_notices_owner_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'us-notices'
    AND EXISTS (
      SELECT 1 FROM public.us_notice_sessions s
      JOIN public.clients c ON c.id = s.client_id
      WHERE c.owner_id = auth.uid()
        AND s.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "us_notices_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'us-notices'
    AND EXISTS (
      SELECT 1 FROM public.us_notice_sessions s
      JOIN public.clients c ON c.id = s.client_id
      WHERE c.owner_id = auth.uid()
        AND s.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "us_notices_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'us-notices'
    AND EXISTS (
      SELECT 1 FROM public.us_notice_sessions s
      JOIN public.clients c ON c.id = s.client_id
      WHERE c.owner_id = auth.uid()
        AND s.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "us_notices_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'us-notices'
    AND EXISTS (
      SELECT 1 FROM public.us_notice_sessions s
      JOIN public.clients c ON c.id = s.client_id
      WHERE c.owner_id = auth.uid()
        AND s.id::text = (storage.foldername(name))[1]
    )
  );