
ALTER TABLE public.report_translations
  ADD COLUMN IF NOT EXISTS translated_chunks jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS slice_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resume_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_progress_at timestamptz;

UPDATE public.report_translations
   SET last_progress_at = COALESCE(last_progress_at, started_at, updated_at, created_at)
 WHERE status = 'translating';

CREATE INDEX IF NOT EXISTS idx_report_translations_progress
  ON public.report_translations (status, last_progress_at)
  WHERE status = 'translating';
