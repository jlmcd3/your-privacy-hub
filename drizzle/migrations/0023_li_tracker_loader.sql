ALTER TABLE public.li_tracker_entries
  ADD COLUMN IF NOT EXISTS source_profile_id uuid,
  ADD COLUMN IF NOT EXISTS loader_version text,
  ADD COLUMN IF NOT EXISTS synced_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS li_tracker_entries_source_profile_uidx
  ON public.li_tracker_entries (source_profile_id)
  WHERE source_profile_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.li_ingest_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enforcement_action_id uuid NOT NULL REFERENCES public.enforcement_actions(id) ON DELETE CASCADE,
  screen_version text NOT NULL,
  confirmed boolean NOT NULL DEFAULT false,
  reason text,
  signal_hits text[] NOT NULL DEFAULT '{}',
  instrument text,
  downstream_state text NOT NULL DEFAULT 'screened',
  screened_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enforcement_action_id)
);

CREATE INDEX IF NOT EXISTS li_ingest_candidates_state_idx
  ON public.li_ingest_candidates (downstream_state, confirmed);

GRANT ALL ON public.li_ingest_candidates TO service_role;
GRANT SELECT ON public.li_ingest_candidates TO authenticated;

ALTER TABLE public.li_ingest_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read li ingest candidates"
  ON public.li_ingest_candidates
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));