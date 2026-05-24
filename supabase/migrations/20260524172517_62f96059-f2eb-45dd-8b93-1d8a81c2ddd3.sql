CREATE POLICY "custom_briefs_delete_admin"
ON public.custom_briefs
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);