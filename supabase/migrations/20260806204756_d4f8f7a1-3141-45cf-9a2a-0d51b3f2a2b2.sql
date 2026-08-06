CREATE TABLE public.coach_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product text NOT NULL CHECK (product IN ('dpia','cppa_risk')),
  reference_kind text,
  reference_id text,
  asked integer NOT NULL DEFAULT 0,
  answered integer NOT NULL DEFAULT 0,
  to_strengthen integer NOT NULL DEFAULT 0,
  already_strong integer NOT NULL DEFAULT 0,
  cards jsonb NOT NULL DEFAULT '[]'::jsonb,
  skipped_at timestamptz,
  continued_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.coach_transcripts TO authenticated;
GRANT ALL ON public.coach_transcripts TO service_role;

ALTER TABLE public.coach_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_transcripts_select_own" ON public.coach_transcripts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "coach_transcripts_insert_own" ON public.coach_transcripts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coach_transcripts_update_own" ON public.coach_transcripts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coach_transcripts_service_all" ON public.coach_transcripts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX coach_transcripts_user_created_idx ON public.coach_transcripts (user_id, created_at DESC);

CREATE TABLE public.coach_transcript_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id uuid NOT NULL REFERENCES public.coach_transcripts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  card_key text NOT NULL,
  reason text,
  field_edited_after boolean NOT NULL DEFAULT false,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (transcript_id, card_key)
);

GRANT SELECT, INSERT, UPDATE ON public.coach_transcript_cards TO authenticated;
GRANT ALL ON public.coach_transcript_cards TO service_role;

ALTER TABLE public.coach_transcript_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_transcript_cards_select_own" ON public.coach_transcript_cards
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "coach_transcript_cards_insert_own" ON public.coach_transcript_cards
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coach_transcript_cards_update_own" ON public.coach_transcript_cards
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coach_transcript_cards_service_all" ON public.coach_transcript_cards
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX coach_transcript_cards_transcript_idx ON public.coach_transcript_cards (transcript_id);

CREATE TRIGGER update_coach_transcripts_updated_at
  BEFORE UPDATE ON public.coach_transcripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_coach_transcript_cards_updated_at
  BEFORE UPDATE ON public.coach_transcript_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RETENTION: same convention as public.prune_old_user_events (migration
-- 20260712100326) — a SECURITY DEFINER prune function scheduled monthly with
-- pg_cron, guarded so environments without the extension still migrate.
-- Period: 13 months, matching that convention. CEO-adjustable.
CREATE OR REPLACE FUNCTION public.prune_old_coach_transcripts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.coach_transcripts WHERE created_at < now() - interval '13 months';
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'prune-coach-transcripts-monthly';
    PERFORM cron.schedule(
      'prune-coach-transcripts-monthly',
      '25 3 1 * *',
      $c$ SELECT public.prune_old_coach_transcripts(); $c$
    );
  END IF;
END $$;