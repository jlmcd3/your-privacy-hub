-- Allow admins and moderators to update the is_hidden field on updates rows.
-- The existing service role policy still applies for full management.
CREATE POLICY "Admins and moderators can update updates"
ON public.updates
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);