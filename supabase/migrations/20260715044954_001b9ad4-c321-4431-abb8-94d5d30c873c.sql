
-- QL3-P1: server-side batch driver, per-model scores, and grade cache.

-- 1) quality_loop3_batches
CREATE TABLE public.quality_loop3_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_slug TEXT NOT NULL,
  source_quality_run_id UUID NOT NULL,
  doc_ids JSONB NOT NULL,
  current_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running',
  phase TEXT NOT NULL DEFAULT 'kickoff',
  current_ql3_run_id UUID,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  cancel_requested BOOLEAN NOT NULL DEFAULT false,
  last_heartbeat_at TIMESTAMPTZ,
  last_error TEXT,
  created_by UUID NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.quality_loop3_batches TO authenticated;
GRANT ALL ON public.quality_loop3_batches TO service_role;

ALTER TABLE public.quality_loop3_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view QL3 batches"
  ON public.quality_loop3_batches FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX quality_loop3_batches_tool_created_idx
  ON public.quality_loop3_batches (tool_slug, created_at DESC);

CREATE INDEX quality_loop3_batches_source_run_idx
  ON public.quality_loop3_batches (source_quality_run_id);

CREATE OR REPLACE FUNCTION public.update_ql3_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_quality_loop3_batches_updated_at
  BEFORE UPDATE ON public.quality_loop3_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_ql3_batches_updated_at();

-- 2) quality_loop3_log
CREATE TABLE public.quality_loop3_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID,
  ql3_run_id UUID,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL
);

GRANT SELECT ON public.quality_loop3_log TO authenticated;
GRANT ALL ON public.quality_loop3_log TO service_role;

ALTER TABLE public.quality_loop3_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view QL3 log"
  ON public.quality_loop3_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX quality_loop3_log_batch_ts_idx
  ON public.quality_loop3_log (batch_id, ts DESC);

CREATE INDEX quality_loop3_log_run_ts_idx
  ON public.quality_loop3_log (ql3_run_id, ts DESC);

-- 3) quality_loop3_grade_cache
CREATE TABLE public.quality_loop3_grade_cache (
  assessment_id UUID NOT NULL,
  tool_slug TEXT NOT NULL,
  version_n INTEGER NOT NULL,
  grader_stamp TEXT NOT NULL,
  samples JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (assessment_id, version_n, grader_stamp)
);

GRANT SELECT ON public.quality_loop3_grade_cache TO authenticated;
GRANT ALL ON public.quality_loop3_grade_cache TO service_role;

ALTER TABLE public.quality_loop3_grade_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view QL3 grade cache"
  ON public.quality_loop3_grade_cache FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX quality_loop3_grade_cache_tool_idx
  ON public.quality_loop3_grade_cache (tool_slug, assessment_id, version_n DESC);

-- 4) Per-model score columns on quality_loop3_runs
ALTER TABLE public.quality_loop3_runs
  ADD COLUMN IF NOT EXISTS pre_claude_score NUMERIC,
  ADD COLUMN IF NOT EXISTS pre_gpt_score NUMERIC,
  ADD COLUMN IF NOT EXISTS post_claude_score NUMERIC,
  ADD COLUMN IF NOT EXISTS post_gpt_score NUMERIC;
