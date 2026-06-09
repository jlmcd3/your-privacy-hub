
CREATE TABLE public.state_law_review_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_slug text NOT NULL,
  state_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('ok','needs_update')),
  notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX state_law_review_log_state_idx
  ON public.state_law_review_log (state_slug, reviewed_at DESC);

GRANT SELECT ON public.state_law_review_log TO anon, authenticated;
GRANT ALL ON public.state_law_review_log TO service_role;

ALTER TABLE public.state_law_review_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read review log"
  ON public.state_law_review_log FOR SELECT
  USING (true);

CREATE POLICY "Admins manage review log"
  ON public.state_law_review_log FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
