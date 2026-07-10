DROP POLICY "Authenticated users can read brief translations" ON public.brief_translations;

CREATE POLICY "Premium users can read brief translations"
ON public.brief_translations
FOR SELECT
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.is_premium = true OR COALESCE(p.is_pro, false) = true)
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
);