REVOKE ALL ON public.free_user_upgrade_signals FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.weekly_briefs_teaser FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.cppa_fsor_callouts FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.founding_subscriber_count FROM anon, authenticated;
GRANT SELECT ON public.weekly_briefs_teaser TO anon, authenticated;
GRANT SELECT ON public.cppa_fsor_callouts TO anon, authenticated;
GRANT SELECT ON public.founding_subscriber_count TO anon, authenticated;