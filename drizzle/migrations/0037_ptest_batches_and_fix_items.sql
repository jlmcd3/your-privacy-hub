-- /all-ptest run history + per-item fix tracking.
-- Admin-only tooling: RLS restricts every operation to public.has_role(auth.uid(),'admin').

CREATE TABLE public.ptest_batches (
  batch_id UUID PRIMARY KEY,
  run_by UUID,
  industry TEXT,
  products TEXT[] NOT NULL DEFAULT '{}',
  documents_per_product INTEGER,
  review_effort TEXT,
  arbitration_effort TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.ptest_batches TO authenticated;
GRANT ALL ON public.ptest_batches TO service_role;
ALTER TABLE public.ptest_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read ptest batches" ON public.ptest_batches
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert ptest batches" ON public.ptest_batches
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update ptest batches" ON public.ptest_batches
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role manages ptest batches" ON public.ptest_batches
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.ptest_fix_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL,
  tool_slug TEXT NOT NULL,
  item_kind TEXT NOT NULL,            -- 'fix' | 'ceo'
  item_id TEXT NOT NULL,              -- arbiter-assigned id
  title TEXT NOT NULL,
  severity TEXT,
  defect_type TEXT,
  raised_by TEXT,
  code_focus TEXT,
  change_text TEXT,
  regression_test TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  fix_status TEXT NOT NULL DEFAULT 'open',   -- open | in_progress | fixed | rejected | deferred
  fix_notes TEXT,
  fix_reference TEXT,                        -- commit / PR / message reference
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (batch_id, tool_slug, item_kind, item_id)
);

CREATE INDEX ptest_fix_items_batch_idx ON public.ptest_fix_items (batch_id, tool_slug);

GRANT SELECT, INSERT, UPDATE ON public.ptest_fix_items TO authenticated;
GRANT ALL ON public.ptest_fix_items TO service_role;
ALTER TABLE public.ptest_fix_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read ptest fix items" ON public.ptest_fix_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert ptest fix items" ON public.ptest_fix_items
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update ptest fix items" ON public.ptest_fix_items
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role manages ptest fix items" ON public.ptest_fix_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.touch_ptest_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER ptest_batches_touch BEFORE UPDATE ON public.ptest_batches
  FOR EACH ROW EXECUTE FUNCTION public.touch_ptest_updated_at();
CREATE TRIGGER ptest_fix_items_touch BEFORE UPDATE ON public.ptest_fix_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_ptest_updated_at();
