DROP INDEX IF EXISTS public.li_tracker_entries_source_profile_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS li_tracker_entries_source_profile_uidx
  ON public.li_tracker_entries (source_profile_id);