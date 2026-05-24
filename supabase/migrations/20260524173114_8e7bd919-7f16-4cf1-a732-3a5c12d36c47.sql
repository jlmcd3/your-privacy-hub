-- 1) Make the bucket private
UPDATE storage.buckets SET public = false WHERE id = 'assessment-reports';

-- 2) Replace the wide-open SELECT policy with an ownership-checking one
DROP POLICY IF EXISTS "Users can read assessment reports" ON storage.objects;

CREATE POLICY "Owners can read their assessment reports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'assessment-reports'
  AND split_part(name, '/', 1) = 'reports'
  AND CASE split_part(name, '/', 2)
    WHEN 'li_assessments' THEN EXISTS (
      SELECT 1 FROM public.li_assessments t
      WHERE t.id::text = split_part(storage.objects.name, '/', 3)
        AND t.user_id = auth.uid()
    )
    WHEN 'dpia_frameworks' THEN EXISTS (
      SELECT 1 FROM public.dpia_frameworks t
      WHERE t.id::text = split_part(storage.objects.name, '/', 3)
        AND t.user_id = auth.uid()
    )
    WHEN 'governance_assessments' THEN EXISTS (
      SELECT 1 FROM public.governance_assessments t
      WHERE t.id::text = split_part(storage.objects.name, '/', 3)
        AND t.user_id = auth.uid()
    )
    WHEN 'dpa_documents' THEN EXISTS (
      SELECT 1 FROM public.dpa_documents t
      WHERE t.id::text = split_part(storage.objects.name, '/', 3)
        AND t.user_id = auth.uid()
    )
    WHEN 'ir_playbooks' THEN EXISTS (
      SELECT 1 FROM public.ir_playbooks t
      WHERE t.id::text = split_part(storage.objects.name, '/', 3)
        AND t.user_id = auth.uid()
    )
    WHEN 'biometric_assessments' THEN EXISTS (
      SELECT 1 FROM public.biometric_assessments t
      WHERE t.id::text = split_part(storage.objects.name, '/', 3)
        AND t.user_id = auth.uid()
    )
    ELSE false
  END
);