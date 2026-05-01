-- Rate-limit RoPA refresh-due reminder emails (max one per week per client)
CREATE TABLE IF NOT EXISTS public.ropa_refresh_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  source_session_id UUID NOT NULL REFERENCES public.ropa_sessions(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updates_count INTEGER NOT NULL DEFAULT 0,
  recipient_email TEXT
);

CREATE INDEX IF NOT EXISTS idx_ropa_refresh_reminders_client_sent
  ON public.ropa_refresh_reminders (client_id, sent_at DESC);

ALTER TABLE public.ropa_refresh_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ropa_refresh_reminders_owner_read"
  ON public.ropa_refresh_reminders
  FOR SELECT
  TO authenticated
  USING (public.owns_client(client_id));

-- Track which articles a session has already "noted" (info flags) so we don't
-- re-surface them on subsequent refreshes. Stored as info flags already, but
-- we add a unique constraint on (session_id, article reference) via flag_message
-- isn't reliable — instead use a small dedicated table for clarity.
CREATE TABLE IF NOT EXISTS public.ropa_noted_regulatory_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ropa_sessions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.updates(id) ON DELETE CASCADE,
  article_title TEXT NOT NULL,
  article_url TEXT NOT NULL,
  jurisdiction_code TEXT NOT NULL,
  urgency TEXT NOT NULL,
  noted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, article_id)
);

ALTER TABLE public.ropa_noted_regulatory_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ropa_noted_updates_owner_all"
  ON public.ropa_noted_regulatory_updates
  FOR ALL
  TO authenticated
  USING (public.owns_client(client_id))
  WITH CHECK (public.owns_client(client_id));

CREATE INDEX IF NOT EXISTS idx_ropa_noted_session
  ON public.ropa_noted_regulatory_updates (session_id);