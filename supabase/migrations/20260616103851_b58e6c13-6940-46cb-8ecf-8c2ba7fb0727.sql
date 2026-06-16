CREATE TABLE IF NOT EXISTS public.assertion_run_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  run_status text NOT NULL,
  elapsed_ms integer,
  total_assertions integer NOT NULL DEFAULT 0,
  passed_assertions integer NOT NULL DEFAULT 0,
  failed_assertions integer NOT NULL DEFAULT 0,
  completed_tools integer NOT NULL DEFAULT 0,
  tool_results jsonb NOT NULL DEFAULT '[]',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT ON public.assertion_run_results TO authenticated;
GRANT ALL ON public.assertion_run_results TO service_role;

ALTER TABLE public.assertion_run_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read assertion results"
  ON public.assertion_run_results FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

CREATE POLICY "Admins can insert assertion results"
  ON public.assertion_run_results FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

CREATE INDEX IF NOT EXISTS assertion_run_results_run_at_idx
  ON public.assertion_run_results (run_at DESC);