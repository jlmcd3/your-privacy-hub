ALTER TABLE public.ropa_processing_activities
  ADD COLUMN IF NOT EXISTS source_tool text,
  ADD COLUMN IF NOT EXISTS source_assessment_id uuid,
  ADD COLUMN IF NOT EXISTS source_summary text;

CREATE UNIQUE INDEX IF NOT EXISTS ropa_activities_source_dedupe_idx
  ON public.ropa_processing_activities (session_id, source_tool, source_assessment_id)
  WHERE source_tool IS NOT NULL AND source_assessment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ropa_activities_session_status_idx
  ON public.ropa_processing_activities (session_id, status);