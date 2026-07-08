REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.cppa_fsor_callouts FROM anon, authenticated;

ALTER VIEW public.cppa_fsor_callouts SET (security_invoker = true);