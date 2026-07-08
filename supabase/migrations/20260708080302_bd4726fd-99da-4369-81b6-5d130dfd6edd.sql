CREATE VIEW public.cppa_fsor_callouts AS
  SELECT regulation_citation, agency_position_summary
  FROM public.cppa_fsor_commentary
  WHERE agency_position_summary IS NOT NULL;

GRANT SELECT ON public.cppa_fsor_callouts TO anon, authenticated;