
CREATE TABLE public.tool_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NULL,
  tool_type text NOT NULL,
  session_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_stage integer NOT NULL DEFAULT 1,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tool_sessions TO authenticated;
GRANT ALL ON public.tool_sessions TO service_role;

ALTER TABLE public.tool_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tool sessions"
  ON public.tool_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- One active (uncompleted) draft per (user, tool, client-or-null)
CREATE UNIQUE INDEX tool_sessions_active_draft_idx
  ON public.tool_sessions (
    user_id,
    tool_type,
    COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE completed = false;

CREATE INDEX tool_sessions_lookup_idx
  ON public.tool_sessions (user_id, tool_type, completed);

CREATE TRIGGER tool_sessions_set_updated_at
  BEFORE UPDATE ON public.tool_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
