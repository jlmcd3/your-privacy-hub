CREATE TABLE public.harness_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_type text NOT NULL,
  target_table text NOT NULL,
  target_id uuid NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX harness_artifacts_admin_idx ON public.harness_artifacts (admin_user_id, created_at DESC);
CREATE INDEX harness_artifacts_tool_idx ON public.harness_artifacts (admin_user_id, tool_type, created_at DESC);
CREATE INDEX harness_artifacts_run_idx ON public.harness_artifacts (run_id);

GRANT SELECT, INSERT, DELETE ON public.harness_artifacts TO authenticated;
GRANT ALL ON public.harness_artifacts TO service_role;

ALTER TABLE public.harness_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read own harness rows"
  ON public.harness_artifacts FOR SELECT
  TO authenticated
  USING (
    admin_user_id = auth.uid()
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role))
  );

CREATE POLICY "Admins insert own harness rows"
  ON public.harness_artifacts FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_user_id = auth.uid()
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role))
  );

CREATE POLICY "Admins delete own harness rows"
  ON public.harness_artifacts FOR DELETE
  TO authenticated
  USING (
    admin_user_id = auth.uid()
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role))
  );