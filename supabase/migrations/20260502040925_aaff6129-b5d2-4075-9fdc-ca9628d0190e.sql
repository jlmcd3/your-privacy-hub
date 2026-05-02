-- CPPA Audit Readiness Suite tables (per CPPA Implementation Prompts, Pre-Setup Step B)

CREATE TABLE IF NOT EXISTS public.cppa_scope_checks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id  text,
  answers     jsonb NOT NULL,
  obligation_map jsonb,
  in_scope    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cppa_scope_checks ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (anonymous user_id is null) and owner inserts
CREATE POLICY "cppa_scope_checks_insert"
  ON public.cppa_scope_checks
  FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Owners can read their own; anonymous rows (user_id IS NULL) are not readable by clients
CREATE POLICY "cppa_scope_checks_select_owner"
  ON public.cppa_scope_checks
  FOR SELECT
  USING (user_id = auth.uid());

-- Service role bypasses RLS automatically; no need for an explicit policy.

CREATE TABLE IF NOT EXISTS public.cppa_assessments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  module          text NOT NULL CHECK (module IN ('risk_assessment','cybersecurity','suite')),
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','complete','error')),
  intake_data     jsonb NOT NULL DEFAULT '{}'::jsonb,
  report_data     jsonb,
  document_a_text text,
  document_b_text text,
  stripe_payment_intent_id text,
  purchase_price_cents integer,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cppa_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cppa_assessments_owner"
  ON public.cppa_assessments
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "cppa_assessments_service_role"
  ON public.cppa_assessments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Reuse the existing public.update_updated_at_column() trigger function
CREATE TRIGGER trg_cppa_assessments_updated
  BEFORE UPDATE ON public.cppa_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
