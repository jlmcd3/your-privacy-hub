
-- DS-T2: PDF render queue for HTML-first fallback ladder.
CREATE TABLE public.pdf_render_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_class TEXT NOT NULL CHECK (run_class IN ('customer','harness')),
  tool TEXT NOT NULL,
  subject_table TEXT NOT NULL,
  subject_id UUID NOT NULL,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  contract_id UUID NULL REFERENCES public.delivery_contracts(id) ON DELETE SET NULL,
  html_body TEXT NULL,          -- optional pre-rendered HTML for fallback path
  title TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','rendering','done','failed')),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT NULL,
  pdf_path TEXT NULL,            -- storage path once rendered
  notified_at TIMESTAMPTZ NULL,  -- when the user was told the PDF is ready
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.pdf_render_queue TO service_role;

ALTER TABLE public.pdf_render_queue ENABLE ROW LEVEL SECURITY;

-- End users never access the queue directly; they see status through the
-- delivery contract + email/notification. Only service role reads/writes.
CREATE POLICY "service_role manages pdf_render_queue"
  ON public.pdf_render_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_pdf_render_queue_status_created
  ON public.pdf_render_queue (status, created_at)
  WHERE status IN ('pending','rendering');

CREATE INDEX idx_pdf_render_queue_subject
  ON public.pdf_render_queue (subject_table, subject_id);

CREATE TRIGGER trg_pdf_render_queue_updated_at
  BEFORE UPDATE ON public.pdf_render_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sentinel sweep support: cheap lookups on live contracts by heartbeat / deadline.
CREATE INDEX IF NOT EXISTS idx_delivery_contracts_live_heartbeat
  ON public.delivery_contracts (heartbeat_at)
  WHERE terminal_state IS NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_contracts_live_deadline
  ON public.delivery_contracts (overall_deadline_at)
  WHERE terminal_state IS NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_contracts_class_tool
  ON public.delivery_contracts (run_class, tool)
  WHERE terminal_state IS NULL;
