-- Private bucket for generated RoPA documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('ropa-documents', 'ropa-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Owner-scoped policies (path layout: {client_id}/{session_id}/v{n}.{ext})
DROP POLICY IF EXISTS "ropa_docs_select_owner" ON storage.objects;
CREATE POLICY "ropa_docs_select_owner"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ropa-documents'
  AND public.owns_client(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "ropa_docs_insert_owner" ON storage.objects;
CREATE POLICY "ropa_docs_insert_owner"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ropa-documents'
  AND public.owns_client(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "ropa_docs_update_owner" ON storage.objects;
CREATE POLICY "ropa_docs_update_owner"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'ropa-documents'
  AND public.owns_client(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "ropa_docs_delete_owner" ON storage.objects;
CREATE POLICY "ropa_docs_delete_owner"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'ropa-documents'
  AND public.owns_client(((storage.foldername(name))[1])::uuid)
);