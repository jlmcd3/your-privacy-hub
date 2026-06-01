CREATE TABLE public.jurisdiction_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running',
  jurisdictions_checked int NOT NULL DEFAULT 0,
  issues_found int NOT NULL DEFAULT 0,
  model text,
  params jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error text
);

GRANT SELECT ON public.jurisdiction_audit_runs TO authenticated;
GRANT ALL ON public.jurisdiction_audit_runs TO service_role;

ALTER TABLE public.jurisdiction_audit_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit runs"
ON public.jurisdiction_audit_runs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.jurisdiction_requirement_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.jurisdiction_audit_runs(id) ON DELETE CASCADE,
  jurisdiction_code text NOT NULL,
  field_name text NOT NULL,
  current_value jsonb,
  suggested_value jsonb,
  agreement text NOT NULL CHECK (agreement IN ('agrees','disagrees','unclear')),
  confidence text,
  source_quote text,
  source_url text,
  model text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','rejected','superseded')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_jra_run ON public.jurisdiction_requirement_audits(run_id);
CREATE INDEX idx_jra_jurisdiction ON public.jurisdiction_requirement_audits(jurisdiction_code);
CREATE INDEX idx_jra_status_agreement ON public.jurisdiction_requirement_audits(status, agreement);

GRANT SELECT, UPDATE ON public.jurisdiction_requirement_audits TO authenticated;
GRANT ALL ON public.jurisdiction_requirement_audits TO service_role;

ALTER TABLE public.jurisdiction_requirement_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit findings"
ON public.jurisdiction_requirement_audits FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can review audit findings"
ON public.jurisdiction_requirement_audits FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
