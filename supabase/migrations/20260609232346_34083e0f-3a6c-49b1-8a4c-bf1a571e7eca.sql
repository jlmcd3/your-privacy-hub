
CREATE TABLE IF NOT EXISTS public.obligation_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obligation_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('completed','snoozed','dismissed')),
  snooze_until date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.obligation_acknowledgements TO authenticated;
GRANT ALL ON public.obligation_acknowledgements TO service_role;

ALTER TABLE public.obligation_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "obl_ack_select_own" ON public.obligation_acknowledgements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "obl_ack_insert_own" ON public.obligation_acknowledgements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS obl_ack_user_obl_idx
  ON public.obligation_acknowledgements (user_id, obligation_id, created_at DESC);
