ALTER TABLE public.report_translations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'complete'
    CHECK (status IN ('translating','complete','failed')),
  ADD COLUMN IF NOT EXISTS chunks_total integer,
  ADD COLUMN IF NOT EXISTS chunks_done integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

ALTER TABLE public.report_translations
  ALTER COLUMN translated_content DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_report_translations_status_started
  ON public.report_translations (status, started_at)
  WHERE status = 'translating';

DROP POLICY IF EXISTS "Users can read own translation rows by user_id" ON public.report_translations;
CREATE POLICY "Users can read own translation rows by user_id"
  ON public.report_translations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());