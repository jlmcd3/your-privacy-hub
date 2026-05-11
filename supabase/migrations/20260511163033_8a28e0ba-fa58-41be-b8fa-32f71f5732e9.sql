DROP POLICY IF EXISTS "Owners can read their own eu-notice files" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update their own eu-notice files" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete their own eu-notice files" ON storage.objects;

CREATE POLICY "Owners can read their own eu-notice files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'eu-notices'
  AND owns_client(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Owners can update their own eu-notice files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'eu-notices'
  AND owns_client(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Owners can delete their own eu-notice files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'eu-notices'
  AND owns_client(((storage.foldername(name))[1])::uuid)
);