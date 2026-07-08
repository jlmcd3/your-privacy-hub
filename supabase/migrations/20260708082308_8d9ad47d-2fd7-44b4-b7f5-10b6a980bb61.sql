CREATE POLICY "Public reads narrow FSOR callouts"
ON public.cppa_fsor_commentary
FOR SELECT
TO anon, authenticated
USING (agency_position_summary IS NOT NULL);

DROP POLICY IF EXISTS "Owners can read their assessment reports" ON storage.objects;
CREATE POLICY "Owners can read their assessment reports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'assessment-reports'
  AND split_part(name, '/', 1) = 'reports'
  AND CASE split_part(name, '/', 2)
    WHEN 'li_assessments' THEN EXISTS (SELECT 1 FROM public.li_assessments t WHERE t.id::text = split_part(objects.name,'/',3) AND t.user_id = auth.uid())
    WHEN 'dpia_frameworks' THEN EXISTS (SELECT 1 FROM public.dpia_frameworks t WHERE t.id::text = split_part(objects.name,'/',3) AND t.user_id = auth.uid())
    WHEN 'governance_assessments' THEN EXISTS (SELECT 1 FROM public.governance_assessments t WHERE t.id::text = split_part(objects.name,'/',3) AND t.user_id = auth.uid())
    WHEN 'dpa_documents' THEN EXISTS (SELECT 1 FROM public.dpa_documents t WHERE t.id::text = split_part(objects.name,'/',3) AND t.user_id = auth.uid())
    WHEN 'ir_playbooks' THEN EXISTS (SELECT 1 FROM public.ir_playbooks t WHERE t.id::text = split_part(objects.name,'/',3) AND t.user_id = auth.uid())
    WHEN 'biometric_assessments' THEN EXISTS (SELECT 1 FROM public.biometric_assessments t WHERE t.id::text = split_part(objects.name,'/',3) AND t.user_id = auth.uid())
    WHEN 'cppa_assessments' THEN EXISTS (SELECT 1 FROM public.cppa_assessments t WHERE t.id::text = split_part(objects.name,'/',3) AND t.user_id = auth.uid())
    WHEN 'registration_documents' THEN EXISTS (SELECT 1 FROM public.registration_documents t JOIN public.registration_orders o ON o.id = t.order_id WHERE t.id::text = split_part(objects.name,'/',3) AND o.user_id = auth.uid())
    ELSE false
  END
);
