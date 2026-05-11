DROP POLICY IF EXISTS eu_notices_owner_read ON storage.objects;
DROP POLICY IF EXISTS eu_notices_owner_update ON storage.objects;
DROP POLICY IF EXISTS eu_notices_owner_delete ON storage.objects;

CREATE POLICY "Owners can read their own eu-notice files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'eu-notices'
  AND EXISTS (
    SELECT 1 FROM public.eu_notice_sessions s
    JOIN public.clients c ON c.id = s.client_id
    WHERE c.owner_id = auth.uid()
      AND s.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Owners can update their own eu-notice files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'eu-notices'
  AND EXISTS (
    SELECT 1 FROM public.eu_notice_sessions s
    JOIN public.clients c ON c.id = s.client_id
    WHERE c.owner_id = auth.uid()
      AND s.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Owners can delete their own eu-notice files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'eu-notices'
  AND EXISTS (
    SELECT 1 FROM public.eu_notice_sessions s
    JOIN public.clients c ON c.id = s.client_id
    WHERE c.owner_id = auth.uid()
      AND s.id::text = (storage.foldername(name))[1]
  )
);