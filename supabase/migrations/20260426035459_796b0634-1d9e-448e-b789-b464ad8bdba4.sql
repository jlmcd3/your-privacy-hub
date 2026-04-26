CREATE POLICY "Admins can view email signups"
ON public.email_signups
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));