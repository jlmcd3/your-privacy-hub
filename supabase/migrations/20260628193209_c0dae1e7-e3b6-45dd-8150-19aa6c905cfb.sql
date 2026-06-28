
-- ─────────────────────────────────────────────────────────────
-- registry_proposals (R3)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.registry_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid,
  tool text,
  check_id text,
  fact_type text NOT NULL DEFAULT 'other',
  proposed_key text,
  proposed_value text,
  citation text,
  source_url text,
  rationale text,
  status text NOT NULL DEFAULT 'proposed',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS registry_proposals_run_check_uq
  ON public.registry_proposals(run_id, check_id)
  WHERE run_id IS NOT NULL AND check_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS registry_proposals_status_idx
  ON public.registry_proposals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS registry_proposals_tool_idx
  ON public.registry_proposals(tool, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.registry_proposals TO authenticated;
GRANT ALL ON public.registry_proposals TO service_role;

ALTER TABLE public.registry_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage registry proposals"
  ON public.registry_proposals
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────────────────────
-- registry_verification_log (R5)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.registry_verification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id text NOT NULL,
  source text NOT NULL,
  verify_against text NOT NULL,
  last_verified date,
  age_days integer,
  stale boolean NOT NULL DEFAULT false,
  ok boolean NOT NULL DEFAULT false,
  http_status integer,
  http_method text,
  error text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS registry_verification_log_entry_idx
  ON public.registry_verification_log(entry_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS registry_verification_log_checked_idx
  ON public.registry_verification_log(checked_at DESC);
CREATE INDEX IF NOT EXISTS registry_verification_log_problem_idx
  ON public.registry_verification_log(checked_at DESC)
  WHERE stale = true OR ok = false;

GRANT SELECT ON public.registry_verification_log TO authenticated;
GRANT ALL ON public.registry_verification_log TO service_role;

ALTER TABLE public.registry_verification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read registry verification log"
  ON public.registry_verification_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
