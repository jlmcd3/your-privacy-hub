CREATE TABLE public.delivery_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_class text NOT NULL CHECK (run_class IN ('customer','harness')),
  user_id uuid,
  tool text NOT NULL,
  subject_table text NOT NULL,
  subject_id uuid NOT NULL,
  stage text NOT NULL DEFAULT 'generate'
    CHECK (stage IN ('generate','assemble','validate','render','deliver')),
  stage_deadline_at timestamptz NOT NULL,
  overall_deadline_at timestamptz NOT NULL,
  heartbeat_at timestamptz NOT NULL DEFAULT now(),
  checkpoint_ref jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts jsonb NOT NULL DEFAULT '{}'::jsonb,
  failure_class text,
  last_error text,
  terminal_state text
    CHECK (terminal_state IS NULL OR terminal_state IN
      ('delivered','delivered_html_pdf_queued','admin_escalated','harness_stalled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_delivery_contracts_live
  ON public.delivery_contracts (heartbeat_at)
  WHERE terminal_state IS NULL;
CREATE INDEX idx_delivery_contracts_user
  ON public.delivery_contracts (user_id, updated_at DESC)
  WHERE user_id IS NOT NULL;
CREATE INDEX idx_delivery_contracts_subject
  ON public.delivery_contracts (subject_table, subject_id);
CREATE INDEX idx_delivery_contracts_class_tool
  ON public.delivery_contracts (run_class, tool, created_at DESC);

GRANT SELECT ON public.delivery_contracts TO authenticated;
GRANT ALL ON public.delivery_contracts TO service_role;

ALTER TABLE public.delivery_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own customer contracts"
  ON public.delivery_contracts
  FOR SELECT
  TO authenticated
  USING (
    run_class = 'customer'
    AND user_id IS NOT NULL
    AND auth.uid() = user_id
  );

CREATE POLICY "Admins read all contracts"
  ON public.delivery_contracts
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_delivery_contracts_updated_at
  BEFORE UPDATE ON public.delivery_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();