DROP POLICY IF EXISTS "Public reads narrow FSOR callouts" ON public.cppa_fsor_commentary;
REVOKE ALL ON public.cppa_fsor_commentary FROM anon, authenticated;
ALTER VIEW public.cppa_fsor_callouts SET (security_invoker = false);
