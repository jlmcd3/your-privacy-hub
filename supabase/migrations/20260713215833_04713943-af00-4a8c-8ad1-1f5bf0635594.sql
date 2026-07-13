CREATE TABLE public.revision_dispatch_ledger (
  nonce         uuid PRIMARY KEY,
  assessment_id uuid NOT NULL,
  tool_type     text NOT NULL,
  action        text NOT NULL DEFAULT 'revision_dispatch',
  accepted_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX revision_dispatch_ledger_assessment_idx
  ON public.revision_dispatch_ledger (assessment_id, accepted_at DESC);

GRANT ALL ON public.revision_dispatch_ledger TO service_role;

ALTER TABLE public.revision_dispatch_ledger ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT policies for anon/authenticated: this ledger is
-- written and read only by service-role internal edge functions
-- (ql3-orchestrator → run-quality-batch → regenerate-assessment).
CREATE POLICY "service_role_manage_dispatch_ledger"
  ON public.revision_dispatch_ledger
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);