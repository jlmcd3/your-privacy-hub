ALTER TABLE public.cppa_assessments
  DROP CONSTRAINT IF EXISTS cppa_assessments_module_check;

ALTER TABLE public.cppa_assessments
  ADD CONSTRAINT cppa_assessments_module_check
    CHECK (module IN ('risk_assessment','cybersecurity','suite','admt'));

CREATE TABLE IF NOT EXISTS public.admt_systems (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_id   uuid REFERENCES public.cppa_assessments(id) ON DELETE CASCADE,
  system_name     text NOT NULL,
  system_type     text,
  decision_domain text[],
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admt_systems TO authenticated;
GRANT ALL ON public.admt_systems TO service_role;

ALTER TABLE public.admt_systems ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admt_systems_owner" ON public.admt_systems;
CREATE POLICY "admt_systems_owner"
  ON public.admt_systems
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());