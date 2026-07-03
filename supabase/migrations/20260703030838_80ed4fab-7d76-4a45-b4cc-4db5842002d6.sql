CREATE POLICY "admins read all sample reports"
ON public.sample_reports
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));