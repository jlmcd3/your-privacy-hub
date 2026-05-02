-- Private bucket for generated US privacy notice files (HTML/PDF).
INSERT INTO storage.buckets (id, name, public)
VALUES ('us-notices', 'us-notices', false)
ON CONFLICT (id) DO NOTHING;

-- Files are organised as: {session_id}/{filename}.
-- A user can read a file iff they own the us_notice_session whose id is the
-- first path segment, via the related client.
CREATE POLICY "Owners can read their own us-notice files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'us-notices'
  AND EXISTS (
    SELECT 1
    FROM public.us_notice_sessions s
    JOIN public.clients c ON c.id = s.client_id
    WHERE c.owner_id = auth.uid()
      AND s.id::text = (storage.foldername(name))[1]
  )
);

-- Service role can manage everything in the bucket (uploads, overwrites, deletes).
CREATE POLICY "Service role manages us-notice files"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'us-notices')
WITH CHECK (bucket_id = 'us-notices');