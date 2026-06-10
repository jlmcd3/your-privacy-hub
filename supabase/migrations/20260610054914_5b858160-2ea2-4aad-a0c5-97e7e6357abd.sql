DROP POLICY IF EXISTS "Authenticated can read FSOR commentary" ON public.cppa_fsor_commentary;
CREATE POLICY "Authenticated can read FSOR commentary"
  ON public.cppa_fsor_commentary
  FOR SELECT
  TO authenticated
  USING (true);
GRANT SELECT ON public.cppa_fsor_commentary TO authenticated;