-- CTA-3: add toolkit_ctas column to weekly_briefs (additive)
ALTER TABLE public.weekly_briefs
  ADD COLUMN IF NOT EXISTS toolkit_ctas jsonb NOT NULL DEFAULT '[]'::jsonb;

-- CTA-4: user_events table for fire-and-forget analytics
CREATE TABLE IF NOT EXISTS public.user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  page_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.user_events TO anon, authenticated;
GRANT ALL ON public.user_events TO service_role;

CREATE INDEX IF NOT EXISTS idx_user_events_type_time ON public.user_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_user ON public.user_events(user_id, created_at DESC);

ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert events" ON public.user_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Service role manages events" ON public.user_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);