-- Admin delete policy on eu_notice_documents (owner policy already exists as ALL)
CREATE POLICY "eu_notice_docs_admin_delete"
ON public.eu_notice_documents
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Allow admins to delete objects in the eu-notices storage bucket
CREATE POLICY "eu_notices_admin_delete_objects"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'eu-notices'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
